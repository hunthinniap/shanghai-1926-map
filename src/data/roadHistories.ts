import type { HistoricalFeatureProperties } from '../types'

export interface RoadHistoryEvent { year?: number; period?: string; kind: string; name: string; note?: string; url?: string }
export interface RoadNameOrigin { name: string; url: string; description: string; links?: { text: string; url: string }[]; suffix?: string }
interface RoadHistory { modernName: string; historicalNames: string[]; events: RoadHistoryEvent[]; origins?: RoadNameOrigin[]; note?: string }
const wiki = (title: string) => `https://zh.wikipedia.org/wiki/${encodeURIComponent(title)}`
const event = (year: number, kind: string, name: string, title: string, note?: string): RoadHistoryEvent =>
  ({ year, kind, name, url: wiki(title), note })

// Individually read road articles. Match both the modern road and source name:
// the upstream geocoder sometimes attaches one old name to unrelated streets.
export const roadHistories: RoadHistory[] = [
  { modernName: '进贤路', historicalNames: ['Route John Prentice'], events: [
    event(1926, '辟筑', 'Route John Prentice · 普恩济世路', '进贤路'),
    event(1943, '更名', '进贤路', '进贤路'),
  ], origins: [
    { name: 'John Prentice（泼兰的斯）', url: wiki('泼兰的斯'), description: '苏格兰商人；1901—1902年出任', links: [{ text: '上海公共租界工部局', url: wiki('上海公共租界工部局') }], suffix: '总董。普恩济世路以其姓名命名。' },
    { name: '江西省进贤县', url: wiki('进贤县'), description: '1943年更名时采用进贤县名。' },
  ] },
  { modernName: '武康路', historicalNames: ['Route Fergusson', 'Route Ferguson'], events: [
    event(1907, '拓宽、命名', 'Route Ferguson · 福开森路', '武康路_(上海)', '原有土路拓宽铺煤渣并正式命名；不等同于当年首次出现道路。'),
    event(1914, '路段调整', '福开森路', '武康路_(上海)', '原道路东、南段分别改为巨泼来斯路、姚主教路，中段保留原名。'),
    event(1943, '更名', '武康路', '武康路_(上海)'),
  ], origins: [
    { name: 'John Calvin Ferguson（福开森）', url: wiki('福开森'), description: '曾任南洋公学监院，福开森路以其姓名命名。' },
    { name: '武康县', url: wiki('武康县'), description: '1943年改用浙江武康县名。' },
  ] },
  { modernName: '思南路', historicalNames: ['Rue Massenet'], events: [
    event(1914, '辟筑', 'Rue Massenet · 马斯南路', '思南路'),
    event(1943, '更名', '蓝田路', '思南路'),
    { ...event(1946, '更名', '思南路', '思南路'), period: '1946年1月1日' },
  ], origins: [{ name: 'Jules Massenet（儒勒·马斯内）', url: 'https://en.wikipedia.org/wiki/Jules_Massenet', description: '法国作曲家，马斯南路为纪念他而命名。' },
    { name: '思南县', url: wiki('思南县'), description: '现名采用贵州思南县名，也与原名读音相近。' }], note: '参考文件写作1943年直接改名思南路；据道路条目纠正为1943年蓝田路、1946年思南路。' },
  { modernName: '复兴中路', historicalNames: ['Route Lafayette'], events: [
    event(1914, '辟筑', '法华路', '复兴中路', '填南长浜辟路；不是当时已命名辣斐德路。'),
    event(1918, '更名、东延', 'Route Lafayette · 辣斐德路', '复兴中路'),
    event(1943, '更名', '大兴路', '复兴中路'), event(1945, '更名', '复兴中路', '复兴中路'),
  ], note: '采用条目“开辟”正文区分筑路与命名；条目资料框的简略年份不作为整条道路建成年份。' },
  { modernName: '愚园路', historicalNames: ['Yuyuen Road'], events: [
    event(1860, '辟筑早期路段', '军路', '愚园路', '仅指静安寺北侧最东端的一小段，不代表现全路筑成。'),
    event(1899, '命名', '愚园路', '愚园路'),
    event(1911, '西延', '愚园路', '愚园路', '延至忆定盘路。'),
    event(1913, '西延', '愚园路', '愚园路', '续延至白利南路（今长宁路）。'),
  ], origins: [{ name: '愚园', url: wiki('愚园路'), description: '路东端常德路口的私家园林，街道因园得名。' }], note: '参考所列1911年属于西延阶段，不作全路最早辟筑年。' },
  { modernName: '陕西南路', historicalNames: ['Avenue du Roi Albert'], events: [
    event(1911, '辟筑', 'Avenue Paulun · 宝隆路', '陕西南路'),
    event(1915, '更名', 'Avenue du Roi Albert · 亚尔培路', '陕西南路'),
    event(1943, '更名', '咸阳路', '陕西南路'), event(1946, '更名', '陕西南路', '陕西南路'),
  ], origins: [{ name: 'Albert I（阿尔贝一世）', url: 'https://en.wikipedia.org/wiki/Albert_I_of_Belgium', description: '比利时国王，1915年道路采用其名字命名。' }] },
  { modernName: '南昌路', historicalNames: ['Route Vallon'], events: [
    event(1912, '辟筑', 'Route Vallon · 环龙路', '南昌路_(上海)', '雁荡路以西路段，填马义浜修路。'),
    event(1943, '合并、更名', '南昌路', '南昌路_(上海)', '与陶而斐司路统一命名。'),
  ] },
  { modernName: '南昌路', historicalNames: ['Route Dolfus'], events: [
    event(1902, '辟筑', 'Rue des Officies · 军官路', '南昌路_(上海)', '重庆南路至雁荡路段。'),
    event(1920, '更名', 'Route Dolfus · 陶而斐司路', '南昌路_(上海)'),
    event(1943, '合并、更名', '南昌路', '南昌路_(上海)'),
  ] },
  { modernName: '新闸路', historicalNames: ['Sinza Road'], events: [
    event(1862, '辟筑', '新闸路', '新闸路'), event(1868, '铺筑', '新闸路', '新闸路', '西藏路至卡德路段改铺碎石。'),
    event(1908, '西延', '新闸路', '新闸路', '延至胶州路。'),
  ] },
  { modernName: '圆明园路', historicalNames: ['Yuenmingyuen Road'], events: [
    event(1862, '辟筑', '圆明园路', '圆明园路'), event(1865, '命名', '圆明园路', '圆明园路'),
  ], origins: [{ name: '圆明园', url: wiki('圆明园'), description: '道路采用北京圆明园之名。' }] },
]

export function reviewedRoadHistory(p: HistoricalFeatureProperties) {
  return roadHistories.find(h => h.modernName === p.modernNameZh && h.historicalNames.includes(p.historicalName))
}
