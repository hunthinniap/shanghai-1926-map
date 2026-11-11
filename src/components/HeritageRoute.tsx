import { useEffect, useRef, useState } from 'react'
import { ListPlus, X } from 'lucide-react'
import { addRouteStop, amapListGroups, clearHeritageRoute, moveRouteStop, removeRouteStop, useHeritageRoute, type RouteStop } from '../lib/heritageRoute'
import { amapUrl } from '../poi-review/model'
import './HeritageRoute.css'

export function RouteAddButton({ choices }: { choices: RouteStop[] }) {
  const { items } = useHeritageRoute()
  const [open, setOpen] = useState(false)
  const selected = choices.length === 1 && items.some(item => item.officialId === choices[0].officialId && item.poiid === choices[0].poiid)
  const add = (stop: RouteStop) => { addRouteStop(stop); setOpen(false) }
  if (!choices.length) return null
  return <div className="route-add-control">
    <button type="button" aria-expanded={choices.length > 1 ? open : undefined} onClick={() => choices.length === 1 ? add(choices[0]) : setOpen(value => !value)}>
      <ListPlus size={13} aria-hidden="true" />{selected ? '已加入清单 ✓' : '添加到清单'}{choices.length > 1 ? ' ▾' : ''}
    </button>
    {open && <div className="route-add-options" aria-label="选择加入清单的地点">{choices.map(stop => <button key={`${stop.officialId}-${stop.poiid}`} type="button" onClick={() => add(stop)}>
      <strong>{stop.name}</strong><span>{stop.poiName} · {stop.address}</span>
    </button>)}</div>}
  </div>
}

export function HeritageRouteButton() {
  const { items, error } = useHeritageRoute()
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (open) { dialog.current?.showModal(); return () => { if (dialog.current?.open) dialog.current.close() } } }, [open])
  const groups = amapListGroups(items)
  const pointCount = groups.reduce((count, group) => count + group.ids.length, 0)
  return <>
    <button type="button" className="sources-button route-top-button" onClick={() => setOpen(true)} aria-haspopup="dialog"><ListPlus size={16} aria-hidden="true" /><span>选中建筑（{items.length}）</span></button>
    {open && <dialog ref={dialog} className="heritage-route-dialog" aria-labelledby="heritage-route-title" onClose={() => setOpen(false)}>
      <button type="button" className="icon-button route-dialog-close" aria-label="关闭选中建筑" onClick={() => setOpen(false)}><X size={18} /></button>
      <h2 id="heritage-route-title">选中建筑 <small>{items.length}</small></h2>
      <p>把想看的建筑放进清单，再一起在高德地图上查看。清单自动保存在当前浏览器。</p>
      {error && <p role="alert">{error}</p>}
      {!items.length ? <p className="route-empty">尚未添加建筑。在建筑卡片的高德链接旁点击“添加到清单”。有多个地点时，先展开选项再添加。</p> : <>
        <ol className="heritage-route-stops">{items.map((stop, index) => <li key={stop.officialId}>
          <span className="route-stop-number">{index + 1}</span><div className="route-stop-info"><strong>{stop.name}</strong>
            <a href={amapUrl(stop.poiid)} target="_blank" rel="noopener noreferrer">{stop.poiName}</a><small>{stop.address}</small>
            {stop.referenceNote && <small>{stop.referenceNote}</small>}
          </div><div className="route-stop-actions"><button type="button" disabled={index === 0} aria-label={`上移${stop.name}`} onClick={() => moveRouteStop(stop.officialId, -1)}>↑</button>
            <button type="button" disabled={index === items.length - 1} aria-label={`下移${stop.name}`} onClick={() => moveRouteStop(stop.officialId, 1)}>↓</button>
            <button type="button" aria-label={`移除${stop.name}`} onClick={() => removeRouteStop(stop.officialId)}>移除</button></div>
        </li>)}</ol>
        <div className="route-planning"><span>已选 {items.length} 栋建筑 · {pointCount} 个高德地点</span>
          <button type="button" onClick={clearHeritageRoute}>清空清单</button></div>
        <div className="collection-map-links">
          {groups.length === 1 ? <a className="route-primary" href={groups[0].url} target="_blank" rel="noopener noreferrer">在高德查看全部地点 ↗</a> : <>
            <h3>在高德查看全部地点</h3>
            <p>高德每个链接最多展示 10 个地点，已分成 {groups.length} 组，所有地点均已保留。</p>
            {groups.map((group, index) => <a className="route-primary" key={group.url} href={group.url} target="_blank" rel="noopener noreferrer">在高德查看第 {index + 1} 组（{group.ids.length} 个地点） ↗</a>)}
          </>}
          {pointCount < items.length && <p>对应同一个高德地点的建筑会合并标注，建筑清单仍完整保留。</p>}
          <p>在高德地图中一起标注这些地点，不会自动存入高德账号的收藏夹。</p>
        </div>
      </>}
    </dialog>}
  </>
}
