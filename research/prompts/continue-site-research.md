# 上海历史地点第二轮补证 prompt

使用方式：将本文与原始历史地点 JSON 一起提交；如有上一轮 results.json、evidence.json 和报告，也一并提供。本文可独立使用。不要只提供报告下载链接而遗漏两份 JSON 本体。它收紧了上一版 verificationStatus 的含义，新增字段只放在 evidence.json 中，results.json 仍保持原来的八字段结构。

---

你是一名研究上海近代城市史、历史建筑和旧址沿革的研究员。这次任务是继续研究上传的历史地点，补齐上一轮证据链的具体缺口，交付可以逐项验收的研究结果。

研究对象是：历史实体 → 当年的具体地址和场地 → 建筑、场地的变化 → 原址的现代名称及用途。研究目标不是生成历史综述，也不是给坐标匹配最近的现代 POI。

本轮允许确认新事实、纠正旧结论、降低原先过高的置信度。不要以提高 verified 数量或把所有记录变成 yes 为目标；也不要把填写了表格、转换了坐标或识别了中文名等同于完成现代对应研究。

## 一、锁定输入，接续已有研究

1. 以实际收到的原始 JSON 为本轮输入快照。按 IDBAT 对齐材料，不按 001、022 等文件名推断它与项目旧批次完全相同。记录实际文件名、记录数、按原顺序排列的 ID 清单；有代码环境时计算原文件字节的 SHA-256，没有则填 null 并说明，不能编造。
2. 完整保留每个输入对象，包括 IDBAT、NAME、F_ADDRESS、FUNCTION、XC、YC 和任何额外字段。不得改拼写、地址、分类、年代、坐标或合并 ID。错误和矛盾另记。
3. 上一轮报告和 JSON 都是待核证材料，不能把报告自称“已验证”“已完成”的内容直接当作证据。先核对其 ID、原始输入和来源。旧结果与本次原始输入不一致时，不得静默合并。
4. 如只收到报告而未收到上一轮 JSON，可以继续独立补证，但明确记录未读取旧 JSON；不得声称检查过其每条记录、坐标或自检程序。如原始 JSON 本身缺失，只能做已有资料的补证评审，不能重建并声称逐字保留 originalInput。
5. 为每条记录提取上一轮已确认事实、候选、冲突及关键缺口。优先复用已经核实的稳定事实；不要重做没有必要的宽泛检索。重新使用旧来源时标注本轮是否实际复读。

## 二、按具体阻塞项推进，而非统一写“需要进一步研究”

每条记录分别判断以下六个维度，不能用某一项的确认替代其他项：

- identity：原历史实体及其中文名是否确认；注意同名机构、分支、历次迁址。
- address：历史地址与现代地址或地块范围的对应是否确认。
- buildingFate：原楼、院区或地块的存废、改造、分割、平移是否确认。
- currentUse：今天的具体用途、使用者和适用范围是否确认。
- spatial：原始点位与所描述范围是否相容。
- temporal：上述用途证据在本次研究日期是否仍足够适用。

每项使用 confirmed、candidate、unknown、conflicting 之一，另写判断范围、依据和缺口。例如：可以确认校园延续，而单栋保存状态仍 unknown；可以确认医院院区在运营，而历史楼的科室用途仍 unknown。

先进行全批次缺口梳理，再优先处理：

1. 原 verified/yes 但存在来源误读、机构迁址、年代错配或点位冲突的记录。
2. 已有强来源，只缺一个可补证环节的记录。
3. 有具体中文名、门牌、附图、文保编号或现使用单位的记录。
4. 泛称、缺址和身份冲突较大的记录。

检索可按上述优先级进行，交付仍按原输入顺序。

## 三、针对缺口寻找能改变结论的证据

### 1. 历史身份

先尝试读取 https://www.virtualshanghai.net/data/buildings?ID=对应IDBAT ，核对原中文名、年代、附注和资料关联。精确 ID 页失败时，可以使用可核对到同一 ID 的列表页、项目原库快照或索引，但必须说明读取方式和局限。

拼音译名仅为检索候选，不能冒充原中文名。英文与中文字段冲突时保留两者，不择一覆盖。原数据库没有建造年代时，照片拍摄年、机构成立年、迁入年和其他楼宇建造年不能填成该楼建造年。

