# 历史地标与优秀历史建筑共用卡片复核

2026-09-19：累计应用 **101 组**明确关联（89 处建筑、10 处建筑群、2 处构筑物）。南京饭店、圣三一堂、沐恩堂及其他确认项在“显示地标”和“显示历史建筑”中共用详情卡与历史建筑参考点；同时打开两层时只显示一个点。原始历史坐标、记录和现用途判断保留。

最新一轮根据用户提出的教堂例子，进一步核读现用途沿革及其引用来源：复核112对，新增55组，57对暂缓。包括圣三一堂、沐恩堂、徐家汇天主堂、兰心大戏院、大来大楼、河滨公寓等；华懋公寓身份虽对应，但名录现有参考点有明显位置冲突，未应用坐标合并。完整新增／暂缓表及证据见[沿革补查](continuation-notes/README.md)。下方46组采用表、28对保留表为第一轮存档，累计结果以applied-links.json为准。

## 覆盖与结果

- 全量扫描 1803 条 Virtual Shanghai 建筑记录、1676 个运行时地标组、1058 项官方名录（978 项有可用参考点）。
- 初筛得到 498 对候选：32 对优先一对一、261 对复杂线索、38 对名称相合但距离超过250米、167 对邻近或证据不足。初筛等级不等于同一建筑判定。
- 首轮独立复核74对，46对采用、28对保留；沿革补查新增复核112对，55对采用、57对保留。累计186对已审、101对采用、85对未采用，其余312对未逐一人工核定，不自动合并。
- 接受项一对一，完整来源ID集合一致，未命中持久化用途待核规则；1803个来源ID无丢失、无重复。参考点来自既有维基／图书馆等资料，不是房管局测绘坐标。

## 南京饭店

VS #609 **Nanjing Hotel／南京飯店** 与第4批 **4A016 南京饭店**为同一建筑。旧门牌 **200 SHANSE ROAD**；官方名录地址 **山西南路182-200号**；维基列表另列天津路191号-211弄，双源原文分别显示。历史记录1931年、名录资料1929年分别保留。

统一显示采用历史建筑图层 WGS84 **[121.47772, 31.2393]**，距原VS点约18.953米；上海图书馆BD-09点转换后约83米，作为独立参考。没有使用错误混合坐标系统产生的旧1217米距离，也未声称经高德验证或精确到入口。逐项证据见 [nanjing-hotel.json](nanjing-hotel.json)。

## 展示行为

- 两层任一入口打开同一卡片，包含原英文／中文名称、完整旧路名与门牌、名录新路名与门牌、来源年代和资料链接。搜索支持确认项的新旧名称及地址。
- 两层同时开启只留历史建筑点；关闭一层而另一层仍开启，卡片和视野保持。关闭最后一层会收起关联卡片，异步加载晚到也不会重新弹出。
- 建筑群、主楼及构筑物范围在卡片中明确显示。和平南北楼、都城主楼与东楼、盖司康主楼与沿街辅楼分别保留。
- 原始文件不回写；显示位置只在内存副本调整。现用途字段保持原研究结论，不凭名录名称推定今日用途。
- 本次“显示建筑”按上下文解释为“显示历史建筑”，普通现代建筑轮廓开关行为不变。

## 首轮已采用关联（46组）

