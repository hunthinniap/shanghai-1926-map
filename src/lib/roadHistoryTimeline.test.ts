import { describe, expect, it } from 'vitest'
import { prepareRoadHistoryTimeline } from './roadHistoryTimeline'
import type { RoadHistoryEvent } from '../data/roadHistories'

describe('compact road name timelines', () => {
  it('keeps the earliest dated name and moves later events and notes to the explanation', () => {
    const input: RoadHistoryEvent[] = [
      { year: 1865, kind: '命名', name: '圆明园路', url: 'https://example.com/naming' },
      { year: 1862, kind: '辟筑', name: '圆明园路', note: '最早道路记录。' },
    ]
    const original = structuredClone(input)
    const result = prepareRoadHistoryTimeline(input)
    expect(result.events).toEqual([{ year: 1862, kind: '辟筑', name: '圆明园路' }])
    expect(result.details).toEqual([
      { event: input[1], text: '最早道路记录。' },
      { event: input[0], text: '命名圆明园路。' },
    ])
    expect(input).toEqual(original)
  })

  it('merges the undated duplicate of a present name while retaining its source and explanation', () => {
    const result = prepareRoadHistoryTimeline([
      { year: 1910, kind: '见载', name: '王家码头街' },
      { period: '年代待考', kind: '曾用名', name: '王家码头路', note: '统一改称路的年份尚待考。', url: 'https://example.com/history' },
      { year: 2026, period: '今日', kind: '现名', name: '王家码头路' },
    ])
    expect(result.events.map(event => [event.year, event.name])).toEqual([[1910, '王家码头街'], [2026, '王家码头路']])
    expect(result.details[0]).toMatchObject({ text: '统一改称路的年份尚待考。', event: { url: 'https://example.com/history' } })
  })

  it('does not erase a return to a former road name', () => {
    const result = prepareRoadHistoryTimeline([
      { year: 1900, kind: '命名', name: '甲路' },
      { year: 1943, kind: '更名', name: '乙路' },
      { year: 1945, kind: '复名', name: '甲路' },
    ])
    expect(result.events.map(event => event.name)).toEqual(['甲路', '乙路', '甲路'])
  })

  it('preserves distinct segments and moves their scope into the explanation', () => {
    const result = prepareRoadHistoryTimeline([
      { year: 1900, kind: '辟筑', name: '甲路', segment: '东段' },
      { year: 1910, kind: '西延', name: '甲路', segment: '西段' },
    ])
    expect(result.events).toHaveLength(2)
    expect(result.details.map(detail => detail.text)).toEqual(['路段：东段', '路段：西段'])
  })
})
