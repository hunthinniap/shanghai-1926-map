// Read-only audit; production categories are derived by build-heritage-historical-uses.mjs.
// Run: node research/rechecks/audit-heritage-display-categories.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { Converter } from 'opencc-js'

const root = fileURLToPath(new URL('../../', import.meta.url))
const paths = {
  official: 'public/data/shanghai-excellent-historical-buildings/buildings.json',
  enriched: 'public/data/shanghai-excellent-historical-buildings/buildings-enriched.json',
  mapped: 'public/data/shanghai-excellent-historical-buildings/map-buildings.geojson',
  vs: 'scripts/data/virtual-shanghai-buildings-live.json',
  links: 'src/data/heritageLandmarkLinks.ts',
}
const texts = Object.fromEntries(Object.entries(paths).map(([key, p]) => [key, fs.readFileSync(path.join(root, p), 'utf8')]))
const official = JSON.parse(texts.official).records
const enriched = new Map(JSON.parse(texts.enriched).records.map(r => [r.id, r]))
const mappedIds = new Set(JSON.parse(texts.mapped).features.map(f => f.properties.officialId))
const vs = new Map(JSON.parse(texts.vs).records.map(r => [r.id, r]))
// This generated TypeScript data file contains a JSON array, not executable rules.
assert(texts.links.includes('= ['))
const links = JSON.parse(texts.links.slice(texts.links.indexOf('= [') + 2).trim().replace(/;$/, ''))
const cn = Converter({ from: 't', to: 'cn' })
const normal = s => cn(s ?? '').replace(/\s+/g, '').toLowerCase()
const unique = xs => [...new Set(xs)]
const categories = [
  ['residential', '住宅'], ['education', '教育文化'], ['medical', '医疗'],
  ['commerce', '商业与会馆'], ['industrial', '工业'], ['religion', '宗教'],
  ['parks', '公园与墓园'], ['recreation', '文娱体育'], ['public', '公共机构'], ['transport', '交通'],
].map(([id, label]) => ({ id, label }))
const labels = Object.fromEntries(categories.map(c => [c.id, c.label]))
const yearNumbers = value => [...String(value ?? '').matchAll(/\b(1[6-9]\d{2}|20\d{2})/g)].map(m => Number(m[1]))
const categorySymbols = { residential: '住', education: '教', medical: '医', commerce: '商', industrial: '工',
  religion: '宗', parks: '园', recreation: '娱', public: '公', transport: '交' }

function textCategories(value) {
  const text = normal(value)
  if (!text || /^(待考|不详|未知|办公|大楼|建筑)$/.test(text)) return []
  // Campus descriptors after a colon list component functions, not rival site identities.
  if (/大学.*建筑群[:：]|大学[:：]/.test(text)) return ['education']
  const parts = text.split(/[\/、，,；;\n]/).filter(Boolean)
  return unique(parts.flatMap(part => {
    // The building's use overrides its owner's sector: bank apartments, factory
    // dormitories and consular residences remain residences.
    if (/住宅|公寓|别墅|别业|宿舍|职员工房|职工工房|官邸|私邸|公馆|民居|民宅|里弄|弄堂|小筑|新村|旧居|故居|宅第|宅院|\S宅$/.test(part)) {
      if (/教堂及宿舍/.test(part)) return ['religion', 'residential']
      if (/商铺及住宅|商铺民宅/.test(part)) return ['commerce', 'residential']
      return ['residential']
    }
    if (/大学|学院|学堂|学校|中学|小学|女中|公学|党校|书院|图书馆|藏书楼|博物馆|博物院|美术馆|科学馆|研究院|研究所|实验馆|观象台|天文台|气象台|教育评估院|教学楼|毓秀楼|熊佛西楼/.test(part)) return ['education']
    if (/医院|病院|诊所|疗养院|疗养所|治疗所|保健院|化验所/.test(part)) return ['medical']
    if (/教堂|天主堂|礼拜堂|圣母堂|圣母院|修道院|清真寺|祠堂|若瑟堂|怀恩堂|安息堂|望德堂|恩德堂|花神堂|西摩路会堂|(?:寺|庵|庙)(?:$|[）)])|耶稣|基督教|信义会|浸信会/.test(part)
      && !/青年会|青年协会/.test(part)) return ['religion']
    if (/纱厂|船厂|电厂|水厂|煤气公司|烟草公司|纺织公司|印务公司|工厂|厂房|制造厂|印刷厂|制药厂|打包厂|绒线厂|面粉厂|汽水厂|处理厂|造币厂|制品厂|花厂|花边厂|织造厂|仓库|粮仓|货栈|栈房|宰牲场|屠宰场|制造局|弹药局/.test(part)) return ['industrial']
    if (/码头|铁路|火车站|机场|电车公司|信号台|瞭望塔|海事塔/.test(part) || /(?:路桥|渡桥)$/.test(part)) return ['transport']
    if (/巡捕|捕房|警察|警署|公安|监狱|政府|县署|公董局|工部局|法公董|领事|领馆|使馆|军营|兵营|驻地|司令|救火会|消防|警钟楼|江海关|海关|南关|税局|纪委|法院|区委|管理局|邮局|邮政|邮电|电报局|电话局|电话公司|电缆登陆局|区公所/.test(part)) return ['public']
    if (/戏院|剧院|电影院|影戏院|舞厅|舞台|音乐厅|游乐场|体育场|运动场|跑马|俱乐部|会所|总会|青年会|青年协会|联谊会|艺术中心|活动中心/.test(part)
      && !/商会|公会|共济会/.test(part)) return ['recreation']
    if (/银行|bankof|保险|储蓄|钱庄|信托|洋行|商会|会馆|公会|共济会|钱业公所|交易所|商场|商铺|百货|饭店|酒店|酒楼|旅馆|旅社|茶馆|食府|书局|书店|报馆|报社|日报|西报|出版|绸缎局|米行|花行|南货店|熟食店|皮鞋店|银楼|地产公司|邮船|汽船|供应站|公司总部|公司办公楼/.test(part)) return ['commerce']
    // Lane-name morphology is useful but still a candidate, not historical verification.
    if (/(?:里|坊|邨|村|胡同|衖|庐|邸|别墅|庄园|精舍)$/.test(part) || /(?:丁香|黄家|严家|杨氏|盛世|宏业|福世|愉|蒲|丽波|美丽|扆虹|丁家)花?园/.test(part)) return ['residential']
    if (/公司|商行|实业|总部/.test(part)) return ['commerce']
    if (/公园|墓园|公墓|陵园|墓地/.test(part)) return ['parks']
    return []
  }))
}

