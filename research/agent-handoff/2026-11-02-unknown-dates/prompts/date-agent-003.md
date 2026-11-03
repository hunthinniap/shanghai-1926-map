本次分配：date-agent-003。输入文件：date-agent-003.json；共49条事件，39组。
输入文件SHA-256：6fc705da856eab200b675377f41628613afde2accaade66e50a8ab3e668f69b6
请逐项返回结果，输出文件名：date-agent-003.result.json。

# 任务：上海历史建筑与机构的年代核实

你会收到一个`date-agent-NNN.json`。只调查这个分包，逐条输出结果JSON，不修改地图或项目数据。输入里的`task_id`与`task_fingerprint`必须原样返回；不能删改名称、门牌、名录ID或Virtual Shanghai ID。

目标是为每条“年份未知”找**对应具体名称和用址的有据年代**，不要求一定填出精确年份。优先核实专名建筑、学校、医院、商号、领馆、公共机构，再处理泛称。分组只是为防止多个agent重复调查，**不构成同栋建筑或同一地点的证据**。

## 先理解每个条目的问题

1. `建造年代`：查这一栋或明确组成部分何时建造、竣工、重建。设计、开工、竣工、加层、改厅、修缮须分开；机构成立、住户入住、挂牌保护均不等于建造。
2. `名录公布时名称`：查该单位何时迁到、改称或已在这个门牌使用。名录列名不意味着建造时已经使用该名。若只找到某年在此办公，写`documented_use`，不要写成最早迁入。
3. `名录原名称`：核实这个名称在该地址出现的年代；原名称字段有时也可能是后期单位。
4. `史料记录`：为原始名称／旧门牌找独立用址记录，区分机构前身、迁址、改名、扩建及不同楼栋。
5. 多个单位写在同一名称里时，分别提出`findings`，不能强行给整组一个年份。只核实了其中一部分，顶层状态用`partial`。

先读每条的`research_question`、`cautions`、原始身份字段与旧查询。`leads`最多给3条候选，不是已经确认的来源，可能完全无关；旧查询仅保留前5个结果，`additional_results_not_reviewed`提示尚有其他结果。

## 检索入口与方法

