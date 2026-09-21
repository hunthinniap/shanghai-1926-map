// 2026-09-21: read article bodies, not just titles or nearby coordinates.
// These are display identities; original VS fields and current-use judgments
// remain unchanged. Address differences are retained, never auto-renumbered.
export const aliasDecisions = [
  [1763, '2C010', 'same-listed-complex', '维基百科陕南村正文明确列出King Albert Apartments、亚尔培公寓、金亚尔培公寓及陕南邨别名；对应陕西南路公寓里弄。旧377 AVENUE DU ROI ALBERT原样保留，名录157—187号与维基151—187号分列，不声称377与某一现代门牌已逐号核定。原记录年代未知，维基1930年为建筑群沿革资料，不回写成VS记录年份。', ['https://zh.wikipedia.org/wiki/陕南村']],
  [218, '3C013', 'same-listed-building', 'Dubail Apartments即吕班公寓、今重庆公寓。交大设计学院论文确认中英文楼名；建筑史文章引用行号录181 Av. Dubail和1947年电话簿181号，并明确现址重庆南路185号。旧181、新185分别展示，建造年代争议保持来源原文。', ['https://designschool.sjtu.edu.cn/dynamic/news/detail/690af4765c316a926b5f67c4', 'https://www.thepaper.cn/newsDetail_forward_7768016']],
  [1438, '4M007', 'same-listed-complex', 'VS中文月邨与名录月村为同一江苏路住宅群，1921年记录与楼史相合；旧472 EDINBURGH ROAD保留，现保护范围为江苏路480弄名录列明楼号。资料记原22幢已有部分拆除，不将整处历史住宅群视为全部原物存续，也不将472直接换算为某栋现门牌。', ['https://zh.wikipedia.org/wiki/月村', 'https://www.sohu.com/a/451154896_120209938']],
  [357, '2D041', 'same-listed-building', 'Orthodox Church旧55 ROUTE PAUL HENRY与新乐路55号圣母大堂对应，正教会资料、名录和高德门址一致。原中文天主救堂存在宗派/字词误标，1938年原记录与1932年始建等楼史分列；不并入相邻57—61号住宅。高德仅用于核对名称门址，展示仍用历史建筑WGS84参考点，未读取或替换为高德坐标。', ['https://www.orthodox.cn/contemporary/shanghai/cathedral_cn.htm', 'https://zh.wikipedia.org/wiki/圣母大堂', 'https://ditu.amap.com/place/B00155LALJ']],
  [671, '1A023', 'same-historical-site', 'Metropole Theater／大上海戯院与名录大上海大戏院对应；维基正文列Metropol Cinema和今西藏中路500号，并明确原楼已重建。按同一地点历史阶段共卡，名录520号与资料500号分别保留；沿用既有原址重建用途研究，不因列入名录就认定1933年原建筑仍在。', ['https://zh.wikipedia.org/wiki/大上海电影院']],
]

export const aliasHolds = [
  [1737, '2B018', 'Lock Apartments有幸福公寓的中英文名线索，但现候选是华山路400号海格大楼；旧245 AVENUE HAIG至400号及两楼身份没有可靠桥接。约20米近邻不足以合并，下一步查幸福公寓和大胜胡同的范围。', ['https://www.sohu.com/a/386818649_649794']],
  [1733, '3C006', '白尔登公寓文章中的INTERSAVIN被解释为万国储蓄会电报地址，不能仅凭此认定Intersavin Apartments为该楼唯一旧名。旧421 AVENUE DU ROI ALBERT至今陕西南路213号仍缺门址/楼体桥接，保持独立。', ['https://www.sohu.com/a/586271745_121124759']],
  [1744, '4A024', 'York House与约克大楼具有很强楼名线索，但VS1744为25 RUE MONTAUBAN，名录为四川南路27—29号；同名VS1745的29号又在含报社记录的另一历史组。需核25号范围及另一组全部成员，暂不仅凭音译与26米近邻作显示归并。', ['https://zh.wikipedia.org/wiki/约克大楼', 'https://www.virtualshanghai.net/data/buildings?of=3&os=a']],
]

export const reviewedAliases = {
  1763: ['King Albert Apartments', "King's Albert Apartments", '陕南村', '陕南邨', '亚尔培公寓', '金亚尔培公寓'],
  218: ['Dubail Apartments', '吕班公寓', '重庆公寓'],
  1438: ['Yue Apartments', '月邨', '月村'],
  357: ['Orthodox Church', '新乐路东正教堂', '圣母大堂'],
  671: ['Metropole Theater', 'Metropol Cinema', '大上海大戏院', '大上海电影院'],
}

export const aliasModernAddresses = {
  671: { address: '西藏中路500号', sourceUrl: 'https://zh.wikipedia.org/wiki/大上海电影院', title: '维基百科 · 大上海电影院门址与重建说明' },
}

export const supplementalSources = [
  { url: 'https://zh.wikipedia.org/wiki/陕南村', title: '维基百科 · 陕南村（King Albert Apartments别名）' },
  { url: 'https://designschool.sjtu.edu.cn/dynamic/news/detail/690af4765c316a926b5f67c4', title: '上海交通大学设计学院 · 高密度多元化的街区：一种上海模式' },
  { url: 'https://www.thepaper.cn/newsDetail_forward_7768016', title: '外滩以西 · 吕班公寓旧181号与今重庆南路185号（澎湃号）' },
  { url: 'https://zh.wikipedia.org/wiki/月村', title: '维基百科 · 月村（1921年与部分拆除记录）' },
  { url: 'https://www.sohu.com/a/451154896_120209938', title: '上海长宁 · 江苏路的故事（搜狐转载）' },
  { url: 'https://www.orthodox.cn/contemporary/shanghai/cathedral_cn.htm', title: '中华正教会资料 · 上海圣母大堂旧址' },
  { url: 'https://zh.wikipedia.org/wiki/圣母大堂', title: '维基百科 · 圣母大堂' },
  { url: 'https://ditu.amap.com/place/B00155LALJ', title: '高德地图 · 新乐路东正教堂（仅核门址）' },
  { url: 'https://zh.wikipedia.org/wiki/大上海电影院', title: '维基百科 · 大上海电影院（原楼重建）' },
].map((source) => ({ ...source, accessedAt: '2026-09-21',
  access: source.url.includes('ditu.amap.com') ? 'search-result-address-only' : 'article-body-read' }))
