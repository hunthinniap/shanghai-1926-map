import type { HistoricalSitePhase, TimelineStage } from '../types'

function PhaseList({ phases, activeId }: { phases?: HistoricalSitePhase[]; activeId?: string }) {
  if (!phases?.length) return null
  return <details className="site-phase-list"><summary>完整沿革阶段</summary><ol>{phases.map(phase =>
    <li key={phase.id} aria-current={activeId === phase.id ? 'true' : undefined}>
      <strong>{phase.endYear ? `${phase.startYear}–${phase.endYear} 年前` : `${phase.startYear} 年起`} · {phase.nameZh || phase.name}</strong>
      <br />{phase.use}{phase.note && <><br /><small>{phase.note}</small></>}
      {phase.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title || '依据'}</a>)}
    </li>)}</ol></details>
}

export function TimelineStageDetails({ stage, phases }: { stage?: TimelineStage; phases?: HistoricalSitePhase[] }) {
  if (!stage) return phases?.length ? <div className="details-list-wide"><dt>地点沿革</dt><dd><PhaseList phases={phases} /></dd></div> : null
  const sources = stage.phase?.sources ?? stage.records.flatMap(record =>
    (record.sourceUrls ?? []).map(url => ({ url, title: record.name })))
  return <div className="details-list-wide timeline-stage-details">
    <dt>{stage.year} 年 · 地点沿革</dt>
    <dd><strong>{stage.nameZh || stage.name}</strong>
      {stage.use && <><br />该阶段用途：{stage.use}</>}
      <br /><small>{stage.status === 'reviewed-phase' ? '有据的沿革阶段'
        : stage.status === 'record-span' ? '名称见该年资料；资料跨度不等同于建筑存续期。'
        : stage.status === 'latest-record' ? '名称依据已有历史记录。'
        : '名称沿用原记录。'}</small>
      {stage.phase && <><br /><small>{stage.phase.relationship === 'replacement-building' ? '同址新建：不是原建筑改名。'
        : stage.phase.relationship === 'same-building' ? '同栋建筑阶段。'
        : stage.phase.relationship === 'vacant-site' ? '地块空置阶段。' : '地块用途阶段；未核定为同栋建筑。'}</small></>}
      {stage.scope && <><br /><small>{stage.scope}</small></>}
      {stage.phase?.note && <><br /><small>{stage.phase.note}</small></>}
      {stage.records.length > 0 && <ul className="timeline-stage-records">{stage.records.map((record, index) => <li key={index}>
        {record.startYear}{record.endYear && record.endYear !== record.startYear ? `–${record.endYear}` : ''} 年记录 · {record.displayNameZh || record.nameZh || record.name}
        {record.category && ` · 资料分类：${record.category}`}
      </li>)}</ul>}
      {sources.length > 0 && <span className="details-historical-record-sources">{[...new Map(sources.map(source => [source.url, source])).values()].map(source =>
        <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title || '阶段来源'}</a>)}</span>}
      <PhaseList phases={phases} activeId={stage.phase?.id} />
    </dd>
  </div>
}
