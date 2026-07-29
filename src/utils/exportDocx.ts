import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import type { Answers, Conclusion, ConclusionType, Confidence } from '../rules/types'
import type { EvalResult } from '../rules/evaluate'
import { questions } from '../rules/questions'

const TYPE_LABEL: Record<ConclusionType, string> = {
  prohibited: '禁止事项',
  'security-review': '安全审查',
  approval: '行政许可',
  filing: '备案',
  report: '事先报告',
  exempt: '无需申报 / 豁免',
  notice: '合规提示',
}

const CONF_LABEL: Record<Confidence, string> = {
  A: 'A · 法规条文',
  B: 'B · 官方解答口径',
  C: 'C · 实践惯例',
}

const FONT = { ascii: 'Times New Roman', hAnsi: 'Times New Roman', eastAsia: 'SimSun' }

const t = (text: string, opts: { bold?: boolean; size?: number; color?: string; italics?: boolean } = {}) =>
  new TextRun({ text, font: FONT, size: opts.size ?? 21, bold: opts.bold, color: opts.color, italics: opts.italics })

const p = (text: string, opts: Parameters<typeof t>[1] & { spacing?: number } = {}) =>
  new Paragraph({ children: [t(text, opts)], spacing: { after: opts.spacing ?? 120 } })

function answerSummaryRows(answers: Answers): TableRow[] {
  const rows: TableRow[] = []
  const flow = answers._flow === 'existing' ? '已获批项目变更评估' : '新项目申报评估'
  rows.push(
    new TableRow({
      children: [
        cell('评估类型', true),
        cell(flow),
      ],
    }),
  )
  for (const q of questions) {
    const v = answers[q.id]
    if (v === undefined) continue
    const labels = (Array.isArray(v) ? v : [v])
      .map((x) => q.options.find((o) => o.value === x)?.label ?? x)
      .join('；')
    rows.push(new TableRow({ children: [cell(q.text, true), cell(labels)] }))
  }
  return rows
}

function cell(text: string, head = false): TableCell {
  return new TableCell({
    width: head ? { size: 35, type: WidthType.PERCENTAGE } : { size: 65, type: WidthType.PERCENTAGE },
    shading: head ? { type: ShadingType.SOLID, fill: 'F1F5F9' } : undefined,
    children: [new Paragraph({ children: [t(text, { size: 18, bold: head })] })],
  })
}

function conclusionBlocks(c: Conclusion, idx: number): Paragraph[] {
  const out: Paragraph[] = []
  out.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 320, after: 120 },
      children: [t(`${idx + 1}. 【${TYPE_LABEL[c.type]}】${c.title}`, { bold: true, size: 26 })],
    }),
  )
  out.push(p(`结论说明：${c.summary}`, { spacing: 160 }))
  if (c.reasons.length > 0) out.push(p(`判定路径：${c.reasons.join('；')}`, { color: '64748B', size: 19 }))
  if (c.citations.length > 0) {
    out.push(p('依据条款：', { bold: true, size: 19, spacing: 60 }))
    for (const ci of c.citations) {
      out.push(p(`· ${ci.source} ${ci.article}（${CONF_LABEL[ci.confidence]}）`, { size: 19, spacing: 40 }))
      if (ci.note) out.push(p(`  ※ ${ci.note}`, { size: 17, color: '94A3B8', spacing: 60 }))
    }
  }
  if (c.obligations.length > 0) {
    out.push(p('后续义务与时限：', { bold: true, size: 19, spacing: 60 }))
    for (const ob of c.obligations) {
      out.push(p(`· ${ob.title}：${ob.deadline}`, { size: 19, spacing: 40 }))
    }
  }
  if (c.risk) out.push(p(`风险提示：${c.risk}`, { color: 'B91C1C', size: 19 }))
  return out
}

export async function exportReportDocx(result: EvalResult, answers: Answers): Promise<void> {
  const isExisting = answers._flow === 'existing'
  const unitLabel =
    result.unitType === 'chinese' ? '中方单位' : result.unitType === 'foreign' ? '外方单位' : '性质待定（需人工判定）'

  const children: (Paragraph | Table)[] = []

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [t('人类遗传资源申报备案评估报告', { bold: true, size: 36 })],
    }),
  )
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
      children: [
        t(`${isExisting ? '已获批项目变更评估' : '新项目申报评估'} · 生成时间：${new Date().toLocaleString('zh-CN')}`, {
          size: 19,
          color: '64748B',
        }),
      ],
    }),
  )

  // 一、评估结论总览
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 160 },
      children: [t('一、评估结论总览', { bold: true, size: 30 })],
    }),
  )
  if (!isExisting) {
    children.push(p(`单位性质判定：${unitLabel}`))
    children.push(p(`涉及受监管人遗材料：${result.regulatedMaterial ? '是' : '否'}；涉及受监管人遗信息：${result.regulatedInfo ? '是' : '否'}`, { spacing: 200 }))
  }
  const actionable = result.conclusions.filter((c) => ['prohibited', 'security-review', 'approval', 'filing', 'report'].includes(c.type))
  children.push(
    p(
      actionable.length > 0
        ? `本项目存在 ${actionable.length} 项需要办理的事项：${actionable.map((c) => c.title).join('；')}。`
        : '现有信息下，本项目无强制申报 / 审批事项。',
      { bold: true, spacing: 200 },
    ),
  )

  // 二、逐项结论
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 120 },
      children: [t('二、逐项结论与依据', { bold: true, size: 30 })],
    }),
  )
  result.conclusions.forEach((c, i) => children.push(...conclusionBlocks(c, i)))

  // 三、灰色地带
  if (result.grayAreas.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
        children: [t('三、需人工进一步确认的事项', { bold: true, size: 30 })],
      }),
    )
    for (const g of result.grayAreas) {
      children.push(p(`· ${g.question}（回答：${g.answer}）——${g.advice}`, { size: 20, color: '92400E', spacing: 100 }))
    }
  }

  // 四、回答摘要
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 160 },
      children: [t('四、评估回答摘要', { bold: true, size: 30 })],
    }),
  )
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
        bottom: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
        left: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
        right: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
        insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' },
      },
      rows: answerSummaryRows(answers),
    }),
  )

  // 声明
  children.push(
    new Paragraph({
      spacing: { before: 360 },
      children: [
        t(
          '声明：本报告由规则引擎基于《中华人民共和国人类遗传资源管理条例》（2024 修订）及其实施细则（2023）、《人类遗传资源管理常见问题解答》（2023.09）自动生成；受理机关按现行口径统一表述为国家卫生健康委员会（2023 年机构改革后相关职责自科技部划转）。结论置信度分三级：A 为法规条文，B 为主管部门解答口径，C 为实践惯例；B / C 级结论请以法规原文或主管部门意见为准。本报告不构成法律意见。',
          { size: 17, color: '94A3B8', italics: true },
        ),
      ],
    }),
  )

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 21 } } } },
    sections: [{ children }],
  })
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `人遗申报评估报告_${new Date().toISOString().slice(0, 10)}.docx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
