'use client'

import { useState } from 'react'
import type { NpsYearResult, NpsQuestionResult } from '@/lib/data'

interface Props {
  years: NpsYearResult[]
}

export function NpsCharts({ years }: Props) {
  const [yearIdx, setYearIdx] = useState(0)
  const [surveyIdx, setSurveyIdx] = useState(0)

  const year = years[yearIdx]
  const survey = year.surveys[surveyIdx]

  return (
    <div className="space-y-6">
      {years.length > 1 && (
        <div className="flex gap-2">
          {years.map((y, i) => (
            <button
              key={y.eventSlug}
              type="button"
              onClick={() => setYearIdx(i)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-mono border transition-colors ${
                i === yearIdx ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {y.year}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {year.surveys.map((s, i) => (
          <button
            key={s.slug}
            type="button"
            onClick={() => setSurveyIdx(i)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-mono border transition-colors ${
              i === surveyIdx ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'
            }`}
          >
            {s.title} ({s.responseCount})
          </button>
        ))}
      </div>

      <p className="text-[11px] font-mono text-muted-foreground/60">
        {survey.responseCount} resposta{survey.responseCount !== 1 ? 's' : ''} recebida{survey.responseCount !== 1 ? 's' : ''}
      </p>

      <div className="space-y-4">
        {survey.questions.map(q => <QuestionCard key={q.id} q={q} />)}
      </div>
    </div>
  )
}

function QuestionCard({ q }: { q: NpsQuestionResult }) {
  if ((q.type === 'nps' || q.type === 'scale') && q.responseCount === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <p className="text-sm font-medium text-foreground mb-2">{q.text}</p>
        <p className="text-[12px] text-muted-foreground/50">Sem respostas ainda.</p>
      </div>
    )
  }

  if (q.type === 'nps' && q.npsScore !== null) {
    const cls = q.npsScore >= 50 ? 'text-[oklch(0.62_0.14_162)]' : q.npsScore < 0 ? 'text-red-600' : 'text-foreground'
    return (
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <p className="text-sm font-medium text-foreground mb-3">{q.text}</p>
        <div className="flex items-baseline gap-4 flex-wrap">
          <span className={`font-display text-4xl tabular-nums ${cls}`}>NPS {q.npsScore}</span>
          <span className="text-[11px] font-mono text-muted-foreground">
            {q.promoters} promotores · {q.passives} neutros · {q.detractors} detratores
          </span>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground/50 mt-2">{q.responseCount} resposta{q.responseCount !== 1 ? 's' : ''}</p>
      </div>
    )
  }

  if (q.type === 'nps' || q.type === 'scale') {
    return (
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <p className="text-sm font-medium text-foreground mb-3">{q.text}</p>
        <div className="flex items-baseline gap-1">
          <span className="font-display text-4xl tabular-nums text-foreground">{q.average?.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">/10</span>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground/50 mt-2">{q.responseCount} resposta{q.responseCount !== 1 ? 's' : ''}</p>
      </div>
    )
  }

  if (q.type === 'single' || q.type === 'multi') {
    if (q.choiceCounts.length === 0) {
      return (
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <p className="text-sm font-medium text-foreground mb-2">{q.text}</p>
          <p className="text-[12px] text-muted-foreground/50">Sem respostas ainda.</p>
        </div>
      )
    }
    const max = q.choiceCounts[0]?.count ?? 1
    return (
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <p className="text-sm font-medium text-foreground mb-3">{q.text}</p>
        <div className="space-y-2.5">
          {q.choiceCounts.map(c => (
            <div key={c.label} className="flex items-center gap-3">
              <span className="text-[12px] text-foreground/80 w-[40%] shrink-0 truncate">{c.label}</span>
              <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(c.count / max) * 100}%` }} />
              </div>
              <span className="text-[11px] font-mono text-muted-foreground w-16 text-right shrink-0">{c.count} · {c.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] font-mono text-muted-foreground/50 mt-3">{q.responseCount} resposta{q.responseCount !== 1 ? 's' : ''}</p>
      </div>
    )
  }

  // text
  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
      <p className="text-sm font-medium text-foreground mb-3">{q.text} <span className="text-muted-foreground/50 font-normal">({q.textAnswers.length})</span></p>
      {q.textAnswers.length === 0 ? (
        <p className="text-[12px] text-muted-foreground/50">Sem comentários ainda.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {q.textAnswers.map((a, i) => (
            <p key={i} className="text-[13px] text-foreground/80 bg-muted/30 border border-border/60 rounded p-2.5">{a}</p>
          ))}
        </div>
      )}
    </div>
  )
}
