import type { HeritageBuildingCollection } from './heritageBuildings'

export const heritageUseCategories = [
  { id: 'residential', label: '住宅', symbol: '住', color: '#926941' },
  { id: 'education', label: '教育文化', symbol: '教', color: '#366c96' },
  { id: 'medical', label: '医疗', symbol: '医', color: '#ac4949' },
  { id: 'commerce', label: '商业与会馆', symbol: '商', color: '#947326' },
  { id: 'industrial', label: '工业', symbol: '工', color: '#5c6772' },
  { id: 'religion', label: '宗教', symbol: '宗', color: '#805990' },
  { id: 'parks', label: '公园与墓园', symbol: '园', color: '#47764b' },
  { id: 'recreation', label: '文娱体育', symbol: '娱', color: '#a65478' },
  { id: 'public', label: '公共机构', symbol: '公', color: '#775246' },
  { id: 'transport', label: '交通', symbol: '交', color: '#287c7b' },
] as const

export type HeritageUseCategory = typeof heritageUseCategories[number]['id']
export interface HeritageUseRecord {
  category: HeritageUseCategory | null
  categories: HeritageUseCategory[]
  status: 'reviewed' | 'candidate' | 'review-needed' | 'unresolved'
  historicalName: string | null
  note: string
  sources: string[]
}
export interface HeritageUseIndex {
  schemaVersion: number
  records: Record<string, HeritageUseRecord>
}

export const heritageUseStatusLabels = {
  reviewed: '资料已复核', candidate: '名录与历史记录初分',
  'review-needed': '仍需复核', unresolved: '历史用途待核',
} as const

export function heritageUseLabel(id: HeritageUseCategory) {
  return heritageUseCategories.find(c => c.id === id)?.label ?? id
}

export function applyHeritageUses(collection: HeritageBuildingCollection, index: HeritageUseIndex): HeritageBuildingCollection {
  if (index.schemaVersion !== 1 || !index.records) throw new Error('历史用途数据格式有误')
  return { ...collection, features: collection.features.map(feature => {
    const use = index.records[feature.properties.officialId]
    if (!use || !Array.isArray(use.categories) || !Array.isArray(use.sources)
      || !(use.status in heritageUseStatusLabels)
      || (use.category !== null && !use.categories.includes(use.category))
      || use.categories.some(id => !heritageUseCategories.some(c => c.id === id))) {
      throw new Error(`历史用途记录缺失或有误：${feature.properties.officialId}`)
    }
    const category = heritageUseCategories.find(c => c.id === use.category)
    return { ...feature, properties: { ...feature.properties,
      historicalUse: use,
      historicalUseCategory: use.category,
      historicalUseSymbol: category?.symbol ?? '?',
      historicalUseColor: category?.color ?? '#817c70',
      historicalDisplayName: use.historicalName || feature.properties.articleTitle || feature.properties.name,
    } }
  }) }
}
