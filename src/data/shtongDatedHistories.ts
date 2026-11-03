import type { LandmarkSiteLink } from '../lib/landmarkSites'
import type { ReviewedHeritageUseHistory } from './heritageUseHistories'

const chapter = (title: string, bookId: number, parentNodeId: number, nodeId: number) => ({
  title,
  url: `https://szfz.shtong.gov.cn/difangzhi-front/book/detailNew?oneId=1&bookId=${bookId}&parentNodeId=${parentNodeId}&nodeId=${nodeId}&type=-1`,
})
const concert = chapter('上海名建筑志 · 欧洲古典风格的南京大戏院（上海音乐厅）', 81772, 81784, 108969)
const peaceSouth = chapter('上海名建筑志 · 豪华舒适的汇中饭店（和平饭店南楼）', 81772, 81784, 108926)
const peaceNorth = chapter('上海名建筑志 · 华懋饭店大楼（沙逊大厦、和平饭店北楼）', 81772, 81784, 108927)
const children = chapter('上海名建筑志 · 嘉道理住宅（市少年宫）', 81772, 81786, 109009)
const changning = chapter('上海名建筑志 · 王伯群住宅（长宁区少年宫）', 81772, 81786, 109017)
const churches = chapter('上海宗教志 · 第一节 开放教堂（沐恩堂、景灵堂）', 75195, 75317, 92054)
const courts = chapter('上海审判志 · 江苏上海第一特区地方法院和江苏高等法院第二分院', 81324, 81369, 101239)
const waterworks = chapter('上海公用事业志 · 第一节 杨树浦水厂', 4516, 55091, 42325)
const xiejin = chapter('静安区志 · 第三节 基督教（协进中学用址记录）', 4412, 62337, 7728)

/** Verified on 2026-11-01–02 against full chapters; dates refer to use or naming, never catalogue publication. */
export const shtongHeritageUseHistories: ReviewedHeritageUseHistory[] = [
  { officialId: 'sh-fgj-1A012-01', expectedName: '南京大戏院', expectedAddress: '延安东路523号',
    name: '上海音乐厅', year: 1959, period: '1959年',
    note: '方志记1959年改建舞台、乐池并改名上海音乐厅；这是用途与名称沿革，不是1930年建造年代。其后文革时期曾改名，未据此认定名称一直未变。',
    sourceTitle: concert.title, sourceUrl: concert.url },
  { officialId: 'sh-fgj-1A005-01', expectedName: '汇中饭店', expectedAddress: '中山东一路19号',
    name: '和平饭店南楼', year: 1965, period: '1965年',
    note: '方志记汇中饭店1952年歇业后由市建工局使用，1965年改为和平饭店南楼；南楼与北楼分别核年。',
    sourceTitle: peaceSouth.title, sourceUrl: peaceSouth.url },
  { officialId: 'sh-fgj-1A006-01', expectedName: '沙逊大厦', expectedAddress: '中山东一路20号',
    name: '和平饭店北楼', year: 1956, period: '1956年',
    note: '方志记原华懋饭店1956年恢复饭店业务并改名和平饭店，所指为今北楼；不把南楼1965年的改称时间混为同一年，也不声称北楼后缀在1956年已正式使用。',
    sourceTitle: peaceNorth.title, sourceUrl: peaceNorth.url },
  { officialId: 'sh-fgj-1B005-01', expectedName: '嘉道理爵士住宅', expectedAddress: '延安西路64号',
    name: '市少年宫', year: 1953, period: '1953年',
    note: '方志记1953年少儿图书馆和少儿文化馆合并并迁入中国福利会少年宫；该年可证此址少年宫使用，不以住宅的建造年代代替机构沿革。',
    sourceTitle: children.title, sourceUrl: children.url },
  { officialId: 'sh-fgj-1M007-01', expectedName: '王伯群住宅', expectedAddress: '愚园路1136弄31号',
    name: '长宁区少年宫', year: 1960, period: '1960年1月1日',
    note: '方志记1960年元旦长宁区少年宫在这座原王伯群住宅内成立；不是1934年的住宅建造年。',
    sourceTitle: changning.title, sourceUrl: changning.url },
  { officialId: 'sh-fgj-1A018-01', expectedName: '基督教慕尔堂', expectedAddress: '西藏中路316号',
    name: '沐恩堂', year: 1958, period: '1958年',
    note: '《上海宗教志》记1958年慕尔堂成为黄浦区联合礼拜场所，同年改名沐恩堂；原堂1931年落成是另一事件。',
    sourceTitle: churches.title, sourceUrl: churches.url },
  { officialId: 'sh-fgj-2F010-01', expectedName: '景灵堂', expectedAddress: '昆山路135号',
    name: '景灵堂', year: 1980, period: '1980年9月',
    note: '《上海宗教志》记1979年先在武进路沪北会堂恢复礼拜，1980年9月迁回昆山路原景林堂并改名景灵堂；不把1979年的异址复堂当作此址复用。',
    sourceTitle: churches.title, sourceUrl: churches.url },
]

