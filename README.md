# 上海 1928 历史路名地图

一个以现代上海街道几何为坐标、在地图画布显示民国时期旧名的静态 Web App。中国地名、本地名称及中国人名道路默认显示历史中文名，详情标题下保留原英文转写或沪语拼音；外文命名道路继续使用法语／英文原名。现代名称用于搜索与详情对照，中文旧名及外文转写均可搜索。

## 本地运行

```bash
npm install
npm run data:build
npm run dev
```

`npm run data:build` 会从 Virtual Shanghai 下载 CC BY/CC0 的开放 Shapefile，转换为 WGS84 GeoJSON，并写入 `public/data/`。生成后的数据随静态应用一起部署，运行时不会请求历史数据源。

## 历史地点调查

调查覆盖按 IDBAT 记录，见 [调查进度](research/PROGRESS.md)。外部研究原件及输入快照保存在 `research/external/`，补充评审与原作者结论分别保留。

2026-10-30用户更新研究口径：历史地点调查不再以1928年已经存在为纳入条件，重点查明身份、地址变迁、建筑存废和后续用途，逐项保留真实年代及证据缺口。最新口径与浴室复核见 [交接记录](handoff.md)和[文章复核](research/supplemental/2026-10-30-public-baths-article-review.md)；该调整未改变地图道路命名或显示规则。

001—010 的结果质量检查见 [2026-09-18 复核报告](research/rechecks/2026-09-18-001-010/README.md)：500条完整审阅，其中19条需纠正、81条需补证。已按用户批准落实[修正](research/corrections/2026-09-18-001-010/README.md)，明确错误已改、证据不足项收窄或待核，地图撤回20组旧现用并设置持久化待核规则。

023—032 的最新复查见 [2026-09-17—18 复查报告](research/rechecks/2026-09-17-023-032/README.md)。该目录保存本轮逐条结果、证据、空间核验和待补事项；原批次文件保留作历史版本。`research:progress` 目前统计原有调查登记，不包含此复查目录，也不表示已回填地图。

Public bath 的追加研究见 [2026-09-18 历史佐证补查](research/supplemental/2026-09-18-public-baths/README.md)：重新检索38条浴室及1条分类冲突记录，保留可读网页、原件图像页码及未解问题。该专项也尚未登记进旧进度脚本，地图未回填。

Public toilet 的追加研究见 [2026-10-30 公厕沿革补查](research/supplemental/2026-10-30-public-toilets/README.md)：原停放#114、#134、#345已作定向调查，另识别海宁路／四川北路老公厕候选，保存照片及旧图核读记录。旧排除快照保留，不表示这些公厕未被研究；本轮未改地图。

运行 `npm run research:progress` 会核验已登记外部文件的校验和及记录一致性，并更新当前 JSON 文件与调查进度的对照表。`npm run research:unresolved:prepare -- NNN` 会跳过已有外部调查或正在补证的记录。登记进度不会执行地图回填。

郁氏山庄等重复地点的核对与修正见 [2026-09-19 地标重复检查](research/rechecks/2026-09-19-landmark-duplicates/README.md)：13组确认关联已统一地图与搜索展示，保留原始坐标及双方史料；同名异址和不同用途候选继续分开。

## 上海优秀历史建筑名录

[房管局官方名单数据](public/data/shanghai-excellent-historical-buildings/README.md)收集第一至第五批共1058条来源记录，包括原始HTML、分批及合并JSON、来源哈希和异常清单。名录中的现名／现用按来源原文保留，不代表已核定今日用途，也不自动写入地图。

使用 `npm run data:heritage` 更新官网快照，`npm run data:heritage -- --offline` 从本地快照重建，`npm run validate:heritage` 只读核验。

[维基对照与详情](public/data/shanghai-excellent-historical-buildings/wikipedia/README.md)已将1058项全部对应，补入556项建造年代、728项层数、334项结构和105项设计者文字；保留291项地址差异。入口为 [buildings-enriched.json](public/data/shanghai-excellent-historical-buildings/buildings-enriched.json)，另提供100个建筑／建筑群参考点的 [GeoJSON](public/data/shanghai-excellent-historical-buildings/wikipedia/locations.geojson)。缺坐标、机构／校园点、来源疑点均明确保留状态。使用 `npm run data:heritage:wikipedia:offline` 从快照重建，`npm run validate:heritage:wikipedia`只读核验。

