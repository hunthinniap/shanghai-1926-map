# Virtual Shanghai 未查明地标地址：历史路名与今名（第一批）

> **更正：本表是一般路名释读表，不是“地图缺失道路表”。与地图实际使用的 `public/data/historical-features.geojson` 中 `kind=road` 核对后，下列 27 个今名里有 25 个已经入库；只有枫林路、医学院路不在道路图层。2026-09-23 已按用户要求改查全部 1,803 条地点地址，当前入口为 [全量地址路名清单](2026-09-23-all-vs-address-road-gaps.md)，不再按未查明地标筛选。**

核查日期：2026-09-22。范围为 `public/data/unresolved-landmarks/001.json`—`029.json` 的 `F_ADDRESS`，对照项目目前 `scripts/compile-unresolved-research.mjs` 中的 `roadNames`。这是一份路名对照与待核提示，**不是门牌换算表，也不据此移动地标点位**。Virtual Shanghai 给出历史地址写法；今名另以道路史资料核对。下表的“样例”链接返回 Virtual Shanghai 原记录。

当前 29 组原始未查明文件合计 1,432 条记录。按现有 `roadNames` 做简单子串匹配，661 条地址没有命中；这包括拼写变体、今名本来没变的路，以及非道路地址，所以 **661 不是未查明道路数量**。以下先列资料能支持、且在记录中实际出现的路名。

