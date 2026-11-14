import type { CurrentUseSource, HistoricalSitePhase } from '../types'

// Reviewed 2026-11-14. Years describe names/site uses, not individual buildings.
// Unresolved intermediate names are tracked in research/park-histories/2026-11-14.md.
type Milestone = [year: number, name: string, nameZh?: string]
function history(id: string, sources: CurrentUseSource[], rows: Milestone[]): HistoricalSitePhase[] {
  return rows.map(([startYear, name, nameZh], index) => ({
    id: `park-history-${id}-${startYear}`, name, nameZh, startYear,
    endYear: rows[index + 1]?.[0], relationship: 'site-use', sources,
  }))
}
const source = (title: string, url: string): CurrentUseSource => ({ title, url })

export const reviewedParkHistories: Record<string, HistoricalSitePhase[]> = {
  'park-paul-brunat-square': history('nie-er', [source('维基百科：上海聂耳音乐广场（园史及历次名称）',
    'https://zh.wikipedia.org/w/index.php?oldid=93554319')], [
    [1924, 'Square Paul Brunat', '宝昌公园'], [1943, '迪化公园'],
    [1954, '乌鲁木齐路儿童公园'], [1992, '聂耳音乐广场'],
  ]),
  'park-french-park': history('fuxing', [source('上海黄浦：复兴公园沿革',
    'https://sghexport.shobserver.com/html/baijiahao/2023/10/06/1143025.html')], [
    [1909, 'Parc français', '顾家宅公园（法国公园）'], [1944, '大兴公园'], [1946, '复兴公园'],
  ]),
  'park-parc-ravinel': history('xiangyang', [source('新民晚报：打卡襄阳公园',
    'https://paper.xinmin.cn/html/xmwb/2023-08-09/15/166679.html')], [
    [1942, 'Parc Ravinel', '兰维纳公园'], [1943, '泰山公园'], [1946, '林森公园'], [1950, '襄阳公园'],
  ]),
  'park-edan-park': history('hengshan', [source('徐汇区：衡山公园古树与沿革',
    'https://www.xuhui.gov.cn/xwzx_zwxx/20250417/555537.html')], [
    [1926, 'Parc Pétain', '贝当公园'], [1943, '衡山公园'],
  ]),
  'park-jessfield-park': history('zhongshan', [source('长宁区历史变迁：民国3年（注明民国33年更名）',
    'https://www.shcn.gov.cn/col7000/20110817/720735.html')], [
    [1914, 'Jessfield Park', '兆丰公园'], [1944, '中山公园'],
  ]),
  'park-public-gardens': history('huangpu', [source('上海市人民英雄纪念塔背后的故事：公园更名',
    'https://m.thepaper.cn/newsDetail_forward_12861470')], [
    [1868, 'Public Gardens', '公共花园'], [1936, '外滩公园'], [1945, '春申公园'], [1946, '黄浦公园'],
  ]),
  'park-hongkew-park': history('luxun', [
    source('虹口区：鲁迅公园始建、开放及更名', 'https://www.shhk.gov.cn/qyfwy/030002/030002002/030002002005/20250215/74e3afa7-144b-422c-9f5d-1608d530d89c.html'),
    source('澎湃：踏访鲁迅足迹（1951年复名）', 'https://m.thepaper.cn/newsDetail_forward_14660474'),
  ], [[1905, '新娱乐场（靶子场公园）'], [1922, 'Hongkew Park', '虹口公园'],
    [1945, '中正公园'], [1951, '虹口公园'], [1988, '鲁迅公园']]),
  'park-race-course-north': history('renmin-park', [source('上海黄浦：人民公园1952年开放',
    'https://m.thepaper.cn/newsDetail_forward_24919227')], [
    [1862, 'Race Course', '跑马厅'], [1952, '人民公园'],
  ]),
  'park-race-course-south': history('renmin-square', [
    source('上海黄浦：第三跑马场开辟', 'https://m.thepaper.cn/newsDetail_forward_24919227'),
    source('上海党史网：1951年人民广场辟建典礼', 'https://www.ccphistory.org.cn/shds/shhm/content/62d68333-943c-4092-bf8a-1c809a7727ab.html'),
  ], [[1862, 'Race Course', '跑马厅'], [1951, '人民广场']]),
  'park-studley-park': history('huoshan', [source('上海市文旅推广网：霍山公园',
    'https://www.meet-in-shanghai.net/cn/district-level-cultural-relics-protection-unit/huoshan-park-403297/')], [
    [1917, 'Studley Park', '司德来公园'], [1944, '霍山公园'],
  ]),
  'park-xu-guangqi-tomb': history('guangqi', [
    source('徐汇区：徐光启墓1903年重修，1978、1983年公园更名', 'https://www.xuhui.gov.cn/xwzx_bmlf/20210514/286635.html'),
    source('人民网：1978年辟为南丹公园', 'https://sh.people.com.cn/n2/2026/0821/c350122-41674489.html'),
    source('上海徐汇：1983年改名光启公园', 'https://sghexport.shobserver.com/html/baijiahao/2022/01/12/632910.html'),
  ], [[1903, "Hsü Kuang-ch'i's Tomb", '徐光启墓'], [1978, '南丹公园'], [1983, '光启公园']]),
  'park-international-cemetery': history('songqingling', [source('宋庆龄陵园官网：1916年万国公墓、1984年陵园成立',
    'https://www.shsoongching-ling.com/p-gk_about.html')], [
    [1916, 'International Cemetery', '万国公墓'], [1984, '宋庆龄陵园'],
  ]),
  'park-huang-family-garden': history('guilin', [source('徐汇区：桂林公园始建、整修及开放',
    'https://www.xuhui.gov.cn/xwzx_bmlf/20260723/575348.html')], [
    [1931, 'Huang Family Garden', '黄家花园'], [1957, '桂林公园'],
  ]),
  'park-junpu-athletic-club': history('fuxing-island', [source('上海党史网：浚浦局体育会花园改为复兴岛公园',
    'https://www.ccphistory.org.cn/shds/ssjc/content/a3a1ed51-92d6-49d5-b1f3-5f11309e991f.html')], [
    [1930, 'Whangpoo Conservancy Board Club', '浚浦局体育会'], [1951, '复兴岛公园'],
  ]),
  'park-tsao-family-garden': history('caoxi', [
    source('上海发布：曹家花园1931年始建、1935年落成', 'https://www.thepaper.cn/newsDetail_forward_13836595'),
    source('上观新闻：1958年定名漕溪公园', 'https://www.jfdaily.com.cn/wx/detail.do?id=889084'),
  ], [[1931, 'Tsao Family Garden', '曹家花园'], [1958, '漕溪公园']]),
  'park-yu-garden': history('yuyuan', [source('豫园官网：园史',
    'https://www.yugarden.com.cn/page/articleview/history-scenery.html')], [[1559, 'Yu Garden', '豫园']]),
  'park-canidrome': history('canidrome', [source('新民晚报：1952年4月人民文化广场，同年11月正式命名文化广场',
    'https://paper.xinmin.cn/html/xmwb/2022-09-26/11/145880.html')], [
    [1928, 'Le Canidrome', '逸园跑狗场'], [1952, '文化广场'],
  ]),
  'park-tatung-school-grounds': history('penglai', [source('人民网：蓬莱公园1953年建造，原址为战毁的大同大学部分校园',
    'https://house.people.com.cn/n1/2017/0910/c164220-29526016.html')], [
    [1928, 'Tatung School Grounds', '大同大学校园'], [1937, '大同大学旧址'], [1953, '蓬莱公园'],
  ]),
}