地址补查已为原913项中的878项找到来源参考点（上海图书馆871、OSM独立复核7），剩35项待核；见[补查说明](public/data/shanghai-excellent-historical-buildings/geocoding/README.md)。图书馆BD-09原坐标保留并转换为WGS84，同址楼栋与门牌范围明确标注。使用 `npm run data:heritage:geocode` 重建、`npm run validate:heritage:geocode` 核验。

地图顶部的“显示历史建筑”开关展示合计1044个参考点，沿用地标开关和详情卡样式；青绿色实心点表示建筑，空心点表示建筑群。按需加载轻量 [map-buildings.geojson](public/data/shanghai-excellent-historical-buildings/map-buildings.geojson)，点选可查看地址、建造年代、结构等资料与来源。

剩余80项的[坐标调查](research/rechecks/2026-10-30-heritage-missing-coordinates/README.md)经用户批准回填66项（50项有来源、16项部分定位），保留76个来源位置及各自限制；原978项和既有共卡不变。其余13条候选经[11月1日再核查](research/rechecks/2026-11-01-candidate-coordinate-recheck/README.md)仍待核，另1条无可用坐标。部分定位详情明确指出已定位和未定位组成物，不代表保护范围已测定。

南京饭店、圣三一堂、沐恩堂等101组确认对应的地点已在“显示地标”和“显示历史建筑”中共用卡片，位置采用历史建筑图层参考点，同时显示完整旧门牌与名录新门牌。两层同时开启只保留一个点，关闭其中一层仍能查看卡片。全量比对1803条历史来源与1058项名录，累计人工复核186对，85对因身份、年代、范围或坐标问题保留分开；其余312对候选未自动合并。此次按已有沿革及所引资料补查112对，新增55组，详见 [沿革补查清单](research/rechecks/2026-09-19-heritage-landmark-links/continuation-notes/README.md)及[关联复核说明](research/rechecks/2026-09-19-heritage-landmark-links/README.md)。

## 建筑时间轴

重要地标、公园和沿革共用点的地图标注优先使用已有中文史名；选择年份时使用该阶段的中文名，没有中文名则保留原文。英文／法文原名仍可搜索并在详情对照。道路按名称来源显示：中国名称使用历史中文，外文命名使用原文。

选择年份后，地标与审定同栋／同址关联的建筑点会切换到该年的名称依据，详情卡保持打开并同步显示阶段用途、来源和完整沿革。明确阶段按起始年包含、结束年不包含处理；原建筑拆除与同址新建分别记录，不能用旧楼拆除年隐藏有据的新建阶段。没有明确阶段时采用该年覆盖的历史记录；只有更早记录时使用已有名称，没有可用记录时保留原名。按2026-10-30用户要求，地图及标题不再附加“最近记录／当年名待考”，详情保留资料年份和来源。重叠记录保留并列名称，未来阶段不提前套用，邻近建筑／建筑群关联不借用彼此沿革。“全部年代”恢复原综合名称。

已接入张园园区的1885开放园林、1918后逐步转建住宅、2018保护更新、2022西区开放四个地块阶段，依据静安区2021年报道和太古地产2022年新闻稿。各阶段不代表同一栋建筑持续存在；西区开放不代表整个园区都已完成。其余地点按已有记录切换，尚未批量补齐改名、改用或重建的确切起止年。

哈同花园／爱俪园旧址已接入1954建设、1955中苏友好大厦、1968上海展览馆、1984上海展览中心四个后期阶段，依据静安区2021年报道及上海市文旅推广网2022年文章。沿用既有公园115／建筑1092与名录4B001的审定关联，不改变原始记录和坐标。1955年前点击历史花园仍可打开地标卡；后期阶段切换到后建大厦共用卡。新旧名称均可搜索。

底部滑杆支持1840年至当年逐年筛选，默认“全部年代”保留原来的浏览范围。第一次选择年份会在两层均关闭时自动打开地标和优秀历史建筑；搜索同步使用所选年代。两层同时显示仍按既有审定关系去重，现代街廓、建筑轮廓、道路旧名和辖区边界不随年份重建。

筛选优先使用明确建造年份；简单建造区间和年代（如1920年代）到末年才显示。仅有历史地标记录时，以最早记录作为显示起点，并在详情标明它不是建成年份。约年、始建、多栋／重建、异说等复杂文字暂归年代不明，可通过勾选“包含年代不明”查看。仅经审定为同栋建筑／构筑物的关联才借用名录建造年代，同址不同阶段不互相套用。

