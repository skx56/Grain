# Grain

A SQL agent that will not return a number until it can defend it.

Ask Harbor & Co. about last quarter. Grain locks the metric, the join path, and the grain of the result, runs the query it is about to refuse, and only then executes the query it will stand behind. Both numbers come from SQLite running in the browser. Nothing is sent to a server, and the question text is never concatenated into SQL.

The books are frozen at 4 Oct 2026, so “last quarter” stays Q3. The ledger is hostile on purpose: three meanings of money, split payments, soft deletes, tag fan-out, and two orders that cross midnight differently in UTC and IST.

## Questions it will answer

- What was revenue last quarter?
- How many active customers?
- Which category led last quarter?
- How much cash was collected last quarter?

Anything else is refused.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run check
npm run build
```

`check` executes the defended queries, the rejected queries, and the sensitivity cases against the seeded ledger. `build` writes a static export to `out/`.
