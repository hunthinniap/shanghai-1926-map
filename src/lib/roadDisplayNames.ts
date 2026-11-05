import { chineseRoadTranscriptions, foreignNamesInWugniu } from '../data/chineseRoadNames'
import type { HistoricalFeatureProperties } from '../types'

/** Display the historical Chinese form only for identified Chinese names. */
export function roadDisplayName(properties: HistoricalFeatureProperties): string {
  const chinese = properties.historicalChinese?.trim()
  if (!chinese || !/\p{Script=Han}/u.test(chinese) || /XX/i.test(chinese)) return properties.historicalName
  const chineseOrigin = properties.language === 'wuu'
    ? !foreignNamesInWugniu.has(chinese)
    : properties.language === 'zh' || chineseRoadTranscriptions.has(properties.historicalName)
  return chineseOrigin ? chinese : properties.historicalName
}
