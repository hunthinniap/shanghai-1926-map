// Derived data only. Official records and coordinates are never rewritten.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { audit } from '../research/rechecks/audit-heritage-display-categories.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const records = Object.fromEntries(audit.records.map(r => {
  const category = r.displayCategory
  const sources = [...new Set([
    r.sources.official,
    ...(r.review?.evidence ?? []).filter(s => /^https?:\/\//.test(s)),
    ...(r.basis.includes('wikipedia') ? [r.sources.wikipedia] : []),
    ...(!r.review && r.basis.startsWith('reviewed-vs') ? r.linkEvidence.filter(l => l.eligible).map(l => l.sourceUrl) : []),
  ].filter(Boolean))]
  // Only an explicit historical identity changes a name; generic keyword
  // classification must not rewrite names or discard merged-site aliases.
  const meaningfulOriginalName = r.basis === 'official-original-name' && r.originalNameOrUse.length <= 40
    && !/^(住宅|花园住宅|里弄住宅|公寓|办公楼|学校|医院|厂房|其他)$/.test(r.originalNameOrUse)
  const historicalName = r.review?.userDecision ? r.review.userDecision.previousHistoricalName
    : r.historicalSiteName || (meaningfulOriginalName ? r.originalNameOrUse : null)
  const status = r.review?.userDecision ? 'user-assigned' : !category ? 'unresolved' : r.status === 'review-needed' ? 'review-needed'
    : r.historicalUseEvidence === 'reviewed-historical-use-see-scope' ? 'reviewed' : 'candidate'
  return [r.officialId, {
    category, categories: r.proposedCategories, status, historicalName,
    note: r.review?.note || (r.proposedCategories.length > 1
      ? '名录及历史记录包含多种用途；主图标按原用途条目顺序初选，具体时期和主次仍待核。'
      : category ? '依据名录原名称及历史记录初分，用途起止年代仍需逐条考证。'
      : '现有资料不足以确定建筑原用途。'),
    sources,
  }]
}))
assert.equal(Object.keys(records).length, 1058)
assert.equal(records['sh-fgj-5D114-01'].category, 'industrial')
const output = {
  schemaVersion: 1, auditedAt: audit.auditedAt,
  policy: '优先历史原用途；已复核同址卡可采用民国前身。后建建筑的原用途另记，不表示1928年已存在。',
  categories: audit.distribution.map(({ id, label }) => ({ id, label })), records,
}
const mapped = audit.records.filter(r => r.onCurrentHeritageMap)
const escape = s => String(s ?? '').replace(/\|/g, '／').replace(/\n/g, ' ')
const unresolved = audit.records.filter(r => !r.displayCategory)
const rows = audit.distribution.map(c => `| ${c.label} | ${audit.records.filter(r => r.displayCategory === c.id).length} | ${mapped.filter(r => r.displayCategory === c.id).length} |`).join('\n')
const reviewed = audit.records.filter(r => r.review)
const report = `# 优秀历史建筑历史用途全表复核及地图接入

日期：${audit.auditedAt}。覆盖官方名录全部1058条，地图现有${mapped.length}个名录参考点；${1058 - mapped.length}条尚无地图点的记录仍保留在审查表。部分定位条目的组成物范围另在位置详情中说明。

## 口径

优先采用有证据的建筑原用途；用户已确认的同址历史卡（如哈同花园／中苏友好大厦）可采用民国前身，但在卡片解释时间和楼体范围。西岸艺术中心按原上海飞机制造厂冲压车间归工业。1950年代等后建建筑只记录其自身原用途，不能据此称为民国建筑或1928年已存在。

十类延用既定分组：墓园与公园、博物馆与教育、会馆与商业、军事设施与公共机构。厂区宿舍、银行职员公寓和企业大班住宅按住宅；企业办公和实际厂房分开。

全表是基于原名录、维基字段和已有VS关联的规则扫描，并对高风险条目补查，**不是1058条均重新做过独立网页考证**。卡片保留“资料已复核／名录与历史记录初分／仍需复核／待核”状态及来源。

## 覆盖统计

- 有类别候选：${audit.counts.withAnyProposedCategory}条；缺乏原用途证据：${unresolved.length}条。
- 地图有分类：${mapped.filter(r => r.displayCategory).length}点；中性待核标记：${mapped.filter(r => !r.displayCategory).length}点。
- 审查状态：${JSON.stringify(audit.counts.statuses)}。
- 地图数据中的状态：${JSON.stringify(Object.fromEntries(['reviewed', 'candidate', 'review-needed', 'unresolved', 'user-assigned'].map(s => [s, Object.values(records).filter(r => r.status === s).length])))}。

| 主图标类别 | 名录记录 | 地图点 |
| --- | ---: | ---: |
${rows}

## 人工判断与复核

| 编号 | 名录原字段 | 地图主类 | 说明 | 追加来源 |
| --- | --- | --- | --- | --- |
${reviewed.map(r => `| ${r.codeRaw} | ${escape(r.originalNameOrUse)} | ${r.displayCategoryLabel || '待核'} | ${escape(r.review.note)} | ${(r.review.evidence ?? []).filter(s => /^https?:/.test(s)).map((s, i) => `[${i + 1}](${s})`).join(' ')} |`).join('\n')}

## 用途待核（未指定显示类别）

| officialId | 名称 | 地址 |
| --- | --- | --- |
${unresolved.map(r => `| ${r.officialId} | ${escape(r.originalNameOrUse)} | ${escape(r.address)} |`).join('\n')}

## 重建与验证

运行 node research/rechecks/audit-heritage-display-categories.mjs 输出完整证据审查。
运行 node scripts/build-heritage-historical-uses.mjs --write 重建本报告、审查快照和地图分类文件；--check 只读比对。

地图通过officialId合入分类，只改显示副本；原官方JSON、地图坐标和已有合并关系不变。旧 republican-use 报告保留为上一轮研究快照，本文件为当前实施口径。

未指定显示类别${unresolved.length}条。2026-11-12用户为13项指定显示类别（10商、2住、1医），单独标记为“用户指定分类”；既有历史备注保留，具体用途年代、早期租户及保护范围继续作为研究问题，不将显示决定标为独立史料核实。
`
const snapshot = { ...audit, records: audit.records.map(({ linkEvidence, ...r }) => ({ ...r, linkedRecordIds: linkEvidence.map(l => l.sourceRecordId) })) }
const files = new Map([
  ['public/data/shanghai-excellent-historical-buildings/historical-use-categories.json', JSON.stringify(output, null, 2) + '\n'],
  ['research/rechecks/2026-09-24-heritage-historical-use-categories.json', JSON.stringify(snapshot, null, 2) + '\n'],
  ['research/rechecks/2026-09-24-heritage-historical-use-audit.md', report],
])
assert(process.argv.includes('--write') || process.argv.includes('--check'), 'Pass --write or --check')
for (const [name, content] of files) {
  const file = path.join(root, name)
  if (process.argv.includes('--write')) fs.writeFileSync(file, content)
  else assert.equal(fs.readFileSync(file, 'utf8'), content, `Stale generated file: ${name}`)
}
console.log(JSON.stringify({ mode: process.argv.includes('--write') ? 'write' : 'check', records: 1058, mapped: mapped.length, classified: mapped.filter(r => r.displayCategory).length, unresolved: unresolved.length }))
