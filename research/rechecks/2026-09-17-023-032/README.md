# 023—032 重新研究

研究日期：2026-09-17—18。原始基线：`f5e341e69979a45c0a8a77a2a68132021eeb0eb2`。固定输入为 `research/unresolved-landmarks/023-input.json` 至 `032-input.json`，共 **460 条、10 个批次**。

本轮460条均已进行针对性检索并交付结果、证据和评审。**436 条完成本轮有限复查，24 条部分完成，0 条未开始**。部分完成项仍有关键原页、附图或网页未能核读，不能称全部补证已结束。已完成也可能仍为 unresolved：有限检索没有建立现代对应，不等于历史地点不存在。

现代对应：**45 verified、31 likely、384 unresolved**。地图建议：**8 yes、68 review、384 no**。全部建议仅供审核，尚未回填地图。研究日志中的逐条查询条目合计1269；共享查询可出现在多条记录中，此数不是独立请求数或独立来源数。

本目录是023—032本次复查的当前评审版本。原批次文件及 `scripts/data` 保留历史结果；`research:progress` 尚不索引本目录，不能用其旧统计推断本轮结论。没有执行导入、`data:build`、commit或push。

## 批次交付

| 批次 | 条目 | verified | likely | unresolved | yes / review / no | completed / partial | 文件 |
|---|---:|---:|---:|---:|---|---|---|
| 023 | 50 | 9 | 4 | 37 | 1 / 12 / 37 | 48 / 2 | [结果](023-results.json) · [证据](023-evidence.json) · [评审](023-review.md) |
| 024 | 50 | 8 | 3 | 39 | 2 / 9 / 39 | 50 / 0 | [结果](024-results.json) · [证据](024-evidence.json) · [评审](024-review.md) |
| 025 | 50 | 8 | 3 | 39 | 2 / 9 / 39 | 50 / 0 | [结果](025-results.json) · [证据](025-evidence.json) · [评审](025-review.md) |
| 026 | 50 | 7 | 3 | 40 | 1 / 9 / 40 | 50 / 0 | [结果](026-results.json) · [证据](026-evidence.json) · [评审](026-review.md) |
| 027 | 50 | 6 | 5 | 39 | 0 / 11 / 39 | 45 / 5 | [结果](027-results.json) · [证据](027-evidence.json) · [评审](027-review.md) |
| 028 | 50 | 4 | 3 | 43 | 0 / 7 / 43 | 44 / 6 | [结果](028-results.json) · [证据](028-evidence.json) · [评审](028-review.md) |
| 029 | 50 | 2 | 7 | 41 | 1 / 8 / 41 | 39 / 11 | [结果](029-results.json) · [证据](029-evidence.json) · [评审](029-review.md) |
| 030 | 50 | 1 | 2 | 47 | 1 / 2 / 47 | 50 / 0 | [结果](030-results.json) · [证据](030-evidence.json) · [评审](030-review.md) |
| 031 | 50 | 0 | 1 | 49 | 0 / 1 / 49 | 50 / 0 | [结果](031-results.json) · [证据](031-evidence.json) · [评审](031-review.md) |
| 032 | 10 | 0 | 0 | 10 | 0 / 0 / 10 | 10 / 0 | [结果](032-results.json) · [证据](032-evidence.json) · [评审](032-review.md) |

## 可供回填审核的范围

yes只适用下表具体ID与所述尺度，不自动批准同组的其他历史实体。空间结果均针对各自原点；不移动历史点去迎合现代建筑。

| 批次 / ID | 历史记录 | 现代用途 | 尺度与限制 |
|---|---|---|---|
| 023 / 1385 | 裕源紗廠 | 静安河滨花园（原裕源纱厂地块）：住宅社区 | site；仅ID 1385原厂地块在原点所在住宅社区的site级用途；ID 1191保持hold，不自动继承。 |
| 024 / 1245 | 鄭家木橋 | 延安东路（原郑家木桥位置）：城市道路及交叉口通行 | site；城市道路及交叉口通行 |
| 024 / 1573 | 正始中學 | 上海交通大学长宁校区：大学继续教育及培训校园 | site；大学继续教育及培训校园 |
| 025 / 1559 | 東亞同文書院 | 上海交通大学徐汇校区：大学教学、科研及校园配套 | site；大学教学、科研及校园配套 |
| 025 / 1560 | 交通大學 | 上海交通大学徐汇校区：大学教学、科研及校园配套 | site；大学教学、科研及校园配套 |
| 026 / 32 | 青年會 | 八仙桥基督教青年会大楼：协会办公及酒店住宿 | building；协会办公及酒店住宿 |
| 029 / 1534 | 寺廟 | 龙华寺：佛教宗教活动及寺院参观 | site；原寺院场地的宗教和参观用途；原点在大雄宝殿内，无需外推全部单殿存废。 |
| 030 / 1519 | 醫院 | 复旦大学附属中山医院（老院区）：医院诊疗、住院及医疗教学服务（原医院场地） | site；泛名Hospital原场地，今中山医院老院区医疗用途 |

