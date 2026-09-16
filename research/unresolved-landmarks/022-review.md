# 固定022批研究阶段交付

更新：2026-09-15，第五次续查（r5）已完成。输入是固定 `022-input.json`，不是上传的 Gemini “022”报告。

## r5：最后十条未启动记录（2026-09-15）

- 1620、450、1625、1246、699、1384、464、94、133、1527 均已从 `not-started` 推进为 `partial`，每条新增4条带日期查询、来源评述、现址/现用途判断和下一步。
- likely/review 候选：450 雅法公寓（五原路253—263号住宅）、1246 洋布公所—福建南路吉安里、1384 扬子木材厂—静安河滨花园住宅、464 燕平会馆—高安路第一小学宛平校区、133 延泽医院—卢湾一中心小学／恒基旭辉天地近邻、1527 姚家花园—淮阴路200号西郊宾馆紫竹楼。
- unresolved/no：1620 八千代旅馆（Range Road→武进路，缺门牌）、1625 大和饭店（Hannen Road→海南路84号，单体未核）、699 养心小学（广西北路109号附近，现机构未核）、94 晏心寺（Rue Eugene Bard→自忠路/太仓路段，原址与用途未闭合）。
- 固定022当前统计：**8 completed / 42 partial / 0 not-started；2 verified / 19 likely / 29 unresolved；0 yes / 21 review / 29 no**。日期日志累计查询口径为246次（evidence记录数组为245条，历史部分检索另存于日志）。候选仅供人工复核，地图、坐标、道路、分组和原始字段未修改；不同时间用途记录不合并。
- r5逐条记录与校验文件：`022-continuation-2026-09-15-r5-*.json`、`022-validation-2026-09-15-r5-*.json`；累计查询口径更新为246次。历史来源包括 Virtual Shanghai、Histoire de Chine、道路沿革、地方/官方资料及OSM空间辅助。

### r5条目摘要

| ID | 历史地点 | 当前调查结论 |
| --- | --- | --- |
| 1620 | Yachiyo Hotel／八千代旅馆 | 确认为1922年、?? RANGE ROAD；Range Road→武进路。门牌缺失，利通广场近邻不构成现址，unresolved/no。 |
| 450 | Yafa Court／雅法公寓 | 1934年、253/255 Route Mgr Maresca；今五原路253—263号装饰艺术住宅候选，likely/review。 |
| 1625 | Yamato Hotel／大和饭店 | 1928年、84 Hannen Road；今海南路84号道路级对应，单体/存废未核，unresolved/no。 |
| 1246 | Yangbu Gongsuo／洋布公所 | 1914年、94 Rue Tourane；今福建南路吉安里住宅候选，likely/review。 |
| 699 | Yangxin Primary School／养心小学 | 原109-2 Kwangse Road→广西北路；现无名建筑面无机构连续性证据，unresolved/no。 |
| 1384 | Yangzi Wood Factory／扬子木材厂 | 1939年、1189 Guangfu；原点在静安河滨花园住宅用地内，likely/review但厂房命运未核。 |
| 464 | Yanping Guild／燕平会馆 | 原241 Route J. Winling→宛平路；原点在高安路第一小学宛平校区内，likely/review。 |
| 94 | Yanxinsi Temple／晏心寺 | 原132 Rue Eugene Bard；白尔路记忆与今西门路/自忠路段不闭合，unresolved/no。 |
| 133 | Yanze Hospital／延泽医院 | 原432 Route Conty→建国东路；学校/商业综合体为近邻候选，单体未闭合，likely/review。 |
| 1527 | Yaojia Garden／姚家花园 | HONGQIAO/MACLEOD；今淮阴路200号西郊宾馆紫竹楼，现宾馆内部使用候选，likely/review。 |

## r4历史进度（截至第44条；当前统计以上方r5为准）

- 固定50条、49组、64成员；输入SHA-256：`42420a19f71deb8ce674b1cda741060664dd45ea54ad9464ac8ff16e3da1629e`。
- **8 completed / 32 partial / 10 not-started**。顺序已推进至第44条（704）；completed表示完成当轮有限核查，不等于现代用途查明。
- 现代对应 **2 verified / 13 likely / 35 unresolved**；建议 **0 yes / 15 review / 35 no**。本次1080、1382、756由not-started转likely/review，1544由已有partial/unresolved推进likely/review，251、1377、1210、981、704由not-started转likely/review；学校占用范围、徐园现代宗地、七浦路342号、201号后续用途、553号具体楼栋、8号纺织厂门牌/厂界、728号修德小学门牌/校舍存废及154-5号西园剧场停业／拆除／原建筑边界仍待核。
- 本轮第24—29条：24、837、1066、856、45、161。实际56次针对性检索，11个精确VS页（6个输入加1067/1068/1070/857/859）；6条均partial，具体原档/全文/范围缺口保留。
- 其余43条results/evidence对象完全不变。9月13第一轮报告和验证另存 `022-review-2026-09-13-r1.md`、`022-validation-2026-09-13-r1.json`；9月12存档及既有来源目录不覆盖。

