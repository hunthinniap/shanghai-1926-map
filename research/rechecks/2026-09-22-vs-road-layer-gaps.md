# Virtual Shanghai 地址中，地图道路图层未收录的路名候选

> **范围更正（2026-09-23）：本页保留为前轮释读记录，不再是当前缺口清单。** 用户要求的是 Virtual Shanghai 全部地点地址，不是“未查明地标”子集。已改用全部 1,803 条记录重扫；当前入口为 [全量地址路名清单](2026-09-23-all-vs-address-road-gaps.md)，完整证据见 [全量核查 JSON](2026-09-23-all-vs-address-road-audit.json)。下文 21 条及旧审计 JSON 的来源数量仅反映前轮范围。

更新日期：2026-09-23。筛选基准为地图实际加载的 `public/data/historical-features.geojson` 中 `kind === "road"` 的记录。核查同时比较历史外文名、历史中文名、今名、英文今名及 aliases，使用 OpenCC 统一繁简体，并统一外文大小写、空格与标点。当前图层有 3,832 条道路线要素、589 个原始今名（统一繁简体后为 588 个）。

下表“图层数量”为这些名称及已识别别名命中的要素数量，均为 0。这里确认的是**库内未找到对应名称记录**；历史路线的边界、门牌及今路沿革仍须单独核定。逐项检查结果、命中依据、全部 VS 编号与道路数据 SHA-256 已保存于 [核查 JSON](2026-09-23-vs-road-layer-gap-audit.json)。

输入为 `public/data/unresolved-landmarks/001.json`—`029.json` 的 1,432 条导出快照；部分地标后来已完成研究或合并，不能把快照数量理解成当前未完成地标数。本轮已核对 21 个路名候选，尚不宣称穷尽全部 VS 街巷。

上次的 [27 条一般路名释读](2026-09-22-virtual-shanghai-road-crosswalk.md) 中，25 条今名实际上已经在图层里。`Seymour Road → 陕西北路`、`Route Ratard → 巨鹿路` 等应从“待补道路”中剔除。这是上次筛选口径的错误，原文已添加更正。

## 有明确今路名、但地图道路图层没有的记录

