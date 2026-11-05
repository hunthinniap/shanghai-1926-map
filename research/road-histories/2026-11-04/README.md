# 道路沿革参考

用户于2026-11-04提供 `shanghai-roads-timeline.json`。原件见 [user-reference.json](user-reference.json)，SHA-256及358条记录的匹配结果见 [reference-audit.json](reference-audit.json)。项目按今日路名匹配参考记录，202个道路组在卡片中折叠显示待核参考。144条以沿街建筑为线索的记录保留在底稿，需另查道路沿革。另有17条参考记录未匹配现有道路组。

已核实的道路沿革位于 `src/data/roadHistories.ts`。每条按今日名称与原名共同匹配，事件链接到各道路的对应条目。进贤路采用1926年辟筑和1943年更名，思南路分别记1943年蓝田路与1946年思南路。原件保留供对照。

[inventory.json](inventory.json) 保存查询标题、重定向、修订号与各批SHA-256。[raw](raw/) 保存14批维基百科API原始响应。计划查询558个标题，目前请求420个，返回291个存在页面和129个缺页。存在页面仍需核对是否对应上海同名道路，缺页也可能有带地区限定的条目。

维基百科正文的署名及修订历史以条目页面为准。快照中的 `revid` 可用作 `https://zh.wikipedia.org/w/index.php?oldid=<revid>` 的固定版本参数。维基百科条目文字适用其页面所示的 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 及相关条款。采集脚本位于 `artifacts/collect-road-wikipedia.mjs`，在项目根目录运行时会复用已有批次。