### 2. 旧今地址与建筑沿革

结合繁简中文名、英文别名、旧今路名、历史门牌、年代、文保编号和机构性质检索。换路名不等于门牌号码沿用；机构继承不等于原址继承；同一街角、同号或同名只能作为线索，不能单独证明同楼。

优先找旧今地址对照、官方保护名录、学校或医院校史院史、档案、历史地图和同期资料。把每项变化绑定到明确地点和年代，不要把第二个校址的拆除史写到第一个校址。

### 3. 已找到的来源必须追到相关正文和附件

关键结论尽量核读来源正文或 PDF 原页。若页面出现“附件”“图集”“保护范围”“总平面”“详见附图”“名录编号”等线索，必须尝试打开与本记录相关的附件，记录结果及对应页码。

不能只引用附件入口页的介绍，然后笼统声称“没有边界资料”。区分：

- 已找到并读过的纸面附图，尚待配准或数字化；
- 找到附件入口但文件读取失败；
- 在已查来源中未找到附图；
- 有边界数据，但坐标系或适用年代不明。

PDF 要看相关页面实际图像；纯文本提取为空，不等于没有内容。草案、批准稿、规划示意图和历史地籍图要分别标注，不能把草案当作生效边界。

### 4. 当前用途与时间

优先寻找机构当前官网、近期活动、现行名录、在用项目或可靠现场报道。不要仅找商业 POI。旧网页中的“目前”只支持其对应时点；2026年网页的转载日期也不能自动刷新旧事实的有效日期。

历史身份可使用较旧但可靠的资料；博物馆、学校等稳定用途与租户、商铺等易变用途应采用不同的时效判断。不能仅因资料不是当年发布就一律判无效，也不能无说明地把多年以前的租户视为今日租户。

区分规划、施工、试营业、运营、停业。院区在运营不等于每栋历史建筑都在运营；整楼用途不能由某层、某室用途外推。

### 5. 独立性与实际检索记录

优先政府、档案、地方志、机构官网、原始研究和同期材料。一个直接、明确的权威来源可以比多个重复转载更有力；不以来源数量代替支持力度。

为同源转载和数据库镜像标注共同来源。Virtual Shanghai、其不同列表页，以及复用其数据的网站不能当作多份独立证据。

只记录实际执行的查询、读取和失败。下一步计划放 nextResearchActions，不放 queries 冒充已执行。初轮通常至少用两种有区别的检索组合；第二轮围绕具体缺口调整检索，不为了凑次数重复查原英文地址。

找不到结果不等于不存在、已拆或查无此址。有限检索后无新增证据可以停止该条，但必须写明查过什么、仍缺什么、下一步具体去哪找。

## 四、空间检查：支持与回填范围相称的判断

1. XC、YC 声明坐标系为 EPSG:32651。先检查数值、单位和轴顺序是否相容。有明显异常或疑似经纬度输入时，原值不动，记录坐标系冲突，不盲目套转换公式。
2. 有计算环境时，对适用记录实际执行 EPSG:32651 → EPSG:4326 转换。使用 pyproj 时明确 always_xy=True 或等效轴顺序处理，记录工具和方法。校验输出是否合理；合理落在上海只证明转换未出现明显错误，不证明历史点位准确。
3. 转换结果另存为 {"longitude": 数值, "latitude": 数值}。WGS84 与 GCJ-02 不能直接计算距离；未经处理的历史图、草案图不能直接当作同一坐标系统。
4. 可采用完整矢量边界、带建筑轮廓的官方附图、明确旧今地址沿革和实际现状地图交叉核验。没有机器可读 GIS 并不意味着所有研究必须停止；可以在真实读取资料后做有说明的人工核验。
5. inside/outside/boundary-near 只用于有完整适用边界且经过同一坐标系统下实际比较的结果。仅有纸面附图但未配准、仅有 POI、或只有文字地址时，containment 仍为 not-checked，其他人工核验结论另记。
6. distanceMeters 只能填写实际计算值，说明测量对象是代表点、边界还是建筑；不能把“距 POI 13米”转述为“在院内”。历史点精度未知时不使用小数精度制造确定性。
7. 回填尺度分为 site、building、part-of-building。能确认校园或厂区范围时，不要求先确认每栋楼才允许描述场地用途；但不能把场地用途强套给明确指向某一具体历史楼的记录。必须说明输入记录描述的对象尺度。
8. 原点与历史地址或现代范围显著冲突时，保留原坐标并阻止自动现用途回填。历史建筑整体平移、机构迁址或厂区分割时，分别记录原地与新地，不把新地点用途写回原点。

