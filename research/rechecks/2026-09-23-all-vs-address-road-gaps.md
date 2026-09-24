# Virtual Shanghai 全部地点地址：数据库未收录路名核查

更新：2026-09-23。**不按地标研究状态筛选**，也不按地区、用途、是否合并、是否在地图显示筛选。此前只读“未查明地标”导出快照的范围有误；本报告替代旧清单作为当前工作入口。

## 范围与结果

输入是 `scripts/data/virtual-shanghai-buildings-live.json` 中全部 **1,803 条地点记录**，其中 1,784 条有非空地址、19 条无地址。快照抓取时间为 2026-08-28T11:04:54.427Z；本轮核对 [VS 在线索引](https://www.virtualshanghai.net/data/buildings?pn=29)仍显示 1,803 条，但没有重新抓取全部详情页，不能据总数相同保证每个字段未变。

与地图实际使用的 `public/data/historical-features.geojson` 中 **3,832 条道路要素**比较，检查历史外文名、历史中文名、今名、英文今名、aliases，并处理繁简体、标点、大小写、复合别名及明确的异写。道路组和线段数不是道路名称数量。

拆出 466 种去除门牌后的地址表达式，分类如下；**表达式数不是独立道路数**。

| 分类 | 表达式数 | 处理 |
| --- | ---: | --- |
| 数据库已有名称或可识别别名 | 361 | 排除出缺口；不代表旧门牌或全线几何已核准 |
| 库内无命中名称的道路候选 | 56 | 归为 49 条今路名候选：前轮 37 条＋本轮续查 12 条 |
| 已有相关旧名但另有路段缺口 | 1 | 大连西路 |
| 仍需释读／排除异名的写法 | 36 | 完整列在下方，不直接算作缺路 |
| 桥、河道或区域描述 | 9 | 不计入道路缺口 |
| 有地址字段但无可识别路名 | 3 | 保留原记录；与 19 条无地址记录分开 |

以下“无命中”仅指**用列出的今名、VS 写法及已识别别名没有检出道路记录**。它不是“已证明整条路的几何都不存在”，也不代表查完了该路全部历史别名。现代政府地址资料通常只用于印证今路名，并不证明旧建筑的边界或门牌连续性。

全部结果、每条待查表达式对应的 VS 原始地址、来源编号、已有道路匹配依据和输入 SHA-256 见 [全量核查 JSON](2026-09-23-all-vs-address-road-audit.json)。[只读核查脚本](audit-all-vs-address-roads.mjs)可复跑：

```sh
node research/rechecks/audit-all-vs-address-roads.mjs
```

## 2026-09-23 续查：从建筑名称反查路名

按用户建议深入检索 LONG／LOONG／LU／ROAD／RAOD／JIE 与相关建筑：原 56 种待释读中，8 种对应已入库道路、12 种进入新的缺失名称候选，剩余 36 种待查。[续查完整清单与来源](2026-09-23-vs-road-toponym-followup.md)及[结构化决策](2026-09-23-vs-road-toponym-followup.json)。

- **宝成弄 → 叶家宅路**：本库已有 `Po Zen Lon／宝成弄／叶家宅路`，排除缺口。
- 已识别的库内别名另有梵皇渡路／万航渡路、林森西路／淮海西路、方浜中路、学前街、中正西路／延安西路；TIFENG／地丰路按中等置信度对应乌鲁木齐北路。
- 新增 12 条名称候选：顾家弄、方斜路、会馆街、普育东路、普育西路、瞿溪路、海伦西路、董家渡路、豫园路、多稼路、大昌街、东江阴街。
- 慈修庵的榛岭街今址只作为建筑线索，不认定 FUCHUN JIE＝榛岭街；CHUMEN 不再猜作车门路，局门路方向仍待核。

## 全量排查首次新增的 16 条路名候选

下表的当前名称与已识别 VS 名称，在道路图层中均为 0 命中。旧名尚未充分考证的仍明确保留为候选。

| VS 原地址里的路名写法 | 今路名／释读 | 全部 VS 编号 | 说明与依据 |
| --- | --- | --- | --- |
| `DONGTIYUHUI_1987` | 东体育会路 | [#1264](https://www.virtualshanghai.net/data/buildings?ID=1264) | 保留 _1987，暂不解释成命名年份；不是西体育会路。 [今名依据](https://www.shhk.gov.cn/xwzx/002005/20250120/6e385995-e28d-4854-82ad-42bae02aa6f0.html) |
| `ZHENGMIN LU` | 政民路 | [#1710](https://www.virtualshanghai.net/data/buildings?ID=1710) | VS #1710 医院地址；今名有官方道路资料。 [今名依据](https://www.shyprd.sh.cn/yprd/html/yprd/yprd_qrdcwh/2019-01-21/Detail_4701.htm) |
| `GUODING` | 国定路 | [#1711](https://www.virtualshanghai.net/data/buildings?ID=1711) | VS #1711 叶家花园用此地址；不把旧号 597 直接转成现门牌。 [今名依据](https://www.shyp.gov.cn/shypq/yqyw-wb-hbjzl-wryhjjgxx-spjdgg/20260112/cde17f472e934139824324226668f721/967f41daec0a4e4a9bd8af3f4f28d0d5.pdf) |
| `SONGHU` | 淞沪路 | [#1709](https://www.virtualshanghai.net/data/buildings?ID=1709) | VS 245 SONGHU；杨浦区政府也给江湾体育场淞沪路245号。 [今名依据](https://www.shyp.gov.cn/shypq/yqyw-wb-tyjzl-tygl/20230918/436898.html) |
| `CHEZHAN XILU` | 车站西路 | [#1714](https://www.virtualshanghai.net/data/buildings?ID=1714) | VS #1714 劳动大学；不是南车站路。 [今名依据](https://www.shhk.gov.cn/xwzx/002008/002008040/20240915/419a1236-9df9-4d1c-ab91-7cf5321fae5d.html) |
| `SIDAS` | 四达路 | [#1268](https://www.virtualshanghai.net/data/buildings?ID=1268) | SIDAS → 四达路为拼写与位置候选；当前路名存在，但旧校门牌仍待核。 [今名依据](https://www.shhk.gov.cn/xwzx/002008/002008040/20240915/419a1236-9df9-4d1c-ab91-7cf5321fae5d.html) |
| `HUAYUAN` | 花园路 | [#1271](https://www.virtualshanghai.net/data/buildings?ID=1271)、[#1272](https://www.virtualshanghai.net/data/buildings?ID=1272) | 不是库里的花园弄／南京东路。 [今名依据](https://www.shhk.gov.cn/xwzx/002008/002008040/20221220/379feaaa-f119-49e6-b637-863aa81ef288.html) |
| `NANDAN LU` | 南丹路 | [#1551](https://www.virtualshanghai.net/data/buildings?ID=1551) | 同名拼音；徐汇官方地址有南丹路。 [今名依据](https://www.xuhui.gov.cn/xxgk/portal/article/detail?id=8a4c0c06829b645701829b6b05915573) |
| `PUXI LU` | 蒲西路 | [#1546](https://www.virtualshanghai.net/data/buildings?ID=1546) | 同名拼音；不与泛指浦西混同。 [今名依据](https://ghzyj.sh.gov.cn/nw2446/20231031/c0926e6275ea4524ae8ca83638d328fb.html) |
| `BANSONGYUAN LU` | 半淞园路 | [#1484](https://www.virtualshanghai.net/data/buildings?ID=1484)、[#1485](https://www.virtualshanghai.net/data/buildings?ID=1485) | VS #1484、#1485；不是单把半淞园公园名当道路。 [今名依据](https://zjw.sh.gov.cn/gzdt/20250627/d2682374afc241db8525cd11ff42d7fc.html) |
| `LESHAN` | 乐山路 | [#1556](https://www.virtualshanghai.net/data/buildings?ID=1556) | 与 HUNGJAO 交叉地址分拆；虹桥路已有记录。 [今名依据](https://www.xuhui.gov.cn/xxgk/portal/article/detail?id=8a4c0c06829b645701829b6b05915573) |
| `WANPING NANLU` | 宛平南路 | [#1522](https://www.virtualshanghai.net/data/buildings?ID=1522) | #1522 明写 NANLU；#1537 的 NANLI 仍单独待核。 [今名依据](https://jtw.sh.gov.cn/bmts/20201126/fbe8bf9e5fa54ab0a1919526c6481691.html) |
| `ZHONGXING` | 中兴路 | [#1349](https://www.virtualshanghai.net/data/buildings?ID=1349)、[#1350](https://www.virtualshanghai.net/data/buildings?ID=1350)、[#1358](https://www.virtualshanghai.net/data/buildings?ID=1358) | 同名拼音；旧中山路的同名异路关系还需核定。 [今名依据](https://www.jingan.gov.cn/rmtzx/003003/20180809/b77341e2-cd4d-4453-9fc5-1ce437c457c6.html) |
| `LUCHIAPANG ROAD` / `陸家浜路` | 陆家浜路 | [#1451](https://www.virtualshanghai.net/data/buildings?ID=1451)、[#1458](https://www.virtualshanghai.net/data/buildings?ID=1458)、[#1487](https://www.virtualshanghai.net/data/buildings?ID=1487)、[#4156](https://www.virtualshanghai.net/data/buildings?ID=4156) | 全量中 #4156 直接写陸家浜路，与旧罗马字记录合列。 [今名依据](https://zjw.sh.gov.cn/gzdt/20250627/d2682374afc241db8525cd11ff42d7fc.html) |
| `HUMIN` | 沪闵路 | [#1542](https://www.virtualshanghai.net/data/buildings?ID=1542) | 同名拼音释读，不推定原 312 号的现代门牌。 [今名依据](https://www.shanghai.gov.cn/gwk/search/content/115890) |
| `KELE LU` | 可乐路 | [#1532](https://www.virtualshanghai.net/data/buildings?ID=1532) | 同名拼音；今道路名有长宁区政府资料。 [今名依据](https://www.shcn.gov.cn/col6991/20220902/1221393.html) |

## 单独处理：#1262、#1263 的大连西路

| VS 编号 | 地点 | 原地址（不改写） | 路名释读 |
| --- | --- | --- | --- |
| [#1262](https://www.virtualshanghai.net/data/buildings?ID=1262) | 第二日本高等女學校 | `? DALIAN (XI)_1987` | 大连西路 |
| [#1263](https://www.virtualshanghai.net/data/buildings?ID=1263) | 持志大學 | `560 DALIAN (XI)_1987` | 大连西路 |

[VS 第22页](https://www.virtualshanghai.net/data/buildings?pn=22)可直接核对上述原文。旧名可对照为**大连湾路西段 → 大连西路**；[路名对照表](https://www.cclchinese.com/portal.php?aid=7850&mod=view)区分了大连湾路的南段与西段，[大连西路沿革](https://zh.wikipedia.org/wiki/大连西路)亦说明道路曾有延伸与改名。因此不能将今天全线直接当作历史同一时期的全线。

库中已有 `Dalny Road／大连湾路／大连路` 的 18 条线要素，但其经纬度范围约为东经 121.5031—121.5133、北纬 31.2539—31.2658，未到 #1262、#1263 的 VS 点位（分别约 121.478732, 31.277692 和 121.477452, 31.277932）。目前没有“大连西路／Dalian Xilu”名称记录。故本项列为**相关道路已存在、西段名称和覆盖不足**，不把“大连路从未入库”作为结论。

`_1987` 是原地址字符串的一部分，其确切来源语义尚未证实：不把它读成门牌，也不直接认定为修路、更名或资料年份；`?` 仍表示门牌缺失。[上外官方联系方式](https://info.shisu.edu.cn/13/f6/c15a5110/page.htm)给虹口校区今址“大连西路550号”，这是辅助道路核对，**不是把 #1263 的 560 号静默改成 550 号**。

## 前一轮 21 条候选：已补齐全量记录

原 21 条的来源编号已从全量数据重新提取，不再局限于旧的 1,432 条导出快照。旧名考证说明和来源见 [前轮路名释读](2026-09-22-vs-road-layer-gaps.md)；下列编号以本轮全量结果为准。

| VS 原地址里的路名写法 | 今路名／释读 | 全部 VS 编号 | 说明与依据 |
| --- | --- | --- | --- |
| `FOONGLING ROAD` | 枫林路（旧名丰林路） | [#1519](https://www.virtualshanghai.net/data/buildings?ID=1519) | 旧中文名丰林路；旧外文名对照。  |
| `I-HSUENYUEN ROAD` / `I-HSUENYUEN LU` | 医学院路（旧名沈家浜路） | [#1519](https://www.virtualshanghai.net/data/buildings?ID=1519)、[#1520](https://www.virtualshanghai.net/data/buildings?ID=1520) | 补入全量中的 #1520；VS 同时有 ROAD 和 LU 写法。  |
| `CAOXI BEILU` / `CAOXI BEILU (XUJIAHUI)` | 漕溪北路 | [#497](https://www.virtualshanghai.net/data/buildings?ID=497)、[#498](https://www.virtualshanghai.net/data/buildings?ID=498)、[#499](https://www.virtualshanghai.net/data/buildings?ID=499)、[#1544](https://www.virtualshanghai.net/data/buildings?ID=1544)、[#1546](https://www.virtualshanghai.net/data/buildings?ID=1546)、[#1547](https://www.virtualshanghai.net/data/buildings?ID=1547)、[#1549](https://www.virtualshanghai.net/data/buildings?ID=1549)、[#1550](https://www.virtualshanghai.net/data/buildings?ID=1550)、[#1552](https://www.virtualshanghai.net/data/buildings?ID=1552)、[#1553](https://www.virtualshanghai.net/data/buildings?ID=1553)、[#1554](https://www.virtualshanghai.net/data/buildings?ID=1554) | 共 11 条 VS 记录；不把今路全线倒推到每条建筑的建造年代。  |
| `OUYANG` / `OUYANG LU` | 欧阳路 | [#1266](https://www.virtualshanghai.net/data/buildings?ID=1266)、[#1267](https://www.virtualshanghai.net/data/buildings?ID=1267)、[#1269](https://www.virtualshanghai.net/data/buildings?ID=1269)、[#1720](https://www.virtualshanghai.net/data/buildings?ID=1720)、[#1721](https://www.virtualshanghai.net/data/buildings?ID=1721) | 补入 #1269 的 OUYANG LU；共 5 条。  |
| `FAHUAZHEN LU` / `FAHUAZHEN` | 法华镇路 | [#1564](https://www.virtualshanghai.net/data/buildings?ID=1564)、[#1570](https://www.virtualshanghai.net/data/buildings?ID=1570)、[#1571](https://www.virtualshanghai.net/data/buildings?ID=1571)、[#1573](https://www.virtualshanghai.net/data/buildings?ID=1573)、[#1574](https://www.virtualshanghai.net/data/buildings?ID=1574) | 本项不自动包括尚待释读的 FAHUA。  |
| `GUANGFU XILU` / `GUANFU XILU` | 光复西路 | [#1401](https://www.virtualshanghai.net/data/buildings?ID=1401)、[#1421](https://www.virtualshanghai.net/data/buildings?ID=1421)、[#1422](https://www.virtualshanghai.net/data/buildings?ID=1422)、[#1722](https://www.virtualshanghai.net/data/buildings?ID=1722) | GUANFU 为疑似漏字异写，保留原文；该异写仍需复核。  |
| `LIYUAN` | 丽园路 | [#1452](https://www.virtualshanghai.net/data/buildings?ID=1452)、[#1453](https://www.virtualshanghai.net/data/buildings?ID=1453)、[#1454](https://www.virtualshanghai.net/data/buildings?ID=1454)、[#1456](https://www.virtualshanghai.net/data/buildings?ID=1456) | 道路级候选，具体旧门牌未核。  |
| `WAIMA` | 外马路 | [#1500](https://www.virtualshanghai.net/data/buildings?ID=1500)、[#1501](https://www.virtualshanghai.net/data/buildings?ID=1501)、[#1502](https://www.virtualshanghai.net/data/buildings?ID=1502)、[#1503](https://www.virtualshanghai.net/data/buildings?ID=1503) | 含复兴东路交叉口地址；今道路名也见住建委资料。  |
| `LONGHUA LU` | 龙华路 | [#1533](https://www.virtualshanghai.net/data/buildings?ID=1533)、[#1534](https://www.virtualshanghai.net/data/buildings?ID=1534)、[#1535](https://www.virtualshanghai.net/data/buildings?ID=1535)、[#1536](https://www.virtualshanghai.net/data/buildings?ID=1536) | 不自动把 LUNGHWA ROAD 纳入同一路段。  |
| `XIBAOXING LU` | 西宝兴路 | [#1274](https://www.virtualshanghai.net/data/buildings?ID=1274) | 原文无门牌。  |
| `YANGJIADU LU` | 杨家渡路 | [#1698](https://www.virtualshanghai.net/data/buildings?ID=1698) | 原文无门牌。  |
| `SIPING` | 四平路 | [#1705](https://www.virtualshanghai.net/data/buildings?ID=1705)、[#1706](https://www.virtualshanghai.net/data/buildings?ID=1706)、[#1708](https://www.virtualshanghai.net/data/buildings?ID=1708) | 补入 #1705 同济大学、#1706；共 3 条。  |
| `CHANGCHUN LU` | 长春路 | [#1580](https://www.virtualshanghai.net/data/buildings?ID=1580) | 原地址 372 CHANGCHUN LU。  |
| `ZHENGBEN` | 政本路 | [#1707](https://www.virtualshanghai.net/data/buildings?ID=1707) | 原文无门牌；记录年代与路名使用年代待分开核定。  |
| `LONGHUA XILU` | 龙华西路 | [#1538](https://www.virtualshanghai.net/data/buildings?ID=1538) | 与龙华路分列。  |
| `TONGXIN` | 同心路 | [#1272](https://www.virtualshanghai.net/data/buildings?ID=1272)、[#1277](https://www.virtualshanghai.net/data/buildings?ID=1277) | 可能使用后期道路今名，不倒推为建筑初建时的名称。  |
| `PUSHAN` | 普善路 | [#1398](https://www.virtualshanghai.net/data/buildings?ID=1398) | 原地址 186 PUSHAN。  |
| `CAOBAO` | 漕宝路 | [#1543](https://www.virtualshanghai.net/data/buildings?ID=1543) | 原地址 40 CAOBAO。  |
| `CHEZHAN LU` / `CHECHAN ROAD` | 南车站路（旧名车站路） | [#1459](https://www.virtualshanghai.net/data/buildings?ID=1459)、[#1461](https://www.virtualshanghai.net/data/buildings?ID=1461)、[#1462](https://www.virtualshanghai.net/data/buildings?ID=1462) | 补入 #1462；这一解释限于这组南市记录。  |
| `TAMUCHIAO ROAD` | 大木桥路 | [#1516](https://www.virtualshanghai.net/data/buildings?ID=1516) | 旧拼写与位置推断，仍为道路级候选。  |
| `SHIHCHENFU ROAD` | 平江路（旧名市政府路） | [#1518](https://www.virtualshanghai.net/data/buildings?ID=1518) | 旧名市政府路。  |

例如此前遗漏的 #1520 `I-HSUENYUEN LU`、#1269 `OUYANG LU`、#1705／#1706 `SIPING` 均已纳入。同一路名可以来自多个地标，不能因地标已研究完成就从道路排查中消失。

## 已有记录：不重复列成“新道路”

| VS 写法 | 数据库命中依据 | 结论 |
| --- | --- | --- |
| SEYMOUR ROAD | Seymour Road／西摩路／陕西北路 | 已有 |
| NEWCHWANG ROAD | Newchwang Road／牛莊路 | 已有；需统一繁简 |
| WUTING ROAD | Wuting Road／武定路 | 已有；今名字段“武定西路”仍需单独核查，不能当缺路 |
| XIEHE LU（#1712、#1715） | 协和路／今邯郸路 | 已有；不能错配今长宁区协和路 |
| NORTH YANGTSE ROAD（#1290） | North Yangtsze Road／北扬子路／扬子江路 | **纠正前轮遗漏：已有，只差一个 s** |
| EDWARD VII ROAD | Avenue Édouard VII / Edward VII Road | 已有；需拆解库内复合别名 |
| WONGKASHAW GARDENS | 黄家沙花园 | 已有名称记录，并非自动新建一条路 |
| TIANTONG'AN、DONGBAOXING、XIJIANGWAN | 天通庵路、东宝兴路、西江湾路 | 均已有，不因省略 LU／ROAD 重复列入 |

这里只判断名称是否已收录；没有把所有命中的历史门牌与现代门址视为已经验证。

## 尚待释读的 36 种写法（不是已确认缺路）

这些已从全部地点中提取，保留在下一轮队列。它们可能是未收录道路，也可能是已有路段的旧名、错误拼写、弄名或地点名。先确定实体和路段，再判断是否缺库。

| 原写法 | VS 编号 |
| --- | --- |
| `BEIHUTANG LU` | #1702 |
| `CAOXIEWAN` | #1492 |
| `CHANGSHENG` | #1249 |
| `CHUMEN ROAD` | #1469 |
| `CHUNSAN ROAD` | #1486 |
| `EDWARD ROAD` | #713 |
| `FAHUA` | #1567、#1572 |
| `FUCHUN JIE` | #1257 |
| `FUYUANTANG` | #1505 |
| `HOUJIA` | #1242 |
| `HSIAZI` | #1449 |
| `HUIWEN` | #1351 |
| `JINGTING` | #1504 |
| `JINJIA FANG` | #1694 |
| `LAODAIDU LU` | #1699、#1700 |
| `LIUYUSI JIE` | #1490 |
| `LUNGHWA ROAD` | #495 |
| `NANQU JIE` | #1495、#1496 |
| `NONGGONG` | #1524 |
| `PANJIAWAN` | #1375 |
| `SAN? (8065)` | #1555 |
| `SINGMA` | #1344 |
| `TANWEI` | #1566 |
| `TANZIWAN` | #1376 |
| `TIANZHUTANG` | #1460 |
| `TONGGEBAKA` | #565 |
| `WANGDA LU` | #1467、#1483 |
| `WANPING NANLI` | #1537 |
| `XI?ANBANG` | #1443、#1444 |
| `XINGUANG` | #1602 |
| `YESHIYUAN` | #1508 |
| `YINGGONGCI` | #1480 |
| `YUCAI` | #1308 |
| `YUQINGLI LONG` | #775 |
| `YUQINGLI LOONG` | #774 |
| `ZHONGSHAN LU` | #1402、#1403 |

优先核查：

- `WANPING NANLI`：虽然全量中已有明确 `WANPING NANLU` 可列宛平南路，但 #1537 的异写仍不静默订正。
- `YUQINGLI LONG/LOONG`：查到多处同名里弄，尚不能对应两所学校；优先查旧校址名录。
- `CHUMEN ROAD`、`LIUYUSI JIE`：分别沿局门路和留云寺路／柳市路线索追查，但不当作已确认缺口。
- `FUCHUN JIE`：已知慈修庵今门址榛岭街15号，仍需证明旧街名。
- `CHUNSAN ROAD`、`ZHONGSHAN LU`：同名／分段风险高，须结合各 VS 地点判断，不能见“中山”就合并。

本轮只产出路名清单与审计记录；**没有修改地图道路、地标坐标、地标研究状态或合并关系**。