2026-10-30已做[建造年代补查](research/supplemental/2026-10-30-heritage-construction-dates/README.md)：为已上图名录项补录288条有来源的年代，建造年代不明确571→283，时间轴年代不明的名录点552→272。官方表按编号、原名和完整门址核对；逐项查清的初建与加层／修缮事件分别保留，详情卡新增补查依据、原字段和原文链接。尚未逐项查询137项、官方表亦无年代112项、候选待核31项、冲突待核3项均保留清单，未称全部查清。

根据用户提供的也是园中文线索，已补上[1937年毁损证据](research/supplemental/2026-10-30-yeshiyuan-destruction/README.md)：时间轴从1937年起隐藏原园林，全部年代仍可查阅；详情说明大半楼阁毁损与遗石后迁豫园的区别，不据此推断所有构件当年灭失。

`HistoricalFeatureProperties`与`HeritageBuildingProperties`支持可选`buildingLifeDates`：`built`和`demolished`各含`year`、`sourceUrl`和可选`note`。核实建筑生灭后应在数据生成／审定流程中写入这些结构化证据，详情展示适用范围说明。显示条件为起始年≤所选年＜消失年；消失年当年即隐藏。“全部年代”仍能查到已消失的建筑。没有批量推断拆除年份；目前逐项接入也是园1937年园林主体毁损：`historicalRecords.endYear`只代表记录范围，绝不自动当作拆除年；未记录消失年也不表示原楼仍存。

## 地点详情卡

历史建筑卡片的地址下方提供“在高德地图查看”，使用 `markers=POIID` 新开地图。2026-11-09 首次对四批 632 项静态匹配筛出 109 项，随后按全部 1058 项名录逐项查询高德，按用户要求跳过已有记录。实时查询保存旧名／别名、门牌、区县、坐标和父子 POI 的候选依据；明确区分名称与门址吻合、门址参考、名称与位置吻合但门址有差异。后两类在卡片保留提示，不将来源参考点当作保护范围测绘结果。共用同一 POI 的不同名录项和冲突项暂缓自动接入。

最新统计、逐项结果与候选见 [全量查找记录](research/rechecks/2026-11-09-heritage-amap-pois/SEARCH.md)，初次静态检查见 [高德 POI 核对](research/rechecks/2026-11-09-heritage-amap-pois/README.md)。运行 `python3 -u scripts/search-all-heritage-amap.py` 可从断点续查，再用 `node scripts/compile-heritage-amap-search.mjs` 汇总；Key 通过隐藏输入或环境变量传递，不写入文件。静态索引 `src/data/heritageAmapPois.json` 与实时索引 `src/data/heritageAmapLivePois.json` 分开保存，常规地图数据重建不会丢失已查结果。

后续逐项复核另存 [资料核对决定](research/rechecks/2026-11-09-heritage-amap-pois/reviewed-decisions.json)，每项保留所选 POI、差异说明和来源；汇总时校验候选确实由高德查询返回，并检查区县、距离、商铺和楼栋范围冲突。2026-11-10 市场 MCP 补查及资料核对后共有 536 项链接（含位置参考），其余 522 项保留 [复核原因及候选](research/rechecks/2026-11-09-heritage-amap-pois/review-queue.json)。市场 MCP 阶段在原有 500 项基础上净增36项。本轮追加最多2000积分，实际预算占用915积分（确认906、待确认预留9），补查／细化364项，新增11项链接、撤回5项楼栋范围尚未证明的旧候选；[楼栋范围纠正](research/rechecks/2026-11-09-heritage-amap-pois/scope-corrections.json)保留原候选和官方依据。门牌或建筑群范围有差异的项目保留具体说明。此前已将浚浦局俱乐部的公园门址参考细化为园内白庐 POI。

