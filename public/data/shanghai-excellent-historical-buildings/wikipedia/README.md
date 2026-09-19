# 维基名单对照与建筑详情

来源：[维基百科「上海市优秀历史建筑」](https://zh.wikipedia.org/zh-hans/上海市优秀历史建筑)，保存版本 **94231361**（2026-09-07 编辑）；抓取时间见 `list-source.json`。与房管局五批共 **1058** 条名录一一对应，原始官网数据仍在上一级 `buildings.json`。

## 本次覆盖

| 项目 | 数量 |
|---|---:|
| 一一对应的名录条目 | 1058 |
| 有地址的条目 | 1058（仅1条从维基补官方空缺） |
| 保留双方原文的地址差异 | 291 |
| 维基名单提供建造年代／层数 | 556／728 |
| 维基名单提供结构／设计者文字 | 334／105 |
| 有原名称链接的条目／去重标题 | 421／410 |
| 有坐标候选的词条标题 | 142 |
| 可导出的参考点／对应保护项 | 100／100 |
| 其中建筑参考点／建筑群参考点 | 82／18 |
| 仅有待核坐标候选的保护项 | 45 |
| 本轮维基来源没有坐标的保护项（补查前） | 913 |

全部410个链接词条成功取得，关联398个Wikidata实体；最终API失败为0。坐标覆盖按词条统计与按保护项统计不同，同一建筑群可对应多个保护项。提篮桥监狱、枕流公寓的现有来源坐标与名录旧址/地址不相符，已放入待核候选，未导出。524条综合复核记录包含地址差异或名称泛化等提示，不意味着524条身份匹配错误。

## 使用入口

- [../buildings-enriched.json](../buildings-enriched.json)：1058 条合并参考记录，含双方地址、匹配依据、维基建筑详情、建筑条目链接、坐标候选及参考点。
- [locations.geojson](locations.geojson)：可导入 GIS 的 WGS84 参考点。`coordinateScope` 区分建筑和建筑群；不是官方测绘、建筑轮廓或1926年定位成果。
- [../map-buildings.geojson](../map-buildings.geojson)：地图“显示历史建筑”图层的轻量数据，与上述100个参考点一一对应，额外携带详情卡所需的地址、年代、层数、结构、设计者和来源。开启图层时加载，不需要把研究原始档案全部下载到前端。
- [list-records.json](list-records.json)：维基列表的完整结构化记录；保存子建筑、原始表格行号、图片链接及空字段。
- [matches.json](matches.json)：1058 条对应关系及编号转换、名称/地址比较、复核提示。
- [review-queue.json](review-queue.json)：地址差异、名称缺少独特交集、坐标范围/精度/冲突等后续核对项。差异不自动等于错误。
- [article-details.json](article-details.json)：410 个原名称链接的维基/Wikidata资料，保留重定向、页号、版本、P625、P571、P84、P149、P31及声明来源。
- [linked-entity-labels.json](linked-entity-labels.json)：设计者、风格和实体类型的117个关联实体名称。
- [validation.json](validation.json)：覆盖统计、输入哈希及一致性检查结果。
- [list-source.json](list-source.json)、[detail-sources.json](detail-sources.json)、[raw/](raw/)：请求URL、抓取时间、SHA-256和原始响应。详情采集的历史429响应亦保留，最终成功状态以 `article-details.json.failures` 为准。

## 数据语义

`records[].official` 保留官方主要字段和来源；`wikipedia` 保存名单补充字段，如 `constructionDateText`、`floorsText`、`structureText`、`designerText`、`protectionCategoryText`。字段保留原文，不强行拆解复合年代或建筑结构。`components` 保留合并单元格下的子建筑。

`address.value` 优先官网地址；官网缺地址时才用维基补充，并明确 `source`。不同写法、门牌或范围保存在 `address.alternatives` 和 `match.comparisons.address`，不自动裁定。`listedNameOrUse` 和第五批的混合名称/现使用单位列均只是来源记载，不能作为已核实的今日用途。

`articleReferences` 只由原名称链接采集详情；现使用单位链接仍保存在 `wikipedia.articleLinks`，不会因它们是银行、学校等机构而把其总部位置当作建筑。第五批原名称列实际混合机构名称，额外通过实体范围审查处理。

`entityInceptionClaims` 是 Wikidata 的实体起始时间 P571，可能为机构成立日期，**不是自动补出的建筑落成年份**。建筑年份以维基名单 `constructionDateText` 为有来源的文本候选。

## 对应规则

1. 第一批61项采用人工名称/地址对照；维基序号不等于官网编号。映射固定到当前列表快照的版本和哈希，变更后须复核。
2. 第二批 `X-Ⅲ-nnn` 按该批旧编号转换；`E-Ⅲ-001…003` 对应官网 `2A056…058`，官网也列相应 `2E` 别号。
3. 第三批徐汇旧D编号49—83对应新编号001—035，O/P/Q分别对应W/J/K。
4. 第四批福新面粉一厂维基 `4H008` 对应官网 `4H007`，其余采用同批编号。
5. 第五批按HP/XH等区码对照官网编号。`HP013`、`HK039` 分别对应官网重复 `5A012`、`5F038` 的第二项；另显式对应官网异常原文 `D5035`、`50D80`、`D50102`。原编号没有被修写。

完整规则在 `scripts/lib/wikipedia-heritage-enrichment.mjs`，第一批人工对照在 `scripts/data/shanghai-heritage-wikipedia-batch1.json`，机构/校园/建筑群等范围审查在 `scripts/data/shanghai-heritage-wikipedia-link-scopes.json`。不同保护项同址不能合并，例如兴国宾馆各楼、长海路174号、华山路1954号及岳阳路145号。

## 坐标

全部坐标候选保留在 `articleReferences[].location.candidates`。选点优先维基 GeoData 主坐标，其次Wikidata P625的非弃用preferred/normal声明。只选地球、上海范围内的数值；若主坐标之间差异超过100米，或来源声明的精度超过0.001度/无效，则不选点。精度单位为角度，不能当作测绘误差保证；来源未给出时为null。

公司、学校/大学整体、医院机构、人物、道路、公园等大范围实体及不明实体仅保留候选。章节链接（例如上海中学条目中的大礼堂）不能继承整篇页面坐标。建筑群坐标即使可导出也明确标为 `building-complex-reference-point`，可能被同一片区域内多个保护项引用，不代表各楼位置已核实。

这里的100个维基参考点保持不变。后续[门址补查](../geocoding/README.md)已为913项中的878项补入上海图书馆或独立OSM来源点，合并图层共978点；35项本轮待核与原45项维基候选保留。增强文件的geocoding字段和coverage为合并统计，articleReferences仍只记录原维基资料。原历史地图的坐标、分组或现用途资料不变。

## 重建与验证

在项目根目录运行：

```sh
# 刷新列表，补齐未成功的API缓存，并生成对照结果
npm run data:heritage:wikipedia

# 全离线，从已存HTML/API响应重新生成
npm run data:heritage:wikipedia:offline

# 不联网不改文件：逐个核验快照哈希、API解析、全部生成产物
npm run validate:heritage:wikipedia
```

联网脚本使用环境代理配置或macOS系统代理，未将本机代理地址写入数据。默认复用已成功的API响应，重新运行不代表全量刷新所有词条。要进行新一轮完整详情采集，应先归档当前 `detail-sources.json` 和 `raw/details/`，再移走当前详情缓存；新列表版本还需重新审核第一批映射和链接范围。不要只改哈希来跳过审核。

维基列表有21张表，其中1张为统计、20张为名单；解析1058组，包含82条子项、1140个来源数据行。第四批4D042/4D044两行缺少末尾照片格，已显式记录，不影响建筑字段。其他未知缺格、跨表合并、未知表头、批次数量变化均报错。

## 来源与许可

维基百科文字依 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 使用；链接原条目和版本号保留于每条来源。结构化结果进行了字段提取、编号对照、资料拼接及坐标筛选。Wikidata数据依 [CC0](https://creativecommons.org/publicdomain/zero/1.0/) 使用。图片仅保存来源链接，每张图片的许可需查看其文件说明页；未下载图片。
