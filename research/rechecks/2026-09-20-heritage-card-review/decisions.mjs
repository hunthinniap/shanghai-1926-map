// Explicit identity decisions, not a similarity threshold. Sources from the
// official directory and frozen VS records are added by review-all.mjs.
import { aliasDecisions, aliasHolds, aliasModernAddresses } from './alias-followup.mjs'
const building = 'same-listed-building'
const site = 'same-historical-site'
const complex = 'same-listed-complex'
const component = 'component-of-listed-complex'
export const decisions = [
  ...aliasDecisions,
  [1424, '3M001', complex, '兆豊別墅／兆丰别墅与Jessfield Villa为同一具名住宅群，旧716 CHANGNING ROAD门牌原样保留；长宁政府确认现址长宁路712弄及1929年始建，名录范围按整处别墅群展示。', ['https://www.shcn.gov.cn/col3991/20240220/1254757.html']],
  [657, '4A028', building, 'Strand Theater原中文新光大戏院、旧586 NINGPO ROAD与名录新光大戏院宁波路586号精确相合，1930年沿革一致；不并入隔壁588号中国大饭店。', ['https://commons.wikimedia.org/wiki/File:Strand_Theatre_Shanghai.JPG']],
  [1215, '3N002', complex, '普陀区官方明确上海联合啤酒厂、上海啤酒有限公司与宜昌路130号、今梦清园的沿革；共卡展示名录保存的工业建筑群，注明厂区部分建筑保留，1934与1935年来源差异分列。', ['https://www.shanghai.gov.cn/nw15343/20250305/a5350a8588714dde92d4cba908b5a248.html']],
  [426, '2D017', complex, '原中文建業里、旧440 ROUTE JOSEPH FRELUPT与1930年记录对应建业里。产权经营方记建国西路440—496弄为同一里弄群，保留官网468／488弄地址范围及修缮复建说明，不声称所有楼栋原物保存。', ['https://www.xufang.cn/product/38.html', 'https://zh.wikipedia.org/wiki/建业里_(上海)']],
  [456, '3D008', complex, '原中文上海新村与1939年均与上海新邨建筑群吻合，旧1479 AVENUE JOFFRE和名录淮海中路1487弄分别展示。关联整处历史里弄，不逐号推定某一栋住宅。', ['https://zh.wikipedia.org/wiki/上海新邨', 'https://news.sina.cn/sa/2007-04-26/detail-ikknscsk2148778.d.html']],
  [1603, '4F010', site, '汉壁礼男校旧102 HASKELL ROAD对应名录中州路102号学校旧址；官方原名明确含汉壁礼男校、华童公学及后继学校。共卡按校址沿革，1940年历史记录与约1925年名录校舍分开，不外推校内每栋建筑。', ['https://zh.wikipedia.org/wiki/中州路102号']],
  [1770, '4D040', complex, 'Foncim Apts的中英文楼名对照明确为方建公寓／建成公寓，原643 ROUTE JOSEPH FRELUPT位于名录建国西路641—645号范围；高安路78弄为同一公寓两幢楼的另一门址。', ['https://www.sohu.com/a/335554742_754316', 'https://www.kankanews.com/detail/DgwMkPAnnyW']],
  [526, '1A003', site, '旧12 BUND ROAD与今中山东一路12号为汇丰银行同址沿革。VS的1874年为早期用址记录；汇丰档案确认现大楼1923年6月23日启用，两个年代分别保留。新地址取浦发官网，名录10—12号范围另列。', ['https://history.hsbc.com/collections/snapshots/housing-the-bank/a-shanghai-landmark', 'https://zh.wikipedia.org/wiki/滙豐銀行大樓_(上海)', 'https://www.spdb.com.cn/ebank_2403/personal_online_banking/kpx/202503/t20250329_1130803.shtml']],
  [515, '1A008', site, '怡和的旧27 BUND ROAD与中山东一路27号对应同一用址。1851年历史记录、名录1853年记载及1920年代重建大楼的阶段分开，使用现名录点展示原址沿革。', ['https://m.thepaper.cn/newsDetail_forward_25948319']],
  [538, '3A002', site, '交通银行旧14 BUND ROAD与名录中山东一路14号对应。VS的1940年与名录1946—1948年新楼不混写，共卡表示银行原址后续重建。', ['https://mzj.sh.gov.cn/lnb-wsws/20200518/MZ_LNB12_9195.html']],
  [544, '5A038', site, '德国邮局旧70 FOOCHOW ROAD与福州路70号保护项对应；1903机构记录与1905楼史分别保留，仅按同址沿革关联。', []],
  [1502, '5A002', site, '江海南关旧348 WAIMA与外马路348号相合。原1901设关记录与1922年现楼重建史分别展示；保护项仅为办公楼，不外推整个码头。', ['https://m.thepaper.cn/baijiahao_6306630']],
  [1488, '5A032', complex, '民政局明确公益新天地园为新普育堂旧址；关联名录所列历史建筑群。原机构1911年记录不等于园内每幢建筑建造年，参考点代表园区，保留各建筑分期。', ['https://mzj.sh.gov.cn/2023bsmz/20231101/a9cfb7ad9ea4488ead99cd4fb872933f.html']],
  [681, '1A019', complex, '名录1A019合列老、新永安公司：老楼原记录为CHEKIANG ROAD / NANKING ROAD路口，今门牌南京东路635号；新楼旧门牌为627 NANKING ROAD。共用名录建筑群卡片，分别保留1918年老楼和1930年代新楼记录，不宣称两栋是同一楼体。', ['https://zh.wikipedia.org/wiki/上海永安公司大楼', 'https://zh.wikipedia.org/wiki/新永安大楼']],
  [631, '1A019', complex, '新永安公司627号作为同一名录项的第二栋纳入共同卡片；原始记录、旧门牌、独立年代和用途仍分别保留。', ['https://zh.wikipedia.org/wiki/新永安大楼']],
  [32, '1A011', building, '旧123 BOULEVARD DE MONTIGNY对应西藏南路123号八仙桥青年会；青年会专文及文旅资料确认该楼身份。VS1932与1931年落成记载分列。', ['https://www.ccctspm.org/cppccinfo/14555', 'https://www.meet-in-shanghai.net/cn/shanghai-cultural-relics-protection-unit/eight-immortals-bridge-ymca-256985/']],
  [520, '1A004', site, '江海关13 BUND ROAD与中山东一路13号对应同一海关用址；1857年机构记录与1927年现楼分期保留。', ['https://www.shanghai.gov.cn/nw17239/20251016/c76cc55e5b0345779b3461d653936c82.html']],
  [514, '2A009', building, 'Yokohama Specie Bank即横滨正金银行，中山东一路24号与旧24 BUND ROAD及1924年相合；区别于15号华俄道胜银行旧址。', ['https://zh.wikipedia.org/wiki/横滨正金银行大楼_(上海)']],
  [519, '3A001', site, '扬子保险公司26 BUND ROAD与名录扬子水火保险公司26号对应；VS1916年与现楼1918—1920年建造分列，按同址沿革共卡。', ['https://m.thepaper.cn/newsDetail_forward_25948319']],
  [501, '2A010', complex, '英国领事馆旧32/35 BUND ROAD对应名录中山东一路33号1、2号楼领事馆院落；1872年领事馆沿革保留，点位代表名录建筑群。', ['https://zh.wikipedia.org/wiki/英国驻上海总领事馆']],
  [521, '2A005', building, '中央银行曾使用外滩15号华俄道胜银行大楼；旧15 BUND ROAD与名录中山东一路15号相合。保留华俄道胜与中央银行不同使用时期。', ['https://zh.wikipedia.org/wiki/上海华俄道胜银行大楼']],
  [1647, '3F009', building, '虹口大楼／虹口大旅社均明确位于海宁路449号，1927年记录与楼史相容。同盟通讯社为该楼历史使用记录，不套用对街四川北路894号中国银行大楼。', ['https://zh.wikipedia.org/wiki/虹口大楼']],
  [602, '2A022', site, 'VS602上海银行公会与1682银行俱乐部均列香港路59号、1920年；名录同址为银行公会大楼。共卡保留两条机构记录及1925年楼史，按地点沿革而非断言1920楼仍存。', ['https://zh.wikipedia.org/wiki/银行公会大楼']],
  [169, '2C001', building, '法公董局在霞飞路375号的第二代办公楼与淮海中路381号名录对象相合；保留375／381门牌记载差异，区别于VS85原白尔部路旧局址。', ['https://www.sohu.com/a/164480948_159867']],
  [11, '2A001', site, 'VS11与1236同名邮船公司、同9 QUAI DE FRANCE、同1937年，名录同址法国邮船大楼为中山东二路9号。保留两条航运/贸易记录及名录1939年楼史。', []],
  [596, '4A002', site, '自来水公司旧484 KIANGSE ROAD对应江西中路484号总管理处、自来大楼。1880年机构记录与约1921年现楼分开；不混入464—466号自力大楼或原水塔。', ['https://www.kankanews.com/detail/ZGwkDBrLj2x']],
  [592, '4A003', building, '英商自来水公司办公楼旧466 KIANGSE ROAD对应名录江西中路464—466号自力大楼；采用该项参考点，区别于484号水务总管理处。', ['https://www.kankanews.com/detail/ZGwkDBrLj2x']],
  [1581, '4F014', building, 'Dixwell Apartments即狄思威公寓，旧四川北路1926号在名录1914—1932号范围内，虹口官方楼史的1929年与VS一致。', ['https://www.shhk.gov.cn/zjhk/001003/001003002/20140902/5c4ed168-4e04-4b5d-a25e-ea6d048d317e.html']],
  [502, '2A021', building, '光陆大戏院与光陆大楼由市民政局刊载的楼史明确关联，1928年相符，旧博物院路142号对应虎丘路142—146号。', ['https://mzj.sh.gov.cn/lnb-xw/20231225/215afc5a11864ab0bbd765e379951b5b.html']],
  [533, '3A018', building, '东亚银行与东亚大楼为四川中路299号同一具名银行楼；旧299 SZECHUEN ROAD门址相合。', ['https://wiki.histoire-chine.fr/index.php/Former_East_Asia_Bank_/_东亚大楼']],
  [1689, '1F001', building, 'Broadway Mansions即上海大厦／百老汇大厦，1934年相合。旧20 NORTH SOOCHOW ROAD与今北苏州路20号并列；第一批名录北苏州河路2号作为来源差异保留。', ['https://zh.wikipedia.org/wiki/上海大厦', 'https://www.shanghai.gov.cn/nw17239/20260821/437444e8364445a1a88082f9fbca30b3.html']],
  [1758, '3C001', building, '上海房管2025年修缮报道直接确认Estrella apartment、爱司公寓、瑞金公寓为同一楼；旧150 ROUTE DES SOEURS与名录瑞金一路150号相符。本证据补足此前027的英文楼名缺口。', ['https://m.thepaper.cn/newsDetail_forward_31931889', 'https://commons.wikimedia.org/wiki/File:Estrella_Apartments.jpg']],
  [1436, '3M010', building, '上海私立妇孺医院旧934 GREAT WESTERN ROAD与延安西路934号同址；长宁规划资源局明确1935年建成，与原记录一致。仅关联旧医院保护建筑。', ['https://www.shcn.gov.cn/col7698/20240319/1256510.html']],
  [1749, '2D005', building, 'Empire Mansions为皇家／恩派亚公寓、淮海大楼；旧1326 AVENUE JOFFRE在名录1300—1326号范围。沿用2026-09-17复核中的已确认建筑身份，采用历史建筑参考点，不重新赋予整楼现用途。', ['https://www.xuhui.gov.cn/xxgk/portal/article/detail?id=8a4c0c069a97abda019d3dcaa9bc19f1', 'https://m.thepaper.cn/newsDetail_forward_11946340']],
  [563, '2A033', building, '永年人寿保险公司与广东路93号永年大楼由华安保险楼史直接相连，1910年相符。采用名录点展示原93 CANTON ROAD，银行支行租户不等于整幢楼用途。', ['https://magazine.sinosafe.com.cn/?p=8292']],
  [292, '2C005', building, 'Cercle Sportif Français即法国总会，1926年旧290 ROUTE CARDINAL MERCIER对应今茂名南路58号保留建筑；共卡限法国总会旧楼，不包括后来花园饭店高层。', ['https://zh.wikipedia.org/wiki/法国总会']],
  [588, '5A023', building, 'Bank of Canton即广东银行，旧52 NINGPO ROAD与名录宁波路52号广东银行大楼吻合。天津路2号、江西中路349号另一广东银行保护项继续独立。', []],
  [601, '3A013', building, '黄浦档案馆明确青年协会大楼从博物院路131号至今虎丘路131号、后名虎丘公寓的沿革；采用历史建筑点。区别于虎丘路128号广学大楼及西藏南路123号青年会。', ['https://web.chinamcloud.com/shhpdst/tzypc/dacl/27020558.shtml', 'https://www.shobserver.cn/wx/detail.do?id=16690']],
  [1742, '4D033', building, 'Dufour Apartments即巨福公寓，后名安康公寓；旧176 ROUTE LOUIS DUFOUR与今乌鲁木齐南路176号对应。', ['https://zh.wikipedia.org/wiki/安康公寓']],
  [1076, '5B033', site, '协进学校旧1550 BUBBLING WELL ROAD与名录南京西路1550号相合，官方原名同时列程氏旧居和协进初级中学。按宅邸与学校不同使用阶段共卡，保留幼儿园、小学、中学历史记录。', []],
  [21, '2A052', building, '中汇银行旧143 EDWARD VII对应延安东路143号中汇大厦，1934年相合；河南南路16号为同楼另一临街门牌。', ['https://zh.wikipedia.org/wiki/上海中汇大厦']],
  [418, '2D016', building, 'Dauphiné Apartments即道斐南／法国太子公寓，今建国公寓；1935年旧394 ROUTE JOSEPH FRELUPT与名录建国西路394号相合。', ['https://zh.wikipedia.org/wiki/建国公寓', 'https://www.sohu.com/a/554546322_121124747']],
  [1430, '4M018', complex, '长宁区资料明确岐山邨／岐山村为愚园路1032弄住宅群，1925—1931年建设与VS1925年相容。共卡按建筑群范围，不将门牌参考点当每栋楼中心。', ['https://www.shcn.gov.cn/col6991/20231009/1245614.html']],
  [1531, '1M002', building, 'Sassoon Villa、沙孙／沙逊别墅、1932年及虹桥路2409号相符；区分同路2419号虹桥俱乐部与其他别墅，采用本项历史建筑参考点。', ['https://zh.wikipedia.org/wiki/沙逊别墅']],
  [4107, '1G003', complex, '杨浦区官方沿革确认830 YANGTSZEPOO ROAD对应杨树浦路830号水厂。共卡代表水厂历史建筑群与持续扩建的厂址，点位不表示所有设施建于同年。', ['https://www.shyp.gov.cn/shypq/myyp/20250307/475623.html']],
  [548, '2A002', building, 'Union Building与有利银行记录共同纳入有利大楼卡片。沿革文章明确广东路正门17号、外滩旧石刻4号与今3号属于同楼；1916年楼体记录和年代待考的银行使用记录分开保存。', ['https://www.thepaper.cn/newsDetail_forward_9189183']],
  [551, '2A002', building, 'Mercantile Bank of India, London and China为有利银行，旧4 BUND ROAD与今中山东一路3号的门牌变化有明确文献，与Union Building旧17 CANTON ROAD共卡；本条未提供可靠起年，仍标年代待考，不借用1916年作银行入驻年。', ['https://www.thepaper.cn/newsDetail_forward_9189183', 'https://fgj.sh.gov.cn/yxlsjzcs/20200331/30c648cb811f401192bb61dd1dd487c9.html']],
  [568, '2A030', site, '185 FOOCHOW ROAD对应福州路185号总巡捕房用址。原条目的1891年及旧楼照片、1933—1935年新楼照片属于两代实体，旧楼后来拆除；按警署原址沿革共卡，不把1891年楼体写成现存建筑，也不把街角旧楼范围等同新楼占地。', ['https://www.virtualshanghai.net/Photos/Images?ID=1568', 'https://www.virtualshanghai.net/Photos/Images?ID=1569', 'https://www.chinaqw.com/qx/2021/02-26/287386.shtml']],
  [291, '1C005', component, 'Grosvenor House仅对应名录1C005内的峻岭公寓／今锦江饭店贵宾楼。共卡采用名录建筑群参考点，历史名称、1935年与酒店用途只作用于该栋，不扩展至名录另列的楼体，也不包含独立1C004华懋公寓。', ['https://www.gzw.sh.gov.cn/shgzw_zxzx_gqdt/20231124/b15d2cc62acf40e1856f52a7277b28bf.html']],
  [407, '4D004', component, 'Adeodata Hall对应淮海中路1209号天赐大宅，现上音音乐会客厅，是4D004所列1189、1199、1209号三栋住宅之一。共卡不把1209号的楼史与用途赋给另外两栋，位置为名录建筑群参考点。', ['https://wmzx.shcmusic.edu.cn/2024/0117/c1160a50160/pagem.htm']],
  [1665, '4F008', component, '虹口政府明确闵行路181号角田公寓内曾开设万岁馆。旅馆旧181 MINHONG作为公寓的局部历史使用纳入同一卡片；名录闵行171—181、201—211与峨眉70—80号范围全部保留，不将整项公寓都称为旅馆。', ['https://www.shhk.gov.cn/zjhk/001007/001007002/20220916/d5dda7dc-c3c6-44ff-86ef-ee3184a20061.html']],
  [1092, '4B001', site, '哈同花园／爱俪园旧址后来建设中苏友好大厦，今上海展览中心。共卡按园址消失后再开发的地点沿革，花园与1954年起建的新建筑不是同一建筑；名录参考点仅代表后期建筑，不代表旧园全境或原园建筑位置。', ['https://expo.sww.sh.gov.cn/browser/detail.jspx?code=402881e144722a710144727790b70000', 'https://www.aisixiang.com/data/122073.html']],
]

