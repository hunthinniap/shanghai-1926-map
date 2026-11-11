# 历史建筑高德 POI 核对（2026-11-09）

共 632 项，562 项有 POI ID。

- 根据用户提供的四份 JSON 静态交叉检查，不等于逐条访问高德实时详情，也未核定 POI 当前有效性。
- 按官方编号、原名称和门址校验输入与现有名录身份一致，保留原始 POI 字段、查询词及匹配阶段。
- 高德 GCJ-02 转换为 WGS84 后再与现有地图参考点比较。现有点也可能偏差，距离不单独作为判错依据。
- 可接入仅指具名名称＋官方门牌一致或交集＋参考点距离≤150米＋唯一分配＋无位置复核标记的保守初筛；不是建筑边界、每个组成物或现状的认证。
- 道路／路口结果不作为建筑 POI 接入。名称、官方门址均无佐证且参考点距离>500米的结果暂列不宜接入，仍可复核。
- 同名异址、异名同址、园区和单栋范围、多个名录项共用 POI、缺坐标等情况保留复核，不自动替换 ID。
- 不直接采用输入 markerUri：统一使用官方支持的 markers=POIID 格式，以免附带坐标掩盖 POI 身份错配。

| 批次 | 总数 | 可接入（初筛） | 不宜接入 | 需要复核 | 缺少 POI |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 61 | 15 | 6 | 39 | 1 |
| 2 | 175 | 25 | 29 | 117 | 4 |
| 3 | 162 | 27 | 30 | 100 | 5 |
| 4 | 234 | 42 | 30 | 102 | 60 |
| 合计 | 632 | 109 | 95 | 358 | 70 |

[可筛选的完整对照表](audit.html) · [完整 JSON 与逐项理由](audit.json)

重跑：

```sh
node scripts/audit-heritage-amap-pois.mjs /path/001_with_poiid.json /path/002_with_poiid.json /path/003_with_poiid.json /path/004_with_poiid.json
```

## 可接入（初筛）（109）

