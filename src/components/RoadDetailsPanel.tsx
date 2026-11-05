import { X } from 'lucide-react'
import { getRoadEponym } from '../data/roadEponyms'
import { reviewedRoadHistory, type RoadHistoryEvent, type RoadNameOrigin } from '../data/roadHistories'
import referenceData from '../data/roadHistoryReferences.json'
import { roadDisplayName } from '../lib/roadDisplayNames'
import type { HistoricalFeature, SourceRecord } from '../types'
import './PlaceDetailsPanel.css'

interface Reference { id: string; title: string; events: {period: string; kind: string; name: string; note?: string}[]; sources: {title: string; url: string}[] }
const references = referenceData as Record<string, Reference[]>

function Timeline({ events }: { events: RoadHistoryEvent[] }) {
  return <ol className="place-timeline">{events.map((event, index) => <li key={`${event.year}-${index}`}>
    <span className="place-event-year">{event.period || (event.year !== undefined ? `${event.year}年` : '年代待考')}</span>
    <div className="place-event-body"><span className="place-event-kind">{event.kind}</span>
      <strong>{event.url ? <a href={event.url} target="_blank" rel="noreferrer">{event.name}</a> : event.name}</strong>
      {event.note && <p>{event.note}</p>}
    </div>
  </li>)}</ol>
}

export function RoadDetailsPanel({ feature, sources, onClose }: { feature: HistoricalFeature; sources: SourceRecord[]; onClose: () => void }) {
  const p = feature.properties
  const title = roadDisplayName(p)
  const chineseFirst = title !== p.historicalName
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
  const sourceList = [...new Map([
    ...p.sourceIds.flatMap(id => { const s = sources.find(s => s.id === id); return s ? [{ title: s.title, url: (p.sourceUrls?.[id] || s.url).replace(/^http:/, 'https:') }] : [] }),
    ...(history?.events.flatMap(e => e.url ? [{ title: `维基百科 · ${p.modernNameZh}`, url: e.url }] : []) || []),
    ...origins.map(origin => ({ title: origin.name, url: origin.url })),
  ].map(source => [source.url, source])).values()]
  return <aside className="details-panel place-details-panel road-details-panel" aria-label={`${title}详情`}>
    <div className="details-grip" aria-hidden="true" />
    <button type="button" className="icon-button details-close" onClick={onClose} aria-label="关闭详情"><X size={18} aria-hidden="true" /></button>
    <header className="place-heading"><h2>{title}</h2>
      {secondaryName && secondaryName !== title && <p className={chineseFirst ? 'details-road-transcription' : 'details-historical-chinese'}>{secondaryName}</p>}
    </header>
    <dl className="place-address"><div><dt>今日名称</dt><dd>{p.modernNameZh}</dd></div></dl>
    <section className="place-section" aria-label="时间线"><h3>时间线</h3><Timeline events={events} /></section>
    {origins.length > 0 && <section className="place-section" aria-label="名字来源"><h3>名字来源</h3>
      <ul className="place-residents">{origins.map(origin => <li key={origin.url}>
        <a href={origin.url} target="_blank" rel="noreferrer">{origin.name}</a>
        <p>{origin.description}{origin.links?.map(link => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.text}</a>)}{origin.suffix}</p>
      </li>)}</ul>
    </section>}
    {history?.note && <section className="place-section" aria-label="沿革说明"><h3>沿革说明</h3><p className="road-history-note">{history.note}</p></section>}
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
