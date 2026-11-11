import type { HistoricalFeature, HistoricalRecord, SourceRecord, BuildingLifeDates, NotableResident } from '../types'
import type { HeritageBuildingFeature, HeritageCoordinateReview } from './heritageBuildings'
import { getHeritageBuildingName } from './heritageBuildings'
import type { LinkedHeritageBuilding } from './heritageLandmarkLinks'
import { chineseName } from './landmarkLabels'
import { parseConstructionDate } from './buildingTimeline'
import { siteStageAtYear } from './siteTimeline'
import { heritageUseLabel, heritageUseStatusLabels } from './heritageUses'
import { approvedUnlocatedHeritageSites, reviewedContextualHeritageSites } from '../data/userApprovedHeritageSites'
import { reviewedResidentsForHeritage } from '../data/notableResidents'
import { reviewedUseHistoryForHeritage } from '../data/heritageUseHistories'
import { reviewedHeritageSiteHistoryFor } from '../data/heritageSiteHistories'
import heritageAmapPois from '../data/heritageAmapPois.json'
import heritageAmapLivePois from '../data/heritageAmapLivePois.json'
import heritageAmapLocations from '../data/heritageAmapLocations.json'
import type { RouteStop } from './heritageRoute'

export interface PlaceSource { title: string; url: string; note?: string }
export interface PlaceMapLink extends PlaceSource { referenceNote?: string }
export interface PlaceFact { label: string; value: string }
export interface PlaceEvent {
  key: string; year?: number; period: string; name: string; originalName?: string; url?: string
  address?: string; kind: string; description?: string; active?: boolean; sourceRecordId?: number
}
export interface PlaceCoordinateReview extends HeritageCoordinateReview {
  officialId: string
  label: string
}
export interface PlaceDetails {
  feedbackId: string
  name: string; foreignName?: string; address?: string; year?: number; heritage: boolean
  events: PlaceEvent[]; buildings: PlaceFact[]; catalogue: PlaceSource[]
  residents: NotableResident[]
  coordinateReviews: PlaceCoordinateReview[]
  notes: PlaceFact[]; sources: PlaceSource[]; questions: PlaceFact[]
  mapLinks: PlaceMapLink[]
  routeChoices: RouteStop[]
  amapCandidatePlaces: { officialId: string; name: string; address: string }[]
}

const distinct = <T,>(values: T[]) => [...new Set(values)]
const amapPois: Record<string, { poiid: string; name: string; address: string; referenceNote?: string; sources?: PlaceSource[] }> = { ...heritageAmapPois, ...heritageAmapLivePois }
const foreign = (value?: string) => value && !/\p{Script=Han}/u.test(value) && /\p{Script=Latin}/u.test(value) ? value.trim() : undefined
const url = (value?: string | null) => value && /^https?:\/\//.test(value) ? value.replace(/^http:/, 'https:') : undefined
const sourceKey = (value: string) => {
  try {
    const source = new URL(value)
    return /(?:^|\.)virtualshanghai\.net$/i.test(source.hostname) && /buildings|建筑|建築/i.test(decodeURI(source.pathname)) && source.searchParams.has('ID')
      ? `vs-building-${source.searchParams.get('ID')}` : value
  } catch { return value }
}
const sourceId = (value: string) => { try { return new URL(value).searchParams.get('ID') } catch { return null } }
const pending = /待核|待考|未核|尚未|未能|不详|疑点|冲突|无法确认|不确定|未明确|未证明|未闭合|候选|需[^。；]{0,12}(?:核实|复核|考证)/
const relations = {
  'same-listed-building': '同一名录建筑', 'same-listed-structure': '同一名录构筑物',
  'same-listed-complex': '同一名录建筑群／园区', 'same-historical-site': '同一地点的不同历史阶段',
  'component-of-listed-complex': '名录建筑群中的一栋／局部使用',
  'nearby-residential-context': '同路段邻近住宅归并（非同栋核定）',
  'nearby-campus-context': '相邻校址归并（非同校、同楼核定）',
} as const
const useRelations = {
  'same-building': '原建筑延续使用', 'same-site-continuing-use': '原址与主体功能延续',
  'same-site-repurposed': '原址用途已变', 'partial-remains-on-original-site': '原址仅存局部遗迹',
  'site-redeveloped': '原址已拆除或重新开发', 'institutional-successor-relocated': '机构延续，但已迁离历史原址',
} as const
const historicalUses = {
  park: '公共公园', garden: '园林 / 私家花园', cemetery: '墓园', racecourse: '跑马场',
  industrial: '工业设施', military: '军事设施', recreation: '体育 / 娱乐设施',
  school: '学校用地', aerodrome: '机场 / 跑道',
} as const