| 编号 | 历史建筑 | 名录地址 | 高德地点 | 高德地址 | 距离（米） |
| --- | --- | --- | --- | --- | ---: |
| 1A007 | 中国银行 | 中山东一路23号 | [中国银行(上海市分行营业部)](https://uri.amap.com/marker?markers=B00155KIMU&src=shanghai_heritage&callnative=1) | 中山东一路23号 | 31 |
| 1A011 | 八仙桥基督教青年会 | 西藏南路123号 | [八仙桥基督教青年会](https://uri.amap.com/marker?markers=B0FFF2Y0SA&src=shanghai_heritage&callnative=1) | 西藏南路123号 | 6 |
| 1A014 | 西桥青年会 | 南京西路150号 | [体育大厦(南京西路)](https://uri.amap.com/marker?markers=B00155L4SP&src=shanghai_heritage&callnative=1) | 南京西路150号(新世界城旁边) | 10 |
| 1A016 | 大光明大戏院 | 南京西路216号 | [大光明电影院(总店)](https://uri.amap.com/marker?markers=B0LKUAVV1K&src=shanghai_heritage&callnative=1) | 南京西路216号 | 45 |
| 1A021 | 新新公司 | 南京东路720号 | [上海市第一食品商店](https://uri.amap.com/marker?markers=B00156D7O6&src=shanghai_heritage&callnative=1) | 南京东路720号(近贵州路) | 16 |
| 1A022 | 大新公司 | 南京东路830号 | [上海市第一百货商店(第一百货商业中心店)](https://uri.amap.com/marker?markers=B0H339XD1V&src=shanghai_heritage&callnative=1) | 南京东路830号第一百货商业中心1层 | 57 |
| 1A025 | 圣三一基督教堂 | 九江路201号 | [圣三一堂](https://uri.amap.com/marker?markers=B00155KKVR&src=shanghai_heritage&callnative=1) | 九江路201号 | 13 |
| 1A026 | 金城银行 | 江西中路200号 | [交通银行(上海市分行营业部)](https://uri.amap.com/marker?markers=B00154DD1A&src=shanghai_heritage&callnative=1) | 江西中路200号(南京东路地铁站3号口步行450米) | 37 |
| 1C005 | 峻岭公寓、茂名公寓 | 茂名南路59号 | [锦江饭店](https://uri.amap.com/marker?markers=B001540EE6&src=shanghai_heritage&callnative=1) | 茂名南路59号 | 28 |
| 1B001 | 美琪大戏院 | 江宁路66号 | [美琪大戏院](https://uri.amap.com/marker?markers=B00150C921&src=shanghai_heritage&callnative=1) | 江宁路66号(南京西路地铁站1号口步行350米) | 4 |
| 1B003 | 涌泉坊 | 愚园路395弄1-24号 | [涌泉坊](https://uri.amap.com/marker?markers=B00154DIRM&src=shanghai_heritage&callnative=1) | 愚园路395弄4-24号 | 38 |
| 1B004 | 裕华新村 | 富民路182弄1-32、178、180、184、186号 | [裕华新村](https://uri.amap.com/marker?markers=B00155L351&src=shanghai_heritage&callnative=1) | 富民路182弄1-32号 | 3 |
| 1B005 | 嘉道理爵士住宅 | 延安西路64号 | [中国福利会少年宫(延安西路)](https://uri.amap.com/marker?markers=B00155IVYR&src=shanghai_heritage&callnative=1) | 延安西路64号(贵都酒店对面) | 21 |
| 1D003 | 汾阳路79号住宅 | 汾阳路79号 | [上海市工艺美术研究所](https://uri.amap.com/marker?markers=B001547C38&src=shanghai_heritage&callnative=1) | 汾阳路79号上海市工艺美术博物馆 | 41 |
| 1M005 | 泰安路115弄花园里弄住宅 | 泰安路115弄1-8号 | [泰安路115弄小区](https://uri.amap.com/marker?markers=B0FFF8YR1H&src=shanghai_heritage&callnative=1) | 泰安路115弄1-8号 | 5 |
| 2A021 | 光陆大戏院 | 虎丘路142-146号 | [光陆大楼](https://uri.amap.com/marker?markers=B00155LKKO&src=shanghai_heritage&callnative=1) | 虎丘路142-146号 | 23 |
| 2A022 | 银行公会大楼 | 香港路59号 | [上海银行公会](https://uri.amap.com/marker?markers=B0FFF00N9Z&src=shanghai_heritage&callnative=1) | 香港路59号 | 2 |
| 2A024 | 女青年会大楼 | 圆明园路133号 | [女青年会大楼](https://uri.amap.com/marker?markers=B00155QPRT&src=shanghai_heritage&callnative=1) | 圆明园路133号 | 19 |
| 2A038 | 都城饭店 | 江西中路180号 | [上海外滩锦江都城新城饭店](https://uri.amap.com/marker?markers=B0FFH5FCWA&src=shanghai_heritage&callnative=1) | 江西中路180号 | 10 |
| 2A042 | 物业供应站 | 九江路89号 | [上海医药工业有限公司](https://uri.amap.com/marker?markers=B00155C0AB&src=shanghai_heritage&callnative=1) | 九江路89号江川大楼F1层 | 8 |
| 2A043 | 上海公库 | 九江路50号 | [中国建设银行(上海第五支行)](https://uri.amap.com/marker?markers=B00155CC8S&src=shanghai_heritage&callnative=1) | 九江路50号 | 12 |
| 2A044 | 中华邮政储金汇业局 | 九江路36号 | [中国邮政储蓄银行(黄浦支行)(暂停营业)](https://uri.amap.com/marker?markers=B00155FH2F&src=shanghai_heritage&callnative=1) | 九江路36号(近中山东一路) | 18 |
| 2A046 | 企业大楼 | 四川中路33号 | [创业大楼(四川中路)](https://uri.amap.com/marker?markers=B001541F3F&src=shanghai_heritage&callnative=1) | 四川中路33号(豫园地铁站6号口步行450米) | 16 |
| 2A050 | 东方饭店 | 西藏中路120号 | [上海市工人文化宫](https://uri.amap.com/marker?markers=B0FFG0685M&src=shanghai_heritage&callnative=1) | 西藏中路120号(近北海路) | 38 |
| 2C001 | 法公董局 | 淮海中路381号 | [中环广场办公大楼](https://uri.amap.com/marker?markers=B00155LV6D&src=shanghai_heritage&callnative=1) | 淮海中路381号中环广场L1层 | 24 |
| 2C004 | 国泰大戏院 | 淮海中路870号 | [国泰电影院(淮海中路店)](https://uri.amap.com/marker?markers=B001526481&src=shanghai_heritage&callnative=1) | 淮海中路870号(陕西南路地铁站3号口旁) | 12 |
| 2C005 | 法国总会 | 茂名南路58号 | [花园饭店](https://uri.amap.com/marker?markers=B00155QJJP&src=shanghai_heritage&callnative=1) | 茂名南路58号 | 16 |
| 2B004 | MEDHURST大楼 | 南京西路934号 | [泰兴大楼](https://uri.amap.com/marker?markers=B00155GL8C&src=shanghai_heritage&callnative=1) | 南京西路934号(南京西路地铁站1号口步行80米) | 10 |
| 2B012* | 住宅 | 陕西北路80号 | [上海第二工业大学静安分校](https://uri.amap.com/marker?markers=B0FFGSJ5XY&src=shanghai_heritage&callnative=1) | 陕西北路80号(南京西路地铁站12号口步行350米) | 27 |
| 2B021 | 景华新邨 | 巨鹿路820弄（1-51号），巨鹿路800-818号、822-836号（双号） | [景华新邨](https://uri.amap.com/marker?markers=B00155IRJB&src=shanghai_heritage&callnative=1) | 巨鹿路820弄1-82号(静安寺地铁站8号口步行480米) | 53 |
| 2H001 | 四行仓库 | 光复路21号 | [上海四行仓库抗战纪念馆](https://uri.amap.com/marker?markers=B0GKOS77AU&src=shanghai_heritage&callnative=1) | 光复路21号(曲阜路地铁站2号口步行300米) | 37 |
| 2D002 | 亨利公寓 | 淮海中路1160-1164号 | [淮中大楼](https://uri.amap.com/marker?markers=B001519F77&src=shanghai_heritage&callnative=1) | 淮海中路1162号(常熟路地铁站2号口步行310米) | 4 |
| 2D004 | 上方花园 | 淮海中路1285弄 | [上方花园](https://uri.amap.com/marker?markers=B001533255&src=shanghai_heritage&callnative=1) | 淮海中路1285弄之4-77号(常熟路地铁站1号口旁) | 75 |
| 2D021 | 华盛顿公寓 | 衡山路303号 | [西湖公寓](https://uri.amap.com/marker?markers=B00155LHDW&src=shanghai_heritage&callnative=1) | 衡山路303-307号(衡山路地铁站1号口步行170米) | 29 |
| 2D037 | 密丹公寓 | 武康路115号 | [密丹公寓](https://uri.amap.com/marker?markers=B0HGOCUZKG&src=shanghai_heritage&callnative=1) | 武康路115号(上海图书馆地铁站3号口步行410米) | 5 |
| 2D040 | 自由公寓 | 五原路258号 | [自由公寓](https://uri.amap.com/marker?markers=B0FFFWQHY9&src=shanghai_heritage&callnative=1) | 五原路258号 | 26 |
| 2D043 | 会乐精舍 | 复兴西路34号 | [卫乐公寓(不对外开放)](https://uri.amap.com/marker?markers=B00156TLS5&src=shanghai_heritage&callnative=1) | 复兴西路34号(上海图书馆地铁站2号口步行440米) | 30 |
| 2D044 | 克莱门公寓 | 复兴中路1363弄 | [克莱门公寓](https://uri.amap.com/marker?markers=B00155LB2S&src=shanghai_heritage&callnative=1) | 复兴中路1363弄1-38号 | 27 |
| 2F010 | 景灵堂 | 昆山路135号 | [景灵堂](https://uri.amap.com/marker?markers=B001549103&src=shanghai_heritage&callnative=1) | 昆山路135号(近乍浦路) | 22 |
| 2M004 | 西园大厦 | 愚园路1396号 | [西园公寓](https://uri.amap.com/marker?markers=B00156NM3I&src=shanghai_heritage&callnative=1) | 愚园路1396号(中山公园地铁站8号口步行250米) | 31 |
| 3A001 | 扬子大楼/扬子水火保险公司 | 中山东一路26号 | [中国农业银行(上海外滩支行)](https://uri.amap.com/marker?markers=B00154DFQL&src=shanghai_heritage&callnative=1) | 中山东一路26号 | 21 |
| 3A002 | 交通银行/交通银行 | 中山东一路14号 | [上海市总工会](https://uri.amap.com/marker?markers=B00154DWWV&src=shanghai_heritage&callnative=1) | 中山东一路14号 | 7 |
| 3A004 | 普益大楼/普益地产公司 | 四川中路106-110号 | [上海电气集团](https://uri.amap.com/marker?markers=B0FFK77OSZ&src=shanghai_heritage&callnative=1) | 四川中路110号 | 20 |
| 3A006 | 中南大楼/中南银行 | 汉口路110号 | [中南大楼](https://uri.amap.com/marker?markers=B0FFF3AP20&src=shanghai_heritage&callnative=1) | 汉口路110号(南京东路地铁站2号口步行490米) | 9 |
| 3A010 | 颐中大楼/ 英美颐中烟草股份有限公司 | 南苏州路175号 | [颐中大楼](https://uri.amap.com/marker?markers=B0J1BOTLUX&src=shanghai_heritage&callnative=1) | 南苏州路175号 | 2 |
| 3A013 | 青年协会大楼 | 虎丘路131号 | [虎丘公寓](https://uri.amap.com/marker?markers=B00155M02M&src=shanghai_heritage&callnative=1) | 虎丘路131号 | 17 |
| 3A018 | 东亚大楼 | 四川中路299号 | [东亚银行大厦](https://uri.amap.com/marker?markers=B00155LXUM&src=shanghai_heritage&callnative=1) | 四川中路299号(南京东路地铁站2号口步行420米) | 18 |
| 3C002 | 泰山公寓 | 淮海中路622弄 | [泰山公寓](https://uri.amap.com/marker?markers=B00156YKGU&src=shanghai_heritage&callnative=1) | 淮海中路622弄1-8号(淮海中路地铁站1号口步行230米) | 20 |
| 3C003 | 飞霞别墅 | 淮海中路584弄1-14号，成都南路142弄1-7号，成都南路132弄33-38号 | [飞霞别墅](https://uri.amap.com/marker?markers=B0KA35RREL&src=shanghai_heritage&callnative=1) | 淮海中路584弄(淮海中路地铁站2号口步行500米) | 3 |
| 3C011 | 巴黎新村 | 重庆南路169弄 | [巴黎新村旧址](https://uri.amap.com/marker?markers=B0FFF2A2K4&src=shanghai_heritage&callnative=1) | 重庆南路169弄1-110号 | 29 |
| 3B006 | 住宅 | 青海路44号 | [岳阳医院名医特诊部专家门诊](https://uri.amap.com/marker?markers=B0FFFR8TMG&src=shanghai_heritage&callnative=1) | 青海路44号岳阳医院青海路诊部南楼3层 | 59 |
| 3B007 | 善钟里 | 常熟路113弄2-31号 | [善钟里](https://uri.amap.com/marker?markers=B0FFFWTY78&src=shanghai_heritage&callnative=1) | 常熟路113弄(常熟路地铁站8号口步行340米) | 48 |
| 3B011 | 住宅 | 巨鹿路675-681号 | [上海市作家协会](https://uri.amap.com/marker?markers=B00154DIID&src=shanghai_heritage&callnative=1) | 巨鹿路675号 | 13 |
| 3B012 | 住宅 | 南京西路1522弄 | [铜仁小区](https://uri.amap.com/marker?markers=B00155KQF9&src=shanghai_heritage&callnative=1) | 南京西路1522弄2-70号 | 51 |
| 3B016 | 杜美新村 | 长乐路764弄 | [长乐新村](https://uri.amap.com/marker?markers=B00155L34Z&src=shanghai_heritage&callnative=1) | 长乐路764弄1-29号 | 33 |
| 3B022 | 文元坊 | 愚园路608弄 | [文元坊](https://uri.amap.com/marker?markers=B0FFFGVOWM&src=shanghai_heritage&callnative=1) | 愚园路608弄 | 57 |
| 3D014 | 住宅 | 湖南路262号 | [湖南别墅](https://uri.amap.com/marker?markers=B001559VUE&src=shanghai_heritage&callnative=1) | 湖南路262号 | 144 |
| 3D035 | 江南弹药局 | 龙华路2577号（烈士陵园北部） | [2577创意大院](https://uri.amap.com/marker?markers=B00155HO2A&src=shanghai_heritage&callnative=1) | 龙华路2577号(近龙华寺)(龙华地铁站3号口步行430米) | 19 |
| 3F002 | 长春公寓 | 长春路304号 | [长春公寓](https://uri.amap.com/marker?markers=B0FFH1X3ZQ&src=shanghai_heritage&callnative=1) | 长春路304、314、336、348号 | 49 |
| 3F008 | 西本愿寺 | 乍浦路455号 | [西本愿寺旧址](https://uri.amap.com/marker?markers=B0FFFEA37K&src=shanghai_heritage&callnative=1) | 乍浦路455号(四川北路地铁站2号口步行250米) | 11 |
| 3F010 | 住宅 | 多伦路215号 | [上海纺织老干部活动室](https://uri.amap.com/marker?markers=B00151181D&src=shanghai_heritage&callnative=1) | 多伦路215号 | 5 |
| 3M001 | 兆丰别墅 | 长宁路712弄 | [兆丰别墅](https://uri.amap.com/marker?markers=B00155L3TQ&src=shanghai_heritage&callnative=1) | 长宁路712弄1-168号 | 104 |
| 3M008 | 沪西别墅/沪西别业 | 愚园路1210弄东侧 | [沪西别墅](https://uri.amap.com/marker?markers=B0FFF4G2JO&src=shanghai_heritage&callnative=1) | 愚园路1210弄2-86号 | 46 |
| 3M018 | 梅泉别墅 | 新华路593弄 | [梅泉别墅](https://uri.amap.com/marker?markers=B00155L2UH&src=shanghai_heritage&callnative=1) | 新华路593弄1-20号 | 19 |
| 3M022 | 海格园 | 华山路1006弄 | [海格园](https://uri.amap.com/marker?markers=B00155LAOE&src=shanghai_heritage&callnative=1) | 华山路1006弄1-30号 | 27 |
| 3M028 | 达华公寓 | 延安西路918-928号 | [上海静安寺锦江都城达华宾馆](https://uri.amap.com/marker?markers=B0J06UNVNW&src=shanghai_heritage&callnative=1) | 延安西路918号 | 20 |
| 3M029 | 丁香花园 | 华山路922号 | [丁香别墅](https://uri.amap.com/marker?markers=B00150FCBE&src=shanghai_heritage&callnative=1) | 华山路922号(镇宁路) | 69 |
| 4A002 | 英商自来水公司大楼 | 江西中路484号 | [英商自来水公司大楼](https://uri.amap.com/marker?markers=B00156EC49&src=shanghai_heritage&callnative=1) | 江西中路484号 | 4 |
| 4A005 | 恒丰大楼 | 江西中路450号-454号 | [恒丰大楼](https://uri.amap.com/marker?markers=B00155EDXH&src=shanghai_heritage&callnative=1) | 江西中路452号(南京东路地铁站6号口步行400米) | 19 |
| 4A009 | 中一信托大楼/；中一信托股份公司 | 北京东路270号 | [中一大楼](https://uri.amap.com/marker?markers=B00155KMTF&src=shanghai_heritage&callnative=1) | 北京东路270号(南京东路地铁站6号口步行280米) | 22 |
| 4A010 | 盐业大楼/盐业银行 | 北京东路280号 | [盐业大楼](https://uri.amap.com/marker?markers=B00155N7CN&src=shanghai_heritage&callnative=1) | 北京东路280号(南京东路地铁站6号口步行240米) | 16 |
| 4A013 | 美丰银行 | 河南中路521-529号，；宁波路180号 | [美丰大楼](https://uri.amap.com/marker?markers=B0IKHZAX76&src=shanghai_heritage&callnative=1) | 河南中路521-529号(南京东路地铁站6号口步行50米) | 28 |
| 4A014 | 恒利银行 | 河南中路495号，天津路100号 | [永利大楼](https://uri.amap.com/marker?markers=B0FFG0WOE3&src=shanghai_heritage&callnative=1) | 河南中路495号(南京东路地铁站5号口步行60米) | 16 |
| 4A015 | 上海钱业公会 | 宁波路276号 | [钱业大楼](https://uri.amap.com/marker?markers=B0FFHTQEMG&src=shanghai_heritage&callnative=1) | 宁波路276号(南京东路地铁站5号口步行300米) | 9 |
| 4A016 | 南京饭店 | 山西南路182-200号 | [上海南京路步行街锦江都城南京饭店](https://uri.amap.com/marker?markers=B0FFIS2CPT&src=shanghai_heritage&callnative=1) | 山西南路200号(南京东路地铁站1号口步行100米) | 7 |
| 4A019 | 百乐饭店/同仁医院/教会学校/中国基督教协会 | 九江路219号 | [中国基督教协会](https://uri.amap.com/marker?markers=B00150C7A7&src=shanghai_heritage&callnative=1) | 九江路219号(南京东路地铁站3号口步行220米) | 13 |
| 4A024 | 约克大楼 | 四川南路27-29号（单号），金陵东路14号 | [金陵大楼](https://uri.amap.com/marker?markers=B001515394&src=shanghai_heritage&callnative=1) | 四川南路29号(豫园地铁站7号口步行260米) | 18 |
| 4A025 | 太古洋行 | 中山东二路22号 | [太古洋行](https://uri.amap.com/marker?markers=B0FFGEQZXV&src=shanghai_heritage&callnative=1) | 中山东二路22号 | 41 |
| 4A026 | 金城大戏院 | 北京东路780号 | [黄浦剧场](https://uri.amap.com/marker?markers=B001549495&src=shanghai_heritage&callnative=1) | 北京东路780号 | 10 |
| 4A027 | 三星大舞台/中国大戏院 | 牛庄路700号-714号 | [中国大戏院](https://uri.amap.com/marker?markers=B001532792&src=shanghai_heritage&callnative=1) | 牛庄路704号 | 26 |
| 4A030 | 扬子饭店 | 汉口路740号，云南路287号 | [上海扬子饭店](https://uri.amap.com/marker?markers=B0I1PKGTA1&src=shanghai_heritage&callnative=1) | 汉口路740号(人民广场地铁站14号口旁) | 24 |
| 4C010 | 希勒公寓 | 茂名南路106-124号，南昌路179号 | [钟和公寓](https://uri.amap.com/marker?markers=B00155IFK8&src=shanghai_heritage&callnative=1) | 茂名南路116、122(陕西南路地铁站4号口步行220米) | 14 |
| 4C011 | 梅兰坊 | 黄陂南路596弄1-58号 | [梅兰坊](https://uri.amap.com/marker?markers=B00155IS5P&src=shanghai_heritage&callnative=1) | 黄陂南路596弄1-58号 | 37 |
| 4C017 | 万宜坊 | 重庆南路205弄5-94号 | [万宜坊](https://uri.amap.com/marker?markers=B001557YVF&src=shanghai_heritage&callnative=1) | 重庆南路205弄46号 | 79 |
| 4C019 | 安和新村 | 瑞金二路198弄 | [安和新村](https://uri.amap.com/marker?markers=B00155LAWN&src=shanghai_heritage&callnative=1) | 瑞金二路198弄(打浦桥地铁站1号口步行410米) | 18 |
| 4C021 | 爱麦虞限路9号宅 | 绍兴路9号 | [上海昆剧团(绍兴路)](https://uri.amap.com/marker?markers=B0FFG0WMAB&src=shanghai_heritage&callnative=1) | 绍兴路9号 | 30 |
| 4B001 | 中苏友好大厦 | 延安中路1000号 | [上海展览中心](https://uri.amap.com/marker?markers=B001542F38&src=shanghai_heritage&callnative=1) | 延安中路1000号(静安寺地铁站8号口步行340米) | 14 |
| 4B009 | 沁园邨 | 新闸路1124弄、1106-1134号（双号） | [沁园邨](https://uri.amap.com/marker?markers=B00155AZL5&src=shanghai_heritage&callnative=1) | 新闸路1124弄1-59号 | 44 |
| 4B010 | 刘氏花园住宅，小校经阁(八角楼) | 新闸路1321号 | [小校经阁旧址](https://uri.amap.com/marker?markers=B00156NURN&src=shanghai_heritage&callnative=1) | 新闸路1321号 | 8 |
| 4B014 | 花园住宅 | 陕西北路805号 | [上海市眼科医院](https://uri.amap.com/marker?markers=B0HUCYWE8E&src=shanghai_heritage&callnative=1) | 陕西北路805路3号楼 | 32 |
| 4B019 | 上海市科学馆 | 胶州路601号 | [上海市静安区业余大学](https://uri.amap.com/marker?markers=B00151D24B&src=shanghai_heritage&callnative=1) | 胶州路601号(近昌平路)(昌平路地铁站5号口步行240米) | 48 |
| 4D001 | 杜氏公馆 | 东湖路70号 | [上海东湖宾馆](https://uri.amap.com/marker?markers=B0FFLC6FOO&src=shanghai_heritage&callnative=1) | 东湖路70号 | 109 |
| 4D002 | 花园住宅 | 东湖路17号 | [上海市青年联合会](https://uri.amap.com/marker?markers=B0K03A85C0&src=shanghai_heritage&callnative=1) | 东湖路17号 | 14 |
| 4D021 | 花园住宅 | 五原路314号 | [中国福利会](https://uri.amap.com/marker?markers=B00154QEU7&src=shanghai_heritage&callnative=1) | 五原路314号 | 23 |
| 4D027 | 丽波花园 | 衡山路300弄1-8号 | [丽波花园](https://uri.amap.com/marker?markers=B00156YMV9&src=shanghai_heritage&callnative=1) | 衡山路300弄1-22号(衡山路地铁站1号口步行170米) | 18 |
| 4D028 | 会斯乐公寓/乔治公寓 | 衡山路311-331号 | [集雅公寓](https://uri.amap.com/marker?markers=B0015746W0&src=shanghai_heritage&callnative=1) | 衡山路321号(衡山路地铁站1号口步行270米) | 14 |
| 4D029 | 凯文公寓 | 衡山路525号，建国西路750号 | [城家奢华上海凯文公寓](https://uri.amap.com/marker?markers=B00155IRNU&src=shanghai_heritage&callnative=1) | 衡山路525号 | 23 |
| 4D031 | 东方百代唱片公司办公楼 | 衡山路811号 | [徐家汇公园-百代公司旧址](https://uri.amap.com/marker?markers=B00155HVVN&src=shanghai_heritage&callnative=1) | 衡山路811号 | 9 |
| 4D035 | 花园住宅 | 建国西路602号 | [上海市医学科学技术情报研究所](https://uri.amap.com/marker?markers=B001512EFE&src=shanghai_heritage&callnative=1) | 建国西路602号(衡山路地铁站1号口步行480米) | 13 |
| 4D044 | 花园住宅 | 天平路40号 | [上海文艺医院](https://uri.amap.com/marker?markers=B00155FIOS&src=shanghai_heritage&callnative=1) | 天平路40号(交通大学地铁站1号口步行470米) | 33 |
| 4F001 | 瑞康公寓 | 四川北路18号 | [瑞康公寓旧址](https://uri.amap.com/marker?markers=B0FFF3WZW5&src=shanghai_heritage&callnative=1) | 四川北路18号(天潼路地铁站3号口步行310米) | 6 |
| 4F002 | 大桥公寓 | 四川北路85号 | [大桥大楼](https://uri.amap.com/marker?markers=B00153F4CC&src=shanghai_heritage&callnative=1) | 四川北路85号(天潼路地铁站3号口步行430米) | 15 |
| 4F011 | 工部局宰牲场（宰牛场）/新亚集团产业 | 沙泾路10号、29号 | [1933老场坊](https://uri.amap.com/marker?markers=B00155LPBC&src=shanghai_heritage&callnative=1) | 沙泾路10号 | 44 |
| 4F013 | 广东大戏院/虹光大戏院 | 四川北路1552号 | [群众影剧院](https://uri.amap.com/marker?markers=B001536B3D&src=shanghai_heritage&callnative=1) | 四川北路1552号群众电影院内 | 12 |
| 4F015 | 永安里 | 四川北路1953弄、多伦路152-192号 | [永安里](https://uri.amap.com/marker?markers=B0FFF9ZJ2G&src=shanghai_heritage&callnative=1) | 四川北路1953弄之1-155号 | 78 |
| 4F021 | 恒丰里，新恒丰里 | 山阴路69弄、85弄 | [恒丰里](https://uri.amap.com/marker?markers=B00154D3DE&src=shanghai_heritage&callnative=1) | 山阴路69弄32-108号 | 20 |
| 4F022 | 日照里 | 山阴路133弄 | [东照里](https://uri.amap.com/marker?markers=B001512279&src=shanghai_heritage&callnative=1) | 山阴路133弄之1-113号 | 90 |
| 4F025 | 摩西会堂 | 长阳路62号 | [上海犹太难民纪念馆·摩西会堂](https://uri.amap.com/marker?markers=B00155LXII&src=shanghai_heritage&callnative=1) | 长阳路62号 | 21 |
| 4G004 | 新式里弄 | 杨树浦路3061弄 | [杨树浦路3061弄住宅小区](https://uri.amap.com/marker?markers=B0015118FA&src=shanghai_heritage&callnative=1) | 杨树浦路3061弄1-155号 | 41 |

## 不宜接入（95）

| 编号 | 历史建筑 | 名录地址 | 高德地点 | 高德地址 | 距离（米） |
| --- | --- | --- | --- | --- | ---: |
| 1A001 | 亚西亚大楼 | 中山东一路1号 | [中国太平洋人寿保险股份有限公司(寿宁路店)](https://uri.amap.com/marker?markers=B0J2BZP5IY&src=shanghai_heritage&callnative=1) | 寿宁路71号(大世界地铁站6号口步行360米) | 1534 |
| 1A017 | 跑马总会 | 南京西路325号 | [上海春美术馆](https://uri.amap.com/marker?markers=B0HKDZX2F2&src=shanghai_heritage&callnative=1) | 福州路655号2层(人民广场地铁站15号口步行290米) | 725 |
| 1B007 | 马勒住宅 | 陕西南路30号 | [静安区团委](https://uri.amap.com/marker?markers=B0FFHLDS0S&src=shanghai_heritage&callnative=1) | 巨鹿路915号(静安寺地铁站12号口步行390米) | 1041 |
| 1F001 | 百老会大厦 | 北苏州河路2号 | [海泰国际大厦](https://uri.amap.com/marker?markers=B00155FHXM&src=shanghai_heritage&callnative=1) | 四川北路888号(四川北路地铁站2号口步行370米) | 731 |
| 1F003 | 上海邮政总局 | 北苏州河路250-276号 | [中国证券博物馆](https://uri.amap.com/marker?markers=B0FFK2KA0K&src=shanghai_heritage&callnative=1) | 黄浦路15号 | 535 |
| 1P001 | 佘山天主教堂 | 松江县佘山 | [佘山](https://uri.amap.com/marker?markers=B0FFFDS1MB&src=shanghai_heritage&callnative=1) | 松江区 | 751 |
| 2A001 | 法国邮船大楼 | 中山东二路9号 | [中山东二路](https://uri.amap.com/marker?markers=B00155PQXO&src=shanghai_heritage&callnative=1) | 黄浦区 | 452 |
| 2A006 | 台湾银行 | 中山东一路16号 | [中山东一路](https://uri.amap.com/marker?markers=B0FFH02DA5&src=shanghai_heritage&callnative=1) | 黄浦区 | 39 |
| 2A014 | 四川路桥 | 四川中路 | [四川路桥](https://uri.amap.com/marker?markers=B0IA3K9TIQ&src=shanghai_heritage&callnative=1) | 黄浦区 | 17 |
| 2A016 | 洋 行 | 滇池路120号，四川中路444-464号（双号） | [上海海运(集团)公司离退休服务中心](https://uri.amap.com/marker?markers=B0FFGILMIV&src=shanghai_heritage&callnative=1) | 延安东路272弄32号(豫园地铁站5号口步行370米) | 897 |
| 2A017 | 仁记洋行 | 滇池路100-110号 | [圆明园路与滇池路交叉口](https://uri.amap.com/marker?markers=B0FFGGLKRN&src=shanghai_heritage&callnative=1) | 黄浦区 | 17 |
| 2A018 | 洋 行 | 北京东路81号 | [北京东路与圆明园路交叉口](https://uri.amap.com/marker?markers=B0FFHPKEVA&src=shanghai_heritage&callnative=1) | 黄浦区 | 6 |
| 2A019 | 国华银行大楼 | 北京东路342号 | [国家税务总局上海市黄浦区税务局](https://uri.amap.com/marker?markers=B0FFFZY079&src=shanghai_heritage&callnative=1) | 斜土东路334-336号 | 3775 |
| 2A023 | 洋行 | 圆明园路97号 | [久勇广告](https://uri.amap.com/marker?markers=B0KRN5EVQM&src=shanghai_heritage&callnative=1) | 丽园路887号蒙西小区(马当路地铁站3号口步行460米) | 4038 |
| 2A029 | 正广和公司 | 福州路44号 | [浦汇大厦](https://uri.amap.com/marker?markers=B0FFJ1YQ4K&src=shanghai_heritage&callnative=1) | 福州路318号(南京东路地铁站4号口步行330米) | 505 |
| 2A030 | 总巡捕房 | 福州路185号 | [上海市公安局黄浦分局出入境接待大厅](https://uri.amap.com/marker?markers=B0LDBZF1D2&src=shanghai_heritage&callnative=1) | 中山南路100号金外滩国际广场7层 | 1794 |
| 2A032 | 大来大楼 | 广东路51,59号 | [南京路步行街](https://uri.amap.com/marker?markers=B0FFF5VNSV&src=shanghai_heritage&callnative=1) | 南京东路558号 | 1033 |
| 2A033 | 永年人寿保险公司 | 广东路93号 | [广东路534号](https://uri.amap.com/marker?markers=B0LUDUCV1I&src=shanghai_heritage&callnative=1) | 南京东路街道广东路534号 | 776 |
| 2A034 | 申报馆 | 汉口路309号 | [汉口路](https://uri.amap.com/marker?markers=BZAFR002HG&src=shanghai_heritage&callnative=1) | 黄浦区 | 442 |
| 2A039 | 建设大厦 | 江西中路171-181号（单号） | [上海小楼](https://uri.amap.com/marker?markers=B0J3H4NDKS&src=shanghai_heritage&callnative=1) | 江西中路与宁波路交叉口北60米 | 597 |
| 2A053 | 华商纱布交易所 | 延安东路260号 | [上海市历史博物馆](https://uri.amap.com/marker?markers=B0FFI2885X&src=shanghai_heritage&callnative=1) | 南京西路325号(人民广场地铁站11号口步行200米) | 1571 |
| 2C011 | 花园住宅 | 思南路51-95号(单) | [南昌路51-53号小区](https://uri.amap.com/marker?markers=B0H61ZOLQE&src=shanghai_heritage&callnative=1) | 南昌路与思南路交叉口东140米 | 511 |
| 2B016 | 花园住宅 | 北京西路1301号 | [中信数科上海分公司](https://uri.amap.com/marker?markers=B0MDDOQTK1&src=shanghai_heritage&callnative=1) | 南京西路1168号中信泰富广场L1层 | 513 |
| 2D009 | 花园住宅 | 淮海中路1634号 | [上海图书馆上海科学技术情报研究所教育培训中心](https://uri.amap.com/marker?markers=B001540993&src=shanghai_heritage&callnative=1) | 淮海中路1413号(常熟路地铁站7号口步行350米) | 501 |
| 2D011 | 花园住宅 | 淮海中路1754弄 | [淮海中路1517号](https://uri.amap.com/marker?markers=B0K14AOS3Q&src=shanghai_heritage&callnative=1) | 淮海中路1554号 | 572 |
| 2D020 | 美童公学 | 衡山路10号 | [衡山路](https://uri.amap.com/marker?markers=B0FFH02EQD&src=shanghai_heritage&callnative=1) | 徐汇区 | 398 |
| 2D026 | 永康新村 | 永康路580号 | [永康路](https://uri.amap.com/marker?markers=B0FFGQ57DC&src=shanghai_heritage&callnative=1) | 徐汇区 | 1083 |
| 2D027 | 花园住宅 | 岳阳路110号 | [岳阳路](https://uri.amap.com/marker?markers=B0FFGQAWFQ&src=shanghai_heritage&callnative=1) | 徐汇区 | 232 |
| 2D034 | 中山医院 | 医学院路136号（主楼） | [之俊大厦主楼](https://uri.amap.com/marker?markers=B0MGOZUL57&src=shanghai_heritage&callnative=1) | 斜土路1221、1223号之俊大厦 | 1024 |
| 2D039 | 朱敏堂住宅 | 乌鲁木齐南路151号 | [乌鲁木齐南路](https://uri.amap.com/marker?markers=B0FFH02DHA&src=shanghai_heritage&callnative=1) | 徐汇区 | 166 |
| 2F001 | 日本领事馆/联合救济总署 | 黄浦路106号红楼/灰楼 | [上影国际影城(虹口区今雨荟店)](https://uri.amap.com/marker?markers=B0GKO5795C&src=shanghai_heritage&callnative=1) | 广粤路283号今雨荟6楼601室 | 5440 |
| 2F011 | 虹口救火会 | 哈尔滨路2号 | [虹口区消防救援支队](https://uri.amap.com/marker?markers=B0FFK7EPU9&src=shanghai_heritage&callnative=1) | 北外滩消防救援站南门旁(大连路地铁站4号口步行180米) | 2294 |
| 2M008 | 中西女中 | 江苏路155号东楼/北楼 | [花园大厦东楼](https://uri.amap.com/marker?markers=B00155KJ2A&src=shanghai_heritage&callnative=1) | 长宁路982号(中山公园地铁站10号通道口步行110米) | 1170 |
| 2M009* | 住宅 | 虹桥路2275号 | [武警上海总队医院](https://uri.amap.com/marker?markers=B00156EHM8&src=shanghai_heritage&callnative=1) | 虹许路831号 | 1097 |
| 2M011 | 住宅 | 愚园路754号 | [愚园路](https://uri.amap.com/marker?markers=BZAFR002CG&src=shanghai_heritage&callnative=1) | 长宁区 | 102 |
| 3A007 | 美伦大楼 | 南京东路161号 | [南京东路](https://uri.amap.com/marker?markers=B0FFGX33QM&src=shanghai_heritage&callnative=1) | 黄浦区 | 189 |
| 3A008 | 电力大楼/上海电力公司 | 南京东路181号 | [南京东路](https://uri.amap.com/marker?markers=B0FFGX33QM&src=shanghai_heritage&callnative=1) | 黄浦区 | 235 |
| 3A011 | 沪宁铁路总公司 | 四川中路126弄（5、21号） | [元芳弄与四川中路交叉口](https://uri.amap.com/marker?markers=B0FFLL3S7F&src=shanghai_heritage&callnative=1) | 黄浦区 | 26 |
| 3A012 | 三菱大楼、美孚大楼 | 广东路94-102号/；四川中路109号 | [广东路](https://uri.amap.com/marker?markers=BZAFR00293&src=shanghai_heritage&callnative=1) | 黄浦区 | 536 |
| 3A016 | 四明大楼 | 北京东路232-240号 | [神龙五金建筑装潢材料部](https://uri.amap.com/marker?markers=B0HU9C8HJX&src=shanghai_heritage&callnative=1) | 天津路318号(南京东路地铁站1号口步行360米) | 618 |
| 3A019 | 谦信大楼 | 江西中路138号 | [精达电气成套有限公司物资供应站(三星小区店)](https://uri.amap.com/marker?markers=B00154IYLM&src=shanghai_heritage&callnative=1) | 浙江中路511号 | 1106 |
| 3A020* | 瑞康洋行买办住宅 | 黄陂南路25号乙 | [点都德(环宇荟店)](https://uri.amap.com/marker?markers=B0FFJBZBG2&src=shanghai_heritage&callnative=1) | 黄陂南路838弄环宇荟B1层B125-1-3、B153-1-2单元 | 1427 |
| 3A023 | 中法求新机器轮船制造厂 | 机厂路132号 | [重庆北路132号](https://uri.amap.com/marker?markers=B0L1AAIC29&src=shanghai_heritage&callnative=1) | 南京东路街道重庆北路132号 | 3760 |
| 3A024 | 上海电话局南市总局 | 中华路734号 | [中华路](https://uri.amap.com/marker?markers=BZAFR002FS&src=shanghai_heritage&callnative=1) | 黄浦区 | 652 |
| 3C005 | 法租界霞飞路巡捕房 | 淮海中路217、233号，嵩山路65、67号 | [淮海中路](https://uri.amap.com/marker?markers=B0FFH02FGQ&src=shanghai_heritage&callnative=1) | 黄浦区 | 556 |
| 3B002 | 联华公寓 | 北京西路1341-1383号,铜仁路304-330号,南阳路208-228号 | [北京西路](https://uri.amap.com/marker?markers=B0FFH02EBG&src=shanghai_heritage&callnative=1) | 静安区 | 280 |
| 3B009 | 住宅 | 巨鹿路868-892号 | [巨鹿路](https://uri.amap.com/marker?markers=BZAFR00257&src=shanghai_heritage&callnative=1) | 静安区 | 288 |
| 3B010 | 住宅 | 巨鹿路852弄1-6号、8号、10号，巨鹿路850号 | [巨鹿路](https://uri.amap.com/marker?markers=BZAFR00257&src=shanghai_heritage&callnative=1) | 静安区 | 260 |
| 3B025 | 切尔西住宅 | 南京西路962号 | [南京西路街道图书馆](https://uri.amap.com/marker?markers=B0LGHZNXTK&src=shanghai_heritage&callnative=1) | 升平街33号(南京西路地铁站12号口步行300米) | 575 |
| 3B026 | 住宅 | 延安中路810号 | [延安中路](https://uri.amap.com/marker?markers=B0IA3BEPL1&src=shanghai_heritage&callnative=1) | 静安区 | 171 |
| 3D028 | 住宅 | 永嘉路527弄1-5号 | [永嘉路300弄小区](https://uri.amap.com/marker?markers=B00155LAU1&src=shanghai_heritage&callnative=1) | 永嘉路300弄之1-20号 | 768 |
| 3D031 | 住宅 | 安亭路130、132号 | [安亭路](https://uri.amap.com/marker?markers=BZAFR00296&src=shanghai_heritage&callnative=1) | 徐汇区 | 118 |
| 3F001 | 大陆新村/文华新村/淞云别墅/留青小筑 | 山阴路30、44、64、112、124、132、144、156、168、180、192、208、210弄，甜爱路59号、40号，山阴路2弄1-43号，四川北路2044-2058号 | [大陆新邨](https://uri.amap.com/marker?markers=B00155KREZ&src=shanghai_heritage&callnative=1) | 山阴路144弄之11-20号 | 515 |
| 3F004 | 住宅 | 武进路206-296号 | [武进路](https://uri.amap.com/marker?markers=B0IA3YL69V&src=shanghai_heritage&callnative=1) | 虹口区 | 182 |
| 3F006 | 公寓 | 昆山路227号/昆山路277号/昆山花园路1-10号 | [昆山路](https://uri.amap.com/marker?markers=B0FFH02D5S&src=shanghai_heritage&callnative=1) | 虹口区 | 46 |
| 3G001 | 住宅 | 隆昌路222-266号 | [隆昌路](https://uri.amap.com/marker?markers=BZAGR1016R&src=shanghai_heritage&callnative=1) | 杨浦区 | 273 |
| 3G004 | 上海密丰绒线厂 | 波阳路400号 | [上海创意联盟产业园](https://uri.amap.com/marker?markers=B00155KQU7&src=shanghai_heritage&callnative=1) | 平凉路1055号 | 2584 |
| 3M020 | 住宅 | 新华路179号 | [新华路](https://uri.amap.com/marker?markers=BZAAQZ00SR&src=shanghai_heritage&callnative=1) | 金山区 | 46532 |
| 3M031 | 西区污水处理厂 | 天山路、哈密路口 | [天山路](https://uri.amap.com/marker?markers=B0HGTS8IQR&src=shanghai_heritage&callnative=1) | 长宁区 | 1695 |
| 3N002 | 上海啤酒有限公司 | 宜昌路130号 | [钢管厂五区小郡肝串串香火锅(长寿路魔都直营店)](https://uri.amap.com/marker?markers=B0FFL2MNLU&src=shanghai_heritage&callnative=1) | 长寿路街道胶州路951号(长寿路地铁站5号口步行320米) | 1346 |
| 3N004 | 中华书局印刷厂澳门路新厂 | 澳门路477号 | [澳门路](https://uri.amap.com/marker?markers=BZAFR0023V&src=shanghai_heritage&callnative=1) | 普陀区 | 136 |
| 3N005 | 福新面粉厂、阜丰面粉厂 | 莫干山路120号 | [罗盖特贸易(上海)有限公司](https://uri.amap.com/marker?markers=B0FFKQWD9L&src=shanghai_heritage&callnative=1) | 金沙江路980号(大渡河路地铁站4号口步行150米) | 5405 |
| 3W002 | 住宅 | 钱仓路316号 | [钱仓路](https://uri.amap.com/marker?markers=B0FFGQ5D81&src=shanghai_heritage&callnative=1) | 浦东新区 | 8 |
| 3J001 | 天主堂 | 闵行区七莘路9号桥 | [七莘路](https://uri.amap.com/marker?markers=BZAFQZ02D7&src=shanghai_heritage&callnative=1) | 闵行区 | 8555 |
| 3R001 | 黄家花园 | 崇明县城桥镇南门港街26号 | [南门港街](https://uri.amap.com/marker?markers=BZAKR000N2&src=shanghai_heritage&callnative=1) | 崇明区 | 211 |
| 4A001 | 上海基督教青年会 | 四川中路595-607号 | [四川中路49号大楼](https://uri.amap.com/marker?markers=B00155HPY2&src=shanghai_heritage&callnative=1) | 四川中路49号(豫园地铁站6号口步行480米) | 991 |
| 4A011 | 上海洋行/上海商业储蓄银行 | 宁波路40、50号，；江西中路368号 | [浦发银行总部(外滩)](https://uri.amap.com/marker?markers=B0MGVZE8HO&src=shanghai_heritage&callnative=1) | 中山东一路12号 | 571 |
| 4A020 | 花园住宅 | 汉口路200号 | [外滩](https://uri.amap.com/marker?markers=B00155FXB3&src=shanghai_heritage&callnative=1) | 中山东一路 | 679 |
| 4A035 | 仁记珠宝银楼 | 中华路5号 | [中华苑](https://uri.amap.com/marker?markers=B00155L21W&src=shanghai_heritage&callnative=1) | 中华路805号(小南门地铁站2号口步行480米) | 1120 |
| 4A036 | 联市联谊会 | 中华路55号 | [中华路381号](https://uri.amap.com/marker?markers=B0IDB5LDWO&src=shanghai_heritage&callnative=1) | 中华路与金坛路交叉口北40米 | 556 |
| 4C007 | 花园住宅群 | 南昌路124－134号、136弄1-16号、138-146号 | [南昌路](https://uri.amap.com/marker?markers=B0FFH02EQ7&src=shanghai_heritage&callnative=1) | 黄浦区 | 290 |
| 4C008 | 克美产科医院 | 重庆南路139号 | [重庆南路](https://uri.amap.com/marker?markers=BZAFR000SK&src=shanghai_heritage&callnative=1) | 黄浦区 | 532 |
| 4C009 | 花园住宅 | 皋兰路11-17号 | [皋兰路](https://uri.amap.com/marker?markers=BZAFR0020P&src=shanghai_heritage&callnative=1) | 黄浦区 | 126 |
| 4C022 | 明复图书馆 | 陕西南路235号 | [上海市黄浦区卢湾一中心小学](https://uri.amap.com/marker?markers=B0015195A8&src=shanghai_heritage&callnative=1) | 淡水路450号 | 863 |
| 4B005 | 大新烟草公司 | 北京西路1094弄2号 | [北京西路1592弄1-22号](https://uri.amap.com/marker?markers=B0MBFD5ZIA&src=shanghai_heritage&callnative=1) | 北京西路与胶州路交叉口东北100米 | 917 |
| 4B006 | 花园住宅 | 北京西路1394弄2号 | [上海嘉和嘉进出口有限公司](https://uri.amap.com/marker?markers=B0L2ULFDM3&src=shanghai_heritage&callnative=1) | 北京西路1701号静安中华大厦 | 550 |
| 4B007 | 纪氏花园住宅 | 北京西路1510号 | [北京西路](https://uri.amap.com/marker?markers=B0FFH02EBG&src=shanghai_heritage&callnative=1) | 静安区 | 585 |
| 4B011 | 宜德堂 | 昌化路136号 | [昌化路](https://uri.amap.com/marker?markers=B00155PR1Y&src=shanghai_heritage&callnative=1) | 静安区 | 377 |
| 4H002 | 中国实业银行 | 北苏州路1028号 | [原文庙旧书古玩跳蚤市集](https://uri.amap.com/marker?markers=B0JRXA3YOE&src=shanghai_heritage&callnative=1) | 福佑路225号B2层门卫(安平街10号北门坐直达电梯到b2) | 2284 |
| 4H006 | 住宅 | 武进路580弄 | [武进路](https://uri.amap.com/marker?markers=BZAGR0002N&src=shanghai_heritage&callnative=1) | 静安区 | 35 |
| 4H007 | 福新面粉一厂厂房及仓库 | 光复路423-433号，长安路101号 | [四行仓库抗战纪念馆-西墙弹孔(打卡点)](https://uri.amap.com/marker?markers=B0MG45XEYE&src=shanghai_heritage&callnative=1) | 光复路21号(曲阜路地铁站3号口步行320米) | 597 |
| 4D006 | 花园住宅 | 淮海中路1414号1号楼 | [淮海中路1634号院](https://uri.amap.com/marker?markers=B0FFIL1DUK&src=shanghai_heritage&callnative=1) | 淮海中路1634号(上海图书馆地铁站3号口步行110米) | 553 |
| 4D011 | 伊丽莎白公寓 | 复兴中路1327号 | [尚上鲜.复中市集](https://uri.amap.com/marker?markers=B00155ICH5&src=shanghai_heritage&callnative=1) | 复兴中路1239号(陕西南路地铁站7号口步行260米) | 514 |
| 4D014 | 花园住宅 | 太原路50弄1-2号，56弄1-4号，64弄1-4号 | [太原邸](https://uri.amap.com/marker?markers=B00154DUQP&src=shanghai_heritage&callnative=1) | 太原路289弄之1-10号 | 656 |
| 4D015 | 花园住宅 | 东平路5号 | [汾阳花园酒店](https://uri.amap.com/marker?markers=B00155Q3R3&src=shanghai_heritage&callnative=1) | 汾阳路45号(近复兴中路) | 689 |
| 4D020 | 花园住宅 | 五原路251号，永福路1号 | [武康大楼](https://uri.amap.com/marker?markers=B00155ITJ1&src=shanghai_heritage&callnative=1) | 淮海中路1850号 | 1009 |
| 4D046 | 上海特别市市政府旧址 | 平江路48号3号、7号楼 | [平江路](https://uri.amap.com/marker?markers=BZAFR00231&src=shanghai_heritage&callnative=1) | 徐汇区 | 12 |
| 4F003 | 德邻公寓 | 四川北路71号1-6幢，崇明路82号 | [四川北路](https://uri.amap.com/marker?markers=B0IA3KANZI&src=shanghai_heritage&callnative=1) | 虹口区 | 897 |
| 4F008 | 角田公寓 | 闵行路171-181号，201-211号，峨眉路70-80号 | [闵行路](https://uri.amap.com/marker?markers=B0FFGQ5K2W&src=shanghai_heritage&callnative=1) | 虹口区 | 30 |
| 4F010 | 华童公学/汉壁礼男校/光华大夏大学附属中学 | 中州路102号 | [华东师大一附中(虹关路)](https://uri.amap.com/marker?markers=B00155KCAO&src=shanghai_heritage&callnative=1) | 虹关路88号 | 2323 |
| 4F014 | 狄思威公寓 | 四川北路1914-1932号 | [川北公寓](https://uri.amap.com/marker?markers=B0KDOYN13W&src=shanghai_heritage&callnative=1) | 四川北路2222号 | 533 |
| 4F019 | 樱苑别墅 | 四川北路2365号 | [猪猪很忙·专做脂渣(四川北路店)](https://uri.amap.com/marker?markers=B0L39SRPFQ&src=shanghai_heritage&callnative=1) | 东宝兴路与四川北路交叉口西北120米 | 1192 |
| 4F027 | 住宅 | 霍山路119-137号（单号）、125弄（3-5号） | [霍山路](https://uri.amap.com/marker?markers=BZAGR10137&src=shanghai_heritage&callnative=1) | 虹口区 | 137 |
| 4F029 | 住宅 | 杨树浦路197-213号 | [杨树浦路](https://uri.amap.com/marker?markers=B0FFGQ89H9&src=shanghai_heritage&callnative=1) | 虹口区 | 92 |
| 4F031 | 花园住宅 | 榆林路43号、47号、59号、63号大宅 | [新华快印(宏慧·新里店)](https://uri.amap.com/marker?markers=B0KG1DC810&src=shanghai_heritage&callnative=1) | 东宝兴路777号宏慧·新里F1层 | 3882 |

## 需要复核（358）

| 编号 | 历史建筑 | 名录地址 | 高德地点 | 高德地址 | 距离（米） |
| --- | --- | --- | --- | --- | ---: |
| 1A002 | 上海总会 | 中山东一路2号 | [上海总会-有利银行旧址](https://uri.amap.com/marker?markers=B0FFF0B9ES&src=shanghai_heritage&callnative=1) | 中山东一路2号 | 16 |
| 1A003 | 汇丰银行大楼 | 中山东一路10-12号 | [浦发银行总部(外滩)](https://uri.amap.com/marker?markers=B0MGVZE8HO&src=shanghai_heritage&callnative=1) | 中山东一路12号 | 9 |
| 1A004 | 江海关 | 中山东一路13号 | [上海海关](https://uri.amap.com/marker?markers=B00152D88D&src=shanghai_heritage&callnative=1) | 中山东一路13号海关大楼 | 32 |
| 1A005 | 汇中饭店 | 中山东一路19号 | [和平饭店南楼](https://uri.amap.com/marker?markers=B0KRUMW5DW&src=shanghai_heritage&callnative=1) | 南京东路与中山东一路交叉口西南80米 | 31 |
| 1A006 | 沙逊大厦 | 中山东一路20号 | [龙凤厅 Dragon Phoenix](https://uri.amap.com/marker?markers=B00156EIBM&src=shanghai_heritage&callnative=1) | 南京东路20号上海和平饭店北楼8层(近中山东一路) | 27 |
| 1A008 | 怡和银行 | 中山东一路27号 | [兮禾酒馆(外滩罗斯福店)](https://uri.amap.com/marker?markers=B0L12LUD3W&src=shanghai_heritage&callnative=1) | 中山东一路27号罗斯福公馆一楼大厅左侧 | 15 |
| 1A009 | 东方汇理银行 | 中山东一路29号 | [中国光大银行(外滩支行)](https://uri.amap.com/marker?markers=B00154DWLA&src=shanghai_heritage&callnative=1) | 中山东一路29号(近北京东路) | 6 |
| 1A010 | 大世界游乐场 | 西藏南路1号 | [大世界游乐中心](https://uri.amap.com/marker?markers=B0FFLOMGSY&src=shanghai_heritage&callnative=1) | 宁海东路288号(大世界地铁站1号口旁) | 93 |
| 1A012 | 南京大戏院 | 延安东路523号 | [凯迪拉克·上海音乐厅](https://uri.amap.com/marker?markers=B00155C2AI&src=shanghai_heritage&callnative=1) | 延安东路523号(大世界地铁站3号口步行100米) | 16 |
| 1A013 | 四行储蓄会大楼 | 南京西路170号 | [国际饭店](https://uri.amap.com/marker?markers=B00155R1GE&src=shanghai_heritage&callnative=1) | 南京西路170号 | 3 |
| 1A015 | 华安人寿保险公司 | 南京西路104号 | [金门大酒店(暂停营业)](https://uri.amap.com/marker?markers=B00152032B&src=shanghai_heritage&callnative=1) | 南京西路108号(人民广场地铁站8号口步行130米) | 10 |
| 1A018 | 基督教慕尔堂 | 西藏中路316号 | [上海基督教沐恩堂](https://uri.amap.com/marker?markers=B00155LLO3&src=shanghai_heritage&callnative=1) | 西藏中路316号(人民广场地铁站14号口步行50米) | 10 |
| 1A019 | 老、新永安公司 | 南京东路627-635号 | [南京东路](https://uri.amap.com/marker?markers=B0KUNR6587&src=shanghai_heritage&callnative=1) | 黄浦区 | 189 |
| 1A020 | 先施公司 | 南京东路690号 | [上海时装公司](https://uri.amap.com/marker?markers=B0FFIMAXK9&src=shanghai_heritage&callnative=1) | 广西北路390号上海时装商店F3层 | 70 |
| 1A023 | 大上海大戏院 | 西藏中路520号 | [大上海电影院(第一百货商业中心南京东路店)](https://uri.amap.com/marker?markers=B0FFHCZJ7U&src=shanghai_heritage&callnative=1) | 南京东路830号上海市第一百货商店 | 12 |
| 1A024 | 公共租界工部局 | 江西中路215、209号；；汉口路193、223、239号 | [外滩·老市府大楼](https://uri.amap.com/marker?markers=B0L04ZWP2M&src=shanghai_heritage&callnative=1) | 江西中路215号 | 106 |
| 1A027 (1E001) | 董家渡天主堂 | 董家渡路175号 | [董家渡天主堂(暂停开放)](https://uri.amap.com/marker?markers=B00154FPEB&src=shanghai_heritage&callnative=1) | 董家渡路185号 | 14 |
| 1C001 | 步高里 | 陕西南路287号 | [步高里](https://uri.amap.com/marker?markers=B00155KHPB&src=shanghai_heritage&callnative=1) | 陕西南路287弄1-61号 | 46 |
| 1C002 | 瑞金二路住宅 | 瑞金二路18号 | [上海瑞金洲际酒店](https://uri.amap.com/marker?markers=B00155NID8&src=shanghai_heritage&callnative=1) | 瑞金二路118号 | 90 |
| 1C003 | 尚贤坊 | 淮海中路50号 | [Columbia(淮海中路尚贤坊店)](https://uri.amap.com/marker?markers=B0L6972KYQ&src=shanghai_heritage&callnative=1) | 淮海中路350号(一大会址·黄陂南路地铁站3号口步行60米) | 46 |
| 1C004 | 华懋公寓 | 长乐路109号 | [上海新锦江大酒店](https://uri.amap.com/marker?markers=B00155NEK2&src=shanghai_heritage&callnative=1) | 长乐路161号(淮海中路地铁站3号口步行50米) | 460 |
| 1B002 | 华业公寓 | 陕西北路175号 | [华业大楼](https://uri.amap.com/marker?markers=B0MRXAJTB3&src=shanghai_heritage&callnative=1) | 陕西北路173号 | 50 |
| 1B006 | 宏恩医院 | 延安西路221号 | [上海宏恩实业总公司](https://uri.amap.com/marker?markers=B00154H4UQ&src=shanghai_heritage&callnative=1) | 乌鲁木齐北路338号(静安寺地铁站13A出口步行230米) | 283 |
| 1D001 | 徐家汇天主堂 | 徐家汇浦西路158号 | [天主教上海教区徐家汇圣依纳爵主教座堂](https://uri.amap.com/marker?markers=B0H3TUK613&src=shanghai_heritage&callnative=1) | 蒲西路158号(徐家汇地铁站8号口步行170米) | 8 |
| 1D002 | 国际礼拜堂 | 衡山路58号 | [基督教国际礼拜堂](https://uri.amap.com/marker?markers=B001513753&src=shanghai_heritage&callnative=1) | 衡山路53号 | 18 |
| 1D004 | 盛宣怀住宅 | 淮海中路1517号 | [淮海中路1517号](https://uri.amap.com/marker?markers=B0K14AOS3Q&src=shanghai_heritage&callnative=1) | 淮海中路1554号 | 2 |
| 1D006 | 新康花园 | 淮海中路1273号 | [新康花园](https://uri.amap.com/marker?markers=B0015396DB&src=shanghai_heritage&callnative=1) | 淮海中路1273弄1-28号(常熟路地铁站2号口旁) | 157 |
| 1D007 | 修道院公寓 | 复兴西路62号 | [湖南街道办事处文体广场](https://uri.amap.com/marker?markers=B0FFGZ1PY2&src=shanghai_heritage&callnative=1) | 湖南路511弄18号湖南路兴国路口街心花园(西南角) | 810 |
| 1F002 | 俄罗斯领事馆/苏联领事馆 | 黄浦路20号 | [俄罗斯联邦驻上海总领事馆](https://uri.amap.com/marker?markers=B00155E705&src=shanghai_heritage&callnative=1) | 黄浦路20号 | 25 |
| 1F004 | 多伦路250号住宅 | 多伦路250号 | [多伦路250号住宅孔公馆](https://uri.amap.com/marker?markers=B00155KD3Q&src=shanghai_heritage&callnative=1) | 四川北路2099-2101号附近 | 0 |
| 1G001 | 旧上海特别市政府 | 清源环路650号 | [旧上海特别市政府](https://uri.amap.com/marker?markers=B0FFFLJCZY&src=shanghai_heritage&callnative=1) | 长海路399号上海体育大学内 | 16 |
| 1G002 | 上海市体育场 | 国和路346号 | [江湾体育场](https://uri.amap.com/marker?markers=B00150B478&src=shanghai_heritage&callnative=1) | 国和路346号江湾体育场137-139室12B看台附近 | 166 |
| 1G003 | 杨树浦水厂 | 杨树浦路830号（许昌路口） | [上海自来水科技馆](https://uri.amap.com/marker?markers=B00155KVVJ&src=shanghai_heritage&callnative=1) | 杨树浦路830号 | 70 |
| 1M001 | 淮阴路姚氏住宅 | 淮阴路200号 | [西郊宾馆](https://uri.amap.com/marker?markers=B00154DV7G&src=shanghai_heritage&callnative=1) | 虹桥路1921号 | 386 |
| 1M002 | 沙逊别墅 | 虹桥路2409号 | [龙柏饭店3号别墅](https://uri.amap.com/marker?markers=B0FFF6O37D&src=shanghai_heritage&callnative=1) | 虹桥路2409号龙柏饭店(近虹井路) | 191 |
| 1M003 | 孙科住宅 | 延安西路1262号 | [上生新所](https://uri.amap.com/marker?markers=B0FFJ2JI6R&src=shanghai_heritage&callnative=1) | 延安西路1262号 | 218 |
| 1M004 | 虹桥路2310号住宅 | 虹桥路2310号 | [虹桥路2310号住宅](https://uri.amap.com/marker?markers=B00155HKPH&src=shanghai_heritage&callnative=1) | 程家桥街道程家桥街道程家桥 | 3 |
| 1M006 | 兴国路住宅 | 兴国路72号 | [兴国宾馆8号楼会议中心](https://uri.amap.com/marker?markers=B00155LZQC&src=shanghai_heritage&callnative=1) | 兴国路78号兴国宾馆 | 83 |
| 1M007 | 王伯群住宅 | 愚园路1136弄31号 | [长宁区少年宫(东部分校)](https://uri.amap.com/marker?markers=B00156QKUO&src=shanghai_heritage&callnative=1) | 愚园路1188号 | 59 |
| 2A002 | 有利银行 | 中山东一路3号，广东路17号 | [外滩](https://uri.amap.com/marker?markers=B00155FXB3&src=shanghai_heritage&callnative=1) | 中山东一路 | 138 |
| 2A003 | 中国通商银行 | 中山东一路6号 | [华夏银行(上海外滩支行)](https://uri.amap.com/marker?markers=B0GRAU4H37&src=shanghai_heritage&callnative=1) | 延安东路19号(豫园地铁站7号口步行400米) | 260 |
| 2A004 | 大北电报局 | 中山东一路7号 | [盘谷银行(上海分行)](https://uri.amap.com/marker?markers=B00155GHVB&src=shanghai_heritage&callnative=1) | 中山东一路7号1层 | 3 |
| 2A005 | 华俄道胜银行 | 中山东一路15号 | [中国外汇交易中心](https://uri.amap.com/marker?markers=B00154DM1Y&src=shanghai_heritage&callnative=1) | 滇池路63号万国建筑博览群(东北角) | 12 |
| 2A007 | 字林西报大楼 | 中山东一路17号 | [中山东一路19号](https://uri.amap.com/marker?markers=B0KDG5NSZ7&src=shanghai_heritage&callnative=1) | 外滩街道中山东一路19号 | 98 |
| 2A009 | 横滨正金银行 | 中山东一路24号 | [中国工商银行(上海市分行营业部营业厅)](https://uri.amap.com/marker?markers=B001540B74&src=shanghai_heritage&callnative=1) | 中山东一路24号 | 6 |
| 2A010 | 英国领事馆 | 中山东一路33号1号楼2号楼 | [外滩源33](https://uri.amap.com/marker?markers=B00156R4JP&src=shanghai_heritage&callnative=1) | 中山东一路33号英国领事馆及领事官邸旧址内 | 18 |
| 2A011 | 外滩信号台 | 中山东二路 | [外滩](https://uri.amap.com/marker?markers=B00155FXB3&src=shanghai_heritage&callnative=1) | 中山东一路 | 33 |
| 2A012 | 外白渡桥 | 外滩 | [外滩·外白渡桥(公交站)](https://uri.amap.com/marker?markers=BV10459086&src=shanghai_heritage&callnative=1) | 都市观光旅游3号线 | 376 |
| 2A013 | 乍浦路桥 | 乍浦路 | [乍浦路桥](https://uri.amap.com/marker?markers=B0FFF7M0EA&src=shanghai_heritage&callnative=1) | 乍浦路与南苏州路交叉口北40米 | 35 |
| 2A015 | 格林邮船大楼 | 北京东路2号 | [格林邮船公司(英)怡泰大楼旧址](https://uri.amap.com/marker?markers=B00155ML9G&src=shanghai_heritage&callnative=1) | 北京东路2号 | 18 |
| 2A025 | 真光大楼 | 圆明园路209号 | [真光大楼](https://uri.amap.com/marker?markers=B00155LYCU&src=shanghai_heritage&callnative=1) | 外滩街道外滩街道外滩街道外滩街道外滩街道外滩街道圆明园路209号 | 9 |
| 2A026 | 迦陵大楼 | 南京东路99号 | [嘉陵大楼(四川中路)](https://uri.amap.com/marker?markers=B00155EH4V&src=shanghai_heritage&callnative=1) | 四川中路346号(南京东路地铁站2号口步行380米) | 27 |
| 2A027 | 慈淑大楼 | 南京东路353号 | [悦荟广场](https://uri.amap.com/marker?markers=B0FFHC66JQ&src=shanghai_heritage&callnative=1) | 外滩街道南京东路353号 | 10 |
| 2A028 | 麦家圈医院 | 山东中路145号 | [上海交通大学医学院附属仁济医院(西院区)](https://uri.amap.com/marker?markers=B00155L1WO&src=shanghai_heritage&callnative=1) | 山东中路145号 | 39 |
| 2A031 | 美国花旗银行 | 福州路209号 | [美国花旗总会](https://uri.amap.com/marker?markers=B0FFF00NP4&src=shanghai_heritage&callnative=1) | 外滩街道福州路209号(南京东路地铁站3号口步行460米) | 13 |
| 2A035 | 吉祥里 | 河南中路531-541号 | [吉祥里](https://uri.amap.com/marker?markers=B00155LVSS&src=shanghai_heritage&callnative=1) | 河南中路541弄8-36号(南京东路地铁站6号口步行80米) | 68 |
| 2A037 | 汉弥登大楼 | 江西中路170号 | [福州大楼(装修中)](https://uri.amap.com/marker?markers=B0015446E5&src=shanghai_heritage&callnative=1) | 江西中路170-1号 | 34 |
| 2A040 | 浙江第一商业银行 | 汉口路151号 | [现代建筑设计集团华东建筑设计研究院有限公司-建筑创作中心](https://uri.amap.com/marker?markers=B0FFI93A2Y&src=shanghai_heritage&callnative=1) | 外滩街道汉口路151号创作中心 | 1 |
| 2A041 | 大陆银行 | 九江路111号 | [上海国际信托有限公司](https://uri.amap.com/marker?markers=B0L02ZN2IK&src=shanghai_heritage&callnative=1) | 外滩街道九江路111号上投大厦9楼办公室 | 5 |
| 2A045 | 若瑟堂 | 四川南路36号 | [四川南路小学](https://uri.amap.com/marker?markers=B001514150&src=shanghai_heritage&callnative=1) | 四川南路36号(豫园地铁站7号口步行220米) | 488 |
| 2A047 | 卜内门大楼 | 四川中路133号 | [BNwork](https://uri.amap.com/marker?markers=B0G0BL60I4&src=shanghai_heritage&callnative=1) | 四川中路133号 | 3 |
| 2A048 | 汇丰大楼 | 四川中路210-220号（双号） | [上海市黄浦区四川中路294号](https://uri.amap.com/marker?markers=B0J3G5BW8B&src=shanghai_heritage&callnative=1) | 四川中路294号 | 134 |
| 2A049 | 四行储蓄会大楼 | 四川中路261号 | [上海化轻染料有限公司(江西中路店)](https://uri.amap.com/marker?markers=B00155IW1G&src=shanghai_heritage&callnative=1) | 广东路179号(豫园地铁站6号口步行390米) | 408 |
| 2A051 | 德士古大楼(会德丰大楼) | 延安东路110号 | [绿色基金大厦](https://uri.amap.com/marker?markers=B0LRBKN5XR&src=shanghai_heritage&callnative=1) | 汉口路110号国家绿色发展基金股份有限公司 | 485 |
| 2A052 | 中汇大楼 | 延安东路143号 | [中汇大厦(河南南路)](https://uri.amap.com/marker?markers=B00150C713&src=shanghai_heritage&callnative=1) | 河南南路16号(豫园地铁站5号口步行240米) | 17 |
| 2A054 | 中法学堂 | 淮海东路70号 | [光明中学-东光明高复班](https://uri.amap.com/marker?markers=B0FFGAR37H&src=shanghai_heritage&callnative=1) | 云南南路与淮海东路交叉口西北60米 | 51 |
| 2A055 | 三井洋行 | 四川中路185号 | [外滩艺术中心185空间](https://uri.amap.com/marker?markers=B0I095M483&src=shanghai_heritage&callnative=1) | 四川中路185号 | 20 |
| 2A057 (2E002) | 小桃园清真寺 | 小桃园街52号（主楼） | [小桃园清真寺](https://uri.amap.com/marker?markers=B00155IML1&src=shanghai_heritage&callnative=1) | 小桃园街24、52 | 0 |
| 2A058 (2E003) | 清心堂 | 大昌街30号 | [清心堂](https://uri.amap.com/marker?markers=B00153A420&src=shanghai_heritage&callnative=1) | 上海市老西门街道老西门街道老西门街道大昌街30号 | 18 |
| 2C002 | 培文公寓 | 淮海中路449号 | [培文公寓](https://uri.amap.com/marker?markers=B00155ISGO&src=shanghai_heritage&callnative=1) | 兴安路96弄1-102号 | 40 |
| 2C003 | 永业大楼 | 淮海中路481-501号（单号），雁荡路2-34号（双号） | [美珍香(永业大楼店)](https://uri.amap.com/marker?markers=B0FFILF42F&src=shanghai_heritage&callnative=1) | 淮海中路485号全国土特产1层 | 34 |
| 2C006 | 兰心大戏院 | 茂名南路57号 | [兰心大戏院](https://uri.amap.com/marker?markers=B001516B0B&src=shanghai_heritage&callnative=1) | 上海市瑞金二路街道茂名南路57号 | 14 |
| 2C007 | ASTRID公寓 | 茂名南路143号 | [南昌大楼](https://uri.amap.com/marker?markers=B00155EQFL&src=shanghai_heritage&callnative=1) | 茂名南路151号(陕西南路地铁站4号口步行190米) | 29 |
| 2C008 | 法国总会（老） | 南昌路47号 | [安悦充电汽车充电站(上海科学会堂)](https://uri.amap.com/marker?markers=B0M1PD49Q6&src=shanghai_heritage&callnative=1) | 南昌路47号 | 9 |
| 2C009 | 梵尔登花园 | 陕西南路39弄（1-103号），长乐路197-247（单号） | [陕西南路39弄107号](https://uri.amap.com/marker?markers=B0JGGSLMYH&src=shanghai_heritage&callnative=1) | 瑞金二路街道 | 193 |
| 2C010 | 陕南村 | 陕西南路157-187号 | [陕南邨](https://uri.amap.com/marker?markers=B00156COKX&src=shanghai_heritage&callnative=1) | 陕西南路187弄1-87号 | 89 |
| 2C012 | 震旦大学图书馆教学大楼/震旦大学博物馆 | 重庆南路280号/重庆南路225号 | [上海交通大学医学院西区](https://uri.amap.com/marker?markers=B00155QLOC&src=shanghai_heritage&callnative=1) | 重庆南路280号 | 55 |
| 2C013 | 东正教堂 | 皋兰路16号 | [圣尼古拉斯教堂](https://uri.amap.com/marker?markers=B0FFILFHFV&src=shanghai_heritage&callnative=1) | 皋兰路16号 | 19 |
| 2C014 | 江南制造局 | 高雄路2号（总办公楼）/2号船坞/指挥楼/飞机车间 | [中国船舶科研大厦](https://uri.amap.com/marker?markers=B0FFHUJDY9&src=shanghai_heritage&callnative=1) | 高雄路189号 | 368 |
| 2B001 | 犹太人总会/黄河皮鞋店 | 南京西路722号/南京西路702号 | [旺旺大厦](https://uri.amap.com/marker?markers=B00155NMLW&src=shanghai_heritage&callnative=1) | 石门一路211号(南京西路地铁站7号口步行50米) | 402 |
| 2B002 | 德义大楼 | 南京西路778号 | [德义大楼](https://uri.amap.com/marker?markers=B00155IVH8&src=shanghai_heritage&callnative=1) | 石门二路15弄3-77号 | 10 |
| 2B003 | 中国银行 | 南京西路801号 | [中国工商银行24小时自助银行(石门一路支行)](https://uri.amap.com/marker?markers=B00155M008&src=shanghai_heritage&callnative=1) | 南京西路801号(南京西路地铁站11号口步行80米) | 461 |
| 2B005 | 静安别墅 | 南京西路1025弄 | [The Sole日晒美黑沙龙(静安别墅店)](https://uri.amap.com/marker?markers=B0IUYUZAIX&src=shanghai_heritage&callnative=1) | 南京西路1025弄静安别墅54号 | 108 |
| 2B006 | 花园住宅 | 南京西路1418号 | [上海市人民对外友好协会](https://uri.amap.com/marker?markers=B0FFG6A19D&src=shanghai_heritage&callnative=1) | 南京西路1418号(静安寺地铁站6号口步行350米) | 15 |
| 2B007 | 模范村 | 延安中路877号 | [模范邨](https://uri.amap.com/marker?markers=B00155EQ7T&src=shanghai_heritage&callnative=1) | 延安中路877弄1-105号 | 49 |
| 2B008 | 住宅 | 延安中路955弄（1-11号） | [延安中路955弄小区](https://uri.amap.com/marker?markers=B00155LW7S&src=shanghai_heritage&callnative=1) | 南京西路街道延安中路955弄1-67号(静安寺地铁站8号口步行320米) | — |
| 2B009 | 意大利总会 | 延安西路238号 | [上海市文联艺术促进中心](https://uri.amap.com/marker?markers=B0015234E6&src=shanghai_heritage&callnative=1) | 延安西路200号3号楼508室 | 13 |
| 2B010 | 百乐门舞厅 | 愚园路218号 | [百乐门(上海静安区)](https://uri.amap.com/marker?markers=B00154DMP2&src=shanghai_heritage&callnative=1) | 上海市静安区愚园路218号(静安寺地铁站1号口步行150米) | 6 |
| 2B011 | 愚谷村 | 愚园路361弄 | [愚园坊](https://uri.amap.com/marker?markers=B00155L3GS&src=shanghai_heritage&callnative=1) | 愚园路483弄之4-42号 | 258 |
| 2B013 | 怀恩堂 | 陕西北路375号 | [上海市基督教怀恩堂](https://uri.amap.com/marker?markers=B00155L12A&src=shanghai_heritage&callnative=1) | 陕西北路375号 | 14 |
| 2B014 | 西摩路会堂 | 陕西北路500号 | [西摩会堂](https://uri.amap.com/marker?markers=B00155LZG3&src=shanghai_heritage&callnative=1) | 陕西北路500号 | 489 |
| 2B015 | 花园住宅 | 铜仁路333号 | [上海市城市规划设计研究院(铜仁路)](https://uri.amap.com/marker?markers=B00154EY90&src=shanghai_heritage&callnative=1) | 铜仁路331号4-10、12-13层 | 48 |
| 2B017 | 大胜胡同 | 华山路229-285弄 | [大胜胡同旧址](https://uri.amap.com/marker?markers=B0FFF29ZG8&src=shanghai_heritage&callnative=1) | 静安寺街道静安寺街道华山路285弄1-42号 | 97 |
| 2B018 | 海格大楼 | 华山路400号 | [上海静安昆仑大酒店](https://uri.amap.com/marker?markers=B0FFIL8D25&src=shanghai_heritage&callnative=1) | 华山路250号(静安寺地铁站12号) | 154 |
| 2B019 | 美国学校 | 华山路643号/华山路639号 | [中国福利会儿童艺术剧院](https://uri.amap.com/marker?markers=B00151C5FA&src=shanghai_heritage&callnative=1) | 华山路643号 | 57 |
| 2B020 | 枕流公寓 | 华山路731号 | [枕流公寓](https://uri.amap.com/marker?markers=B0IB2URIUT&src=shanghai_heritage&callnative=1) | 华山路699号 | 29 |
| 2B022 | 爱登公寓 | 常德路195号 | [常德公寓](https://uri.amap.com/marker?markers=B00150F40E&src=shanghai_heritage&callnative=1) | 上海市静安寺街道静安寺街道静安寺街道常德路195号 | 12 |
| 2B023 | 望德堂 | 北京西路1220弄2号 | [北京新邨](https://uri.amap.com/marker?markers=B001546978&src=shanghai_heritage&callnative=1) | 北京西路1220弄1-108号 | 23 |
| 2B024 | 雷氏德医学院 | 北京西路1320号 | [上海医药工业研究院](https://uri.amap.com/marker?markers=B0FFFX176G&src=shanghai_heritage&callnative=1) | 北京西路1320号5号楼 | 59 |
| 2B025 | 花园住宅 | 延安中路816号 | [上海市静安区延安中路816号A楼](https://uri.amap.com/marker?markers=B0M2MLNN5W&src=shanghai_heritage&callnative=1) | 延安中路816号严同春住宅 | 35 |
| 2D001 | 花园住宅 | 淮海中路1110号 | [东湖小区](https://uri.amap.com/marker?markers=B0FFGFK53E&src=shanghai_heritage&callnative=1) | 淮海中路1200弄1-25号 | 235 |
| 2D003 | 盖司康公寓 | 淮海中路1202号 | [淮海公寓](https://uri.amap.com/marker?markers=B00155LRNA&src=shanghai_heritage&callnative=1) | 淮海中路1202号(中国银行旁边) | 30 |
| 2D005 | 皇家公寓 | 淮海中路1300-1326号 | [淮海大楼](https://uri.amap.com/marker?markers=B00155IR0H&src=shanghai_heritage&callnative=1) | 淮海中路1326弄0号(常熟路地铁站6号口步行50米) | 2 |
| 2D006 | 花园住宅 | 淮海中路1431号 | [法国领事馆旧址](https://uri.amap.com/marker?markers=B00155IQ2E&src=shanghai_heritage&callnative=1) | 岳阳路319中科大厦(肇嘉浜路地铁站2号口步行470米) | 1047 |
| 2D007 | 花园住宅 | 淮海中路1469号 | [美利坚合众国驻上海总领事馆](https://uri.amap.com/marker?markers=B0FFM6J8AH&src=shanghai_heritage&callnative=1) | 淮海中路1469号(上海图书馆地铁站2号口步行440米) | 148 |
| 2D008 | 逸村 | 淮海中路1610弄 | [逸村](https://uri.amap.com/marker?markers=B00155KHBC&src=shanghai_heritage&callnative=1) | 淮海中路1610弄1-8号 | 59 |
| 2D010 | 中南新村 | 淮海中路1670弄 | [中南新邨](https://uri.amap.com/marker?markers=B0H6D7AFIV&src=shanghai_heritage&callnative=1) | 淮海中路1670弄1-32号 | 25 |
| 2D012 | 东美特公寓 | 淮海中路1842-1858号 | [武康大楼](https://uri.amap.com/marker?markers=B00155ITJ1&src=shanghai_heritage&callnative=1) | 淮海中路1850号 | 4 |
| 2D013 | 丁香花园 | 华山路849号主楼 | [上海丁香花园](https://uri.amap.com/marker?markers=B00155LALT&src=shanghai_heritage&callnative=1) | 华山路849号 | 1 |
| 2D014 | 住宅 | 华山路893号 | [上海市工商业联合会经济发展服务中心](https://uri.amap.com/marker?markers=B0FFG951YC&src=shanghai_heritage&callnative=1) | 华山路899号 | 34 |
| 2D015 | 南洋公学 | 华山路1954号 | [上海交通大学徐汇校区](https://uri.amap.com/marker?markers=B00155L3CA&src=shanghai_heritage&callnative=1) | 华山路1954号 | 327 |
| 2D016 | 道斐南公寓 | 建国西路394号 | [建国西路394弄](https://uri.amap.com/marker?markers=B0H07Z4IIZ&src=shanghai_heritage&callnative=1) | 建国西路与太原路交叉口西120米 | 28 |
| 2D017 | 建业里 | 建国西路468弄、488弄、424-498号（双号） | [十二浮世(建业里店)](https://uri.amap.com/marker?markers=B0I2NSN66Q&src=shanghai_heritage&callnative=1) | 建国西路468弄12号 | 68 |
| 2D018 | 懿园 | 建国西路506弄 | [懿园](https://uri.amap.com/marker?markers=B00155IFXR&src=shanghai_heritage&callnative=1) | 建国西路506弄1-57号 | 40 |
| 2D019 | 住宅 | 建国西路618号 | [波兰共和国驻上海总领事馆](https://uri.amap.com/marker?markers=B00155LGPH&src=shanghai_heritage&callnative=1) | 建国西路618号 | 18 |
| 2D022 | 毕卡迪公寓 | 衡山路534号 | [衡山花园酒店商务会议室](https://uri.amap.com/marker?markers=B00155IQRU&src=shanghai_heritage&callnative=1) | 衡山路534号衡山花园酒店3层(衡山路地铁站1号口步行430米) | 53 |
| 2D023 | 住宅 | 永福路151号 | [德意志联邦共和国总领事馆官邸](https://uri.amap.com/marker?markers=B00156TLSB&src=shanghai_heritage&callnative=1) | 永福路151号(上海图书馆地铁站3号口步行300米) | 15 |
| 2D024 | 花园住宅 | 岳阳路145号 | [中共上海市委员会老干部局](https://uri.amap.com/marker?markers=B00155LB46&src=shanghai_heritage&callnative=1) | 岳阳路145号 | 17 |
| 2D025 | 永嘉新村 | 永嘉路580号 | [永嘉新村](https://uri.amap.com/marker?markers=B00155L38R&src=shanghai_heritage&callnative=1) | 永嘉路580弄之1-110号 | 87 |
| 2D028 | 花园住宅 | 岳阳路145号 | [中共上海市委员会老干部局](https://uri.amap.com/marker?markers=B00155LB46&src=shanghai_heritage&callnative=1) | 岳阳路145号 | 17 |
| 2D029 | 住宅 | 岳阳路200弄 | [岳阳路200弄小区](https://uri.amap.com/marker?markers=B0FFGFG656&src=shanghai_heritage&callnative=1) | 岳阳路200弄2-48号 | 9 |
| 2D030 | 中央研究院 | 岳阳路320号 | [中国科学院上海营养与健康研究所生理楼](https://uri.amap.com/marker?markers=B0MA69MJOL&src=shanghai_heritage&callnative=1) | 岳阳路与肇嘉浜路交叉口西北100米 | 61 |
| 2D031 | 徐汇公学 | 虹桥路68号 | [上海市徐汇中学-重德楼](https://uri.amap.com/marker?markers=B0FFIY16LM&src=shanghai_heritage&callnative=1) | 虹桥路68号(徐家汇地铁站11号口步行240米) | 92 |
| 2D032 | 徐家汇圣母院 | 漕溪北路45号 | [航空科技大厦](https://uri.amap.com/marker?markers=B0I3ZZTXU4&src=shanghai_heritage&callnative=1) | 徐家汇街道徐家汇漕溪北路45号 | 29 |
| 2D033 | 藏书楼 | 漕溪北路80号 | [上海图书馆(徐家汇藏书楼)](https://uri.amap.com/marker?markers=B00150E486&src=shanghai_heritage&callnative=1) | 漕溪北路80号(徐家汇地铁站8号口步行70米) | 17 |
| 2D035 | 国立上海医学院 | 东安路131号东1号楼 | [四季园](https://uri.amap.com/marker?markers=B00155L3MH&src=shanghai_heritage&callnative=1) | 东安路149弄1-8号(肇嘉浜路地铁站3号口步行310米) | 214 |
| 2D036 | 正广和大班住宅 | 武康路99号 | [英商正广和洋行大班住宅旧址](https://uri.amap.com/marker?markers=B0FFF9ZQYW&src=shanghai_heritage&callnative=1) | 武康路历史文化名街内(北侧) | 9 |
| 2D038 | 丽波花园东主楼 | 吴兴路87号 | [上海体育科学研究所](https://uri.amap.com/marker?markers=B001544B6E&src=shanghai_heritage&callnative=1) | 吴兴路87号(衡山路地铁站1号口步行360米) | 28 |
| 2D041 | 东正教堂 | 新乐路55号 | [中国建设银行(襄阳路支行)](https://uri.amap.com/marker?markers=B0FFIOT0UU&src=shanghai_heritage&callnative=1) | 襄阳南路102号一层(陕西南路地铁站7号口步行120米) | 381 |
| 2D042 | 高安公寓 | 高安路14号 | [高安公寓](https://uri.amap.com/marker?markers=B001559IIF&src=shanghai_heritage&callnative=1) | 高安路105号(肇嘉浜路地铁站2号口步行380米) | 749 |
| 2D045 | 住宅 | 汾阳路9弄3号 | [汾阳路3号](https://uri.amap.com/marker?markers=B0KK7OOQG8&src=shanghai_heritage&callnative=1) | 汾阳路新里(陕西南路地铁站7号口步行310米) | 85 |
| 2D046 | 住宅 | 东平路9号 | [上海音乐学院附中](https://uri.amap.com/marker?markers=B00155C2AK&src=shanghai_heritage&callnative=1) | 东平路9号(近复兴中路) | 65 |
| 2D047 | 赛华公寓 | 常熟路209号 | [瑞华公寓](https://uri.amap.com/marker?markers=B00155LIHY&src=shanghai_heritage&callnative=1) | 常熟路209弄1-4号(常熟路地铁站8号口步行70米) | 38 |
| 2D048 | 住宅 | 延庆路130号 | [上海市肺科医院延庆路院区](https://uri.amap.com/marker?markers=B0FFI6Q2LX&src=shanghai_heritage&callnative=1) | 延庆路130号(常熟路地铁站1号口步行190米) | 5 |
| 2F002 | 河滨公寓 | 北苏州路340号 | [河滨大楼](https://uri.amap.com/marker?markers=B00155L44T&src=shanghai_heritage&callnative=1) | 北苏州路370号(天潼路地铁站3号口步行230米) | 73 |
| 2F003 | 鸿德堂 | 多伦路59号 | [上海基督教鸿德堂](https://uri.amap.com/marker?markers=B00153443A&src=shanghai_heritage&callnative=1) | 四川北路街道多伦路59号 | 6 |
| 2F004 | 雷氏德工学院 | 东长治路505号 | [上海创新创意设计研究院](https://uri.amap.com/marker?markers=B0I6SSVQ2Y&src=shanghai_heritage&callnative=1) | 东长治路505号(国际客运中心地铁站1号口步行130米) | 45 |
| 2F005 | 北方局 | 东大名路378号 | [中远海运集装箱运输有限公司](https://uri.amap.com/marker?markers=B0HKM7E65A&src=shanghai_heritage&callnative=1) | 东大名路378号远洋大厦F1层 | 26 |
| 2F006 | 高阳大楼 | 东大名路817号 | [上海实业集团高阳商务中心](https://uri.amap.com/marker?markers=B001579HM9&src=shanghai_heritage&callnative=1) | 东大名路815号(提篮桥地铁站3号口步行380米) | 37 |
| 2F007 | 新亚酒楼 | 天潼路422号 | [上海外滩郁锦香新亚大酒店](https://uri.amap.com/marker?markers=B00155N17I&src=shanghai_heritage&callnative=1) | 天潼路422号(天潼路地铁站3号口步行250米) | 485 |
| 2F008 | 四行大楼 | 四川北路1274号 | [四行大楼](https://uri.amap.com/marker?markers=B0FFL827OW&src=shanghai_heritage&callnative=1) | 四川北路街道四川北路1274号 | 10 |
| 2F009 | 中国银行大楼 | 四川北路894号 | [中国工商银行(四川北路第一支行)](https://uri.amap.com/marker?markers=B0FFLKJQ7L&src=shanghai_heritage&callnative=1) | 四川北路912号(四川北路地铁站2号口步行210米) | 5 |
| 2F012 | 上海监狱 | 长阳路147号 | [上海监狱陈列馆(不对外开放)](https://uri.amap.com/marker?markers=B0HAJR6E2K&src=shanghai_heritage&callnative=1) | 长阳路147号(提篮桥地铁站1号口步行320米) | 83 |
| 2G001 | 杨树浦电厂 | 杨树浦路2800号（铁皮车间） | [杨树浦发电厂史料陈列室](https://uri.amap.com/marker?markers=B0GUVZTY6J&src=shanghai_heritage&callnative=1) | 杨树浦路2800号 | — |
| 2G002 | 沪江大学 | 军工路516号礼堂/实验楼 | [上海理工大学军工路校区北校区沪江美术馆](https://uri.amap.com/marker?markers=B0FFG02JTH&src=shanghai_heritage&callnative=1) | 军工路516号上海理工大学(军工路校区) | 432 |
| 2G003 | 旧市博物馆 | 长海路174号 | [第二军医大学第三附属医院停车场](https://uri.amap.com/marker?markers=B0H3TUMI7E&src=shanghai_heritage&callnative=1) | 长海路与中原路交叉口西40米 | 358 |
| 2G004 | 旧市图书馆 | 黑山路181号 | [上海市同济中学](https://uri.amap.com/marker?markers=B00150FD3C&src=shanghai_heritage&callnative=1) | 政立路20号 | 156 |
| 2M001 | 住宅 | 新华路185弄1号 | [上海交通大学徐汇校区西餐厅](https://uri.amap.com/marker?markers=B00155MB3X&src=shanghai_heritage&callnative=1) | 上海交通大学徐汇校区学生餐厅南面(西餐厅东侧2层) | 407 |
| 2M002 | 住宅 | 新华路315号 | [新华路315号住宅](https://uri.amap.com/marker?markers=B0J0VHT75U&src=shanghai_heritage&callnative=1) | 新华路街道 | 11 |
| 2M003 | 住宅 | 新华路329弄17号 | [新华别墅新华路329弄](https://uri.amap.com/marker?markers=B0KU6U4K0V&src=shanghai_heritage&callnative=1) | 新华路与香花桥路交叉口东南220米 | 48 |
| 2M005 | 住宅 | 武夷路127号 | [比利时王国驻上海总领事馆](https://uri.amap.com/marker?markers=B0FFG08VSZ&src=shanghai_heritage&callnative=1) | 武夷路105弄 | 63 |
| 2M006 | 圣约翰大学:校政厅/怀施堂/思颜堂/思孟堂/科学馆/西门堂 | 万航渡路1175号 | [华东政法大学(长宁校区)](https://uri.amap.com/marker?markers=B00155K7T2&src=shanghai_heritage&callnative=1) | 万航渡路1575号 | 114 |
| 2M007 | 卫乐园 | 泰安路120号 | [卫乐园](https://uri.amap.com/marker?markers=B00155LAN5&src=shanghai_heritage&callnative=1) | 泰安路120弄1-32号(交通大学地铁站6号口步行350米) | 63 |
| 2M010 | 安息堂 | 虹桥路2381号 | [上海动物园](https://uri.amap.com/marker?markers=B0015397C9&src=shanghai_heritage&callnative=1) | 虹桥路2381号 | 1306 |
| 2N001 | 中国造币厂 | 光复西路17号 | [上海造币有限公司展销中心](https://uri.amap.com/marker?markers=B0HU1CBJ7P&src=shanghai_heritage&callnative=1) | 光复西路17号(镇坪路地铁站4号口步行490米) | 39 |
| 2N002 | 玉佛寺 | 安远路170号 | [玉佛禅寺](https://uri.amap.com/marker?markers=B00155R1B1&src=shanghai_heritage&callnative=1) | 安远路170号(江宁路地铁站3号口步行340米) | 13 |
| 3A003 | 日清大楼/日清汽船株式会社 | 中山东一路5号 | [中山东一路](https://uri.amap.com/marker?markers=B0LKOMFFL4&src=shanghai_heritage&callnative=1) | 外滩(东南角) | 254 |
| 3A009 | 博物院大楼/亚洲文会、英国皇家亚洲文会北中国支会 | 虎丘路20号 | [中国工商银行(上海市分行营业部营业厅)](https://uri.amap.com/marker?markers=B001540B74&src=shanghai_heritage&callnative=1) | 中山东一路24号 | 234 |
| 3A014 | 兰心大楼 | 圆明园路185号 | [渣打银行(新天地支行)](https://uri.amap.com/marker?markers=B00155LVAE&src=shanghai_heritage&callnative=1) | 淮海中路街道太仓路233号新茂大厦102室 | 2810 |
| 3A015 | 恒业里 | 江西中路135弄（1-11号），江西中路115-147号（单号），泗泾路10-24号（双号） | [恒业里旧址](https://uri.amap.com/marker?markers=B0FFF2YR6V&src=shanghai_heritage&callnative=1) | 外滩街道外滩街道江西中路135弄1-13号 | 20 |
| 3A017 | 哈同大楼 | 南京东路98-114号 | [慈安里大楼](https://uri.amap.com/marker?markers=B0FFFZXYO2&src=shanghai_heritage&callnative=1) | 南京东路120号(南京东路地铁站2号口步行300米) | 75 |
| 3A021 | 清心女中 | 陆家浜路550号 | [金日世家](https://uri.amap.com/marker?markers=B00156NYPV&src=shanghai_heritage&callnative=1) | 陆家浜路688弄之1-10号 | 133 |
| 3A022 | 龙门村 | 尚文路 | [黄浦区老西门街道龙门村居委会](https://uri.amap.com/marker?markers=B0FFKUM5V6&src=shanghai_heritage&callnative=1) | 尚文路133弄96号 | 172 |
| 3C001 | 爱司公寓 | 瑞金一路150号 | [爱司公寓旧址](https://uri.amap.com/marker?markers=B001570EWI&src=shanghai_heritage&callnative=1) | 瑞金二路街道瑞金二路街道瑞金一路150号 | 10 |
| 3C004 | 飞龙公寓 | 淮海中路538-544号及542弄 | [飞龙大楼](https://uri.amap.com/marker?markers=B0FFIL0TZD&src=shanghai_heritage&callnative=1) | 淮海中路与成都南路交叉口东北60米 | 45 |
| 3C006 | 白尔登公寓 | 陕西南路213号 | [陕南邨](https://uri.amap.com/marker?markers=B00156COKX&src=shanghai_heritage&callnative=1) | 陕西南路187弄1-87号 | 229 |
| 3C007 | 住宅 | 瑞金二路118号 | [瑞金宾馆3号楼](https://uri.amap.com/marker?markers=B001570H95&src=shanghai_heritage&callnative=1) | 瑞金二路118号 | 199 |
| 3C008 | 住宅 | 瑞金二路118号 | [瑞金商务楼](https://uri.amap.com/marker?markers=B00154020A&src=shanghai_heritage&callnative=1) | 瑞金二路118号 | 51 |
| 3C009 | 住宅 | 思南路39号-41号 | [上海市文史研究馆](https://uri.amap.com/marker?markers=B00150E1C5&src=shanghai_heritage&callnative=1) | 思南路41号 | 63 |
| 3C010 | 巴黎公寓 | 重庆南路165号 | [巴黎公寓](https://uri.amap.com/marker?markers=B00156DAU8&src=shanghai_heritage&callnative=1) | 重庆南路169弄之1-110号 | 33 |
| 3C012 | 永丰村 | 重庆南路177号、179弄1-10号 | [永丰村](https://uri.amap.com/marker?markers=B00155R08Y&src=shanghai_heritage&callnative=1) | 重庆南路179弄之1-10号 | 26 |
| 3C013 | 吕班公寓 | 重庆南路185号 | [吕班公寓旧址](https://uri.amap.com/marker?markers=B0FFF2QXOU&src=shanghai_heritage&callnative=1) | 淮海中路街道淮海中路街道重庆南路185号 | 4 |
| 3C014 | 诸圣堂 | 复兴中路425号 | [上海市基督教诸圣堂](https://uri.amap.com/marker?markers=B00154DRUO&src=shanghai_heritage&callnative=1) | 淮海中路街道复兴中路425号(近淡水路) | 12 |
| 3C015 | 住宅 | 皋兰路1号 | [张学良故居(不对外开放)](https://uri.amap.com/marker?markers=B0FFHFMQLE&src=shanghai_heritage&callnative=1) | 瑞金二路街道皋兰路1号(近复兴公园) | 14 |
| 3C016 | 住宅 | 绍兴路74号 | [绍兴路94号](https://uri.amap.com/marker?markers=B0KAUSMYC8&src=shanghai_heritage&callnative=1) | 绍兴路94号一楼 | 48 |
| 3C017 | 香山路住宅 | 香山路6号 | [香山路6号小区](https://uri.amap.com/marker?markers=B0H61ZNC16&src=shanghai_heritage&callnative=1) | 香山路与思南路交叉口西80米 | 24 |
| 3B001 | 邱氏住宅 | 威海路412号 | [民立中学](https://uri.amap.com/marker?markers=B00155KRRF&src=shanghai_heritage&callnative=1) | 威海路681号(南京西路地铁站12号口步行130米) | 535 |
| 3B003 | 铜仁路278号 | 铜仁路280号 | [皮裘公寓](https://uri.amap.com/marker?markers=B00155KMPO&src=shanghai_heritage&callnative=1) | 铜仁路278-280号 | 44 |
| 3B004 | 皮裘公寓 | 铜仁路278号 | [皮裘公寓](https://uri.amap.com/marker?markers=B00155KMPO&src=shanghai_heritage&callnative=1) | 铜仁路278-280号 | 42 |
| 3B005 | 震兴里、荣康里、德庆里 | 茂名北路200-290弄 | [震兴里二街](https://uri.amap.com/marker?markers=B00155L3VT&src=shanghai_heritage&callnative=1) | 茂名北路210弄3-23号 | 10 |
| 3B013 | 太阳公寓 | 威海路651、665弄 | [太阳公寓](https://uri.amap.com/marker?markers=B00155LVBB&src=shanghai_heritage&callnative=1) | 威海路647弄1-15号(南京西路地铁站12号口步行70米) | 10 |
| 3B014 | 四明里 | 延安中路913弄 | [四明邨](https://uri.amap.com/marker?markers=B00155IT59&src=shanghai_heritage&callnative=1) | 延安中路913弄9-121号 | 44 |
| 3B015 | 蒲园 | 长乐路570弄 | [蒲园](https://uri.amap.com/marker?markers=B00155L357&src=shanghai_heritage&callnative=1) | 上海市南京西路街道南京西路街道南京西路街道长乐路570弄1-9号的12幢西班牙式花园洋房 | 53 |
| 3B017 | 住宅 | 富民路210弄2-14号、长乐路752-762号 | [富民路210弄小区](https://uri.amap.com/marker?markers=B00155LAIW&src=shanghai_heritage&callnative=1) | 富民路210弄之1-15号 | 16 |
| 3B018 | 大华公寓 | 南京西路864-884号，奉贤路137号、147号，奉贤路148弄1-4号、8号 | [大华公寓](https://uri.amap.com/marker?markers=B00155LZNB&src=shanghai_heritage&callnative=1) | 南京西路881-1号附近(南京西路地铁站2号口步行70米) | 18 |
| 3B019 | 住宅 | 长乐路800号 | [长乐路800号](https://uri.amap.com/marker?markers=B0JASH4251&src=shanghai_heritage&callnative=1) | 常熟路地铁站8号口步行350米 | 31 |
| 3B020 | 住宅 | 奉贤路68弄40-52号、80-92号 | [石门二路工商所消费者权益保护奉贤居委会联络点](https://uri.amap.com/marker?markers=B0FFF5VDHX&src=shanghai_heritage&callnative=1) | 奉贤路68弄-40(南京西路地铁站2号口步行280米) | 49 |
| 3B021 | 中实新村 | 愚园路581-589及579弄 | [中实新村](https://uri.amap.com/marker?markers=B00155L3ER&src=shanghai_heritage&callnative=1) | 愚园路579弄1-50号 | 57 |
| 3B023 | 念吾新村/多福里/汾阳坊 | 延安中路470弄/504弄/510弄 | [念吾新村](https://uri.amap.com/marker?markers=B00155KJCK&src=shanghai_heritage&callnative=1) | 延安中路470弄15-39号 | 499 |
| 3B024 | 中国红十字会医院 | 乌鲁木齐中路12号5号楼 | [复旦大学附属华山医院门诊楼](https://uri.amap.com/marker?markers=B0FFGP1XQG&src=shanghai_heritage&callnative=1) | 乌鲁木齐中路12号 | 66 |
| 3D001 | 德国技术工程学院，同济德文医学堂，国立上海高级机械职业学校 | 复兴中路1195号 | [上海理工大学-中英国际学院](https://uri.amap.com/marker?markers=B0FFHPC0RM&src=shanghai_heritage&callnative=1) | 上海理工大学复兴路校区(徐汇区复兴中路1195号教学楼S3-5层) | 29 |
| 3D002 | 霞飞路住宅、比利时领馆 | 淮海中路1131号 | [上海音乐学院(汾阳校区)](https://uri.amap.com/marker?markers=B00155N15X&src=shanghai_heritage&callnative=1) | 汾阳路20号 | 98 |
| 3D003 | 万国储蓄会公寓、盖司康公寓 | 淮海中路1204-1218号 | [淮海公寓](https://uri.amap.com/marker?markers=B00155LRNA&src=shanghai_heritage&callnative=1) | 淮海中路1202号(中国银行旁边) | 54 |
| 3D004 | 住宅 | 淮海中路1276-1292号 | [淮海大楼](https://uri.amap.com/marker?markers=B00155IR0H&src=shanghai_heritage&callnative=1) | 淮海中路1326弄0号(常熟路地铁站6号口步行50米) | 180 |
| 3D005 | 住宅 | 华亭路71弄1-7号，延庆路135-149号 | [华亭路71弄](https://uri.amap.com/marker?markers=B0FFGFGCN5&src=shanghai_heritage&callnative=1) | 华亭路71弄1-8号(常熟路地铁站3号口步行170米) | 108 |
| 3D006 | 住宅 | 华亭路72、74、84、86号，延庆路151-157号 | [华亭路71弄](https://uri.amap.com/marker?markers=B0FFGFGCN5&src=shanghai_heritage&callnative=1) | 华亭路71弄1-8号(常熟路地铁站3号口步行170米) | 64 |
| 3D007 | 麦琪公寓 | 复兴西路24号 | [麦琪公寓](https://uri.amap.com/marker?markers=B0KUUUYJHO&src=shanghai_heritage&callnative=1) | 乌鲁木齐中路与复兴西路交叉口东北20米 | 6 |
| 3D008 | 上海新村 | 淮海中路1487弄1-56号 | [上海新邨](https://uri.amap.com/marker?markers=B00155KQYV&src=shanghai_heritage&callnative=1) | 淮海中路1487弄1-57号 | 96 |
| 3D009 | 林肯公寓 | 淮海中路1554-1568号、1562弄2-5号 | [淮海中路1517号](https://uri.amap.com/marker?markers=B0K14AOS3Q&src=shanghai_heritage&callnative=1) | 淮海中路1554号 | 26 |
| 3D010 | 来斯南村 | 五原路205弄2-6号 | [五原路65弄](https://uri.amap.com/marker?markers=B0GRMUZNIX&src=shanghai_heritage&callnative=1) | 五原路65弄1-9号(常熟路地铁站6号口步行170米) | 345 |
| 3D011 | 住宅 | 永福路52号 | [上海电影(集团)有限公司](https://uri.amap.com/marker?markers=B00152B760&src=shanghai_heritage&callnative=1) | 永福路52号 | 9 |
| 3D012 | 住宅 | 武康路40弄1号 | [武康路40弄](https://uri.amap.com/marker?markers=B0LBRSJARU&src=shanghai_heritage&callnative=1) | 武康路与安福路交叉口南100米 | 24 |
| 3D013 | 住宅 | 复兴西路193号3号楼 | [上海市房地产科学研究院](https://uri.amap.com/marker?markers=B00154DQJA&src=shanghai_heritage&callnative=1) | 复兴西路193号 | 10 |
| 3D015 | 住宅 | 武康路113号 | [巴金故居(装修中)](https://uri.amap.com/marker?markers=B00156EH0U&src=shanghai_heritage&callnative=1) | 武康路113号(上海图书馆地铁站3号口步行440米) | 11 |
| 3D016 | 住宅 | 武康路117弄1号 | [武康路391弄](https://uri.amap.com/marker?markers=B0GRMR1NRR&src=shanghai_heritage&callnative=1) | 武康路391弄1-5号 | 247 |
| 3D017 | 住宅 | 武康路117弄2号 | [周作民旧居](https://uri.amap.com/marker?markers=B0FFFGN5WZ&src=shanghai_heritage&callnative=1) | 武康路117弄1-2号 | 11 |
| 3D018 | 住宅 | 武康路390号 | [民防工程(汽车工业总公司)](https://uri.amap.com/marker?markers=B0G2ZUE2ZB&src=shanghai_heritage&callnative=1) | 武康路390号B1 | 43 |
| 3D019 | 住宅 | 武康路393号 | [黄兴旧居](https://uri.amap.com/marker?markers=B00155M14M&src=shanghai_heritage&callnative=1) | 武康路393号(近淮海中路) | 18 |
| 3D020 | 住宅 | 淮海中路1818弄（1-6号、8号） | [淮海中路1818弄](https://uri.amap.com/marker?markers=B0FFG757FM&src=shanghai_heritage&callnative=1) | 淮海中路1818弄1-8号 | 18 |
| 3D021 | 住宅 | 嘉善路131-143弄，169弄 | [甘邨嘉善路143弄](https://uri.amap.com/marker?markers=B00156O24G&src=shanghai_heritage&callnative=1) | 嘉善路143弄之1-6号 | 1438 |
| 3D022 | 住宅 | 永嘉路383号 | [上海市文化和旅游局执法总队](https://uri.amap.com/marker?markers=B00152547D&src=shanghai_heritage&callnative=1) | 永嘉路383号 | 19 |
| 3D023 | 住宅 | 永嘉路389号 | [荣智勋住宅旧址](https://uri.amap.com/marker?markers=B0FFFE0FQZ&src=shanghai_heritage&callnative=1) | 永嘉路389号 | 27 |
| 3D024 | 住宅 | 太原路160号 | [经世楼](https://uri.amap.com/marker?markers=B0LKAD8NJG&src=shanghai_heritage&callnative=1) | 太原路160号10号楼 | 93 |
| 3D025 | 住宅 | 永嘉路495弄 | [永嘉路495弄小区](https://uri.amap.com/marker?markers=B0FFIAUXK7&src=shanghai_heritage&callnative=1) | 永嘉路与岳阳路交叉口东100米 | 26 |
| 3D026 | 住宅 | 建国西路398号 | [建国西路398号](https://uri.amap.com/marker?markers=B0H0RB70BS&src=shanghai_heritage&callnative=1) | 建国西路与岳阳路交叉口东100米 | 10 |
| 3D027 | 住宅 | 岳阳路170弄1号1号楼 | [岳阳路195弄小区](https://uri.amap.com/marker?markers=B0FFHD4IJU&src=shanghai_heritage&callnative=1) | 岳阳路195弄1-23号 | 214 |
| 3D029 | 住宅 | 永嘉路571号 | [佰瑞置业(永嘉路店)](https://uri.amap.com/marker?markers=B0FFHESUEE&src=shanghai_heritage&callnative=1) | 天平路街道永嘉路571号(衡山路地铁站1号口步行360米) | 3 |
| 3D030 | 住宅 | 安亭路81弄2，4号 | [安第那公寓旧址](https://uri.amap.com/marker?markers=B0FFFWSMFZ&src=shanghai_heritage&callnative=1) | 安亭路81弄2、4号(衡山路地铁站1号口步行330米) | 9 |
| 3D032 | 住宅 | 建国西路620、622号 | [上海市市立幼儿园](https://uri.amap.com/marker?markers=B001530DC7&src=shanghai_heritage&callnative=1) | 建国西路629号(衡山路地铁站1号口步行450米) | 51 |
| 3D034 | 大修道院 | 漕溪北路336号 | [上海市徐汇区人大常委会](https://uri.amap.com/marker?markers=B00155BWIB&src=shanghai_heritage&callnative=1) | 漕溪北路336号1号楼(徐家汇地铁站2号口步行180米) | 34 |
| 3F003 | 住宅 | 溧阳路1084弄2-11号、1114弄1-21号、1156弄1-19号、1208弄1-12号、1219、1221、1253、1283、1313、1235、1267、1295、1298、1237、1269、1297、1331、1251、1281、1311、1338号，溧阳路1203弄1-12号 | [溧阳路1208弄](https://uri.amap.com/marker?markers=B00155KD1E&src=shanghai_heritage&callnative=1) | 溧阳路与宝安路交叉口西100米 | 237 |
| 3F005 | 礼查饭店 | 黄浦路15号 | [中国证券博物馆](https://uri.amap.com/marker?markers=B0FFK2KA0K&src=shanghai_heritage&callnative=1) | 黄浦路15号 | 10 |
| 3F007 | 住宅 | 蟠龙街1-13号 | [台铃电动车(北外滩街道乍浦路店)](https://uri.amap.com/marker?markers=B0M6BDHENL&src=shanghai_heritage&callnative=1) | 蟠龙街26号浦西小区 | 47 |
| 3F009 | 虹口大旅社 | 海宁路449号 | [虹口大楼](https://uri.amap.com/marker?markers=B0FFK3706B&src=shanghai_heritage&callnative=1) | 四川北路889号(四川北路地铁站2号口步行330米) | 33 |
| 3F011 | 祥德路住宅 | 祥德路2弄 | [祥德路2弄小区](https://uri.amap.com/marker?markers=B0HU5HOPVA&src=shanghai_heritage&callnative=1) | 祥德路2弄 | 27 |
| 3G002 | 上海市东区污水处理厂 | 河间路1283号 | [上海东区污水处理厂](https://uri.amap.com/marker?markers=B00157I1DB&src=shanghai_heritage&callnative=1) | 定海路街道河间路1283号东区 | 102 |
| 3G005 | 上海煤气公司 | 杨树浦路2524号 | [上海煤气公司杨树浦工厂旧址](https://uri.amap.com/marker?markers=B0K35RPQAG&src=shanghai_heritage&callnative=1) | 杨树浦路与隆昌路交叉口东20米 | 25 |
| 3G006 | 正广和汽水厂 | 通北路400号 | [正广和饮用水有限公司授权水站](https://uri.amap.com/marker?markers=B0GR2ZAEWC&src=shanghai_heritage&callnative=1) | 济宁路13号 | 35 |
| 3G007 | 裕丰纱厂 | 杨树浦路2866号 | [上海杨浦国际时尚中心折扣店-AS](https://uri.amap.com/marker?markers=B0LAXL3HSA&src=shanghai_heritage&callnative=1) | 杨树浦路2866号 | 274 |
| 3M002 | 新华村 | 愚园路1320号 | [绿地商务大厦](https://uri.amap.com/marker?markers=B00155I5DT&src=shanghai_heritage&callnative=1) | 愚园路1258号 | 187 |
| 3M003 | 新华村 | 愚园路1320号 | [绿地商务大厦](https://uri.amap.com/marker?markers=B00155I5DT&src=shanghai_heritage&callnative=1) | 愚园路1258号 | 187 |
| 3M004 | 新华村 | 愚园路1320号 | [绿地商务大厦](https://uri.amap.com/marker?markers=B00155I5DT&src=shanghai_heritage&callnative=1) | 愚园路1258号 | 187 |
| 3M005 | 新华村 | 愚园路1320号 | [绿地商务大厦](https://uri.amap.com/marker?markers=B00155I5DT&src=shanghai_heritage&callnative=1) | 愚园路1258号 | 187 |
| 3M006 | 亦村 | 泰安路76弄 | [泰安路76弄28号](https://uri.amap.com/marker?markers=B0MRMBRS67&src=shanghai_heritage&callnative=1) |  | 211 |
| 3M007 | 住宅 | 愚园路1294号 | [中国工商银行24小时自助银行(愚园路支行)](https://uri.amap.com/marker?markers=B0FFFWCB7E&src=shanghai_heritage&callnative=1) | 愚园路1294号(中山公园地铁站8号口步行350米) | 10 |
| 3M009 | 住宅 | 愚园路1112弄4号，20号 | [愚园路1249弄](https://uri.amap.com/marker?markers=B0FFGFIJO2&src=shanghai_heritage&callnative=1) | 安西路与愚园路交叉口南80米 | 252 |
| 3M010 | 私立妇孺医院 | 延安西路934号 | [上海市长宁区妇幼保健院-儿童保健部](https://uri.amap.com/marker?markers=B0G1ZO6YIQ&src=shanghai_heritage&callnative=1) | 镇宁路233号 | 760 |
| 3M011 | 住宅 | 新华路200号 | [长宁区Yard](https://uri.amap.com/marker?markers=B0J2OZC47A&src=shanghai_heritage&callnative=1) | 新华路200号 | 32 |
| 3M012 | 住宅 | 新华路231号 | [荣漱仁旧居](https://uri.amap.com/marker?markers=B0FFK1STFS&src=shanghai_heritage&callnative=1) | 新华路231号 | 9 |
| 3M013 | 住宅 | 新华路329弄32号乙 | [新华别墅新华路329弄](https://uri.amap.com/marker?markers=B0KU6U4K0V&src=shanghai_heritage&callnative=1) | 新华路与香花桥路交叉口东南220米 | 51 |
| 3M014 | 住宅 | 新华路329弄36号 | [西班牙公使旧居](https://uri.amap.com/marker?markers=B0FFF9SWOV&src=shanghai_heritage&callnative=1) | 新华路329弄36号 | 8 |
| 3M015 | 住宅 | 新华路236号，248号，272弄2号、6号，294弄1号 | [新华路272弄小区](https://uri.amap.com/marker?markers=B0FFJYRFOT&src=shanghai_heritage&callnative=1) | 法华镇路272弄 | 35 |
| 3M016 | 住宅 | 兴国路72号 | [兴国宾馆8号楼会议中心](https://uri.amap.com/marker?markers=B00155LZQC&src=shanghai_heritage&callnative=1) | 兴国路78号兴国宾馆 | 149 |
| 3M017 | 住宅 | 兴国路72号 | [兴国宾馆8号楼会议中心](https://uri.amap.com/marker?markers=B00155LZQC&src=shanghai_heritage&callnative=1) | 兴国路78号兴国宾馆 | 149 |
| 3M019 | 住宅 | 新华路483号 | [新华大厦(新华路)](https://uri.amap.com/marker?markers=B00155ITSV&src=shanghai_heritage&callnative=1) | 新华路543号 | 136 |
| 3M021 | 住宅 | 华山路1076号，华山路1100、1120 弄 | [上海市经济信息中心](https://uri.amap.com/marker?markers=B0015355F2&src=shanghai_heritage&callnative=1) | 华山路1076号 | 27 |
| 3M023 | 住宅 | 延安西路2558号（1-4号楼） | [上海市工人疗养院](https://uri.amap.com/marker?markers=B00154DQTP&src=shanghai_heritage&callnative=1) | 延安西路2558号(红宝石路地铁站4号口步行320米) | 16 |
| 3M024 | 住宅 | 新华路211弄2号 | [李佳白旧居](https://uri.amap.com/marker?markers=B0FFF2FULP&src=shanghai_heritage&callnative=1) | 新华路街道新华路街道新华路211弄2号 | 58 |
| 3M025 | 哥伦比亚总会 | 延安西路1262号7号楼 | [上海生物制品研究所有限责任公司(安顺路)](https://uri.amap.com/marker?markers=B0FFFQFJIO&src=shanghai_heritage&callnative=1) | 安顺路350号 | 1802 |
| 3M026 | 大理石亭 | 长宁路780号中山公园内 | [中山公园-大理石亭](https://uri.amap.com/marker?markers=B0FFG72E3Y&src=shanghai_heritage&callnative=1) | 长宁路780号中山公园(东北角) | 0 |
| 3M027 | 弗兰克林住宅、中央银行俱乐部 | 淮海西路338号 | [中国人民解放军海军特色医学中心](https://uri.amap.com/marker?markers=B0FFJPVBCT&src=shanghai_heritage&callnative=1) | 淮海西路338号 | 103 |
| 3M030 | 真如中学 | 延安西路601号 | [上海市延安初级中学延安西路校区](https://uri.amap.com/marker?markers=B0015505EN&src=shanghai_heritage&callnative=1) | 延安西路601号 | 88 |
| 3N001 | 宜昌路救火会 | 宜昌路216号 | [上海市消防总队普陀支队宜昌中队](https://uri.amap.com/marker?markers=B0FFG95RZB&src=shanghai_heritage&callnative=1) | 宜昌路216号 | 31 |
| 3N003 | 天利淡气制品厂 | 云岭东路345号 | [上海化工研究院有限公司4号楼](https://uri.amap.com/marker?markers=B0LKZPE76W&src=shanghai_heritage&callnative=1) | 云岭东路345号上海化工研究院 | 242 |
| 3W001 | 唐墓桥露德圣母堂 | 浦东唐墓桥 | [天主教上海教区唐墓桥露德圣母堂(暂停开放)](https://uri.amap.com/marker?markers=B001557N7X&src=shanghai_heritage&callnative=1) | 唐镇唐兴路535弄1号 | 449 |
| 3K001 | 海底电缆登陆局房 | 逸仙路3901号 | [上海东海船厂招待所](https://uri.amap.com/marker?markers=B0IAV65XZV&src=shanghai_heritage&callnative=1) | 军工路与逸仙路交叉口南40米 | 104 |
| 4A003 | 英商自来水公司办公楼 | 江西中路464-466号 | [江西大楼](https://uri.amap.com/marker?markers=B0FFG75N17&src=shanghai_heritage&callnative=1) | 江西中路451号(南京东路地铁站6号口步行400米) | 52 |
| 4A004 | 源源长银行/东方企业公司 | 江西中路473号 | [江西中路473号](https://uri.amap.com/marker?markers=B0IDB5LZOX&src=shanghai_heritage&callnative=1) | 江西中路与香港路交叉口西南20米 | 8 |
| 4A006 | 信托大楼/上海信托公司 | 北京东路190号 | [沙美大楼](https://uri.amap.com/marker?markers=B0H2VHX3FW&src=shanghai_heritage&callnative=1) | 外滩街道北京东路194号 | 11 |
| 4A007 | 浙江兴业银行 | 北京东路230号 | [上海建工二建集团海通大厦项目部](https://uri.amap.com/marker?markers=B0J32SAS38&src=shanghai_heritage&callnative=1) | 北京东路201号(南京东路地铁站6号口步行370米) | 69 |
| 4A008 | 中垦大楼/中国垦业银行 | 北京东路239、255号 | [上海市电力行业协会](https://uri.amap.com/marker?markers=B0015289AD&src=shanghai_heritage&callnative=1) | 北京东路239号(南京东路地铁站6号口步行260米) | 1 |
| 4A012 | 中央储蓄会/广东银行 | 天津路2号，江西中路349号 | [中国光大银行(外滩支行)](https://uri.amap.com/marker?markers=B00154DWLA&src=shanghai_heritage&callnative=1) | 中山东一路29号(近北京东路) | 441 |
| 4A017 | 安利洋行 | 四川中路320号，九江路80号 | [安利大楼](https://uri.amap.com/marker?markers=B00153831C&src=shanghai_heritage&callnative=1) | 四川中路320号(南京东路地铁站7号口步行460米) | 17 |
| 4A018 | 大清银行/中国人寿保险公司 | 四川中路268-270号， | [安利大楼](https://uri.amap.com/marker?markers=B00153831C&src=shanghai_heritage&callnative=1) | 四川中路320号(南京东路地铁站7号口步行460米) | 122 |
| 4A021 | 旗昌洋行 | 福州路17、19号 | [上海外滩市联公寓](https://uri.amap.com/marker?markers=B0FFG6QI7P&src=shanghai_heritage&callnative=1) | 福州路17号 | 10 |
| 4A022 | 中兴银行 | 福州路89号 | [申达大厦(福州路)](https://uri.amap.com/marker?markers=B0FFH24IL5&src=shanghai_heritage&callnative=1) | 福州路89号 | 3 |
| 4A023 | 雷米洋行/利名洋行 | 金陵东路6-8号（双号） | [金陵东路8号](https://uri.amap.com/marker?markers=B0IA75DYH5&src=shanghai_heritage&callnative=1) | 金陵东路与永安路交叉口西北20米 | 7 |
| 4A028 | 新光大戏院 | 宁波路586号 | [爱民弄](https://uri.amap.com/marker?markers=B00155L4KF&src=shanghai_heritage&callnative=1) | 宁波路587弄2-7号(人民广场地铁站19号口步行400米) | 58 |
| 4A029 | 中国大饭店 | 宁波路588号，；贵州路160号-170号 | [伟丽模特](https://uri.amap.com/marker?markers=B00155QHV2&src=shanghai_heritage&callnative=1) | 宁波路588号(人民广场地铁站19号口步行460米) | 22 |
| 4A031 | 中国纺织建设公司第五仓库 | 南苏州路1295号 | [有为工社](https://uri.amap.com/marker?markers=B0FFI65X6V&src=shanghai_heritage&callnative=1) | 南苏州路1295号(新闸路地铁站1号口步行330米) | 3 |
| 4A032 | 洋行 | 广东路306号 | [全季酒店(广东路店)(暂停营业)](https://uri.amap.com/marker?markers=B0FFJE4G8I&src=shanghai_heritage&callnative=1) | 广东路306号 | 9 |
| 4A033 | 江苏旅社 | 福州路379弄50号 | [福州路379弄](https://uri.amap.com/marker?markers=B0FFGFJCJA&src=shanghai_heritage&callnative=1) | 福州路与山西南路交叉口西南60米 | 46 |
| 4A034 | 中国银行南市办事处 | 人民路1号(小东门) | [童涵春堂(南车站路店)](https://uri.amap.com/marker?markers=B00155F14V&src=shanghai_heritage&callnative=1) | 南车站路206号 | 1778 |
| 4A037 | 集贤村 | 金坛路35弄1号-30号、；32号-44号 | [集贤邨](https://uri.amap.com/marker?markers=B00155IR53&src=shanghai_heritage&callnative=1) | 金坛路35弄之1-44号(小南门地铁站3号口步行280米) | 51 |
| 4A038 | 小南门警钟楼 | 中华路581号 | [小南门警钟楼](https://uri.amap.com/marker?markers=B0FFF9UDXW&src=shanghai_heritage&callnative=1) | 中华路579号(小南门地铁站2号口步行60米) | 10 |
| 4A039 | 沪南钱业公所 | 人民路安仁街古城公园内；（原址：北施家弄133号） | [沪南钱业公所](https://uri.amap.com/marker?markers=B0FFHDM48A&src=shanghai_heritage&callnative=1) | 人民路333号古城公园内(福佑路与安仁街交叉口) | 7 |
| 4C001 | 中德医院 | 延安中路393号 | [上海市第一妇婴保健院西院](https://uri.amap.com/marker?markers=B00150DD09&src=shanghai_heritage&callnative=1) | 南京西路街道长乐路536号 | 879 |
| 4C002 | 康绥公寓 | 淮海中路468-494号 | [康绥公寓](https://uri.amap.com/marker?markers=B00155R07S&src=shanghai_heritage&callnative=1) | 淮海中路494弄1-27号 | 31 |
| 4C003 | 国泰公寓 | 淮海中路816弄（1-40号），淮海中路818-832号，850-860号（双号） | [国泰公寓](https://uri.amap.com/marker?markers=B00156COV4&src=shanghai_heritage&callnative=1) | 淮海中路814弄1-7号、816弄1-58号 | 37 |
| 4C004 | 霞飞坊 | 淮海中路927弄 | [kukur(淮海坊店)](https://uri.amap.com/marker?markers=B0J0NAGQYS&src=shanghai_heritage&callnative=1) | 淮海中路927弄140号淮海坊 | 57 |
| 4C005 | 法国体育总会 | 南昌路57号 | [科学会堂国际会议厅](https://uri.amap.com/marker?markers=B00155GER6&src=shanghai_heritage&callnative=1) | 瑞金二路街道南昌路57号(淮海中路地铁站1号口步行370米) | 48 |
| 4C006 | 上海别墅 | 南昌路110弄、112-122号 | [上海别墅](https://uri.amap.com/marker?markers=B00155L3AP&src=shanghai_heritage&callnative=1) | 南昌路110弄之1-25号 | 54 |
| 4C012 | 派克公寓 | 复兴中路455号 | [花园公寓](https://uri.amap.com/marker?markers=B00155NF00&src=shanghai_heritage&callnative=1) | 复兴中路455弄1-30号 | 34 |
| 4C013 | 花园住宅 | 复兴中路471－477号（单号） | [卢湾区第四聋哑学校](https://uri.amap.com/marker?markers=B0KUBRO5ZL&src=shanghai_heritage&callnative=1) | 复兴中路与淡水路交叉口西100米 | 20 |
| 4C014 | 花园住宅 | 复兴中路517号，531号，533-537号，539号，541号 | [思南书局](https://uri.amap.com/marker?markers=B0FFIK8665&src=shanghai_heritage&callnative=1) | 复兴中路517号 | 6 |
| 4C015 | 辣斐坊 | 复兴中路553弄1-21号，543-551号，555-561号 | [复兴坊](https://uri.amap.com/marker?markers=B001574737&src=shanghai_heritage&callnative=1) | 瑞金二路街道瑞金二路街道瑞金二路街道瑞金二路街道瑞金二路街道复兴中路553弄1-97号 | 45 |
| 4C016 | 花园住宅 | 思南路50-70号 | [星巴克臻选(思南公馆店)](https://uri.amap.com/marker?markers=B0FFGT4ERK&src=shanghai_heritage&callnative=1) | 思南路50号 | 74 |
| 4C018 | 广慈医院 | 瑞金二路197号（8号楼、9号楼） | [上海交通大学医学院附属瑞金医院(黄浦院区)](https://uri.amap.com/marker?markers=B00155L9T9&src=shanghai_heritage&callnative=1) | 瑞金二路197号 | 145 |
| 4C020 | 金谷村 | 绍兴路2-34 号（双）、瑞金二路132弄1-48 号，瑞金二路132 弄56-68 号，瑞金二路132 弄78-83 号 | [金谷邨](https://uri.amap.com/marker?markers=B00155R0XH&src=shanghai_heritage&callnative=1) | 瑞金二路街道瑞金二路街道瑞金二路街道瑞金二路街道瑞金二路街道绍兴路18弄1-83号 | 46 |
| 4C023 | 花园住宅 | 淮海中路796号 | [历峰双子别墅](https://uri.amap.com/marker?markers=B00156R4K0&src=shanghai_heritage&callnative=1) | 淮海中路街道淮海中路796号 | 15 |
| 4B002 | 荣氏花园住宅 | 陕西北路186号 | [PRADA(荣宅)](https://uri.amap.com/marker?markers=B0FFKX44SD&src=shanghai_heritage&callnative=1) | 陕西北路186号 | 23 |
| 4B003 | 宋氏花园住宅 | 陕西北路369号 | [陕西北路356号](https://uri.amap.com/marker?markers=B0LDXHHLEK&src=shanghai_heritage&callnative=1) | 南京西路街道陕西北路356号 | 22 |
| 4B004 | 花园住宅 | 铜仁路257号 | [上海市人民政府外事办公室](https://uri.amap.com/marker?markers=B00155IVFM&src=shanghai_heritage&callnative=1) | 南京西路1418号(静安寺地铁站6号口步行410米) | 99 |
| 4B008 | 觉园（南国大佛寺），金刚道场 | 常德路418号 | [上海金刚道场](https://uri.amap.com/marker?markers=B0MDXL0VNK&src=shanghai_heritage&callnative=1) | 北京西路与常德路交叉口东北120米 | 80 |
| 4B012 | 花园住宅 | 康定路2号 | [康定花园](https://uri.amap.com/marker?markers=B00155L3UI&src=shanghai_heritage&callnative=1) | 江宁路街道康定路2号 | 33 |
| 4B013 | 戈登路巡捕房 | 江宁路511号 | [Ocean's Table欧舍](https://uri.amap.com/marker?markers=B0LUKUUQ8F&src=shanghai_heritage&callnative=1) | 江宁路511号 | 7 |
| 4B015 | 住宅 | 康定路759弄 | [静安区政协](https://uri.amap.com/marker?markers=B00153749A&src=shanghai_heritage&callnative=1) | 康定路759号(昌平路地铁站3号口步行280米) | 89 |
| 4B016 | 司米托莫银行 | 胶州路510号 | [胶州路505号](https://uri.amap.com/marker?markers=B0IAXN04K4&src=shanghai_heritage&callnative=1) | 昌平路地铁站2号口步行340米 | 55 |
| 4B017 | 龚氏花园住宅 | 胶州路522号 | [中国宝武钢铁集团有限公司上海冶金老干部活动中心](https://uri.amap.com/marker?markers=B00156NSIP&src=shanghai_heritage&callnative=1) | 胶州路522号(昌平路地铁站5号口步行280米) | 10 |
| 4B018 | 上海市政委员会电力部住宅 | 胶州路561号 | [胶州路373号](https://uri.amap.com/marker?markers=B0K045K21S&src=shanghai_heritage&callnative=1) | 胶州路与武定路交叉口西北20米 | 334 |
| 4B020 | 刘氏花园住宅 | 长乐路786号、784号 | [长乐路798号](https://uri.amap.com/marker?markers=B0FFGDF72E&src=shanghai_heritage&callnative=1) | 长乐路与常熟路交叉口东60米 | 54 |
| 4B021 | 中央储备银行 | 常熟路100弄10号 | [上海歌剧院](https://uri.amap.com/marker?markers=B00154AF39&src=shanghai_heritage&callnative=1) | 常熟路100弄10号 | 98 |
| 4B022 | 新恩堂/上海公共礼拜堂/基督教新教堂 | 乌鲁木齐北路25号 | [世纪时空大厦(愚园支路)](https://uri.amap.com/marker?markers=B00155KIX3&src=shanghai_heritage&callnative=1) | 乌鲁木齐北路199号16层1601室距静安寺地铁站365米 | 330 |
| 4B023 | 熊佛西楼 | 华山路630号 | [上海戏剧学院华山路校区-熊佛西楼](https://uri.amap.com/marker?markers=B0FFFGNELZ&src=shanghai_heritage&callnative=1) | 华山路630号戏剧学院华山路校区熊佛西楼 | 50 |
| 4B024 | 潘氏花园住宅 | 武定西路1498弄 | [武定西路1368号](https://uri.amap.com/marker?markers=B0JK2HPVLR&src=shanghai_heritage&callnative=1) | 武定西路方向与镇宁路465弄交叉口西北260米 | 153 |
| 4B025 | 花园住宅 | 陕西北路457号 | [辞书出版社旧址花园](https://uri.amap.com/marker?markers=B0JKO5HRRN&src=shanghai_heritage&callnative=1) | 北京西路和陕西路路口 | 94 |
| 4H001 | 华联新泰仓库 | 新泰路57号 | [新泰仓库](https://uri.amap.com/marker?markers=B0M3SHC2DM&src=shanghai_heritage&callnative=1) | 三泰路与福建北路交叉口东60米 | 44 |
| 4H003 | 中国银行仓库 | 北苏州路1040号 | [犀牛书店(JK1933店)](https://uri.amap.com/marker?markers=B0G2179E36&src=shanghai_heritage&callnative=1) | 北苏州路1040号A101室(茂联大厦F1层) | 18 |
| 4H005 | 梁氏民宅 | 山西北路457弄61号 | [吉庆小区](https://uri.amap.com/marker?markers=B00156CPUU&src=shanghai_heritage&callnative=1) | 山西北路457弄之2-63号 | 29 |
| 4D003 | 沪江别墅 | 长乐路613弄、615-629号（单号） | [长乐路613弄12号](https://uri.amap.com/marker?markers=B0FFJ4VU7N&src=shanghai_heritage&callnative=1) | 长乐路613弄3号长乐路613弄小区 | 33 |
| 4D004 | a花园住宅，b花园住宅，c花园住宅 | 淮海中路1189号、1199号、1209号 | [上海音乐学院东方乐器博物馆](https://uri.amap.com/marker?markers=B0FFILVJD4&src=shanghai_heritage&callnative=1) | 淮海中路1189号 | 73 |
| 4D005 | 愉园 | 淮海中路1350弄2-16号 | [愉园](https://uri.amap.com/marker?markers=B00155R07K&src=shanghai_heritage&callnative=1) | 淮海中路1350弄15号(常熟路地铁站7号口步行80米) | 42 |
| 4D007 | 花园住宅 | 淮海中路1897号 | [杜重远寓所](https://uri.amap.com/marker?markers=B00155LA2H&src=shanghai_heritage&callnative=1) | 淮海中路1897号(交通大学地铁站1号口步行170米) | 60 |
| 4D008 | a犹太俱乐部，b花园住宅/比利时领馆 | 汾阳路20号 | [上海音乐学院汾阳校区图书馆](https://uri.amap.com/marker?markers=B0GKGC9V4O&src=shanghai_heritage&callnative=1) | 汾阳路20号上海音乐学院(汾阳校区) | 8 |
| 4D009 | 犹太医院，水塔 | 汾阳路83号 | [复旦大学附属眼耳鼻喉科医院10号楼](https://uri.amap.com/marker?markers=B0FFGDF7SY&src=shanghai_heritage&callnative=1) | 天平路街道汾阳路83号复旦大学附属眼耳鼻喉科医院10号楼1F信息中心 | 11 |
| 4D010 | 并立花园住宅 | 汾阳路152-154号、156-158号 | [花园住宅](https://uri.amap.com/marker?markers=B0FFMA0P4O&src=shanghai_heritage&callnative=1) | 天平路街道高安路99号(衡山路地铁站1号口步行470米) | 1101 |
| 4D012 | 黑石公寓 | 复兴中路1331号 | [黑石公寓旧址](https://uri.amap.com/marker?markers=B0FFF9LVS2&src=shanghai_heritage&callnative=1) | 复兴中路1331号 | 0 |
| 4D013 | 花园住宅，花园住宅 | 宝庆路20号 | [民防工程(上海轻工业研究所)](https://uri.amap.com/marker?markers=B0G2HZOC75&src=shanghai_heritage&callnative=1) | 宝庆路20号B1 | 5 |
| 4D016 | 宋氏住宅 | 东平路11号 | [Juke](https://uri.amap.com/marker?markers=B0IADKRU3B&src=shanghai_heritage&callnative=1) | 东平路11号102号 | 43 |
| 4D017 | 吴氏花园住宅 | 安福路201号 | [一一艺术生活馆·油画画室](https://uri.amap.com/marker?markers=B0G2GANN18&src=shanghai_heritage&callnative=1) | 乌鲁木齐中路315号(常熟路地铁站6号口步行480米) | 413 |
| 4D018 | 巨泼来斯公寓 | 安福路233号 | [巨拨莱斯公寓](https://uri.amap.com/marker?markers=B0FFF39YJ1&src=shanghai_heritage&callnative=1) | 安福路233号 | 4 |
| 4D019 | 花园住宅 | 安福路284号 | [上海话剧艺术中心(安福路)](https://uri.amap.com/marker?markers=B00151E89A&src=shanghai_heritage&callnative=1) | 安福路288号话剧大厦 | 52 |
| 4D022 | 花园住宅 | 华山路831号 | [上海市拥军优属基金会](https://uri.amap.com/marker?markers=B0GK7U16UN&src=shanghai_heritage&callnative=1) | 华山路831号 | 17 |
| 4D023 | 花园住宅 | 华山路849号 | [上海丁香花园](https://uri.amap.com/marker?markers=B00155LALT&src=shanghai_heritage&callnative=1) | 华山路849号 | 1 |
| 4D024 | 交通大学恭绰馆（工程馆），新上院 | 华山路1954号 | [上海交通大学徐汇校区工程馆](https://uri.amap.com/marker?markers=B00156YL1Z&src=shanghai_heritage&callnative=1) | 华山路1954号上海交通大学徐汇校区 | 88 |
| 4D025 | 花园住宅 | 武康路2号 | [莫觞清旧居](https://uri.amap.com/marker?markers=B0FFHOF34P&src=shanghai_heritage&callnative=1) | 武康路2号 | 4 |
| 4D026 | 美童公学宿舍楼及水塔 | 衡山路10号 | [衡山路23号洋房](https://uri.amap.com/marker?markers=B0FFHXC5XL&src=shanghai_heritage&callnative=1) | 衡山路23号(衡山路地铁站4号口步行340米) | 271 |
| 4D030 | 贝当公寓 | 衡山路700号 | [贝当公寓旧址](https://uri.amap.com/marker?markers=B0FFF3WJEG&src=shanghai_heritage&callnative=1) | 天平路街道天平路街道衡山路700号 | 2 |
| 4D033 | 巨福公寓/安康公寓 | 乌鲁木齐南路176号 | [阿根美发(安康公寓店)](https://uri.amap.com/marker?markers=B0FFHSDHMC&src=shanghai_heritage&callnative=1) | 乌鲁木齐南路176-8(衡山路地铁站1号口步行350米) | 18 |
| 4D034 | 花园住宅 | 建国西路598号 | [金钟大厦(肇嘉浜路)](https://uri.amap.com/marker?markers=B00154DIHZ&src=shanghai_heritage&callnative=1) | 肇嘉浜路680号(肇嘉浜路地铁站2号口步行200米) | 279 |
| 4D036 | 金司林公寓 | 安亭路43号 | [安亭公寓](https://uri.amap.com/marker?markers=B0FFH10L8B&src=shanghai_heritage&callnative=1) | 安亭路与永嘉路交叉口南100米 | 1 |
| 4D037 | 花园住宅 | 安亭路46号1号楼 | [安亭别墅](https://uri.amap.com/marker?markers=B0J211HQUH&src=shanghai_heritage&callnative=1) | 安亭路46号(衡山路地铁站1号口步行300米) | 47 |
| 4D038 | 荣氏花园住宅 | 高安路18弄20号 | [徐汇区青少年活动中心(高安分中心)](https://uri.amap.com/marker?markers=B00150F4A9&src=shanghai_heritage&callnative=1) | 高安路18弄1-25号(衡山路地铁站2号口步行250米) | 15 |
| 4D039 | 励氏花园住宅 | 高安路63号 | [上海市建设系统老干部活动室](https://uri.amap.com/marker?markers=B00154IBPC&src=shanghai_heritage&callnative=1) | 天平路街道天平路街道高安路63号励家花园(西北角) | 7 |
| 4D041 | 花园住宅 | 康平路1号 | [甲午同庚千龄会聚会地旧址](https://uri.amap.com/marker?markers=B0FFIDIVGV&src=shanghai_heritage&callnative=1) | 天平路街道天平路街道康平路1号 | 14 |
| 4D042 | 花园住宅 | 康平路205号 | [上海市徐汇区老干部大学](https://uri.amap.com/marker?markers=B00155MV4C&src=shanghai_heritage&callnative=1) | 康平路205号(交通大学地铁站1号口步行450米) | 15 |
| 4D043 | 花园住宅/挪威领事馆 | 吴兴路96号 | [吴兴路新里](https://uri.amap.com/marker?markers=B0HU55OARM&src=shanghai_heritage&callnative=1) | 吴兴路260号 | 352 |
| 4D045 | 花园住宅/法国领事馆 | 岳阳路319号11号楼 | [中国科学院上海分院新生命科学大楼](https://uri.amap.com/marker?markers=B0FFLEHRW5&src=shanghai_heritage&callnative=1) | 岳阳路320号(肇嘉浜路地铁站2号口步行430米) | 36 |
| 4D047 | 徐家汇观象（天文）台 | 蒲西路166号 | [上海气象博物馆](https://uri.amap.com/marker?markers=B0I0NM6P0T&src=shanghai_heritage&callnative=1) | 蒲西路166号(徐家汇地铁站出入口步行150米) | 503 |
| 4D048 | 龙华机场候机楼 | 龙华西路1号 | [上海民航职业技术学院(徐汇校区)](https://uri.amap.com/marker?markers=B00156O735&src=shanghai_heritage&callnative=1) | 龙华西路1号(云锦路地铁站7号口步行420米) | 289 |
| 4F004 | 批亚斯公寓 | 蟠龙街26号，乍浦路199-215号，塘沽路411-429号 | [浦西小区](https://uri.amap.com/marker?markers=B00155L3FL&src=shanghai_heritage&callnative=1) | 蟠龙街26号 | 24 |
| 4F005 | 小浦西公寓 | 塘沽路387-401号 | [浦西小区](https://uri.amap.com/marker?markers=B00155L3FL&src=shanghai_heritage&callnative=1) | 蟠龙街26号 | 76 |
| 4F006 | 工部局西童女子学校 | 塘沽路390号 | [上海市安装工程集团有限公司(塘沽路)](https://uri.amap.com/marker?markers=B0FFG0WLRZ&src=shanghai_heritage&callnative=1) | 塘沽路390号 | 23 |
| 4F007 | 景林庐 | 乍浦路254弄（22-27号），乍浦路260号，昆山路141-171号 | [景林庐旧址](https://uri.amap.com/marker?markers=B0FFG0GZYE&src=shanghai_heritage&callnative=1) | 乍浦路260号 | 40 |
| 4F009 | 英华书馆 | 武进路412号 | [武进路234号](https://uri.amap.com/marker?markers=B0ID7H1NDQ&src=shanghai_heritage&callnative=1) | 武进路与乍浦路交叉口东北20米 | 335 |
| 4F012 | 永丰坊、大德里、恒安坊 | 四川北路1515弄（10-105号），1545弄（1-33号、1-20号），四川北路1519-1551号（单号） | [四川北路1515弄小区](https://uri.amap.com/marker?markers=B0KUL7V5FN&src=shanghai_heritage&callnative=1) | 四川北路与邢家桥南路交叉口西北60米 | 57 |
| 4F016 | 花园住宅 | 四川北路2023弄35号 | [邮票钱币社(多伦生活广场店)](https://uri.amap.com/marker?markers=B0FFIRVUCJ&src=shanghai_heritage&callnative=1) | 多伦路179号上海报纸博物馆附近 | 65 |
| 4F017 | 拉摩斯公寓 | 四川北路2079-2099号 | [川北公寓](https://uri.amap.com/marker?markers=B0KDOYN13W&src=shanghai_heritage&callnative=1) | 四川北路2222号 | 295 |
| 4F018 | 西童公学 | 四川北路2066号 | [上海市民办新复兴初级中学](https://uri.amap.com/marker?markers=B00150ECB9&src=shanghai_heritage&callnative=1) | 四川北路街道四川北路2066号 | 76 |
| 4F020 | 白氏旧居 | 多伦路210号 | [上海四一一医院中医门诊](https://uri.amap.com/marker?markers=B0KG45SQY2&src=shanghai_heritage&callnative=1) | 多伦路210号 | 10 |
| 4F023 | 花园里 | 山阴路145弄 | [花园里](https://uri.amap.com/marker?markers=B0M2YXAEHV&src=shanghai_heritage&callnative=1) | 吉祥路与山阴路交叉口北100米 | 147 |
| 4F024 | 亚细亚里 | 黄渡路107弄、109 号 | [黄渡路107弄小区](https://uri.amap.com/marker?markers=B0HU55NVKB&src=shanghai_heritage&callnative=1) | 黄渡路107弄(虹口足球场地铁站6号口步行250米) | 42 |
| 4F026 | 住宅 | 霍山路71-95号，舟山路21-81号 | [长青学校](https://uri.amap.com/marker?markers=B0J1TAC6NB&src=shanghai_heritage&callnative=1) | 霍山路125弄8号(提篮桥地铁站1号口步行410米) | 73 |
| 4F028 | 住宅 | 长阳路50弄15-31号 | [长阳路50弄小区](https://uri.amap.com/marker?markers=B00155KFXL&src=shanghai_heritage&callnative=1) | 长阳路50弄之1-31号(提篮桥地铁站1号口步行340米) | — |
| 4F030 | 住宅 | 临潼路25-89号、99弄 | [临潼路99弄小区](https://uri.amap.com/marker?markers=B00155KFHP&src=shanghai_heritage&callnative=1) | 临潼路99弄之4-16号(杨树浦路地铁站出入口步行470米) | 55 |
| 4G001 | 住宅 | 许昌路227弄（特号、1-84号、101-104、197-201号） | [纺三小区](https://uri.amap.com/marker?markers=B00155L2K8&src=shanghai_heritage&callnative=1) | 许昌路227弄1-216号 | — |
| 4G002 | 圣心教堂 | 杭州路349号 | [上海市第一康复医院](https://uri.amap.com/marker?markers=B00156ENJQ&src=shanghai_heritage&callnative=1) | 杭州路349号(近宁国路) | 68 |
| 4G003 | 日本同兴纱厂工房及老板住宅 | 平凉路1777弄51号、101-141（单）号、100-154（双）号 | [平青小区](https://uri.amap.com/marker?markers=B00156O1Z1&src=shanghai_heritage&callnative=1) | 平凉路1777弄1-166号 | 59 |

## 缺少 POI（70）

| 编号 | 历史建筑 | 名录地址 | 高德地点 | 高德地址 | 距离（米） |
| --- | --- | --- | --- | --- | ---: |
| 1D005 | 汾阳路45号 | 汾阳路45号 | — | 汾阳路45号 | 68 |
| 2A008 | 麦加利银行 | 中山东一路18号 | — | 中山东一路18号 | 7 |
| 2A020 | 广学大楼 | 虎丘路128号 | — | 虎丘路128号 | 3 |
| 2A036 | 礼记洋行 | 江西中路255号 | — | 江西中路255号 | 19 |
| 2A056 (2E001) | 慈修庵 | 秦岭街15号 | — | 慈修庵(东南门) | 72 |
| 3A005 | 大北大楼电报局 | 延安东路34号 | — | 延安东路34号 | 21 |
| 3B008 | 亚细亚火油公司住宅 | 巨鹿路889号 | — | 巨鹿路889号 | 62 |
| 3H001 | 上海总商会 | 北苏州路470号 | — | 北苏州路470号 | 96 |
| 3D033 | 住宅 | 余庆路190号 | — | 市委机关幼儿园(正门) | 112 |
| 3G003 | 怡和纱厂 | 杨树浦路670号 | — | 杨树浦路670号 | 40 |
| 4H004 | 会审公堂，上海第一特区地方法院/江苏高等法院第二分院 | 浙江北路191号 | — | 浙江北路191号 | 34 |
| 4D032 | 花园住宅 | 永嘉路630号 | — | 永嘉路630号 | 5 |
| 4D040 | 方建公寓/建成公寓 | 高安路78弄1-3号，建国西路641-645号 | — | 建安公寓高安路78弄1-3号 | 2 |
| 4G005 | 沪江大学历史建筑建筑群：馥赉堂，中学礼堂，思孟堂，思雷堂，科学馆，思晏堂，健身房，思裴堂，怀德堂，思伊堂，体育馆，思福堂，教职工公寓，职工住宅群 | 军工路516号 | — |  | — |
| 4G006 | 同济大学历史建筑建筑群:文远楼，大礼堂，南北楼，图书馆，校门，西南一楼，电工馆，工程试验馆，日本某中学礼堂，日本某中学教学楼，日本某中学教学楼 | 四平路1239号 | — |  | — |
| 4G007 | 同济新村:教工俱乐部，村一楼、村二楼、村三楼、村四楼 | 彰武路45弄 | — |  | — |
| 4G008 | 复旦大学历史建筑建筑群:登辉堂，子彬楼，图书馆，校门 | 邯郸路220号 | — |  | — |
| 4G009 | 毓秀楼 | 武东路100号 | — |  | — |
| 4G010 | 叶家花园（小白楼）/澄衷医院 | 政民路507号 | — |  | — |
| 4G011 | 中国航空协会飞机楼 | 长海路174号 | — |  | — |
| 4G012 | 国立音乐专科学校主楼及辅楼 | 民京路918号 | — |  | — |
| 4M001 | 盛世花园 | 万航渡路540号 | — |  | — |
| 4M002 | 厂房及仓库 | 万航渡路1384弄12号 | — |  | — |
| 4M003 | 开纳公寓 | 武定西路1375号 | — |  | — |
| 4M004 | 中一村/中央一村 | 江苏路46弄、54弄、62弄、70弄、78弄 | — |  | — |
| 4M005 | 上海海关税务司花园住宅 | 江苏路162弄3号 | — |  | — |
| 4M006 | 安定坊 | 江苏路284弄3号、5号、7号、9号、10号、11号、12号、14号、15号、16号、17号、18号、19号、27号 | — |  | — |
| 4M007 | 月村 | 江苏路480弄54、56、58、60、62、66、68、72号，除去90号新公房 | — |  | — |
| 4M008 | 忆定村 | 江苏路495弄 | — |  | — |
| 4M009 | 麦加利银行高级职员住宅/上海房地局职工医院（1976年起） | 江苏路796号 | — |  | — |
| 4M010 | 渔光村 | 镇宁路255弄、265弄、275弄、285弄 | — |  | — |
| 4M011 | 严家花园 | 愚园路699号 | — |  | — |
| 4M012 | 花园住宅 | 愚园路749弄65号 | — |  | — |
| 4M013 | 愚园新村 | 愚园路750弄 | — |  | — |
| 4M014 | 杨氏花园 | 愚园路838弄7号 | — |  | — |
| 4M015 | 百老汇总会/花园住宅 | 愚园路864号 | — |  | — |
| 4M016 | 英式花园住宅群 | 愚园路865弄30、31、32、33、35号 | — |  | — |
| 4M017 | 周氏花园住宅 | 愚园路1015号 | — |  | — |
| 4M018 | 岐山村/东苑别业 | 愚园路1032弄（1018-1028号，1034-1046号） | — |  | — |
| 4M019 | 宏业花园 | 愚园路1076号，1086号，1088弄5-9号、101-147号 | — |  | — |
| 4M020 | 桃源坊 | 愚园路1292弄 | — |  | — |
| 4M021 | 联安坊 | 愚园路1352弄 | — |  | — |
| 4M022 | 中央研究院理工实验馆:实验大楼，元培楼 | 长宁路865号（中山公园对面） | — |  | — |
| 4M023 | 圣玛利亚女中 | 长宁路1187号 | — |  | — |
| 4M024 | 花园住宅 | 利西路24弄5号 | — |  | — |
| 4M025 | 花园住宅 | 利西路30、32号 | — |  | — |
| 4M026 | 福世花园 | 安化路200弄7、8、9、10、11-12、14-15、16、17、18、19号 | — |  | — |
| 4M027 | 郭氏花园住宅 | 延安西路949弄25-47号（除37号） | — |  | — |
| 4M028 | 大西别墅 | 延安西路1453弄 | — |  | — |
| 4M029 | 汤山村 | 武夷路466弄2-9号，武夷路458-460、470-472号 | — |  | — |
| 4M030 | 范园 | 华山路1220弄 | — |  | — |
| 4M031 | 外国弄堂 | 番禺路55弄、75弄、95弄，平武路2号、8号、10号、14号、18号 | — |  | — |
| 4M032 | 邬达克住宅 | 番禺路135号 | — |  | — |
| 4M033 | 又斯登公寓 | 淮海中路2068号 | — |  | — |
| 4M034 | 李鸿章祠堂及门楼/复旦公学力学庐 | 华山路1626号 | — |  | — |
| 4M035 | 外国弄堂 | 新华路329弄28号、30号，新华路321号，新华路211弄1号、10号、12号、14号、16号 | — |  | — |
| 4M036 | 虹桥疗养院 | 伊犁路2号 | — |  | — |
| 4M037 | 花园住宅 | 虹桥路1390号 | — |  | — |
| 4M038 | 宋氏花园住宅 | 虹桥路1430号 | — |  | — |
| 4M039 | 陈氏花园住宅/上海血吸虫病院（1956年）/上海寄生虫病院（1972年）/上海第二结核病防治院 | 虹桥路1440号 | — |  | — |
| 4M040 | 花园住宅 | 虹桥路1518号 | — |  | — |
| 4M041 | 上海盲童学校 | 虹桥路1850号 | — |  | — |
| 4M042 | 孔氏别墅 | 虹桥路2258号、2260号 | — |  | — |
| 4M043 | 花园住宅 | 虹桥路2374号 | — |  | — |
| 4M044 | 泰晤士报社别墅，美丰银行别墅 | 虹桥路2419号 | — |  | — |
| 4M045 | 花园住宅，教堂 | 哈密路1713号 | — |  | — |
| 4M046 | 花园住宅 | 迎宾三路298号 | — |  | — |
| 4M047 | 花园住宅群 | 虹桥路1650号，1590号，1648号；1652号，虹桥路1674号4号楼、3号楼 | — |  | — |
| 4N001 | 曹杨一村 | 曹杨一村（枫桥路、梅岭北路、棠浦路、花溪路、兰溪路） | — |  | — |
| 4N002 | 住宅 | 澳门路660弄1-15号，17-25号，27-37号，41-51号，229-239号，251-261号，267-277号，291-301号，307-317号，381-391号，397-407号 | — |  | — |