卡片直接显示缓存中的高德地点名称与门址；59 项资料交叉核对记录的来源也接入卡片“来源”。这些信息和地图链接均由本地索引生成，不调用高德搜索接口。Web Service 门牌文本补查曾因日额度耗尽停止，随后按用户指定服务 `market-cmgjmcp00074909` 继续。市场 MCP 初始预算500积分、追加100积分后，再按最新授权追加最多2000积分，累计上限2600积分（中途未使用的1000积分请求由2000积分请求替代，不叠加），包含试查及失败调用的可能扣费；[断点与费用记录](research/rechecks/2026-11-09-heritage-amap-pois/market-progress.json)保留已确认费用和待确认预留。运行 `python3 -u scripts/search-heritage-market-mcp.py` 可复用缓存和断点，在已保存的预算内续查；凭据从本机 MCP 配置读取，不写入结果。使用 `--supplement` 可补查尚未核定项目的具体楼号、范围起止门牌和未用别名；每项最多3个新关键词，并保留既有查询证据。`--dry-run` 可离线查看待查批次及剩余预算，不调用服务。本轮已完成当前两种查询计划，剩余1085积分未调用；预算用尽后脚本会停止付费查询。汇总脚本只读取本地数据，可离线回填。

地标与优秀历史建筑共用卡片，优先展示中文标题，其次展示原文、当前地址、时间线、人物、建筑资料和来源。道路卡片采用相同的纵向时间线布局，展示今日名称、已核实的辟筑与更名、带链接的名字来源。待核参考另行折叠展示，详见[道路沿革资料](research/road-histories/2026-11-04/README.md)。

时间线逐条保留 Virtual Shanghai 建筑记录的链接及对应旧门牌，明确建造、改名／改用、同址新建与毁损的依据；缺年记录置末。史料记录年份不当作建成年份，相邻地块不借用同栋沿革。当前门牌未核定时保留空缺，迁走机构的现址仅在备注交代。

“居住过的名人”只收录有来源的实际居住记录，姓名链接到依据，有时间则括注，并保留具体楼栋门牌；产权、设计或工作关系不会自动当作居住。2026-11-02检查现有关联的408篇中文维基及历史地标另10篇引用，新增68个地点、179条居住记录，连同原有逸村与岳阳路44号共70处、182条；[完整核查与回填表](research/supplemental/2026-11-02-wikipedia-residents/README.md)保留固定版本、门牌范围、年份冲突和未采用问题。没有独立词条链接的地点尚未逐项检索住户。名录现可按编号、名称、地址和已录住户姓名搜索；选择当前年份筛选外的记录会切回全部年代并打开名录图层。

## 验证

本地 POI 人工复核页：`http://127.0.0.1:4173/poi-review.html`。列出待复核建筑及已有高德候选，支持多选、确认、均不匹配、暂缓、备注、筛选、JSON 导入／导出。进度保存在当前浏览器的 localStorage；导出的结果用于后续回填，不自动改写正式卡片索引，也不调用付费查询。

未确定高德地点的建筑卡片带有“高德候选名单”入口。展开后可查看各候选的高德链接、门牌与差异提示；点击“选择此地点 +1”才增加选择次数，打开高德链接不计数。每次点击独立累计，按建筑 ID 和 POI ID 分开保存，暂不自动改写已确认链接。

`npm run dev` / `npm run preview` 通过 `/api/poi-candidate-votes` 提供读取与计数服务，记录保存在 `.local/poi-candidate-votes.json`，同一服务的浏览器共享累计数，刷新或重启服务后仍保留。该目录不提交 Git。Netlify 部署使用同路径的 Function 和站点级 Blobs 存储，每次选择保存为独立事件，再按建筑／POI 汇总，避免并发覆盖；重新部署不清空线上累计数。本地计数与线上计数分开。接口不可用时页面会提示失败，不会伪造成功次数。参考：[Netlify Functions 路由](https://docs.netlify.com/build/functions/configuration/)、[Blobs 持久化存储](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)。

`npm run data:poi-review` 从研究目录的最新结果生成候选快照；生产构建也会自动更新。复核页面与地图分别构建，输出同在 `dist/`。

```bash
npm test
npm run build
npm run test:e2e
```

生产构建输出到 `dist/`，可部署到任意静态托管。应用运行时需要联网加载 OpenFreeMap 的无标签矢量瓦片，无需 API Key。

## 数据与许可

- 1928 年配准街道图：Public Domain Mark 1.0
- Virtual Shanghai 历史街道、建筑、公园与公共租界辖区：CC BY 4.0
- Virtual Shanghai 法租界卫生区：CC0 1.0
- OpenStreetMap 数据：ODbL
- OpenFreeMap 瓦片服务与样式基础设施：MIT / 相应数据许可

地图中的历史数据仅用于研究、教育与公共历史展示。个别缺项采用最接近 1928 年且早于 1945 年的来源补充。
