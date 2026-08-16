import { TrainFront, X } from 'lucide-react'
import type { MetroStationSelection } from '../lib/metroLabels'

interface MetroDetailsPanelProps {
  station?: MetroStationSelection
  onClose: () => void
}

export function MetroDetailsPanel({ station, onClose }: MetroDetailsPanelProps) {
  if (!station) return null

  return (
    <aside className="details-panel" aria-label={`${station.historicalName}地铁站详情`}>
      <div className="details-grip" aria-hidden="true" />
      <button type="button" className="icon-button details-close" onClick={onClose} aria-label="关闭详情">
        <X size={18} aria-hidden="true" />
      </button>

      <div className="details-kicker">
        <TrainFront size={14} aria-hidden="true" />
        <span>地铁站</span>
        <span aria-hidden="true">·</span>
        <span>现代空间参照</span>
      </div>
      <h2>{station.historicalName}</h2>

      <dl className="details-list">
        <div>
          <dt>今日站名</dt>
          <dd>{station.modernName}</dd>
        </div>
        <div>
          <dt>名称性质</dt>
          <dd>民国地名推定</dd>
        </div>
        <div className="details-list-wide">
          <dt>推定依据</dt>
          <dd>
            {station.basis === 'historical-match'
              ? '沿用同名道路或地标的民国旧名'
              : '依据车站所在位置的民国时期地名'}
          </dd>
        </div>
      </dl>

      <p className="details-note">
        该名称不是历史上真实运营过的站名；线路与站点采用现代上海地铁作为空间参照。
      </p>
    </aside>
  )
}
