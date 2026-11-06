import * as OpenCC from 'opencc-js'

const simplify = OpenCC.Converter({ from: 'tw', to: 'cn' })
const clean = text => simplify(text || '').replace(/\*\*|'''|\[\[|\]\]/g, '').trim()
const range = /(\d{4})(?:年)?(?:代)?(?:\d{1,2}月(?:\d{1,2}日)?)?\s*(?:—|–|－|-|～|~|至|到)\s*(\d{4})/

// This is the user's display convention, not a change to the supplied evidence.
export function roadRangeStart(period) {
  const text = clean(period)
  const match = text.match(range)
  if (match) return Math.min(Number(match[1]), Number(match[2]))
  if (/(?:以前|之前|以后|之后|一说|另说)/.test(text)) return undefined
  const decade = text.match(/(\d{3}0)年代(?:初|中|末)?/)
  return decade ? Number(decade[1]) : undefined
}

function eventDate(event) {
  const period = clean(event.period)
  const start = roadRangeStart(period)
  if (start !== undefined) return { year: start }
  if (/(?:以前|之前|以后|之后|一说|另说)/.test(period)) return { period }
  const year = event.year ?? Number(period.match(/\d{4}/)?.[0])
  return year >= 1000 && year <= 2100 ? { year } : { period }
}

function sourceFor(row, event, year) {
  const references = event.sources.map(clean)
  let best, bestScore = 0
  for (const source of row.sources) {
    const title = clean(source.title).replace(/[《》「」：:（）()\s]/g, '')
    let score = 0
    for (const reference of references) {
      const normalized = reference.replace(/[《》「」：:（）()\s]/g, '')
      if (title.includes(normalized) || normalized.includes(title)) score += 10
      const oldid = reference.match(/oldid[=＝](\d+)/)?.[1]
      if (oldid && source.url.includes(`oldid=${oldid}`)) score += 20
      const bookId = reference.match(/bookId[=＝](\d+)/)?.[1]
      if (bookId && source.url.includes(`bookId=${bookId}`)) score += 10
    }
    if (year && source.evidence?.includes(String(year))) score += 5
    if (score > bestScore) { best = source; bestScore = score }
  }
  return best
}

const hasRoadName = text => /[\p{Script=Han}][\p{Script=Han}·]*(?:路|街|弄|巷|衖|大道)|\b(?:Road|Street|Lane|Avenue|Route|Rue|Quai|Boulevard)\b/iu.test(text)
const building = /巡捕房|公寓|少年宫|少年之家|医院|教堂|电影院|宾馆|厂房|高尔夫|展览馆|广播大厦|校舍|住宅|办公楼/

export function providedRoadHistory(row, properties, holdReason) {
  const excluded = [], candidates = []
  if (holdReason || row.status === 'unresolved' || /TO DO|UNNAMED|VANISHED|XX/.test(row.modernNameZh)) {
    return { events: [], excluded: [], holdReason: holdReason || '道路身份或今日名称尚未确定。' }
  }
  const originalName = properties.historicalChinese
    ? `${properties.historicalChinese}（${row.historicalName}）` : row.historicalName
  const append = (event, date, name, kind) => {
    const source = sourceFor(row, event, date.year)
    candidates.push({ ...date, kind, name, originalPeriod: event.period,
      ...(source ? { url: source.url, sourceTitle: source.title.replace(/\s+%[\dA-F]{2}.*$/i, '').slice(0, 200) } : {}),
    })
  }
  for (const [index, event] of row.events.entries()) {
    const kind = clean(event.kind), name = clean(event.name), context = clean(event.segment)
    const reject = reason => excluded.push({ index, reason })
    if (/沿线市政机构|历史地图标绘/.test(kind) || building.test(name + context)
      || /^(?:它约|约)?建于\d{4}年/.test(name)) {
      reject('沿街建筑、机构或地图记载，不作为道路名称事件。'); continue
    }
    if (/全长|总长|道路长度|分别是.*倍/.test(name)) {
      reject('长度或统计数字，不是道路事件。'); continue
    }
    if (/改筑|改铺|翻修|路面|改成(?:煤屑|碎石|沥青|水泥)路/.test(name) && !/改名|更名|定名|改筑成路/.test(name)) {
      reject('路面工程不另列名称阶段。'); continue
    }
    if (event.sources.length && event.sources.every(s => /Virtual Shanghai 数据库记录/.test(s))) {
      reject('引用仅为建筑门牌记录，未给出道路事件。'); continue
    }
    const construction = /辟筑|建成|筑路|初名|修筑/.test(kind)
      || (kind === '沿革' && /辟筑|始筑|初筑|填[浜河]筑路|越界筑路|分段.*筑|修筑|修建|改筑成路|筑成/.test(name))
    const naming = /更名|命名|定名|复名|统称|并路|曾用名|改译名/.test(kind)
    const stages = name.split(/\s*(?:->|→)\s*/).map(part => ({
      name: part.replace(/[（(][^）)]*\d{4}[^）)]*[）)]/gu, '').trim(),
      year: Number(part.match(/[（(](\d{4})年/)?.[1]) || undefined,
    }))
    if ((construction || naming) && stages.length > 1 && stages.every(s => hasRoadName(s.name))) {
      for (const [stageIndex, stage] of stages.entries()) {
        append(event, stage.year ? { year: stage.year } : eventDate(event), stage.name, !stageIndex && construction ? '辟筑、命名' : '更名')
      }
      continue
    }
    let label = name
    if (construction) {
      if (!hasRoadName(label) || /\d{4}|道路|该路|始建|修筑|兴建|建于|开辟于/.test(label)) label = originalName
    } else if (naming || kind === '沿革') {
      if (/未更名|不更名/.test(label)) { reject('未发生名称变化。'); continue }
      if (kind === '沿革' && !/改名|改称|改为|改回|更名|定名|复名|恢复|称为|名为|今名|现名|改[\p{Script=Han}]+路/u.test(label)
        && !/^[\p{Script=Han}A-Za-z·\s（）().'/-]{1,70}$/u.test(label)) {
        reject('背景或片段文字，未给出道路名称变化。'); continue
      }
      if (/今名|现名/.test(label)) label = row.modernNameZh
      else {
        // Consume the whole verb before its short form: 年改 previously matched
        // before 改回, leaving 回 attached to the name.
        label = label.replace(/^.*?(?:改(?:名(?:为)?|称(?:为)?|为|回)|更名(?:为)?|称为|名为|定名(?:为)?|恢复(?:为)?|复名(?:为)?|改(?=[\p{Script=Han}]+(?:路|街|弄|巷)))/u, '')
          .replace(/^(?:为|於|于)/u, '')
      }
      if (!hasRoadName(label)) { reject('记录没有给出可用的道路名称。'); continue }
    } else {
      // Road works and administrative events remain in the full source record.
      reject('道路工程或背景说明，保留原记录，名称时间线只显示名称阶段。'); continue
    }
    label = label.replace(/[（(][^）)]*\d{4}[^）)]*[）)]/gu, '').replace(/旧名$/, '').trim()
    const date = eventDate(event)
    if (!date.year && !date.period) { reject('缺少可用年代。'); continue }
    append(event, date, label, construction ? '辟筑、命名' : '更名')
  }
  candidates.sort((a, b) => (a.year ?? (Number(a.period?.match(/\d{4}/)?.[0]) || 0))
    - (b.year ?? (Number(b.period?.match(/\d{4}/)?.[0]) || 0)))
  const nameKey = name => name.replace(/[（(].*$/, '').replace(/\s/g, '').toLowerCase()
  const events = candidates.filter((event, i) => !i || nameKey(event.name) !== nameKey(candidates[i - 1].name))
  return { events, excluded }
}
