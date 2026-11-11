export interface Candidate {
  id: string; name: string; address: string; district: string; category: string;
  location: string | null; distanceMetres: number | null; flags: string[]; addressMatch: string | null;
}
export interface ReviewRecord {
  officialId: string; code: string; name: string; listedName: string; address: string;
  district: string; batch: number; reasonCode: string; reason: string; sourceUrl: string;
  candidates: Candidate[];
}
export interface Dataset { schemaVersion: number; updatedAt: string; recordCount: number; records: ReviewRecord[] }
export type Verdict = 'pending' | 'confirmed' | 'no-match' | 'deferred'
export interface Decision { selectedIds: string[]; verdict: Verdict; note: string; updatedAt: string }
export type Decisions = Record<string, Decision>
export const storageKey = 'shanghai-heritage-poi-review-v1'
export const emptyDecision = (): Decision => ({ selectedIds: [], verdict: 'pending', note: '', updatedAt: '' })
export const reasonLabels: Record<string, string> = {
  'multiple-candidates': '多个候选', 'name-address-discrepancy': '名称／门址差异',
  'tenant-only-evidence': '仅有商铺／单位', 'protected-component': '具体保护楼栋',
  'insufficient-evidence': '对应依据不足', 'missing-reference': '缺少位置参考',
  'shared-poi': '多个建筑共用 POI', 'reference-position-conflict': '参考坐标有冲突',
}
export function amapUrl(id: string) {
  return `https://uri.amap.com/marker?markers=${encodeURIComponent(id)}&src=shanghai_heritage&callnative=1`
}
export function decisionLabel(decision?: Decision) {
  if (!decision) return '未复核'
  return decision.verdict === 'confirmed' ? '已确认' : decision.verdict === 'no-match' ? '均不匹配'
    : decision.verdict === 'deferred' ? '暂缓' : decision.selectedIds.length ? '已选，待确认' : '未复核'
}
export function completed(decision?: Decision) { return decision?.verdict === 'confirmed' || decision?.verdict === 'no-match' }
export function exportReview(dataset: Dataset, decisions: Decisions) {
  return { schemaVersion: 1, kind: 'shanghai-heritage-poi-review', exportedAt: new Date().toISOString(),
    datasetUpdatedAt: dataset.updatedAt,
    records: dataset.records.filter(record => decisions[record.officialId]).map(record => {
      const decision = decisions[record.officialId]
      return { officialId: record.officialId, code: record.code, name: record.name, address: record.address,
        ...decision, selectedPois: record.candidates.filter(candidate => decision.selectedIds.includes(candidate.id))
          .map(candidate => ({ id: candidate.id, name: candidate.name, address: candidate.address, url: amapUrl(candidate.id) })) }
    }) }
}
/** Validate both backups and local storage; stale/unknown records never confirm a new candidate. */
export function importReview(text: string, dataset: Dataset): { decisions: Decisions; skipped: number } {
  const document: unknown = JSON.parse(text)
  if (!document || typeof document !== 'object') throw Error('文件内容不是复核记录。')
  const envelope = document as Record<string, unknown>
  if (envelope.schemaVersion !== 1 || envelope.kind !== 'shanghai-heritage-poi-review' || !Array.isArray(envelope.records)) throw Error('请选择从本页面导出的 JSON 文件。')
  const records = new Map(dataset.records.map(record => [record.officialId, record]))
  const decisions: Decisions = {}; let skipped = 0
  for (const item of envelope.records) {
    if (!item || typeof item !== 'object' || typeof item.officialId !== 'string') throw Error('复核记录缺少建筑编号。')
    const record = records.get(item.officialId)
    if (!record) { skipped++; continue }
    if (Object.hasOwn(decisions, record.officialId)) throw Error('同一建筑在文件中重复出现。')
    if (!['pending', 'confirmed', 'no-match', 'deferred'].includes(item.verdict)
      || !Array.isArray(item.selectedIds) || item.selectedIds.some((id: unknown) => typeof id !== 'string')
      || typeof item.note !== 'string' || item.note.length > 5000) throw Error('复核记录格式不正确。')
    const allowed = new Set(record.candidates.map(candidate => candidate.id))
    const selectedIds = [...new Set<string>(item.selectedIds)].filter(id => allowed.has(id))
    if (selectedIds.length !== item.selectedIds.length) { skipped++; continue }
    if (item.verdict === 'confirmed' && !selectedIds.length || item.verdict === 'no-match' && selectedIds.length) throw Error('复核结论与勾选的地点不一致。')
    decisions[record.officialId] = { selectedIds, verdict: item.verdict, note: item.note,
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : '' }
  }
  return { decisions, skipped }
}
