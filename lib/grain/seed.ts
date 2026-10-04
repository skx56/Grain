import { dedent } from './format'

/** Harbor & Co. is frozen at this close so "last quarter" stays Q3 2026. */
export const LEDGER_AS_OF = '2026-10-04'

export const SCHEMA_SQL = dedent(`
  CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    created_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL
  );

  CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    ordered_on TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE order_lines (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    line_total_cents INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE invoices (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL,
    merchandise_cents INTEGER NOT NULL,
    tax_cents INTEGER NOT NULL,
    total_cents INTEGER NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  CREATE TABLE payments (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    status TEXT NOT NULL,
    paid_on TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  CREATE TABLE refunds (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    refunded_on TEXT NOT NULL,
    reason TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  CREATE TABLE order_tags (
    order_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );
`)

export const SEED_SQL = dedent(`
  ${SCHEMA_SQL}

  INSERT INTO customers (id, name, region, created_at, deleted_at) VALUES
    (1, 'Asha Rao', 'West', '2024-03-12 09:00:00', NULL),
    (2, 'Rohan Iyer', 'South', '2025-01-08 09:00:00', NULL),
    (3, 'Meera Shah', 'West', '2024-11-02 09:00:00', '2026-09-28 11:00:00'),
    (4, 'Kabir Das', 'North', '2025-06-19 09:00:00', NULL),
    (5, 'Lena Ortiz', 'East', '2023-08-01 09:00:00', NULL),
    (6, 'Dev Patel', 'West', '2026-09-15 09:00:00', NULL);

  INSERT INTO products (id, name, category) VALUES
    (1, 'Arc Lamp', 'Lighting'),
    (2, 'Oak Chair', 'Furniture'),
    (3, 'Studio Desk', 'Furniture'),
    (4, 'Pine Shelf', 'Storage');

  -- created_at is UTC. ordered_on is the IST business date.
  -- 106: 30 Jun 20:30 UTC is 1 Jul 02:00 IST, so it belongs in Q3.
  -- 107: 30 Sep 20:00 UTC is 1 Oct 01:30 IST, so it belongs in Q4.
  INSERT INTO orders (id, customer_id, status, created_at, ordered_on) VALUES
    (101, 1, 'fulfilled', '2026-07-15 08:10:00', '2026-07-15'),
    (102, 2, 'fulfilled', '2026-08-02 10:00:00', '2026-08-02'),
    (103, 3, 'fulfilled', '2026-08-20 06:40:00', '2026-08-20'),
    (104, 4, 'cancelled', '2026-09-01 04:00:00', '2026-09-01'),
    (105, 5, 'fulfilled', '2026-09-18 13:20:00', '2026-09-18'),
    (106, 1, 'fulfilled', '2026-06-30 20:30:00', '2026-07-01'),
    (107, 4, 'fulfilled', '2026-09-30 20:00:00', '2026-10-01'),
    (108, 2, 'fulfilled', '2026-05-10 09:00:00', '2026-05-10'),
    (109, 5, 'fulfilled', '2026-10-02 07:15:00', '2026-10-02');

  INSERT INTO order_lines (id, order_id, product_id, qty, unit_price_cents, line_total_cents) VALUES
    (1, 101, 1, 2, 450000, 900000),
    (2, 101, 2, 1, 1200000, 1200000),
    (3, 102, 3, 1, 3000000, 3000000),
    (4, 103, 1, 1, 450000, 450000),
    (5, 104, 2, 1, 1200000, 1200000),
    (6, 105, 3, 1, 3000000, 3000000),
    (7, 105, 1, 3, 450000, 1350000),
    (8, 106, 4, 1, 800000, 800000),
    (9, 107, 2, 1, 1200000, 1200000),
    (10, 108, 1, 1, 450000, 450000),
    (11, 109, 4, 1, 800000, 800000);

  INSERT INTO invoices (id, order_id, merchandise_cents, tax_cents, total_cents, status) VALUES
    (1, 101, 2100000, 378000, 2478000, 'issued'),
    (2, 102, 3000000, 540000, 3540000, 'issued'),
    (3, 103, 450000, 81000, 531000, 'issued'),
    (4, 104, 1200000, 216000, 1416000, 'void'),
    (5, 105, 4350000, 783000, 5133000, 'issued'),
    (6, 106, 800000, 144000, 944000, 'issued'),
    (7, 107, 1200000, 216000, 1416000, 'issued'),
    (8, 108, 450000, 81000, 531000, 'issued'),
    (9, 109, 800000, 144000, 944000, 'issued');

  -- Order 102 is paid in two captures. Joining payments to lines fans out.
  INSERT INTO payments (id, order_id, amount_cents, status, paid_on) VALUES
    (1, 101, 2478000, 'captured', '2026-07-15'),
    (2, 102, 2000000, 'captured', '2026-08-02'),
    (3, 102, 1540000, 'captured', '2026-08-02'),
    (4, 103, 531000, 'captured', '2026-08-20'),
    (5, 104, 1416000, 'failed', '2026-09-01'),
    (6, 105, 5133000, 'captured', '2026-09-18'),
    (7, 106, 944000, 'captured', '2026-07-01'),
    (8, 107, 1416000, 'captured', '2026-10-01'),
    (9, 108, 531000, 'captured', '2026-05-10'),
    (10, 109, 944000, 'captured', '2026-10-02');

  INSERT INTO refunds (id, order_id, amount_cents, refunded_on, reason) VALUES
    (1, 105, 450000, '2026-09-25', 'Returned one Arc Lamp');

  -- Orders 103, 104, 106, and 109 have no tags.
  -- An inner join to this table drops them. Multiple tags multiply money.
  INSERT INTO order_tags (order_id, tag) VALUES
    (101, 'priority'),
    (101, 'repeat'),
    (102, 'new'),
    (105, 'priority'),
    (105, 'festival'),
    (105, 'west-ship'),
    (107, 'priority'),
    (108, 'clearance');
`)

export const TABLES: { name: string; note: string }[] = [
  { name: 'customers', note: 'Meera Shah is soft-deleted. Dev Patel has never ordered.' },
  { name: 'orders', note: 'created_at is UTC. ordered_on is the IST business date.' },
  { name: 'order_lines', note: 'This is the merchandise grain. Revenue is a sum of these rows.' },
  { name: 'products', note: 'Category lives on the product, not on the order.' },
  { name: 'invoices', note: 'total_cents is merchandise plus 18% tax.' },
  { name: 'payments', note: 'Order 102 was captured as two payments.' },
  { name: 'refunds', note: 'One lamp on order 105 was returned. Gross revenue keeps it.' },
  { name: 'order_tags', note: 'Many tags per order. Joining this before a sum multiplies the money.' },
]

export const TRAPS: string[] = [
  'Merchandise, invoice total, and cash collected are three different numbers.',
  'Split payments and order tags fan out. Join them before a sum and the metric multiplies.',
  'Order 106 is 30 Jun 20:30 UTC and 1 Jul 02:00 IST. Order 107 is the reverse edge on 30 Sep.',
  'Meera Shah still has a fulfilled order, and her customer row is soft-deleted.',
  'Cancelled order 104 still has a line, a void invoice, and a failed payment.',
]