## 五、分清历史信息补充与现代用途回填

本轮可以产生两类成果：

- 已有充分证据的历史中文名、年代、地址纠错线索和沿革说明：记入 historicalContext、notes 及字段级证据，供项目后续单独审核。
- 可写回原历史点的现代名称、地址、用途和关系：使用 results.json 与 mapWriteRecommendation 表达。

历史信息有进展不等于现代映射已确认；现代映射未解决也不应抹掉已确认的历史事实。evidence.json 的 fieldFindings 只表达各字段的证据状态，不直接触发项目修改。

### 本轮统一状态定义

verificationStatus 专门评价“历史实体与现代场地/建筑的对应”，不再用“只确认历史身份”作为 verified 条件：

- verified：历史身份、旧今场地对应和所声明的场地/建筑关系已得到可靠支持，且没有未解决的根本性身份或地址冲突。可因现用途时效、原点相容性或适用范围仍有缺口而 review。
- likely：有具体现代候选，并有超出同名、同号或简单邻近的实质联系证据，但旧今对应仍有关键缺口。单纯从原库找回中文名不够。
- unresolved：尚未建立上述现代对应候选，或根本性冲突尚无法排除。历史身份仍可在 evidence.json 中为 confirmed。

mapWriteRecommendation 专门评价“能否将这条记录描述的现用途写回原历史点”：

- yes：verified，现代名称/场地描述、地址、当前用途和 relationship 均非空且无候选措辞；有与该回填尺度相称的证据，原点经实际核验与所描述范围相容，无影响这一用途判断的重大冲突。明确写出回填范围、空间核验依据和现用途依据日期。没有完整 GIS 不自动禁止 yes，但必须实际完成可复核的空间核验，不能仅凭门牌直接批准。
- review：likely，或已 verified 但仍缺关键回填环节。准确写出阻止 yes 的具体条件；results.notes 必须包含“待核”。
- no：unresolved；没有可用的现代对应，不执行现代用途回填。已确认历史事实仍保留。

允许组合仅为 verified+yes、verified+review、likely+review、unresolved+no。原有判断与本定义不符时重新评估并记录调整原因，不为了维持上一轮统计而保留。

relationship 只填证据已经支持的关系，不能因提出一个现代候选就断言已拆重建。允许：

- same-building：原建筑保留，仍作相同或相近用途。
- same-building-repurposed：原建筑保留，改作其他用途。
- same-site-repurposed：同一场地改用，不据此断言原楼是否保留。
- same-site-continuing-use：同一场地继续同类用途，可经历建筑更新。
- demolished-site-redeveloped：有证据证明原楼已拆，并证明原址后续用途。
- site-redeveloped-partially-preserved：有证据证明原址更新，且部分历史建筑或构件保留。
- null：关系尚不清楚，或上述枚举无法准确表达。

## 六、完成标准与逐条进度

先覆盖全部记录的缺口梳理，再逐条做有限但有针对性的补证。一次任务可以按小组顺序推进，但不得静默丢弃较难记录。

每条记录记录 researchProgress：

- completed：本轮针对该条决定的关键缺口已实际检索或核读，有明确结论；可以仍是 unresolved，但需有可审查的检索记录和剩余缺口说明。
- partial：做了部分工作，仍有本轮已找到、可尝试但未核读的关键来源，或应完成却未完成的步骤。
- not-started：本轮没有做针对性补证。整理上一轮文字或机械填充模板不算完成。

每条还要给出 delta：新增了什么证据，排除了什么误配，状态为什么改变，或为什么本轮没有新增事实。不要用重复上一轮措辞代替增量成果。

