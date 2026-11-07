import { X } from 'lucide-react'
import { getRoadEponym } from '../data/roadEponyms'
import { reviewedRoadHistory, type RoadHistoryEvent, type RoadNameOrigin } from '../data/roadHistories'
import referenceData from '../data/roadHistoryReferences.json'
import { roadDisplayName } from '../lib/roadDisplayNames'
import { roadNameAtYear } from '../lib/roadLabels'
import { prepareRoadHistoryTimeline, roadHistoryDetailLabel } from '../lib/roadHistoryTimeline'
import type { HistoricalFeature, SourceRecord } from '../types'
import { RoadHistorySupplement } from './RoadHistorySupplement'
import { FeedbackButton } from './FeedbackButton'
import './PlaceDetailsPanel.css'

interface Reference { id: string; title: string; events: {period: string; kind: string; name: string; note?: string}[]; sources: {title: string; url: string}[] }
const references = referenceData as Record<string, Reference[]>

function Timeline({ events, road }: { events: RoadHistoryEvent[]; road?: HistoricalFeature['properties'] }) {
  const original = road?.historicalName
  const chinese = road?.historicalChinese
  return <ol className={road ? 'place-timeline road-timeline' : 'place-timeline'} role="list">{events.map((event, index) => {
    const hasChineseNote = original && chinese && (event.name === `${chinese}（${original}）` || event.name === `${chinese} (${original})`)
    const name = hasChineseNote ? original : event.name
    const kind = road && event.kind === '辟筑、命名' ? '辟筑' : event.kind
    return <li key={`${event.year}-${index}`}>
      <span className="place-event-year" title={event.originalPeriod ?? (event.displayYear !== undefined ? event.period : undefined)}>{event.displayYear !== undefined ? `${event.displayYear}年` : event.period || (event.year !== undefined ? `${event.year}年` : '年代待考')}</span>
      <div className="place-event-body">
        <div className="road-event-row">
          {(!road || kind !== '更名') && <span className="place-event-kind">{event.linkOnAction && event.url
            ? <a href={event.url} target="_blank" rel="noreferrer">{kind}</a> : kind}</span>}
          <span className="road-event-name">
            <strong>{event.url && !event.linkOnAction ? <a href={event.url} target="_blank" rel="noreferrer">{name}</a> : name}</strong>
            {hasChineseNote && <small>（{chinese}）</small>}
          </span>
        </div>
        {!road && event.note && <p>{event.note}</p>}
        {!road && event.segment && <p>路段：{event.segment}</p>}
      </div>
    </li>
  })}</ol>
}

