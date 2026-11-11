import { useEffect, useMemo, useRef, useState } from 'react'
import { assetUrl } from '../lib/assets'
import { amapUrl, completed, decisionLabel, emptyDecision, exportReview, importReview, reasonLabels, storageKey } from './model'
import type { Dataset, Decision, Decisions, ReviewRecord } from './model'

const PAGE_SIZE = 8

function BuildingCard({ record, decision, change, shared }: {
  record: ReviewRecord; decision: Decision; change: (next: Decision) => void; shared: Map<string, string[]>;
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? record.candidates : record.candidates.filter((candidate, i) => i < 4 || decision.selectedIds.includes(candidate.id))
  const update = (patch: Partial<Decision>) => change({ ...decision, ...patch, updatedAt: new Date().toISOString() })
  const toggle = (id: string) => update({ verdict: 'pending', selectedIds: decision.selectedIds.includes(id)
    ? decision.selectedIds.filter(selected => selected !== id) : [...decision.selectedIds, id] })
  return <article className={`building-card ${completed(decision) ? 'is-complete' : ''}`} id={record.officialId}>
    <header className="building-heading">
      <div><div className="building-meta"><span>{record.code}</span><span>{record.district} · 第{record.batch}批</span></div>
        <h2>{record.name}</h2><p className="official-address">{record.address}</p>
        {record.listedName && record.listedName !== record.name && <p className="listed-use">名录列名／用途：{record.listedName}</p>}
      </div>
      <div className="building-heading-aside"><span className={`verdict ${decision.verdict}`}>{decisionLabel(decision)}</span>
        <a href={record.sourceUrl} target="_blank" rel="noreferrer">官方名录 ↗</a></div>
    </header>
    <div className="review-reason"><strong>{reasonLabels[record.reasonCode] ?? '待复核'}</strong><span>{record.reason}</span></div>
    <div className="candidate-heading"><h3>高德候选 <span>{record.candidates.length}</span></h3><span>可勾选多个地点</span></div>
    <div className="candidate-grid">
      {visible.map(candidate => <div className={`candidate ${decision.selectedIds.includes(candidate.id) ? 'is-selected' : ''}`} key={candidate.id}>
        <label className="candidate-choice"><input type="checkbox" checked={decision.selectedIds.includes(candidate.id)} onChange={() => toggle(candidate.id)} aria-label={`选择 ${candidate.name}（${candidate.id}）`} />
          <span>{candidate.name}</span></label>
        <div className="candidate-body"><p className="candidate-address">{candidate.address || '高德未提供门牌'}{candidate.district && <small> · {candidate.district}</small>}</p>
          <div className="candidate-tags">{candidate.addressMatch && <span className="tag positive">{candidate.addressMatch}</span>}{candidate.flags.map(flag => <span className="tag caution" key={flag}>{flag}</span>)}</div>
          {(shared.get(candidate.id)?.length ?? 0) > 1 && <p className="shared-note" title={shared.get(candidate.id)!.join('、')}>同一 POI 还出现在：{shared.get(candidate.id)!.filter(code => code !== record.code).slice(0, 4).join('、')}{shared.get(candidate.id)!.length > 5 ? `等 ${shared.get(candidate.id)!.length - 1} 项` : ''}</p>}
          <p className="candidate-category">{candidate.category.split(';').filter((text, i, all) => all.indexOf(text) === i).join(' / ')}</p>
          <div className="candidate-footer"><span>{candidate.distanceMetres === null ? '无距离参考' : `距旧参考点 ${candidate.distanceMetres.toLocaleString()} 米`}</span>
            <a href={amapUrl(candidate.id)} target="_blank" rel="noopener noreferrer">在高德地图查看 ↗</a></div>
          <code>{candidate.id}</code>
        </div>
      </div>)}
    </div>
    {!record.candidates.length && <p className="empty-candidates">当前没有可展示的候选，可以记录线索或标记暂缓。</p>}
    {record.candidates.length > 4 && <button type="button" className="expand-button" onClick={() => setExpanded(value => !value)}>{expanded ? '收起候选' : `展开全部 ${record.candidates.length} 个候选`}</button>}
    <div className="decision-panel">
      <label className="note-label" htmlFor={`note-${record.officialId}`}>复核备注 <span>可说明楼栋、入口、门牌差异或补充正确 POI</span></label>
      <textarea id={`note-${record.officialId}`} value={decision.note} maxLength={5000} rows={2} placeholder="例如：选中的是园区入口；保护建筑在院内，2号楼不对应。" onChange={event => update({ note: event.target.value })} />
      <div className="decision-actions"><span>{decision.selectedIds.length ? `已选 ${decision.selectedIds.length} 个候选` : '尚未选择候选'}</span>
        <div><button type="button" className="button primary" disabled={!decision.selectedIds.length} onClick={() => update({ verdict: 'confirmed' })}>确认所选{decision.selectedIds.length ? `（${decision.selectedIds.length}）` : ''}</button>
          <button type="button" className="button" onClick={() => update({ verdict: 'no-match', selectedIds: [] })}>均不匹配</button>
          <button type="button" className="button quiet" onClick={() => update({ verdict: 'deferred' })}>暂缓</button>
          {decision.verdict !== 'pending' && <button type="button" className="button quiet" onClick={() => update({ verdict: 'pending' })}>撤销结论</button>}</div>
      </div>
    </div>
  </article>
}

export function ReviewWorkspace({ dataset }: { dataset: Dataset }) {
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      const restored = raw ? importReview(raw, dataset) : { decisions: {}, skipped: 0 }
      return { decisions: restored.decisions, message: restored.skipped ? `已恢复进度；${restored.skipped} 条记录已不在当前待核列表或候选已更新，未覆盖当前结果。` : '', error: '' }
    } catch { return { decisions: {}, message: '', error: '无法读取本地进度。请导入已导出的备份；新操作仍可尝试保存。' } }
  })
  const [decisions, setDecisions] = useState<Decisions>(initial.decisions)
  const decisionsRef = useRef(decisions)
  const [notice, setNotice] = useState(initial.message)
  const [saveError, setSaveError] = useState(initial.error)
  const [query, setQuery] = useState(''), [district, setDistrict] = useState(''), [reason, setReason] = useState('')
  const [status, setStatus] = useState('open'), [page, setPage] = useState(1)
  const fileInput = useRef<HTMLInputElement>(null)
  const listTop = useRef<HTMLDivElement>(null)
  const counts = useMemo(() => ({ done: dataset.records.filter(record => completed(decisions[record.officialId])).length,
    confirmed: dataset.records.filter(record => decisions[record.officialId]?.verdict === 'confirmed').length,
    noMatch: dataset.records.filter(record => decisions[record.officialId]?.verdict === 'no-match').length,
    deferred: dataset.records.filter(record => decisions[record.officialId]?.verdict === 'deferred').length }), [dataset, decisions])
  const shared = useMemo(() => {
    const result = new Map<string, string[]>()
    for (const record of dataset.records) for (const candidate of record.candidates) result.set(candidate.id, [...(result.get(candidate.id) ?? []), record.code])
    return result
  }, [dataset])
  const filtered = useMemo(() => dataset.records.filter(record => {
    const decision = decisions[record.officialId], text = query.trim().toLocaleLowerCase()
    return (!district || record.district === district) && (!reason || record.reasonCode === reason)
      && (status === 'all' || status === 'open' && !completed(decision) || status === 'confirmed' && decision?.verdict === 'confirmed'
        || status === 'no-match' && decision?.verdict === 'no-match' || status === 'deferred' && decision?.verdict === 'deferred'
        || status === 'draft' && decision?.verdict === 'pending' && decision.selectedIds.length > 0)
      && (!text || [record.code, record.name, record.address, record.listedName, decision?.note ?? '',
        ...record.candidates.flatMap(candidate => [candidate.name, candidate.address, candidate.id])].join(' ').toLocaleLowerCase().includes(text))
  }), [dataset, decisions, query, district, reason, status])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), currentPage = Math.min(page, pages)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const save = (next: Decisions) => {
    decisionsRef.current = next
    setDecisions(next)
    try { localStorage.setItem(storageKey, JSON.stringify(exportReview(dataset, next))); setSaveError(''); setNotice('已自动保存在此浏览器') }
    catch { setSaveError('浏览器保存失败；当前操作还在页面内，请立即导出备份。') }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportReview(dataset, decisions), null, 2)], { type: 'application/json;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `历史建筑-高德复核-${new Date().toISOString().slice(0, 10)}.json`; anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice('已导出复核文件，可交给我回填到建筑卡片。')
  }
  const upload = async (file?: File) => {
    if (!file) return
    try {
      if (file.size > 10_000_000) throw Error('文件过大，请选择本页面导出的复核 JSON。')
      const imported = importReview(await file.text(), dataset)
      save({ ...decisionsRef.current, ...imported.decisions })
      setNotice(`已合并 ${Object.keys(imported.decisions).length} 项复核${imported.skipped ? `；${imported.skipped} 条旧记录未合并` : ''}。`)
    } catch (error) { setNotice(`导入失败：${error instanceof Error ? error.message : '无法读取文件'}`) }
    if (fileInput.current) fileInput.current.value = ''
  }
  const goPage = (next: number) => { setPage(next); listTop.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }
  return <div className="review-app">
    <header className="page-header"><a className="back-link" href="./">← 返回历史地图</a><div className="page-header-actions">
      <button type="button" className="button" onClick={() => fileInput.current?.click()}>导入进度</button>
      <input className="file-input" ref={fileInput} type="file" accept=".json,application/json" aria-label="导入复核 JSON" onChange={event => void upload(event.target.files?.[0])} />
      <button type="button" className="button primary" disabled={!Object.keys(decisions).length} onClick={download}>导出复核结果 ↓</button></div></header>
    <section className="intro"><p className="eyebrow">SHANGHAI · HERITAGE REVIEW</p><h1>给历史建筑，确认一个地点。</h1>
      <p>打开高德核对名称与门牌，勾选对应候选后确认。多个 POI 可同时保留，楼栋与入口的区别请写在备注里。</p>
      <p className="storage-hint">进度保存在当前浏览器。导出 JSON 可备份或交给我回填；此页的选择暂不改动地图卡片。</p></section>
    <div className="review-layout"><aside className="review-sidebar"><div className="progress-box"><p>本次待复核名录</p><div className="progress-number">{counts.done}<span> / {dataset.recordCount}</span></div><progress value={counts.done} max={dataset.recordCount} aria-label="已完成复核" />
      <div className="progress-breakdown"><span>已确认 <strong>{counts.confirmed}</strong></span><span>均不匹配 <strong>{counts.noMatch}</strong></span><span>暂缓 <strong>{counts.deferred}</strong></span></div></div>
      <div className="review-filters"><label>搜索建筑或 POI<input type="search" value={query} placeholder="名称、门牌、编号、POI ID" onChange={event => { setQuery(event.target.value); setPage(1) }} /></label>
        <label>复核进度<select value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}><option value="open">待完成</option><option value="all">全部</option><option value="draft">已选，待确认</option><option value="confirmed">已确认</option><option value="no-match">均不匹配</option><option value="deferred">暂缓</option></select></label>
        <label>所在区<select value={district} onChange={event => { setDistrict(event.target.value); setPage(1) }}><option value="">全部区</option>{[...new Set(dataset.records.map(record => record.district))].sort().map(value => <option key={value}>{value}</option>)}</select></label>
        <label>待核原因<select value={reason} onChange={event => { setReason(event.target.value); setPage(1) }}><option value="">全部原因</option>{Object.entries(reasonLabels).map(([value, label]) => <option value={value} key={value}>{label}（{dataset.records.filter(record => record.reasonCode === value).length}）</option>)}</select></label>
        <button className="reset-filters" type="button" onClick={() => { setQuery(''); setDistrict(''); setReason(''); setStatus('open'); setPage(1) }}>重置筛选</button></div>
      <p className="distance-hint">“距旧参考点”只供辅助，旧坐标可能有误。门牌相同也可能是不同楼栋，请以实际建筑为准。</p>
      <p className="data-time">候选快照：{new Date(dataset.updatedAt).toLocaleDateString('zh-CN')}<br />本页不发起付费查询</p></aside>
      <main className="review-list" ref={listTop}><div className="list-heading"><p>筛选结果 <strong>{filtered.length}</strong> 项</p><span>第 {currentPage} / {pages} 页</span></div>
        <div className="save-status" role="status">{saveError || notice || '尚未开始；勾选和备注会自动保存。'}</div>
        {saveError && <p className="save-error" role="alert">保存异常：请导出当前进度，避免丢失。</p>}
        {visible.map(record => <BuildingCard key={record.officialId} record={record} decision={decisions[record.officialId] ?? emptyDecision()} shared={shared}
          change={next => save({ ...decisionsRef.current, [record.officialId]: next })} />)}
        {!visible.length && <div className="empty-results"><h2>当前筛选下没有待复核项</h2><p>可切换复核进度或重置筛选，查看已确认的地点。</p></div>}
        <nav className="pagination" aria-label="复核列表分页"><button className="button" disabled={currentPage === 1} onClick={() => goPage(currentPage - 1)}>← 上一页</button><span>{currentPage} / {pages}</span><button className="button" disabled={currentPage === pages} onClick={() => goPage(currentPage + 1)}>下一页 →</button></nav>
      </main></div>
  </div>
}

export default function ReviewApp() {
  const [dataset, setDataset] = useState<Dataset>(), [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    fetch(assetUrl('data/heritage-poi-review.json'), { signal: controller.signal }).then(response => {
      if (!response.ok) throw Error('候选列表加载失败，请确认本地服务正在运行。')
      return response.json() as Promise<Dataset>
    }).then(data => {
      if (data.schemaVersion !== 1 || !Array.isArray(data.records) || data.recordCount !== data.records.length) throw Error('候选数据格式不正确。')
      setDataset(data)
    }).catch(error => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [])
  if (error) return <main className="loading-screen"><h1>暂时无法打开复核列表</h1><p>{error}</p><button className="button" onClick={() => window.location.reload()}>重新加载</button></main>
  return dataset ? <ReviewWorkspace dataset={dataset} /> : <main className="loading-screen" role="status">正在整理待复核建筑与高德候选……</main>
}