优先入口：[上海市地方志办公室旧版方志数据库](https://szfz.shtong.gov.cn/difangzhi-front/book/index?oneId=1)。常用志书有《上海名建筑志》《上海通志》、各区志，以及宗教、教育、卫生、金融、出版、外事、审判、邮电、公用事业等专业志。可补用档案馆、政府、机构自身院史／校史、原始年报、地图和行号录。可靠报道或研究只能按其实际证明范围使用。

结合：中文繁简／异体字、英文或法文旧名、机构别名、旧路名、今路名和完整门牌。复杂名称拆开检索，但保留它们各自的身份。不要直接把某个同名机构的成立年搬到地图点。

**地址检索有漏报**：本站即使有“黄浦路15号”原文，用完整门牌搜也可能零结果。应补搜路名、单位名、附近明确地标，再到正文核门牌。路名命中与空间邻近只能提供线索，不能证明同楼或门牌改号。

如果页面打不开，可尝试如下公开接口（不涉及登录或内部数据；遵守站点限流，不高并发）：

### 公开全文检索

`POST https://szfz.shtong.gov.cn/xc-search-front/search/data/api/query`

JSON示例（替换keyword；指定志书时才添加`attrs`）：

```json
{
  "pageNo": 1,
  "pageSize": 20,
  "keyword": "要检索的名称",
  "searchScope": "",
  "timeScope": "",
  "orderType": "",
  "orderFields": ["_score", "display_date"],
  "orderTypes": ["desc", "desc"],
  "scopeMatchMoreExact": "1",
  "businessType": "Book",
  "attrs": {"bookName": "上海名建筑志"}
}
```

响应的`list`是搜索结果，`txt`是摘要，不能代替全文。`url`可能使用`www.shtong.gov.cn`；可保留所有路径参数改用`szfz.shtong.gov.cn`试读。输入候选已给出`alternate_url`。

### 读取原章节

从实际结果链接取得`parentNodeId`、`nodeId`与`type`：

`POST https://szfz.shtong.gov.cn/difangzhi-front/book/getContentById`

使用`application/x-www-form-urlencoded`，字段为`parentNodeId`、`nodeId`、`type`。响应`data.content`为章节HTML，`data.nodeName`为章节名。须阅读正文、表头、上下文和注释。不要凭空编造参数或没有打开的来源。

如果接口无法访问，记录实际失败并使用可访问替代来源。不能把请求失败写成“未找到史料”。网页“2009/10/22”之类发布／入库时间不是建筑事件年代。

## 判断规则

- 只有名称、用址和年代语义均闭合，才可以`verified`。提供原文所在章／页及短摘录，说明它为何对应本条目。
- 新旧门牌必须有改号、迁址、地图／行号录对照等独立依据。旧街名相同、号码接近、坐标相同、现在在同一院内均不足以证明同栋。
- 院区／地块用址可按`same_site`提出机构使用记录，不能顺便宣称院内每栋楼同年建成。建筑建造结论应对应`same_building`或明确的`building_component`。
- 年代范围、某年代、约年、某年前后照原文保留。不得把“80年代”填为精确1980年；`before`／`after`时`year`是来源给出的边界，不是推算出的某年。
- 两个来源冲突，列出各说及对象／范围差异，用`conflict`或保守范围，不暗选一个。
- 机构前身创办、在其他地址使用、购入产权、现名恢复、挂牌保护必须区分。
- 至少尝试名称、别名／语种、地址／路名这几种可行路径。没有足够身份信息可直接用`insufficient_identity`并说明缺什么，不编造具体单位。
- 研究结果只提出回填建议；保留原数据，交由项目方逐条复核后导入。

## 回传格式

返回一个可解析JSON文件，命名`date-agent-NNN.result.json`。不要用Markdown代码围栏包住整个文件。顶层：

```json
{
  "schema_version": 1,
  "snapshot_id": "shanghai-unknown-dates-2026-11-02",
  "batch_id": "输入分包中的batch_id",
  "input_sha256": "分包prompt提供的SHA-256",
  "researcher": "你的标识",
  "completed_on": "YYYY-MM-DD",
  "results": []
}
```

`results`必须覆盖分包中的每个`task_id`，恰好一次。可以从同编号`.result.json`模板起填。每条包含：

- `task_id`、`task_fingerprint`：原样回传。
- `status`：`verified`／`range_only`／`partial`／`candidate`／`conflict`／`not_found`／`insufficient_identity`／`access_blocked`／`not_researched`。`not_researched`只能诚实标识尚未做的工作，不能把它包装成已完成。
- `summary`：用中文说明结果与限制。
- `recommended_action`：`add_dated_use_event`／`set_construction_date`／`add_range_note`／`retain_unknown`。
- `findings`：每个独立有据结论一个对象；没查明时用空数组，不能随便写零年。字段如下：
  - `name`、`address`：结论实际对应的名称和门址。
  - `date_type`：`construction`／`completion`／`reconstruction`／`alteration`／`opening`／`move_in`／`rename`／`documented_use`／`historical_name`。
  - `date`：`text`（如“1963年5月”或“1980年代”）、`year`、`end_year`、`month`、`day`（未载时用null）；`precision`为`day`／`month`／`year`／`decade`／`range`／`unknown`；`qualifier`为`exact`／`circa`／`before`／`after`／`unspecified`。
  - `identity_scope`：`same_building`／`building_component`／`same_site`／`institution_only`／`unverified`。
  - `address_match`：`explicit_same_address`／`verified_renumbering`／`site_only`／`not_established`。
  - `identity_evidence`：解释名称与门牌如何对应，不能只说“距离近”。
  - `source_ids`：引用下面`sources`中的ID，至少一项。
  - `caveat`：对象范围、连续使用与否、不确定性等限制，没有则空字符串。
- `sources`：每项包含`source_id`、`title`、`url`、`publisher`、`source_type`、`accessed_on`、`read_full_text`、`section_or_page`、`short_quote`、`supports`。`source_type`用`gazetteer`／`archive`／`official_institution`／`scholarly`／`press`／`other`。只能列实际访问过的来源；`read_full_text`须如实写。摘录简短，每个来源总引文不超过25个词，中文尽量不超过40字，其他内容转述并保留定位。
- `searches`：每次有效尝试包含`query`、`entry_or_domain`、`opened_urls`、`outcome`、`access_issue`（无问题用null）。
- `remaining_questions`：仍缺的证据，用字符串数组。

`verified`必须有读过完整正文的来源、明确用址对应、可理解的日期含义；不能只提交搜索摘要。`range_only`表示来源只支持范围，不能输出一个冒充精确年的结论。来源暂时打不开且无替代证据时，用`access_blocked`并保留访问记录。

完成后自查：事件ID齐全且无重复；源名称和门牌没有被你改写；每个日期的具体对象都明确；没有把机构成立年、其他门址年份、保护公布年或网页发布日期当作本条目所需年代。最后仅交回结果JSON及必要的证据附件。
