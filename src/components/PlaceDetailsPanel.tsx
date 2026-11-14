import { ExternalLink, MapPin, X } from 'lucide-react'
import type { PlaceDetails, PlaceFact } from '../lib/placeDetails'
import { FeedbackButton } from './FeedbackButton'
import { AmapCandidatePicker } from './AmapCandidatePicker'
import { RouteAddButton } from './HeritageRoute'
import './PlaceDetailsPanel.css'

function Facts({ items }: { items: PlaceFact[] }) {
  return <dl className="place-facts">{items.map((item, index) => <div key={`${item.label}-${index}`}>
    <dt>{item.label}</dt><dd>{item.value}</dd>
  </div>)}</dl>
}

const coordinateScopeLabels: Record<string, string> = {
  'building-reference-point': '楼体参考点',
  'linked-building-reference-point': '楼体参考点',
  'address-reference-point': '门址参考点',
  'building-complex-reference-point': '院落／建筑群参考点',
}

export function PlaceDetailsPanel({ details, onClose }: { details: PlaceDetails; onClose: () => void }) {
  return <aside className={`details-panel place-details-panel${details.heritage ? ' heritage-details-panel' : ''}`} aria-label={`${details.name}详情`}>
    <div className="details-grip" aria-hidden="true" />
    <button type="button" className="icon-button details-close" onClick={onClose} aria-label="关闭详情"><X size={18} aria-hidden="true" /></button>
    <FeedbackButton key={details.feedbackId} context={{ id: details.feedbackId, type: 'building', name: details.name, address: details.address, year: details.year }} />
    <header className="place-heading">
      <h2>{details.name}</h2>
      {details.foreignName && <p className="place-foreign-name">{details.foreignName}</p>}
      {details.year !== undefined && <p className="place-selected-year">{details.year} 年</p>}
    </header>
    <dl className="place-address"><div><dt>当前地址</dt><dd>{details.address || '尚未核定'}</dd></div></dl>
    {details.mapLinks.length > 0 && <ul className="place-map-links" aria-label="外部地图">
      {details.mapLinks.map((link, index) => <li key={link.url}>
        <a href={link.url} target="_blank" rel="noopener noreferrer">
          <MapPin size={14} aria-hidden="true" /><span>在高德地图查看</span><ExternalLink size={12} aria-hidden="true" />
        </a>
        {index === 0 && <RouteAddButton choices={details.routeChoices} />}
        {details.mapLinks.length > 1 && <small>{link.title}</small>}
      </li>)}
    </ul>}
    {details.amapCandidatePlaces.map(place => <AmapCandidatePicker key={place.officialId} place={place} />)}

    {details.coordinateReviews.length > 0 && <section className="place-section place-locations" aria-label="位置与来源">
      <h3>位置与来源</h3>
      {details.coordinateReviews.map(review => <div key={review.officialId} className="place-location-review">
        <p className="place-location-label">{review.label}</p>
        <p className={`place-location-status${review.status === 'partial-reference' ? ' is-partial' : ''}`}>
          {review.status === 'partial-reference' ? '部分定位' : '定位参考'}
        </p>
        {review.status === 'partial-reference' && <p className="place-location-reason">{review.reason}</p>}
        <details className="place-location-details" open={review.status === 'partial-reference' || undefined}>
          <summary>查看 {review.points.length} 个参考位置</summary>
          {review.status !== 'partial-reference' && <p className="place-location-reason">{review.reason}</p>}
          <ul className="place-reference-points">{review.points.map((point, index) => <li key={`${point.sourceUrl}-${index}`}>
            <strong>{point.name}</strong>
            <span className="place-location-kind">{coordinateScopeLabels[point.coordinateScope] || '位置参考点'}</span>
            {point.sourceAddress && <p>{point.sourceAddress}</p>}
            <p className="place-location-coordinates">WGS84 · 经度 {point.lon}，纬度 {point.lat}</p>
            <a href={point.sourceUrl} target="_blank" rel="noreferrer">{point.sourceTitle || '点位来源'}</a>
            {point.coordinateSystemInferred && <small>坐标系经独立对照推断。</small>}
          </li>)}</ul>
          <p className="place-location-caveat">这些位置用于定位参考，未测定保护建筑边界。</p>
        </details>
      </div>)}
    </section>}

    <section className="place-section" aria-label="时间线">
      <h3>时间线</h3>
      <ol className="place-timeline">{details.events.map(event => <li key={event.key} className={event.active ? 'is-active' : undefined}>
        <span className="place-event-year">{event.period}</span>
        <div className="place-event-body">
          {!event.name.startsWith(event.kind) && <span className="place-event-kind">{event.kind}</span>}
          <strong>{event.url ? <a href={event.url} target="_blank" rel="noreferrer">{event.name}</a> : event.name}</strong>
          {event.originalName && <span className="place-event-original">{event.originalName}</span>}
          {event.address && <p className="place-event-address">地址：{event.address}</p>}
          {event.description && <p>{event.description}</p>}
        </div>
      </li>)}</ol>
    </section>

    {details.residents.length > 0 && <section className="place-section" aria-label="居住过的名人"><h3>居住过的名人</h3>
      <ul className="place-residents">{details.residents.map(resident => <li key={`${resident.name}-${resident.period || ''}-${resident.address || ''}`}>
        <div><a href={resident.sources[0].url} target="_blank" rel="noreferrer">{resident.name}</a>{resident.period && <span>（{resident.period}）</span>}</div>
        {resident.address && <p>{resident.address}</p>}{resident.note && <p>{resident.note}</p>}
      </li>)}</ul>
    </section>}

    {details.buildings.length > 0 && <section className="place-section" aria-label="建筑资料"><h3>建筑资料</h3><Facts items={details.buildings} /></section>}
    {details.catalogue.length > 0 && <section className="place-section" aria-label="收录于"><h3>收录于</h3>
      <ul className="place-catalogue">{details.catalogue.map(item => <li key={`${item.title}-${item.url}`}>
        <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>{item.note && <small>{item.note}</small>}
      </li>)}</ul>
    </section>}
    {details.notes.length > 0 && <section className="place-section" aria-label="历史沿革备注"><h3>历史沿革备注</h3><Facts items={details.notes} /></section>}
    {details.sources.length > 0 && <section className="place-section" aria-label="来源"><h3>来源 <span>{details.sources.length}</span></h3>
      <ol className="place-sources">{details.sources.map(source => <li key={source.url}>
        <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>{source.note && <small>{source.note}</small>}
      </li>)}</ol>
    </section>}
    {details.questions.length > 0 && <section className="place-section place-questions" aria-label="待核查"><h3>待核查</h3><Facts items={details.questions} /></section>}
  </aside>
}
