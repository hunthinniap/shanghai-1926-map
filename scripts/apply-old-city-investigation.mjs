import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import * as OpenCC from 'opencc-js'

const root = 'research/road-histories/2026-11-07-old-city'
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
const write = process.argv.includes('--write')
assert(write !== process.argv.includes('--check'), 'Use --write or --check')
const simplify = OpenCC.Converter({ from: 'tw', to: 'cn' })
const input = read(`${root}/investigation.geojson`)
const references = read(`${root}/source-index.json`)
const wiki = read(`${root}/wiki-roads.json`).query.pages
const collection = read('public/data/historical-features.geojson')
const backfill = read('scripts/data/old-city-road-api-backfill.geojson')
const accepted = read('src/data/acceptedRoadHistoryEvents.json')
const lineEvidence = read(`${root}/osm-line-evidence.json`)
const normalize = text => simplify(text).replace(/\s/g, '')
const book = part => ({ url: `https://www.shidianguji.com/zh/book/LG2SHDMB/chapter/${part === 1 ? '1lxtn5qaklyyb' : '1mdntayexgd8p'}`, sourceTitle: '商务印书馆《上海地名表》（1910）' })
const source = id => {
  const ref = references.find(r => r.id === id)
  assert(ref, `Missing source ${id}`)
  return { url: ref.url, sourceTitle: ref.title }
}
const fixedWiki = title => {
  const page = wiki.find(p => p.title === title && !p.missing)
  assert(page, `Missing road article ${title}`)
  return { url: `https://zh.wikipedia.org/w/index.php?oldid=${page.revisions[0].revid}`, sourceTitle: `维基百科 · ${title}（固定版本；所引地名志）` }
}
const event = (year, kind, name, citation, extras = {}) => ({ year, kind, name, ...citation, ...extras })
const undated = (name, citation, note) => ({ period: '年代待考', kind: '曾用名', name, ...citation, ...(note ? { note } : {}) })
const observed = (year, name, citation, note) => event(year, '见载', name, citation, { note: note || '该年资料已使用此名，不作为始建或更名年份。' })
const profiles = {
  '会馆弄': { events: [observed(1910, '会馆弄', book(2))], note: '1910年《上海地名表》可直接定位里马路与外咸瓜街间的会馆弄。泉漳会馆1757年开建及1905年里马路修筑，均不足以确定此弄的命名年。' },
  '盐码头街': { events: [event(1879, '命名', '盐码头街', { url: 'https://www.sohu.com/a/917063883_121668715', sourceTitle: '上海黄浦 · 城厢物语｜盐码头街的得名' })], note: '采用黄浦区融媒体中心关于1879年盐运码头及通往码头街名的记述；原附件给出的花园街、施相公弄及1950年代合并时间，仍需逐段核定。' },
  '白渡路': { predecessor: '肇家浜', events: [event(1909, '填浜筑路、分段命名', '老白渡路、油车街、坝基桥街', fixedWiki('白渡路'), { mapName: '', segment: '东、中、西三段', note: '1909年开始筑路。另有文章记1915年填浜，可能涉及工程完成或不同范围，不能据此把旧名全部推迟至1915年。' }), event(1950, '合并、更名', '白渡路', fixedWiki('白渡路'), { period: '1949年后', originalPeriod: '1949年后' })] },
  '毛家园路': { events: [observed(1910, '毛家弄', book(1), '地名表分列城内、城外两个毛家弄；此处仅采用外马路与里马路间、总工程局南的城外毛家弄。'), undated('毛家园路', { url: 'https://www.openstreetmap.org/way/40109139', sourceTitle: 'OpenStreetMap · 毛家园路' }, '现代路名已确认，具体改名年尚未查明。')], note: '删除把毛家园园林年代当作道路年代的阶段，交付中的1906年筑路尚无可核读的直接依据。地图使用有年代的城外毛家弄记录。' },
  '王家码头路': { events: [observed(1910, '王家码头街', book(1), '地名表记外马路至小九华南街的王家码头。只据该条确认对应路段已有名称。'), undated('王家码头路', source('18c004bdf7bc8934'), '黄浦融媒体关于1855年海运局、1859年浙宁公所的记述，未给出统一改称“路”的年份。')], note: '保留王家码头的街名线索；万裕浜、王家浜及“小九华街1908年”的日期和对应范围未获直接证实。' },
  '东江阴街': { events: [event(1904, '辟筑、分段命名', '校场街、复善堂街', source('3b639ec07e4a4345'), { mapName: '', segment: '东段校场街；西段复善堂街' }), event(1930, '统一名称', '复善堂街', source('3b639ec07e4a4345'), { displayYear: 1930, period: '1930年代中后期', originalPeriod: '1930年代中后期' }), event(1964, '更名', '东江阴街', source('3b639ec07e4a4345'))] },
  '董家渡路': { events: [event(1907, '辟筑、分段命名', '董家渡大街、圣贤桥街、小南门大街', source('de027b882347dd2f'), { mapName: '', segment: '外马路—南区街；南区街—外仓桥街；外仓桥街—中华路' }), event(1950, '统一名称', '董家渡路', source('de027b882347dd2f'), { period: '1949年后', originalPeriod: '建国后' })], note: '1847年是董家渡天主堂相关年代，不能作为整条道路辟筑年。' },
  '多稼路': { events: [observed(2018, '多稼路', source('1c1927ab19da2597')), undated('三泰码头', source('1c1927ab19da2597'), '只对应现多稼路的一段，不能套用到全路。')], note: '交付的积谷仓、信大码头、张家路等有分段线索，但未证实1870年或1912年统一路名的结论；不再沿用附件的推算年份。' },
  '半淞园路': { events: [event(1919, '辟筑', '半淞园路', fixedWiki('半淞园路'), { period: '1918年后', originalPeriod: '1918年后' })], note: '所引道路条目记1918年后辟筑。1918年园林开园不等于道路当年更名；高昌庙路还涉及今高雄路等不同道路，暂不作本路的统一前名。现线仅作位置参照。' },
  '光启南路': { events: [event(1814, '分段见载', '县桥南街、太卿坊大街、大南门大街', source('ce15738876b41968'), { mapName: '', segment: '清代北、中、南段；中南段界线有不同图示' }), event(1930, '更名', '坊明路', { url: 'https://m.thepaper.cn/newsDetail_forward_32092998', sourceTitle: '唐川 · 徐光启在上海成为“江南地区第一个吃烘山芋的人”' }, { mapName: '', segment: '原太卿坊段，未证实同时适用于全路' }), event(1945, '更名', '阜民路', { url: 'https://m.thepaper.cn/newsDetail_forward_32092998', sourceTitle: '唐川 · 徐光启与太卿坊的地名沿革' }, { period: '抗战胜利后', originalPeriod: '抗战胜利后' }), event(1980, '更名', '光启南路', source('3da475337c4c3253'))], note: '1375年阜民坊牌楼的记述不能证明整条现路始建于该年。删除未经证实的1912年全路合并改阜民路，补入坊明路阶段并保留适用范围。' },
  '跨龙路': { events: [event(1907, '辟筑', '跨龙路', fixedWiki('跨龙路')), undated('大佛厂东街', fixedWiki('跨龙路'), '曾用名可确认，起讫年代未核定。')], note: '1553年筑城不能直接作为大佛厂东街的道路命名年。' },
  '俞家弄': { events: [observed(1910, '俞家弄', book(2), '仅对应南门大街以东的东段；顾家弄位于南门大街以西。'), undated('顾家弄', book(2), '西段原名有直接记载；1954年统一改名尚未找到可读原文。')], note: '1553年俞氏家族定居可解释地名来源，不是精确筑路年；不采用交付把1553—1840整体归为同一阶段的写法。' },
  '金坛路': { events: [observed(1731, '道前街', { url: 'https://sghexport.shobserver.com/html/baijiahao/2023/06/24/1058731.html', sourceTitle: '上海黄浦 · 城厢物语｜金坛路的由来' }, '1730年迁道台衙署，次年建成；不把迁署年直接当作街道始建年。'), event(1911, '更名', '警察厅路', fixedWiki('金坛路'), { displayYear: 1911, period: '1911年上海光复后', originalPeriod: '1911年上海光复后' }), event(1964, '更名', '金坛路', fixedWiki('金坛路'))] },
  '梧桐路': { events: [observed(1910, '天主堂街、大生街', book(2), '分段名称，不能合成为整条路共同的旧名。'), undated('梧桐路', source('5ce3a6100aa71dd2'), '道路名称沿革可确认，精确更名年未证实。')], note: '敬一堂1640年建筑历史不作道路始建年；不采用交付的1862年、1920年统一更名推断。', mapHold: true },
  '聚奎街': { events: [observed(1910, '聚奎街', book(2))], note: '1291年建县、文庙与聚奎亭的历史不能直接作为聚奎街命名年；1855年后街巷形成的推断亦未核实。' },
  '西钩玉弄': { events: [observed(1910, '西钩玉弄', book(1)), undated('狗肉弄', source('1ae538a6284e7819'), '旧名对照仅作名称线索，未证明1850年及1905年的时间界线。')], note: '1910年地名表已有西钩玉弄（原文钩玉術），可从该年显示；不据“清末民初”擅定1905年。' },
  '同庆街': { events: [observed(1907, '同庆街', source('03c816261c7a04c7'), '回溯孟小冬1907年出生地的文史记述，属间接年代依据，不是始建年。')], note: '交付的1884年尚无对应地图文字证据，暂采用有文字旁证的1907年。' },
  '悦来街': { events: [observed(1910, '悦来街', book(2))], note: '地名表直接记悦来街。财神弄存在多处同名，不能未经路段核对就作为整条悦来街的前名。' },
  '灵济街': { events: [observed(1995, '灵济街', source('3da475337c4c3253'), '1995年影像及逐帧街道辨识可定位灵济街；更早名称的确切年代仍待核。'), undated('盐公堂街', source('1ae538a6284e7819'), '旧今名对照支持名称关系，不支持1650年这个单年。')], note: '删除无直接依据的1650年和附件推定的1820年；盐公堂、鱼行桥等早期路段仍保留待核。' },
  '会馆街（旧线）': { events: [observed(1910, '南会馆街', book(1)), undated('会馆街', source('0a89f819841b64ad'), '后来的历史旧街名称，具体更名年未核定。')], note: '此为南北向旧街的可辨认残段，线位取OSM原始道路节点；1715年建商船会馆不证明马家厂街在同年命名，不能移用到2018年东西向新街。' },
  '会馆街': { events: [event(2018, '命名', '会馆街', { url: 'https://www.shanghai.gov.cn/nw12344/20200813/0001-12344_55855.html', sourceTitle: '上海市规划和国土资源管理局地名公告（2018年第2期）' }, { segment: '熙福路—中山南路' })] },
  '大昌街': { events: [undated('大佛厂前街', source('1ae538a6284e7819'), '旧今路名对照未注明更名时间。'), observed(2025, '大昌街', source('56e604e987301b06'), '文旅资料使用现门牌大昌街30号，只能确认现名，不作1950年改名的证据。')], note: '地图先补回有道路ID的现存短段。1860年清心堂前身创立、1919年教堂建筑落成不能直接转作街名阶段；1576年陆家浜记载不能作为这条路的前身。' },
}