function vsCategories(record) {
  const t = record.types ?? {}
  // Sub-type is essential: Institutional site is not synonymous with a hospital.
  if (t.TYP02 === 'Museum building' || t.TYP02 === 'Library building' || t.TYP02 === 'Research facility') return ['education']
  if (t.TYP02 === 'Medical facility') return ['medical']
  if (t.TYP02 === 'Welfare facility' || t.TYP02 === 'Correctional facility') return ['public']
  if (t.TYP02 === 'Native-place association' || t.TYP02 === 'Professional association') return ['commerce']
  if (t.TYP01 === 'Recreational facility' && ['Park', 'Garden', 'Zoo', 'Parkway'].includes(t.TYP03)) return ['parks']
  if (t.TYP01 === 'Community facility') {
    if (t.TYP02 === 'Benevolent association') return ['public']
    return textCategories([record.nameZh, record.name].filter(Boolean).join('/'))
  }
  const direct = {
    'Educational facility': 'education', 'Commercial establishment': 'commerce',
    'Recreational facility': 'recreation', 'Religious facility': 'religion',
    'Residential site': 'residential', 'Administrative facility': 'public',
    'Industrial site': 'industrial', 'Military facility': 'public',
    'Transportation features': 'transport', 'Diplomatic representation': 'public',
    'Merchant organization': 'commerce', 'Agricultural site': 'industrial',
  }
  if (t.TYP01 === 'Site of memory') return [t.TYP02 === 'Cemetery' ? 'parks' : 'public']
  if (t.TYP01 === 'Information & communication') return [t.TYP02 === 'Newspaper' ? 'commerce' : 'public']
  return direct[t.TYP01] ? [direct[t.TYP01]] : []
}

