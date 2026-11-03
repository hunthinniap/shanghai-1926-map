import type { LandmarkSiteLink } from '../lib/landmarkSites'

const consulate = {
  title: '上海通志 · 外国驻沪使领馆 · 波兰领馆',
  url: 'https://szfz.shtong.gov.cn/difangzhi-front/book/detailNew?bookId=2247&nodeId=103622&oneId=1&parentNodeId=79302&type=-1',
}
const founding = {
  title: '复旦大学 · 何章岑：谦谦学者，温润如玉（2023-07-27）',
  url: 'https://news.fudan.edu.cn/2023/0727/c242a135823/page.htm',
}
const hospital = {
  title: '复旦大学附属眼耳鼻喉科医院 · 院史馆正式开馆（2023-01-30）',
  url: 'https://www.cn-healthcare.com/articlewm/20230130/content-1503753.html',
}
const campus = {
  title: '复旦大学上海医学院 · 眼耳鼻喉科医院院史馆',
  url: 'https://shmc.fudan.edu.cn/2023/1201/c2658a138331/page.htm',
}

export const fenyang83History: LandmarkSiteLink = {
  id: 'fenyang-83-dated-uses',
  canonicalFeatureId: 'landmark-vs-site-413', memberFeatureIds: [],
  expectedBuildingIds: [413, 1716], expectedParkIds: [],
  nameZh: '战时犹太医院',
  aliases: ['波兰公使代办处', '波兰公使馆', '眼耳鼻喉科医院', '复旦大学附属眼耳鼻喉科医院', '复旦大学附属眼耳鼻喉科医院汾阳院区', '汾阳路83号'],
  recordDisplayNames: [{
    sourceRecordId: 1716, expectedName: 'Shanghai Yutase Hospital', expectedAddress: '83 ROUTE PICHON', nameZh: '战时犹太医院',
  }],
  recordDates: [{
    sourceRecordId: 413, expectedName: 'Embassy of Poland', expectedAddress: '83 ROUTE PICHON', year: 1927,
    evidence: { sourceUrl: consulate.url, sourceTitle: consulate.title,
      note: '《上海通志》记载1927年波兰政府在毕勋路（今汾阳路）83号设公使代办处。该年为机构使用史，不是建筑建成年份；总领事馆重设及迁址另有沿革。' },
  }],
  historicalPhases: [
    { id: 'fenyang-83-eye-ent-hospital', name: '眼耳鼻喉科医院（汾阳院址）', address: '汾阳路83号',
      startYear: 1952, endYear: 2001, relationship: 'site-use',
      use: '眼科及耳鼻喉科医疗、教学', sources: [founding, hospital],
      note: '1952年7月1日建院，眼科团队迁至汾阳路83号；建院后数次更名。这里按医院院址范围记述，不将院内全部楼栋与1927年使馆视为同一单体。' },
    { id: 'fenyang-83-fudan-eye-ent-hospital', name: '复旦大学附属眼耳鼻喉科医院（汾阳院区）', address: '汾阳路83号',
      startYear: 2001, relationship: 'site-use', sources: [hospital, campus],
      use: '医院院区', note: '医院自述2001年更为现名；复旦上医资料确认汾阳院区地址为汾阳路83号。' },
  ],
  note: '旧83 ROUTE PICHON对应今汾阳路83号的院址沿革：1927年波兰公使代办处、1942年原库医院记录、1952年眼耳鼻喉科医院建院，2001年改用复旦大学附属眼耳鼻喉科医院现名。旧波兰馆具体楼栋与今院内10号楼的对应尚未核定；同门牌不据此新增同楼合并。',
  sources: [consulate, founding, hospital, campus],
}