profiles['梧桐路'].events[0].mapName = ''
profiles['梧桐路'].events.push(observed(2017, '梧桐路', source('5ce3a6100aa71dd2')))
delete profiles['梧桐路'].mapHold
const publicNotes = {
  '会馆弄':'1757年是泉漳会馆始建年，街名确切命名年代未详。1910年地名表已记里马路与外咸瓜街之间的会馆弄。',
  '盐码头街':'早期花园街、施相公弄等分段名称的适用范围和统一年代仍待考。',
  '毛家园路':'早期城外毛家弄与城内同名弄堂为不同道路。今名毛家园路的确切改名年尚未查明。',
  '王家码头路':'早期王家码头街与小九华街涉及不同路段，统一采用今名的年代尚待考。',
  '多稼路':'部分路段早期曾称三泰码头，整条道路统一采用多稼路名称的年代尚待考。',
  '半淞园路':'道路名称来自半淞园。园林开园与道路辟筑并非同一事件，早期高昌庙路还涉及今高雄路等不同线位。',
  '光启南路':'清代北、中、南段名称不同；太卿坊与南门大街分界在乔家路或顾家弄有不同图示。坊明路阶段仅确认原太卿坊段，其余范围尚待考。',
  '跨龙路':'曾用名大佛厂东街的确切使用起讫年代尚待考。',
  '俞家弄':'早期俞家弄在南门大街以东，顾家弄在西。俞氏家族定居可解释地名来源，但不等于确切筑路年。',
  '梧桐路':'西段曾称天主堂街，东段曾称大生街；现名的确切统一年代尚待考。敬一堂的建筑年代不作为道路始建年。',
  '聚奎街':'1910年地名表已有此名，街道确切命名年尚待考。',
  '西钩玉弄':'1910年地名表已有西钩玉弄。狗肉弄等早期写法的具体使用年代尚待考。',
  '同庆街':'1907年依据出生地回溯记述，仅作间接年代依据，不作为道路始建年。',
  '悦来街':'1910年地名表直接记悦来街。财神弄有多处同名，尚不能确认与此街为同一路段。',
  '灵济街':'盐公堂街、鱼行桥街等早期分段名称的适用年代尚待考。',
  '会馆街（旧线）':'南北向历史旧街与2018年公告的东西向新街分别记录。1715年是商船会馆建馆年，不能作为街道命名年。',
  '大昌街':'早期曾称大佛厂前街，具体更名年代未详。清心堂1919年落成，不等于街道同年改名。',
}
for(const [name,note] of Object.entries(publicNotes))profiles[name].note=note
profiles['大昌街'].events[1] = event(2026, '现名', '大昌街', source('56e604e987301b06'), {
  period: '今日', originalPeriod: '资料核查于2026年；不是更名年份', note: '文旅资料使用现门牌大昌街30号，未注明道路改名年。',
})
for (const [name,profile] of Object.entries(profiles)) {
  const current = profile.events.find(e => e.year === undefined && e.name === name)
  if (current && !profile.events.some(e => e.year !== undefined && e.name === name)) {
    profile.events.push(event(2026, '现名', name, {url:current.url,sourceTitle:current.sourceTitle}, {
      period:'今日',originalPeriod:'资料核查于2026年；不是更名年份',note:'现名可确认，具体更名年代仍待核。',
    }))
  }
}

