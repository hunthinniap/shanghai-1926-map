import type { LandmarkSiteLink } from '../lib/landmarkSites'

// Historical annotations approved on 2026-10-30. Each entry keeps its original
// feature and source ID; no present-day building identity or site merge is inferred.
export const publicBathHistories: LandmarkSiteLink[] = [
  {
    id: 'public-bath-history-1789',
    canonicalFeatureId: 'landmark-vs-site-1789',
    memberFeatureIds: [],
    expectedBuildingIds: [1789],
    expectedParkIds: [],
    nameZh: '大观园浴室',
    aliases: ['大觀園浴室', '大观园绿地', '大觀園綠地'],
    category: '公共浴室 / 历史旧址',
    note: '大观园浴室位于旧西藏路、新闸路口。2023年历史文章记载浴室已拆，原址成为大观园绿地；2021年现场报道记绿地于2004年建成，作为免费公共绿地开放。原址改为绿地的沿革已有依据，绿地用途资料时点为2021、2023年。',
    sources: [
      {
        title: '澎湃 · 公共浴室的春秋岁月（中）：浴池中的乐趣及话题（2023-01-13）',
        url: 'https://www.thepaper.cn/newsDetail_forward_21544180',
      },
      {
        title: '周到 · 走进黄浦“大观园”，时至冬日也满是春意（2021-12-25）',
        url: 'https://static.zhoudaosh.com/files/cnews/2021/20211225/5F68D3DD196E92EE76D3FFC16F3C015F6B029DF16717751021EA94C5EF2187F2/1.html',
      },
    ],
  },
  {
    id: 'public-bath-history-983',
    canonicalFeatureId: 'landmark-vs-site-983',
    memberFeatureIds: [],
    expectedBuildingIds: [983],
    expectedParkIds: [],
    nameZh: '卡德池',
    aliases: ['卡德池浴室', '卡德路247号', '247 Carter Road'],
    category: '公共浴室 / 历史旧址',
    note: '卡德池旧址为卡德路247号，卡德路今称石门二路。《上海通志》记载卡德池于1932年开张。2023年历史文章记经营者为谢葆生，与杜月笙有往来。原楼存废、旧今门牌对应及原址后续用途待核；历史247号尚不能直接视为今天的同号地址。',
    sources: [
      {
        title: '澎湃 · 公共浴室的春秋岁月（中）：浴池中的乐趣及话题（2023-01-13）',
        url: 'https://www.thepaper.cn/newsDetail_forward_21544180',
      },
      {
        title: '上海市政府 · 《上海通志》“六、沐浴、理发行业”（PDF第242页）',
        url: 'https://www.shanghai.gov.cn/shanghai/newshanghai/%E4%B8%8A%E6%B5%B7%E9%80%9A%E5%BF%97.pdf#page=242',
      },
    ],
  },
  {
    id: 'public-bath-history-68',
    canonicalFeatureId: 'landmark-vs-site-68',
    memberFeatureIds: [],
    expectedBuildingIds: [68],
    expectedParkIds: [],
    nameZh: '日新池浴室',
    aliases: ['日新池', '八仙桥日新池', '八仙橋日新池', '普安路日新池'],
    category: '公共浴室 / 历史旧址',
    note: '日新池位于八仙桥一带的维尔蒙路（今普安路），经营者马鸿根与黄金荣关系密切。原资料地址为173 Route Vouillemont；该门牌与其他资料所载门牌、迁址经过及原楼去向尚待厘清，原址后续用途待核。',
    sources: [
      {
        title: '澎湃 · 公共浴室的春秋岁月（中）：浴池中的乐趣及话题（2023-01-13）',
        url: 'https://www.thepaper.cn/newsDetail_forward_21544180',
      },
    ],
  },
]