| VS ID | 历史名称 | 名录项 | 旧路名与门牌（原文） | 新路名与门牌（名录） | 范围 |
|---|---|---|---|---|---|
| 29 | Great World | 1A010 大世界游乐场 | 1 BOULEVARD DE MONTIGNY | 西藏南路1号 | 建筑 |
| 472 | Georgia Apartments | 4D028 会斯乐公寓/乔治公寓 | 311/331 AVENUE PETAIN | 衡山路311-331号 | 建筑 |
| 471 | Washington Apartments | 2D021 华盛顿公寓 | 338/340 ROUTE ANDRE COHEN | 衡山路303号 | 建筑 |
| 1598 | Guangdong Theater | 4F013 广东大戏院/虹光大戏院 | 1552 NORTH SZECHUEN ROAD | 四川北路1552号 | 建筑 |
| 609 | Nanjing Hotel | 4A016 南京饭店 | 200 SHANSE ROAD | 山西南路182-200号 | 建筑 |
| 1648 | Jinglintang | 2F010 景灵堂 | 135 KUNSHAN ROAD | 昆山路135号 | 建筑 |
| 537 | Bank of Chosen | 5A039 Bank of chosen/上海市直接税局 | 330 SZECHUEN ROAD | 四川中路330号 | 建筑 |
| 717 | Eastern Hotel | 2A050 东方饭店 | 120 YUYACHING ROAD | 西藏中路120号 | 建筑 |
| 539 | Kincheng Banking Corporation | 1A026 金城银行 | 200 KIANGSE ROAD | 江西中路200号 | 建筑 |
| 1497 | Saint Francis Xavier's church (Dongjiadu Church) | 1A027 董家渡天主堂 | 175 TUNGCHIATU ROAD | 董家渡路175号 | 建筑 |
| 376 | Daoist Temple | 5B035 善道堂 | 709 ROUTE RATARD | 巨鹿路709号 | 建筑 |
| 1426 | Kaina Gongyu | 4M003 开纳公寓 | 189 KEIYUAN | 武定西路1375号 | 建筑 |
| 676 | Sincere Company | 1A020 先施公司 | 690 NANKING ROAD | 南京东路690号 | 建筑 |
| 510 | Garden Bridge | 2A012 外白渡桥 | GARDEN BRIDGE | 外滩 | 构筑物 |
| 677 | Sun Sun Company | 1A021 新新公司 | 720 NANKING ROAD | 南京东路720号 | 建筑 |
| 513 | Gibb, Livingston & Company | 2A017 仁记洋行 | 100 JINKEE ROAD | 滇池路100-110号 | 建筑 |
| 675 | Sun Company | 1A022 大新公司 | 830 NANKING ROAD | 南京东路830号 | 建筑 |
| 1673 | General Office of Post and Telecommunications | 1F003 上海邮政总局 | NORTH SOOCHOW ROAD / NORTH SZECHUEN ROAD | 北苏州河路250-276号 | 建筑 |
| 615 | Shijie Publisher | 5A048 世界书局 | 390 FOOCHOW ROAD | 福州路390号 | 建筑 |
| 607 | Hengli Bank | 4A014 恒利银行 | 100 TIENTSIN ROAD | 河南中路495号，天津路100号 | 建筑 |
| 680 | Yangzi Hotel | 4A030 扬子饭店 | 287 YUNNAN ROAD | 汉口路740号，云南路287号 | 建筑 |
| 1688 | Jinshan Building | 5F031 金山大楼 | ?? ASTOR ROAD | 金山路43-61号（单号）、大名路60-86（双号） | 建筑 |
| 1596 | Hongde Church | 2F003 鸿德堂 | 19 ?? | 多伦路59号 | 建筑 |
| 1338 | Sihang Warehouse | 2H001 四行仓库 | 21 NORTH SOOCHOW ROAD | 光复路21号 | 建筑 |
| 504 | Y.W.C.A. | 2A024 女青年会大楼 | 113 YUENMINGYUEN ROAD | 圆明园路133号 | 建筑 |
| 512 | Sassoon House - Cathay Hotel | 1A006 沙逊大厦 | 20 NANKING ROAD | 中山东一路20号 | 建筑 |
| 524 | Palace Hotel | 1A005 汇中饭店 | 23 NANKING ROAD | 中山东一路19号 | 建筑 |
| 1119 | Paramount Hotel (Paramount Dancing Hall) | 2B010 百乐门舞厅 | 185 YUYUEN ROAD | 愚园路218号 | 建筑 |
| 876 | Grand Theater | 1A016 大光明大戏院 | 216 BUBBLING WELL ROAD | 南京西路216号 | 建筑 |
| 1687 | Astor House | 3F005 礼查饭店 | 17 WHANGPOO ROAD | 黄浦路15号 | 建筑 |
| 1204 | Yufosi Temple (Jade Buddha) | 2N002 玉佛寺 | 280 PENANG ROAD | 安远路170号 | 建筑群 |
| 1709 | Municipal Stadium | 1G002 上海市体育场 | 245 SONGHU | 国和路346号 | 建筑群 |
| 577 | Shanghai Municipal Council | 1A024 公共租界工部局 | 209 KIANGSE ROAD | 江西中路215、209号； 汉口路193、223、239号 | 建筑群 |
| 314 | Residential Complex | 1C001 步高里 | 170 ROUTE JOSEPH FRELUPT | 陕西南路287号 | 建筑群 |
| 547 | Hamilton House | 2A037 汉弥登大楼 | 170 KIANGSE ROAD | 江西中路170号 | 建筑 |
| 527 | Wai Foong House | 2A048 汇丰大楼 | 218 SZECHUEN ROAD | 四川中路210-220号（双号） | 建筑 |
| 559 | Asiatic Petroleum Company | 1A001 亚西亚大楼 | 1 BUND ROAD | 中山东一路1号 | 建筑 |
| 550 | Nisshin Kisen Kaisha | 3A003 日清大楼/日清汽船株式会社 | 5 BUND ROAD | 中山东一路5号 | 建筑 |
| 529 | North China Daily News | 2A007 字林西报大楼 | 17 BUND ROAD | 中山东一路17号 | 建筑 |
| 528 | Chartered Bank of India, Australia and China | 2A008 麦加利银行 | 18 BUND ROAD | 中山东一路18号 | 建筑 |
| 1730 | Ohel Moishe Synagogue | 4F025 摩西会堂 | 62 SEWARD ROAD | 长阳路62号 | 建筑 |
| 1785 | Bearn Apartments | 2C002 培文公寓 | 453/469 AVENUE JOFFRE | 淮海中路449号 | 建筑 |
| 1750 | International Savings Society Apartments / The Normandie | 2D012 东美特公寓 | 1920 AVENUE JOFFRE | 淮海中路1842-1858号 | 建筑 |
| 548 | Union Building | 2A002 有利银行 | 17 CANTON ROAD | 中山东一路3号，广东路17号 | 建筑 |
| 523 | Metropole Hotel | 2A038 都城饭店 | 180 KIANGSE ROAD | 江西中路180号 | 建筑 |
| 391 | Gascogne Apartments | 2D003 盖司康公寓 | 1202 AVENUE JOFFRE | 淮海中路1202号 | 建筑 |