const corrections = {
  '水塘街': '真如水塘街有文字旁证，不能归入老城厢；祖师堂街更名年及“上海唯一”的排他性结论仍未证实。',
  '柳江弄': '柳江街与柳江弄在旧今名对照中分列，禁止合并；1903年刘公祠办学及邻近半段泾不能证明该弄1600年的水道阶段。',
  '鲁关路': '虹口位置、1920年代三元里及1942—1943年改鲁关路有专题调查支持；删去无正文支持的老观街，不能并入老城厢道路。',
  '竹行码头街': '1910年地名表在王家码头北记竹行弄，可用为该路段见载；嘉庆年间及1814年的精确取值没有可读依据。2014年废弃道路批复应单列撤销事件。',
  '万豫码头街': '外马路文史文章可支持码头街群背景，未直接支持1875年万豫码头街命名；万裕、万豫的写法关系和具体年份须继续核原图。',
  '漕沧街': '1910年有漕仓街、漕仓弄两个对象，起讫不同；不能统一写成漕沧街并定1850年。',
  '篾竹路': '1910年已有篾作街，文汇文章支持篾作街即篾竹路；嘉庆年间、1814年及1870年并非该文直接给出的更名年份。',
  '大德路': '大王庙街→大德路可作名称线索；1930年更名未证实。民政局2026年文史文章记2014年旧改消失，不能作为今日现线。',
  '草鞋湾路': '民政局文史文章支持1940年代形成和2014年旧改消失；可按用户规则从1940年显示路名，早期洼地不应擅定1850年。',
  '侯家路': '交付1908年与可读来源不符，来源分别记1906、1907填浜，宜保留1906—1907区间并按1906显示；1910年明确记侯家浜街，1946年简化路名未证实。',
  '大夫坊': '引用原文明说天官牌坊街对应丹凤路，交付将其并入大夫坊属异路误合；1910年中大夫坊有独立条目，可作为早期见载。',
  '金家坊': '所引同济调查明确命名原因和确切修筑年代不能断定；可确认1875年地图已有道路，1814年前为研究者推断，不采用1844年金家牌坊说。',
  '积石街': '旧今名表提供仓基弄、积善寺街等名称线索，未直接证明1930年改名；大较场与仓基弄、积石街不可不分段合成一条。',
  '福禄街': '现有杨浦区福禄街及Ford Lane道路记录可确认；原附件的黄浦坐标误归，不另造老城厢福禄街。',
  '大方弄': '方浜填筑前存在的概述不能推出1875年；1950年区政府驻址只能证明当年已有此名，不能当改名年。',
  '长生街': '1910年记长生庵弄，旧今名表有对应名称线索；1875年及整条路形成时间未获证明。',
  '和顺街': '火神庙街→和顺街可作旧名线索，2024年官方征收清单直接证明现门牌；1800年及1950年代初改名未核实。',
  '万竹街': '嘉靖年间万竹山居属于园林历史，不是街道始建年；所引文章讨论1842—1858年地图与1948年行号图，不支持1559年路名起年。',
  '乔家栅弄': '嘉庆1814年县志对乔家栅的记载可用为见载，1909年统一改名乔家栅弄缺少直接依据；薛家浜与乔家浜不能未经线位核对作为本弄河道前身。',
  '荷花池弄': '1853年浙宁会馆荷花池与弄堂命名应区分；2015年现场报道支持当时弄堂拆除只余路牌，不支持1875年精确改名。',
  '面筋弄': '1910年地名表已记面筋弄；与瞿家湾关系及1912年起名未证实，2024征收清单不是更名事件。',
  '中石皮弄': '嘉庆志有石皮弄不能证明中、南、北三弄同年分名；1910年石皮弄为独立早期记录，1814年前后的取值须核原志。',
  '薛弄底街': '弘治志薛巷可作早期线索，但不能直接套为1553年薛弄底街；原文只是明代县署周边巷道，不足以证实整条现名路段。',
  '傅家街': '郭博街拍确有傅家街照片，可支持地名存在；1860年及镶片弄与该路同段关系仍待核，征收或规划公示不属于改名。',
  '抚安街': '曼笠桥（抚安桥）属于跨肇嘉浜桥梁，不等于抚安街先前就是河道；1914年填肇嘉浜不证明此条支街同时命名。',
  '迎勋支路': '应公祠弄→迎勋支路有对照线索，邻近迎勋路填浜不能推出本支路1914年成路；2024停车公示只证明现名。',
  '宝带弄': '1910年大生街与小娘浜等线索须逐段定位；1906—1912不能直接设为1912年从大生弄改宝带弄。',
  '淘沙场街': '重要异路误合。1910年同时记城内淘沙场与城外篾作街西的沙场街，交付用后者史料替代前者；不可把沙场街现代线和历史挂给淘沙场街。',
  '东马街': '1910年已记东马桥南街，所引方浜文章证明河桥背景，未给出1909年把该路命名东马街的结论。',
  '甘谷街': '观音阁街→甘谷街可确认名称关系，旧名照片及对照表未证明1880年或1950年精确更名。',
  '潘家街': '1910年潘家弄位于穿心街北、老北门直街东，不能随同名财神弄随意并入；须先区分潘家弄与潘家街实体。',
  '马添兴街': '1910年已分列风箱弄与马添兴弄；文汇说风箱弄后来对应马添兴街，因此交付1947年开始马添兴名称的结论过强。',
  '汤管弄': '1910年已记汤管弄，交付把汤罐弄到汤管弄的改写放到1947年不成立；同名与异体应区分书写和更名事件。',
  '筷作弄': '1910年已记筷作弄，文汇确认筷作街后称筷竹弄；交付现代名、历史名和1947年的对应需修正，不把它当当前独立存续街巷。',
  '青龙桥街': '1910年已有青龙桥直街；2018年公告重新确定董家渡路—东江阴街段，应区分历史线和现公告线，不采用1700年推定水道名。',
  '清流街': '1950年代清流街办事处可证明当时已有地名，1889年寺院及机构沿革未证明公济堂、双龙园街、石牌楼、瑞良街全部属于同一路段。',
}