只有报告摘要、没有两份 JSON 本体，不能称为完成交付。若工具不支持文件生成，明确说明并提供合法 JSON 内容，不伪造下载链接。若任务受运行限制而未完成，保留全部 ID 和已有证据，准确标记 partial/not-started，摘要列出未完成 ID。未开始的新记录可用 unresolved+no 占位，但 notes 必须明写“本轮未开始研究”，不能写成“研究后未查明”。沿用旧结果时明写“沿用上一轮，本轮未复核”。

## 七、交付两个完整 UTF-8 JSON 文件

两份文件覆盖输入所有 IDBAT，每个恰好一次，顺序与输入一致；不使用注释、省略号或字符串 "null"。以下示例值仅说明结构，必须替换成实际值。所有未知使用 JSON null。

### results.json

顶层数组，每条严格只有八个字段：

~~~json
[
  {
    "IDBAT": 123,
    "currentNameZh": null,
    "currentAddress": null,
    "currentUse": null,
    "relationship": null,
    "verificationStatus": "unresolved",
    "notes": "本轮已确认事实、旧今对应、适用范围、证据日期、冲突与具体待补环节。",
    "sources": []
  }
]
~~~

currentNameZh 是原址的现代场地/建筑名，不是迁走机构的现名；候选明确写“候选，待核”。currentAddress 同理。currentUse 写具体范围，未知填 null；不能为了填满字段写无依据的“住宅/商业”。sources 每项严格为 {"title": "具体标题", "url": "实际使用的具体页面 URL"}。不要用门户首页、搜索结果页凑数。

notes 简洁呈现证据链，区分事实与推断；review 的记录显式写“待核：具体原因”。yes 也必须如实写其范围和局限，不能为绕过关键词规则而隐去不确定性。若项目编译结果与明确回填建议不一致，另报导入冲突，不改写事实迎合编译器。

### evidence.json

保留上一版所有字段，新增的进度、分项判断和回填范围只放在此文件中：

~~~json
{
  "inputFileName": "实际原始JSON文件名",
  "inputSha256": null,
  "inputIds": [123],
  "researchedAt": "YYYY-MM-DD",
  "recordCount": 1,
  "previousMaterials": [],
  "validation": {
    "executionStatus": "not-run",
    "checks": [],
    "failures": []
  },
  "records": [
    {
      "IDBAT": 123,
      "originalInput": {
        "IDBAT": 123,
        "NAME": null,
        "F_ADDRESS": null,
        "FUNCTION": null,
        "XC": 0,
        "YC": 0
      },
      "historicalContext": {
        "nameZh": null,
        "startYear": null,
        "endYear": null,
        "sourceUrl": null,
        "notes": null
      },
      "researchProgress": {
        "status": "not-started",
        "focus": [],
        "stopReason": null,
        "delta": null
      },
      "queries": [],
      "sourceReviews": [],
      "identityEvidence": null,
      "addressEvidence": null,
      "buildingFateEvidence": null,
      "currentUseEvidence": null,
      "fieldFindings": {
        "identity": {"status": "unknown", "finding": null, "sourceUrls": [], "gap": null},
        "address": {"status": "unknown", "finding": null, "sourceUrls": [], "gap": null},
        "buildingFate": {"status": "unknown", "finding": null, "sourceUrls": [], "gap": null},
        "currentUse": {"status": "unknown", "finding": null, "sourceUrls": [], "gap": null},
        "spatial": {"status": "unknown", "finding": null, "sourceUrls": [], "gap": null},
        "temporal": {"status": "unknown", "finding": null, "sourceUrls": [], "gap": null}
      },
      "spatialReview": {
        "originalWgs84": null,
        "conversionMethod": null,
        "comparisonSourceUrl": null,
        "comparisonCrs": null,
        "distanceMeters": null,
        "containment": "not-checked",
        "finding": null,
        "assessmentMethod": "not-checked",
        "compatibility": "not-checked",
        "measurementTarget": null,
        "evidenceLocators": [],
        "uncertainty": null
      },
      "relatedRecords": [],
      "conflicts": [],
      "remainingQuestions": [],
      "nextResearchActions": [],
      "verificationStatus": "unresolved",
      "mapWriteRecommendation": "no",
      "mapWriteScope": {
        "level": null,
        "description": null,
        "excludedClaims": [],
        "useEvidenceDate": null
      },
      "mapWriteReason": null,
      "conclusion": "必须逐字等于本条results.notes"
    }
  ]
}
~~~

