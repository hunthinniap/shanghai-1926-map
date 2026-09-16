import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadExternalResearch } from './lib/external-research.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const records = new Map()
const getRecord = (id) => {
  if (!records.has(id)) records.set(id, { IDBAT: id, legacyBatches: [], reservedBatches: [], externalReports: [], currentChunks: [] })
  return records.get(id)
}
const readJson = async (file) => JSON.parse(await fs.readFile(path.join(projectRoot, file), 'utf8'))
const countBy = (items, key) => items.reduce((counts, item) => {
  const value = key(item)
  counts[value] = (counts[value] ?? 0) + 1
  return counts
}, {})

const excludedUtilityIds = new Set()
try {
  const excludedUtilities = await readJson('research/unresolved-landmarks/excluded-utility-records.json')
  for (const record of excludedUtilities.records ?? []) {
    if (Number.isInteger(record.IDBAT)) excludedUtilityIds.add(record.IDBAT)
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

for (const filename of (await fs.readdir(path.join(projectRoot, 'scripts/data'))).sort()) {
  if (!/^unresolved-landmarks-\d{3}-research\.json$/u.test(filename)) continue
  const file = `scripts/data/${filename}`
  const archive = await readJson(file)
  for (const record of archive.records ?? []) {
    getRecord(record.IDBAT).legacyBatches.push({ file, resolutionStatus: record.resolutionStatus ?? record.verificationStatus ?? null })
  }
}
for (const filename of (await fs.readdir(path.join(projectRoot, 'research/unresolved-landmarks'))).sort()) {
  if (!/^\d{3}-input\.json$/u.test(filename)) continue
  for (const record of await readJson(`research/unresolved-landmarks/${filename}`)) getRecord(record.IDBAT).reservedBatches.push(filename.slice(0, 3))
}
const externalArchives = await loadExternalResearch(projectRoot)
for (const archive of externalArchives) {
  for (const record of archive.evidence.records) {
    getRecord(record.IDBAT).externalReports.push({
      archiveId: archive.manifest.id,
      manifest: archive.manifestFile,
      researchedAt: archive.evidence.researchedAt,
      researchProgress: record.researchProgress.status,
      verificationStatus: record.verificationStatus,
      mapWriteRecommendation: record.mapWriteRecommendation,
      localFollowUp: archive.supplementalReview?.followUpQueue?.find((item) => item.IDBAT === record.IDBAT) ?? null,
    })
  }
}
const hasResearch = (record) => record.legacyBatches.length > 0 || record.externalReports.some((report) => report.researchProgress !== 'not-started')
const chunks = []
for (const filename of (await fs.readdir(path.join(projectRoot, 'public/data/unresolved-landmarks'))).sort()) {
  if (!/^\d{3}\.json$/u.test(filename)) continue
  const input = await readJson(`public/data/unresolved-landmarks/${filename}`)
  const entries = input.map((item) => {
    const record = getRecord(item.IDBAT)
    record.currentChunks.push(filename)
    return record
  })
  chunks.push({
    file: `public/data/unresolved-landmarks/${filename}`,
    total: entries.length,
    withResearchRecords: entries.filter(hasResearch).length,
    reservedWithoutResults: entries.filter((record) => !hasResearch(record) && record.reservedBatches.length > 0).length,
    parkedUtilityRecords: entries.filter((record) => excludedUtilityIds.has(record.IDBAT)).length,
    notYetInvestigatedOrReserved: entries.filter((record) => !hasResearch(record) && !excludedUtilityIds.has(record.IDBAT) && record.reservedBatches.length === 0).length,
    externalResearchProgress: countBy(entries.flatMap((record) => record.externalReports), (report) => report.researchProgress),
  })
}
const allRecords = [...records.values()].sort((a, b) => a.IDBAT - b.IDBAT)
const externalRecords = externalArchives.flatMap((archive) => archive.evidence.records)
const summary = {
  legacyResearchIds: allRecords.filter((record) => record.legacyBatches.length > 0).length,
  externalResearchIds: new Set(externalRecords.map((record) => record.IDBAT)).size,
  externalNewResearchIds: allRecords.filter((record) => record.legacyBatches.length === 0 && record.externalReports.some((report) => report.researchProgress !== 'not-started')).length,
  allIdsWithResearchRecords: allRecords.filter(hasResearch).length,
  currentChunkRecords: chunks.reduce((sum, chunk) => sum + chunk.total, 0),
  currentChunkRecordsWithResearch: chunks.reduce((sum, chunk) => sum + chunk.withResearchRecords, 0),
  currentChunkRecordsReservedWithoutResults: chunks.reduce((sum, chunk) => sum + chunk.reservedWithoutResults, 0),
  currentChunkRecordsParkedUtility: chunks.reduce((sum, chunk) => sum + chunk.parkedUtilityRecords, 0),
  currentChunkRecordsNotYetInvestigatedOrReserved: chunks.reduce((sum, chunk) => sum + chunk.notYetInvestigatedOrReserved, 0),
  externalReportObservations: {
    researchProgress: countBy(externalRecords, (record) => record.researchProgress.status),
    verificationStatus: countBy(externalRecords, (record) => record.verificationStatus),
    mapWriteRecommendation: countBy(externalRecords, (record) => record.mapWriteRecommendation),
  },
  externalPendingFollowUpIds: [...new Set(externalArchives.flatMap((archive) => (archive.supplementalReview?.followUpQueue ?? []).filter((record) => record.status === 'pending').map((record) => record.IDBAT)))].sort((a, b) => a - b),
}
const progress = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  methodology: [
    '按IDBAT合并调查覆盖，不以当前public文件编号匹配固定研究批次。',
    '有调查记录不等于现用途已查明；外部completed只表示其声明的有限检索完成。',
    '旧批次状态原样保留，不能与采用新定义的外部verified直接汇总成解决率。',
    '外部报告状态为来源观察，不是地图写入授权；多报告时可能有多个观察。',
    '未注册的工作草稿仅作补充线索，不据此覆盖正式报告状态。',
  ],
  summary,
  chunks,
  records: allRecords,
}
await fs.writeFile(path.join(projectRoot, 'research/progress.json'), `${JSON.stringify(progress, null, 2)}\n`)
const lines = [
  '# 历史地点调查进度', '',
  '本表由 `npm run research:progress` 生成，以 IDBAT 为准。调查覆盖、研究结论和地图回填分别统计。', '',
  `- 旧批次有调查记录：${summary.legacyResearchIds} 个 ID。`,
  `- 外部报告新登记：${summary.externalNewResearchIds} 个 ID；合计有调查记录：${summary.allIdsWithResearchRecords} 个 ID。`,
  `- 当前待查文件中：${summary.currentChunkRecordsWithResearch} 条有调查记录，${summary.currentChunkRecordsReservedWithoutResults} 条已分配固定批次但无结果，${summary.currentChunkRecordsNotYetInvestigatedOrReserved} 条未调查且未分配。`, '',
  '## 已登记外部研究', '',
]
for (const archive of externalArchives) {
  const directory = path.dirname(archive.manifestFile).replace(/^research\//u, '')
  const progressCounts = countBy(archive.evidence.records, (record) => record.researchProgress.status)
  const verificationCounts = countBy(archive.evidence.records, (record) => record.verificationStatus)
  const mapCounts = countBy(archive.evidence.records, (record) => record.mapWriteRecommendation)
  lines.push(`- [${archive.manifest.id}](${directory}/manifest.json)：${archive.evidence.recordCount} 条，研究日期 ${archive.evidence.researchedAt}；[原评审](${directory}/review.md)${archive.manifest.supplementalReview ? `，[本项目补充评审](${directory}/${archive.manifest.supplementalReview})` : ''}。`)
  lines.push(`  本轮有限检索完成 ${progressCounts.completed ?? 0} 条、部分完成 ${progressCounts.partial ?? 0} 条、未开始 ${progressCounts['not-started'] ?? 0} 条。`)
  lines.push(`  原报告结论：verified ${verificationCounts.verified ?? 0} 条、likely ${verificationCounts.likely ?? 0} 条、unresolved ${verificationCounts.unresolved ?? 0} 条；回填建议：yes ${mapCounts.yes ?? 0} 条、review ${mapCounts.review ?? 0} 条、no ${mapCounts.no ?? 0} 条。`)
  if (archive.supplementalReview?.followUpQueue?.length) lines.push(`  本项目优先补证 ID：${archive.supplementalReview.followUpQueue.filter((record) => record.status === 'pending').map((record) => record.IDBAT).join('、')}。`)
}
lines.push('', '## 当前文件与调查记录对照', '', '| 当前文件 | 条数 | 有调查记录 | 已分配、无结果 | 已停放 utility | 未调查、未分配 |', '|---|---:|---:|---:|---:|---:|')
for (const chunk of chunks) lines.push(`| [${path.basename(chunk.file)}](../${chunk.file}) | ${chunk.total} | ${chunk.withResearchRecords} | ${chunk.reservedWithoutResults} | ${chunk.parkedUtilityRecords} | ${chunk.notYetInvestigatedOrReserved} |`)
lines.push('', '外部报告的 partial 记录保留在补证队列中，不会被新批次选择脚本再次当作从未调查的记录。报告的 completed 不代表所有剩余问题已解决。', '')
await fs.writeFile(path.join(projectRoot, 'research/PROGRESS.md'), lines.join('\n'))
console.log(JSON.stringify(summary, null, 2))