// Coordinate inputs are independent OSM nodes, never the investigation's sketch.
function mergeWays(wayIds) {
  const ways = wayIds.map(id => lineEvidence.ways.find(w => w.id === id))
  assert(ways.every(Boolean), `Missing raw geometry ${wayIds}`)
  const paths = ways.map(w => w.coordinates.map(p => [...p]))
  let changed = true
  const same = (a,b) => a[0] === b[0] && a[1] === b[1]
  while (changed) {
    changed = false
    outer: for (let a=0; a<paths.length; a++) for (let b=a+1; b<paths.length; b++) {
      let left = paths[a], right = paths[b]
      if (same(left.at(-1),right[0])) {}
      else if (same(left.at(-1),right.at(-1))) right = right.toReversed()
      else if (same(left[0],right.at(-1))) [left,right] = [right,left]
      else if (same(left[0],right[0])) left = left.toReversed()
      else continue
      paths[a] = [...left,...right.slice(1)]; paths.splice(b,1); changed=true; break outer
    }
  }
  return paths.length === 1 ? { type: 'LineString', coordinates: paths[0] } : { type: 'MultiLineString', coordinates: paths }
}
for (const [name, ids, attachmentId] of [
  ['会馆街（旧线）', [117148101,289656789], 'old-city-extra-20-会馆街'],
  ['大昌街', [117575085], 'old-city-extra-45-大昌街'],
]) {
  const transcription = name === '大昌街' ? 'Dachang Street' : 'Huiguan Street (old alignment)'
  const existing = backfill.features.find(f => f.properties.modernNameZh === name)
  if (existing) { existing.properties.historicalName = transcription; continue }
  const featureGroupId = `road-reviewed-${attachmentId}`
  backfill.features.push({ type: 'Feature', geometry: mergeWays(ids), properties: {
    id: featureGroupId, featureGroupId, kind: 'road', historicalName: transcription, modernNameZh: name,
    historicalChinese: name, aliases: [name], jurisdiction: 'old-city', language: 'zh', labelYear: name === '大昌街' ? 2025 : 1910,
    sourceIds: ['openstreetmap-current-roads'], sourceUrls: { 'openstreetmap-current-roads': `https://www.openstreetmap.org/way/${ids[0]}` },
    category: '道路', priority: 4, curatedOldCity: true, roadLabelFromGeometry: true, attachmentRoadId: attachmentId, osmWayIds: ids,
  } })
}
const huiguan = collection.features.filter(f => f.properties.featureGroupId === 'road-old-city-会馆弄')
for (const feature of huiguan) {
  feature.geometry = mergeWays([745677070])
  feature.properties.sourceUrls = { ...feature.properties.sourceUrls, 'openstreetmap-current-roads': 'https://www.openstreetmap.org/way/745677070' }
}
if (!backfill.features.some(f=>f.properties.featureGroupId==='road-old-city-会馆弄')) {
  backfill.features.push(...huiguan.map(f=>structuredClone(f)))
}
for(const feature of [...collection.features,...backfill.features]) {
  const p=feature.properties
  if(p.kind!=='road')continue
  if(p.modernNameZh==='半淞园路')Object.assign(p,{historicalName:'Bansongyuan Road',historicalChinese:'半淞园路',aliases:['半淞园路']})
  if(p.modernNameZh==='会馆弄')p.aliases=['会馆弄','會館弄']
  if(p.modernNameZh==='悦来街')Object.assign(p,{historicalChinese:'悦来街',aliases:['悦来街','Yuelai Street']})
}

