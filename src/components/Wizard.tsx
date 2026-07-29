import { useMemo } from 'react'
import type { Answers, Question } from '../rules/types'
import { visibleQuestions } from '../rules/questions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ChevronLeft, Info } from 'lucide-react'

interface Props {
  answers: Answers
  currentId: string | null
  onAnswer: (id: string, value: string | string[]) => void
  onNavigate: (id: string) => void
  onFinish: () => void
}

export default function Wizard({ answers, currentId, onAnswer, onNavigate, onFinish }: Props) {
  const visible = useMemo(() => visibleQuestions(answers), [answers])
  const idx = visible.findIndex((q) => q.id === currentId)
  const q: Question | undefined = visible[idx >= 0 ? idx : 0]
  const layers = useMemo(() => {
    const seen: { layer: number; label: string }[] = []
    for (const item of visible) {
      if (!seen.some((s) => s.layer === item.layer)) seen.push({ layer: item.layer, label: item.layerLabel })
    }
    return seen
  }, [visible])
  if (!q) return null

  const answered = new Set(Object.keys(answers))
  const currentLayer = q.layer
  const isLast = idx === visible.length - 1
  const canFinish =
    (isLast && answered.has(q.id)) ||
    answered.has('activities') ||
    (answered.has('resource_kind') && !visible.some((x) => x.id === 'activities'))

  const cur = answers[q.id]
  const selectedMulti = Array.isArray(cur) ? cur : []

  const choose = (v: string) => {
    if (q.multi) {
      let next: string[]
      if (v === 'none') {
        next = ['none']
      } else {
        next = selectedMulti.includes(v)
          ? selectedMulti.filter((x) => x !== v)
          : [...selectedMulti.filter((x) => x !== 'none'), v]
      }
      onAnswer(q.id, next)
    } else {
      onAnswer(q.id, v)
      const nextQ = visible[idx + 1]
      if (nextQ) onNavigate(nextQ.id)
    }
  }

  const progress = Math.round(((idx + 1) / visible.length) * 100)

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24">
      {/* 层级进度 */}
      <div className="mb-6 flex items-center gap-2">
        {layers.map(({ layer, label }, i) => {
          const state = layer < currentLayer ? 'done' : layer === currentLayer ? 'active' : 'todo'
          const shortLabel = label.replace(/^第 . 步 · |^第 . 层 · /, '')
          return (
            <div key={layer} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  state === 'done'
                    ? 'bg-teal-600 text-white'
                    : state === 'active'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                }`}
              >
                {state === 'done' ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`hidden text-xs sm:block ${
                  state === 'active' ? 'font-semibold text-indigo-700' : 'text-slate-500'
                }`}
              >
                {shortLabel}
              </span>
              {i < layers.length - 1 && (
                <div className={`h-px flex-1 ${layer < currentLayer ? 'bg-teal-500' : 'bg-slate-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
        <span>
          第 {idx + 1} / {visible.length} 题 · {q.layerLabel}
        </span>
        <span>{progress}%</span>
      </div>
      <div className="mb-6 h-1.5 w-full rounded-full bg-slate-100">
        <div className="h-1.5 rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* 问题卡片 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold leading-7 text-slate-900">{q.text}</h2>
        {q.help && (
          <div className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{q.help}</span>
          </div>
        )}
        <div className="mt-5 grid gap-2">
          {q.options.map((opt) => {
            const active = q.multi ? selectedMulti.includes(opt.value) : cur === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => choose(opt.value)}
                className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600'
                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
                }`}
              >
                <span>
                  <span className={`block text-sm font-medium ${active ? 'text-indigo-900' : 'text-slate-800'}`}>
                    {opt.label}
                  </span>
                  {opt.hint && <span className="mt-0.5 block text-xs text-slate-500">{opt.hint}</span>}
                </span>
                {active && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />}
              </button>
            )
          })}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            disabled={idx === 0}
            onClick={() => idx > 0 && onNavigate(visible[idx - 1].id)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> 上一题
          </Button>
          <div className="flex items-center gap-2">
            {q.multi && (
              <Button
                size="sm"
                disabled={selectedMulti.length === 0}
                onClick={() => {
                  const nextQ = visible[idx + 1]
                  if (nextQ) onNavigate(nextQ.id)
                }}
              >
                下一题
              </Button>
            )}
            {canFinish && (
              <Button size="sm" variant="outline" className="border-teal-600 text-teal-700 hover:bg-teal-50" onClick={onFinish}>
                生成评估报告 →
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 已答摘要 */}
      {answered.size > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium text-slate-500">已作答（点击可回看修改）</p>
          <div className="flex flex-wrap gap-1.5">
            {visible
              .filter((x) => answered.has(x.id) && x.id !== q.id)
              .map((x) => (
                <button key={x.id} onClick={() => onNavigate(x.id)}>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200">
                    {x.text.slice(0, 14)}…
                  </Badge>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
