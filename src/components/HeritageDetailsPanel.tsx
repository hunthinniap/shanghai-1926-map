import { ExternalLink, Landmark, X } from 'lucide-react'
import { getHeritageBuildingName, type HeritageBuildingFeature } from '../lib/heritageBuildings'
import type { LinkedHeritageBuilding } from '../lib/heritageLandmarkLinks'
import type { HistoricalRecord } from '../types'
import { heritageUseLabel, heritageUseStatusLabels } from '../lib/heritageUses'
import { AddressUseEvidencePanel } from './AddressUseEvidencePanel'

interface HeritageDetailsPanelProps {
  feature?: HeritageBuildingFeature
  linked?: LinkedHeritageBuilding
  onClose: () => void
}

const currentUseRelationships = {
  'same-building': '原建筑延续使用',
  'same-site-continuing-use': '原址与主体功能延续',
  'same-site-repurposed': '原址用途已变',
  'partial-remains-on-original-site': '原址仅存局部遗迹',
  'site-redeveloped': '原址已拆除或重新开发',
  'institutional-successor-relocated': '机构延续，但已迁离历史原址',
} as const

function historicalPeriod(record: HistoricalRecord) {
  if (record.startYear !== undefined && record.endYear !== undefined) {
    return record.startYear === record.endYear
      ? `${record.startYear} 年`
      : `${record.startYear}–${record.endYear} 年`
  }
  if (record.startYear !== undefined) return `${record.startYear} 年起`
  if (record.endYear !== undefined) return `截至 ${record.endYear} 年`
  return '年代待考'
}

