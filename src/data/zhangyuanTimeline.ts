import type { HistoricalSitePhase } from '../types'

const opening = { title: '太古地产 · 张园西区焕新揭幕（2022-11-28）', url: 'https://www.swireproperties.com/zh-cn/media/press-releases/2022/20221128_zhangyuan/' }
const community = { title: '静安区 · 还原“张园”生活场景（2021-07-07）', url: 'https://www.jingan.gov.cn/rmtzx/003008/003008006/20210707/ee7d4512-2f31-49d0-8e72-a80a182d7599.html' }
// Site-scale stages, never a claim that the garden buildings became the surviving houses.
export const zhangyuanTimeline: HistoricalSitePhase[] = [
  { id: 'zhangyuan-public-garden', name: "Chang Su Ho's Garden", nameZh: '张园（味莼园）',
    use: '对公众开放的园林、文化娱乐与集会空间', startYear: 1885, endYear: 1918,
    relationship: 'site-use', sources: [opening], note: '按来源所述1885年开放、1918年闭园；不表示现存石库门住宅当时已经建成。' },
  { id: 'zhangyuan-residential-community', name: '张园地块 · 里弄住宅阶段',
    use: '闭园后分割土地、逐步建设里弄与花园住宅，形成居住街坊', startYear: 1918, endYear: 2018,
    relationship: 'site-use', sources: [opening, community], note: '这是从逐步转建到居住街坊的地块阶段，不将1918年当成所有住宅的建成年。' },
  { id: 'zhangyuan-renewal', name: '张园 · 保护更新阶段',
    use: '保护性征收、居民签约及历史建筑修缮更新', startYear: 2018, endYear: 2022,
    relationship: 'site-use', sources: [community, opening], note: '2018年启动保护性征收，2020年最后一户居民完成签约；未把签约时间当成整片搬离完成时间。' },
  { id: 'zhangyuan-west-opening', name: '张园 · 西区开放',
    use: '西区历史建筑活化：商业、展览与公共活动空间', startYear: 2022,
    relationship: 'site-use', sources: [opening], note: '依据2022年11月西区开放报道；只说明西区首期，不推断整片园区已完成，也不保证所选后续年份的具体租户与用途未变。' },
]
