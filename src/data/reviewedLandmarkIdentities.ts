import type { ReviewedLandmarkIdentity } from '../lib/reviewedLandmarkIdentities'

// Reviewed historical-name identities that do not correspond to an entry in
// the Shanghai excellent-historical-building directory. Source fields in the
// original feature remain untouched; this is a guarded display/search overlay.
export const reviewedLandmarkIdentities: ReviewedLandmarkIdentity[] = [
  {
    landmarkFeatureId: 'landmark-vs-site-499',
    expectedSourceRecordIds: [499, 1554],
    canonicalNameZh: '加尔默罗会圣若瑟圣衣院',
    aliases: [
      'Carmelite Convent',
      'Convent des Carmélites',
      '聖衣院',
      '圣衣院',
      '徐家汇圣衣院',
      '土山湾圣衣院',
      '苦修院',
    ],
    note: 'Carmelite是加尔默罗会（俗称圣衣会）；该会在徐家汇建立的Carmelite Convent具名为圣若瑟圣衣院。同组#1554只是泛称Church，保留为同院史料，不额外虚构优秀历史建筑编号。',
    sources: [
      { title: '上海社会科学院 · 从徐家汇善牧院看“罗马问题”的上海折射', url: 'https://wxs.sass.org.cn/2023/0526/c6911a543063/page.htm' },
      { title: '维基百科 · 加尔默罗会圣若瑟圣衣院', url: 'https://zh.wikipedia.org/wiki/加尔默罗会圣若瑟圣衣院' },
      { title: 'Virtual Shanghai · Carmelite Convent', url: 'https://www.virtualshanghai.net/數據/建築?ID=499' },
    ],
  },
]
