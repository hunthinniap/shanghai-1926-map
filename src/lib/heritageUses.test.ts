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
    expect(result.features).toHaveLength(978)
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

  it('keeps insufficient evidence unresolved and rejects partial or mismatched category files', () => {
    expect(index.records['sh-fgj-4A005-01'].category).toBeNull()
    expect(index.records['sh-fgj-5D083-01'].status).toBe('unresolved')
    expect(() => applyHeritageUses(collection, { schemaVersion: 1, records: {} })).toThrow('历史用途记录缺失')
    expect(() => applyHeritageUses(collection, { ...index, schemaVersion: 2 })).toThrow('历史用途数据格式')
  })
})
