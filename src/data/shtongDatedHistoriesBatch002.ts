import type { ReviewedHeritageUseHistory } from './heritageUseHistories'

const source = (nodeId: number) => `https://szfz.shtong.gov.cn/difangzhi-front/book/detailNew?oneId=1&bookId=81772&parentNodeId=81784&nodeId=${nodeId}&type=-1`

/** Full original chapters checked during the exhaustive search on 2026-11-02. */
export const shtongHeritageUseHistoriesBatch002: ReviewedHeritageUseHistory[] = [
  { officialId: 'sh-fgj-1A003-01', expectedName: '汇丰银行大楼', expectedAddress: '中山东一路10-12号',
    name: '浦东发展银行', year: 1997, period: '1997年',
    note: '方志明确记1997年浦东发展银行进驻大修。1993年1月是该行开业年份，不能替代其进驻这座大楼的年份；原楼建造年亦另列。',
    sourceTitle: '上海名建筑志 · 汇丰银行大楼（浦东发展银行大楼）', sourceUrl: source(108920) },
  { officialId: 'sh-fgj-1A008-01', expectedName: '怡和银行', expectedAddress: '中山东一路27号',
    name: '市对外贸易局', year: 1955, period: '1955年',
    note: '方志记中山东一路27号怡和洋行大楼1955年由市房地局管理，交外贸局及所属单位使用。名录原名称“怡和银行”原文保留，不因此改写建筑对应关系。',
    sourceTitle: '上海名建筑志 · 怡和洋行大楼（外贸大楼）', sourceUrl: source(108931) },
  { officialId: 'sh-fgj-1A009-01', expectedName: '东方汇理银行', expectedAddress: '中山东一路29号',
    name: '光大银行', year: 1995, period: '1995年',
    note: '方志记1995年光大银行上海分行由天津路2号搬入中山东一路29号东方大楼；此为该址迁入年，不是银行创办年。',
    sourceTitle: '上海名建筑志 · 东方汇理银行大楼（光大银行上海分行）', sourceUrl: source(108933) },
  { officialId: 'sh-fgj-1A015-01', expectedName: '华安人寿保险公司', expectedAddress: '南京西路104号',
    name: '金门大酒店', year: 1939, period: '1939年',
    note: '方志记1939年香港华侨租下华安并改为金门大酒店；1950年停业，1958年改称华侨饭店，1992年恢复金门大酒店老名。1939是首次改称记录，不代表其后始终连续以该名营业。',
    sourceTitle: '上海名建筑志 · 华安大楼（金门酒店大楼、华侨饭店大楼）', sourceUrl: source(108938) },
  { officialId: 'sh-fgj-1F001-01', expectedName: '百老会大厦', expectedAddress: '北苏州河路2号',
    name: '上海大厦', year: 1951, period: '1951年5月1日',
    note: '方志记百老汇大厦1951年5月1日更名上海大厦。方志今门牌为北苏州路20号，名录原门牌及原名用字另行保留，不以此补年改动点位或门牌。',
    sourceTitle: '上海名建筑志 · 百老汇大厦（上海大厦）', sourceUrl: source(108934) },
  { officialId: 'sh-fgj-2D012-01', expectedName: '东美特公寓', expectedAddress: '淮海中路1842-1858号',
    name: '武康大楼', year: 1953, period: '1953年',
    note: '方志在诺曼底公寓沿革中明确记1953年改名武康大楼；方志门牌范围为1836—1858号，名录原登记范围及“东美特公寓”用字保留，不改1924年建造年代。',
    sourceTitle: '上海名建筑志 · 诺曼底公寓大楼（武康大楼）', sourceUrl: source(108978) },
  { officialId: 'sh-fgj-3A002-01', expectedName: '交通银行/交通银行', expectedAddress: '中山东一路14号',
    name: '上海市总工会大楼/上海市总工会', year: 1951, period: '1951年',
    note: '方志明确记1951年中山东一路14号移交上海市总工会使用，后来另有劳动局、物价局和妇联在此办公；不把交行1948年大楼竣工年当作总工会迁入年。',
    sourceTitle: '上海名建筑志 · 交通银行大楼（市总工会大楼）', sourceUrl: source(108922) },
  { officialId: 'sh-fgj-3F005-01', expectedName: '礼查饭店', expectedAddress: '黄浦路15号',
    name: '浦江饭店', year: 1959, period: '1959年',
    note: '方志记1959年市有关部门接管礼查饭店，改名浦江饭店；1846年为饭店机构早期创建时间，不能直接当作黄浦路15号现建筑的建造年或浦江饭店名称出现年。',
    sourceTitle: '上海名建筑志 · 礼查饭店大楼（浦江饭店）', sourceUrl: source(108944) },
]

export const shtongConstructionDateReviews = [{
  officialId: 'sh-fgj-3F005-01', expectedName: '礼查饭店', expectedAddress: '黄浦路15号',
  originalConstructionDate: '1907（1922年改建底楼大厅）', dateText: '1907年', reviewedOn: '2026-11-02',
  source: { title: '上海名建筑志 · 礼查饭店大楼（浦江饭店）', url: source(108944) },
  note: '方志将1907年扩建成现建筑与1922年底层大厅改建分别记述。现建筑采用1907年，原字段的1922年大厅改建信息保留在原文及本说明，不作为全楼建造年。1846年机构创建不用于现建筑。',
}]
