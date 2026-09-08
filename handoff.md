# 上海历史地点现用途调查交接

更新时间：2026-09-08（Asia/Shanghai）

## 最新进度：009 首轮完成，下一批从 010 开始

- 本轮已从 `origin/main` 快进拉取至 `4ca4ef0 feat: verify landmark sites through batch 008`。009 原始快照此前已经存在，本轮据此完成调查，没有直接使用重排后的实时 `009.json`。
- **009 首轮调查完成 50 条，不等于全部查明**：11 verified、30 likely、9 unresolved。分类为 10 `survives-with-history`、1 `demolished-current-use`、39 `location-only-current-use`；后者包含仍无法确认具体宗地现用途的记录，不能把周边 POI 写成旧址定论。
- 10 条 `yes` 已回填 10 个独立地点组：`299, 1634, 835, 1726, 1350, 1750, 1743, 1229, 1706, 1262`。它们的历史名称、原用途、年代、原坐标均保留；本轮只新增现用途属性，没有合并历史记录或修改道路。
- `#249 Institut Pasteur` 的巴斯德研究所身份及瑞金二路207号今日科研用途已确认，但当前地点组另含 `#248 Nurse School`。护士学校与研究所建筑的关系仍待核，因此 #249 为 verified / review，不对整个组回填。其余 30 条 likely 也只留在研究档案；合计 31 review、9 no 未回填。
- 主要确定项：华英女中旧址今为淮海公馆漫心府；护国禅寺旧址今为南京东路街道社区服务空间；湖心亭修缮后仍作茶楼；诺曼底公寓即武康大楼；内外棉职员住宅延续为澳门小区。学校用地转为同济或上外校园的结论限于旧校园用址，不宣称每一幢现代楼都是原校舍。
- 湖州会馆 #1350 按“战毁后改建”记录：原会馆大部毁于1932年战事，后来建住宅，现另有遗址纪念展陈与恢复门头。不能标成原会馆完整保存；中兴路828号是纪念设施地址，不代表整个历史会馆范围。
- 当前 override **198** 个；现用途审计为图书馆 62（缓存兜底 0）、Wikipedia 15、逐地点研究 198、现存公园 22、部分名称待审 21、具名未找到 1100、泛名 252，网络失败 0。未查明导出 **1505 条 / 31 个文件**，本批 10 个获准 ID 已移除，40 个未获准 ID 均仍保留。
- `009-a.json`、`009-b.json`、`009-c.json` 保存逐条判断及来源；`009-results.json` 保存完整六字段、坐标转换与参考文献；`scripts/data/unresolved-landmarks-009-research.json` 保存三分类和回填建议。辅助查询保存在 `009-osm-nearby.json`、`009-shanghai-library-address.json`；OSM 末10条请求遇到429/超时等错误，错误状态已保留，不能将查询失败解读为地点不存在。
- **010 稳定快照已准备**：`research/unresolved-landmarks/010-input.json`，50 条，已验证不重复 001—009 已研究 ID。010 尚未开展逐条研究，下一轮直接从这个快照开始，不要重新复制实时 `public/data/unresolved-landmarks/010.json`。

### 下一轮工作与复核重点

1. 按 010 稳定快照分组检索官方名录、方志、校史和当前机构地址；先建立旧址关系，再查现在用途。地图反查只是空间线索，不能单凭最近 POI 宣布建筑延续或拆除。
2. 009 可继续重点查 #249 / #248 的研究所与护士学校用址边界；#1733 Intersavin / 白尔登公寓的旧门牌与坐标对应；#1173 日本西部小学、#1707 第七日本小学的宗地与校史闭环。#1720 / #1721 女校还与 #1266 / #1267 同组，暂不整组回填。
3. 保留 #1457 徽宁会馆新老馆门牌冲突、#1290 日本邮船旧扬子路点位冲突等不确定性；不要把机构迁址后的现代地址直接移植回旧点。004 的 18 条 yes 等早期积压状态未在本轮改变，后续可另行审阅。
4. 完成下一批后依次运行 `node scripts/compile-unresolved-research.mjs 010`、审查同组证据、`node scripts/apply-unresolved-research-overrides.mjs 010`、`npm run data:current-use`、`npm run data:unresolved`。**不要运行 `data:build`**，本任务无需道路矫正。

