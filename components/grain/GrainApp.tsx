'use client'

import { useEffect, useRef, useState } from 'react'
import ThemeToggle from '@/components/ThemeToggle'
import GrainReport from '@/components/grain/GrainReport'
import { answerQuestion, type Outcome, type Queryable } from '@/lib/grain/engine'
import { PROMPTS, type CaseId } from '@/lib/grain/cases'
import { SCHEMA_SQL, SEED_SQL, TABLES, TRAPS } from '@/lib/grain/seed'

type Ledger = Queryable & { close: () => void }

export default function GrainApp() {
  const dbRef = useRef<Ledger | null>(null)
  const [ready, setReady] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)
  const [draft, setDraft] = useState('What was revenue last quarter?')
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [activeTables, setActiveTables] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    let database: Ledger | null = null

    ;(async () => {
      try {
        const loaded = await import('sql.js')
        const initSqlJs = loaded.default
        const SQL = await initSqlJs({
          locateFile: (file) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/${file}`,
        })
        const db = new SQL.Database()
        db.run(SEED_SQL)
        if (cancelled) {
          db.close()
          return
        }
        database = db
        dbRef.current = db
        const first = answerQuestion(db, 'What was revenue last quarter?', 'revenue')
        setOutcome(first)
        setActiveTables(first.ok ? first.result.tables : [])
        setReady(true)
      } catch (error) {
        if (!cancelled) {
          setBootError(error instanceof Error ? error.message : 'Could not open the ledger.')
        }
      }
    })()

    return () => {
      cancelled = true
      database?.close()
      dbRef.current = null
    }
  }, [])

  function ask(text: string, forcedId?: CaseId) {
    const trimmed = text.trim()
    if (!trimmed || !dbRef.current) return
    const next = answerQuestion(dbRef.current, trimmed, forcedId)
    setDraft(trimmed)
    setOutcome(next)
    setActiveTables(next.ok ? next.result.tables : [])
  }

  return (
    <div className="grain-app">
      <style>{GRAIN_CSS}</style>
      <header className="grain-top">
        <div className="section-container grain-top-inner">
          <a href="https://skx56.dev" className="grain-back">
            ← Portfolio
          </a>
          <p>Grain</p>
          <ThemeToggle />
        </div>
      </header>

      <main className="section-container grain-main">
        <p className="grain-kicker">Harbor &amp; Co. · books closed 4 Oct 2026</p>
        <h1>
          The SQL agent that{' '}
          <span className="gradient-text">shows its work.</span>
        </h1>
        <p className="grain-intro">
          Last quarter is Q3 2026. The ledger has three meanings of money, a soft-deleted buyer,
          and two orders that fall on different sides of midnight depending on the clock. Your
          words pick a defended query. They are never concatenated into SQL.
        </p>

        <section className="grain-schema" aria-label="Ledger tables">
          <div className="grain-table-pills">
            {TABLES.map((table) => {
              const on = activeTables.includes(table.name)
              return (
                <span key={table.name} className={on ? 'is-on' : ''} title={table.note}>
                  {table.name}
                </span>
              )
            })}
          </div>
          <ul>
            {TRAPS.map((trap) => (
              <li key={trap}>{trap}</li>
            ))}
          </ul>
        </section>

        <form
          className="grain-ask"
          onSubmit={(event) => {
            event.preventDefault()
            ask(draft)
          }}
        >
          <label htmlFor="grain-q">Ask the ledger</label>
          <div className="grain-ask-row">
            <input
              id="grain-q"
              className="grain-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about revenue, customers, category, or cash"
              autoComplete="off"
              spellCheck={false}
              disabled={!ready}
            />
            <button type="submit" disabled={!ready || draft.trim() === ''}>
              {ready ? 'Run' : 'Opening…'}
            </button>
          </div>
          <div className="grain-chips">
            {PROMPTS.map((prompt) => {
              const selected = outcome?.ok && outcome.result.question === prompt.label
              return (
                <button
                  key={prompt.id}
                  type="button"
                  className={selected ? 'is-on' : ''}
                  disabled={!ready}
                  onClick={() => ask(prompt.label, prompt.id)}
                >
                  {prompt.label}
                </button>
              )
            })}
          </div>
        </form>

        {bootError && (
          <p className="grain-banner" role="alert">
            The ledger did not open. {bootError}
          </p>
        )}

        {outcome && !outcome.ok && <p className="grain-banner">{outcome.message}</p>}
        {outcome?.ok && <GrainReport result={outcome.result} />}

        <details className="grain-schema-sql">
          <summary>Ledger schema</summary>
          <pre>{SCHEMA_SQL}</pre>
        </details>

        <p className="grain-foot">SQLite is running in this tab. Nothing is sent to a server.</p>
      </main>
    </div>
  )
}

const GRAIN_CSS = `
.grain-app { min-height: 100vh; background: var(--bg); color: var(--text-primary); }
.grain-top {
  position: sticky; top: 0; z-index: 40;
  background: var(--nav-bg);
  border-bottom: 1px solid var(--nav-border);
  backdrop-filter: blur(20px);
}
.grain-top-inner { display: flex; align-items: center; justify-content: space-between; height: 64px; gap: 16px; }
.grain-top-inner p { font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; font-size: 12px; color: var(--text-secondary); }
.grain-back { color: var(--text-secondary); text-decoration: none; font-weight: 700; font-size: 14px; }
.grain-back:hover { color: #14B8A6; }
.grain-main { padding-top: 3.5rem; padding-bottom: 5rem; }
.grain-kicker {
  color: #14B8A6; letter-spacing: 0.18em; text-transform: uppercase;
  font-size: 11px; font-weight: 800; margin-bottom: 0.75rem;
}
.grain-main h1 {
  font-size: clamp(2.2rem, 5vw, 4rem); line-height: 1.05; font-weight: 900;
  letter-spacing: -0.03em; max-width: 16ch; margin-bottom: 1rem;
}
.grain-intro { max-width: 68ch; color: var(--text-secondary); font-size: 1.05rem; line-height: 1.6; margin-bottom: 1.75rem; }
.grain-schema, .grain-pass, .grain-banner, .grain-schema-sql {
  background: var(--bg-card);
  border: 1px solid var(--bg-card-border);
  border-radius: 18px;
  box-shadow: 0 8px 30px var(--shadow);
}
.grain-schema { padding: 1.1rem 1.2rem 1.2rem; margin-bottom: 1.25rem; }
.grain-table-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 0.9rem; }
.grain-table-pills span {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px; padding: 6px 10px; border-radius: 999px;
  border: 1px solid var(--bg-card-border); color: var(--text-muted);
}
.grain-table-pills span.is-on {
  color: #0F766E; border-color: rgba(20,184,166,0.45);
  background: rgba(20,184,166,0.14);
}
[data-theme="dark"] .grain-table-pills span.is-on { color: #5EEAD4; }
.grain-schema ul { display: grid; gap: 0.45rem; padding-left: 1.1rem; color: var(--text-secondary); font-size: 0.92rem; line-height: 1.45; list-style: disc; }
.grain-ask { margin: 0.5rem 0 1.5rem; }
.grain-ask label { display: block; font-size: 12px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.55rem; }
.grain-ask-row { display: flex; gap: 10px; }
.grain-input {
  flex: 1; min-width: 0; border-radius: 14px; padding: 0.95rem 1rem;
  background: var(--bg-card); color: var(--text-primary);
  border: 1px solid var(--bg-card-border); font: inherit; font-size: 1rem;
}
.grain-input:focus { outline: none; border-color: rgba(20,184,166,0.75); box-shadow: 0 0 0 4px rgba(20,184,166,0.15); }
.grain-ask-row button, .grain-chips button {
  border-radius: 14px; font: inherit; font-weight: 800; cursor: pointer;
}
.grain-ask-row button {
  border: 0; padding: 0 1.3rem; color: #042f2e;
  background: linear-gradient(135deg, #14B8A6, #0EA5E9);
}
.grain-ask-row button:disabled, .grain-chips button:disabled { opacity: 0.55; cursor: wait; }
.grain-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 0.8rem; }
.grain-chips button {
  background: var(--bg-card); color: var(--text-secondary);
  border: 1px solid var(--bg-card-border); padding: 0.55rem 0.8rem; font-size: 0.86rem; text-align: left;
}
.grain-chips button.is-on {
  color: #0F766E; border-color: rgba(20,184,166,0.5); background: rgba(20,184,166,0.12);
}
[data-theme="dark"] .grain-chips button.is-on { color: #5EEAD4; }
.grain-banner { padding: 1rem 1.1rem; margin-bottom: 1rem; color: var(--text-primary); line-height: 1.5; }
.grain-report { display: flex; flex-direction: column; gap: 0.9rem; }
.grain-asked h2 { font-size: clamp(1.5rem, 3vw, 2.1rem); letter-spacing: -0.03em; line-height: 1.15; }
.grain-readas { margin-top: 0.45rem; color: var(--text-secondary); }
.grain-stack { display: flex; flex-direction: column; gap: 0.9rem; }
.grain-pass { padding: 1.15rem 1.2rem 1.25rem; }
.grain-pass-index { display: flex; align-items: baseline; gap: 0.7rem; margin-bottom: 0.75rem; }
.grain-pass-index span { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #14B8A6; font-weight: 800; font-size: 12px; }
.grain-pass-index h3 { font-size: 1.15rem; letter-spacing: -0.02em; }
.grain-lead, .grain-caption, .grain-findings p, .grain-sens p, .grain-rejected-list p { color: var(--text-secondary); line-height: 1.55; }
.grain-rejected-list { list-style: none; display: grid; gap: 0.7rem; margin-top: 0.9rem; }
.grain-rejected-list span {
  display: inline-block; font-size: 12px; font-weight: 800; letter-spacing: 0.04em;
  text-transform: uppercase; color: #E11D48; margin-bottom: 0.15rem;
}
.grain-path, .grain-filters { display: flex; flex-wrap: wrap; gap: 8px; }
.grain-path { margin-bottom: 0.7rem; }
.grain-path code, .grain-filters span {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px; padding: 6px 8px; border-radius: 8px;
  background: rgba(20,184,166,0.1); color: var(--text-primary);
}
.grain-grain-level { font-size: clamp(1.25rem, 2.5vw, 1.7rem); font-weight: 800; letter-spacing: -0.03em; margin-bottom: 0.45rem; }
.grain-compare { display: grid; grid-template-columns: 1fr; gap: 10px; margin: 0.9rem 0; }
@media (min-width: 800px) { .grain-compare { grid-template-columns: 1fr 1fr; } }
.grain-compare-card { border-radius: 14px; padding: 0.9rem 1rem; border: 1px solid var(--bg-card-border); }
.grain-compare-card p { font-size: 11px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 0.3rem; }
.grain-compare-card strong { display: block; font-size: clamp(1.6rem, 3vw, 2.2rem); letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
.grain-compare-card span { display: block; margin-top: 0.35rem; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.4; }
.grain-compare-card.is-bad { background: rgba(244,63,94,0.08); }
.grain-compare-card.is-bad p, .grain-compare-card.is-bad strong { color: #E11D48; }
.grain-compare-card.is-good { background: rgba(20,184,166,0.1); }
.grain-compare-card.is-good p, .grain-compare-card.is-good strong { color: #0F766E; }
[data-theme="dark"] .grain-compare-card.is-bad p, [data-theme="dark"] .grain-compare-card.is-bad strong { color: #FB7185; }
[data-theme="dark"] .grain-compare-card.is-good p, [data-theme="dark"] .grain-compare-card.is-good strong { color: #5EEAD4; }
.grain-findings { display: grid; gap: 0.8rem; margin: 0.2rem 0 1rem; padding-left: 1.2rem; list-style: decimal; }
.grain-findings strong { color: var(--text-primary); }
.grain-sql { border-radius: 14px; overflow: hidden; background: #071210; border: 1px solid rgba(20,184,166,0.28); }
.grain-sql.is-rejected { border-color: rgba(244,63,94,0.35); }
.grain-sql-bar { display: flex; justify-content: space-between; align-items: center; padding: 0.45rem 0.7rem; color: #99f6e4; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 800; }
.grain-sql.is-rejected .grain-sql-bar { color: #FECDD3; }
.grain-sql-bar button { background: transparent; color: inherit; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 0.25rem 0.5rem; cursor: pointer; font: inherit; letter-spacing: 0.08em; }
.grain-sql pre { margin: 0; padding: 0 0.9rem 0.9rem; overflow-x: auto; color: #d1fae5; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12.5px; line-height: 1.55; white-space: pre; }
.grain-answer { font-size: clamp(2.4rem, 6vw, 4.2rem); font-weight: 900; letter-spacing: -0.045em; line-height: 1; font-variant-numeric: tabular-nums; }
.grain-caption { margin: 0.55rem 0 1rem; }
.grain-table-wrap { overflow-x: auto; }
.grain-table-wrap table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
.grain-table-wrap caption { text-align: left; caption-side: top; color: var(--text-muted); font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 0.45rem; }
.grain-table-wrap th, .grain-table-wrap td { text-align: left; padding: 0.55rem 0.7rem; border-bottom: 1px solid var(--divider); white-space: nowrap; }
.grain-table-wrap th { color: var(--text-muted); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; }
.grain-sens { display: grid; grid-template-columns: 1fr; gap: 10px; }
@media (min-width: 900px) { .grain-sens { grid-template-columns: 1fr 1fr 1fr; } }
.grain-sens article { border: 1px solid var(--bg-card-border); border-radius: 14px; padding: 0.9rem; background: var(--bg); }
.grain-sens header { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
.grain-sens h3 { font-size: 0.95rem; line-height: 1.3; }
.grain-sens header span { color: #0F766E; font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
[data-theme="dark"] .grain-sens header span { color: #5EEAD4; }
.grain-sens-value { color: var(--text-primary) !important; font-size: 1.35rem; font-weight: 800; letter-spacing: -0.03em; margin: 0.35rem 0; font-variant-numeric: tabular-nums; }
.grain-schema-sql { margin-top: 1.25rem; padding: 0.9rem 1rem 1rem; }
.grain-schema-sql summary { cursor: pointer; font-weight: 800; }
.grain-schema-sql pre { margin-top: 0.8rem; overflow-x: auto; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.5; color: var(--text-secondary); }
.grain-foot { margin-top: 1rem; color: var(--text-muted); font-size: 0.9rem; }
@media (max-width: 640px) {
  .grain-ask-row { flex-direction: column; }
  .grain-ask-row button { height: 48px; }
}
`
