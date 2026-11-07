import { isRoadNameEvent, roadHistoryEventYear, type RoadHistoryEvent } from '../data/roadHistories'

export interface RoadHistoryDetail { event: RoadHistoryEvent; text: string }

const normalized = (value: string) => value.normalize('NFKC').replace(/\s+/g, '').toLowerCase()
const identity = (event: RoadHistoryEvent) => `${normalized(event.name)}\0${normalized(event.segment ?? '')}`

/** Compact the card only; the full events still drive the map's dated labels. */
export function prepareRoadHistoryTimeline(input: readonly RoadHistoryEvent[]) {
  const ordered = [...input].sort((a, b) =>
    (roadHistoryEventYear(a) ?? Infinity) - (roadHistoryEventYear(b) ?? Infinity))
  const events: RoadHistoryEvent[] = []
  const details: RoadHistoryDetail[] = []
  const seenDetails = new Set<string>()

  for (const event of ordered) {
    const key = identity(event)
    const isName = isRoadNameEvent(event)
    const isDated = roadHistoryEventYear(event) !== undefined
    const previous = events.at(-1)
    // A → B → A is a real return to a former name. An undated alias, however,
    // cannot establish another dated phase after an already documented name.
    const repeated = isDated
      ? previous && identity(previous) === key && !/复名|恢复|改回/.test(event.kind)
      : events.some(candidate => identity(candidate) === key)
    if (isName && !repeated) {
      const { note: _note, segment: _segment, ...row } = event
      events.push(row)
      // Scope is retained for duplicate comparisons even though it moves out
      // of the visible row and into the history explanation.
      if (event.segment) events[events.length - 1].segment = event.segment
    }

    const information = [!isName ? `${event.kind}：${event.name}。` : undefined,
      event.note, event.segment ? `路段：${event.segment}` : undefined]
      .filter((text): text is string => Boolean(text)).join(' ')
    const text = information || (repeated && isDated ? `${event.kind}${event.name}。` : '')
    if (!text || seenDetails.has(normalized(text))) continue
    seenDetails.add(normalized(text))
    details.push({ event, text })
  }
  return { events, details }
}

export function roadHistoryDetailLabel(event: RoadHistoryEvent) {
  const date = event.displayYear !== undefined ? `${event.displayYear}年`
    : event.period || (event.year !== undefined ? `${event.year}年` : '年代待考')
  return isRoadNameEvent(event) ? `${date} · ${event.name}` : date
}
