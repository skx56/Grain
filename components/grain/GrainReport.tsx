'use client'

import { useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { RunResult } from '@/lib/grain/engine'
import { formatDay } from '@/lib/grain/format'
import type { Column } from '@/lib/grain/cases'

function cellText(column: Column, value: string | number | null): string {
  if (value == null) return '—'
  if (column.kind === 'inr') {
    const cents = typeof value === 'number' ? value : Number(value)
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(cents / 100)
  }
  if (column.kind === 'date') return formatDay(String(value))
  return String(value)
}

function SqlBlock({ sql, tone }: { sql: string; tone: 'shipped' | 'rejected' }) {
  const [copied, setCopied] = useState(false)
  const rejected = tone === 'rejected'

  return (
    <div className={`grain-sql ${rejected ? 'is-rejected' : ''}`}>
      <div className="grain-sql-bar">
        <span>{rejected ? 'Rejected query' : 'Shipped query'}</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(sql).then(() => {
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1400)
            })
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre>{sql}</pre>
    </div>
  )
}

export default function GrainReport({ result }: { result: RunResult }) {
  const reduceMotion = useReducedMotion()
  const interpreted = result.asked.trim().toLowerCase() !== result.question.toLowerCase()

  return (
    <div className="grain-report" aria-live="polite">
      <motion.header
        className="grain-asked"
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <p className="grain-kicker">You asked</p>
        <h2>{result.asked}</h2>
        {interpreted && (
          <p className="grain-readas">
            Read as <strong>{result.question}</strong>
          </p>
        )}
      </motion.header>

      <div className="grain-stack">
        <Pass n="01" title="Metric locked">
          <p className="grain-lead">{result.assumption.chosen}</p>
          <ul className="grain-rejected-list">
            {result.assumption.rejected.map((item) => (
              <li key={item.name}>
                <span>{item.name}</span>
                <p>{item.why}</p>
              </li>
            ))}
          </ul>
        </Pass>

        <Pass n="02" title="Schema path">
          <div className="grain-path">
            {result.joins.map((join) => (
              <code key={join}>{join}</code>
            ))}
          </div>
          <div className="grain-filters">
            {result.filters.map((filter) => (
              <span key={filter}>{filter}</span>
            ))}
          </div>
        </Pass>

        <Pass n="03" title="Grain">
          <p className="grain-grain-level">{result.grain.level}</p>
          <p className="grain-lead">{result.grain.detail}</p>
        </Pass>

        <Pass n="04" title="Critic">
          <p className="grain-lead">
            Grain runs the query it is about to refuse, so the bad number is measured.
          </p>
          <div className="grain-compare">
            <div className="grain-compare-card is-bad">
              <p>Rejected</p>
              <strong>{result.rejectedDisplay}</strong>
              <span>{result.critic.rejectedLabel}</span>
            </div>
            <div className="grain-compare-card is-good">
              <p>Shipped</p>
              <strong>{result.shippedDisplay}</strong>
              <span>{result.presentation.caption}</span>
            </div>
          </div>
          <ol className="grain-findings">
            {result.critic.findings.map((finding) => (
              <li key={finding.title}>
                <strong>{finding.title}</strong>
                <p>{finding.detail}</p>
              </li>
            ))}
          </ol>
          <SqlBlock sql={result.critic.rejectedSql} tone="rejected" />
        </Pass>

        <Pass n="05" title="Query it will defend">
          <SqlBlock sql={result.sql} tone="shipped" />
        </Pass>

        <Pass n="06" title="Answer">
          <p className="grain-kicker">{result.presentation.kicker}</p>
          <p className="grain-answer">{result.presentation.title}</p>
          <p className="grain-caption">{result.presentation.caption}</p>
          <div className="grain-table-wrap">
            <table>
              <caption>
                {result.rows.length} {result.rows.length === 1 ? 'row' : 'rows'} behind this number
              </caption>
              <thead>
                <tr>
                  {result.columns.map((column) => (
                    <th key={column.key} scope="col">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, index) => (
                  <tr key={index}>
                    {result.columns.map((column) => (
                      <td key={column.key}>{cellText(column, row[column.key] ?? null)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Pass>

        <Pass n="07" title="If the definition moves">
          <div className="grain-sens">
            {result.sensitivities.map((item) => (
              <article key={item.label}>
                <header>
                  <h3>{item.label}</h3>
                  {item.delta && <span>{item.delta}</span>}
                </header>
                <p className="grain-sens-value">{item.display}</p>
                <p>{item.explanation}</p>
              </article>
            ))}
          </div>
        </Pass>
      </div>
    </div>
  )
}

function Pass({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.section
      className="grain-pass"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: reduceMotion ? 0 : Number(n) * 0.04 }}
    >
      <div className="grain-pass-index">
        <span>{n}</span>
        <h3>{title}</h3>
      </div>
      {children}
    </motion.section>
  )
}
