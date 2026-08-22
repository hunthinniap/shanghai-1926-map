import { ExternalLink, MapPin, X } from 'lucide-react'
import { getRoadEponym } from '../data/roadEponyms'
import type { HistoricalFeature, SourceRecord } from '../types'

const jurisdictionNames = {
  'french-concession': 'French Quarter',
  'international-settlement': 'Commerce District',
  'old-city': 'Old City',
  'chinese-administered': 'Chinese-administered Area',
} as const

const historicalUseNames = {
  park: '公共公园',
  garden: '园林 / 私家花园',
  cemetery: '墓园',
  racecourse: '跑马场',
  industrial: '工业设施',
  military: '军事设施',
  recreation: '体育 / 娱乐设施',
  school: '学校用地',
  aerodrome: '机场 / 跑道',
} as const

const namingBasisNames = {
  translated: '历史中文名的英文转写 / 翻译',
  'proposed-road': '借相邻民国道路名拟定',
  'proposed-district': '借民国时期片区名拟定',
  'proposed-site': '借原址历史名称拟定',
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
        {details.historicalUse && (
          <div>
            <dt>民国时期用途</dt>
            <dd>{historicalUseNames[details.historicalUse]}</dd>
          </div>
        )}
        {details.namingBasis && (
          <div>
            <dt>命名依据</dt>
            <dd>{namingBasisNames[details.namingBasis]}</dd>
          </div>
        )}
        <div>
          <dt>地图语言</dt>
          <dd>{details.namingBasis?.startsWith('proposed-')
            ? details.language === 'fr' ? '法语拟名' : '英文拟名'
            : details.namingBasis === 'translated'
              ? '英文转写'
              : details.language === 'fr'
                ? '法语原名'
                : details.language === 'en'
                  ? '英文原名'
                  : details.language === 'wuu'
                    ? '老派沪语拼音（无声调）'
                    : '当时中文名'}</dd>
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