const datedRecord = (sourceRecordId: number, expectedName: string, expectedAddress: string, year: number,
  source: { title: string; url: string }, note: string) => ({ sourceRecordId, expectedName, expectedAddress, year, onlyIfUndated: true,
  evidence: { sourceTitle: source.title, sourceUrl: source.url, note } })

/** These four existing map features retain their IDs, source records, geometry and group membership. */
export const shtongLandmarkDateHistories: LandmarkSiteLink[] = [
  { id: 'shtong-unknown-court-records', canonicalFeatureId: 'landmark-vs-site-776', memberFeatureIds: [],
    expectedBuildingIds: [776, 777], expectedParkIds: [],
    recordDates: [
      datedRecord(776, 'Shanghai First Special Area Court of Justice', '191 NORTH CHEKIANG ROAD', 1931, courts,
        '方志记北浙江路191号法院1930年成立时名为江苏上海特区地方法院，1931年8月1日改称第一特区地方法院。此条按名称沿革补1931年，不把该名提前到1930年。'),
      datedRecord(777, 'Jiangsu Provincial Supreme Court - Branch No. 2', '191 NORTH CHEKIANG ROAD', 1930, courts,
        '《上海审判志》记1930年4月1日江苏高等法院第二分院成立，院址北浙江路191号；该年是机构在此使用记录，不是建筑建造年。'),
    ], sources: [courts], note: '方志独立记载北浙江路191号两院的机构与名称沿革：高等法院第二分院1930年成立，第一特区地方法院之名1931年起使用。原始Virtual Shanghai记录与点位保留。' },
  { id: 'shtong-unknown-xiejin-record', canonicalFeatureId: 'landmark-vs-site-1076', memberFeatureIds: [],
    expectedBuildingIds: [1076], expectedParkIds: [],
    recordDates: [datedRecord(1076, 'Xiejin Kindergarten, Primary and Junior High School', '1550 BUBBLING WELL ROAD', 1937, xiejin,
      '《静安区志》记1937年5月闽南堂借用静安寺路（今南京西路）1550号协进中学。可证该年学校使用此址，未据此补学校创办年；方志未逐一说明小学、幼稚园部的开设时间。')],
    sources: [xiejin], note: '1937年南京西路1550号协进中学用址由《静安区志》明确门牌支持；不外推各学部始创年，也不将今使用单位倒填为1937年的用途。' },
  { id: 'shtong-unknown-waterworks-record', canonicalFeatureId: 'landmark-vs-site-4107', memberFeatureIds: [],
    expectedBuildingIds: [4107], expectedParkIds: [],
    recordDates: [datedRecord(4107, 'Shanghai Waterworks', '830 YANGTSZEPOO ROAD', 1883, waterworks,
      '《上海公用事业志》明确厂址杨树浦路830号，1881年动工、1883年竣工并于当年8月1日正式供水。补1883年水厂启用记录，不代表厂区所有现存楼栋均建于该年。')],
    sources: [waterworks], note: '杨树浦水厂在杨树浦路830号于1883年正式供水；这是厂址与机构运行的沿革，不是逐栋建造结论。' },
  { id: 'shtong-unknown-jinglin-record', canonicalFeatureId: 'landmark-vs-site-1648', memberFeatureIds: [],
    expectedBuildingIds: [1648], expectedParkIds: [],
    recordDates: [datedRecord(1648, 'Jinglintang', '135 KUNSHAN ROAD', 1924, churches,
      '《上海宗教志·开放教堂》记昆山路135号景林堂于民国13年（1924年）落成。此处按新堂落成后的使用记录补年，不把1882年中西书院内前身礼拜站的创设套到这栋新堂。另一人物章节提1922年建造，未据此改写落成时间。')],
    sources: [churches], note: '昆山路135号景林堂新堂1924年落成；1980年9月迁回并改名景灵堂。机构前身与异址复堂分别记述，原库景林堂名称保留。' },
]