### 本轮检查与 Git 注意事项

- 50 条原始六字段逐项不变，ID 唯一，参考链接格式有效；10 个获准地点组均只有本条源记录，没有将未研究的同组记录一并覆盖。
- 地图仍有 5507 个历史要素、3832 条道路；与拉取后的 HEAD 逐项比较，仅上述10条的 `current*` 属性变化，所有要素的历史属性和几何均不变。
- 道路数组 `JSON.stringify(features.filter(f => f.properties.kind === 'road'))` 的 SHA-256 仍为 `e46e1a75414269cf555a15b17f5ec0ad2e5d797cab7ea9c99101bf374913c95c`。
- `npm test`：52 项 Vitest + 12 项 Node 测试通过；`npm run build`（含数据校验与 TypeScript）通过。本机缺少 Playwright Chromium，本轮未重跑浏览器端测试，也未下载安装浏览器。
- 拉取前本地有两个生成文件的未提交差异，已完整保存在 `stash@{0}`，消息为 `pre-pull local generated data 2026-09-08`；涉及 `public/data/historical-features.geojson` 和 `public/data/virtual-shanghai-building-clusters.json`。**尚未 pop，不要删除或直接覆盖恢复**：先审阅其中旧道路差异，避免把它们混入后续地标调查提交。
- 正常使用 `git push origin main`，禁止 force push。下方 Windows 的 schannel 推送命令仅是旧环境存档，不适用于当前 macOS。

## 2026-09-07 交接存档

以下状态已由上方 009 进度更新。

- 本次提交基线为 `9dccb79 feat: research landmark sites through batch 007`，远程为 `origin/main`。
- 007 已完成：50 条，25 verified、11 likely、14 unresolved；获准项已回填。
- 008 已完成并复核：50 条，27 verified、17 likely、6 unresolved；27 条获准记录写入 26 个地点组（1149/1381 是同组两条记录）。来源、旧址差异和现用途说明保存在 `research/unresolved-landmarks/008-results.json`；稳定原始六字段在 `008-input.json`。
- 008 的 26 个新增 override 代表 ID：652、544、264、363、1304、1092、480、1359、1692、1668、1431、1659、1661、1301、1641、612、356、1558、1530、355、1244、1381、1061、1043、1637、1269。
- 同组获准记录的 override 现在保存全部已核实 `sourceRecordIds` 和原名 guard，避免遗漏 1149/1381 等同址记录。
- #264 泛名已明确为 Qixiu Girls' School（启秀女子中学）；#421 已明确为 Margaret Williamson Hospital (wartime branch)，但徐家汇路临时院址的今日具体宗地用途仍待核，未写入现用途 override。
- #1142 不再推测为宜德堂，降为 unresolved；#612 只确认虹庙建筑身份及保护更新，当前开放情况未核实；#1301 的旧门牌 375 来自 VS，官方沿革与现门牌分别作为佐证。
- 当前 override 188 个；现用途审计：图书馆 62、Wikipedia 15、逐地点研究 188、现存公园 22、部分名称待审 21、具名未找到 1108、泛名 254。未查明导出为 1515 条、31 个文件。
- 009 的稳定原始快照已保存为 `research/unresolved-landmarks/009-input.json`（50 条）；三组研究正在继续，未完成前不要编译成整批已完成结果。实时 unresolved 文件编号会漂移，始终以快照 IDBAT 为准。
- 当前生成数据为 5507 个历史要素、23 个现存公园对照、167 个地铁线路段、310 个地铁站。历史道路保持 `9dccb79` 中的 3832 条不变。
- 上次误运行全量生成产生了道路 ID 改写和 10 条重复道路；已在验证所有道路名称、属性与几何均无实质差异后恢复已提交道路数组。还原前备份在忽略目录 `.cache/historical-before-road-id-normalization.geojson`。后续仅用 `data:current-use` 和 `data:unresolved`，不要为地标研究运行 `data:build`。
- 2026-09-07 检查：`npm test` 52 项 Vitest + 12 项 Node 全通过；`npm run build`（含数据校验及 TypeScript）通过。008 上次完整桌面/移动端 Playwright 为 40/40 通过；此次道路编号还原后未重复浏览器测试。
- 普通 GitHub 连接失败时，上次成功的推送命令为 `git -c http.sslBackend=schannel -c http.curloptResolve=github.com:443:140.82.112.4 push origin main`；仅在正常推送失败时使用，禁止 force push。