| Virtual Shanghai 写法 | 当时中文路名 | 今名／处理范围 | VS 样例 | 对照依据 |
| --- | --- | --- | --- | --- |
| FOONGLING ROAD | 丰林路 | 枫林路 | [#1519](https://www.virtualshanghai.net/数据/建筑?ID=1519) | [新旧路名表](https://www.cclchinese.com/portal.php?aid=7850&mod=view)、[上海党史网](https://www.ccphistory.org.cn/shds/shhm/content/7d13a7a1-82c1-4aa7-b888-4536c371130c.html) |
| I-HSUENYUEN ROAD | 医学院路（1937 年正式命名；之前沈家浜路） | 医学院路 | [#1519](https://www.virtualshanghai.net/数据/建筑?ID=1519) | [复旦上医校史](https://news.fudan.edu.cn/2022/0527/c970a131460/page.htm) |
| BURKILL ROAD | 白克路 | 凤阳路 | [#865](https://www.virtualshanghai.net/数据/建筑?ID=865) | [上海党史网](https://www.ccphistory.org.cn/shds/hsrw/content/2944e59a-e3da-4a2d-a1d5-091c21b5786d.html) |
| FERRY ROAD | 小沙渡路 | 西康路 | [#1072](https://www.virtualshanghai.net/数据/建筑?ID=1072) | [上海通志](https://www.shanghai.gov.cn/shanghai/newshanghai/%E4%B8%8A%E6%B5%B7%E9%80%9A%E5%BF%97.pdf) |
| ROUTE RATARD | 巨籁达路 | 巨鹿路 | [#376](https://www.virtualshanghai.net/数据/建筑?ID=376) | [法租界道路表](https://zh.wikipedia.org/wiki/上海法租界道路列表) |
| RUE CHAPSAL | 萨坡赛路 | 淡水路 | [#144](https://www.virtualshanghai.net/数据/建筑?ID=144) | [法租界道路表](https://zh.wikipedia.org/wiki/上海法租界道路列表) |
| SEYMOUR ROAD | 西摩路 | 陕西北路 | [#1048](https://www.virtualshanghai.net/数据/建筑?ID=1048) | [新旧路名表](https://www.cclchinese.com/portal.php?aid=7850&mod=view) |
| ROUTE HERVE DE SIEYES | 西爱咸斯路 | 永嘉路 | [#410](https://www.virtualshanghai.net/数据/建筑?ID=410) | [法租界道路表](https://zh.wikipedia.org/wiki/上海法租界道路列表) |
| ROUTE STANISLAS CHEVALIER | 薛华立路 | 建国中路；须与 **NORTH** STANISLAS CHEVALIER 区分 | [#237](https://www.virtualshanghai.net/数据/建筑?ID=237) | [法租界道路表](https://zh.wikipedia.org/wiki/上海法租界道路列表)、[新旧路名表](https://www.cclchinese.com/portal.php?aid=7850&mod=view) |
| CARTER ROAD | 卡德路 | 石门二路 | [#960](https://www.virtualshanghai.net/数据/建筑?ID=960) | [上海党史网](https://www.ccphistory.org.cn/shds/shhm/content/d33c09d2-0008-4ef0-a990-c79209a2b140.html) |
| ROUTE PORTE DE L'OUEST | 西门路 | 自忠路，需确认具体路段；其他表也写作 Rue de la Porte de l'Ouest | [#100](https://www.virtualshanghai.net/数据/建筑?ID=100) | [法租界道路表](https://zh.wikipedia.org/wiki/上海法租界道路列表) |
| RUE BRENIER DE MONTMORAND | 白来尼蒙马浪路／马浪路 | 马当路 | [#170](https://www.virtualshanghai.net/数据/建筑?ID=170) | [文汇报](https://dzb.whb.cn/html/2017-06/30/content_569567.html) |
| RUE MONTAUBAN | 孟斗班路／天主堂街 | 四川南路 | [#1239](https://www.virtualshanghai.net/数据/建筑?ID=1239) | [法租界道路表](https://zh.wikipedia.org/wiki/上海法租界道路列表) |
| JESSFIELD ROAD | 极司非而路 | 万航渡路；与 Jessfield Road Branch 区分 | [#1122](https://www.virtualshanghai.net/数据/建筑?ID=1122) | [新旧路名表](https://www.cclchinese.com/portal.php?aid=7850&mod=view) |
| KIUKIANG ROAD | 九江路 | 九江路（旧拼写） | [#678](https://www.virtualshanghai.net/数据/建筑?ID=678) | [民国商业名录路名对照](https://upload.wikimedia.org/wikipedia/commons/4/43/NLC511-027032013015433-16400_%E5%BE%B5%E4%BF%A1%E5%B7%A5%E5%95%86%E8%A1%8C%E5%90%8D%E9%8C%84.pdf) |
| YATES ROAD | 同孚路／晏芝路 | 石门一路 | [#995](https://www.virtualshanghai.net/数据/建筑?ID=995) | [新旧路名表](https://www.cclchinese.com/portal.php?aid=7850&mod=view)、[上海党史网](https://www.ccphistory.org.cn/shds/shhm/content/d33c09d2-0008-4ef0-a990-c79209a2b140.html) |
| PEKING ROAD | 北京路 | 北京东路 | [#666](https://www.virtualshanghai.net/数据/建筑?ID=666) | [1865 年工部局道路表](https://zh.wikipedia.org/wiki/1865年上海工部局命名道路列表) |
| RUE AUGUSTE BOPPE | 蒲柏路 | 太仓路西段 | [#160](https://www.virtualshanghai.net/数据/建筑?ID=160) | [文汇报](https://dzb.whb.cn/html/2017-06/30/content_569567.html) |
| NORTH CHEKIANG ROAD | 北浙江路 | 浙江北路 | [#773](https://www.virtualshanghai.net/数据/建筑?ID=773) | [新旧路名表](https://www.cclchinese.com/portal.php?aid=7850&mod=view) |
| ROUTE CONTY | 康悌路 | 建国东路 | [#130](https://www.virtualshanghai.net/数据/建筑?ID=130) | [法租界道路表](https://zh.wikipedia.org/wiki/上海法租界道路列表) |
| MOULMEIN ROAD | 慕尔鸣路 | 茂名北路；勿与法租界的茂名南路／迈尔西爱路混同 | [#994](https://www.virtualshanghai.net/数据/建筑?ID=994) | [上海旅游官网](https://www.meet-in-shanghai.net/tc/news/its-very-shanghai-its-very-lively-the-limitedtime-pedestrian-street-on-maoming-north-road-was-officially-opened-the-old-residents-of-zhangyuan-came-back-to-visit-196991/) |
| NANKING ROAD | 南京路 | 南京东路；与旧 Bubbling Well Road／今南京西路区分 | [#589](https://www.virtualshanghai.net/数据/建筑?ID=589) | [1865 年工部局道路表](https://zh.wikipedia.org/wiki/1865年上海工部局命名道路列表) |
| RUE TOURANE | 郑家木桥路／杜浪路 | 福建南路 | [#23](https://www.virtualshanghai.net/数据/建筑?ID=23) | [法租界道路表](https://zh.wikipedia.org/wiki/上海法租界道路列表) |
| PARK ROAD | 派克路 | 黄河路；不要与 Park Lane／旧派克弄混同 | [#934](https://www.virtualshanghai.net/数据/建筑?ID=934) | [新旧路名表](https://www.cclchinese.com/portal.php?aid=7850&mod=view) |
| ROUTE PERE DUGOUT | 杜神父路 | 永年路 | [#122](https://www.virtualshanghai.net/数据/建筑?ID=122) | [法租界道路表](https://zh.wikipedia.org/wiki/上海法租界道路列表) |
| NORTH HONAN ROAD | 北河南路 | 河南北路 | [#737](https://www.virtualshanghai.net/数据/建筑?ID=737) | [新旧路名表](https://www.cclchinese.com/portal.php?aid=7850&mod=view) |
| MYBURGH ROAD | 梅白克路／梅白格路 | 新昌路；历史上道路分段、错位，门牌仍须核 | [#931](https://www.virtualshanghai.net/数据/建筑?ID=931) | [新昌路沿革](https://zh.wikipedia.org/wiki/新昌路_(上海)) |

## 不能直接整路替换的例子

| VS 写法 | 初步对应 | 为什么暂不作自动对照 |
| --- | --- | --- |
| [MARKHAM ROAD](https://www.virtualshanghai.net/数据/建筑?ID=1381) | 麦根路 → 今秣陵路或苏州河附近的淮安路／康定东路等 | [新旧路名表](https://www.cclchinese.com/portal.php?aid=7850&mod=view)对同一旧名列出多处；必须先看每条 VS 坐标与历史门牌。 |
| [GREAT WESTERN ROAD](https://www.virtualshanghai.net/数据/建筑?ID=1234) | 大西路 → 主要为今延安西路，其他资料另列中、东段 | 同名历史路线跨段，不把所有地址直接写为延安西路。参见[新旧路名表](https://www.cclchinese.com/portal.php?aid=7850&mod=view)。 |
| [SOOCHOW ROAD](https://www.virtualshanghai.net/数据/建筑?ID=1676) | 苏州路 → 南苏州路、浙江中路或湖北路不同路段 | [新旧路名表](https://www.cclchinese.com/portal.php?aid=7850&mod=view)列出至少三段；还要先排除 **NORTH SOOCHOW ROAD**。 |
| [DIXWELL ROAD](https://www.virtualshanghai.net/数据/建筑?ID=1582) | 狄思威路 → 今溧阳路为主 | 部分旧段在四平路拓宽后并入四平路，须逐点核对。[溧阳路沿革](https://zh.wikipedia.org/wiki/溧阳路)。 |
| [RUE EUGENE BARD](https://www.virtualshanghai.net/数据/建筑?ID=81) | 白尔路 → 自忠路东段或太仓路北段 | 历史路线分段；不能只凭路名定点。[新旧路名表](https://www.cclchinese.com/portal.php?aid=7850&mod=view)。 |

## #1519 的具体读法

[Virtual Shanghai #1519](https://www.virtualshanghai.net/数据/建筑?ID=1519)写的是 `FOONGLING ROAD / I-HSUENYUEN ROAD`。可先释为“丰林路（今枫林路）与医学院路交会处附近”，**不能从斜杠顺序推断医院正门开在丰林路**。此外，VS 的 `开工时间` 是 1936 年，而[复旦校史](https://news.fudan.edu.cn/2022/0527/c970a131460/page.htm)称沈家浜路在 1937 年才正式改称医学院路；这说明 VS 地址字段可能沿用较晚时点路名，不能把路名写法当成建筑开工当年的原貌。医院身份仍须用建筑、地块和史料另证，不能由路名对照单独认定。

本轮只新增调查清单，不修改地图坐标、地标身份或自动路名表。