export const holds = [
  ...aliasHolds,
  [4136, '5D060', '培福里具名相合，但原190 Avenue du Roi Albert不能直接等同陕西南路186弄；186弄大培福里与188弄纪家花园／小培福里需分清。原始点又是按188号附近推估，未证具体建筑群范围前暂不合并。', ['https://www.thepaper.cn/newsDetail_forward_24280585']],
  [540, '2A044', 'VS540英文Mitsui Bank、中文三菱銀行互相矛盾，旧36 KIUKIANG ROAD与九江路36号只是门牌候选；需确认到底是哪家银行及建筑使用史，不按号码自动并入中华邮政储金汇业局。', []],
  [541, '2A043', 'VS541英文Mitsubishi Bank、中文三井銀行互相矛盾，且与VS540的中英文名称交叉；旧50 KIUKIANG ROAD暂不足以证明上海公库楼的机构沿革，先核原银行身份。', []],
  [560, '2A003', '原记录为7 BUND ROAD，而名录中国通商银行保护项为中山东一路6号；银行曾使用邻楼的可能性尚未排除，不能把7→6当作已证门牌重编。', []],
]

export const modernAddresses = {
  ...aliasModernAddresses,
  526: { address: '中山东一路12号', sourceUrl: 'https://www.spdb.com.cn/ebank_2403/personal_online_banking/kpx/202503/t20250329_1130803.shtml', title: '浦发银行官网 · 注册地址' },
  1689: { address: '北苏州路20号', sourceUrl: 'https://www.shanghai.gov.cn/nw17239/20260821/437444e8364445a1a88082f9fbca30b3.html', title: '上海市政府 · 上海大厦门址' },
}

export const grouping = { '1A019': [681, 631], '2A002': [548, 551] }
