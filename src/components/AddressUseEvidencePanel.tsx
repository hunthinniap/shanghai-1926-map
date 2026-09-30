import type { AddressUseEvidence } from '../types'

/** Address-only observations stay visibly distinct from a resolved historic site. */
export function AddressUseEvidencePanel({ evidence }: { evidence?: AddressUseEvidence[] }) {
  if (!evidence?.length) return null
  return <section className="details-sources" aria-label="现址调查资料">
    <h3>现址调查</h3>
    {evidence.map(item => <div key={item.sourceRecordIds.join(',')}>
      <p>Virtual Shanghai #{item.sourceRecordIds.join(' / #')}</p>
      <dl className="details-list">
        <div className="details-list-wide">
          <dt>{item.mode === 'current-use' ? '现在用途' : '今址用途参考'}</dt>
          <dd>{item.use}</dd>
        </div>
        <div className="details-list-wide"><dt>资料记载的现代地址</dt><dd>{item.address}</dd></div>
        <div className="details-list-wide">
          <dt>对应关系与限制</dt>
          <dd>{item.mode === 'address-reference' && <>仅确认该现代门址用途，历史原址／原建筑对应待核。<br /></>}
            {item.note}
            {item.retainedHold && <><br />此前原址关系待核限制仍保留，本条仅补充今址参考。</>}
          </dd>
        </div>
      </dl>
      <details>
        <summary>来源与资料时点（查阅至 {item.reviewedOn}）</summary>
        {item.sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
          <span>{source.title}
            <small>资料时点：{source.informationAsOf ?? '未标日期'}；查阅：{source.accessedOn}</small>
            <small>{source.supports}</small>
          </span>
        </a>)}
      </details>
    </div>)}
  </section>
}