// Historical names on subsegments follow the road's real polyline. Cut points
// must meet another independently identified OSM road within 15 metres.
const metres = p => [p[0]*95000,p[1]*111000]
const distance = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1])
const lines = geometry => geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates
const projected = (point,a,b) => {
  const p=metres(point), x=metres(a), y=metres(b), d=[y[0]-x[0],y[1]-x[1]]
  const t=Math.max(0,Math.min(1,((p[0]-x[0])*d[0]+(p[1]-x[1])*d[1])/(d[0]*d[0]+d[1]*d[1])))
  return { t, distance:distance(p,[x[0]+t*d[0],x[1]+t*d[1]]) }
}
function metrics(geometry) {
  let total=0
  const edges=lines(geometry).map(line=>line.slice(1).map((b,i)=>{
    const a=line[i], length=distance(metres(a),metres(b)), start=total
    total+=length
    return {a,b,length,start,end:total}
  }))
  return {edges,total}
}
function atIntersection(geometry,wayIds) {
  const road=metrics(geometry)
  let best={distance:Infinity,position:0}
  for (const wayId of wayIds) for (const p of lineEvidence.ways.find(w=>w.id===wayId).coordinates) {
    for (const edge of road.edges.flat()) {
      const hit=projected(p,edge.a,edge.b)
      if(hit.distance<best.distance) best={distance:hit.distance,position:edge.start+edge.length*hit.t}
    }
  }
  assert(best.distance<15,`Intersection too far from referenced road: ${wayIds} ${best.distance}`)
  return best.position
}
function clip(geometry,from,to) {
  const result=[]
  for(const edges of metrics(geometry).edges) {
    const points=[]
    for(const e of edges) {
      if(e.end<=from || e.start>=to) continue
      const point=t=>e.a.map((v,i)=>Number((v+(e.b[i]-v)*t).toFixed(7)))
      const start=point(Math.max(0,(from-e.start)/e.length)), end=point(Math.min(1,(to-e.start)/e.length))
      if(!points.length) points.push(start)
      points.push(end)
    }
    if(points.length>1) result.push(points)
  }
  assert(result.length,'Empty reviewed road subsegment')
  return result.length===1?{type:'LineString',coordinates:result[0]}:{type:'MultiLineString',coordinates:result}
}
function subsegment(parentName,segment,name,from,to,start,end,citation,extraEvents=[]) {
  const parent=backfill.features.find(f=>f.properties.modernNameZh===parentName)
  const id=`${parent.properties.featureGroupId}-history-${segment}`
  const existing=backfill.features.findIndex(f=>f.properties.featureGroupId===id)
  const feature={...parent,geometry:clip(parent.geometry,from,to),properties:{...parent.properties,
    id,featureGroupId:id,modernNameZh:`${parentName}（${segment}）`,
    historicalName:`${parent.properties.historicalName} (${{'东段':'east','西段':'west','南段':'south','北段':'north'}[segment]})`,historicalChinese:name,
    aliases:[name,parentName],labelYear:start,roadLabelEndYear:end,roadHistoryParentGroupId:parent.properties.featureGroupId,
  }}
  if(existing<0)backfill.features.push(feature);else backfill.features[existing]=feature
  const later=profiles[parentName].events.filter(e=>e.year!==undefined&&e.year>=end&&e.mapName!=='')
  assert(later.length,`Missing later whole-road name for ${parentName}`)
  profiles[feature.properties.modernNameZh]={events:[observed(start,name,citation),...extraEvents,...later],note:`${segment}历史名称仅适用于本段；合并后由整条${parentName}统一显示。`}
}
const roadGeometry=name=>backfill.features.find(f=>f.properties.modernNameZh===name).geometry
const bai=roadGeometry('白渡路'), baiLength=metrics(bai).total
const yuelai=atIntersection(bai,[117106617])
const baiCitation={url:'https://www.meipian.cn/3xvf1tzw',sourceTitle:'王家码头街巷文史调查（转引旧路段起讫）'}
subsegment('白渡路','西段','坝基桥街',0,yuelai,1909,1950,baiCitation)
// Modern Ruyi Street stops over 100 m short of Baidu Road. Do not snap it
// across a block or fabricate the old Oil-cart Street boundary. Only the
// separate surviving path east of Zhongshan South Road is unambiguously east.
const eastLength=metrics({type:'LineString',coordinates:lines(bai).at(-1)}).total
subsegment('白渡路','东段','老白渡路',baiLength-eastLength,baiLength,1909,1950,baiCitation)
const jiang=roadGeometry('东江阴街'), jiangCut=atIntersection(jiang,[117575146])
subsegment('东江阴街','西段','复善堂街',0,jiangCut,1904,1930,source('3b639ec07e4a4345'))
subsegment('东江阴街','东段','校场街',jiangCut,metrics(jiang).total,1904,1930,source('3b639ec07e4a4345'))
const dong=roadGeometry('董家渡路'), dongCut=atIntersection(dong,[51294721])
subsegment('董家渡路','西段','小南门大街',dongCut,metrics(dong).total,1907,1950,source('de027b882347dd2f'))
const guang=roadGeometry('光启南路'), tang=atIntersection(guang,[116866368])
subsegment('光启南路','北段','县桥南街',0,tang,1814,1945,source('ce15738876b41968'))
// The source disputes whether the middle/south boundary was Qiaojia Road or
// Gujia Lane. Label only the unambiguous part south of Gujia (now Yujia Lane).
const gujiaIndex=guang.coordinates.findIndex(p=>p[0]===121.4905614&&p[1]===31.2192481)
assert(gujiaIndex>=0,'Missing documented Gujia/Yujia junction')
const gujia=metrics({type:'LineString',coordinates:guang.coordinates.slice(0,gujiaIndex+1)}).total
subsegment('光启南路','南段','大南门大街',gujia,metrics(guang).total,1814,1945,source('ce15738876b41968'))
const wu=roadGeometry('梧桐路'), danfeng=atIntersection(wu,[40034444])
subsegment('梧桐路','西段','天主堂街',0,danfeng,1910,2017,book(2))
subsegment('梧桐路','东段','大生街',danfeng,metrics(wu).total,1910,2017,book(1))

