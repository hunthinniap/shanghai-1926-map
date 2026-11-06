import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HistoricalFeatureCollection } from '../types'
import { makeSearchRecords, searchRecords } from '../lib/search'
import { RoadDetailsPanel } from './RoadDetailsPanel'

const collection = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection

describe('Chinese road titles and transcriptions', () => {
  it.each([
    ['Haining Road', '海宁路', '旧式英文转写'],
    ['Wu Bin Lu', '和平路', '老派沪语拼音（无声调）'],
    ['Min Kueq Lu', '民國路', '老派沪语拼音（无声调）'],
    ['Sinkiang Road', '南川虹路', '旧式英文转写'],
    ['Mongolia Road', '蒙古路', '旧式英文转写'],
    ['Manchulia Road', '满州路', '旧式英文转写'],
  ])('shows %s below its Chinese title and keeps both names searchable', (original, chinese, transcription) => {
    const feature = collection.features.find(f => f.properties.kind === 'road' && f.properties.historicalName === original)!
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<RoadDetailsPanel feature={feature} sources={[]} onClose={() => undefined} />)
    const heading = container.querySelector('h2')!
    expect(heading.textContent).toBe(chinese)
    expect(heading.nextElementSibling?.textContent).toBe(original)
    expect(container.querySelector('aside')?.getAttribute('aria-label')).toBe(`${chinese}详情`)
    expect(container.textContent).toContain(transcription)
    const records = makeSearchRecords([feature])
    for (const query of [chinese, original, feature.properties.modernNameZh]) {
      expect(searchRecords(records, query)[0]).toMatchObject({
        historicalName: chinese, featureGroupId: feature.properties.featureGroupId,
      })
    }
  })

  it('retains the original foreign title and its Chinese translation', () => {
    const feature = collection.features.find(f => f.properties.kind === 'road' && f.properties.historicalName === 'Avenue Joffre')!
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<RoadDetailsPanel feature={feature} sources={[]} onClose={() => undefined} />)
    const heading = container.querySelector('h2')!
    expect(heading.textContent).toBe('Avenue Joffre')
    expect(heading.nextElementSibling?.textContent).toBe('霞飞路')
    expect(container.textContent).toContain('Joseph Joffre')
  })

  it('shows the verified Prentice timeline and linked council role, not the map data year', () => {
    const feature = collection.features.find(f => f.properties.featureGroupId === 'road-route-john-prentice-进贤路')!
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<RoadDetailsPanel feature={feature} sources={[]} onClose={() => undefined} />)
    const timeline = container.querySelector('section[aria-label="时间线"]')!
    expect(timeline.textContent).toContain('1926年')
    expect(timeline.textContent).toContain('1943年')
    expect(timeline.textContent).not.toContain('1928年')
    expect(timeline.textContent).not.toContain('1939年')
    const origins = container.querySelector('section[aria-label="名字来源"]')!
    expect(origins.textContent).toContain('1901—1902年出任上海公共租界工部局总董')
    expect(origins.querySelector('a[href*="%E5%B7%A5%E9%83%A8%E5%B1%80"]')).not.toBeNull()
  })

  it('corrects the reference timeline without silently promoting its dates', () => {
    const feature = collection.features.find(f => f.properties.featureGroupId === 'road-rue-massenet-思南路')!
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<RoadDetailsPanel feature={feature} sources={[]} onClose={() => undefined} />)
    const events = [...container.querySelectorAll('section[aria-label="时间线"] li')].map(li => li.textContent)
    expect(events.some(text => text?.includes('1943年') && text.includes('蓝田路'))).toBe(true)
    expect(events.some(text => text?.includes('1946年1月1日') && text.includes('思南路'))).toBe(true)
    expect(container.querySelector('section[aria-label="参考资料待核"] details')?.hasAttribute('open')).toBe(false)
  })

  it('shows the Anfu range start and fixed source while keeping the supplied record collapsed', () => {
    const feature = collection.features.find(f => f.properties.featureGroupId === 'road-route-dupleix-安福路')!
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<RoadDetailsPanel feature={feature} sources={[]} onClose={() => undefined} />)
    const timeline = container.querySelector('section[aria-label="时间线"]')!
    expect(timeline.querySelector('.place-event-year')?.textContent).toBe('1914年')
    expect(timeline.textContent).toContain('1943年')
    expect(timeline.querySelector('a')?.getAttribute('href')).toBe('https://zh.wikipedia.org/w/index.php?oldid=82080476')
    expect(container.querySelector('section[aria-label="补充沿革资料"] details')?.hasAttribute('open')).toBe(false)
    expect(container.querySelector('section[aria-label="来源"]')?.textContent).toContain('维基百科 · 安福路（固定版本）')
    expect(container.querySelector('section[aria-label="名字来源"]')?.textContent).toContain('江西安福')
  })

  it('shows Gordon Road at 1884 and Jiangning Road at 1943 without the police-station event', () => {
    const feature = collection.features.find(f => f.properties.featureGroupId === 'road-gordon-road-江宁路')!
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<RoadDetailsPanel feature={feature} sources={[]} onClose={() => undefined} />)
    const timeline = container.querySelector('section[aria-label="时间线"]')!
    expect([...timeline.querySelectorAll('.place-event-year')].map(e => e.textContent)).toEqual(['1884年', '1943年'])
    expect([...timeline.querySelectorAll('strong')].map(e => e.textContent)).toEqual(['戈登路 (Gordon Road)', '江宁路'])
    expect(timeline.textContent).not.toContain('1909')
  })

  it.each(['Thibet Road', 'Yuyaching Road'])('shows 西藏路 without a verb prefix for the %s record', original => {
    const feature = collection.features.find(f => f.properties.kind === 'road' && f.properties.historicalName === original && f.properties.modernNameZh === '西藏中路')!
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<RoadDetailsPanel feature={feature} sources={[]} onClose={() => undefined} />)
    const event = [...container.querySelectorAll('section[aria-label="时间线"] li')]
      .find(li => li.querySelector('.place-event-year')?.textContent === '1943年')!
    expect(event.querySelector('strong')?.textContent).toBe('西藏路')
    expect(event.querySelector('a')?.getAttribute('href')).toBe('https://zh.wikipedia.org/w/index.php?oldid=92213609')
  })
})
