# 无名住宅展示归并与张园来源补充（2026-09-22）

## 无名住宅

本轮按用户要求，对英文仅为 `Apartments` 或 `Residential Complex`、且无中文专名的历史建筑记录，就近归入同一路名对应的住宅类优秀历史建筑卡。限制为名录参考点相距不超过 125 米；这是一种地图展示归纳，不是同楼、同宗地、建筑群成员或现用途核定。每条 Virtual Shanghai 原始 ID、旧门牌、年份及原坐标保留在审查候选与卡片史料中。

已归入 15 条：`219→4C017`、`294→2C009`、`348→2C010`、`369→2B007`、`377→5B026`、`378→5B037`、`382→3B017`、`390→5D067`、`1009→2B004`、`1759→5D006`、`1761→5D063`、`1766/1767→5D016`、`1781→5D045`、`1782→5D106`。其中 #1766 与 #1767 共用湖南路 276 号住宅卡，但分别保留旧 266 与 273 ROUTE CHARLES CULTY。#348 与已确认的 King Albert Apartments／陕南村记录共卡，#1759 与已确认的 Belmont Apartment／襄阳公寓记录共卡；二者的无名记录只作邻近语境，不继承具名记录的实体身份。

`67`、`438`、`1193`、`1773` 没有满足同路名及 125 米条件的住宅锚点，继续独立显示。已有中文专名的 `314` 步高里、`426` 建业里、`456` 上海新村等仍沿用其原有具名核定，不降格为邻近匹配。“Apartments for Foreigners”不是本轮所指的纯无名 `Apartments`，也未自动吸附。

可复核候选及未归并理由位于 [`supplemental-candidates.json`](../2026-09-20-heritage-card-review/supplemental-candidates.json) 的 `residentialContextPolicy`；逐条决定位于同目录的 `review.json`。本轮生成后为 185 个已接受关系、179 张共卡。

## 张园

太古地产 [2022 年 11 月 28 日新闻稿](https://www.swireproperties.com/zh-cn/media/press-releases/2022/20221128_zhangyuan/)直接记载：张园 1885 年向公众开放，1918 年闭园后转为住宅区；2022 年张园西区率先开放，包含 16 幢历史建筑，导入商业、展览与公共活动。该资料已加入张园现有 `Chang Su Hos Garden`／`Zhang Garden` 共享地点卡的来源和分期说明。新闻稿关于东区的当时计划不作为 2026 年已完工证据，也不推断 19 世纪园内建筑全部保存。

为维持此前身份筛查的冻结输入哈希，张园的后补来源放在 `src/data/landmarkSiteSourceAdditions.ts`；原 `landmarkSiteLinks.ts` 不改。
