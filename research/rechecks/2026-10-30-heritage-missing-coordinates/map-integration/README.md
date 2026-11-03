# 有来源及部分定位坐标回填

用户批准“可以回填有来源 和 部分有定位”后，原80项中的**66项**已进入历史建筑图层：50项有来源参考点，16项部分定位。图层现为**1044／1058项**，尚缺14项（13条候选待核、1条无可用坐标）。

每条名录保留一个主标记，以所列第一个来源位置作为参考；全部**76个组成物／参考位置**在数据和详情中保留，没有把多栋校园建筑简化成无说明的校园中心。部分定位详情默认显示已定位对象、未定位部分及限制；来源原值、坐标系、转换及推断依据保存在增强数据与回填档案中。

- [回填核验JSON](validation.json)：精确ID集合、原978项逐字段不变、官方1058项哈希不变、66项增量、16项部分限制和76个来源位置完整性。
- [原地图快照](map-before.geojson)：批准前978项，不随当前地图重建覆盖。
- [批准清单](../../../../scripts/data/shanghai-heritage-coordinate-approvals.json)：冻结每条ID、名称、官方门牌、状态、点数及研究来源哈希。
- [生产回填来源档案](../../../../public/data/shanghai-excellent-historical-buildings/geocoding/reviewed-coordinate-backfill.json)：66条的完整来源位置。
- [13条候选再次核查](../../2026-11-01-candidate-coordinate-recheck/README.md)：本轮仍不足以晋级，保留原候选与新增排除理由。

坐标批准没有新增历史地标共卡关系。已有12条同址注释仍与名录分卡；187条原关联配置与16条用户批准共卡配置不变。回归测试比较新增前后的全部既有共卡对象与历史要素，结果一致。

复现与验证：

```powershell
node --preserve-symlinks --preserve-symlinks-main scripts/enrich-shanghai-heritage-wikipedia.mjs --offline
node --preserve-symlinks --preserve-symlinks-main scripts/enrich-shanghai-heritage-wikipedia.mjs --check
node --preserve-symlinks --preserve-symlinks-main research/rechecks/2026-10-30-heritage-missing-coordinates/map-integration/verify.mjs
node --preserve-symlinks --preserve-symlinks-main research/rechecks/2026-10-30-heritage-missing-coordinates/audit-evidence.mjs
npm test
npm run build
```

离线重建校验批准研究及已选来源快照，防止新判断无意覆盖已批准内容。原证据审计另逐份核对274个来源哈希，重算35份OSM几何、40次坐标转换并核验16个坐标系推断标记。源码中的Windows换行兼容仅在原始SHA-256及字节数同时匹配时恢复来源文本，不放宽真实内容校验。

验证结果：227项前端测试、93项Node测试和生产构建通过；桌面1440px及手机390px实际浏览器均确认新上院部分定位限制、圣约翰六个参考位置、单张详情卡及无横向溢出。截图与浏览器结果保存在仓库 `artifacts/heritage-coordinate-partial-390.png`、`heritage-coordinate-partial-1440.png`、`heritage-coordinate-browser-check.json`。

两次完整离线重建后的增强名录、主图层、生成校验文件和66项回填档案字节哈希一致；采集器及enrichment的只读检查也通过，记录在 `artifacts/heritage-offline-replay.json`。
