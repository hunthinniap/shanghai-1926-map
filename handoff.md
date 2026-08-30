# 上海历史地点现用途调查交接

更新时间：2026-08-30（Asia/Shanghai）

## 项目目标

本阶段在不修改历史道路数据的前提下，逐条调查 Virtual Shanghai 地标记录在今天的状态，并按三类保存：

1. `survives-with-history`：实体、建筑或机构在原址有明确历史连续关系。
2. `demolished-current-use`：有资料确认历史实体已拆除、毁坏或重建，并能说明原址今天的用途。
3. `location-only-current-use`：只能把历史坐标落到今天的位置和用途，尚不能证明历史实体与现代建筑连续。

同一现代地块上的不同历史记录必须保留各自的年代、名称和用途，不能因为同址而合并掉。例如 Foreign Cemetery 与 French Cemetery 可共享同一现址说明，但地图中的两条历史记录仍然分别存在。

## 当前代码与数据状态

- 分支：`main`
- 本轮开始基线：`83f575e feat: enrich historical landmarks and research data`
- 坐标规则：项目几何始终使用 WGS84 / EPSG:4326；GCJ-02 只供高德等国内地图反查，不能写回 GeoJSON。
- 调查档案：`scripts/data/unresolved-landmarks-002-research.json` 至 `006-research.json`。
- 地图回填入口：`scripts/data/landmark-current-use-overrides.json`。
- 当前 override 共 116 个地点组，其中包含 006 的 14 个确定项，以及一条用于防止外部接口波动造成回退的 Kaina Gongyu / 武定公寓显式记录。
- 当前生成结果：1602 条 unresolved 记录，分成 33 个文件。
- 当前现用途审计：61 个上海图书馆匹配、15 个 Wikipedia 文保匹配、116 个逐地点研究匹配、22 个现存公园匹配；1155 个具名未找到、276 个泛名。

研究 JSON 是人工判断档案，不会自动进入地图。只有把确定记录转写进 `landmark-current-use-overrides.json`，再运行生成命令，地图才会更新。

## 已完成批次

| 批次 | 调查结果 | 地图回填状态 |
| --- | --- | --- |
| 002 | 50 条；旧版结构：21 resolved、8 probable、1 history-only、20 unresolved | 21 条 resolved 已回填 |
| 003 | 50 条；旧版结构：12 resolved、8 probable、2 history-only、28 unresolved | 12 条 resolved 已回填 |
| 004 | 50 条；15 现存、5 已拆、30 仅定位；18 yes、2 review | 尚未回填，应优先处理 |
| 005 | 50 条；20 现存、4 已拆、26 仅定位；19 yes、5 review | 19 条 yes 已回填，落在 18 个地点组；5 条 review 未回填 |
| 006 | 50 条；13 现存、3 已拆、34 仅定位；14 yes、2 review | 14 条 yes 已回填；ID 1572、1731 保留 review |

006 的 14 个已回填 ID 为：`286, 30, 489, 876, 706, 29, 392, 291, 262, 1680, 1614, 1453, 719, 547`。它们已经从 unresolved 导出中移除。

006 的两个 review：

- `1572 Guanyin Temple`：法华观音禅寺旧址、原第四化纤厂地块与今天知音小区之间的沿革基本成立，但寺界和住宅地块边界还需要地籍复核。
- `1731 HAIG APARTMENTS`：343 Avenue Haig 可准确对应华山路343号，且海园小区历史建筑群仍存，但缺少直接把英文公寓名连到具体楼栋的资料。

其余 34 条只记录现代坐标位置。现代 POI、相同门牌或翻译后的道路名本身不构成建筑连续证据。

## 本轮实现变更

- 为当前用途关系新增 `same-site-continuing-use`，用于“原址和功能连续、但建筑历经改扩建”的情况。
- 详情面板增加该关系的中文说明。
- 衡山公园的园地标签兼容 Virtual Shanghai 的贝当公园地点组，避免重复地图标签。
- 005 与 006 的确定记录已通过显式 override 写入地图；共享现代地块的历史记录仍分别保留。
- Kaina Gongyu / 武定公寓原本由上海图书馆自动匹配。重生成时外部查询结果波动导致匹配消失，现已固定为显式 override，避免功能回退。

## 生成与检查流程

只处理地标现用途时，不要运行完整的 `npm run data:build`，因为它还会执行道路对齐和旧城道路脚本。使用：

```bash
npm run data:current-use
npm run data:unresolved
npm run validate:data
npm test
npm run build
npm run test:e2e
git diff --check
```

每次运行 `data:unresolved` 都会重新排序和每 50 条分块，因此 007、008 等文件名会随着已解决记录移除而漂移。研究工作的稳定标识是 `IDBAT`，不是批次文件名。现有 research 文件中的 `input` 表示调查当时的快照来源；回填重生成后，同名 unresolved 文件内容通常已经变化。

## 下一步

1. 审阅 004 的 18 个 `yes` 并转写 overrides；两条 `review` 继续保留人工判断。
2. 复核 005 的 5 个 `review` 和 006 的 ID 1572、1731，只在证据闭环后回填。
3. 从当前重新生成的 `public/data/unresolved-landmarks/007.json` 开始下一批调查；复制原始 50 条 IDBAT 清单后再研究，避免分块漂移造成混淆。
4. 优先查官方文保名录、区政府/方志、机构沿革和历史门牌资料；地图反查只用于确定今天坐标位置。
5. `location-only-current-use` 可以保存在研究档案中，但不要在地图上显示成已确认的历史延续。

## 道路与本地未提交差异

本轮不做道路矫正，也不应把道路变化混入地标提交。当前本地 `historical-features.geojson` 检测到 5 组既有道路差异（人民路、方浜中路、河南南路、中华路及 `road-old-city-中华路`），提交时必须只暂存地标属性变化，把这些道路差异留在本地工作区。`virtual-shanghai-building-clusters.json` 只有 `generatedAt` 时间戳变化，也不需要提交。

## 验证状态

006 research JSON 已验证为 50 条、ID 唯一、原调查顺序一致，summary 统计与实际记录一致。14 条 `yes` 均已进入地图，两个 `review` 仍在 unresolved 中。

- `npm test`：通过，6 个 Vitest 文件共 52 项，以及 8 项 Node cluster 测试全部通过。
- `npm run build`：通过，包含数据校验、TypeScript 检查和 Vite 生产构建。
- `git diff --check`：通过。
- 应用内浏览器抽查：上海共舞台、金门大戏院旧址的搜索与现用途详情正常；Foreign Cemetery / French Cemetery 仍显示为两条同址历史记录；衡山公园搜索仅返回一个结果；控制台无错误。
- `npm run test:e2e`：4 项无需浏览器的静态检查通过；其余 36 项未启动，因为本机缺少 Playwright Chromium。尝试下载约 179 MB 运行时，但 CDN 长时间无传输进度后已取消。这是测试环境缺件，不是页面断言失败。