## 主要修正

- 旧yes中的701浙江电影院、357新乐路教堂、1284主显堂旧址、601虎丘公寓均改为review。分别存在原点在邻楼、教堂辅助用房与主体用途混用、住宅推断与现办公楼不符、原点在公寓楼面外等问题。
- 1573正始中学只支持今交大长宁校园教育用途，不把原点误认作保存的北楼。1519泛称医院只支持中山医院院区医疗用途，不写成3号楼。
- 1559与1560的交大徐汇校园对应分别核查，1938—1945东亚同文书院占用校舍的历史保留；不将同址记录合并。
- 1383永安三厂只确认部分厂地承接，保留38/50亩和项目分期缺口。1385裕源厂的yes不扩展到同坐标1191内外棉九厂，后者独立承接证据不足，保持hold。
- 1693中华大戏院可证2001年拆除，但旧基址处的道路/绿地用途未闭合，保留likely/review，relationship=null。
- 32青年会为楼级复合用途建议：历史沿革与现文旅目录相符；原点在所取楼面外约4米，采用已说明的楼缘相容判断，并非inside。若导入规则要求点严格入楼，应继续review，不能移动坐标。

完整状态变化见 [changes.json](changes.json)，所有记录新增证据和未变化原因见各批evidence中的researchProgress.delta。独立审计及处理记录见 [审计报告](audit-023-024-027.md)。

## 尚未结束的补证

以下partial项已实际检索，但关键来源读取或必要核对尚有缺口。具体目标来源、动作与验收条件见 [followup-queue.json](followup-queue.json)。其余review/no条目的后续方向保存在各自evidence，不能因为未列此表就当成已查明。

| 批次 / ID | 历史记录 | 本轮状态 |
|---|---|---|
| 023 / 1566 | 郁氏山壯 | unresolved / no；partial |
| 023 / 732 | 虞洽卿公館 | unresolved / no；partial |
| 027 / 4133 | 夏令酉克影戲院 | unresolved / no；partial |
| 027 / 1713 | 江灣跑馬場 | unresolved / no；partial |
| 027 / 4156 | 心中學校 | verified / review；partial |
| 027 / 1746 | 原库未具名 | likely / review；partial |
| 027 / 4138 | 上海人力车夫协助会 | likely / review；partial |
| 028 / 488 | 工廠 | unresolved / no；partial |
| 028 / 784 | 上海慈願難民収容所 | unresolved / no；partial |
| 028 / 1169 | 上海難民第二収容所 | unresolved / no；partial |
| 028 / 1180 | 収容所 | unresolved / no；partial |
| 028 / 197 | 郵局 | verified / review；partial |
| 028 / 1702 | 傅家玫瑰聖母堂 | likely / review；partial |
| 029 / 988 | 小學及幼稚園 | unresolved / no；partial |
| 029 / 1759 | 原库未具名 | likely / review；partial |
| 029 / 1767 | 原库未具名 | unresolved / no；partial |
| 029 / 1781 | 原库未具名 | likely / review；partial |
| 029 / 96 | 中小學校 | likely / review；partial |
| 029 / 783 | 益壽寺下院 | unresolved / no；partial |
| 029 / 348 | 原库未具名 | likely / review；partial |
| 029 / 378 | 原库未具名 | likely / review；partial |
| 029 / 1009 | 原库未具名 | likely / review；partial |
| 029 / 1230 | 北桜華里 | unresolved / no；partial |
| 029 / 256 | 中學 | unresolved / no；partial |

## 证据与验证

每条保留精确原输入、实际检索、来源阅读级别、六个字段判断、完整组员、原点转换、回填尺度、冲突与下一步。原始PDF/网页不整篇复制入库；证据记录具体URL、原页或段落、实际阅读方式和限制。搜索摘录、转载、全文和无法访问分开标注；来源发布时间不以抓取日期替代。

空间检查使用完整适用边界或有说明的人工交叉核对；单纯POI邻近不算同址。WGS84与GCJ-02分列。OSM是社区地图，并非法定地籍；历史点精度未知、楼缘、迁址、分割和规划阶段均保留限制。

已运行全量 [validate-recheck.py](validate-recheck.py)，结果见 [validation.json](validation.json)：460条ID/顺序、严格八字段、证据结构、合法状态、来源引用、结论一致性和完整组员通过；517个独立组员重新执行proj4转换；461个基线文件SHA-256不变；5507个地图要素、3832条道路不变。此前 `npm run validate:data` 亦通过（5507历史要素、23公园、167地铁区间、310站点）。这些检查验证结构和数据保护，不替代历史事实审查。

复验命令（只更新本目录验证报告及validation字段）：

```bash
python3 research/rechecks/2026-09-17-023-032/validate-recheck.py
```