export function buildPlaceDetails({ feature, heritage, linked, sources = [] }: {
  feature?: HistoricalFeature; heritage?: HeritageBuildingFeature; linked?: LinkedHeritageBuilding; sources?: SourceRecord[]
}): PlaceDetails {
  const histories = distinct([feature, linked?.landmark, ...(linked?.landmarks ?? [])]
    .filter((item): item is HistoricalFeature => Boolean(item)))
  const places = linked?.heritages?.length ? linked.heritages : heritage ? [heritage] : []
  const p = feature?.properties ?? linked?.landmark.properties
  const h = heritage?.properties
  const sharesChronology = !heritage || linked && ['same-listed-building', 'same-listed-structure', 'same-historical-site'].includes(linked.link.relation ?? '')
  const stage = h?.timelineStage ?? p?.timelineStage
  const latestPhase = !stage && sharesChronology && histories[0] ? siteStageAtYear(histories[0], new Date().getFullYear()) : undefined
  const headingStage = stage ?? (latestPhase?.status === 'reviewed-phase' ? latestPhase : undefined)
  const relocated = p?.currentUseRelationship === 'institutional-successor-relocated'
  const currentName = sharesChronology && !relocated && p?.currentNameZh && !pending.test(p.currentNameZh)
    && (p.currentUseSourceUri || p.currentUseSources?.length || p.currentUseMatch) ? p.currentNameZh : undefined
  const knownName = h ? getHeritageBuildingName({ ...h, timelineStage: undefined }) : undefined
  const chinese = headingStage ? chineseName(headingStage.nameZh, headingStage.name)
    : chineseName(currentName, knownName, p?.historicalChinese, p?.modernNameZh, p?.historicalName)
  const modernEnglish = sharesChronology && chinese === p?.modernNameZh ? foreign(p?.modernNameEn) : undefined
  const original = headingStage ? foreign(headingStage.name)
    : modernEnglish ?? (currentName && currentName !== knownName && currentName !== p?.modernNameZh && currentName !== p?.historicalChinese
      ? undefined : (sharesChronology ? foreign(p?.historicalName) : undefined) ?? foreign(h?.name) ?? foreign(h?.articleTitle) ?? (sharesChronology ? foreign(p?.modernNameEn) : undefined)
    )
  const verifiedAddress = sharesChronology && !relocated ? p?.currentAddress : undefined
  const result: PlaceDetails = {
    feedbackId: h?.officialId || p?.featureGroupId || p?.id || 'unknown-place',
    name: chinese || original || knownName || p?.historicalName || '未命名地点',
    foreignName: chinese ? original : undefined,
    address: linked?.link.modernAddress?.address || headingStage?.phase?.address || verifiedAddress || (places.length ? distinct(places.map(item => item.properties.address).filter(Boolean)).join('；') : undefined),
    year: stage?.year, heritage: Boolean(heritage), events: [], buildings: [], catalogue: [], residents: [], coordinateReviews: [], notes: [], sources: [], questions: [], mapLinks: [], routeChoices: [], amapCandidatePlaces: [],
  }
  const addSource = (title: string, sourceUrl?: string | null, note?: string) => {
    const normalized = url(sourceUrl)
    if (!normalized) return
    const previous = result.sources.find(item => sourceKey(item.url) === sourceKey(normalized))
    if (previous) previous.note = distinct([previous.note, note].filter(Boolean)).join('；') || undefined
    else result.sources.push({ title, url: normalized, note })
  }
  const fact = (target: PlaceFact[], label: string, value?: string | null) => {
    if (!value?.trim()) return
    const existing = target.find(item => item.label === label)
    if (!existing) target.push({ label, value: value.trim() })
    else if (!existing.value.split('\n').includes(value.trim())) existing.value += `\n${value.trim()}`
  }
  const addResident = (resident: NotableResident) => {
    const evidence = resident.sources.filter(source => url(source.url))
    if (!resident.name.trim() || !evidence.length) return
    const previous = result.residents.find(item => item.name === resident.name && item.period === resident.period && item.address === resident.address)
    if (!previous) result.residents.push({ ...resident, sources: evidence.map(source => ({ ...source, url: url(source.url)! })) })
    else previous.sources = [...new Map([...previous.sources, ...evidence].map(source => [sourceKey(source.url), source])).values()]
    for (const source of evidence) addSource(source.title || `${resident.name} · 居住资料`, source.url)
  }
  const narrative = (label: string, text?: string) => {
    if (!text?.trim()) return
    const parts = text.match(/[^。；]+[。；]?/gu) ?? [text]
    const known: string[] = []
    for (const part of parts) {
      if (pending.test(part)) fact(result.questions, label, part)
      else known.push(part)
    }
    fact(result.notes, label, known.join(''))
  }
  const catalogue = (title: string, sourceUrl: string, note?: string) => {
    if (!result.catalogue.some(item => item.title === title && item.url === sourceUrl)) result.catalogue.push({ title, url: sourceUrl, note })
    addSource(title, sourceUrl)
  }
  const lifeEvents = (dates: BuildingLifeDates | undefined, name: string) => {
    for (const [key, date] of Object.entries(dates ?? {})) {
      if (!date || !url(date.sourceUrl)) continue
      const kind = key === 'built' ? '建成' : '毁损／消失'
      result.events.push({ key: `life-${kind}-${name}-${date.year}`, year: date.year, period: `${date.year} 年`,
        name: `${kind}：${name}`, kind, url: url(date.sourceUrl), description: date.note })
      addSource(`${name} · ${kind}依据`, date.sourceUrl)
    }
  }
  const allAddresses = histories.flatMap(item => item.properties.historicalAddresses ?? [])
    .concat((linked?.link.historicalAddresses ?? []).map(item => ({ sourceRecordId: item.sourceRecordId, address: item.address })))
  for (const history of histories) {
    const q = history.properties
    if (sharesChronology) for (const resident of q.notableResidents ?? []) addResident(resident)
    const records: HistoricalRecord[] = q.historicalRecords?.length ? q.historicalRecords : q.timelineStage?.status === 'reviewed-phase' ? [] : [{
      name: q.historicalName, nameZh: q.historicalChinese || q.modernNameZh,
      sourceRecordIds: q.sourceRecordIds, sourceParkRecordIds: q.sourceParkRecordIds,
      startYear: q.labelYearIsFallback ? undefined : q.labelYear,
      sourceUrls: Object.values(q.sourceUrls ?? {}), category: q.category,
    }]
    for (const record of records) {
      const recordIds = record.sourceRecordIds?.length ? record.sourceRecordIds : q.sourceRecordIds?.length === 1 ? q.sourceRecordIds : [undefined]
      for (const id of recordIds) {
        const specificUrl = id !== undefined ? record.sourceUrls?.find(value => sourceId(value) === String(id)) : undefined
        const recordUrl = url(specificUrl ?? (recordIds.length === 1 ? record.sourceUrls?.[0] : undefined)) ?? (id !== undefined ? `https://www.virtualshanghai.net/Data/Buildings?ID=${id}` : undefined)
        const title = chineseName(record.displayNameZh, record.nameZh, record.name) || record.name
        const period = record.startYear !== undefined ? record.endYear !== undefined && record.endYear !== record.startYear
          ? `${record.startYear}–${record.endYear} 年` : `${record.startYear} 年${record.endYear === undefined ? '起' : ''}`
          : record.endYear !== undefined ? `截至 ${record.endYear} 年` : '年份未知'
        result.events.push({ key: `record-${id ?? q.id}-${record.name}-${period}`, sourceRecordId: id, year: record.startYear ?? record.endYear,
          period, name: title, originalName: title !== record.name ? record.name : undefined,
          url: url(record.dateEvidence?.sourceUrl) || recordUrl, kind: '史料记录', description: record.dateEvidence?.note,
          address: distinct(allAddresses.filter(item => id !== undefined && item.sourceRecordId === id).map(item => item.address)).join('；') || undefined,
          active: stage?.records.some(item => item.name === record.name && item.startYear === record.startYear),
        })
        for (const sourceUrl of record.sourceUrls ?? []) addSource(`${record.name} · 史料记录`, sourceUrl)
        if (record.dateEvidence) addSource(record.dateEvidence.sourceTitle, record.dateEvidence.sourceUrl, record.dateEvidence.note)
      }
    }
    for (const phase of q.historicalPhases ?? []) {
      result.events.push({ key: `phase-${phase.id}`, year: phase.startYear, period: `${phase.startYear} 年`,
        name: phase.nameZh || phase.name, originalName: phase.nameZh && phase.nameZh !== phase.name ? phase.name : undefined,
        kind: phase.relationship === 'replacement-building' ? '同址新建' : '沿革阶段', url: url(phase.sources[0]?.url),
        description: [phase.use, phase.note].filter(Boolean).join('。'), active: stage?.phase?.id === phase.id,
        address: phase.address || places.find(place => place.properties.officialId === phase.buildingId)?.properties.address })
      for (const source of phase.sources) addSource(source.title || phase.name, source.url)
    }
    lifeEvents(q.buildingLifeDates, chineseName(q.historicalChinese, q.modernNameZh, q.historicalName) || q.historicalName)
    for (const id of q.sourceRecordIds ?? []) catalogue(`Virtual Shanghai · 建筑记录 #${id}`,
      linked?.link.historicalAddresses.find(item => item.sourceRecordId === id)?.sourceUrl
      || Object.values(q.sourceUrls ?? {}).find(value => sourceId(value) === String(id))
      || `https://www.virtualshanghai.net/Data/Buildings?ID=${id}`)
    for (const id of q.sourceParkRecordIds ?? []) catalogue(`Virtual Shanghai · 园林记录 #${id}`, 'https://www.virtualshanghai.net/Data/Tables?ID=206')
    for (const id of distinct([...(q.sourceIds ?? []), ...(q.currentUseSourceId ? [q.currentUseSourceId] : [])])) {
      const source = sources.find(item => item.id === id)
      addSource(source?.title || (id === 'vs-buildings' ? 'Virtual Shanghai · 历史建筑' : '历史资料'), q.sourceUrls?.[id] || source?.url,
        source ? `${source.year} · ${source.license}` : undefined)
    }
    narrative('历史沿革', q.historicalSiteNote)
    narrative('用途沿革', q.currentUseNote)
    if (q.historicalUse) fact(result.notes, '民国时期用途', historicalUses[q.historicalUse])
    if (q.currentUseRelationship && linked?.link.relation !== 'same-historical-site') fact(result.notes, '与历史地点的关系', useRelations[q.currentUseRelationship])
    if (q.currentUse) narrative(histories.length > 1 || linked?.link.relation === 'component-of-listed-complex' ? `${q.historicalName} · 现用资料记载` : '现在用途', q.currentUse)
    else if (!q.addressUseEvidence?.length) fact(result.questions, '现址用途', '现址用途与历史地点的对应关系尚未核定。')
    if (q.currentUseRelationship === 'institutional-successor-relocated') {
      fact(result.notes, '后继机构', q.currentNameZh)
      fact(result.notes, '机构现址（非地图点）', q.currentAddress)
    } else if (q.currentNameZh && q.currentNameZh !== result.name) narrative('现址名称', q.currentNameZh)
    for (const evidence of q.addressUseEvidence ?? []) {
      fact(result.notes, evidence.mode === 'current-use' ? '现在用途' : '今址用途参考', evidence.use)
      fact(result.notes, '资料记载的现代地址', evidence.address)
      if (evidence.mode === 'address-reference') fact(result.questions, '原址对应', '历史原址／原建筑对应待核；上述用途仅指资料记载的现代门址。')
      narrative('现址核查', evidence.note)
      if (evidence.retainedHold) narrative('原址关系', evidence.retainedHold.reason)
      for (const source of evidence.sources) addSource(source.title, source.url,
        `资料时点：${source.informationAsOf || '未标日期'}；查阅：${source.accessedOn}。${source.supports}`)
    }
    addSource(q.currentUseSourceId === 'sh-library-excellent-historical-buildings' ? '上海图书馆 · 用途资料' : '用途资料来源', q.currentUseSourceUri)
    for (const source of [...(q.currentUseSources ?? []), ...(q.historicalSiteSources ?? [])]) addSource(source.title || '沿革资料', source.url)
    for (const date of Object.values(q.buildingLifeDates ?? {})) addSource('建筑生灭年代依据', date?.sourceUrl)
    const ids = [...(q.sourceRecordIds ?? [])].sort((a, b) => a - b).join(',')
    for (const site of approvedUnlocatedHeritageSites.filter(item => item.landmarkFeatureId === q.id
      && [...item.expectedSourceRecordIds].sort((a, b) => a - b).join(',') === ids)) {
      catalogue(`上海优秀历史建筑 · ${site.officialCode}`, site.sourceUrl, site.name)
      fact(result.questions, '同址名录参考（保持分卡）', `${site.name} · ${site.officialCode}；${site.address}。名录已有独立参考点；历史地标与名录保持分卡。${site.scopeNote || '两者是否对应同一栋建筑仍待核。'}`)
      addSource('房管局 · 门牌复核', site.scopeSourceUrl)
    }
  }
  for (const history of histories) for (const id of history.properties.sourceRecordIds ?? []) {
    if (result.events.some(event => event.sourceRecordId === id)) continue
    const href = Object.values(history.properties.sourceUrls ?? {}).find(value => sourceId(value) === String(id))
      || `https://www.virtualshanghai.net/Data/Buildings?ID=${id}`
    result.events.push({ key: `unmatched-record-${id}`, sourceRecordId: id, period: '年份未知', name: `Virtual Shanghai 记录 #${id}`,
      kind: '史料记录', url: url(href), address: distinct(allAddresses.filter(item => item.sourceRecordId === id).map(item => item.address)).join('；') || undefined })
    addSource(`Virtual Shanghai · 建筑记录 #${id}`, href)
  }
  for (const place of places) {
    const q = place.properties
    const siteHistory = reviewedHeritageSiteHistoryFor(q)
    for (const resident of [...(q.notableResidents ?? []), ...reviewedResidentsForHeritage(q), ...(siteHistory?.residents ?? [])]) addResident(resident)
    const prefix = places.length > 1 ? `${q.officialCodeRaw} · ` : ''
    const name = getHeritageBuildingName({ ...q, timelineStage: undefined })
    const amapPoi = amapPois[q.officialId]
    if (amapPoi) {
      result.routeChoices.push({ officialId: q.officialId, name, address: amapPoi.address || q.address || '', poiid: amapPoi.poiid,
        poiName: amapPoi.name, location: (heritageAmapLocations as Record<string, string>)[amapPoi.poiid], referenceNote: amapPoi.referenceNote })
      const amapUrl = `https://uri.amap.com/marker?markers=${encodeURIComponent(amapPoi.poiid)}&src=shanghai_heritage&callnative=1`
      if (!result.mapLinks.some(link => link.url === amapUrl)) result.mapLinks.push({
        title: name, url: amapUrl, note: [amapPoi.name, amapPoi.address].filter(Boolean).join(' · '), referenceNote: amapPoi.referenceNote,
      })
      for (const source of amapPoi.sources ?? []) addSource(source.title, source.url, '高德地点对应关系核对资料。')
    } else if (!result.amapCandidatePlaces.some(place => place.officialId === q.officialId)) {
      result.amapCandidatePlaces.push({ officialId: q.officialId, name, address: q.address })
    }
    if (q.coordinateReview) {
      const review = q.coordinateReview
      const points = review.points.filter(point => Number.isFinite(point.lon) && Number.isFinite(point.lat)
        && Math.abs(point.lon) <= 180 && Math.abs(point.lat) <= 90 && url(point.sourceUrl))
        .map(point => ({ ...point, sourceUrl: url(point.sourceUrl)! }))
      if (points.length && ['reference-point', 'partial-reference'].includes(review.status)) {
        result.coordinateReviews.push({ officialId: q.officialId, label: `${name} · ${q.officialCodeRaw}`,
          status: review.status, reason: review.reason, points })
        for (const point of points) addSource(point.sourceTitle || `${point.name} · 点位来源`, point.sourceUrl,
          point.coordinateSystemInferred ? '坐标系经独立对照推断；位置仅供参考。' : '位置参考资料，未测定建筑边界。')
      }
    }
    catalogue(`上海优秀历史建筑 · ${q.officialCodeRaw}`, q.officialSourceUrl, `第 ${q.batch} 批${q.district ? ` · ${q.district}` : ''}`)
    fact(result.buildings, `${prefix}层数`, q.floors)
    fact(result.buildings, `${prefix}结构`, q.structure)
    fact(result.buildings, `${prefix}设计者／施工者`, q.designer)
    const parsed = parseConstructionDate(q.constructionDate)
    if (q.constructionDate) {
      const begins = q.constructionDate.match(/^\d{4}/)?.[0]
      result.events.push({ key: `construction-${q.officialId}`, year: parsed.startYear !== undefined && begins ? Number(begins) : undefined,
        period: parsed.startYear !== undefined ? q.constructionDate : '年份未知', name: siteHistory?.buildingName || `${q.address}建筑`, kind: '建造年代',
        url: url(q.constructionDateEvidence?.sourceUrl || q.wikipediaListUrl), address: q.address,
        description: parsed.startYear === undefined ? `建造年代原文：${q.constructionDate}` : parsed.basis === 'construction-range' ? '来源给出的建造区间，末年不等于已核定的精确竣工年。' : undefined })
    } else fact(result.questions, `${prefix}建造年代`, '建造年代尚未核定。')
    if (q.constructionDate && parsed.startYear === undefined) fact(result.questions, `${prefix}建造年代`, `原资料记“${q.constructionDate}”，精确建成年份待核。`)
    const useHistory = reviewedUseHistoryForHeritage(q)
    if (useHistory) {
      result.events.push({ key: `use-${q.officialId}-${useHistory.year}`, year: useHistory.year, period: useHistory.period,
        name: useHistory.name, kind: '使用沿革', address: q.address, url: useHistory.sourceUrl, description: useHistory.note })
      addSource(useHistory.sourceTitle, useHistory.sourceUrl, useHistory.note)
    } else if (!siteHistory && q.listedName && q.listedName !== name) result.events.push({ key: `listed-${q.officialId}`, period: '年份未知',
      name: q.listedName, kind: '名录公布时名称', address: q.address, url: url(q.officialSourceUrl) })
    if (!siteHistory && q.officialName && q.officialName !== name && q.officialName !== q.listedName) result.events.push({ key: `original-${q.officialId}`, period: '年份未知',
      name: q.officialName, kind: '名录原名称', address: q.address, url: url(q.officialSourceUrl) })
    if (siteHistory) {
      fact(result.notes, '名录登记名称', distinct([q.officialName, q.listedName].filter(Boolean)).join('；'))
      for (const observation of siteHistory.observations) {
        result.events.push({ key: `use-record-${q.officialId}-${observation.year}`, year: observation.year,
          period: observation.period, name: observation.name, kind: '使用记录', address: q.address,
          url: observation.source.url, description: observation.note, active: q.timelineStage?.year === observation.year })
        addSource(observation.source.title || observation.name, observation.source.url)
      }
      if (q.timelineStage?.status === 'unknown') fact(result.questions, `${q.timelineStage.year}年用途`,
        '该年具体使用单位尚未核定，标题采用建筑名称。')
    }
    if (q.historicalUse) {
      const use = q.historicalUse
      fact(use.status === 'unresolved' || use.status === 'review-needed' ? result.questions : result.notes, `${prefix}历史用途`,
        `${use.categories.map(heritageUseLabel).join('、') || '未定'}${use.historicalName ? ` · ${use.historicalName}` : ''}。${heritageUseStatusLabels[use.status]}`)
      narrative('用途说明', use.note)
      for (const source of use.sources) addSource('历史用途依据', source)
    }
    if (q.constructionDateEvidence) {
      const evidence = q.constructionDateEvidence
      addSource(evidence.sourceTitle, evidence.sourceUrl, `${evidence.note} 原年代字段：${evidence.originalText || '未记载'}；核对日期：${evidence.reviewedOn}${evidence.sourceRow ? `；原表第${evidence.sourceRow}行` : ''}。`)
    }
    addSource('维基百科 · 优秀历史建筑列表', q.wikipediaListUrl, '地址与建筑资料 · CC BY-SA 4.0')
    addSource(q.articleTitle || name, q.wikipediaUrl, '建筑条目 · CC BY-SA 4.0')
    addSource(q.coordinateSourceTitle || '建筑点位来源', q.sourceUrl, q.origin === 'shanghai-library' ? '门址与参考坐标 · 上海图书馆开放数据' : undefined)
    if (q.wikipediaAddress && q.addressComparison !== 'exact' && q.wikipediaAddress !== q.address) fact(result.questions, '地址差异', `名录登记地址范围：${q.address}；维基列表记载地址：${q.wikipediaAddress}。`)
    if (q.sourceAddress && q.sourceAddress !== q.address) fact(result.questions, '点位门址', `坐标来源记载门址：${q.sourceAddress}；与名录门址的对应范围待核。`)
    if (q.coordinateScope === 'address-reference-point') fact(result.questions, '门牌参考点', q.locationNote || '地图点为门牌参考位置，具体建筑边界尚未核定。')
    lifeEvents(q.buildingLifeDates, name)
  }
  if (linked) {
    if (linked.link.relation) fact(result.notes, '对应范围', relations[linked.link.relation])
    narrative('对应范围', linked.link.scopeNote)
    narrative('名称与地址沿革', linked.link.note)
    for (const source of linked.link.sources) addSource(source.title || '建筑沿革资料', source.url)
    for (const address of linked.link.historicalAddresses) addSource(`Virtual Shanghai #${address.sourceRecordId} · 旧门址`, address.sourceUrl)
    if (linked.link.modernAddress) addSource(linked.link.modernAddress.title, linked.link.modernAddress.sourceUrl)
    if (linked.link.modernAddress && h?.address !== linked.link.modernAddress.address) fact(result.notes, '名录登记地址范围', h?.address)
    else if (h?.address && h.address !== result.address) fact(result.notes, '名录登记地址范围', h.address)
  }
  for (const site of reviewedContextualHeritageSites.filter(item => histories.some(history => history.properties.id === item.landmarkFeatureId
    && [...new Set(history.properties.sourceRecordIds ?? [])].sort((a, b) => a - b).join(',') === [...new Set(item.expectedSourceRecordIds)].sort((a, b) => a - b).join(','))
    || places.some(place => place.properties.officialId === item.officialId))) {
    fact(result.notes, '地理／沿革关联（不合并建筑）', `${site.name} · ${site.officialCode}；Virtual Shanghai #${site.expectedSourceRecordIds.join(' / #')}。${site.note}`)
    addSource('上海优秀历史建筑 · 关联名录', site.sourceUrl)
    addSource('地理／沿革关联依据', site.evidenceUrl)
  }
  const aliases = distinct(histories.flatMap(item => item.properties.aliases ?? []).concat(linked?.link.aliases ?? []))
    .filter(name => name !== result.name && name !== result.foreignName)
  if (aliases.length) fact(result.notes, '其他名称', aliases.join(' · '))
  if (!result.address) fact(result.questions, '当前地址', '历史园址／建筑对应的现代门牌尚未核定；旧门牌见时间线。')
  if (!histories.length && !result.events.length && h) result.events.push({ key: 'undated-place', period: '年份未知', name: result.name,
    kind: '名录记录', address: h.address, url: url(h.officialSourceUrl) })
  result.events = [...new Map(result.events.map(event => [event.key, event])).values()]
    .sort((a, b) => (a.year ?? Infinity) - (b.year ?? Infinity))
  return result
}