const replacements = new Map(backfill.features.map(f => [f.properties.featureGroupId,f]))
collection.features = collection.features.filter(f => !replacements.has(f.properties.featureGroupId))
collection.features.push(...backfill.features)
const integrations = []
for (const [name, profile] of Object.entries(profiles)) {
  const features = collection.features.filter(f => f.properties.kind === 'road' && f.properties.modernNameZh === name)
  assert(features.length, `No map road for reviewed history ${name}`)
  const groups = new Map(features.map(f => [f.properties.featureGroupId,f.properties]))
  for (const [id,p] of groups) {
    const events = profile.events.map(e => profile.mapHold && e.year ? { ...e, mapName: '' } : e)
    accepted[id] = { modernName: name, historicalNames: [p.historicalName], replaceAllEvents: true,
      ...(profile.predecessor ? { predecessor: profile.predecessor } : {}), events, ...(profile.note ? { note: profile.note } : {}) }
    const years = events.flatMap(e => e.year === undefined ? [] : [e.displayYear ?? e.year])
    for (const feature of features.filter(f => f.properties.featureGroupId === id)) {
      feature.properties.labelYear = Math.min(...years)
      feature.properties.labelYearIsFallback = false
      feature.properties.aliases = [...new Set([name,p.historicalName,...events.flatMap(e=>
        !e.name.includes('、') && !e.segment && e.mapName !== '' ? [e.name] : [])])]
    }
    integrations.push({ featureGroupId: id, modernName: name, events: events.length })
  }
}
// Copy canonical properties back so a future data:old-city-roads does not restore old years.
for (const feature of backfill.features) {
  const current = collection.features.find(f => f.properties.id === feature.properties.id)
  if (current) feature.properties = { ...current.properties }
}
const reviews = input.features.map(f => {
  const name = f.properties.modernNameZh.replace(/（.*$/, '')
  const key = f.id.includes('20b-') ? '会馆街' : name === '会馆街' ? '会馆街（旧线）' : name
  const profile = profiles[key]
  return { roadId: f.properties.roadId, modernName: name, originalStages: f.properties.historicalStages,
    decision: profile ? '修正后采用有依据的阶段' : ['水塘街','鲁关路','福禄街'].includes(name) ? '跨区记录单列' : '名称线索保留，未证实年份不进入时间轴',
    reason: profile?.note || corrections[name] || '采用核读正文中明确的道路阶段。',
    correctedEvents: profile?.events ?? [], mapGroups: integrations.filter(r => r.modernName === key).map(r => r.featureGroupId),
    geometry: integrations.some(r => r.modernName === key) ? '项目已有API线形或独立OSM节点' : '未采用交付草图；道路身份及线位另核',
  }
})
assert.equal(reviews.length,58)
assert.equal(new Set(input.features.map(f => f.properties.roadId.replace('extra-20b-','extra-20-').replace('-2018新线',''))).size,57)
const summary = { reviewedRoads: 57, reviewedObjects: reviews.length, integratedGroups: integrations.length,
  integratedEvents: integrations.reduce((s,r) => s+r.events,0), geometryFromInvestigation: 0,
  integratedOriginalRoads: new Set(reviews.filter(r=>r.mapGroups.length).map(r=>r.roadId.replace('extra-20b-','extra-20-').replace('-2018新线',''))).size,
  pendingIntegrationObjects: reviews.filter(r => !r.mapGroups.length).length }
