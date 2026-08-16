import { ExternalLink, MapPin, X } from 'lucide-react'
import { getRoadEponym } from '../data/roadEponyms'
import type { HistoricalFeature, SourceRecord } from '../types'

const jurisdictionNames = {
  'french-concession': '法租界',
  'international-settlement': '公共租界',
  'chinese-administered': '华界',
} as const

interface DetailsPanelProps {
  feature?: HistoricalFeature
  sources: SourceRecord[]
  onClose: () => void
}

export function DetailsPanel({ feature, sources, onClose }: DetailsPanelProps) {
  if (!feature) return null
  const details = feature.properties
  const featureSources = details.sourceIds
    .map((id) => sources.find((source) => source.id === id))
    .filter((source): source is SourceRecord => Boolean(source))
  const roadEponym = details.kind === 'road'
    ? getRoadEponym(details.historicalName)
    : undefined

  return (
    <aside className="details-panel" aria-label={`${details.historicalName}详情`}>
      <div className="details-grip" aria-hidden="true" />
      <button type="button" className="icon-button details-close" onClick={onClose} aria-label="关闭详情">
        <X size={18} aria-hidden="true" />
      </button>

      <div className="details-kicker">
        <MapPin size={14} aria-hidden="true" />
        <span>{details.category}</span>
        <span aria-hidden="true">·</span>
        <span>{jurisdictionNames[details.jurisdiction]}</span>
      </div>
      <h2>{details.historicalName}</h2>
      {details.historicalChinese && <p className="details-historical-chinese">{details.historicalChinese}</p>}

      <dl className="details-list">
        <div>
          <dt>今日名称</dt>
          <dd>{details.modernNameZh}</dd>
        </div>
        {details.modernNameEn && (
          <div>
            <dt>现代转写</dt>
            <dd>{details.modernNameEn}</dd>
          </div>
        )}
        <div>
          <dt>名称年代</dt>
          <dd>{details.labelYear === 1928 ? '1928 年' : `${details.labelYear} 年资料`}</dd>
        </div>
        <div>
          <dt>地图语言</dt>
          <dd>{details.language === 'fr' ? '法语原名' : details.language === 'en' ? '英文原名' : '当时中文名'}</dd>
        </div>
      </dl>

      {details.aliases && details.aliases.length > 0 && (
        <div className="details-aliases">
          <span>亦见</span>
          <p>{details.aliases.join(' · ')}</p>
        </div>
      )}

      <div className="details-sources">
        <h3>史料来源</h3>
        {featureSources.map((source) => (
          <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
            <span>
              {source.title}
              <small>{source.year} · {source.license}</small>
            </span>
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        ))}
        {roadEponym && (
          <div className="details-person" aria-label="路名人物">
            <h4>路名人物</h4>
            <a href={roadEponym.url} target="_blank" rel="noreferrer">
              <span>
                <strong>{roadEponym.name}</strong>
                <span className="details-person-summary">{roadEponym.summary}</span>
                <small>{roadEponym.sourceLabel}</small>
              </span>
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </aside>
  )
}
