import { useEffect, useState } from 'react'
import { loadRoadHistorySupplement, roadHistorySupplementIdentity, type RoadHistorySupplement as Supplement } from '../data/roadHistorySupplements'
import type { HistoricalFeatureProperties } from '../types'

export function RoadHistorySupplement({ properties }: { properties: HistoricalFeatureProperties }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<Supplement>()
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const identity = roadHistorySupplementIdentity(properties)
  useEffect(() => {
    if (!open || !identity) return
    let active = true
    setError(false)
    loadRoadHistorySupplement(properties).then(result => {
      if (active) { setData(result); setError(!result) }
    }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [open, identity, properties, attempt])
  if (!identity) return null
  return <section className="place-section road-reference-section" aria-label="补充沿革资料">
    <details onToggle={event => setOpen(event.currentTarget.open)}>
      <summary>补充沿革资料（含待核内容）</summary>
      {open && !data && !error && <p role="status">正在读取资料…</p>}
      {error && <p role="alert">资料暂时无法读取。<button type="button" onClick={() => setAttempt(n => n + 1)}>重试</button></p>}
      {open && data && <>
        <p className="road-history-note">2026年11月5日提供的道路调查资料。以下保留原记录，未核定的内容不作为道路年代结论。</p>
        <p>{data.status === 'conflicting' ? '原资料含差异说明' : data.status === 'unresolved' ? '道路身份尚未查明' : '原始调查记录'}</p>
        <ul className="road-history-notes">{data.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
        <p className="road-history-note">{data.identity}</p>
        {data.events.length > 0 && <ol className="place-timeline">{data.events.map((event, i) => <li key={i}>
          <span className="place-event-year">{event.period || (event.year !== null ? `${event.year}年` : '年代待考')}</span>
          <div className="place-event-body"><span className="place-event-kind">{event.kind}</span><strong>{event.name}</strong>
            {event.segment && <p>范围／说明：{event.segment}</p>}
            {event.sources.length > 0 && <p className="road-history-citation">资料所引：{event.sources.join('；')}</p>}
          </div>
        </li>)}</ol>}
        {data.origins.length > 0 && <><h4>名称来源记录</h4><ul className="place-residents">{data.origins.map((origin, i) => <li key={i}>
          <strong>{origin.name}</strong><p>{origin.roadName}</p><p>{origin.description}</p>
          {origin.sources.length > 0 && <p className="road-history-citation">资料所引：{origin.sources.join('；')}</p>}
        </li>)}</ul></>}
        {data.conflicts.length > 0 && <><h4>冲突与待核事项</h4><ul className="road-history-notes">{data.conflicts.map((conflict, i) => <li key={i}>{conflict}</li>)}</ul></>}
        <h4>资料所列来源</h4><ol className="place-sources">{data.sources.map((source, i) => <li key={i}>
          <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
          {source.locator && <p>{source.locator}</p>}
        </li>)}</ol>
      </>}
    </details>
  </section>
}