const reviewTable = reviews.map(r=>`| ${r.modernName} | ${r.mapGroups.length ? '核实阶段已写入地图' : r.decision} | ${r.reason.replaceAll('|','／')} |`).join('\n')
const report = `# 老城厢道路历史核查与地图更新\n\n核查日期：2026-11-07。输入57条原道路记录，因会馆街新旧线拆分，共58个对象。\n\n已把21条原道路记录的可确认内容写入地图，涉及22个道路对象、9个历史分段，共31组、${summary.integratedEvents}个事件。现线沿用项目此前独立取得的OSM节点，会馆弄改用完整5节点，另补大昌街现存短段与会馆街旧线残段。未采用调查文件的任何草图坐标。\n\n## 采用与保留规则\n\n- 原文明确记筑路、改名的，采用相应事件。只证实某年已有名称的，写“见载”，不冒充始建年。\n- 可信年代区间按最早年显示，原始区间保留。“今日”记录只表示现名已确认，2026是核查年，不是更名年。\n- 分段旧名只标在有依据的对应路段。并名后停止分段标注，整条道路采用新名。\n- 牌坊、会馆、教堂、园林始建不直接转为道路日期；附近河浜也不自动转为道路前身。\n- 其余36个对象的未证实阶段暂未导入，其中含跨区记录。已有杨浦福禄街保留原位，未在老城厢再造同名道路。\n\n## 当前线位与历史阶段的边界\n\n地图以现代街廓和真实路网节点定位，不代表完成了各历史年代的道路形状复原。白渡路的现代如意街线段距白渡路超过100米，未强行跨街坊吸附，也未为中段油车街编造界线，时间线保留该旧名。光启南路的太卿坊与南门大街分界原文有争议，仅标注可确定的北段和顾家弄以南段。\n\n旧改中已消失、道路身份冲突或只能定位范围的对象，仍需另外取得可核定的历史线位；不能据本次历史核查就断言全量57条坐标均已交付。\n\n## 逐路判断\n\n| 现代路名 | 处理 | 核查结论 |\n|---|---|---|\n${reviewTable}\n\n## 校验与复现\n\n- 原始交付、来源索引和抓取原文保存在本目录。\n- 固定版本道路条目保存在wiki-roads.json；独立几何证据保存在osm-line-evidence.json。\n- history-review.json保留全部原始阶段、修正后事件、未采用原因和地图组ID。\n- 运行 npm run data:old-city-history 更新，运行 npm run validate:old-city-history 检查，均不依赖下载目录。\n`
const encode = data => JSON.stringify(data,null,2)+'\n'
const outputs = new Map([
  [`${root}/history-review.json`, encode({ summary, reviews })],
  ['src/data/acceptedRoadHistoryEvents.json', encode(accepted)],
  ['scripts/data/old-city-road-api-backfill.geojson', JSON.stringify(backfill)+'\n'],
  ['public/data/historical-features.geojson', JSON.stringify(collection)+'\n'],
])
if(write)fs.writeFileSync(`${root}/history-review.md`,report)
for (const [file, text] of outputs) {
  if (write) fs.writeFileSync(file,text)
  else assert.deepEqual(read(file),JSON.parse(text),`Outdated reviewed road data: ${file}`)
}
console.log(JSON.stringify(summary))
