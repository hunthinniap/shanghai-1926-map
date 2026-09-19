# 优秀历史建筑门址及坐标补查

本轮固定调查原来 `no-source-coordinate` 的 **913 项**。已补入 **878 个来源参考点**：上海图书馆 871 项，OpenStreetMap 独立复核 7 项。其余 **35 项**保留待核：25 项有候选但存在门牌、对象范围、迁移或坐标异常，10 项未找到有据可用点位。加上原有 100 个维基参考点，地图现展示 **978 项／1058 项**；原有另外 45 项维基候选仍待核，未在本轮自动替换。

## 定位含义

门牌通常可以帮助定位，但不等于核定保护建筑的楼体中心。本轮 878 点分为 405 个门牌参考点、470 个里弄／院落／建筑群参考点、3 个有独立建筑实体支持的参考点。多门牌范围不缩成首号；同址不同保护项不合并；同一弄号下不相交的内部门牌不视为命中。

主要来源为[上海图书馆历史建筑开放数据](https://data.library.sh.cn/shnh/wkl/webapi/building/toAllBuilding)。其公开地图客户端明确将源 BD-09 坐标转为高德坐标后使用，本项目再逆转换为 WGS84；原始值、实体 URI、来源门牌和转换过程均保存。六位小数只是存储分辨率，不能视为实测精度。原始数据集及分页计数差异见 [library/README.md](library/README.md)。

补充 OSM 点为澳门小区、大新公司、尚贤坊、涌泉坊、裕华新村、批亚斯／浦西公寓、朱家角天主堂，依据明确保护编号或完整名称与门牌交叉对应。多边形采用包围框中心作为范围参考，未声称入口、某一楼体或整个范围均受保护。来源几何、版本、抓取日期和哈希均保留。

## 数据入口

- [targets.json](targets.json)：本轮开始时913项的不可变输入快照、原名、完整地址、源文件 SHA-256。
- [address-plan.json](address-plan.json)：逐条查询地址、范围及楼栋限制、同址保护项和原始地址差异。
- [results.json](results.json)：913项完整结果，含选择／暂缓理由、候选、源坐标、转换结果及来源链接。
- [locations.geojson](locations.geojson)：878个新增参考点；与原维基100点合并到 [../map-buildings.geojson](../map-buildings.geojson)。
- [review-queue.json](review-queue.json)：剩余35项，保留可继续检索的门牌查询。
- [library-residual-review.json](library-residual-review.json)：82项复杂名称及门牌的逐项人工对照。
- [library-coordinate-audit.json](library-coordinate-audit.json)：55个独立位置对照、共用坐标异常、来源计数及坐标系复核。
- [reviewed-points.json](reviewed-points.json)、[independent-residual-review.json](independent-residual-review.json)：独立来源替代点与残余对象的检索结论；原始响应在 `probes/provider/`。
- [validation.json](validation.json)：覆盖数量和生成输入哈希。

## 复核规则与限制

完整官方门牌优先；只有维基门牌命中时，必须另获官方门牌范围或具名对象支持。复杂门牌的59项人工对照和另43项地址复核分别保存于仓库 `scripts/data/shanghai-heritage-library-matches.json`、`shanghai-heritage-library-address-reviews.json`。跨街道复制点由 `shanghai-heritage-library-coordinate-review.json` 暂缓；只有经独立来源复核才能替换。

同址多实体且使用同一坐标时，若无法区分楼栋，点标记 `shared-address-unresolved`，保留全部候选 URI，不借用首条楼名。已灭失项目保留官方原说明，只作门址参考。小湾区公所已有迁移保护公示，旧来源点暂未接入。新乐路34弄官方1—3号与维基／图书馆76—80号不相交，亦保留待核。

原100个维基参考点的几何及属性逐个保持不变。对照发现其中部分可能存在来源坐标系混用，已记录审计线索；本轮没有据这些差异直接修改原点，也未把全部978点视为实地测绘结果。原官网1058条、历史道路、历史地标几何及现用途覆盖保持不变。

## 重建与检查

```sh
npm run data:heritage:library                  # 联网更新图书馆快照
npm run data:heritage:library -- --offline     # 原件离线重建
npm run data:heritage:geocode                  # 从保存证据生成结果、增强数据和地图
npm run validate:heritage:library              # 来源原件及生成文件只读核验
npm run validate:heritage:geocode              # 补点及地图生成结果只读核验
```

图书馆快照变化会触发已审核映射的来源哈希保护，须重新核对后更新映射，不能沿用旧审核结论。913目标快照不因已有点被填入而重新筛选。源门牌及原始经纬度保持可追溯。

图书馆来源声明署名、非商业使用、相同方式共享（cc2.0），不属于公共领域；保留发布方及使用条件。OSM 几何与标签注明 © OpenStreetMap contributors，遵循 ODbL-1.0。维基文字与点位的原来源归属继续分别保留。
