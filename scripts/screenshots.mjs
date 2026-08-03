/**
 * 一键重截 README 界面预览图。
 * 用法：
 *   npx playwright install chromium   # 首次使用需下载浏览器（一次性）
 *   npm run screenshots
 * 产物输出到 docs/screenshots/，脚本自动启动并关闭本地 dev server。
 */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const PORT = 5199
const BASE = `http://localhost:${PORT}/`
const OUT = fileURLToPath(new URL('../docs/screenshots/', import.meta.url))

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`dev server 未在 ${timeoutMs / 1000}s 内就绪：${url}`)
}

async function main() {
  mkdirSync(OUT, { recursive: true })

  const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    shell: true,
    detached: true,
  })
  const cleanup = () => {
    try {
      // detached 模式下按进程组终止，确保 npx 包裹的 vite 子进程一并退出
      if (server.pid) process.kill(-server.pid, 'SIGTERM')
    } catch { /* ignore */ }
  }
  process.on('exit', cleanup)

  try {
    await waitForServer(BASE)
    const browser = await chromium.launch()
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })

    // 1. 入口页
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.screenshot({ path: `${OUT}01-intro.png`, fullPage: true })

    // 2. 进入完整评估（向导首题）
    await page.getByRole('button', { name: /企业合规/ }).click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}02-wizard.png`, fullPage: true })

    // 3. 答题路径：中方 → 仅样本 → 全血 → 采集+保藏 → 家系是 → 地区否 → 规模否 → 长期保藏
    const clickOpt = async (name) => {
      await page.getByRole('button', { name, exact: false }).first().click()
      await page.waitForTimeout(350)
    }
    await clickOpt('中方单位')
    await clickOpt('仅涉及样本')
    await clickOpt('全血')
    await page.getByRole('button', { name: '下一题' }).click(); await page.waitForTimeout(350)
    await clickOpt('采集')
    await clickOpt('保藏')
    await page.getByRole('button', { name: '下一题' }).click(); await page.waitForTimeout(350)
    await page.getByRole('button', { name: '是', exact: true }).click(); await page.waitForTimeout(350)
    await page.getByRole('button', { name: '否', exact: true }).click(); await page.waitForTimeout(350)
    await page.getByRole('button', { name: '否', exact: true }).click(); await page.waitForTimeout(350)
    await clickOpt('属于长期保藏')

    // 4. 生成报告并截全页
    await page.getByRole('button', { name: /生成评估报告/ }).click()
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${OUT}04-result.png`, fullPage: true })

    await browser.close()
    console.log(`截图完成 → ${OUT}`)
  } finally {
    cleanup()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