// Explicit local-evidence review decisions are added here only after inspecting
// the corresponding record. A listed present-day tenant alone is never evidence.
const reviewed = new Map([
  ['sh-fgj-4B001-01', { categories: ['parks'], displayCategory: 'parks', basis: 'reviewed-historical-site-predecessor', historicalUseVerified: true, historicalSiteName: '哈同花园／爱俪园', note: '按用户指定的同址历史卡口径显示哈同花园的园林用途。1955年中苏友好大厦为后建建筑；“公园与墓园”不表示现存大厦曾作公园，也不表示旧园全境等于现楼占地。', evidence: ['https://expo.sww.sh.gov.cn/browser/detail.jspx?code=402881e144722a710144727790b70000', paths.links] }],
  ['sh-fgj-5D092-01', { categories: ['transport'], displayCategory: 'transport', basis: 'reviewed-former-infrastructure', historicalUseVerified: true, historicalSiteName: '北票码头煤炭装卸设施', note: '龙美术馆西岸馆选址原北票码头，保留的煤漏斗属于码头工业运输遗存。采用“交通”而非今天的美术馆用途；1929年建码头，不能标成1928年已存在。', evidence: ['https://www.westbund.com/cn/index/NEWS-CENTER/_-194.html', 'https://whlyj.sh.gov.cn/gqfc/20250521/6cd8a6e351814965b9b5f1cd515994d6.html'] }],
  ['sh-fgj-5D093-01', { categories: ['transport'], displayCategory: 'transport', basis: 'reviewed-former-airport-hangar', historicalUseVerified: true, historicalSiteName: '龙华机场机库', note: '丰谷路35号旧馆由原龙华机场机库改造，采用机库的交通用途，不采用今天的美术馆用途；2023年迁往青浦的是机构，不移动本保护建筑点。', evidence: ['https://www.shanghai.gov.cn/qpwl/20260616/1dd806ba37b945ef8c57cfc61afd8dd5.html', 'https://www.westbund.com/cn/index/NEWS-CENTER/1-5.html'] }],
  ['sh-fgj-5D114-01', { categories: ['industrial'], displayCategory: 'industrial', basis: 'reviewed-former-factory-workshop', historicalUseVerified: true, historicalSiteName: '上海飞机制造厂冲压车间', note: '西岸艺术中心是现在用途；保护厂房前身为上海飞机制造厂冲压车间，按历史厂房归“工业”。这项分类不声称厂房在1928年已经存在。', evidence: ['https://www.westbund.com/cn/index/KEY-PROJECTS/detail_41bE6.html', 'https://whlyj.sh.gov.cn/gqfc/20250521/6cd8a6e351814965b9b5f1cd515994d6.html', 'https://zh.wikipedia.org/wiki/上海飞机制造'] }],
  ['sh-fgj-4G010-01', { categories: ['parks', 'medical'], displayCategory: 'parks', basis: 'reviewed-historical-site-use-sequence', historicalUseVerified: true, historicalSiteName: '叶家花园 → 澄衷肺病疗养院', stages: [{ description: '1923年春初步建成开放的游赏花园', category: 'parks' }, { description: '1933年捐建澄衷肺病疗养院，医疗用途属于后续阶段；捐赠年不等于精确开诊年', category: 'medical' }], note: '保留两个历史阶段；地图主图标采用最初的园林用途。名录保护小白楼，不把整园各阶段等同每栋楼的室内功能。', evidence: ['https://csm.sse.com.cn/news/list/c/5735631.shtml', paths.links] }],
  ['sh-fgj-4G006-01', { categories: ['education'], displayCategory: 'education', basis: 'reviewed-historical-campus-components', historicalUseVerified: true, flags: ['mixed-component-dates'], historicalSiteName: '日本学校旧校舍／同济大学教学建筑', note: '建筑群含1940年代日本学校校舍，也含1950年代后建文远楼等；不同年代的建筑主功能均属教育。不能把整个校园当作单栋建筑。', evidence: ['https://caup.tongji.edu.cn/b6/8c/c33419a308876/page.htm', paths.enriched] }],
  ['sh-fgj-5N002-01', { categories: ['education'], displayCategory: 'education', basis: 'reviewed-historical-campus-components', historicalUseVerified: true, flags: ['component-scope-needs-review'], historicalSiteName: '大夏附中／大夏大学旧校舍', note: '东、西楼1934年作大夏附中教学楼和学生宿舍，1946年转为大夏大学化学馆、土木馆，校址主功能归教育；中楼具体前身仍需分栋核定。', evidence: ['https://jjc.ecnu.edu.cn/5f/2e/c19424a220974/page.htm'] }],
  ['sh-fgj-4F009-01', { categories: ['commerce'], basis: 'reviewed-publisher-scope', note: '本地 articleReferences.scope.reason 明确英华书馆是出版机构；不因书馆二字归学校。', evidence: [paths.enriched] }],
  ['sh-fgj-4M009-01', { categories: ['residential'], basis: 'official-name-dated-stage-filter', note: '名录明确职工医院始于1976年，排除此后期功能；银行高级职员住宅为前期住宅候选，未另行核定民国使用起止年。', excludedLaterUses: ['上海房地局职工医院（1976年起）'], evidence: [paths.official] }],
  ['sh-fgj-4M039-01', { categories: ['residential'], basis: 'official-name-dated-stage-filter', note: '陈氏花园住宅为前期候选；名录1956年、1972年医院阶段不用于民国分类，最后一项防治院未标年代亦不倒填。', excludedLaterUses: ['上海血吸虫病院（1956年）', '上海寄生虫病院（1972年）'], evidence: [paths.official] }],
  ['sh-fgj-5B044-01', { categories: ['religion'], displayCategory: 'religion', basis: 'reviewed-original-institution-use', historicalUseVerified: true, historicalSiteName: '基督教内地会总部', note: '1920年购地建设内地会总部；六院1956年才迁入，不能把医院当作建筑原用途。总部还含办公、住宿等构件，主图标按宗教机构。', excludedLaterUses: ['1956年迁入的上海市第六人民医院'], evidence: ['https://edu.sh.gov.cn/xwzx_bsxw/20040517/0015-xw_14550.html', 'https://zh.wikipedia.org/wiki/中国内地会总部大楼', paths.links] }],
  ['sh-fgj-5M002-01', { categories: ['residential'], basis: 'historical-name-with-later-tenants', flags: ['source-name-period-needs-review'], note: '朱学仁住宅作为早期功能候选；长宁区委党校、区人民法院不能直接当民国机构，具体使用阶段待补。', evidence: [paths.official] }],
  ['sh-fgj-5N001-01', { categories: ['medical', 'residential', 'industrial'], basis: 'official-name-dated-stage-filter', flags: ['source-name-period-needs-review'], note: '保留20世纪初英国医院、1940年代陈楚湘住宅、1943年大中化学化工厂的分期线索；早期医院是否延续至1912年后还需核实。1982年及1990年代学校明确排除。', excludedLaterUses: ['南林师范学校（1982年）', '中山北路第八小学（1990年代）'], evidence: [paths.official] }],
  ['sh-fgj-5R001-01', { categories: ['residential', 'public', 'industrial'], displayCategory: 'residential', basis: 'historical-use-sequence', note: '名录列倪葆生住宅、志愿军驻地、粮管所粮仓三个阶段；主图标采用最初住宅用途，后续用途在卡片保留。', evidence: [paths.official] }],
  ['sh-fgj-5Y002-01', { categories: ['residential'], displayCategory: 'residential', basis: 'historic-building-former-use', note: '保护对象首先是陈舜俞故居，枫泾民俗博物馆为后续活化用途；按故居归住宅。人物时代不等于现存建筑使用年代，卡片仍须区分。', evidence: [paths.official] }],
  ['sh-fgj-4N001-01', { categories: ['residential'], displayCategory: 'residential', basis: 'reviewed-original-housing-use', historicalUseVerified: true, note: '曹杨一村1951—1952年建设为工人住宅区，按历史原用途归住宅；它不是1928年地标。', evidence: ['https://www.shpt.gov.cn/gtj-zfbm/tpxinwen-gtj/20251126/965414.html'] }],
  ['sh-fgj-4G007-01', { categories: ['residential', 'recreation'], displayCategory: 'residential', basis: 'official-component-functions', note: '同济新村主体为教工住宅，另含教工俱乐部；主图标用住宅，卡片保留俱乐部的文娱体育功能。', evidence: [paths.official, paths.enriched] }],
  ['sh-fgj-4G009-01', { categories: ['education'], displayCategory: 'education', basis: 'reviewed-original-teaching-use', historicalUseVerified: true, historicalSiteName: '硅经教验楼／教学楼', note: '毓秀楼1953年建成，原作教学楼；采用教育类别，不因建造年代晚于民国而删除。', evidence: ['https://blog.sina.com.cn/s/blog_5d1bdf480102w4u7.html', paths.official] }],
  ['sh-fgj-5D040-01', { categories: ['residential'], displayCategory: 'residential', basis: 'reviewed-former-residence', historicalUseVerified: true, historicalSiteName: '黄郛旧居', note: '市文广局老干部活动中心为后续使用；1927年建筑原为花园住宅，曾为黄郛私邸。', evidence: ['https://www1.meet-in-shanghai.net/cn/news/walking-through-1800-meters-of-wutong-streets-and-alleys-we-sought-out-the-hidden-old-villas-on-yueyang-road-and-fenyang-road-602755/'] }],
  ['sh-fgj-5D042-01', { categories: ['residential'], displayCategory: 'residential', basis: 'reviewed-former-residence', historicalUseVerified: true, historicalSiteName: '比必夫人住宅', note: '上海戏曲艺术中心为后续使用；1号楼1921年原为比必夫妇私人花园住宅，后亦为周信芳旧居。', evidence: ['https://www.guocuijingju.com/wap/news_detail.php?id=20738'] }],
  ['sh-fgj-5D078-01', { categories: ['residential'], displayCategory: 'residential', basis: 'reviewed-building-survey-use', historicalUseVerified: true, historicalSiteName: '宛平路7号住宅', note: '中共上海市纪委是现使用单位；第三次文物普查登记其为民国住宅，1927年建。', evidence: ['https://blog.sina.com.cn/s/blog_5d1bdf480101eox5.html'] }],
  ['sh-fgj-5D079-01', { categories: ['commerce', 'residential'], displayCategory: 'commerce', basis: 'reviewed-former-company-and-villa-use', note: '教育评估院是现使用单位；资料记载原为美商普益地产公司旧址，建筑形态为花园住宅，故保留商业与住宅两项，主图标按原使用单位取商业。', evidence: ['https://blog.sina.com.cn/s/blog_8001328c010305pl.html'] }],
  ['sh-fgj-5D085-01', { categories: ['residential'], displayCategory: 'residential', basis: 'reviewed-former-residence', historicalUseVerified: true, historicalSiteName: '马勒家族住宅／上海自然科学研究所所长住宅', note: '现14号楼最初为马勒家族私人住宅，后成为研究所所长住宅；不按今天中科院办公归教育。', evidence: ['https://www.kankanews.com/detail/Gr21Y871D2e'] }],
  ['sh-fgj-5D086-01', { categories: ['education'], displayCategory: 'education', basis: 'historical-research-campus-use', flags: ['component-scope-needs-review'], note: '5号楼位于原上海自然科学研究所／中央研究院科研园区，暂按科研教育功能；尚缺该单体最早用途的独立资料。', evidence: ['https://ihb.cas.cn/jggk/sshg/202011/t20201106_5740935.html', paths.official] }],
  ['sh-fgj-5D113-01', { categories: ['education'], displayCategory: 'education', basis: 'reviewed-original-teaching-use', historicalUseVerified: true, historicalSiteName: '上海总工会干部学校教学楼', note: '上海应用技术学院是后续校名；建筑1955年作为干部学校主教学楼建成，归教育。', evidence: ['https://www.sit.edu.cn/info/2251/157301.htm'] }],
  ['sh-fgj-5M017-01', { categories: ['residential'], displayCategory: 'residential', basis: 'official-listed-historic-form', note: '长宁区机关事务管理局是原表混合列中的机构名；同一官方表将现使用列记为住宅，建筑为1930年代两层住宅，暂按住宅。', evidence: [paths.official] }],
  ['sh-fgj-2A020-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'reviewed-publishing-building', historicalUseVerified: true, historicalSiteName: '广学会／广学大楼', note: '广学会为出版机构，按出版商业用途显示，不按今天的文体进出口公司倒填。', evidence: ['https://zh.wikipedia.org/wiki/真光广学大楼', paths.official] }],
  ['sh-fgj-2A025-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'reviewed-publishing-building', historicalUseVerified: true, historicalSiteName: '美华书馆／真光大楼', note: '真光大楼为美华书馆所建的出版办公建筑，按出版商业用途显示。', evidence: ['https://zh.wikipedia.org/wiki/真光广学大楼', paths.official] }],
  ['sh-fgj-2A027-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'historic-commercial-building-name', flags: ['source-function-needs-review'], note: '慈淑大楼位于南京路商业街，暂按历史商业大楼显示；原始经营单位仍待专门核定。', evidence: [paths.official] }],
  ['sh-fgj-2A043-01', { categories: ['public'], displayCategory: 'public', basis: 'historic-public-institution-name', note: '原使用单位为上海公库，按公共机构显示；不采用今天建设银行分行的金融用途。', evidence: [paths.official] }],
  ['sh-fgj-2A047-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'historic-company-office', historicalUseVerified: true, historicalSiteName: '卜内门洋碱公司上海办公楼', note: '保护对象为卜内门洋碱公司的上海办公大楼，按企业办公商业用途显示。', evidence: ['https://zh.wikipedia.org/wiki/卜内门大楼', paths.official] }],
  ['sh-fgj-2A051-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'historic-company-office', historicalUseVerified: true, historicalSiteName: '德士古石油公司大楼', note: '德士古大楼是石油公司的办公大楼，按商业显示，不因企业经营石油而误标为工厂。', evidence: ['https://zh.wikipedia.org/wiki/德士古大楼', paths.official] }],
  ['sh-fgj-2C003-01', { categories: ['residential'], displayCategory: 'residential', basis: 'reviewed-former-apartment', historicalUseVerified: true, historicalSiteName: '杨氏公寓（Young Apartments）', note: '永业大楼原为杨氏公寓，底层虽有商铺，主体和地图主图标按公寓住宅。', evidence: ['https://www.kankanews.com/detail/g4QZ6L0zoQY', paths.official] }],
  ['sh-fgj-2B002-01', { categories: ['residential'], displayCategory: 'residential', basis: 'reviewed-former-apartment', historicalUseVerified: true, historicalSiteName: '德义大楼（Denis Apartments）', note: '原建用途为公寓及住宿，后又作银行职工宿舍，按住宅显示。', evidence: ['https://zh.wikipedia.org/wiki/德义大楼', paths.official] }],
  ['sh-fgj-2B004-01', { categories: ['residential'], displayCategory: 'residential', basis: 'reviewed-former-apartment', historicalUseVerified: true, historicalSiteName: '麦特赫斯脱公寓（Medhurst Apartments）', note: '1933年建成后主要出租，按公寓住宅显示。', evidence: ['https://zh.wikipedia.org/wiki/泰兴大楼', paths.official] }],
  ['sh-fgj-2B018-01', { categories: ['residential'], displayCategory: 'residential', basis: 'historic-apartment-building', note: '海格大楼原为公寓建筑；静安宾馆是后续使用，地图按住宅显示。', evidence: [paths.official] }],
  ['sh-fgj-2F005-01', { categories: ['industrial'], displayCategory: 'industrial', basis: 'reviewed-former-shipyard', historicalUseVerified: true, historicalSiteName: '耶松船厂旧址', note: '北方局为后续机构名，现存建筑属于耶松船厂旧址，按工业显示。', evidence: ['https://zh.wikipedia.org/wiki/耶松船厂旧址', paths.official] }],
  ['sh-fgj-2F006-01', { categories: ['industrial', 'commerce'], displayCategory: 'industrial', basis: 'historic-tobacco-company-office-and-factory', flags: ['component-scope-needs-review'], note: '资料将其与南洋兄弟烟草公司办公、厂房联系；主图标按工业，办公成分保留为商业，仍需逐构件核定。', evidence: [paths.official] }],
  ['sh-fgj-2F008-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'historic-bank-building', historicalUseVerified: true, historicalSiteName: '四行储蓄会大楼', note: '四行大楼由四行储蓄会兴建并使用，按金融商业显示。', evidence: ['https://zh.wikipedia.org/wiki/四行储蓄会', paths.official] }],
  ['sh-fgj-2M004-01', { categories: ['residential'], displayCategory: 'residential', basis: 'historic-apartment-building', historicalUseVerified: true, historicalSiteName: '西园公寓', note: '西园大厦原为西园公寓，按住宅显示。', evidence: ['https://zh.wikipedia.org/wiki/西园公寓', paths.official] }],
  ['sh-fgj-3A007-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'historic-commercial-building-name', flags: ['source-function-needs-review'], note: '美伦大楼为南京路商业街大楼，暂按商业显示；其具体早期租户仍待补证。', evidence: [paths.official] }],
  ['sh-fgj-3A012-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'historic-company-offices', note: '原名三菱大楼、美孚大楼，对应企业办公建筑，按商业显示。', evidence: [paths.official] }],
  ['sh-fgj-3A014-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'historic-commercial-building', note: '现存兰心大楼是办公商业建筑；兰心大戏院是同址前身但非同一座现存保护建筑，故不标文娱。', evidence: [paths.official] }],
  ['sh-fgj-3A016-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'historic-commercial-building-name', flags: ['source-function-needs-review'], note: '四明大楼暂按历史商业办公大楼显示，具体原使用单位仍待补证。', evidence: [paths.official] }],
  ['sh-fgj-3A017-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'historic-commercial-property', note: '哈同大楼是哈同地产在南京路的商业物业，不继承爱俪园的园林类别。', evidence: [paths.official] }],
  ['sh-fgj-3A019-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'historic-commercial-building-name', flags: ['source-function-needs-review'], note: '谦信大楼暂按历史商业办公大楼显示；海军后勤物资站是后续用途。', evidence: [paths.official] }],
  ['sh-fgj-3M026-01', { categories: ['parks'], displayCategory: 'parks', basis: 'historic-park-structure', note: '大理石亭位于中山公园内，是园林构筑物，按公园与墓园组显示。', evidence: [paths.official] }],
  ['sh-fgj-4A005-01', { categories: ['residential'], displayCategory: 'residential', basis: 'historic-rental-building', flags: ['source-function-needs-review'], note: '恒丰大楼按早期出租居住用途暂归住宅；上海航道局办公与青年旅舍均为后续使用，原始户型与租用结构仍待补证。', evidence: [paths.official] }],
  ['sh-fgj-4A024-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'historic-commercial-building-name', flags: ['source-function-needs-review'], note: '约克大楼暂按历史商业办公大楼显示，具体早期租户仍待补证。', evidence: [paths.official] }],
  ['sh-fgj-4B011-01', { categories: ['residential'], displayCategory: 'residential', basis: 'official-listed-residential-use', note: '名录将其列作杨氏花园住宅，按住宅显示。', evidence: [paths.official] }],
  ['sh-fgj-4G011-01', { categories: ['education', 'public'], displayCategory: 'education', basis: 'reviewed-aviation-exhibition-and-association', historicalUseVerified: true, historicalSiteName: '中国航空协会总部及航空陈列馆', note: '建筑兼具航空协会办公、礼堂和航空知识陈列功能；按用户十类中的教育文化显示，公共机构作为次要历史功能保留。', evidence: ['https://caup.tongji.edu.cn/_upload/article/files/8e/ca/aab32198436092b6bb1ede40ab35/08b0b145-7694-4ad9-a38c-e2210cabf8f3.pdf', paths.official] }],
  ['sh-fgj-5A001-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'historic-commercial-building-name', flags: ['source-function-needs-review'], note: '新康大楼暂按历史商业办公大楼显示，具体原使用单位仍待补证。', evidence: [paths.official] }],
  ['sh-fgj-5A004-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'reviewed-office-building', historicalUseVerified: true, historicalSiteName: '道达大楼', note: '道达大楼原为办公大楼，按商业显示。', evidence: ['https://zh.wikipedia.org/wiki/道达大楼', paths.official] }],
  ['sh-fgj-5A006-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'historic-company-office', note: '礼和大楼为礼和洋行办公建筑，按商业显示。', evidence: [paths.official] }],
  ['sh-fgj-5A008-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'historic-company-office', note: '华德大楼早期供洋行、公司办公，住宅为后续使用，按商业显示。', evidence: [paths.official] }],
  ['sh-fgj-5A019-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'historic-commercial-building-name', flags: ['source-function-needs-review'], note: '五洲大楼暂按历史商业办公大楼显示，具体原使用单位仍待补证。', evidence: [paths.official] }],
  ['sh-fgj-5A029-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'historic-commercial-building-name', flags: ['source-function-needs-review'], note: '美伦大楼东楼按南京路历史商业大楼显示，具体原租户仍待补证。', evidence: [paths.official] }],
  ['sh-fgj-5A030-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'historic-commercial-building-name', flags: ['source-function-needs-review'], note: '美伦大楼西、南楼按南京路历史商业大楼显示，具体原租户仍待补证。', evidence: [paths.official] }],
  ['sh-fgj-5A034-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'historic-commercial-building-name', flags: ['source-function-needs-review'], note: '华侨大楼暂按历史商业办公大楼显示，具体原使用单位仍待补证。', evidence: [paths.official] }],
  ['sh-fgj-5A071-01', { categories: ['religion'], displayCategory: 'religion', basis: 'reviewed-original-church-compound', historicalUseVerified: true, historicalSiteName: '首善堂', note: '首善堂最初为天主教会机构建筑群，后曾有产科医院等用途；主图标按原宗教用途显示。', evidence: ['https://zh.wikipedia.org/wiki/首善堂_(上海)', paths.official] }],
  ['sh-fgj-5B062-01', { categories: ['residential'], displayCategory: 'residential', basis: 'official-listed-residential-complex', note: '海园及海园小区为住宅建筑群，按住宅显示。', evidence: [paths.official] }],
  ['sh-fgj-5D082-01', { categories: ['recreation'], displayCategory: 'recreation', basis: 'historic-club-name', flags: ['source-function-needs-review'], note: '“菁英会”作为会所名称暂归文娱体育；现关心下一代工作办公室及后来的餐饮用途不倒填，早期会所性质仍待补证。', evidence: [paths.official] }],
  ['sh-fgj-5G012-01', { categories: ['industrial'], displayCategory: 'industrial', basis: 'historic-textile-company-site', note: '日商上海纺织株式会社旧址属于纺织工业遗存，按工业显示。', evidence: [paths.official] }],
  ['sh-fgj-5W023-01', { categories: ['commerce'], displayCategory: 'commerce', basis: 'historic-market-town-commercial-building', flags: ['source-function-needs-review'], note: '中华楼位于新场老街，暂按历史商用楼房显示；中国锣鼓书艺术馆为当前活化用途，原商号与具体业态仍待补证。', evidence: [paths.official] }],
  ['sh-fgj-5P003-01', { categories: ['residential'], displayCategory: 'residential', basis: 'official-listed-residential-form', flags: ['source-function-needs-review'], note: '原名称待考，但公布时名称为陆氏宅，暂按宅第住宅显示；建筑最早主人和年代仍待补证。', evidence: [paths.official] }],
])

// Follow-up checks: a suggestive building name or a modern tenant is not enough
// to establish a historical use. Keep unresolved hypotheses out of map symbols.
for (const id of ['3A007', '3A016', '3A019', '4A005', '4A024', '5A001', '5A019', '5A029', '5A030', '5A034']) {
  reviewed.set(`sh-fgj-${id}-01`, {
    categories: [], basis: 'historical-use-unresolved',
    note: '原名仅为大楼名称，尚缺可核实的原用途资料。历史用途待核。', evidence: [paths.official],
  })
}
const followup = [
  ['2A025', { categories: ['commerce', 'religion', 'education'], displayCategory: 'commerce', historicalSiteName: '中华浸信会书局／真光大楼', note: '主要用于出版办公，也有差会和沪江商学院入驻；采用出版办公的商业图标，保留其他历史功能。中华浸信会书局不等于另一机构美华书馆。', evidence: ['https://zh.wikipedia.org/wiki/真光广学大楼'] }],
  ['2A027', { categories: ['commerce'], historicalSiteName: '大陆商场／慈淑大楼', note: '原为大陆商场，后称慈淑大楼，历史上有商店及办公租户；归商业。', evidence: ['https://finance.sina.cn/2024-07-12/detail-inccwvfp7676592.d.html?vt=4'] }],
  ['2A043', { categories: ['commerce', 'public'], displayCategory: 'commerce', historicalSiteName: '三井银行／上海公库', note: '现存大楼原由三井银行使用，后为上海公库；主图标取早期金融商业，保留公库阶段。', evidence: ['https://zh.wikipedia.org/wiki/上海公库'] }],
  ['2F008', { categories: ['residential', 'commerce'], displayCategory: 'residential', historicalSiteName: '虹口公寓／四行大楼', note: '1932年建成后主要作为出租公寓，底层为四行储蓄会虹口分会；主体归住宅，不能按投资银行的行业给整栋楼分类。', evidence: ['https://www.sohu.com/a/285540435_658365'] }],
  ['3N002', { categories: ['industrial'], historicalSiteName: '上海啤酒厂', note: '现梦清园内保存原灌装楼、办公楼和酿造楼，1935年投产，主体归工业。', evidence: ['https://www.meet-in-shanghai.net/cn/district-level-cultural-relics-protection-unit/the-former-site-of-shanghai-beer-co-ltd-772047/'] }],
  ['5D041', { categories: ['residential'], historicalSiteName: '永嘉路628号住宅', note: '文物保护点名称为永嘉路628号住宅；君悦酒店属于后来的使用名称，按住宅初分。', evidence: ['https://zh.wikipedia.org/wiki/永嘉路'], historicalUseVerified: false }],
  ['5D082', { categories: ['residential'], historicalSiteName: '岳阳路265号花园住宅', note: '文物登记为岳阳路265号花园住宅；菁英会见于2008年餐饮租赁资料，不作为民国会所的证据。最早居住、科研使用阶段仍待核。', evidence: ['https://zh.wikipedia.org/wiki/天平路街道', 'https://epaper.stcn.com/paper/zqsb/html/2009-12/26/content_142007.htm'], historicalUseVerified: false, flags: ['source-name-period-needs-review'] }],
  ['5F023', { categories: [], historicalSiteName: null, note: '名录所列矽肺治疗所等为后期医疗机构，尚缺1930年代建筑原用途的证据。', evidence: [paths.official], historicalUseVerified: false }],
  ['5M010', { categories: ['residential'], historicalSiteName: '愚园路1107号8、9号花园住宅', note: '保护对象限8、9号花园住宅；其后为长征制药厂园区一部分，不能用整厂功能覆盖这两栋原住宅。', evidence: ['https://www.sohu.com/a/282301506_796594'], historicalUseVerified: false }],
  ['5W023', { categories: ['commerce', 'recreation'], displayCategory: 'commerce', historicalSiteName: '中华楼茶馆书场', note: '中华楼原作茶馆书场，按商业主图标并保留文娱功能；今日中国锣鼓书艺术馆的教育文化用途另列。', evidence: ['https://www.oldkids.cn/blog/view.php?bid=1139283', 'https://dzb.whb.cn/imgPath/2020-11-03/91103.pdf'] }],
]
for (const [code, decision] of followup) reviewed.set(`sh-fgj-${code}-01`, {
  basis: 'reviewed-historical-use-followup', historicalUseVerified: true, ...decision,
})

const records = official.map(r => {
  const e = enriched.get(r.id)
  assert(e, `Missing enrichment row: ${r.id}`)
  const sourceName = r.originalNameOrUse ?? ''
  const officialCategories = textCategories(sourceName)
  const wikiOriginal = e.wikipedia?.originalNameOrUse ?? ''
  const wikiCategories = textCategories(wikiOriginal)
  const wikiMayBeCurrent = normal(wikiOriginal) !== normal(sourceName)
    && normal(wikiOriginal).length > 1 && normal(r.listedNameOrUse).length > 1
    && (normal(wikiOriginal).includes(normal(r.listedNameOrUse)) || normal(r.listedNameOrUse).includes(normal(wikiOriginal)))
  const relevantLinks = links.filter(l => [l.officialId, ...(l.additionalHeritageOfficialIds ?? [])].includes(r.id))
  const linkEvidence = relevantLinks.flatMap(l => [l, ...(l.additionalLandmarks ?? [])].flatMap(member =>
    member.expectedSourceRecordIds.map(id => {
      const source = vs.get(id)
      assert(source, `Unknown VS id ${id}`)
      return { sourceRecordId: id, name: source.name, nameZh: source.nameZh, types: source.types,
        categories: vsCategories(source), sourceUrl: source.sourceUrl, relation: l.relation,
        startYear: source.startYear, endYear: source.endYear,
        note: l.note, scopeNote: l.scopeNote, sources: l.sources,
        eligible: !l.nearbyResidentialContext
          && ['same-listed-building', 'same-listed-complex', 'same-listed-structure', 'same-historical-site'].includes(l.relation) }
    })))
  const linkedCategories = unique(linkEvidence.filter(l => l.eligible).flatMap(l => l.categories))
  const flags = []
  let proposed = officialCategories
  let basis = 'official-original-name'
  if (!proposed.length && linkedCategories.length) { proposed = linkedCategories; basis = 'reviewed-vs-link' }
  if (!proposed.length && wikiCategories.length && !wikiMayBeCurrent && !/待考/.test(sourceName)) { proposed = wikiCategories; basis = 'matched-wikipedia-original-name' }
  const articleScopeEvidence = e.articleReferences.filter(ref => ['building-reference', 'complex'].includes(ref.scope?.scope))
    .filter(ref => ref.scope?.method === 'reviewed-override' && /住宅群|住宅楼|花园住宅/.test(ref.scope.reason))
  if (!proposed.length && articleScopeEvidence.length) { proposed = ['residential']; basis = 'reviewed-building-scope-description' }
  if (officialCategories.length && wikiCategories.some(c => !officialCategories.includes(c))) flags.push('original-names-disagree')
  if (proposed.length && linkedCategories.some(c => !proposed.includes(c))) flags.push('linked-vs-different-function-or-period')
  if (linkEvidence.some(l => !l.eligible)) flags.push('context-or-component-link-not-inherited')
  if (linkEvidence.some(l => l.eligible && !yearNumbers(l.startYear).length && !yearNumbers(l.endYear).length)) flags.push('linked-use-date-not-specified')
  if (wikiMayBeCurrent) flags.push('wiki-original-name-matches-listed-current-use')
  if (e.wikipedia?.useTypeText) flags.push('wiki-use-type-may-mix-periods-not-used-for-classification')
  if (!officialCategories.length && /(?:路|路\d+号)$/.test(normal(sourceName))) flags.push('original-name-is-address-only')
  // Fifth-batch fields sometimes contain modern operators even under "original".
  // Do not treat a current tenant as evidence of the protected building's former use.
  const modernOperator = /中国科学院|中共上海市纪委|上海教育评估院|长宁区机关|龙美术馆|余德耀|西岸艺术中心|上海应用技术学院|华东师范大学|上海戏曲艺术中心|市文广局/.test(normal(sourceName))
  const constructionDates = [e.wikipedia?.constructionDateText, ...(e.wikipedia?.components ?? []).map(c => c.constructionDateText)].filter(Boolean)
  const constructionYears = constructionDates.flatMap(yearNumbers)
  if (constructionYears.length > 1 && new Set(constructionYears).size > 1) flags.push('mixed-component-dates')
  if (modernOperator) {
    flags.push('source-name-period-needs-review')
    // A reviewed same-building/site predecessor may replace the modern tenant.
    proposed = linkedCategories
    basis = proposed.length ? 'reviewed-vs-historical-use-candidate' : 'historical-use-unresolved'
  }
  const review = reviewed.get(r.id)
  if (review) { proposed = review.categories; basis = review.basis; flags.push(...review.flags ?? []) }
  if (review?.historicalUseVerified || review?.republicanSiteUseVerified) {
    for (const flag of ['source-name-period-needs-review', 'original-names-disagree', 'linked-vs-different-function-or-period']) {
      const i = flags.indexOf(flag)
      if (i !== -1) flags.splice(i, 1)
    }
  }
  const status = !proposed.length ? 'unclassified' : proposed.length > 1 ? 'multiple-functions'
    : flags.some(f => ['original-names-disagree', 'linked-vs-different-function-or-period', 'source-name-period-needs-review', 'source-function-needs-review', 'original-name-is-address-only', 'component-scope-needs-review'].includes(f))
      || (basis.startsWith('reviewed-vs') && flags.includes('linked-use-date-not-specified')) ? 'review-needed' : 'single-category-candidate'
  return {
    officialId: r.id, code: r.code, codeRaw: r.codeRaw, originalNameOrUse: sourceName,
    listedNameOrUse: r.listedNameOrUse, address: r.addressAsListed, district: r.districtAsListed,
    onCurrentHeritageMap: mappedIds.has(r.id), status, proposedCategories: proposed,
    proposedCategoryLabels: proposed.map(c => labels[c]), basis, flags: unique(flags),
    historicalSiteName: review?.historicalSiteName ?? null, constructionDates,
    displayCategory: review?.displayCategory ?? proposed[0] ?? null,
    displayCategoryLabel: labels[review?.displayCategory ?? proposed[0]] ?? null,
    displayCategorySymbol: categorySymbols[review?.displayCategory ?? proposed[0]] ?? '·',
    historicalUseEvidence: (review?.historicalUseVerified || review?.republicanSiteUseVerified)
      ? 'reviewed-historical-use-see-scope' : 'name-or-linked-source-candidate',
    officialNameCategories: officialCategories, wikiOriginalName: wikiOriginal,
    wikiOriginalNameCategories: wikiCategories, wikiUseTypeNotUsed: e.wikipedia?.useTypeText ?? null,
    linkedVsCategories: linkedCategories, linkEvidence,
    articleScopeEvidence: articleScopeEvidence.map(ref => ({ title: ref.resolvedTitle, reason: ref.scope.reason, url: ref.url })),
    sources: { official: r.source.url, wikipedia: e.wikipedia?.source?.url ?? null },
    ...(review ? { review } : {}),
  }
})

assert.equal(records.length, 1058)
assert.equal(new Set(records.map(r => r.officialId)).size, records.length)
for (const r of records) for (const category of r.proposedCategories) assert(category in labels)
const byCode = code => records.find(r => r.code === code)
assert.deepEqual(byCode('1B005').proposedCategories, ['residential']) // 嘉道理住宅 != 今少年宫
assert.deepEqual(byCode('1G001').proposedCategories, ['public']) // 市政府 != 今体育学院
assert.deepEqual(byCode('5A082').proposedCategories, ['industrial']) // 发电厂 != 今美术馆
assert.deepEqual(byCode('2G003').proposedCategories, ['education']) // 博物馆 follows user's grouping
assert.deepEqual(byCode('3H001').proposedCategories, ['commerce']) // 商会 follows user's grouping
assert.deepEqual(byCode('3A020').proposedCategories, ['residential']) // Wiki useType=教育 is not original use
assert.deepEqual(byCode('5G015').proposedCategories, ['residential']) // 印刷厂职员工房 != 工厂
assert.deepEqual(byCode('5F018').proposedCategories, ['residential']) // 公园坊 != 公园
assert.equal(byCode('5A083').status, 'review-needed') // 白克路 cannot automatically inherit today's 长征医院
assert.deepEqual(byCode('4B001').proposedCategories, ['parks']) // user's era/site policy: 哈同花园
assert.deepEqual(byCode('5D092').proposedCategories, ['transport']) // 北票码头, from 1929, not 1928
assert.deepEqual(byCode('4G010').proposedCategories, ['parks', 'medical']) // retain era transitions
assert.deepEqual(byCode('5N002').proposedCategories, ['education']) // 大夏, not inferred from modern tenant
assert.deepEqual(byCode('4M009').proposedCategories, ['residential']) // excludes hospital since 1976
assert.deepEqual(byCode('4M039').proposedCategories, ['residential']) // excludes hospitals since 1956
assert.deepEqual(byCode('5B044').proposedCategories, ['religion']) // hospital moved here in 1956
assert(!byCode('5N001').proposedCategories.includes('education')) // schools from 1982/1990s
assert.deepEqual(byCode('4G006').proposedCategories, ['education']) // campus includes older schools
assert.deepEqual(byCode('4N001').proposedCategories, ['residential']) // original worker housing
assert.deepEqual(byCode('4G009').proposedCategories, ['education']) // original teaching building
assert.deepEqual(byCode('5D093').proposedCategories, ['transport']) // former airport hangar, not museum
assert.deepEqual(byCode('5D114').proposedCategories, ['industrial']) // former aircraft-factory press shop
assert.equal(byCode('5D114').displayCategory, 'industrial')
assert.deepEqual(byCode('5D040').proposedCategories, ['residential']) // former residence, not modern bureau
assert.deepEqual(byCode('5D042').proposedCategories, ['residential']) // Mrs Beebe residence, not current arts centre
assert.deepEqual(byCode('5D078').proposedCategories, ['residential']) // current commission is not historical use
assert.deepEqual(byCode('5D085').proposedCategories, ['residential']) // Moller residence, not current institute
assert.deepEqual(byCode('5D113').proposedCategories, ['education']) // 1955 teaching building remains historical use
assert.equal(byCode('2F008').displayCategory, 'residential') // bank-owned apartment != bank office
assert.equal(byCode('3N002').displayCategory, 'industrial') // brewery != modern museum or generic company
assert.equal(byCode('5D041').displayCategory, 'residential') // later hotel tenant
assert.equal(byCode('5M010').displayCategory, 'residential') // protected villas, not whole factory
assert.equal(byCode('4A005').displayCategory, null) // building name alone does not prove use
assert.equal(textCategories('公园坊')[0], 'residential')
assert.deepEqual(textCategories('工厂宿舍'), ['residential'])
assert.deepEqual(textCategories('政府官邸'), ['residential'])

const statusCounts = Object.fromEntries(unique(records.map(r => r.status)).map(s => [s, records.filter(r => r.status === s).length]))
const distribution = categories.map(c => ({ ...c,
  singleCategoryCandidates: records.filter(r => r.status === 'single-category-candidate' && r.proposedCategories.includes(c.id)).length,
  reviewNeededSingleCategory: records.filter(r => r.status === 'review-needed' && r.proposedCategories.includes(c.id)).length,
  multiFunctionMentions: records.filter(r => r.status === 'multiple-functions' && r.proposedCategories.includes(c.id)).length,
}))
export const audit = {
  auditedAt: '2026-09-24', scope: 'All 1,058 official directory rows, not just map-visible or VS-linked buildings. Codes are not unique; officialId is the key.',
  purpose: 'Historical-use classification for 10 map icon groups. Modern tenants are excluded when a former building/site use is documented.',
  policy: ['Prefer the protected building\'s documented former/original use over its current name or tenant.', 'For a reviewed shared site card, a documented earlier site predecessor may supply the display category; the card must distinguish different buildings and dates.', 'A historical-use category does not claim the building existed in 1928. Construction/use dates remain separate.', 'Name-based categories remain candidates unless independently reviewed; fifth-batch mixed fields require special care.', 'Museum→education; guild hall→commerce; military→public; cemetery→parks as display groups only.', 'Nearby display links do not prove site identity and never supply inherited use.', 'Multiple historical functions remain in the card; displayCategory selects one primary map icon without erasing the others.', 'Unknown remains a research state, not an eleventh icon category.'],
  inputs: Object.fromEntries(Object.entries(paths).map(([k, p]) => [k, { path: p, sha256: crypto.createHash('sha256').update(texts[k]).digest('hex') }])),
  counts: { records: records.length, mapVisibleRecords: records.filter(r => r.onCurrentHeritageMap).length,
    withAnyProposedCategory: records.filter(r => r.proposedCategories.length).length,
    withReviewedLink: records.filter(r => r.linkEvidence.length).length, statuses: statusCounts },
  distribution, records,
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(audit, null, 2))
}
