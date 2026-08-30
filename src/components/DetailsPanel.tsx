import { ExternalLink, MapPin, X } from 'lucide-react'
import { getRoadEponym } from '../data/roadEponyms'
import type { HistoricalFeature, HistoricalRecord, SourceRecord } from '../types'

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

const currentUseRelationshipNames = {
  'same-building': '原建筑延续使用',
  'same-site-continuing-use': '原址与主体功能延续',
  'same-site-repurposed': '原址用途已变',
  'partial-remains-on-original-site': '原址仅存局部遗迹',
  'site-redeveloped': '原址已拆除或重新开发',
  'institutional-successor-relocated': '机构延续，但已迁离历史原址',
} as const

interface DetailsPanelProps {
  feature?: HistoricalFeature
  sources: SourceRecord[]
  onClose: () => void
}

function formatHistoricalPeriod(record: HistoricalRecord) {
  if (record.startYear !== undefined && record.endYear !== undefined) {
    return record.startYear === record.endYear
      ? `${record.startYear} 年`
      : `${record.startYear}–${record.endYear} 年`
  }
  if (record.startYear !== undefined) return `${record.startYear} 年起`
  if (record.endYear !== undefined) return `截至 ${record.endYear} 年`
  return '年代待考'
}

export function DetailsPanel({ feature, sources, onClose }: DetailsPanelProps) {
  if (!feature) return null
  const details = feature.properties
  const featureSources = [...new Set([
    ...details.sourceIds,
    details.currentUseSourceId,
  ].filter((id): id is string => Boolean(id)))]
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
          <dt>{details.kind === 'landmark' && !details.category.startsWith('现存')
            ? '历史中文标注'
            : '今日名称'}</dt>
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
          <dd>{details.labelYearIsFallback
            ? `年代待考（资料截止 ${details.labelYear} 年）`
            : details.labelYear === 1928 ? '1928 年' : `${details.labelYear} 年资料`}</dd>
        </div>
        {details.historicalUse && (
          <div>
            <dt>民国时期用途</dt>
            <dd>{historicalUseNames[details.historicalUse]}</dd>
          </div>
        )}
        {details.kind === 'landmark' && (
          <div>
            <dt>现在用途</dt>
            <dd>{details.currentUse ?? '暂未查到可靠对应'}</dd>
          </div>
        )}
        {details.currentNameZh && details.currentNameZh !== details.modernNameZh && (
          <div>
            <dt>{details.currentUseRelationship === 'institutional-successor-relocated'
              ? '后继机构'
              : '现址名称'}</dt>
            <dd>{details.currentNameZh}</dd>
          </div>
        )}
        {details.currentAddress && (
          <div>
            <dt>{details.currentUseRelationship === 'institutional-successor-relocated'
              ? '机构现址（非地图点）'
              : '当前地址'}</dt>
            <dd>{details.currentAddress}</dd>
          </div>
        )}
        {details.currentUseRelationship && (
          <div>
            <dt>与历史地点关系</dt>
            <dd>{currentUseRelationshipNames[details.currentUseRelationship]}</dd>
          </div>
        )}
        {details.currentUseNote && (
          <div>
            <dt>沿革备注</dt>
            <dd>{details.currentUseNote}</dd>
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

      {details.historicalRecords && details.historicalRecords.length > 0 && (
        <section className="details-sources details-historical-records" aria-labelledby="historical-records-title">
          <h3 id="historical-records-title">同址历史记录</h3>
          <dl className="details-list">
            {details.historicalRecords.map((record, index) => (
              <div
                className="details-list-wide"
                key={`${record.name}-${record.startYear ?? 'unknown'}-${record.endYear ?? 'unknown'}-${index}`}
              >
                <dt>{formatHistoricalPeriod(record)}</dt>
                <dd>
                  <strong>{record.name}</strong>
                  {record.nameZh && <><br />{record.nameZh}</>}
                  {record.category && <><br /><small>{record.category}</small></>}
                  {record.sourceRecordIds && record.sourceRecordIds.length > 0 && (
                    <><br /><small>Virtual Shanghai #{record.sourceRecordIds.join(' / #')}</small></>
                  )}
                  {record.sourceUrls && record.sourceUrls.length > 0 && (
                    <span className="details-historical-record-sources">
                      {record.sourceUrls.map((url, sourceIndex) => (
                        <a
                          key={url}
                          href={url.replace(/^http:/, 'https:')}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`${record.name}史料来源 ${sourceIndex + 1}`}
                        >
                          <span>史料来源 {sourceIndex + 1}</span>
                          <ExternalLink size={14} aria-hidden="true" />
                        </a>
                      ))}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {details.aliases && details.aliases.length > 0 && (
        <div className="details-aliases">
          <span>亦见</span>
          <p>{details.aliases.join(' · ')}</p>
        </div>
      )}

      <div className="details-sources">
        <h3>资料来源</h3>
        {featureSources.map((source) => (
          <a
            key={source.id}
            href={(details.sourceUrls?.[source.id] ?? (
              source.id === details.currentUseSourceId && details.currentUseSourceUri
                ? details.currentUseSourceUri
                : source.url
            )).replace(/^http:/, 'https:')}
            target="_blank"
            rel="noreferrer"
          >
            <span>
              {source.title}
              <small>{source.year} · {source.license}</small>
            </span>
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        ))}
        {(details.currentUseSources ?? [])
          .filter((item) => item.url !== details.currentUseSourceUri)
          .map((item, index) => (
            <a
              key={item.url}
              href={item.url.replace(/^http:/, 'https:')}
              target="_blank"
              rel="noreferrer"
            >
              <span>
                {item.title ?? `现址核查资料 ${index + 2}`}
                <small>地点级资料</small>
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