| Virtual Shanghai `F_ADDRESS` 路名 | 今路名候选 | VS 样例 | 图层数量 | 说明／依据 |
| --- | --- | --- | ---: | --- |
| FOONGLING ROAD | 枫林路（旧中文名丰林路） | [#1519](https://www.virtualshanghai.net/数据/建筑?ID=1519) | 0 | [新旧路名对照](https://www.cclchinese.com/portal.php?aid=7850&mod=view)明确列出丰林路／Foongling Road／枫林路。 |
| I-HSUENYUEN ROAD | 医学院路（原沈家浜路） | [#1519](https://www.virtualshanghai.net/数据/建筑?ID=1519) | 0 | [复旦上医校史](https://news.fudan.edu.cn/2022/0527/c970a131460/page.htm)记载 1937 年正式更名；VS 的建筑开工年为 1936，地址名可能为后置。 |
| CAOXI BEILU | 漕溪北路 | [#499](https://www.virtualshanghai.net/数据/建筑?ID=499)、[#1552](https://www.virtualshanghai.net/数据/建筑?ID=1552) | 0 | 同名拼音；VS 多处徐家汇记录沿用该地址。**今漕溪北路为后期填浜拓建道路，不能假定其全线在每条 VS 建筑的建造年代已存在。** |
| OUYANG | 欧阳路 | [#1266](https://www.virtualshanghai.net/数据/建筑?ID=1266) | 0 | VS 有 4 条 `289 OUYANG`；现代仍有[欧阳路 289 号](https://www.hkexnews.hk/listedco/listconews/sehk/20090910/LTN20090910029.pdf)。VS 省略 `ROAD/LU`，但号码与地点支持道路释读。 |
| FAHUAZHEN LU / FAHUAZHEN | 法华镇路 | [#1570](https://www.virtualshanghai.net/数据/建筑?ID=1570) | 0 | 同名拼音；[长宁区政府](https://www.shcn.gov.cn/col7343/20241008/1269208.html)仍使用法华镇路。无 `LU` 的写法先保留原文。 |
| GUANGFU XILU | 光复西路 | [#1422](https://www.virtualshanghai.net/数据/建筑?ID=1422) | 0 | 同名拼音；[普陀区道路命名文件](https://www.shpt.gov.cn/zhengwu/jtgl-jgwzdgz/2024/219/190764.html)证实现有道路（其西延段为较晚新建，不能把今天全路等同历史路段）。 |
| LIYUAN | 丽园路 | [#1454](https://www.virtualshanghai.net/数据/建筑?ID=1454) | 0 | 同名拼音；VS 三条地址在黄浦南部；暂作**道路级候选**，具体旧号与今号未换算。 |
| WAIMA | 外马路 | [#1500](https://www.virtualshanghai.net/数据/建筑?ID=1500) | 0 | 同名拼音；VS 三条地址有 `468 WAIMA`、`436 WAIMA` 等，均非现有道路图层记录。 |
| LONGHUA LU | 龙华路 | [#1534](https://www.virtualshanghai.net/数据/建筑?ID=1534) | 0 | 同名拼音、VS 有 `2853 LONGHUA LU`；不能与其他 `LUNGHWA` 地名或龙华西路混并。 |
| XIBAOXING LU | 西宝兴路 | [#1274](https://www.virtualshanghai.net/数据/建筑?ID=1274) | 0 | 同名拼音；VS 地址无门牌，需复核道路上的具体地块。 |
| YANGJIADU LU | 杨家渡路 | [#1698](https://www.virtualshanghai.net/数据/建筑?ID=1698) | 0 | 同名拼音；VS 地址无门牌，需复核道路上的具体地块。 |
| SIPING | 四平路 | [#1708](https://www.virtualshanghai.net/数据/建筑?ID=1708) | 0 | 同名拼音；VS 有 `2559 SIPING`，先作为道路级对照。 |
| CHANGCHUN LU | 长春路 | [#1580](https://www.virtualshanghai.net/数据/建筑?ID=1580) | 0 | 同名拼音；VS 有 `372 CHANGCHUN LU`，位于虹口长春路一带。 |
| ZHENGBEN | 政本路 | [#1707](https://www.virtualshanghai.net/数据/建筑?ID=1707) | 0 | 同名拼音；VS 未给门牌，[现今政本路](https://bkso.baidu.com/item/政本路/23344070)存在。历史路名沿革与该条 VS 地址的记录年代还需复核。 |
| SHIHCHENFU ROAD | 平江路（旧名市政府路） | [#1518](https://www.virtualshanghai.net/数据/建筑?ID=1518) | 0 | VS 上海市政府记录为 `170 SHIHCHENFU ROAD`；[上海特别市成立史料](https://www.thepaper.cn/newsDetail_forward_5792066)明确说明市政府路后来更名平江路。 |
| CHEZHAN LU / CHECHAN ROAD | 南车站路（旧名车站路） | [#1461](https://www.virtualshanghai.net/数据/建筑?ID=1461)、[#1459](https://www.virtualshanghai.net/数据/建筑?ID=1459) | 0 | VS 大同大学、上海地方法院地址；[南车站路沿革](https://zh.wikipedia.org/wiki/南车站路)记载旧名车站路及大同大学校址。此对应限于这两条南市记录，不泛化到其他车站路。 |
| TAMUCHIAO ROAD | 大木桥路 | [#1516](https://www.virtualshanghai.net/数据/建筑?ID=1516) | 0 | **道路级候选**：按旧拼写与 VS 坐标推定；原文为 `20 TAMUCHIAO ROAD`，尚待原图或中外文对照资料独立确认。 |
| LONGHUA XILU | 龙华西路 | [#1538](https://www.virtualshanghai.net/数据/建筑?ID=1538) | 0 | 同名拼音；VS 在龙华一带，今名可见[道路资料](https://zhongguojiedao.openalfa.com/街道/龙华西路-徐汇区)。 |
| TONGXIN | 同心路 | [#1272](https://www.virtualshanghai.net/数据/建筑?ID=1272)、[#1277](https://www.virtualshanghai.net/数据/建筑?ID=1277) | 0 | 同名拼音；[同心路沿革](https://bkso.baidu.com/item/同心路/61678215)记载 1954 年改今名，此处 VS 使用了较晚路名。历史上的同济路、横浜路分段仍需另核。 |
| PUSHAN | 普善路 | [#1398](https://www.virtualshanghai.net/数据/建筑?ID=1398) | 0 | VS `186 PUSHAN`；同名拼音，今普善路的中英文对应见[街区设计项目](https://www.archiposition.com/items/20190522032610)。 |
| CAOBAO | 漕宝路 | [#1543](https://www.virtualshanghai.net/数据/建筑?ID=1543) | 0 | VS `40 CAOBAO`；同名拼音，今漕宝路亦见[上海市政府资料](https://german.shanghai.gov.cn/ge-Accounting/20260528/49952068109140af940dcf17353eb51e.html)。 |

其中丰林路→枫林路、市政府路→平江路、车站路→南车站路涉及中文路名沿革。另一些只是 VS 的罗马字写法，且可能已经采用建筑建造年代之后的路名。丽园路、大木桥路目前保留为道路级候选；本表不证明任何历史建筑的准确门址。核查 JSON 另收录 #1401 的 `GUANFU XILU` 为光复西路疑似异写，保留原文，尚未自动改写。

## 已有记录，排除出缺口

| VS 写法 | 库内记录 | 道路线数量 | 核查结果 |
| --- | --- | ---: | --- |
| SEYMOUR ROAD | Seymour Road／西摩路／陕西北路 | 25 | 已有，最初误列。 |
| NEWCHWANG ROAD | Newchwang Road／牛莊路 | 10 | 已有；繁体“莊”造成只查简体今名时的漏检。 |
| WUTING ROAD | Wuting Road／武定路，今名字段为“武定西路” | 16 | 历史道路已入库；今名字段与[民国路名表](https://upload.wikimedia.org/wikipedia/commons/4/43/NLC511-027032013015433-16400_%E5%BE%B5%E4%BF%A1%E5%B7%A5%E5%95%86%E8%A1%8C%E5%90%8D%E9%8C%84.pdf)提示的武定路存在需复核之处，不能当成缺路重复添加。 |
| XIEHE LU | 协和路／今邯郸路 | 30 | 已有。VS #1712、#1715 位于杨浦复旦一带，不能匹配到今天长宁的协和路。 |

## 暂缓写入今名的异常项

- [#1537](https://www.virtualshanghai.net/数据/建筑?ID=1537) 的 `WANPING NANLI` 很可能指宛平南路，地图也无宛平南路道路要素；但 `NANLI` 与通常的 `NANLU` 不同，需先核原图和门牌再列为确认项。
- **已排除出缺口**：[#1290](https://www.virtualshanghai.net/数据/建筑?ID=1290) 的 `NORTH YANGTSE ROAD` 在库中为 `North Yangtsze Road／北扬子路／扬子江路`，只是拼写少一个 `s`，不应列成未收录道路。现存路段及门牌沿革属于另一项核查。
- `KOOKA LUNG`：项目研究脚本曾写为“顾家弄”，而[新旧路名汇编](https://www.cclchinese.com/portal.php?aid=7850&mod=view)列 `Kooka Loone → 俞家弄`；又是“弄”而非道路主线。此项需核原址与异写，不做自动更名。

本轮是**缺口核查**，没有向 GeoJSON 追加路段、移动建筑点位或改写地标。补道路几何还需明确历史线位与现代线位，不能仅凭路名释读生成线条。
