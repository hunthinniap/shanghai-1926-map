import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { MessageSquareWarning, X } from 'lucide-react'
import './FeedbackButton.css'

export interface FeedbackContext {
  id: string
  type: 'road' | 'building'
  name: string
  modernName?: string
  address?: string
  year?: number | null
}
const formName = 'map-feedback'
const draftKey = (id: string) => `map-feedback-draft:${id}`
interface Draft { message: string; category: string; email: string }
const emptyDraft: Draft = { message: '', category: '资料有误', email: '' }
function readDraft(id: string): Draft {
  try { return { ...emptyDraft, ...JSON.parse(localStorage.getItem(draftKey(id)) || '{}') } }
  catch { return { ...emptyDraft } }
}

function FeedbackDialog({ context, onClose }: { context: FeedbackContext; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const messageInput = useRef<HTMLTextAreaElement>(null)
  const titleId = useId()
  const [draft, setDraft] = useState(() => readDraft(context.id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState<'local' | 'online'>()
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    messageInput.current?.focus()
    return () => { if (element.open) element.close() }
  }, [])
  function update(patch: Partial<Draft>) {
    const next = { ...draft, ...patch }
    setDraft(next)
    try { localStorage.setItem(draftKey(context.id), JSON.stringify(next)) } catch { /* Submission remains available without browser storage. */ }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.message.trim()) { setError('请填写问题说明。'); return }
    setError('')
    setBusy(true)
    const body = new URLSearchParams({
      'form-name': formName, 'bot-field': '', 'place-id': context.id, 'place-type': context.type,
      'place-name': context.name, 'modern-name': context.modernName || '', address: context.address || '',
      year: context.year == null ? '全部年代' : String(context.year), 'page-url': window.location.href,
      category: draft.category, message: draft.message.trim(), email: draft.email.trim(),
    })
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    try {
      const response = await fetch('/', { method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Map-Feedback': '1' },
        body: body.toString(), signal: controller.signal,
      })
      if (!response.ok) throw new Error('Feedback submission failed')
      setSaved(response.headers.get('X-Map-Feedback') === 'local' ? 'local' : 'online')
      try { localStorage.removeItem(draftKey(context.id)) } catch { /* Optional draft storage. */ }
    } catch { setError('提交失败，请重试。你填写的内容已保留。') }
    finally { window.clearTimeout(timeout); setBusy(false) }
  }
  return <dialog ref={dialog} className="feedback-dialog" aria-labelledby={titleId} onClose={onClose}
    onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation() }} onClick={event => {
    if (event.target !== event.currentTarget) return
    const box = event.currentTarget.getBoundingClientRect()
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.current?.close()
  }}>
    <button type="button" className="icon-button feedback-close" aria-label="关闭反馈" onClick={() => dialog.current?.close()}><X size={18} aria-hidden="true" /></button>
    <h2 id={titleId}>反馈问题</h2>
    <p className="feedback-context">{context.name}{context.year != null && <span> · {context.year}年</span>}</p>
    {context.address && <p className="feedback-address">{context.address}</p>}
    {saved ? <div className="feedback-result" role="status">
      <p>{saved === 'local' ? '反馈已保存到本机。' : '反馈已提交。'}</p>
      <button type="button" autoFocus className="feedback-submit" onClick={() => dialog.current?.close()}>完成</button>
    </div> : <form name={formName} method="POST" onSubmit={submit}>
      <label>问题类型<select value={draft.category} onChange={event => update({ category: event.target.value })}>
        {['资料有误', '名称有误', '年代有误', '位置有误', '补充资料', '其他'].map(category => <option key={category}>{category}</option>)}
      </select></label>
      <label>问题说明<textarea ref={messageInput} required maxLength={3000} rows={4} value={draft.message}
        placeholder="请描述发现的问题，也可以附上资料链接。" onChange={event => update({ message: event.target.value })} /></label>
      <label>联系邮箱（选填）<input type="email" autoComplete="email" maxLength={254} value={draft.email} onChange={event => update({ email: event.target.value })} /></label>
      <p className="feedback-hint">将附上当前地点和年份，方便核查。</p>
      {error && <p className="feedback-error" role="alert">{error}</p>}
      <button type="submit" className="feedback-submit" disabled={busy}>{busy ? '正在提交…' : '提交反馈'}</button>
    </form>}
  </dialog>
}

export function FeedbackButton({ context }: { context: FeedbackContext }) {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" className="icon-button details-feedback" aria-label="反馈问题" title="反馈问题" aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <MessageSquareWarning size={16} aria-hidden="true" />
    </button>
    {open && <FeedbackDialog context={context} onClose={() => setOpen(false)} />}
  </>
}