## 首轮重点保留项（28对）

以下28对均未接入统一卡片；hold表示证据不足或范围不一致，不表示已证明两个记录必定无关。

| VS ID | 名录项 | 未合并理由 |
|---|---|---|
| 1680 | 2A020 | 广学大楼身份有支持，但VS503 Christian Literature Building（128 MUSEUM ROAD）与VS1680（?? HONGKONG ROAD）同时竞争2A020；尚未把两条VS的时期和完整地址统一归组。不能只取较近的1680；本轮不生成一对一共卡。 |
| 1489 | 2A058 | 大佛厂30号与名录大昌街30号相合，但VS起年1860是清心堂机构创立期；史料明确1919—1923从学校迁出另建现堂。未确定VS条目表达机构全史还是现存楼体，故不将其直接标成同一存续建筑；并非已证明两个点异址。 |
| 1488 | 5A032 | 民政局明确公益新天地园原址为新普育堂；VS机构点与名录历史园区有关，但原1911与后来保留楼群年代/范围未逐栋核定，不能用一座馆舍或入口代表历史机构全部建筑。 |
| 1168 | 4B013 | 戈登路捕房独特名称与今江宁路511同源支持名录对象，但compound内另有锡克教堂，VS557与现511尚未逐号核清；不要在单体卡片中把整个捕房范围无差别压成学校/教堂。 |
| 551 | 2A002 | 新查史料已说明旧外滩4号就是现外滩3号，不能再以4/3数字差直接否定身份。但VS551为银行机构条目、未给建设时期，而VS548以Union Building、广东17号、1916明确锁定现楼；两记录尚未按历史阶段归组，本轮仅通过548，不把551重复接入同一官方项。 |
| 515 | 1A008 | 既有研究已明确VS起始1851年的怡和用址与现1920年代楼为原址重建；保留同址沿革，不能升级为同一原构建筑。 |
| 538 | 3A002 | 既有研究仅确认同址，VS1940与现交通银行楼1948建成阶段不明；不能把same-site-continuing-use自动提升同栋。 |
| 598 | 5A075 | 旧研究将Algar/60 Hongkong接到今香港路60大丰大楼；维基5批却列Algar/香港路85，官网5A075又写美国陆海军青年会/海青85。这些标签与另5A007海青四川中路630冲突，需原门牌、碑牌或原志纠错，不能仅距40米接合。 |
| 544 | 5A038 | 既有研究明确德国邮局源1903和现1905楼不能视为相同原物，本次不得绕过same-site-repurposed限制。 |
| 1563 | 3M027 | 官网同项含弗兰克林住宅和中央银行俱乐部，位于医院内部；仅有俱乐部专名及338号总门牌，尚未厘清VS点是其中哪栋和library门址点所指。 |
| 39 | 2A054 | 中法学堂与现光明中学同一学校沿革不能证明原179蒙自路/今70淮海东路对象与现名录具体校园建筑范围相同；先核校舍分期和保留部分。 |
| 511 / 1724 / 1725 | 1A007 | 当前组含中国银行及荷兰银行等多个时期/机构，原20 BUND与名录中山东一路23也有差异；不能将组中所有来源一并接到中国银行现楼。 |
| 556 / 562 | 4A022 | 已有hold要求区分银行/报社所在前后楼及年代；整组556/562不能因为福州路89同门牌而合为现中兴银行名录楼。 |
| 566 / 1243 | 2A053 | 原组含纱布交易所及另一同址来源；名录华商纱布交易所只能证明主条候选，不足将整个多成员组同楼化。 |
| 1616 / 1617 | 3F008 | 组中西本愿寺和新申报社需逐成员、时期与楼宇核对；同一Wutsin地址/坐标不能证明都对应乍浦路455这一名录建筑。 |
| 1684 / 1685 / 1686 | 2F001 | 组内德/日/美领馆等记录及现名录红楼/灰楼混杂，旧60 Whangpoo与今106尚需分楼分期对应；不以整组代表日本领事馆全部现楼。 |
| 1441 | 4M023 | 圣玛利亚女中为校园对象，VS1851源年早于长宁路校舍期；需核迁校、保留钟楼/校舍及新建部分，不能以学校延续等同所有现名录建筑。 |
| 1565 | 4M034 | 复旦公学是学校历史地点；官网只列李鸿章祠堂及门楼/力学庐等限定构件。同址1626号不证明公学整体与特定构件一对一。 |
| 525 | 4A018 | 既有hold要求补1901原机构和后建大清银行楼地块链。General Bank of China不能只凭后继中国银行/大清银行的机构名就认定同楼。 |
| 1633 | 5F019 | 持久hold明确武进路225弄3—11号宿舍/教堂与乍浦路480、490主教堂是两条名录。VS225-9 WUTSIN不能接5F019主堂，近46米不能解除构件边界。 |
| 526 | 1A003 | VS起年1874早于现汇丰楼，汇丰官方说明1923年启用全新外滩大楼；旧12 BUND虽与现址相合，仍不能用既有same-building标签跳过重建时期核定。保留同址银行沿革，暂不认定VS1874条目为现存1923楼体。 |
| 503 | 2A020 | 既有资料支持广学大楼，但VS503与1680竞争同一名录项；须先核历史时期和完整旧址、统一VS归组，本轮不任意择一。 |
| 1680 | 2A025 | 2A020广学大楼（虎丘128）与2A025真光大楼（圆明园209）分别列册；“真光广学”合称不足以并掉相邻保护楼。 |
| 523 | 5A021 | 原Metropole主楼江西180对应2A038；东楼福州106单列5A021，不能因共同饭店名混并。 |
| 391 | 3D003 | VS1202霞飞路指向2D003主楼；3D003为淮海1204—1218辅楼，不能用同名公寓抹平不同保护项。 |
| 5 | 4A025 | VS5 China Navigation Company与1235 Butterfield/Swire竞争太古洋行同项，尚需完整门牌和时期归组，不生成一对一共卡。 |
| 873 | 1A013 | Park Hotel/国际饭店的建筑身份有支持，但本次名录数据没有可用坐标，不符合采用名录参考点的共卡配置要求；保留地标显示并单列名录坐标缺项。 |
| 1092 | 4B001 | 哈同花园／爱俪园与中苏友好大厦位于同址但后者1954年重建。已有site-redeveloped证据，不是同一历史保护建筑。 |

