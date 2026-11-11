import { useEffect, useRef, useState } from 'react'
import { Route, X } from 'lucide-react'
import { addRouteStop, appRouteLink, clearHeritageRoute, moveRouteStop, removeRouteStop, routeCoordinates, useHeritageRoute, webRouteLink, type RouteStop } from '../lib/heritageRoute'
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
      <Route size={13} aria-hidden="true" />{selected ? '已加入路线 ✓' : '添加到路线'}{choices.length > 1 ? ' ▾' : ''}
    </button>
    {open && <div className="route-add-options" aria-label="选择加入路线的地点">{choices.map(stop => <button key={`${stop.officialId}-${stop.poiid}`} type="button" onClick={() => add(stop)}>
      <strong>{stop.name}</strong><span>{stop.poiName} · {stop.address}</span>
    </button>)}</div>}
  </div>
}

export function HeritageRouteButton() {
  const { items, error } = useHeritageRoute()
  const [open, setOpen] = useState(false), [mode, setMode] = useState<'walk' | 'car'>('walk')
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (open) { dialog.current?.showModal(); return () => { if (dialog.current?.open) dialog.current.close() } } }, [open])
  const ready = items.length >= 2 && items.every(item => routeCoordinates(item))
  const completeWeb = ready ? webRouteLink(items, mode) : null
  return <>
    <button type="button" className="sources-button route-top-button" onClick={() => setOpen(true)} aria-haspopup="dialog"><Route size={16} aria-hidden="true" /><span>选中建筑（{items.length}）</span></button>
    {open && <dialog ref={dialog} className="heritage-route-dialog" aria-labelledby="heritage-route-title" onClose={() => setOpen(false)}>
      <button type="button" className="icon-button route-dialog-close" aria-label="关闭选中建筑" onClick={() => setOpen(false)}><X size={18} /></button>
      <h2 id="heritage-route-title">选中建筑 <small>{items.length}</small></h2>
      <p>按列表顺序游览，第一站为起点、最后一站为终点。可调整顺序，路线自动保存在当前浏览器。</p>
      {error && <p role="alert">{error}</p>}
      {!items.length ? <p className="route-empty">尚未添加建筑。在建筑卡片的高德链接旁点击“添加到路线”。有多个地点时，先展开选项再添加。</p> : <>
        <ol className="heritage-route-stops">{items.map((stop, index) => <li key={stop.officialId}>
          <span className="route-stop-number">{index + 1}</span><div className="route-stop-info"><strong>{stop.name}</strong>
            <a href={amapUrl(stop.poiid)} target="_blank" rel="noopener noreferrer">{stop.poiName}</a><small>{stop.address}</small>
            {stop.referenceNote && <small>{stop.referenceNote}</small>}{!routeCoordinates(stop) && <small className="route-warning">此 POI 缺少高德坐标，暂不能用于算路。</small>}
          </div><div className="route-stop-actions"><button type="button" disabled={index === 0} aria-label={`上移${stop.name}`} onClick={() => moveRouteStop(stop.officialId, -1)}>↑</button>
            <button type="button" disabled={index === items.length - 1} aria-label={`下移${stop.name}`} onClick={() => moveRouteStop(stop.officialId, 1)}>↓</button>
            <button type="button" aria-label={`移除${stop.name}`} onClick={() => removeRouteStop(stop.officialId)}>移除</button></div>
        </li>)}</ol>
        <div className="route-planning"><label>出行方式 <select value={mode} onChange={event => setMode(event.target.value as 'walk' | 'car')}><option value="walk">步行</option><option value="car">驾车</option></select></label>
          <button type="button" onClick={clearHeritageRoute}>清空路线</button></div>
        {items.length < 2 && <p>再添加一处建筑，即可生成路线。</p>}
        {ready && <div className="route-generated"><h3>高德路线</h3>
          {completeWeb && <a className="route-primary" href={completeWeb} target="_blank" rel="noopener noreferrer">在高德打开整条路线 ↗</a>}
          <div className="route-app-links"><a href={appRouteLink(items, mode, 'ios')!}>iPhone 高德整条路线 ↗</a><a href={appRouteLink(items, mode, 'android')!}>Android 高德整条路线 ↗</a></div>
          <p>手机整条路线需安装高德。网页多途经点有限，可按下面顺序逐段打开，所有建筑均保留。</p>
          <ol>{items.slice(1).map((stop, index) => <li key={stop.officialId}><a href={webRouteLink([items[index], stop], mode)!} target="_blank" rel="noopener noreferrer">{items[index].name} → {stop.name} ↗</a></li>)}</ol>
        </div>}
      </>}
    </dialog>}
  </>
}
