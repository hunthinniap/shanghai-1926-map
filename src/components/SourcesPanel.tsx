import { ExternalLink, X } from 'lucide-react'
import type { SourceRecord } from '../types'

interface SourcesPanelProps {
  open: boolean
  sources: SourceRecord[]
  onClose: () => void
}

export function SourcesPanel({ open, sources, onClose }: SourcesPanelProps) {
  if (!open) return null

  return (
    <div className="sources-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="sources-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sources-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="icon-button sources-close" onClick={onClose} aria-label="关闭资料来源">
          <X size={18} aria-hidden="true" />
        </button>
        <p className="eyebrow">ABOUT THE RECORDS</p>
        <h2 id="sources-title">资料来源</h2>
        <p className="sources-intro">
          本地图优先采用 1928 年资料；缺项可由 1945 年前的历史地名数据补齐。底图中的现代道路只作空间参照，不显示现代文字。
        </p>
        <div className="sources-list">
          {sources.map((source) => (
            <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
              <span className="source-year">{source.year}</span>
              <span>
                <strong>{source.title}</strong>
                <small>{source.license}</small>
              </span>
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          ))}
        </div>
        <p className="sources-attribution">
          现代街道几何：OpenStreetMap contributors（ODbL）；瓦片服务：OpenFreeMap。
        </p>
      </section>
    </div>
  )
}