export function RoadDetailsPanel({ feature, sources, timelineYear = null, onClose }: { feature: HistoricalFeature; sources: SourceRecord[]; timelineYear?: number | null; onClose: () => void }) {
  const p = feature.properties
  const historicalTitle = (p.roadLabelFromGeometry ? roadNameAtYear(p, 1928) : undefined) ?? roadDisplayName(p)
  const title = timelineYear === null ? historicalTitle : roadNameAtYear(p, timelineYear) ?? '此年暂无路名记录'
  const chineseFirst = historicalTitle !== p.historicalName
  const secondaryName = chineseFirst ? p.historicalName : p.historicalChinese
  const history = reviewedRoadHistory(p)
  const person = getRoadEponym(p.historicalName)
  const origins: RoadNameOrigin[] = history?.origins || (person ? [{ name: person.name, url: person.url, description: person.summary }] : [])
  const pending = references[p.featureGroupId] || []
  const events: RoadHistoryEvent[] = history?.events || [
    { kind: '历史名称', name: p.historicalChinese ? `${p.historicalName} · ${p.historicalChinese}` : p.historicalName,
      note: '辟筑及更名年份尚未核定。' },
    { period: '今日', kind: '现名', name: p.modernNameZh },
  ]
  const timeline = prepareRoadHistoryTimeline(events)
  const sourceList = [...new Map([
    ...p.sourceIds.flatMap(id => { const s = sources.find(s => s.id === id); return s ? [{ title: s.title, url: (p.sourceUrls?.[id] || s.url).replace(/^http:/, 'https:') }] : [] }),
    ...(history?.events.flatMap(e => e.url ? [{ title: e.sourceTitle || `维基百科 · ${p.modernNameZh}`, url: e.url }] : []) || []),
    ...(history?.sources || []),
    ...origins.map(origin => ({ title: origin.sourceTitle || origin.name, url: origin.url })),
  ].map(source => [source.url, source])).values()]
  return <aside className="details-panel place-details-panel road-details-panel" aria-label={`${title}详情`}>
    <div className="details-grip" aria-hidden="true" />
    <button type="button" className="icon-button details-close" onClick={onClose} aria-label="关闭详情"><X size={18} aria-hidden="true" /></button>
    <FeedbackButton key={p.featureGroupId} context={{ id: p.featureGroupId, type: 'road', name: title, modernName: p.modernNameZh, year: timelineYear }} />
    <header className="place-heading"><h2>{title}</h2>
      {timelineYear === null && secondaryName && secondaryName !== title && <p className={chineseFirst ? 'details-road-transcription' : 'details-historical-chinese'}>{secondaryName}</p>}
      {timelineYear !== null && <p className="place-selected-year">{timelineYear} 年</p>}
    </header>
    <p className="place-address road-modern-name"><strong>{p.modernNameZh}</strong></p>
    <section className="place-section" aria-label="时间线"><h3>时间线</h3>
      {history?.predecessor && <p className="road-timeline-predecessor">{history.predecessor}</p>}
      <Timeline events={timeline.events} road={p} />
    </section>
    {origins.length > 0 && <section className="place-section" aria-label="名字来源"><h3>名字来源</h3>
      <ul className="place-residents">{origins.map(origin => <li key={`${origin.url}-${origin.name}`}>
        <a href={origin.url} target="_blank" rel="noreferrer">{origin.name}</a>
        <p>{origin.description}{origin.links?.map(link => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.text}</a>)}{origin.suffix}</p>
      </li>)}</ul>
    </section>}
    {(history?.note || timeline.details.length > 0) && <section className="place-section" aria-label="沿革说明"><h3>沿革说明</h3>
      {history?.note && <p className="road-history-note">{history.note}</p>}
      {timeline.details.length > 0 && <ul className="road-history-notes">{timeline.details.map(({ event, text }, index) => <li key={index}>
        <span>{roadHistoryDetailLabel(event)}：</span>{text}
        {event.url && <> <a className="road-history-citation" href={event.url} target="_blank" rel="noreferrer">来源</a></>}
      </li>)}</ul>}
    </section>}
    <RoadHistorySupplement key={`${p.featureGroupId}-${p.historicalName}-${p.modernNameZh}`} properties={p} />
    {pending.length > 0 && <section className="place-section road-reference-section" aria-label="参考资料待核">
      <details><summary>参考资料待核（{pending.length}份）</summary>
        <p className="road-history-note">下列为提供资料中的原始时间线，尚未逐条核实。与已核实时间线不同的年份，以各自来源和具体路段继续核对。</p>
        {pending.map(reference => <div key={reference.id}><Timeline events={reference.events} />
          <ul className="place-sources">{reference.sources.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul>
        </div>)}
      </details>
    </section>}
    <section className="place-section" aria-label="名称资料"><h3>名称资料</h3>
      <dl className="place-facts"><div><dt>原文／转写</dt><dd>{chineseFirst ? p.language === 'wuu' ? '老派沪语拼音（无声调）' : '旧式英文转写' : p.language === 'fr' ? '法语原名' : p.language === 'en' ? '英文原名' : '中文旧名'}</dd></div>
        <div><dt>原数据资料年</dt><dd>{p.labelYearIsFallback ? '年代待考' : `${p.labelYear}年`}（不作为建成年份）</dd></div>
        {!!p.aliases?.length && <div><dt>其他写法</dt><dd>{p.aliases.join(' · ')}</dd></div>}
      </dl>
    </section>
    {sourceList.length > 0 && <section className="place-section" aria-label="来源"><h3>来源</h3><ol className="place-sources">{sourceList.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ol></section>}
  </aside>
}
