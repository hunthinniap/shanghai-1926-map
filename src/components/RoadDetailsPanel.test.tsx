import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { HistoricalFeatureCollection } from '../types'
import { makeSearchRecords, searchRecords } from '../lib/search'
import { RoadDetailsPanel } from './RoadDetailsPanel'

const collection = JSON.parse(readFileSync('public/data/historical-features.geojson', 'utf8')) as HistoricalFeatureCollection

describe('Chinese road titles and transcriptions', () => {
  it('uses Zhaojia Road in 1913 and unifies Fuxing East Road in 1945', () => {
    const feature = collection.features.find(f => f.properties.featureGroupId === 'road-old-city-复兴东路')!
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<RoadDetailsPanel feature={feature} sources={[]} onClose={() => undefined} />)
    const timeline = container.querySelector('[aria-label="时间线"]')!
    expect(timeline.querySelector('.road-timeline-predecessor')?.textContent).toBe('肇嘉浜')
    expect([...timeline.querySelectorAll('.place-event-year')].map(el => el.textContent)).toEqual(['1913年', '1945年'])
    expect([...timeline.querySelectorAll('strong')].map(el => el.textContent)).toEqual(['肇嘉路', '复兴东路'])
    expect([...timeline.querySelectorAll('a')].every(el => el.href.includes('baike.baidu.com/item/'))).toBe(true)
    expect(timeline.textContent).not.toMatch(/法华民国路|东复兴路|1943/)
    const explanation = container.querySelector('[aria-label="沿革说明"]')!
    expect(explanation.textContent).toContain('肇家路')
    expect(explanation.textContent).toContain('东段另名大码头大街')
    expect(explanation.textContent).toContain('大东门大街、太平街、西门大街')
  })

  it('shows Wangjiamatou Road once per name and puts the supporting information below the timeline', () => {
    const feature = collection.features.find(f => f.properties.featureGroupId === 'road-api-old-city-extra-12-王家码头路')!
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<RoadDetailsPanel feature={feature} sources={[]} onClose={() => undefined} />)
    const timeline = container.querySelector('section[aria-label="时间线"]')!
    expect([...timeline.querySelectorAll('strong')].map(name => name.textContent)).toEqual(['王家码头街', '王家码头路'])
    expect([...timeline.querySelectorAll('.place-event-year')].map(year => year.textContent)).toEqual(['1910年', '今日'])
    expect(timeline.querySelector('p')).toBeNull()
    const explanation = container.querySelector('section[aria-label="沿革说明"]')!
    expect(explanation.textContent).toContain('外马路至小九华南街')
    expect(explanation.textContent).toContain('1855年海运局、1859年浙宁公所')
    expect(explanation.querySelector('a[href="https://www.shobserver.cn/sgh/detail?id=1749466"]')).not.toBeNull()
  })

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

  it('shows Fuxing Middle Road with the predecessor above the timeline', () => {
    const feature = collection.features.find(f => f.properties.kind === 'road' && f.properties.historicalName === 'Route Lafayette' && f.properties.modernNameZh === '复兴中路')!
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<RoadDetailsPanel feature={feature} sources={[]} onClose={() => undefined} />)
    expect(container.querySelector('.road-modern-name strong')?.textContent).toBe('复兴中路')
    expect(container.textContent).not.toContain('今日名称')
    const timeline = container.querySelector('section[aria-label="时间线"]')!
    const list = timeline.querySelector('ol')!
    expect(list.previousElementSibling?.textContent).toBe('南长浜')
    expect([...list.querySelectorAll('.place-event-year')].map(year => year.textContent)).toEqual(['1914年', '1918年', '1943年', '1945年'])
    const names = [...list.querySelectorAll('strong a')]
    expect(names.map(name => name.textContent)).toEqual(['法华路', 'Route Lafayette · 辣斐德路', '大兴路', '复兴中路'])
    expect(names.every(name => name.getAttribute('href') === 'https://zh.wikipedia.org/wiki/%E5%A4%8D%E5%85%B4%E4%B8%AD%E8%B7%AF')).toBe(true)
    expect(list.textContent).not.toContain('填南长浜辟路')
  })

  it('shows the original Foch name with a Chinese annotation and omits plain rename labels', () => {
    const feature = collection.features.find(f => f.properties.featureGroupId === 'road-avenue-foch-金陵西路')!
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<RoadDetailsPanel feature={feature} sources={[]} onClose={() => undefined} />)
    const timeline = container.querySelector('section[aria-label="时间线"]')!
    const rows = [...timeline.querySelectorAll('li')]
    expect(rows.map(row => row.querySelector('.place-event-year')?.textContent)).toEqual(['1914年', '1943年', '1945年'])
    expect(rows.map(row => row.querySelector('.place-event-kind')?.textContent)).toEqual(['辟筑', undefined, undefined])
    expect(rows.map(row => row.querySelector('a')?.textContent)).toEqual(['Avenue Foch', '洛阳路', '金陵西路'])
    expect(rows.map(row => row.querySelector('a')?.getAttribute('href'))).toEqual(Array(3).fill('https://zh.wikipedia.org/w/index.php?oldid=91950692'))
    expect(rows[0].querySelector('.road-event-name small')?.textContent).toBe('（福煦路）')
  })

  it('displays the start of the Chongqing North Road construction decade', () => {
    const feature = collection.features.find(f => f.properties.featureGroupId === 'road-chungking-road-重庆北路')!
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<RoadDetailsPanel feature={feature} sources={[]} onClose={() => undefined} />)
    const timeline = container.querySelector('section[aria-label="时间线"]')!
    expect([...timeline.querySelectorAll('.place-event-year')].map(year => year.textContent)).toEqual(['1890年', '1946年'])
    expect([...timeline.querySelectorAll('a')].map(link => link.textContent)).toEqual(['Chungking Road', '重庆北路'])
  })

  it.each(['road-boulevard-des-deux-republiques-人民路', 'road-old-city-人民路'])('separates the Renmin Road opening and naming dates for %s', groupId => {
    const feature = collection.features.find(f => f.properties.featureGroupId === groupId)!
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<RoadDetailsPanel feature={feature} sources={[]} onClose={() => undefined} />)
    const timeline = container.querySelector('section[aria-label="时间线"]')!
    expect([...timeline.querySelectorAll('.place-event-year')].map(year => year.textContent)).toEqual(['1912年', '1913年', '1951年'])
    const construction = timeline.querySelector('li')!
    expect(construction.querySelector('.place-event-kind a')?.textContent).toBe('拆城填濠')
    expect(construction.querySelector('.place-event-kind a')?.getAttribute('href')).toBe('https://zh.wikipedia.org/wiki/%E4%BA%BA%E6%B0%91%E8%B7%AF_(%E4%B8%8A%E6%B5%B7)')
    expect(construction.querySelector('.road-event-name')?.textContent).toBe('民国路')
    expect(construction.querySelector('.road-event-name a')).toBeNull()
    expect(construction.textContent).not.toContain('开工')
    const naming = [...timeline.querySelectorAll('a')].find(link => link.textContent === '法华民国路')
    expect(naming?.getAttribute('href')).toBe('https://zh.wikipedia.org/wiki/%E4%BA%BA%E6%B0%91%E8%B7%AF_(%E4%B8%8A%E6%B5%B7)')
  })

  it.each(['瑞金一路', '瑞金二路', '张家宅路'])('keeps non-name actions in the explanation for %s', modernName => {
    const feature = collection.features.find(f => f.properties.kind === 'road' && f.properties.modernNameZh === modernName)!
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<RoadDetailsPanel feature={feature} sources={[]} onClose={() => undefined} />)
    const timeline = container.querySelector('section[aria-label="时间线"]')!
    const action = modernName === '张家宅路' ? '填浜筑路' : '划入上海法租界'
    expect(timeline.textContent).not.toContain(action)
    const explanation = container.querySelector('section[aria-label="沿革说明"]')!
    expect(explanation.textContent).toContain(action)
    expect(explanation.querySelector('a[href]')).not.toBeNull()
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
    expect([...timeline.querySelectorAll('strong')].map(e => e.textContent)).toEqual(['Gordon Road', '江宁路'])
    expect(timeline.querySelector('.road-event-name small')?.textContent).toBe('（戈登路）')
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
