import { landmarkSiteLinks } from './landmarkSiteLinks'
import { publicBathHistories } from './publicBathHistories'
import { zhangyuanTimeline } from './zhangyuanTimeline'
import { hardoonGardenTimeline } from './hardoonGardenTimeline'
import { yeshiyuanHistory } from './yeshiyuanHistory'
import { fenyang83History } from './fenyang83History'
import { shtongLandmarkDateHistories } from './shtongDatedHistories'

// Keep the frozen site-identity input unchanged: this is a dated source
// enrichment. Individual histories annotate their existing, separately guarded points.
export const landmarkSiteLinksWithSources = [...landmarkSiteLinks.map((link) =>
  link.id === 'park-140-building-1727' ? {
    ...link,
    historicalPhases: zhangyuanTimeline,
    note: `${link.note} 太古地产2022年11月新闻稿记张园1885年开放、1918年闭园后转为住宅区；2022年西区16幢历史建筑率先开放，活化为商业、展览与公共活动空间。以上是园区不同阶段，不表示19世纪园内建筑全部保存，亦不表示东区当时的未来计划已经实现。`,
    sources: [...link.sources, {
      title: '太古地产：张园焕新揭幕（2022年11月28日）',
      url: 'https://www.swireproperties.com/zh-cn/media/press-releases/2022/20221128_zhangyuan/',
    }],
  } : link.id === 'park-115-building-1092' ? {
    ...link,
    historicalPhases: hardoonGardenTimeline,
    aliases: [...(link.aliases ?? []), ...hardoonGardenTimeline.map(phase => phase.name), '中蘇友好大廈', '上海展覽館', '上海展覽中心'],
    note: `${link.note} 后续园址于1954年开工建设，1955年建成中苏友好大厦，1968年改称上海展览馆，1984年起称上海展览中心。各阶段按同一地块的再开发与名称沿革展示，不等同于旧园建筑延续。`,
    sources: [...link.sources, ...hardoonGardenTimeline.flatMap(phase => phase.sources)
      .filter((source, index, sources) => sources.findIndex(item => item.url === source.url) === index)],
  } : link), ...publicBathHistories, yeshiyuanHistory, fenyang83History, ...shtongLandmarkDateHistories]