## 2026-08-30 交接存档

以下计数、分支基线和“下一步”反映当时状态，最新状态以上方为准。

## 项目目标

本阶段在不修改历史道路数据的前提下，逐条调查 Virtual Shanghai 地标记录在今天的状态，并按三类保存：

1. `survives-with-history`：实体、建筑或机构在原址有明确历史连续关系。
2. `demolished-current-use`：有资料确认历史实体已拆除、毁坏或重建，并能说明原址今天的用途。
3. `location-only-current-use`：只能把历史坐标落到今天的位置和用途，尚不能证明历史实体与现代建筑连续。

同一现代地块上的不同历史记录必须保留各自的年代、名称和用途，不能因为同址而合并掉。例如 Foreign Cemetery 与 French Cemetery 可共享同一现址说明，但地图中的两条历史记录仍然分别存在。

## 当前代码与数据状态

- 分支：`main`
- 本轮开始基线：`ae0cb72 feat: research landmarks through batch 006`
- 坐标规则：项目几何始终使用 WGS84 / EPSG:4326；GCJ-02 只供高德等国内地图反查，不能写回 GeoJSON。
- 调查档案：`scripts/data/unresolved-landmarks-001-research.json` 至 `006-research.json`；001 另保留稳定的原始六字段快照 `research/unresolved-landmarks/001-input.json` 和带来源标题的详细结果 `001-results.json`。
- 地图回填入口：`scripts/data/landmark-current-use-overrides.json`。
- 当前 override 共 136 个地点组，其中包含 001 的 20 个确定项、006 的 14 个确定项，以及一条用于防止外部接口波动造成回退的 Kaina Gongyu / 武定公寓显式记录。
- 当前生成结果：1580 条 unresolved 记录，分成 32 个文件。
- 当前现用途审计：62 个上海图书馆匹配、15 个 Wikipedia 文保匹配、136 个逐地点研究匹配、22 个现存公园匹配；1147 个具名未找到、268 个泛名。

研究 JSON 是人工判断档案，不会自动进入地图。只有把确定记录转写进 `landmark-current-use-overrides.json`，再运行生成命令，地图才会更新。

## 已完成批次

| 批次 | 调查结果 | 地图回填状态 |
| --- | --- | --- |
| 001 | 50 条；20 resolved、11 probable、19 unresolved | 20 条获批项已回填；241/242 已拆组，242 与 598 继续保留 review |
| 002 | 50 条；旧版结构：21 resolved、8 probable、1 history-only、20 unresolved | 21 条 resolved 已回填 |
| 003 | 50 条；旧版结构：12 resolved、8 probable、2 history-only、28 unresolved | 12 条 resolved 已回填 |
| 004 | 50 条；15 现存、5 已拆、30 仅定位；18 yes、2 review | 尚未回填，应优先处理 |
| 005 | 50 条；20 现存、4 已拆、26 仅定位；19 yes、5 review | 19 条 yes 已回填，落在 18 个地点组；5 条 review 未回填 |
| 006 | 50 条；13 现存、3 已拆、34 仅定位；14 yes、2 review | 14 条 yes 已回填；ID 1572、1731 保留 review |

006 的 14 个已回填 ID 为：`286, 30, 489, 876, 706, 29, 392, 291, 262, 1680, 1614, 1453, 719, 547`。它们已经从 unresolved 导出中移除。

006 的两个 review：

- `1572 Guanyin Temple`：法华观音禅寺旧址、原第四化纤厂地块与今天知音小区之间的沿革基本成立，但寺界和住宅地块边界还需要地籍复核。
- `1731 HAIG APARTMENTS`：343 Avenue Haig 可准确对应华山路343号，且海园小区历史建筑群仍存，但缺少直接把英文公寓名连到具体楼栋的资料。

001 的关键保留项：

