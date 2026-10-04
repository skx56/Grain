// Run with: npx tsx scripts/check-grain.mjs
import { createRequire } from 'node:module'
import path from 'node:path'
import { SEED_SQL } from '../lib/grain/seed.ts'
import { answerQuestion } from '../lib/grain/engine.ts'
import { routeQuestion } from '../lib/grain/cases.ts'

const require = createRequire(import.meta.url)
const initSqlJs = require('sql.js')

const SQL = await initSqlJs({
  locateFile: (file) => path.join(process.cwd(), 'node_modules/sql.js/dist', file),
})

const db = new SQL.Database()
db.run(SEED_SQL)

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function run(id, question) {
  const outcome = answerQuestion(db, question, id)
  assert(outcome.ok, `${id} failed: ${outcome.ok ? '' : outcome.message}`)
  return outcome.result
}

const revenue = run('revenue', 'What was revenue last quarter?')
assert(revenue.presentation.comparable === 10700000, `revenue ${revenue.presentation.comparable}`)
assert(revenue.critic.rejectedValue === 24450000, `revenue rejected ${revenue.critic.rejectedValue}`)
assert(
  revenue.rows.map((row) => row.order_id).join(',') === '106,101,101,102,103,105,105',
  `revenue rows ${revenue.rows.map((row) => row.order_id).join(',')}`,
)
assert(revenue.sensitivities.map((item) => item.display).join(' | ') === '₹1,02,500 | ₹1,26,260 | ₹1,19,000', revenue.sensitivities.map((item) => item.display).join(' | '))

const customers = run('customers', 'How many active customers?')
assert(customers.presentation.comparable === 4, `customers ${customers.presentation.comparable}`)
assert(customers.critic.rejectedValue === 5, `customers rejected ${customers.critic.rejectedValue}`)
assert(customers.rows.map((row) => row.customer).sort().join(',') === 'Asha Rao,Kabir Das,Lena Ortiz,Rohan Iyer', customers.rows.map((row) => row.customer).join(','))
assert(customers.sensitivities.every((item) => item.display === '5'), JSON.stringify(customers.sensitivities))

const category = run('category', 'Which category led last quarter?')
assert(category.presentation.title === 'Furniture', category.presentation.title)
assert(category.presentation.comparable === 7200000, `category ${category.presentation.comparable}`)
assert(category.critic.rejectedValue === 15600000, `category rejected ${category.critic.rejectedValue}`)
assert(category.rows.map((row) => `${row.category}:${row.value}`).join('|') === 'Furniture:7200000|Lighting:2700000|Storage:800000', category.rows.map((row) => `${row.category}:${row.value}`).join('|'))
assert(category.sensitivities[0].display === '₹84,000', category.sensitivities[0].display)
assert(category.sensitivities[1].display === '₹22,500', category.sensitivities[1].display)

const cash = run('cash', 'How much cash was collected last quarter?')
assert(cash.presentation.comparable === 12626000, `cash ${cash.presentation.comparable}`)
assert(cash.critic.rejectedValue === 20237000, `cash rejected ${cash.critic.rejectedValue}`)
assert(cash.rows.length === 6, `cash rows ${cash.rows.length}`)
assert(cash.sensitivities.map((item) => item.display).join(' | ') === '₹1,21,760 | ₹1,07,000', cash.sensitivities.map((item) => item.display).join(' | '))

assert(routeQuestion('revenue by category last quarter') === 'category', 'route category')
assert(routeQuestion('how much cash did we collect') === 'cash', 'route cash')
assert(routeQuestion('active customers please') === 'customers', 'route customers')
assert(routeQuestion('what were sales last quarter') === 'revenue', 'route revenue')
assert(routeQuestion('tell me a joke') === null, 'route refuse')

const refused = answerQuestion(db, 'tell me a joke')
assert(!refused.ok, 'expected refusal')

db.close()
console.log('grain ledger checks passed')
