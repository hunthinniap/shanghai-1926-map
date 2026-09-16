# 027 批次首轮调查评审（2026-09-15）

## 范围

027 固定快照共 50 条。本轮完成历史身份、旧地址/道路和现代道路级线索筛查；原始字段、坐标、顺序和同址历史实体未改写。

## 结论

本批次结论为 **0 verified / 0 likely / 50 unresolved**；地图建议 **0 yes / 0 review / 50 no**。其中部分记录已得到现代道路级名称，但没有可靠的具体建筑或当前用途桥接。

| ID | 历史地点 | 旧地址 | 现代线索 | 等级 |
|---:|---|---|---|---|
| 10 |  | 1 RUE MONTAUBAN | 今华山路/万航渡路旧称段，需逐号核 | unresolved |
| 608 |  | 342 PEKING ROAD | 今北京东路/北京西路分段 | unresolved |
| 312 |  | 172 AVENUE VICTOR EMMANUEL III | — | unresolved |
| 340 |  | 412 AVENUE DU ROI ALBERT | 今陕西南路 | unresolved |
| 1757 |  | 153 ROUTE DES SOEURS | 旧姐妹路，现代道路逐号待核 | unresolved |
| 1099 |  | 121 HART ROAD | 今常德路 | unresolved |
| 1542 |  | 312 HUMIN | 今沪闵路旧称段 | unresolved |
| 1650 |  |  | — | unresolved |
| 1718 |  |  | — | unresolved |
| 1784 |  | 758 ROUTE RATARD | 今长乐路一带 | unresolved |
| 4154 |  | 19 ROUTE POTTIER | 今宝庆路一带 | unresolved |
| 178 |  | 524-11 AVENUE JOFFRE | 今淮海中路（分段） | unresolved |
| 201 |  | 506 ROUTE LAFAYETTE | 今复兴中路 | unresolved |
| 4133 |  | 126, 762 BUBBLING WELL ROAD | 今南京西路 | unresolved |
| 1749 |  | 1326 AVENUE JOFFRE | 今淮海中路（分段） | unresolved |
| 1758 |  | 150 ROUTE DES SOEURS | 旧姐妹路，现代道路逐号待核 | unresolved |
| 891 |  | 295 AVENUE ROAD | — | unresolved |
| 405 |  | ?? ROUTE LAFAYETTE | 今复兴中路 | unresolved |
| 4109 |  | 114 NANKING ROAD | — | unresolved |
| 1751 |  | 2032 AVENUE JOFFRE | 今淮海中路（分段） | unresolved |
| 1273 |  |  | — | unresolved |
| 1713 |  |  | — | unresolved |
| 1774 |  | 1360/1366 ROUTE LAFAYETTE | 今复兴中路 | unresolved |
| 4135 |  | 188 avenue du Roi Albert | 今陕西南路 | unresolved |
| 1177 |  |  | — | unresolved |
| 974 |  | 240 MARKHAM ROAD | 今安庆路/山海关路旧称段 | unresolved |
| 4156 |  | 597 陸家浜路 | — | unresolved |
| 1793 |  | 792 BUBBLING WELL ROAD | 今南京西路 | unresolved |
| 1777 |  | 387 AVENUE FOCH | 今延安中路／金陵西路（分段） | unresolved |
| 1254 |  | 378 FUYOU ROAD | — | unresolved |
| 1704 |  | PUDONG | — | unresolved |
| 496 |  |  | — | unresolved |
| 844 |  | 360 CHENGTU ROAD | 今成都北路 | unresolved |
| 848 |  | 357 CHENGTU ROAD | 今成都北路 | unresolved |
| 59 |  | 106 RUE BRODIE A. CLARKE | — | unresolved |
| 745 |  | 232-5 TSEPOO ROAD | 今七浦路 | unresolved |
| 917 |  |  | — | unresolved |
| 632 |  | 556 FOOCHOW ROAD | 今福州路 | unresolved |
| 4138 |  | 230 DONG JIAXING 东嘉兴路 | — | unresolved |
| 1463 |  |  | — | unresolved |
| 1545 |  |  | — | unresolved |
| 561 |  |  | — | unresolved |
| 1778 |  | 363 AVENUE FOCH | 今延安中路／金陵西路（分段） | unresolved |
| 1779 |  | 622 AVENUE JOFFRE | 今淮海中路（分段） | unresolved |
| 4137 |  | 39-77 Shaanxi nanlu | — | unresolved |
| 1746 |  | 25 AVENUE PETAIN | — | unresolved |
| 1622 |  |  | — | unresolved |
| 683 |  |  | — | unresolved |
| 1744 |  | 25 RUE MONTAUBAN | 今华山路/万航渡路旧称段，需逐号核 | unresolved |
| 1745 |  | 29 RUE MONTAUBAN | 今华山路/万航渡路旧称段，需逐号核 | unresolved |

## 说明

- 027 中多条17xx住宅/公寓记录只有历史英文名称与旧门牌；道路翻译可缩小范围，但不能证明今天仍为同一栋楼。
- 多条机构记录门牌为空（例如机场、兵营、墓地、学校和会馆），现址只能依靠后续地方志、地籍或机构史补证。
- 不把道路级线索、同号地址、近邻 POI 或搜索未命中解释为建筑存续/拆除；同址不同时期实体继续独立保留。
- 本轮未写 public/data，未运行 data:build，未调坐标/道路/分组，未 commit 或 push。

## 下一步

优先补查有明确门牌的公寓、剧场、银行和宗教地点；对无门牌记录先查旧地图/地方志，能形成现址—用途闭环后再从 unresolved 晋级 likely/verified。
027 结果已编译到 research/unresolved-landmarks/027-results.json 和 scripts/data/unresolved-landmarks-027-research.json，地图保持原样。
