import { ExternalLink, MapPin, X } from 'lucide-react'
import { getRoadEponym } from '../data/roadEponyms'
import type { HistoricalFeature, SourceRecord } from '../types'

const jurisdictions = { 'french-concession': 'French Quarter', 'international-settlement': 'Commerce District',
  'old-city': 'Old City', 'chinese-administered': 'Chinese-administered Area' }
const naming = { translated: '历史中文名的英文转写 / 翻译', 'proposed-road': '借相邻民国道路名拟定',
  'proposed-district': '借民国时期片区名拟定', 'proposed-site': '借原址历史名称拟定' }

export function RoadDetailsPanel({ feature, sources, onClose }: { feature: HistoricalFeature; sources: SourceRecord[]; onClose: () => void }) {
  const p = feature.properties
  const person = getRoadEponym(p.historicalName)
  const featureSources = [...new Set(p.sourceIds)].map(id => sources.find(source => source.id === id))
    .filter((source): source is SourceRecord => Boolean(source))
  return <aside className="details-panel" aria-label={`${p.historicalName}详情`}>
    <div className="details-grip" aria-hidden="true" />
    <button type="button" className="icon-button details-close" onClick={onClose} aria-label="关闭详情"><X size={18} aria-hidden="true" /></button>
    <div className="details-kicker"><MapPin size={14} aria-hidden="true" /><span>{p.category}</span><span>·</span><span>{jurisdictions[p.jurisdiction]}</span></div>
    <h2>{p.historicalName}</h2>
    {p.historicalChinese && <p className="details-historical-chinese">{p.historicalChinese}</p>}
    <dl className="details-list">
      <div><dt>今日名称</dt><dd>{p.modernNameZh}</dd></div>
      {p.modernNameEn && <div><dt>现代转写</dt><dd>{p.modernNameEn}</dd></div>}
      <div><dt>名称年代</dt><dd>{p.labelYearIsFallback ? `年代待考（资料截止 ${p.labelYear} 年）` : p.labelYear === 1928 ? '1928 年' : `${p.labelYear} 年资料`}</dd></div>
      {p.namingBasis && <div><dt>命名依据</dt><dd>{naming[p.namingBasis]}</dd></div>}
      <div><dt>地图语言</dt><dd>{p.namingBasis?.startsWith('proposed-') ? p.language === 'fr' ? '法语拟名' : '英文拟名'
        : p.namingBasis === 'translated' ? '英文转写' : p.language === 'fr' ? '法语原名' : p.language === 'en' ? '英文原名'
          : p.language === 'wuu' ? '老派沪语拼音（无声调）' : '当时中文名'}</dd></div>
    </dl>
    {!!p.aliases?.length && <div className="details-aliases"><span>亦见</span><p>{p.aliases.join(' · ')}</p></div>}
    <div className="details-sources"><h3>资料来源</h3>
      {featureSources.map(source => <a key={source.id} href={(p.sourceUrls?.[source.id] || source.url).replace(/^http:/, 'https:')} target="_blank" rel="noreferrer">
        <span>{source.title}<small>{source.year} · {source.license}</small></span><ExternalLink size={14} aria-hidden="true" />
      </a>)}
      {person && <div className="details-person" aria-label="路名人物"><h4>路名人物</h4>
        <a href={person.url} target="_blank" rel="noreferrer"><span><strong>{person.name}</strong>
          <span className="details-person-summary">{person.summary}</span><small>{person.sourceLabel}</small></span><ExternalLink size={14} aria-hidden="true" /></a>
      </div>}
    </div>
  </aside>
}
