// 第四轮 UI 走查：用真实场景在浏览器里跑完整向导流程并断言结论
// 用法：node scripts/ui-roundtrip.mjs（自启静态服务器，测完自动关闭）
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const shotDir = path.join(root, 'docs', 'ui-check')
if (!existsSync(shotDir)) mkdirSync(shotDir, { recursive: true })

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon' }
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0])
  if (p === '/' || p === '') p = '/index.html'
  const file = path.join(dist, p)
  try {
    const buf = await readFile(file)
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
    res.end(buf)
  } catch {
    // SPA 回退
    const buf = await readFile(path.join(dist, 'index.html'))
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(buf)
  }
})
await new Promise((r) => server.listen(4891, '127.0.0.1', r))
const BASE = 'http://127.0.0.1:4891/'

// 场景定义：steps 为按顺序点击的选项文本（部分匹配）；multi 步骤后需点"下一题"
const scenarios = [
  {
    id: 'S1-去标识细胞系',
    desc: '《问题解答》之一：药企使用商业化永生化细胞系（去标识、不可追溯）开展生产研究',
    steps: [
      { pick: '中方单位' },
      { pick: '仅涉及样本/材料' },
      { pick: '细胞（含细胞系）', next: true },
      { pick: '全部为去标识、不可追溯的商业化永生化细胞系' },
    ],
    expect: ['不纳入人类遗传资源管理'],
  },
  {
    id: 'S2-CART诊疗出境',
    desc: '《问题解答》之三：医疗机构以临床诊疗为目的将 CAR-T 治疗相关材料送境外',
    steps: [
      { pick: '中方单位' },
      { pick: '仅涉及样本/材料' },
      { pick: '细胞（含细胞系）', next: true },
      { pick: '含原代细胞、可溯源至个人的细胞或 PDX 模型' },
      { pick: '材料出境', next: true },
      { pick: '以临床诊疗为目的' },
    ],
    expect: ['CAR-T', '无需申报'],
  },
  {
    id: 'S3-国际合作临床试验备案',
    desc: '真实高频场景：中方医院与外资药企合作开展注册上市目的多中心临床试验（采集全血+基因检测、境内完成）',
    steps: [
      { pick: '中方单位' },
      { pick: '两者都涉及' },
      { pick: '全血', next: true },
      { pick: '基因 / 基因组数据（含测序数据）', next: true },
      { pick: '与外方合作研究 / 临床试验', next: true },
      { pick: '外方实质性参与研究' },
      { pick: '注册上市目的的临床试验' },
      { pick: '是', qid: 'coop_insite' },
      { pick: '否', qid: 'coop_exploratory' },
      { pick: '多中心' },
    ],
    expect: ['国际合作临床试验备案', '多中心'],
  },
  {
    id: 'S4-PDX出境审批',
    desc: '《问题解答》之二：患者肿瘤组织来源 PDX 模型（属人遗材料）以科研目的送境外检测',
    steps: [
      { pick: '中方单位' },
      { pick: '仅涉及样本/材料' },
      { pick: '细胞（含细胞系）', next: true },
      { pick: '含原代细胞、可溯源至个人的细胞或 PDX 模型' },
      { pick: '材料出境', next: true },
      { pick: '以科学研究等为目的' },
      { pick: '还涉及其他材料' },
    ],
    expect: ['人遗资源材料出境审批'],
  },
]

let pass = 0
let fail = 0
const browser = await chromium.launch()
try {
  for (const s of scenarios) {
    const page = await browser.newPage()
    try {
      await page.goto(BASE, { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: /企业合规/ }).click()
      await page.waitForSelector('text=第 1 /', { timeout: 5000 })
      for (const step of s.steps) {
        // 按选项文本点击（部分匹配）
        await page.getByRole('button', { name: new RegExp(step.pick.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first().click()
        await page.waitForTimeout(350)
        if (step.next) {
          await page.getByRole('button', { name: '下一题' }).click()
          await page.waitForTimeout(350)
        }
      }
      await page.getByRole('button', { name: /生成评估报告/ }).click()
      await page.waitForTimeout(800)
      const body = await page.textContent('body')
      const ok = s.expect.every((t) => body.includes(t))
      await page.screenshot({ path: path.join(shotDir, `${s.id}.png`), fullPage: true })
      if (ok) { pass++; console.log(`PASS ${s.id}（${s.desc}）`) }
      else { fail++; console.log(`FAIL ${s.id}\n  缺少期望文本: ${s.expect.filter((t) => !body.includes(t)).join(' / ')}`) }
    } catch (e) {
      fail++
      console.log(`FAIL ${s.id} 异常: ${e.message.split('\n')[0]}`)
      try { await page.screenshot({ path: path.join(shotDir, `${s.id}-ERROR.png`), fullPage: true }) } catch {}
    }
    await page.close()
  }
} finally {
  await browser.close()
  server.close()
}
console.log(`\n${pass} passed, ${fail} failed（截图存于 docs/ui-check/）`)
process.exit(fail > 0 ? 1 : 0)
