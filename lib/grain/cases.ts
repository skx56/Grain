import { dedent, formatInr, type ValueKind } from './format'

export type CaseId = 'revenue' | 'customers' | 'category' | 'cash'

export type Row = Record<string, string | number | null>

export interface Column {
  key: string
  label: string
  kind?: 'inr' | 'date' | 'text'
}

export interface Sensitivity {
  label: string
  explanation: string
  sql: string
  kind: ValueKind
  compare: boolean
}

export interface Presentation {
  kicker: string
  title: string
  caption: string
  comparable: number
}

export interface GrainCase {
  id: CaseId
  question: string
  tables: string[]
  valueKind: ValueKind
  assumption: {
    chosen: string
    rejected: { name: string; why: string }[]
  }
  joins: string[]
  filters: string[]
  grain: { level: string; detail: string }
  critic: {
    rejectedSql: string
    rejectedLabel: string
    findings: { title: string; detail: string }[]
  }
  valueSql: string
  detailSql: string
  columns: Column[]
  present: (rows: Row[], comparable: number) => Presentation
  sensitivities: Sensitivity[]
}

const QUARTER =
  "o.status = 'fulfilled' AND o.ordered_on >= '2026-07-01' AND o.ordered_on < '2026-10-01'"

export const CASES: Record<CaseId, GrainCase> = {
  revenue: {
    id: 'revenue',
    question: 'What was revenue last quarter?',
    tables: ['orders', 'order_lines'],
    valueKind: 'inr',
    assumption: {
      chosen:
        'Merchandise revenue: the sum of order line totals on fulfilled orders whose IST business date falls in Q3 2026, 1 Jul through 30 Sep. Tax, cash, and refunds are other questions.',
      rejected: [
        {
          name: 'Invoice total',
          why: 'invoices.total_cents adds 18% tax on top of the goods.',
        },
        {
          name: 'Cash collected',
          why: 'payments.amount_cents is what landed in the account. Order 102 is split across two captures.',
        },
        {
          name: 'Net of refunds',
          why: 'The returned Arc Lamp is real. This definition is gross, so the return stays in the number.',
        },
      ],
    },
    joins: ['orders.id = order_lines.order_id'],
    filters: ["status = 'fulfilled'", 'ordered_on in Q3 2026 (IST)'],
    grain: {
      level: 'One row per order line, summed to a single total.',
      detail:
        'Payments and tags sit above that grain. An order can have two captures and three tags. Join either table before the sum and the line is counted once per match.',
    },
    critic: {
      rejectedLabel: 'Lines joined to payments and tags, filtered on UTC',
      rejectedSql: dedent(`
        SELECT COALESCE(SUM(ol.line_total_cents), 0) AS value
        FROM orders o
        JOIN order_lines ol ON ol.order_id = o.id
        JOIN payments p ON p.order_id = o.id AND p.status = 'captured'
        JOIN order_tags t ON t.order_id = o.id
        WHERE o.status != 'cancelled'
          AND date(o.created_at) >= '2026-07-01'
          AND date(o.created_at) < '2026-10-01'
      `),
      findings: [
        {
          title: 'The join multiplies the grain',
          detail:
            'Order 105 has two lines and three tags, so its merchandise is counted three times. Order 102 has two captured payments, so the desk is counted twice.',
        },
        {
          title: 'The calendar is on the wrong clock',
          detail:
            'Filtering created_at drops order 106 (30 Jun 20:30 UTC, which is 1 Jul in IST) and pulls in order 107 (30 Sep 20:00 UTC, which is 1 Oct in IST).',
        },
        {
          title: 'Untagged orders disappear',
          detail:
            'The inner join to order_tags drops order 103. Meera Shah bought a lamp, and that order has no tags, so a naive query pretends the sale did not happen.',
        },
      ],
    },
    valueSql: dedent(`
      SELECT COALESCE(SUM(ol.line_total_cents), 0) AS value
      FROM orders o
      JOIN order_lines ol ON ol.order_id = o.id
      WHERE ${QUARTER}
    `),
    detailSql: dedent(`
      SELECT
        o.id AS order_id,
        c.name AS customer,
        o.ordered_on AS ordered_on,
        p.name AS product,
        ol.qty AS qty,
        ol.line_total_cents AS line_total_cents
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      JOIN order_lines ol ON ol.order_id = o.id
      JOIN products p ON p.id = ol.product_id
      WHERE ${QUARTER}
      ORDER BY o.ordered_on, o.id, ol.id
    `),
    columns: [
      { key: 'order_id', label: 'Order' },
      { key: 'customer', label: 'Customer' },
      { key: 'ordered_on', label: 'Business date', kind: 'date' },
      { key: 'product', label: 'Product' },
      { key: 'qty', label: 'Qty' },
      { key: 'line_total_cents', label: 'Line total', kind: 'inr' },
    ],
    present: (_rows, comparable) => ({
      kicker: 'Q3 2026 merchandise',
      title: formatInr(comparable),
      caption: 'Fulfilled orders · IST business date · tax and refunds excluded',
      comparable,
    }),
    sensitivities: [
      {
        label: 'Net the lamp return',
        explanation: 'Subtract the 25 Sep refund on order 105. Gross revenue is what the question asked for. Net is this.',
        kind: 'inr',
        compare: true,
        sql: dedent(`
          SELECT (
            SELECT COALESCE(SUM(ol.line_total_cents), 0)
            FROM orders o
            JOIN order_lines ol ON ol.order_id = o.id
            WHERE ${QUARTER}
          ) - (
            SELECT COALESCE(SUM(r.amount_cents), 0)
            FROM refunds r
            JOIN orders o ON o.id = r.order_id
            WHERE ${QUARTER}
          ) AS value
        `),
      },
      {
        label: 'Use invoice totals',
        explanation: 'Issued invoices on the same orders include 18% tax. That is a different metric with a larger number.',
        kind: 'inr',
        compare: true,
        sql: dedent(`
          SELECT COALESCE(SUM(i.total_cents), 0) AS value
          FROM invoices i
          JOIN orders o ON o.id = i.order_id
          WHERE i.status = 'issued'
            AND ${QUARTER}
        `),
      },
      {
        label: 'Keep the cancelled order',
        explanation: 'Order 104 was cancelled. Its chair is still in order_lines. Leaving the status filter off adds it.',
        kind: 'inr',
        compare: true,
        sql: dedent(`
          SELECT COALESCE(SUM(ol.line_total_cents), 0) AS value
          FROM orders o
          JOIN order_lines ol ON ol.order_id = o.id
          WHERE o.status IN ('fulfilled', 'cancelled')
            AND o.ordered_on >= '2026-07-01'
            AND o.ordered_on < '2026-10-01'
        `),
      },
    ],
  },
  customers: {
    id: 'customers',
    question: 'How many active customers?',
    tables: ['customers', 'orders'],
    valueKind: 'count',
    assumption: {
      chosen:
        'Active means not soft-deleted, with a fulfilled order on the IST business calendar in the 90 days ending 4 Oct 2026. SQLite computes that window as 6 Jul through 4 Oct.',
      rejected: [
        {
          name: 'Anyone not deleted',
          why: 'Dev Patel has a customer row and zero orders. A headcount of live rows counts him.',
        },
        {
          name: 'Anyone who ever bought',
          why: 'Meera Shah was soft-deleted on 28 Sep 2026. Her August order still exists.',
        },
      ],
    },
    joins: ['customers.id = orders.customer_id'],
    filters: ['deleted_at IS NULL', "status = 'fulfilled'", "ordered_on inside date('2026-10-04', '-90 days')"],
    grain: {
      level: 'One row per customer, not per order.',
      detail:
        'Asha Rao has two fulfilled orders. She is one active customer. Counting orders here would inflate the headcount.',
    },
    critic: {
      rejectedLabel: 'Distinct customers with any fulfilled order, ever',
      rejectedSql: dedent(`
        SELECT COUNT(DISTINCT o.customer_id) AS value
        FROM orders o
        WHERE o.status = 'fulfilled'
      `),
      findings: [
        {
          title: 'A soft-deleted buyer is still inside',
          detail:
            'Meera Shah is in this count. Her customer row was soft-deleted on 28 Sep 2026. The headline only moves by one, which is how a bad definition survives a glance.',
        },
        {
          title: 'The window bug is invisible in the total',
          detail:
            'This query ignores the 90-day window. On this ledger every live buyer happens to have an order inside it, so the missing filter does not change the number. The critic has to say that out loud.',
        },
      ],
    },
    valueSql: dedent(`
      SELECT COUNT(DISTINCT c.id) AS value
      FROM customers c
      JOIN orders o ON o.customer_id = c.id
      WHERE c.deleted_at IS NULL
        AND o.status = 'fulfilled'
        AND o.ordered_on >= date('2026-10-04', '-90 days')
        AND o.ordered_on <= '2026-10-04'
    `),
    detailSql: dedent(`
      SELECT
        c.name AS customer,
        c.region AS region,
        MAX(o.ordered_on) AS last_order
      FROM customers c
      JOIN orders o ON o.customer_id = c.id
      WHERE c.deleted_at IS NULL
        AND o.status = 'fulfilled'
        AND o.ordered_on >= date('2026-10-04', '-90 days')
        AND o.ordered_on <= '2026-10-04'
      GROUP BY c.id
      ORDER BY last_order, c.name
    `),
    columns: [
      { key: 'customer', label: 'Customer' },
      { key: 'region', label: 'Region' },
      { key: 'last_order', label: 'Latest order', kind: 'date' },
    ],
    present: (_rows, comparable) => ({
      kicker: 'Active on 4 Oct 2026',
      title: String(comparable),
      caption: 'Not soft-deleted · fulfilled order in the trailing 90 days',
      comparable,
    }),
    sensitivities: [
      {
        label: 'Count every live customer row',
        explanation: 'Dev Patel is not deleted and has never ordered. A roster count includes him. The activity definition does not.',
        kind: 'count',
        compare: true,
        sql: dedent(`
          SELECT COUNT(*) AS value
          FROM customers
          WHERE deleted_at IS NULL
        `),
      },
      {
        label: 'Keep soft-deleted buyers',
        explanation: 'Same 90-day window, but Meera Shah stays in because her August order is fulfilled. The delete flag is the whole difference.',
        kind: 'count',
        compare: true,
        sql: dedent(`
          SELECT COUNT(DISTINCT c.id) AS value
          FROM customers c
          JOIN orders o ON o.customer_id = c.id
          WHERE o.status = 'fulfilled'
            AND o.ordered_on >= date('2026-10-04', '-90 days')
            AND o.ordered_on <= '2026-10-04'
        `),
      },
    ],
  },
  category: {
    id: 'category',
    question: 'Which category led last quarter?',
    tables: ['orders', 'order_lines', 'products'],
    valueKind: 'inr',
    assumption: {
      chosen:
        'Leader means the product category with the largest merchandise total on fulfilled orders in Q3 2026, using the IST business date. Same revenue definition as the revenue question, grouped by products.category.',
      rejected: [
        {
          name: 'Rank by units',
          why: 'Lamps can win a unit count while desks win the money. The question is about the business, so the rank is rupees.',
        },
        {
          name: 'Rank invoice totals',
          why: 'Tax is a flat 18%, so the leader would not change, and the amounts would still be the wrong metric.',
        },
      ],
    },
    joins: ['orders.id = order_lines.order_id', 'order_lines.product_id = products.id'],
    filters: ["status = 'fulfilled'", 'ordered_on in Q3 2026 (IST)'],
    grain: {
      level: 'One row per order line, summed by category.',
      detail:
        'Order 105 contributes a desk to Furniture and lamps to Lighting. Those lines must not be copied once per tag.',
    },
    critic: {
      rejectedLabel: 'Category sums after joining tags, filtered on UTC',
      rejectedSql: dedent(`
        SELECT p.category AS category, SUM(ol.line_total_cents) AS value
        FROM orders o
        JOIN order_lines ol ON ol.order_id = o.id
        JOIN products p ON p.id = ol.product_id
        JOIN order_tags t ON t.order_id = o.id
        WHERE o.status = 'fulfilled'
          AND date(o.created_at) >= '2026-07-01'
          AND date(o.created_at) < '2026-10-01'
        GROUP BY p.category
        ORDER BY value DESC
      `),
      findings: [
        {
          title: 'The leaderboard can be right for the wrong reason',
          detail:
            'Furniture still leads after the bad join. The amount does not. Order 105 carries three tags, so its desk and its lamps are each counted three times.',
        },
        {
          title: 'Untagged lines fall off the board',
          detail:
            'Order 106 is the only Storage sale, and it has no tags. The inner join deletes the category. Order 103, an untagged lamp, falls out of Lighting too.',
        },
        {
          title: 'UTC moves a chair across the quarter',
          detail:
            'Order 107 is a chair placed 1 Oct IST. Its UTC timestamp is still 30 Sep, so the rejected query files it under Q3 Furniture.',
        },
      ],
    },
    valueSql: dedent(`
      SELECT p.category AS category, SUM(ol.line_total_cents) AS value
      FROM orders o
      JOIN order_lines ol ON ol.order_id = o.id
      JOIN products p ON p.id = ol.product_id
      WHERE ${QUARTER}
      GROUP BY p.category
      ORDER BY value DESC, p.category
    `),
    detailSql: dedent(`
      SELECT p.category AS category, SUM(ol.line_total_cents) AS value
      FROM orders o
      JOIN order_lines ol ON ol.order_id = o.id
      JOIN products p ON p.id = ol.product_id
      WHERE ${QUARTER}
      GROUP BY p.category
      ORDER BY value DESC, p.category
    `),
    columns: [
      { key: 'category', label: 'Category' },
      { key: 'value', label: 'Merchandise', kind: 'inr' },
    ],
    present: (rows, comparable) => ({
      kicker: 'Q3 2026 leader',
      title: String(rows[0]?.category ?? 'No category'),
      caption: `${formatInr(comparable)} merchandise revenue`,
      comparable,
    }),
    sensitivities: [
      {
        label: 'Include the cancelled chair',
        explanation: 'Order 104 is a cancelled Oak Chair. Furniture still leads, and the total moves by that one line.',
        kind: 'inr',
        compare: true,
        sql: dedent(`
          SELECT COALESCE(SUM(ol.line_total_cents), 0) AS value
          FROM orders o
          JOIN order_lines ol ON ol.order_id = o.id
          JOIN products p ON p.id = ol.product_id
          WHERE p.category = 'Furniture'
            AND o.status IN ('fulfilled', 'cancelled')
            AND o.ordered_on >= '2026-07-01'
            AND o.ordered_on < '2026-10-01'
        `),
      },
      {
        label: 'Net the returned lamp',
        explanation: 'Lighting falls by the returned Arc Lamp. Furniture does not move, so the leader is unchanged.',
        kind: 'inr',
        compare: false,
        sql: dedent(`
          SELECT (
            SELECT COALESCE(SUM(ol.line_total_cents), 0)
            FROM orders o
            JOIN order_lines ol ON ol.order_id = o.id
            JOIN products p ON p.id = ol.product_id
            WHERE p.category = 'Lighting'
              AND ${QUARTER}
          ) - (
            SELECT COALESCE(SUM(amount_cents), 0)
            FROM refunds
            WHERE reason = 'Returned one Arc Lamp'
          ) AS value
        `),
      },
    ],
  },
  cash: {
    id: 'cash',
    question: 'How much cash was collected last quarter?',
    tables: ['payments'],
    valueKind: 'inr',
    assumption: {
      chosen:
        'Cash collected is the sum of captured payments whose paid_on date falls in Q3 2026. Failed captures are ignored. Refunds are money that left later, so they are not subtracted here.',
      rejected: [
        {
          name: 'Merchandise revenue',
          why: 'Line totals exclude the 18% tax the customer actually paid.',
        },
        {
          name: 'Net cash',
          why: 'The lamp refund left the account on 25 Sep. This question asks what was collected, not what was kept.',
        },
      ],
    },
    joins: ['payments only — orders and lines are not on this path'],
    filters: ["status = 'captured'", 'paid_on in Q3 2026'],
    grain: {
      level: 'One row per captured payment.',
      detail:
        'Order 101 has one payment and two lines. Join order_lines before summing amount_cents and that payment is counted twice.',
    },
    critic: {
      rejectedLabel: 'Payment amounts summed after joining order lines',
      rejectedSql: dedent(`
        SELECT COALESCE(SUM(p.amount_cents), 0) AS value
        FROM payments p
        JOIN orders o ON o.id = p.order_id
        JOIN order_lines ol ON ol.order_id = o.id
        WHERE p.status = 'captured'
          AND p.paid_on >= '2026-07-01'
          AND p.paid_on < '2026-10-01'
      `),
      findings: [
        {
          title: 'A parent amount was summed at the child grain',
          detail:
            'Orders 101 and 105 each have one captured payment and two lines. The join copies each payment once per line, so those collections are doubled.',
        },
        {
          title: 'The split payment hid inside a correct-looking order',
          detail:
            'Order 102 has two captures and one line, so the join does not inflate it. A spot-check of that order would miss the bug living on the other orders.',
        },
      ],
    },
    valueSql: dedent(`
      SELECT COALESCE(SUM(amount_cents), 0) AS value
      FROM payments
      WHERE status = 'captured'
        AND paid_on >= '2026-07-01'
        AND paid_on < '2026-10-01'
    `),
    detailSql: dedent(`
      SELECT
        p.id AS payment_id,
        o.id AS order_id,
        c.name AS customer,
        p.paid_on AS paid_on,
        p.amount_cents AS amount_cents
      FROM payments p
      JOIN orders o ON o.id = p.order_id
      JOIN customers c ON c.id = o.customer_id
      WHERE p.status = 'captured'
        AND p.paid_on >= '2026-07-01'
        AND p.paid_on < '2026-10-01'
      ORDER BY p.paid_on, p.id
    `),
    columns: [
      { key: 'payment_id', label: 'Payment' },
      { key: 'order_id', label: 'Order' },
      { key: 'customer', label: 'Customer' },
      { key: 'paid_on', label: 'Paid on', kind: 'date' },
      { key: 'amount_cents', label: 'Amount', kind: 'inr' },
    ],
    present: (_rows, comparable) => ({
      kicker: 'Q3 2026 captured payments',
      title: formatInr(comparable),
      caption: 'Cash in · failed payments ignored · refunds not subtracted',
      comparable,
    }),
    sensitivities: [
      {
        label: 'Subtract refunds paid out',
        explanation: 'Net cash keeps the collection and subtracts the 25 Sep lamp refund. The question asked for collections, so the shipped number does not.',
        kind: 'inr',
        compare: true,
        sql: dedent(`
          SELECT (
            SELECT COALESCE(SUM(amount_cents), 0)
            FROM payments
            WHERE status = 'captured'
              AND paid_on >= '2026-07-01'
              AND paid_on < '2026-10-01'
          ) - (
            SELECT COALESCE(SUM(amount_cents), 0)
            FROM refunds
            WHERE refunded_on >= '2026-07-01'
              AND refunded_on < '2026-10-01'
          ) AS value
        `),
      },
      {
        label: 'Answer with merchandise instead',
        explanation: 'If the question had meant revenue, the number would drop the tax that customers paid and follow the business date, not the payment date.',
        kind: 'inr',
        compare: true,
        sql: dedent(`
          SELECT COALESCE(SUM(ol.line_total_cents), 0) AS value
          FROM orders o
          JOIN order_lines ol ON ol.order_id = o.id
          WHERE ${QUARTER}
        `),
      },
    ],
  },
}

export const PROMPTS: { id: CaseId; label: string }[] = [
  { id: 'revenue', label: CASES.revenue.question },
  { id: 'customers', label: CASES.customers.question },
  { id: 'category', label: CASES.category.question },
  { id: 'cash', label: CASES.cash.question },
]

export function routeQuestion(raw: string): CaseId | null {
  const text = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return null

  const cash = /\b(cash|collected|collection|payment|payments|paid)\b/.test(text)
  const category = /\b(category|categories|top|leader|best)\b/.test(text)
  const customers = /\b(active|customers|customer|buyers|buyer)\b/.test(text)
  const revenue = /\b(revenue|sales|sold|gmv|merchandise|quarter)\b/.test(text)

  if (cash) return 'cash'
  if (category) return 'category'
  if (customers && !revenue) return 'customers'
  if (revenue) return 'revenue'
  return null
}