- `241 Aurora University Chapel` 与 `242 Aurora University - Sports Field` 曾因共用 `280 Avenue Dubail` 被自动聚类；现已通过可追溯的 curated separation 拆成两个独立地点。241 已回填上海圣伯多禄堂，242 仅记录“旧运动场位置大致延续”，继续保留 review。
- `569 American Club` 已回填为美国花旗总会旧址；上海金融法院于2025年7月迁出后，新使用单位未查明，卡片明确显示“现使用单位待核”。
- `598 Alcar Building` 与香港路60号大丰大楼门牌、年代、点位一致，但没有直接资料证明两者同名沿革，暂不回填。
- `1735 Belmont Apartments` 由 Shanghai Art Deco Buildings Database、Historic Shanghai、Global Times 与文保名录形成闭环，已回填为现存襄阳公寓；资料中的240/254号门牌差异保留在备注中。
- `1476 Aurora Museum` 的旧“昆虫研究所”用途已更新：2024年中科院资料显示重庆南路225号2号楼现由中国科学院上海免疫与感染研究所管理。

其余 34 条只记录现代坐标位置。现代 POI、相同门牌或翻译后的道路名本身不构成建筑连续证据。

## 本轮实现变更

- 为当前用途关系新增 `same-site-continuing-use`，用于“原址和功能连续、但建筑历经改扩建”的情况。
- 详情面板增加该关系的中文说明。
- 衡山公园的园地标签兼容 Virtual Shanghai 的贝当公园地点组，避免重复地图标签。
- 005 与 006 的确定记录已通过显式 override 写入地图；共享现代地块的历史记录仍分别保留。
- Kaina Gongyu / 武定公寓原本由上海图书馆自动匹配。重生成时外部查询结果波动导致匹配消失，现已固定为显式 override，避免功能回退。
- 新增 `virtual-shanghai-site-separations.json` 与聚类 cannot-link 规则，专门拆开同门牌但物理功能不同的 241 教堂和 242 运动场；规则同时覆盖直接合并和经第三条记录的间接合并，且不改变全局 250 米同址阈值。

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
3. 001 的下一轮继续复核 ID 242、598；再从当前 unresolved 中排除 001—006 已研究 ID，复制排名最前的 50 条 IDBAT 为稳定快照后开展下一批，不能直接依赖会漂移的文件编号。
4. 优先查官方文保名录、区政府/方志、机构沿革和历史门牌资料；地图反查只用于确定今天坐标位置。
5. `location-only-current-use` 可以保存在研究档案中，但不要在地图上显示成已确认的历史延续。

## 道路与本地未提交差异

本轮不做道路矫正，也不应把道路变化混入地标提交。当前本地 `historical-features.geojson` 检测到 5 组既有道路差异（人民路、方浜中路、河南南路、中华路及 `road-old-city-中华路`），提交时必须只暂存地标属性变化，把这些道路差异留在本地工作区。本次处理前后 3822 条道路的序列化内容 SHA-256 均为 `7ea5529b81f0ecdfa873ff516ffe1b047dcbcec3f23180f7d206e426e9854cc3`。`virtual-shanghai-building-clusters.json` 现包含 241/242 拆组的实质性审计变化，应随本次地标变更保留。

## 验证状态

001 research JSON 已验证为 50 条、ID 唯一，summary 为 20 `yes`、11 `review`、19 `no`。241 与 569 已进入地图；242 与 598 仍在 unresolved 中。006 的 14 条 `yes` 也均已进入地图，两个 `review` 仍在 unresolved 中。

- `npm test`：通过，6 个 Vitest 文件共 52 项，以及 12 项 Node cluster / coordinate tests 全部通过。
- `npm run build`：通过，包含数据校验、TypeScript 检查和 Vite 生产构建。
- `git diff --check`：通过。
- 应用内浏览器抽查：上海共舞台、金门大戏院旧址的搜索与现用途详情正常；Foreign Cemetery / French Cemetery 仍显示为两条同址历史记录；衡山公园搜索仅返回一个结果；控制台无错误。
- `npm run test:e2e`：4 项无需浏览器的静态检查通过；其余 36 项未启动，因为本机缺少 Playwright Chromium。尝试下载约 179 MB 运行时，但 CDN 长时间无传输进度后已取消。这是测试环境缺件，不是页面断言失败。
