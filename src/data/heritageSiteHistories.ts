import type { CurrentUseSource, NotableResident } from '../types'
import type { HeritageBuildingProperties } from '../lib/heritageBuildings'

interface ReviewedHeritageSiteHistory {
  officialId: string
  expectedName: string
  expectedAddress: string
  buildingName: string
  aliases: string[]
  residents: NotableResident[]
  observations: { year: number; period: string; name: string; note: string; source: CurrentUseSource }[]
}

const yueyang44Residence = {
  title: '上海市文旅推广网／乐游上海 · 岳阳路44号：黄郛旧居（2026-08-27）',
  url: 'https://www1.meet-in-shanghai.net/cn/news/walking-through-1800-meters-of-wutong-streets-and-alleys-we-sought-out-the-hidden-old-villas-on-yueyang-road-and-fenyang-road-602755/',
}
const yueyang44Archive = {
  title: '魅力衡复／周到 · 童年最爱动画片《变形金刚》的译制地，竟然在徐汇！（2018-03-15）',
  url: 'https://static.zhoudaosh.com/files/cnews/2018/20180315/0D98C8854321F9C3B52244841E13EC06694CF1C04C6653194BE51C8D18750520/2.html',
}
const yueyang44Current = {
  title: '上海市文化和旅游局 · 老干部服务中心（2026-08-10）',
  url: 'https://whlyj.sh.gov.cn/zsdw/20151011/0022-30139.html',
}

const histories: ReviewedHeritageSiteHistory[] = [{
  officialId: 'sh-fgj-5D040-01', expectedName: '市文广局老干部活动中心', expectedAddress: '岳阳路44号',
  buildingName: '岳阳路44号花园住宅', aliases: ['黄郛旧居', '黄郛住宅'],
  residents: [{ name: '黄郛', address: '岳阳路44号', sources: [yueyang44Residence],
    note: '官方文旅资料称此处为黄郛旧居；具体居住起讫年份尚未核定。' }],
  observations: [
    { year: 1988, period: '1988年初', name: '上海音像资料馆', source: yueyang44Archive,
      note: '报道记载《变形金刚》在此址地下配音室开始配音；这是该年的使用记录，不是资料馆迁入或成立年份。' },
    { year: 2018, period: '2018年资料记载', name: '市文广局老干部活动中心', source: yueyang44Archive,
      note: '2018年报道记载该建筑由市文广局老干部活动中心使用，未给出启用年份。' },
    { year: 2026, period: '2026年资料记载', name: '上海市文化和旅游局老干部服务中心', source: yueyang44Current,
      note: '市文旅局直属单位介绍登记地址为岳阳路44号；资料发布日期不是机构迁入年份，也不代表该门址全部楼栋仅由此单位使用。' },
  ],
}]

/** Observations document individual years; gaps do not inherit a later tenant. */
export function reviewedHeritageSiteHistoryFor(properties: Pick<HeritageBuildingProperties, 'officialId' | 'officialName' | 'address'>) {
  return histories.find(history => history.officialId === properties.officialId
    && history.expectedName === properties.officialName && history.expectedAddress === properties.address)
}