## 文件与复现

- [candidates.json](candidates.json)：498对候选、完整来源字段和全量覆盖索引，记录7项输入SHA256。
- [candidate-audit.md](candidate-audit.md)：二审前初筛存档；早期“待二审”措辞以最终决策为准。
- [second-review.json](second-review.json)：74对逐项独立复核、来源链接、接受/保留决定及范围说明。
- [continuation-notes/review.json](continuation-notes/review.json)：112对沿革补查决定、各分片哈希、来源链接及范围说明。
- [applied-links.json](applied-links.json)：累计101条已采用关联的原坐标／显示坐标、完整旧门牌和85条保留记录。
- [supplemental-review-suggestions.json](supplemental-review-suggestions.json)：初筛之后补充重点与边界反例。
- [src/data/heritageLandmarkLinks.ts](../../../src/data/heritageLandmarkLinks.ts)：101条显示配置，运行时还核对完整来源ID与唯一名录项。

配置重建／只读核验：

```sh
node research/rechecks/2026-09-19-heritage-landmark-links/continuation-notes/assemble-review.mjs
node research/rechecks/2026-09-19-heritage-landmark-links/continuation-notes/assemble-review.mjs --check
node research/rechecks/2026-09-19-heritage-landmark-links/build-reviewed-links.mjs
node research/rechecks/2026-09-19-heritage-landmark-links/build-reviewed-links.mjs --check
npm test
npm run build
```

重建配置会核对候选文件与各轮输入哈希、7项原始输入哈希、来源成员、唯一保护项及坐标／范围要求。补查汇总还核对112对输入与498对冻结候选逐字段一致、分片覆盖及跨轮决定不重复；生成器同时写出配置与应用清单。更新候选时先运行generate-candidates.mjs，之后需重新审阅并记录新哈希，不能直接沿用旧审阅结论。没有运行data:build。

首轮验证：166项测试（79前端＋87脚本）、生产构建、46条真实数据关联及1803来源ID守恒通过。浏览器实测南京饭店双层单卡、视野保持及都城主楼范围；该轮已随83e69aa推送。最新补查的验证结果见[补查报告](continuation-notes/README.md)。
