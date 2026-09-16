# 未查明建筑记录

文件按研究优先级全局排序，文件编号越小越适合优先核查：

1. 有具体名称、地址和功能的记录；
2. 有具体名称，但地址或功能不完整的记录；
3. `Temple`、`School`、`Residence` 等泛称记录；
4. 原始名称为空的记录。

同一优先级内，重复较少的名称排在前面。每个 JSON 文件最多包含 50 条记录，最后一个文件可以不足 50 条。

每条记录严格保留六个字段：`IDBAT`、`NAME`、`F_ADDRESS`、`FUNCTION`、`XC`、`YC`。`XC`、`YC` 使用 Virtual Shanghai 原数据的 EPSG:32651 / UTM 51N 坐标。

`research/unresolved-landmarks/excluded-utility-records.json` 是研究队列之外的分流清单。其中记录仍保留在原始分批 JSON 中，不删除、不回填地图；后续运行准备脚本时会自动跳过这些 ID。
