import type { BuildingLifeDates } from '../types'
import type { BuildingPeriod } from '../lib/buildingTimeline'

export function BuildingPeriodDetails({ period, dates }: { period: BuildingPeriod; dates?: BuildingLifeDates }) {
  const labels = { construction: '建造年份', 'construction-range': '建造年代区间末年', 'earliest-record': '最早资料记录', unknown: '年代不明' }
  return <div className="details-list-wide">
    <dt>时间轴依据</dt>
    <dd>{period.startYear === undefined ? '暂无可用于筛选的明确年代' : `${labels[period.basis]}：${period.startYear} 年`}
      {period.basis === 'earliest-record' && <><br /><small>资料记录年份不等同于建筑建成年份。</small></>}
      <br />{period.demolishedYear !== undefined
        ? <a href={dates?.demolished?.sourceUrl} target="_blank" rel="noreferrer">{period.demolishedYear} 年消失（来源）</a>
        : <small>消失年份未核定；显示在图上不表示原建筑至今仍存。</small>}
      {period.demolishedYear !== undefined && dates?.demolished?.note && <><br /><small>{dates.demolished.note}</small></>}
    </dd>
  </div>
}
