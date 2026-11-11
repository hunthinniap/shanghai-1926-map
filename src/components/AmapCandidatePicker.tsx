import { useEffect, useState } from 'react'
import { ChevronDown, ExternalLink, MapPin } from 'lucide-react'
import { assetUrl } from '../lib/assets'
import { amapUrl, type Dataset, type ReviewRecord } from '../poi-review/model'

let cachedDataset: Promise<Dataset> | undefined
function loadDataset() {
  if (!cachedDataset) cachedDataset = fetch(assetUrl('data/heritage-poi-review.json')).then(async response => {
    if (!response.ok) throw Error('候选名单加载失败，请重试。')
    const data = await response.json() as Dataset
    if (data.schemaVersion !== 1 || !Array.isArray(data.records)) throw Error('候选名单格式不正确。')
    return data
  }).catch(error => { cachedDataset = undefined; throw error })
  return cachedDataset
}

export function AmapCandidatePicker({ place }: { place: { officialId: string; name: string; address: string } }) {
  const [open, setOpen] = useState(false), [attempt, setAttempt] = useState(0)
  const [record, setRecord] = useState<ReviewRecord>(), [loaded, setLoaded] = useState(false)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [error, setError] = useState(''), [countError, setCountError] = useState('')
  const [busy, setBusy] = useState(''), [selected, setSelected] = useState(''), [notice, setNotice] = useState('')
  useEffect(() => {
    if (!open) return
    let active = true
    setError('')
    void loadDataset().then(data => {
      if (!active) return
      setRecord(data.records.find(item => item.officialId === place.officialId))
      setLoaded(true)
    }).catch(() => { if (active) setError('候选名单加载失败，请重试。') })
    const controller = new AbortController()
    void fetch(assetUrl(`api/poi-candidate-votes?officialId=${encodeURIComponent(place.officialId)}`), { signal: controller.signal }).then(async response => {
      if (!response.ok) throw Error('Counts unavailable')
      const data = await response.json() as { counts: Record<string, number> }
      if (!data.counts || Object.values(data.counts).some(count => !Number.isSafeInteger(count) || count < 0)) throw Error('Invalid counts')
      if (active) { setCounts(data.counts); setCountError('') }
    }).catch(() => { if (active) setCountError('暂时无法读取选择次数，可重试。') })
    return () => { active = false; controller.abort() }
  }, [open, attempt, place.officialId])

  async function select(poiid: string) {
    if (busy) return
    setBusy(poiid); setCountError(''); setNotice('')
    try {
      const response = await fetch(assetUrl('api/poi-candidate-votes'), { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Poi-Selection': '1' },
        body: JSON.stringify({ officialId: place.officialId, poiid }), signal: AbortSignal.timeout(15000) })
      if (!response.ok) throw Error('Selection failed')
      const data = await response.json() as { officialId: string; poiid: string; count: number }
      if (data.officialId !== place.officialId || data.poiid !== poiid || !Number.isSafeInteger(data.count) || data.count < 1) throw Error('Invalid response')
      setCounts(previous => ({ ...previous, [poiid]: data.count })); setSelected(poiid)
      setNotice('已记录选择，次数 +1。')
    } catch { setCountError('选择未能确认保存，请稍后重试。') }
    finally { setBusy('') }
  }

  return <section className="place-amap-candidates" aria-label={`${place.name}高德候选`}>
    <button type="button" className="poi-candidates-entry" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <MapPin size={14} aria-hidden="true" />高德候选名单<ChevronDown size={14} aria-hidden="true" className={open ? 'is-open' : ''} />
    </button>
    {open && <div className="poi-candidates-content">
      <p className="poi-candidates-hint">{place.name}尚未确定高德地点。查看候选后，选择你认为对应的位置；每点一次，选择次数 +1。</p>
      {error ? <p role="alert">{error}<button type="button" onClick={() => setAttempt(value => value + 1)}>重新加载</button></p>
        : !loaded ? <p role="status">正在加载候选……</p>
          : !record?.candidates.length ? <p>暂时没有可用候选。</p>
            : <ol className="poi-candidates-list">{record.candidates.map(candidate => <li key={candidate.id} className={selected === candidate.id ? 'is-selected' : ''}>
              <strong>{candidate.name}</strong>
              <p>{[candidate.district, candidate.address].filter(Boolean).join(' · ') || '门牌未提供'}</p>
              {candidate.flags.length > 0 && <small className="poi-candidate-flags">{candidate.flags.join(' · ')}</small>}
              <div className="poi-candidate-actions">
                <a href={amapUrl(candidate.id)} target="_blank" rel="noopener noreferrer">在高德查看<ExternalLink size={11} aria-hidden="true" /></a>
                <button type="button" disabled={Boolean(busy)} aria-pressed={selected === candidate.id} aria-label={`选择${candidate.name}，次数加一`} onClick={() => void select(candidate.id)}>
                  {busy === candidate.id ? '保存中…' : '选择此地点 +1'}
                </button>
              </div>
              <span className="poi-candidate-count">选择次数：{counts[candidate.id] ?? '—'}</span>
            </li>)}</ol>}
      {countError && <p className="poi-candidates-error" role="alert">{countError}<button type="button" onClick={() => setAttempt(value => value + 1)}>重试</button></p>}
      <p className="poi-candidate-notice" role="status">{notice}</p>
    </div>}
  </section>
}