## 本轮结果与边界

### r4：1080 锡珍女子中学

- [Virtual Shanghai精确记录](https://www.virtualshanghai.net/數據/建築?ID=1080)确认锡珍女子中学地址为310 HART ROAD；同址批外记录1081正光中学保持独立，不随意合并。
- [上海市房屋管理局第五批历保建筑清单](https://fgj.sh.gov.cn/yxlsjzcs/20200414/b9946bf8508e4b9689671fcd4146bb86.html)列5B021“信义会”，现使用单位为住宅，地址常德路310号，1922年，保护类别三。
- [常德路310号建筑记录](https://blog.sina.com.cn/s/blog_5d1bdf480102zeb6.html)记锡珍女中1938年创办后迁入赫德路310号，1954年并入协进女中，1963年培进中学迁至康定路770号。由此形成历史学校—现住宅的候选链，判定 **likely/review**；尚不能确认校舍楼层、原点与单体边界，也不把“住宅”写成学校仍在办学。

| ID | 地点 | 新增证据与判断 |
| --- | --- | --- |
| 24 | 新蒙小学 | [《古稀忆昔》](https://yptimes.shyp.gov.cn/resfile/2019-03-16/08/08.pdf)及[《七十年的童年情结》](https://yptimes.shyp.gov.cn/resfile/2019-06-11/01/01.pdf)原版均已核读。郑寿护回忆里弄私立小学，与教会小学一墙之隔；两文同作者，1949秋/1950返校叙述不同。无129-12门牌，不将后继学校或邻校现址写回本点。unresolved/no。 |
| 837 | 新宁中学 | [2021校舍修缮报道](https://sghexport.shobserver.com/html/baijiahao/2021/08/19/516128.html)与[2026采购文件](https://jpg.zfcg.sh.gov.cn/sh-gov-open-doc/1108QZ/6b10ddf1-b090-41d6-9311-b61e2ad43df5.pdf)列储能中学重庆北路270号。此处教育设施用途有日期明确的材料，但旧新宁270与现代校区未接实；原点在校区OSM面外3米。仅同号/近邻不足likely，仍unresolved/no，所有现代字段null。采购清单不等于考试已发生。 |
| 1066 | 新人小学及同组3校 | [暨南大学院史](https://lgxy.jnu.edu.cn/2019/0827/c40809a814763/page.htm)记1939借南阳路滨海中学，仅补滨海道路级历史，无183号及新人小学。1066/1067/1068在皮裘公寓面外，1070在内；不以一成员替四实体定名或现用，整组hold。unresolved/no。 |
| 856 | 新生女子高级职业学校 | [湖北政协杨美真传记](https://www.hbzx.gov.cn/49/2014-09-15/6097.html)和[民建摘要](https://www.minjian.gov.cn/nd.jsp?groupId=-1&id=2427)形成机构身份线索，未证80 Love Lane。迁校不等于旧校舍拆除；妇女节制会研究PDF未读到。女校、仙乐剧院、节制协会独立保留，三点在今用地内不等于同一占用范围和时序。unresolved/no，整组hold。 |
| 45 | 新夏小学 | 敏体尼至西藏南为道路级检索线索；原439-1不得静默变为现代439弄1号/新乐里。尚未补出独立校史，点在最近无名楼面外9.78米、商业中心面外23.48米，不推定学校已拆或原址商业。unresolved/no。 |
| 161 | 新新小学 | [燃冉项目方正文](https://ranran.ucca.art/yihaohuiguan)记1938年2月迁入太仓155（今181弄1号新天地壹号）；[另一页索引](https://ranran.ucca.art/shikumen)补蒲柏429→155，但桥接正文超时/404。同项目两文不算独立互证，主页面首次全文已读、后续复读404也已记录。**likely/review**：候选现代名/地址已列，currentUse和relationship仍null。 |

161另有[品牌方2026年开幕稿](https://www.prnasia.com/story/546026-1.shtml)：报道8月28日启幕并公布8月29日至9月13日开放期。仅支持命名场地的限时艺术活动，不是现场核实9月13日营业，更不能外推长期品牌馆/会所。学校旧占用部分与现楼的对应还未查实。1937被炸叙述属于先前南市校址，不能套蒲柏429。

### r4续查：1382 徐园

- [解放日报《康定路上，故事从徐园讲起》](https://www.jfdaily.com/journal/getMobileArticle.htm?id=511329)记载康脑脱路即今康定路，新徐园在康脑脱路5号、约今康定路江宁路以东，并记其在战乱前后焚毁、仅存残垣。
- [静安区政府“记忆江宁”资料](https://www.jingan.gov.cn/rmtzx/003008/003008006/20170629/17443d7e-e9cd-4055-988b-24635a432f02.html)将徐园旧址定位在康定路昌化路，记载上世纪30年代被焚毁、现已消失。Virtual Shanghai精确ID 1382保留原名、`?? CONNAUGHT ROAD`及1909字段。
- 结论为 **likely/review**：历史身份、路口级旧址和“建筑已毁”已有多源支持；原始门牌、现代宗地边界与当前用途未闭合。不把相邻住宅、工厂、道路面直接写成徐园现址，也不移动原点。

### r4续查：756 徐少甫诊所

- [Virtual Shanghai精确记录](https://www.virtualshanghai.net/data/buildings?ID=756)与[Histoire de Chine医疗设施索引](https://www.histoire-chine.fr/shanghai-buildings/?entity_name=Medical+facility)均确认徐少甫诊所/徐少甫診所，原地址为342 TSEPOO ROAD。
- [Histoire de Chine道路对照](https://www.histoire-chine.fr/vieux-shanghai/?fulltxt=P)明确Tsepoo Road=七浦路、Chapoo Road=乍浦路；本条规范为今七浦路342号，排除“乍浦路342号”的误配。
- [静安区官方文保点名录](https://www.jingan.gov.cn/main/2238d24f-cdbd-4192-bdc7-35d97f6597e9/c2679037-37d3-4951-8553-49fbba6091e7/%E9%9D%99%E5%AE%89%E5%8C%BA%E6%96%87%E7%89%A9%E4%BF%9D%E6%8A%A4%E7%82%B9%E5%90%8D%E5%BD%95.pdf)另记同址七浦路342号徐氏宅砖雕门楼已迁至共和新路1555号闸北公园；该门楼与诊所保持独立，不能据迁移记录推断诊所建筑命运。
- [静安区政府七浦路商贸报道](https://www.jingan.gov.cn/rmtzx/003008/003008004/20220621/f28da1f1-d0ca-42fc-9390-a400256aa4b6.html)及[高德303号](https://ditu.amap.com/place/B00155AXS9)、[368号](https://www.amap.com/place/B00155FXE4)POI只支持七浦路服装批发/零售商圈级现状；342号具体单位、宗地和诊所建筑存废未核。
- 结论为 **likely/review**：历史实体和道路映射已闭合到门牌级，但当前用途仅有商圈级候选，不能把近邻市场写成342号精确现址，也不回填地图。

### r4续查：1544 徐汇女中学

- [Virtual Shanghai](https://www.virtualshanghai.net/data/buildings?ID=1544)与[Histoire de Chine](https://www.histoire-chine.fr/shanghai-buildings/?entity_name=Secular)均确认徐汇女中学、1867、45 CAOXI BEILU。上海四中官网及[文汇报沿革](https://www.whb.cn/zhuzhan/kandian/20170918/103182_3.html)确认崇德女校—徐汇女中—汇明/上海四中教育继承链，但现上海市第四中学地址为天钥桥路100号，不能作为45号原址现址。
- [上海市政府公报](https://www.shanghai.gov.cn/newshanghai2018/zfgb/201410/ZFGB1410.pdf)列今漕溪北路201号徐家汇圣母院旧址为市级文物保护单位；[地方建筑记录](https://blog.sina.com.cn/s/blog_5d1bdf480101g0bz.html)说明201号为原45号，院内曾并置徐汇女中等机构。
- [上海观察/新闻坊](https://sghexport.shobserver.com/html/baijiahao/2023/07/23/1080490.html)记上海老站徐家汇店于2023-07-15因租约到期停业、车厢和标识搬离；媒体另记45号复合院区部分校舍1999年起拆迁。2023年7月后的201号建筑用途、1544原点对应楼栋及与同组497圣母院分界均未闭合。
- 结论为 **likely/review**：历史学校身份、45→201门牌及复合院区后续利用已有证据，但不能把天钥桥路100号现四中、201号圣母院主体或停业前上海老站直接当成1544精确现址现用途，暂不回填地图。

### r4续查：251 新亚中学

- [Virtual Shanghai精确记录](https://www.virtualshanghai.net/data/buildings?ID=251)与[Histoire de Chine索引](https://www.histoire-chine.fr/shanghai-buildings/?entity_name=Secular)确认新亚中学／新亞中學，原地址为553 ROUTE LAFAYETTE，类型为私立世俗中学；尚未找到可核的办学、停办或迁址时间线。
- [上海图书馆道路沿革](https://data.library.sh.cn/entity/road/4k5d4eorop643342)将Route Lafayette（辣斐德路）对应今复兴中路；[上海市房屋管理局历保名录](https://fgj.sh.gov.cn/yxlsjzcs/20200414/b9946bf8508e4b9689671fcd4146bb86.html)列复兴中路553弄及相邻门牌为4C015辣斐坊／复兴坊，1927年、保护类别三。
- [黄浦区官方环境影响报告](https://www.shhuangpu.gov.cn/uploadfile/48BB468164614FAD9F87540DE160C173_%E6%9C%80%E7%BB%88%E7%89%88%E7%8E%AF%E8%AF%84%E6%8A%A5%E5%91%8A%E5%85%AC%E7%A4%BA%E7%89%88_1.pdf)将复兴坊作为居民区。由此可形成“历史学校门牌—现代复兴坊住宅社区”的候选链，但学校实际占用哪一栋、建筑是否保留及原点与单体边界仍未闭合；OSM命中的思南公馆保护面仅作空间辅助。
- 结论为 **likely/review**：回填字段只写复兴坊／住宅社区候选，不把新亚中学直接等同思南公馆，也不写成学校仍在运营，暂不回填地图。

### r4续查：1377 新裕二厂

- [Virtual Shanghai精确记录](https://www.virtualshanghai.net/data/buildings?ID=1377)与[Histoire de Chine棉纺索引](https://www.histoire-chine.fr/shanghai-buildings/?entity_name=Cotton)确认新裕二厰／Xinyu Cotton Mill No. 2，1924年、8 ROBISON ROAD。徐静仁传记记1924年劳勃生路8号溥益第二纱厂为上海国棉十四厂前身；地方沿革将其接到1935年新裕纺织第二厂及1958年上海第十四棉纺织厂。
- [长寿路街道地方史图注](https://www.sohu.com/a/235629401_809597)出现“新裕纺织二厂（长寿路101号）原溥益纱厂”，另一份沿革表列上棉十四厂长寿路30号；这些门牌差异暂按重编号线索，不静默改写为同一已核门牌。
- [界面新闻地方城市史](https://www.jiemian.com/article/2735198.html)明确秋水云庐原为上棉十四厂厂址，现为高层住宅小区；[普陀区2024年人防备案](https://www.shpt.gov.cn/zhengwu/dxkjyh-gdbzdgz/2024/255/191849/6f331e758e9b430ba1e396424ec25a1e.pdf)及[高德地址](https://www.amap.com/place/B00155I7G5)支持今长寿路28弄1—22号住宅社区。原厂界、厂房保留/拆除与1377原点—小区楼栋关系仍未闭合。
- 结论为 **likely/review**：现代候选写作秋水云庐商品住宅小区及原上棉十四厂场地，不将同组1210合并，也不指定某一住宅楼承接原厂房，暂不回填地图。

### r4续查：1210 新裕纺织第二厂

- [Virtual Shanghai精确记录](https://www.virtualshanghai.net/data/buildings?ID=1210)与[Histoire de Chine棉纺索引](https://www.histoire-chine.fr/shanghai-buildings/?entity_name=Cotton)分别列新裕纺織第二廠／Xinyu Textile Factory No. 2，均为1924年、8 ROBISON ROAD；本条与同组1377独立保留。
- 徐静仁传记记1924年劳勃生路8号溥益第二纱厂为上海国棉十四厂前身，地方沿革补出1935年新裕纺织第二厂和1958年上棉十四厂阶段。长寿路地方图注出现101号，另一沿革表出现30号，重编号仍未取得官方桥接。
- [界面新闻地方城市史](https://www.jiemian.com/article/2735198.html)将秋水云庐认定为上棉十四厂旧址、现为高层住宅；[普陀区2024年人防备案](https://www.shpt.gov.cn/zhengwu/dxkjyh-gdbzdgz/2024/255/191849/6f331e758e9b430ba1e396424ec25a1e.pdf)和[高德地址](https://www.amap.com/place/B00155I7G5)支持长寿路28弄1—22号现住宅社区。原厂界、厂房存续和1210原点—具体楼栋关系仍未闭合。
- 结论为 **likely/review**：现代候选写作秋水云庐商品住宅小区及原上棉十四厂场地，不因同址与1377合并或删除，暂不回填地图。

### r4续查：981 修德小学

- [Virtual Shanghai精确记录](https://www.virtualshanghai.net/Data/Buildings?ID=981)确认Xiude Primary School／私立修徳小學，原地址728 AVENUE ROAD；[1942年《上海暨全国学校调查录》](https://upload.wikimedia.org/wikipedia/commons/2/2e/NLC416-10jh006837-53329_%E4%B8%8A%E6%B5%B7%E6%9A%A8%E5%85%A8%E5%9C%8B%E5%AD%B8%E6%A0%A1%E8%AA%BF%E6%9F%A5%E9%8C%84.pdf)记爱文义路728号、校长朱锡田及学生330人。
- [同济大学教会建筑论文](https://dl.ziliaozhan.win/%E4%B9%A6%E7%B1%8D/pdf/%E7%A0%94%E7%A9%B6/%E4%B8%8A%E6%B5%B7%E5%B8%82%E8%BF%91%E4%BB%A3%E6%95%99%E4%BC%9A%E5%BB%BA%E7%AD%91%E5%8E%86%E5%8F%B2%E5%88%9D%E6%8E%A2.pdf)及[静安区域研究表](https://asiademo.com/jhiea_en/wp-content/uploads/2014/06/0606-FA-04.pdf)均将修德小学列为1937年北京西路728号；[北京西路沿革](https://zh.wikipedia.org/wiki/%E5%8C%97%E4%BA%AC%E8%A5%BF%E8%B7%AF_(%E4%B8%8A%E6%B5%B7))说明Avenue Road即今北京西路。
- 原点WGS84 121.455371,31.234486落在[OSM国际丽都城面](https://www.openstreetmap.org/way/431888200)内；[信义房屋](https://www.sinyi.com.cn/handhouse/detail?cookieuid=&id=56603)、[齐家](https://www.jia.com/zxq/shanghai/lp-16968/xqcs/)和[房天下](https://m.fang.com/xiaoqu/strategy/sh/1210065781.html)将国际丽都城列为北京西路758弄／石门二路199弄的住宅／公寓项目，约2003—2006年建成。
- 结论为 **likely/review**：历史身份与道路映射已补证，现代候选为国际丽都城住宅小区；728号至758弄的官方门牌桥接、学校停办／迁址／拆除日期、原校舍边界和是否有建筑保留均未闭合。不能把住宅面当作原校舍边界，也不直接回填地图。

### r4续查：704 西园剧场

- [Virtual Shanghai精确记录](https://www.virtualshanghai.net/Data/Buildings?ID=704)与[Histoire de Chine演出场所索引](https://www.histoire-chine.fr/shanghai-buildings/?entity_name=Performance%20site)均确认Xiyuan Theater／西園劇場，原地址154-5 KWANGSE ROAD，类型为演出场所／剧场。
- [广西北路沿革](https://zh.wikipedia.org/wiki/广西北路)将Kwangse/Quangsee Road（广西路）对应今广西北路；[上海市黄浦区机关事务管理中心2023年物业合同](https://sh-gov-open-doc.oss-cn-shanghai.aliyuncs.com/1035IC/f46211e6-d15e-4ac8-8056-fc438c3455f2.pdf)明确现图书馆大楼位于广西北路158号／福州路655号，内有区图书馆、档案馆、老年活动中心等单位。
- [上海市文化和旅游局2025年报道](https://whlyj.sh.gov.cn/gqfc/20250905/32ad6ff65a6345848f5429782d2a8959.html)确认福州路655号图书馆持续提供公共阅读和城市书房服务；[高德POI](https://ditu.amap.com/place/B00155I1RO)及[OSM图书馆面](https://www.openstreetmap.org/way/369237876)用于现代位置复核。原点WGS84距图书馆面约17.40米，距相邻无名建筑面约8.15米，空间相容但不在图书馆面内。
- 结论为 **likely/review**：现代候选为广西北路158号／福州路655号黄浦区图书馆大楼及其公共文化、档案综合办公用途；但154-5→158号逐号门牌桥接、西园剧场停业／拆除日期、原剧场建筑边界和现大楼是否为原建筑本体均未取得直接档案。因此不把现图书馆大楼断言为原剧场遗存，也不回填地图。

## 空间与附件核读

- 本次新增Overpass请求0，复用2026-09-12的16次查询、2085个node/way完整几何；64成员保留独立原点，未查relation。距离在WGS84下计算，GCJ-02另存，不调整道路或原坐标。
- 24最近无名面外4.49米；837学校面外3.00米；1066/1067/1068距皮裘面外4.96/0.21/4.94米，1070面内且距边6.27米。
- 856/857/859在无名楼面内，距边11.42/3.97/18.00米；在兴业太古汇用地内，距边18.07/11.44/25.02米。包含关系不证明三个实体的校舍/剧院范围、拆除和现用。
- 161在新天地用地面内，距边1.28米；近邻无名建筑面外0.86米。用地面不是已核定的壹号单体，近边数值不代表原点精度。
- 按PDF核读流程，实际查看两份报纸相关完整拼版和采购表完整跨页：两份报纸文章均在印刷第8版（左侧）；第二份URL为01/01并不代表文章在第1版。采购文件PDF19—20页为印刷17—18页，表1第18行及表2第2项为储能，未串行。
- 3份下载原PDF、4张核读渲染页移到项目外资料目录，未修改或重导出PDF。具体路径、字节数、SHA及失败记录在 `022-continuation-2026-09-13-r2-attachments.json`。不声称采购文件48页全读或历史图已配准。
- 委派1066的并行任务失败，主任务接手完成本轮检索。独立复核只返回预审建议，最终文件复核因额度中断；不将其记为完成的独立审查。

## 工件与验证

- 完整交付：`022-results.json`（50条八字段）及 `022-evidence.json`（原输入、逐条证据/空间/查询/下一步）；本轮增量 `022-continuation-2026-09-13-r2-{findings,sources,search-log,attachments}.json`。
- 全阶段累计202次针对性+4次本轮检索=206次；49次精确VS页核读记录。这不表示64个组员全部完成外部现用途考证。
- `022-validation-2026-09-15-r4-704.json`与此前八份r4增量校验记录：原输入、结果/evidence字段和来源覆盖一致，地图未写入，`git diff --check`通过。旧 `022-validate.mjs`仍是r2基线校验器，因此前r3变更不再代表当前全量通过，不能据此宣称本轮全量验证通过。
- 坐标转换3项测试和 `git diff --check`通过。离线校验不证明历史真实性或现场运营，未运行应用build/端到端测试。
- 地图保持296 overrides、5507要素、3832道路，未查明导出1403；未compile/apply/current-use/unresolved/data:build。正式覆盖仍1100个有调查记录，不计固定022为50条完成。
- 未commit/push/fetch，不宣称远程一致；HEAD仍 `991f3987b0dc5c1dd49b841a59c1bb0548a8e5b8`。其余用户工作区改动保留。

## 下一步

1. 顺序下一条为第45条 **1620**；第30—44条已至少完成前置或针对性研究，其中1080、1382、756、1544、251、1377、1210、981、704为likely/review。两项纺织厂1377/1210须各自保留，不因同址合并；981的728号门牌与校舍存废、704的154-5号门牌与剧场存废仍待档案补证。
2. 161重点取得道契英册B.C.12158、地册1050原图与1938校舍资料，验证429—155桥接及旧校占用/现楼保留部分；活动结束后常态用途另核。
3. 24补教育登记与旧129-12门牌、邻教会小学边界；837补新宁旧270校产/招生及现储能地籍联系；1066组查南阳183各校启事；856补新生与80号原刊。
4. 保留前轮优先缺口：911的1947图、现代分号和近期用途；1117的申报1939索引361-415(5)/民光361-431(4)原报；1247原志正文；1076/1679范围和现况仍review。外部Gemini1565/1062两个yes未导入。

（r4历史快照）未开始ID：1620、450、1625、1246、699、1384、464、94、133、1527；已由上方r5处理。partial的32个ID及每条具体缺口见当时evidence/validation，不把“已检索到第44条”说成44条已完成。
