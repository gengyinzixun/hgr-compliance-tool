import { useEffect, useMemo } from 'react'
import type { Answers, Question } from '../rules/types'
import { visibleQuestions } from '../rules/questions'
import { GLOSSARY } from '../rules/glossary'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookMarked, CheckCircle2, ChevronLeft, Info } from 'lucide-react'

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

  // 兜底：当前题已不在可见序列中（答案变更导致题目被剪除）时，
  // 不静默回退到第 1 题，而是跳到第一个未作答的可见题
  useEffect(() => {
    if (idx === -1 && visible.length > 0) {
      const firstUnanswered = visible.find((x) => answers[x.id] === undefined)
      onNavigate((firstUnanswered ?? visible[visible.length - 1]).id)
    }
  }, [idx, visible, answers, onNavigate])

  if (!q) return null

  const answered = new Set(Object.keys(answers))
  const currentLayer = q.layer
  const isLast = idx === visible.length - 1
  // 多选题取消全部选项后 key 仍在但为空数组，视为未作答
  const isAnswered = (id: string) => {
    const v = answers[id]
    return Array.isArray(v) ? v.length > 0 : v !== undefined
  }
  // 仅当所有可见题均已作答时才出现"生成评估报告"，
  // 避免中途同时出现"下一题"和"生成报告"导致用户漏答后续题目
  const canFinish = visible.every((x) => isAnswered(x.id))

  const cur = answers[q.id]
  const selectedMulti = Array.isArray(cur) ? cur : []

  // 用"回答后的新答案"重新计算题目序列，再定位当前题的下一题。
  // 不能用渲染时的旧 visible：答案可能改变后续题目的可见性
  // （如 resource_kind=info_only 后 material_type 被隐藏），
  // 旧列表算出的下一题在新列表中不存在，会错误回退到第 1 题。
  const gotoNext = (nextAnswers: Answers) => {
    const nextVisible = visibleQuestions(nextAnswers)
    const curIdx = nextVisible.findIndex((x) => x.id === q.id)
    const nextQ = curIdx >= 0 ? nextVisible[curIdx + 1] : undefined
    if (nextQ) onNavigate(nextQ.id)
  }

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
      gotoNext({ ...answers, [q.id]: v })
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
        {q.terms && q.terms.length > 0 && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
              <BookMarked className="h-3.5 w-3.5" /> 相关术语官方定义
            </p>
            <ul className="space-y-1.5">
              {q.terms.map((tid) => {
                const t = GLOSSARY[tid]
                if (!t) return null
                return (
                  <li key={tid} className="text-[11px] leading-5 text-slate-600">
                    <span className="font-medium text-slate-800">{t.term}</span>：{t.definition}
                    <span className="block pl-3 text-[10px] text-slate-400">—— {t.source}</span>
                  </li>
                )
              })}
            </ul>
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
            {q.multi && !isLast && (
              <Button
                size="sm"
                disabled={selectedMulti.length === 0}
                onClick={() => gotoNext(answers)}
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

      {/* 已答摘要（answers 始终含 _flow 控制字段，需先过滤再判断是否渲染） */}
      {(() => {
        const answeredOthers = visible.filter((x) => answered.has(x.id) && x.id !== q.id)
        if (answeredOthers.length === 0) return null
        return (
          <div className="mt-6">
            <p className="mb-2 text-xs font-medium text-slate-500">已作答（点击可回看修改）</p>
            <div className="flex flex-wrap gap-1.5">
              {answeredOthers.map((x) => (
                <button key={x.id} onClick={() => onNavigate(x.id)}>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200">
                    {x.text.slice(0, 14)}…
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
