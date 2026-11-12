import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { applyHeritageUses, type HeritageUseIndex } from './heritageUses'
import type { HeritageBuildingCollection } from './heritageBuildings'

const collection: HeritageBuildingCollection = JSON.parse(fs.readFileSync('public/data/shanghai-excellent-historical-buildings/map-buildings.geojson', 'utf8'))
const index: HeritageUseIndex = JSON.parse(fs.readFileSync('public/data/shanghai-excellent-historical-buildings/historical-use-categories.json', 'utf8'))

describe('heritage historical use display', () => {
  it('covers every existing map point without changing original names, coordinates or directory records', () => {
    const before = structuredClone(collection)
    const result = applyHeritageUses(collection, index)
    expect(Object.keys(index.records)).toHaveLength(1058)
    expect(result.features).toHaveLength(1044)
    result.features.forEach((feature, i) => {
      expect(feature.geometry).toEqual(before.features[i].geometry)
      expect(feature.properties).toMatchObject(before.features[i].properties)
      expect(feature.properties.historicalUse).toBeDefined()
    })
    expect(collection).toEqual(before)
  })

  it('uses the former workshop, hangar, wharf and residence instead of modern tenants', () => {
    const result = applyHeritageUses(collection, index)
    for (const [code, category] of [
      ['5D114', 'industrial'], ['5D093', 'transport'], ['5D092', 'transport'],
      ['5D040', 'residential'], ['5D041', 'residential'], ['5D042', 'residential'],
      ['5M010', 'residential'], ['5B044', 'religion'], ['3N002', 'industrial'],
    ]) {
      expect(result.features.find(f => f.properties.officialCodeRaw === code)?.properties.historicalUseCategory).toBe(category)
    }
    const westBund = result.features.find(f => f.properties.officialCodeRaw === '5D114')!.properties
    expect(westBund.historicalDisplayName).toBe('上海飞机制造厂冲压车间')
    expect(westBund.historicalUse?.sources).toContain('https://www.westbund.com/cn/index/KEY-PROJECTS/detail_41bE6.html')
    expect(index.records['sh-fgj-2F008-01'].category).toBe('residential')
  })

  it('preserves historical stages and distinguishes a site predecessor from the present building', () => {
    expect(index.records['sh-fgj-4G010-01'].categories).toEqual(['parks', 'medical'])
    expect(index.records['sh-fgj-4B001-01'].category).toBe('parks')
    expect(index.records['sh-fgj-4B001-01'].note).toContain('1955')
    expect(index.records['sh-fgj-4N001-01'].note).toContain('不是1928年地标')
  })

  it('applies all thirteen user choices without claiming independent historical verification', () => {
    const expected: Record<string, string> = {
      '3A007': 'commerce', '3A016': 'commerce', '3A019': 'commerce', '4A005': 'commerce',
      '4A024': 'residential', '5A001': 'commerce', '5A019': 'commerce', '5A029': 'commerce',
      '5A030': 'commerce', '5A034': 'commerce', '5D083': 'residential', '5F023': 'medical', '5S004': 'commerce',
    }
    const result = applyHeritageUses(collection, index)
    for (const [code, category] of Object.entries(expected)) {
      const use = index.records[`sh-fgj-${code}-01`]
      expect(use.category).toBe(category)
      expect(use.status).toBe('user-assigned')
      expect(use.note).toContain('此前资料备注')
      expect(result.features.find(feature => feature.properties.officialCodeRaw === code)?.properties.historicalUseSymbol)
        .toBe(category === 'commerce' ? '商' : category === 'residential' ? '住' : '医')
    }
    expect(Object.values(index.records).filter(use => use.status === 'user-assigned')).toHaveLength(13)
  })

  it('retains a question mark for an explicitly unresolved record and rejects invalid category files', () => {
    const id = 'sh-fgj-4A005-01'
    const unresolved: HeritageUseIndex = { ...index, records: { ...index.records, [id]: {
      ...index.records[id], category: null, categories: [], status: 'unresolved',
    } } }
    expect(applyHeritageUses(collection, unresolved).features.find(feature => feature.properties.officialId === id)?.properties.historicalUseSymbol).toBe('?')
    expect(() => applyHeritageUses(collection, { schemaVersion: 1, records: {} })).toThrow('历史用途记录缺失')
    expect(() => applyHeritageUses(collection, { ...index, schemaVersion: 2 })).toThrow('历史用途数据格式')
  })
})
