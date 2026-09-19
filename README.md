# 上海 1928 历史路名地图

一个以现代上海街道几何为坐标、只在地图画布显示民国时期旧名的静态 Web App。法租界道路使用法语原名，公共租界使用英文原名，华界使用当时中文名；现代名称仅用于搜索与详情对照。

## 本地运行

```bash
npm install
npm run data:build
npm run dev
```

`npm run data:build` 会从 Virtual Shanghai 下载 CC BY/CC0 的开放 Shapefile，转换为 WGS84 GeoJSON，并写入 `public/data/`。生成后的数据随静态应用一起部署，运行时不会请求历史数据源。

## 历史地点调查

调查覆盖按 IDBAT 记录，见 [调查进度](research/PROGRESS.md)。外部研究原件及输入快照保存在 `research/external/`，补充评审与原作者结论分别保留。

001—010 的结果质量检查见 [2026-09-18 复核报告](research/rechecks/2026-09-18-001-010/README.md)：500条完整审阅，其中19条需纠正、81条需补证。已按用户批准落实[修正](research/corrections/2026-09-18-001-010/README.md)，明确错误已改、证据不足项收窄或待核，地图撤回20组旧现用并设置持久化待核规则。

023—032 的最新复查见 [2026-09-17—18 复查报告](research/rechecks/2026-09-17-023-032/README.md)。该目录保存本轮逐条结果、证据、空间核验和待补事项；原批次文件保留作历史版本。`research:progress` 目前统计原有调查登记，不包含此复查目录，也不表示已回填地图。

Public bath 的追加研究见 [2026-09-18 历史佐证补查](research/supplemental/2026-09-18-public-baths/README.md)：重新检索38条浴室及1条分类冲突记录，保留可读网页、原件图像页码及未解问题。该专项也尚未登记进旧进度脚本，地图未回填。

运行 `npm run research:progress` 会核验已登记外部文件的校验和及记录一致性，并更新当前 JSON 文件与调查进度的对照表。`npm run research:unresolved:prepare -- NNN` 会跳过已有外部调查或正在补证的记录。登记进度不会执行地图回填。

郁氏山庄等重复地点的核对与修正见 [2026-09-19 地标重复检查](research/rechecks/2026-09-19-landmark-duplicates/README.md)：13组确认关联已统一地图与搜索展示，保留原始坐标及双方史料；同名异址和不同用途候选继续分开。

## 上海优秀历史建筑名录

[房管局官方名单数据](public/data/shanghai-excellent-historical-buildings/README.md)收集第一至第五批共1058条来源记录，包括原始HTML、分批及合并JSON、来源哈希和异常清单。名录中的现名／现用按来源原文保留，不代表已核定今日用途，也不自动写入地图。

使用 `npm run data:heritage` 更新官网快照，`npm run data:heritage -- --offline` 从本地快照重建，`npm run validate:heritage` 只读核验。

[维基对照与详情](public/data/shanghai-excellent-historical-buildings/wikipedia/README.md)已将1058项全部对应，补入556项建造年代、728项层数、334项结构和105项设计者文字；保留291项地址差异。入口为 [buildings-enriched.json](public/data/shanghai-excellent-historical-buildings/buildings-enriched.json)，另提供100个建筑／建筑群参考点的 [GeoJSON](public/data/shanghai-excellent-historical-buildings/wikipedia/locations.geojson)。缺坐标、机构／校园点、来源疑点均明确保留状态。使用 `npm run data:heritage:wikipedia:offline` 从快照重建，`npm run validate:heritage:wikipedia`只读核验。

地址补查已为原913项中的878项找到来源参考点（上海图书馆871、OSM独立复核7），剩35项待核；见[补查说明](public/data/shanghai-excellent-historical-buildings/geocoding/README.md)。图书馆BD-09原坐标保留并转换为WGS84，同址楼栋与门牌范围明确标注。使用 `npm run data:heritage:geocode` 重建、`npm run validate:heritage:geocode` 核验。

地图顶部的“显示历史建筑”开关展示合计978个参考点，沿用地标开关和详情卡样式；青绿色实心点表示建筑，空心点表示建筑群。按需加载轻量 [map-buildings.geojson](public/data/shanghai-excellent-historical-buildings/map-buildings.geojson)，点选可查看地址、建造年代、结构等资料与来源。

南京饭店等46组确认对应的地点已在“显示地标”和“显示历史建筑”中共用卡片，位置采用历史建筑图层参考点，同时显示完整旧门牌与名录新门牌。两层同时开启只保留一个点，关闭其中一层仍能查看卡片。全量比对1803条历史来源与1058项名录，人工复核74对，28对因年代、范围或坐标问题保留分开；其余候选未自动合并。详见 [关联复核与完整清单](research/rechecks/2026-09-19-heritage-landmark-links/README.md)。

## 验证

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
