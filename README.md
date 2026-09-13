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

运行 `npm run research:progress` 会核验已登记外部文件的校验和及记录一致性，并更新当前 JSON 文件与调查进度的对照表。`npm run research:unresolved:prepare -- NNN` 会跳过已有外部调查或正在补证的记录。登记进度不会执行地图回填。

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
