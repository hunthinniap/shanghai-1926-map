import type { LandmarkSiteLink } from '../lib/landmarkSites'

const archives = {
  title: '上海黄浦／黄浦档案 · 倾听：人文荟萃也是园（2019-07-17）',
  url: 'https://www.sohu.com/a/327525591_391448',
}

export const yeshiyuanHistory: LandmarkSiteLink = {
  id: 'yeshiyuan-destruction-1508',
  canonicalFeatureId: 'landmark-vs-site-1508',
  memberFeatureIds: [],
  expectedBuildingIds: [1508],
  expectedParkIds: [],
  aliases: ['也是园', '也是園'],
  buildingLifeDates: {
    demolished: {
      year: 1937,
      sourceUrl: archives.url,
      note: '1937年淞沪会战中园内楼阁大半毁损，时间轴以此作为完整历史园林的消失年；部分遗石后来移入豫园，不表示所有构件均于当年灭失。',
    },
  },
  note: '也是园（原南园、后为蕊珠宫／蕊珠书院）位于老城厢凝和路、也是园弄一带。黄浦档案图文记1937年园内楼阁大半倒塌，战后废墟逐渐搭棚居住；薛理勇文章亦记园林毁于1937年“八一三”战事。时间轴从1937年起不再显示完整园林。部分假山石、积玉峰后来移入豫园，移石年份与战争毁损年份分开；这不确定原园每栋建筑的具体毁损日，也不据此确认今天的宗地边界或门牌。',
  sources: [archives, {
    title: '薛理勇 · 噱说上海：从也是园到蕊珠书院（2020-08-21，新浪转载）',
    url: 'https://tech.sina.cn/2020-08-21/detail-iivhuipn9809072.d.html',
  }, {
    title: '维基百科 · 也是园（用户提供的中文条目）',
    url: 'https://zh.wikipedia.org/zh-cn/%E4%B9%9F%E6%98%AF%E5%9B%AD',
  }],
}
