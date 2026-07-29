/** 置信度分级：A=法规条文（条例/实施细则），B=官方FAQ口径，C=实践惯例 */
export type Confidence = 'A' | 'B' | 'C'

export interface Citation {
  /** 文件名称 */
  source: string
  /** 条款定位 */
  article: string
  /** 置信度 */
  confidence: Confidence
  /** 补充说明（如原发文机关为科技部，现行监管职责已划转国家卫健委） */
  note?: string
}

export interface Obligation {
  title: string
  deadline: string
  citations: Citation[]
}

export type ConclusionType =
  | 'prohibited'      // 禁止
  | 'approval'        // 行政许可
  | 'filing'          // 备案
  | 'report'          // 事先报告
  | 'security-review' // 安全审查
  | 'exempt'          // 无需申报/豁免
  | 'notice'          // 一般合规义务提示

export interface Conclusion {
  id: string
  type: ConclusionType
  title: string
  summary: string
  citations: Citation[]
  obligations: Obligation[]
  risk?: string
  /** 触发该结论的关键回答，用于结果页展示推理链 */
  reasons: string[]
}

export interface Option {
  value: string
  label: string
  hint?: string
}

export interface Question {
  id: string
  layer: 1 | 2 | 3 | 4
  layerLabel: string
  text: string
  help?: string
  multi?: boolean
  options: Option[]
  /** 所属流程：new=新项目申报评估（默认），existing=已获批项目变更评估 */
  flow?: 'new' | 'existing'
  /** 返回 true 时该题才会出现 */
  when?: (a: Answers) => boolean
}

export type Answers = Record<string, string | string[]>

export interface GrayArea {
  question: string
  answer: string
  advice: string
}