export function HeritageDetailsPanel({ feature, linked, onClose }: HeritageDetailsPanelProps) {
  if (!feature) return null

  const details = feature.properties
  const heritageEntries = linked?.heritages?.length ? linked.heritages : [feature]
  const heritageDetails = heritageEntries.map((entry) => entry.properties)
  const historical = linked?.landmark.properties
  const aliases = [...new Set([...(historical?.aliases ?? []), ...(linked?.link.aliases ?? [])])]
  const name = getHeritageBuildingName(details)
  const hasDifferentAddress = details.wikipediaAddress
    && details.wikipediaAddress !== details.address
    && details.addressComparison !== 'exact'
  const isAddressReference = details.coordinateScope === 'address-reference-point'
  const locationLabel = isAddressReference
    ? '门牌参考点'
    : details.coordinateScope === 'building-complex-reference-point' ? '建筑群参考位置' : '建筑参考位置'
  const locationNote = details.locationNote || (isAddressReference
    ? '点位根据来源记载的门牌匹配，供查找位置参考，不代表建筑边界。'
    : '点位来自建筑条目资料，供查找位置参考，不代表建筑边界。')
  const sourceLinks = [
    ...heritageDetails.flatMap((entry) => {
      const entryIsLibrary = entry.origin === 'shanghai-library'
      const entryArticleHasCoordinates = !entryIsLibrary && entry.sourceUrl === entry.wikipediaUrl
      return [{
        url: entry.officialSourceUrl,
        title: `上海市优秀历史建筑名录 · ${entry.officialCodeRaw}`,
        note: '上海市房屋管理局 · 公布时名称与地址',
      }, {
        url: entry.wikipediaListUrl,
        title: '维基百科 · 优秀历史建筑列表',
        note: '地址与建筑资料 · CC BY-SA 4.0',
      }, {
        url: entry.wikipediaUrl,
        title: entry.articleTitle,
        note: `${entryArticleHasCoordinates ? '建筑条目与坐标来源' : '建筑条目'} · CC BY-SA 4.0`,
      }, ...(!entryArticleHasCoordinates ? [{
        url: entry.sourceUrl,
        title: entry.coordinateSourceTitle || (entryIsLibrary
          ? '上海图书馆 · 坐标来源'
          : entry.origin === 'wikidata-P625' ? 'Wikidata · 坐标来源' : '坐标来源'),
        note: entryIsLibrary
          ? '门址与参考坐标 · 上海图书馆开放数据'
          : entry.origin === 'wikidata-P625' ? `${entry.wikidataId ?? ''} · CC0` : locationLabel,
      }] : [])]
    }),
    ...heritageDetails.flatMap((entry) => (entry.historicalUse?.sources ?? []).map((url) => ({
      url, title: `${entry.officialCodeRaw} · 历史用途依据`, note: '原用途与改用阶段的分类依据',
    }))),
    ...Object.entries(historical?.sourceUrls ?? {}).map(([sourceId, url]) => ({
      url,
      title: sourceId === 'vs-buildings' ? 'Virtual Shanghai · 历史建筑' : '历史资料',
      note: '历史名称与建筑记录',
    })),
    ...(linked?.link.sources ?? []).map((source) => ({
      url: source.url,
      title: source.title || '建筑沿革资料',
      note: '名称与地址沿革',
    })),
    ...(linked?.link.modernAddress ? [{
      url: linked.link.modernAddress.sourceUrl,
      title: linked.link.modernAddress.title,
      note: '新地点地址核对来源',
    }] : []),
    ...(linked?.landmarks ?? []).flatMap((landmark) => Object.values(landmark.properties.sourceUrls ?? {})
      .map((url) => ({ url, title: 'Virtual Shanghai · 历史地点记录', note: landmark.properties.historicalName }))),
    ...(historical?.currentUseSourceUri ? [{
      url: historical.currentUseSourceUri,
      title: historical.currentUseSourceId === 'sh-library-excellent-historical-buildings'
        ? '上海图书馆 · 用途资料' : '用途资料来源',
      note: '用途记载以该来源为准',
    }] : []),
    ...(historical?.currentUseSources ?? []).map((source) => ({
      url: source.url,
      title: source.title || '用途资料来源',
      note: '用途与沿革记载',
    })),
    ...(linked?.landmarks ?? []).slice(1).flatMap(({ properties }) => [
      ...(properties.currentUseSources ?? []).map((source) => ({
        url: source.url, title: source.title || '用途资料来源', note: properties.historicalName,
      })),
      ...(properties.currentUseSourceUri ? [{
        url: properties.currentUseSourceUri, title: '用途资料来源', note: properties.historicalName,
      }] : []),
    ]),
  ].filter((source, index, sources) => source.url
    && sources.findIndex((item) => item.url === source.url) === index)

  const hasNearbyResidentialContext = linked?.link.nearbyResidentialContext
    || linked?.link.relation === 'nearby-residential-context'
  return (
    <aside className="details-panel heritage-details-panel" aria-label={`${name}历史建筑详情`}>
      <div className="details-grip" aria-hidden="true" />
      <button type="button" className="icon-button details-close" onClick={onClose} aria-label="关闭详情">
        <X size={18} aria-hidden="true" />
      </button>

      <div className="details-kicker">
        <Landmark size={14} aria-hidden="true" />
        {historical && <><span>{historical.category}</span><span aria-hidden="true">·</span></>}
        <span>优秀历史建筑</span>
        <span aria-hidden="true">·</span>
        <span>第 {details.batch} 批</span>
      </div>
      <h2>{name}</h2>
      {historical && historical.historicalName !== name && (
        <p className="details-historical-chinese">{historical.historicalName}</p>
      )}
      <dl className="details-list heritage-address-summary">
        <div className="details-list-wide">
          <dt>所在地址</dt>
          <dd><strong>{linked?.link.modernAddress?.address
            || [...new Set(heritageDetails.map((entry) => entry.address).filter(Boolean))].join('；')
            || '未记载'}</strong></dd>
        </div>
      </dl>

      <dl className="details-list">
        {heritageDetails.filter(entry => entry.historicalUse).map(entry => {
          const use = entry.historicalUse!
          return <div className="details-list-wide" key={`historical-use-${entry.officialId}`}>
            <dt>{heritageDetails.length > 1 ? `${entry.officialCodeRaw} 历史用途` : '历史用途'}</dt>
            <dd>
              <strong>{use.category ? heritageUseLabel(use.category) : '待核'}</strong>
              {use.historicalName && <><br />{use.historicalName}</>}
              {use.categories.length > 1 && <><br /><small>其他历史功能：{use.categories.filter(c => c !== use.category).map(heritageUseLabel).join('、')}</small></>}
              <br /><small>{heritageUseStatusLabels[use.status]} · {use.note}</small>
            </dd>
          </div>
        })}
        <div>
          <dt>名录编号</dt>
          <dd>{heritageDetails.map((entry) => entry.officialCodeRaw).join(' / ')}</dd>
        </div>
        {linked?.link.relation && (linked.link.scopeNote || linked.link.relation !== 'same-listed-building') && (
          <div className="details-list-wide">
            <dt>对应范围</dt>
            <dd>{hasNearbyResidentialContext
              ? linked.link.relation === 'nearby-residential-context'
                ? '同路段邻近住宅归并（非同栋核定）'
                : '已核定对象及同路段邻近住宅记录'
              : linked.link.relation === 'nearby-campus-context'
              ? '相邻校址归并（非同校、同楼核定）'
              : linked.link.relation === 'same-listed-complex'
              ? '同一名录建筑群／园区'
              : linked.link.relation === 'component-of-listed-complex' ? '名录建筑群中的一栋／局部使用'
              : linked.link.relation === 'same-historical-site' ? '同一地点的不同历史阶段'
              : linked.link.relation === 'same-listed-structure' ? '同一名录构筑物' : '同一名录建筑'}
              {linked.link.scopeNote && <><br /><small>{linked.link.scopeNote}</small></>}
            </dd>
          </div>
        )}
        {details.district && (
          <div>
            <dt>名录所在区</dt>
            <dd>{details.district}</dd>
          </div>
        )}
        {linked?.link.historicalAddresses.map((address) => (
          <div className="details-list-wide" key={`${address.sourceRecordId}-${address.address}`}>
            <dt>旧地点地址</dt>
            <dd>
              {address.address}
              <span className="details-historical-record-sources">
                <a href={address.sourceUrl.replace(/^http:/, 'https:')} target="_blank" rel="noreferrer">
                  Virtual Shanghai #{address.sourceRecordId}
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              </span>
            </dd>
          </div>
        ))}
        {linked?.link.modernAddress && linked.link.modernAddress.address !== details.address && (
          <div className="details-list-wide"><dt>名录登记地址范围</dt><dd>{details.address}</dd></div>
        )}
        {hasDifferentAddress && (
          <div className="details-list-wide">
            <dt>维基列表记载地址</dt>
            <dd>{details.wikipediaAddress}</dd>
          </div>
        )}
        {details.sourceAddress && (
          <div className="details-list-wide">
            <dt>坐标来源记载门址</dt>
            <dd>{details.sourceAddress}</dd>
          </div>
        )}
        {details.officialName && (
          <div className="details-list-wide">
            <dt>原名称／原使用单位</dt>
            <dd>{details.officialName}</dd>
          </div>
        )}
        {details.listedName && (
          <div className="details-list-wide">
            <dt>公布时名称／使用单位</dt>
            <dd>{details.listedName}</dd>
          </div>
        )}
        {details.constructionDate && (
          <div>
            <dt>{historical ? '名录建造年代' : '建造年代'}</dt>
            <dd>{details.constructionDate}</dd>
          </div>
        )}
        {details.floors && (
          <div>
            <dt>层数</dt>
            <dd>{details.floors}</dd>
          </div>
        )}
        {details.structure && (
          <div className="details-list-wide">
            <dt>原结构类型</dt>
            <dd>{details.structure}</dd>
          </div>
        )}
        {details.designer && (
          <div className="details-list-wide">
            <dt>设计者／施工者</dt>
            <dd>{details.designer}</dd>
          </div>
        )}
      </dl>

      {historical && (
        <section className="details-sources details-historical-records" aria-labelledby="heritage-historical-records-title">
          <h3 id="heritage-historical-records-title">历史资料</h3>
          <dl className="details-list">
            <div className="details-list-wide">
              <dt>历史资料年代</dt>
              <dd>{historical.labelYearIsFallback
                ? `年代待考（资料截止 ${historical.labelYear} 年）`
                : `${historical.labelYear} 年资料`}</dd>
            </div>
            {(historical.historicalChinese || historical.modernNameZh) && (
              <div className="details-list-wide">
                <dt>历史中文标注</dt>
                <dd>{historical.historicalChinese || historical.modernNameZh}</dd>
              </div>
            )}
            {!!historical.sourceRecordIds?.length && (
              <div className="details-list-wide">
                <dt>历史建筑记录</dt>
                <dd>Virtual Shanghai #{historical.sourceRecordIds.join(' / #')}</dd>
              </div>
            )}
            {!!historical.sourceParkRecordIds?.length && (
              <div className="details-list-wide">
                <dt>历史园林记录</dt>
                <dd>Virtual Shanghai #{historical.sourceParkRecordIds.join(' / #')}</dd>
              </div>
            )}
            {(historical.historicalRecords ?? []).map((record, index) => (
              <div className="details-list-wide" key={`${record.name}-${index}`}>
                <dt>{historicalPeriod(record)}</dt>
                <dd>
                  <strong>{record.name}</strong>
                  {record.nameZh && <><br />{record.nameZh}</>}
                  {record.category && <><br /><small>{record.category}</small></>}
                  {!!record.sourceRecordIds?.length && (
                    <><br /><small>Virtual Shanghai #{record.sourceRecordIds.join(' / #')}</small></>
                  )}
                  {!!record.sourceUrls?.length && (
                    <span className="details-historical-record-sources">
                      {record.sourceUrls.map((url, sourceIndex) => (
                        <a key={url} href={url.replace(/^http:/, 'https:')} target="_blank" rel="noreferrer"
                          aria-label={`${record.name}史料来源 ${sourceIndex + 1}`}>
                          史料来源 {sourceIndex + 1}<ExternalLink size={12} aria-hidden="true" />
                        </a>
                      ))}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {!!aliases.length && (
            <div className="details-aliases"><span>亦见</span><p>{aliases.join(' · ')}</p></div>
          )}
        </section>
      )}

      {historical && (
        <section className="details-sources" aria-labelledby="heritage-current-use-title">
          <h3 id="heritage-current-use-title">用途与沿革资料</h3>
          {(linked?.link.relation === 'same-historical-site' || linked?.link.relation === 'component-of-listed-complex'
            || linked?.link.relation === 'nearby-campus-context'
            || hasNearbyResidentialContext) && (
            <p className="details-aliases">{linked.link.scopeNote || '旧地点与现存历史建筑共用位置；各时期的建筑、机构与用途分别记载。'}</p>
          )}
          <dl className="details-list">
            {!historical.addressUseEvidence?.length && <div className="details-list-wide">
              <dt>{(linked?.landmarks?.length ?? 0) > 1 || linked?.link.relation === 'component-of-listed-complex'
                ? `${historical.historicalName} · 现用资料记载` : '现用资料记载'}</dt>
              <dd>{historical.currentUse || '暂未查到可靠对应'}</dd>
            </div>}
            {historical.currentNameZh && (
              <div className="details-list-wide">
                <dt>{historical.currentUseRelationship === 'institutional-successor-relocated' ? '后继机构' : '用途资料中的名称'}</dt>
                <dd>{historical.currentNameZh}</dd>
              </div>
            )}
            {historical.currentAddress && (
              <div className="details-list-wide">
                <dt>{historical.currentUseRelationship === 'institutional-successor-relocated' ? '机构现址（非历史原址）' : '用途资料中的地址'}</dt>
                <dd>{historical.currentAddress}</dd>
              </div>
            )}
            {historical.currentUseRelationship && linked?.link.relation !== 'same-historical-site' && (
              <div className="details-list-wide">
                <dt>与历史地点的关系</dt>
                <dd>{currentUseRelationships[historical.currentUseRelationship]}</dd>
              </div>
            )}
            {historical.currentUseNote && (
              <div className="details-list-wide"><dt>沿革备注</dt><dd>{historical.currentUseNote}</dd></div>
            )}
          </dl>
          <AddressUseEvidencePanel evidence={historical.addressUseEvidence} />
          {(linked?.landmarks ?? []).slice(1).map((landmark) => (
            <div className="details-aliases" key={landmark.properties.id}>
              <span>{landmark.properties.historicalName}</span>
              <p>{landmark.properties.currentUse || (!landmark.properties.addressUseEvidence?.length && '此历史记录的现用途尚待核实。')}
                {landmark.properties.currentNameZh && <><br />{landmark.properties.currentNameZh}</>}
                {landmark.properties.currentAddress && <><br />{landmark.properties.currentAddress}</>}
                {landmark.properties.currentUseNote && <><br />{landmark.properties.currentUseNote}</>}
              </p>
              <AddressUseEvidencePanel evidence={landmark.properties.addressUseEvidence} />
            </div>
          ))}
          {linked?.link.note && <div className="details-aliases"><span>名称与地址沿革</span><p>{linked.link.note}</p></div>}
        </section>
      )}

      {details.coordinateScope !== 'building-complex-reference-point' && (
        <div className="details-aliases">
          <span>{historical ? '地图位置 · 优秀历史建筑参考点' : locationLabel}</span>
          <p>{locationNote}</p>
        </div>
      )}

      <div className="details-sources">
        <h3>资料来源</h3>
        {sourceLinks.map((source) => (
          <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
            <span>
              {source.title}
              <small>{source.note}</small>
            </span>
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        ))}
      </div>
    </aside>
  )
}
