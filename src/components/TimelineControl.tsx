import { ChevronLeft, ChevronRight, History } from 'lucide-react'
import './TimelineControl.css'

interface TimelineControlProps {
  year: number | null
  minYear: number
  maxYear: number
  visibleCount: number
  unknownCount: number
  includeUnknown: boolean
  loading?: boolean
  onYearChange: (year: number | null) => void
  onIncludeUnknownChange: (include: boolean) => void
}

export function TimelineControl({ year, minYear, maxYear, visibleCount, unknownCount, includeUnknown,
  loading, onYearChange, onIncludeUnknownChange }: TimelineControlProps) {
  const sliderYear = year ?? Math.min(maxYear, Math.max(minYear, 1928))
  const ticks = [...new Set([minYear, 1900, 1928, 1949, 2000, maxYear])]
    .filter(value => value >= minYear && value <= maxYear).sort((a, b) => a - b)
  return (
    <section className="building-timeline" aria-label="建筑时间轴">
      <div className="timeline-heading">
        <div className="timeline-title"><History size={16} aria-hidden="true" /><span>建筑时间轴</span></div>
        <output className="timeline-year" htmlFor="map-year">{year === null ? '全部年代' : `${year} 年`}</output>
        <button type="button" className="timeline-anchor" aria-label="回到 1928 年"
          onClick={() => onYearChange(1928)}>1928</button>
        <button type="button" className="timeline-all" aria-pressed={year === null}
          onClick={() => onYearChange(null)}>全部年代</button>
      </div>
      <div className="timeline-track">
        <button type="button" aria-label="上一年" disabled={sliderYear <= minYear}
          onClick={() => onYearChange(sliderYear - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
        <div className="timeline-range-wrap">
          <input id="map-year" type="range" min={minYear} max={maxYear} step={1} value={sliderYear}
            aria-label="地图年份" aria-valuetext={`${sliderYear} 年${year === null ? '，拖动以筛选' : ''}`}
            onChange={event => onYearChange(Number(event.target.value))} />
          <div className="timeline-ticks">
            {ticks.map(value => <button type="button" key={value} className={value === 1928 ? 'is-anchor' : ''}
              style={{ left: `${(value - minYear) / (maxYear - minYear) * 100}%` }}
              aria-label={`查看 ${value} 年`} onClick={() => onYearChange(value)}>{value}</button>)}
          </div>
        </div>
        <button type="button" aria-label="下一年" disabled={sliderYear >= maxYear}
          onClick={() => onYearChange(sliderYear + 1)}><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
      <div className="timeline-status">
        <span>{loading ? '正在载入建筑年代…' : year === null && visibleCount === 0
          ? '拖动年份，查看建筑与地标变化' : `显示 ${visibleCount} 处 · 年代不明 ${unknownCount} 处`}</span>
        <label><input type="checkbox" checked={includeUnknown} disabled={year === null}
          onChange={event => onIncludeUnknownChange(event.target.checked)} />包含年代不明</label>
      </div>
      <p className="timeline-note" id="timeline-note">名称按已核实沿革变化，没有更名记录时沿用原名。建造区间取末年，消失年仅用核实资料。底图与道路不随年份变化。</p>
    </section>
  )
}
