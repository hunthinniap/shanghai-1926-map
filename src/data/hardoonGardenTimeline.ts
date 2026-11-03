import type { HistoricalSitePhase } from '../types'

const construction = {
  title: '静安区 · 上海展览中心“上展往事”（2021-12-29）',
  url: 'https://www.jingan.gov.cn/rmtzx/003008/003008005/20211229/db013d58-577f-4d15-bff6-4b041f1b4b26.html',
}
const names = {
  title: '上海市文旅推广网 · 上海书展主会场的往事（1968、1984年更名）',
  url: 'https://www.meet-in-shanghai.net/cn/news/the-main-venue-of-the-shanghai-book-fair-for-more-than-ten-years-do-you-know-its-past-122718/',
}

// The site's existing records retain the early Hardoon Garden name and years.
// Only the later documented redevelopment/naming stages are added here.
export const hardoonGardenTimeline: HistoricalSitePhase[] = [
  { id: 'hardoon-site-exhibition-construction', name: '中苏友好大厦（建设中）',
    use: '在爱俪园／哈同花园旧址建设展览大厦', startYear: 1954, endYear: 1955,
    relationship: 'site-use', sources: [construction],
    note: '1954年在旧园废墟上开工，不将旧花园与后来展览建筑当作同一栋建筑。' },
  { id: 'sino-soviet-friendship-building', name: '中苏友好大厦',
    use: '展览、会议与大型活动场所', startYear: 1955, endYear: 1968,
    relationship: 'replacement-building', buildingId: 'sh-fgj-4B001-01', sources: [construction, names],
    note: '1955年建成；这是哈同花园旧址上的新建筑群，不代表原花园建筑改名。' },
  { id: 'shanghai-exhibition-hall', name: '上海展览馆',
    use: '展览、会议与大型活动场所', startYear: 1968, endYear: 1984,
    relationship: 'same-building', buildingId: 'sh-fgj-4B001-01', sources: [names],
    note: '1968年中苏友好大厦改称上海展览馆。' },
  { id: 'shanghai-exhibition-centre', name: '上海展览中心',
    use: '会议、展览、会展服务及大型活动场所', startYear: 1984,
    relationship: 'same-building', buildingId: 'sh-fgj-4B001-01', sources: [names, construction],
    note: '1984年起使用现名；中苏友好大厦保留为历史名称与优秀历史建筑名录名称。' },
]
