import { landmarkSiteLinks } from './landmarkSiteLinks'

// Keep the frozen site-identity input unchanged: this is a dated source
// enrichment, not a new identity or a new current-use verification.
export const landmarkSiteLinksWithSources = landmarkSiteLinks.map((link) =>
  link.id === 'park-140-building-1727' ? {
    ...link,
    note: `${link.note} 太古地产2022年11月新闻稿记张园1885年开放、1918年闭园后转为住宅区；2022年西区16幢历史建筑率先开放，活化为商业、展览与公共活动空间。以上是园区不同阶段，不表示19世纪园内建筑全部保存，亦不表示东区当时的未来计划已经实现。`,
    sources: [...link.sources, {
      title: '太古地产：张园焕新揭幕（2022年11月28日）',
      url: 'https://www.swireproperties.com/zh-cn/media/press-releases/2022/20221128_zhangyuan/',
    }],
  } : link)