字段约束：

- originalInput 是实际输入对象的完整复制，包含额外字段，不局限于上述示例。
- previousMaterials：列实际收到的旧文件及是否成功读取，不虚构。
- queries：仅本轮实际执行的查询。旧查询可以保留在旧文件，不冒充本轮执行。
- sourceReviews 每项包含 url、title、publisher、publishedAt、accessMethod、locator、supports、limitations，另增加 accessedAt、readThisRound、sourceFamily。accessMethod 使用 full-text、pdf、search-snippet、reprint、inaccessible；readThisRound 为布尔值。沿用旧评审时保留原读取日期，不改成本轮日期。sourceFamily 标识共同原始来源；无法判断填 null。
- sourceReviews 覆盖 results.sources 和 fieldFindings.sourceUrls 所有链接。inaccessible 只能证明访问失败，不能作为已核实论断的唯一依据。
- evidenceLocators：列实际查看的地图/PDF/影像来源 URL、页码或位置、资料年代、实际读取方式及适用局限。
- assessmentMethod：geometry、georeferenced-map、manual-cross-check、poi-only、not-checked。地理配准要有方法和误差说明；manual-cross-check 要说清实际查看了哪些图与文字、核对了哪些固定参照物。
- compatibility：supported、uncertain、conflicting、not-checked。只有真实完成相容性核验才能 supported；poi-only 不能单独支持 yes。
- containment：inside、outside、boundary-near、not-checked，受第四节几何规则约束。manual-cross-check 与 containment=not-checked 可以同时出现，不能伪装为做过点入面计算。
- mapWriteScope.level：site、building、part-of-building 或 null。yes 时必须非空且 description 明确，写明不包含哪些未经证明的细节。
- relatedRecords：每项写关联 ID（未知可 null）、名称、关联依据和核实状态。同名同址不自动合并；没有完整项目分组资料不能声称已审完全部组员。
- nextResearchActions 每项写 targetGap、action、targetSource、acceptanceCriterion：要查哪个缺口、去哪里查、取得什么才足以改变结论。不能只写“实地调查”“找地籍图”“继续研究”。

## 八、交付前实际自检

有代码环境时执行检查并记录真实结果；没有时明确为 manual-only，不能声称“程序自检通过”。validation.executionStatus 使用 executed、manual-only、not-run。

检查以下内容：

1. 两份 JSON 可解析；results 每条恰好八字段；字段类型、空值和枚举合法。
2. 记录数、ID唯一性、ID集合和顺序与原始 JSON 相同；originalInput 包括额外字段在内逐项相等。
3. 两份 verificationStatus 一致，conclusion 与 notes 逐字相同；sources 均被 sourceReviews 覆盖。
4. 状态组合符合本轮定义；likely 有实质性现代候选依据；仅历史身份 confirmed 不被误判为 verified。
5. 每个 yes 的现代名称/场地描述、地址、用途、relationship、scope 均非空，spatial.compatibility 为 supported，无影响该范围判断的重大冲突；相关依据均可定位。
6. 每个 review 的 notes 有“待核”及具体原因；任何关键词造成的项目导入冲突另报，不隐去证据限制。
7. 有转换结果的记录均实际计算，使用一致坐标轴；有距离和 containment 判断的记录均存在相应测量依据。
8. 本轮未执行的动作没有写成已执行；未开始/部分完成记录没有伪装成研究后未查明。
9. 摘要统计直接从最终 JSON 计算，区分“列入文件数”“本轮完成补证数”和“现代对应确认数”。

最后附简短中文说明：输入快照标识；completed/partial/not-started 数量和未完成 ID；verified/likely/unresolved 与 yes/review/no 数量；本轮状态变化；最重要的新增证据、纠正结论和下一步具体阻塞项。

不要重复长篇宏观城市史。提供两份实际可获取的 JSON；只交付研究文件和评审结论，本轮不直接修改项目地图、道路、原始数据或执行导入。
