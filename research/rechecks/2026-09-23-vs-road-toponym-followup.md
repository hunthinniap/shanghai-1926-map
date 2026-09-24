# VS 地址路名续查：LONG / LU / ROAD / JIE 与建筑地址交叉核验

日期：2026-09-23。范围延续[全量核查](2026-09-23-all-vs-address-road-gaps.md)：全部 1,803 条地点地址，而非未查明地标子集。

## 本轮结果

在前轮 56 种待释读写法中，20 种已能作道路级处理：8 种对应库内已有道路，12 种新增为缺失名称候选；其余 36 种保留待查。本轮另记录了其中 5 种的未定线索。全量缺失名称候选现为 49 条，另有大连西路分段问题。

“库内已有”不表示全部几何或旧门牌已核准；“缺失名称候选”不表示已经排尽所有旧别名或证明线段不存在。TIFENG 为有位置支持的异写判断，置信度中等，单独标明。

采用后缀与读音作为检索线索，再用建筑名称、旧门牌、道路沿革交叉确认。LONG/LOONG 往往表示弄，LU 表示路，JIE 表示街，ROAD/RAOD 可有误拼；**这些只是搜索规则，不是自动归并规则**。特别是 XIANG 不能一律替换成“街”，同音弄名也不能只取最近搜索结果。

## 数据库已有：不重复列缺路

| VS 原写法 | 历史中文释读 | 今路名 | VS 编号 | 库内检出 |
| --- | --- | --- | --- | --- |
| `BAOCHENG LONG` | 宝成弄 | 叶家宅路 | #1420 | 2 条线要素；道路级对应 |
| `FANWANGTU ROAD` | 梵皇渡路 | 万航渡路 | #1405 | 27 条线要素；道路级对应 |
| `LING-SEN (WESTERN)` / `LINSEN XILU` | 林森西路 | 淮海西路 | #1562、#1563 | 7 条线要素；道路级对应 |
| `FONGPANG (CENTRAL)` | 方浜中路 | 方浜中路 | #1241、#1252 | 6 条线要素；道路级对应 |
| `XUEQIAN XIANG` | 学前街 | 学前街 | #1481 | 1 条线要素；道路级对应 |
| `ZHONGZHENG` | 中正西路 | 延安西路 | #1575 | 94 条线要素；道路级对应 |
| `TIFENG ROAD` | 地丰路 | 乌鲁木齐北路 | #1118 | 5 条线要素；中等置信度 |

宝成弄是本轮最清楚的例子：本库已有 `Po Zen Lon / 宝成弄 / 叶家宅路`，问题在外文别名未对应，不是道路未入库。研究脚本现已识别这组名称；**没有修改地图生产数据里的 aliases**。

## 新增 12 条缺失名称候选

| VS 原写法 | 历史中文释读 | 今路名／对应路段 | VS 编号 | 库内检出 |
| --- | --- | --- | --- | --- |
| `KOOKA LUNG` | 顾家弄 | 顾家弄 | #638、#639、#640 | 0 名称命中 |
| `FONGZIA ROAD` | 方斜路 | 方斜路 | #1447 | 0 名称命中 |
| `HUIGUAN` | 会馆街 | 会馆街 | #1494 | 0 名称命中 |
| `PUYUTUNG` | 普育东路 | 普育东路 | #1488 | 0 名称命中 |
| `PUYUSI` | 普育西路 | 普育西路 | #1488 | 0 名称命中 |
| `QUZHENREN LU` | 瞿真人路 | 瞿溪路 | #1464 | 0 名称命中 |
| `SHIQING ROAD` | 士庆路 | 海伦西路 | #1587 | 0 名称命中 |
| `TUNGCHIATU ROAD` | 董家渡路 | 董家渡路 | #1497 | 0 名称命中 |
| `YUYUAN (BIS) LU` | 豫园路 | 豫园路 | #1726 | 0 名称命中 |
| `DUOJIA` | 多稼路 | 多稼路 | #1493 | 0 名称命中 |
| `DAFOCHANG` | 大佛厂街 | 大昌街 | #1489 | 0 名称命中 |
| `FUSHANTANG` | 复善堂街 | 东江阴街 | #1491 | 0 名称命中 |

## 逐项证据与边界

### BAOCHENG LONG（#1420）

已有道路别名，排除缺口；置信度：高（道路级）。VS 日華紡織第五工場的宝成弄／Robison Road 地址；《宝成桥》及上海政法学院转载史料明确宝成弄为叶家宅路旧称。本库已以 Po Zen Lon／宝成弄／叶家宅路收录。

来源：[资料 1（维基）](https://zh.wikipedia.org/wiki/宝成桥)；[资料 2](https://www.shupl.edu.cn/_t263/2021/0209/c1170a86623/page.psp)。

### FANWANGTU ROAD（#1405）

已有道路别名，排除缺口；置信度：高（道路级）。VS 圣约翰大学地址结合万航渡路沿革，梵皇渡路为其旧名；本库以 Jessfield Road 收录。1541 旧门牌不改写为现代门牌。

来源：[资料 1（维基）](https://zh.wikipedia.org/wiki/万航渡路)。

### LING-SEN (WESTERN) / LINSEN XILU（#1562、#1563）

已有道路别名，排除缺口；置信度：高（道路级）。《淮海西路》明确林森西路更名淮海西路；两条 VS 写法均指西段，不能套用淮海中路。仅核道路名，未核五洲药厂、中央银行俱乐部的现门址。

来源：[资料 1（维基）](https://zh.wikipedia.org/wiki/淮海西路)。

### FONGPANG (CENTRAL)（#1241、#1252）

已有道路别名，排除缺口；置信度：高（道路级）。VS 梨园公所 593 FONGPANG (CENTRAL) 与条目方浜中路593号吻合；同表达式的广福讲寺一并按道路级名称解释，不宣称该寺现址已证实。

来源：[资料 1（维基）](https://zh.wikipedia.org/wiki/梨园公所)。

### XUEQIAN XIANG（#1481）

已有道路别名，排除缺口；置信度：高（道路级）。VS 蓬莱大戏院 111 XUEQIAN XIANG 与越剧艺术研究中心、新民晚报记载的学前街111号吻合；后者说明今为111弄。本库已收录學前街。XIANG 原拼写保留，不推广为所有巷和街可互换。

来源：[资料 1](https://www.yueju.net/api/shows_form_details.html?id=193)；[资料 2](https://paper.xinmin.cn/html/xmwb/2021-07-12/16/110906.html)。

### ZHONGZHENG（#1575）

已有道路别名，排除缺口；置信度：高（道路级）。仅限哥伦比亚总会 1262 ZHONGZHENG；《美国乡村总会》给延安西路1262号，道路旧名为中正西路。不能把其他中正路一律映射为延安西路。

来源：[资料 1（维基）](https://zh.wikipedia.org/wiki/美国乡村总会)；[资料 2](https://www.cclchinese.com/portal.php?aid=7850&mod=view)。

### TIFENG ROAD（#1118）

已有道路别名，排除缺口；置信度：中。TIFENG 与库内 Tifong Road 仅一字母异写，地丰路即乌鲁木齐北路；VS 点在该道路区域，支持道路级释读。原外國公寓2号门址及异写起源未核。

来源：[资料 1（维基）](https://zh.wikipedia.org/wiki/乌鲁木齐北路)。

### KOOKA LUNG（#638、#639、#640）

未命中名称，列为缺口候选；置信度：高（道路级）。VS 中国济生会20号、茶业公会54号分别与史料中的顾家弄20号、54号吻合，10号黄大仙祠为辅助线索。不能只凭通用拼写表误配俞家弄。道路的现代保留范围尚未测绘。

来源：[资料 1](https://news.ifeng.com/c/8SaXCb98k19)；[资料 2](https://www.thepaper.cn/newsDetail_forward_16670098)；[资料 3](https://blog.sina.cn/dpool/blog/s/blog_5d1bdf480102zeje.html?md=gd)。

### FONGZIA ROAD（#1447）

未命中名称，列为缺口候选；置信度：高（道路级）。VS 西门妇孺医院419号与红十字会史料及复旦妇产科医院条目的方斜路419号交叉对应。

来源：[资料 1](https://www.redcross-sha.org.cn/view.aspx?cid=11&id=160&sid=48)；[资料 2（维基）](https://zh.wikipedia.org/wiki/复旦大学附属妇产科医院)。

### HUIGUAN（#1494）

未命中名称，列为缺口候选；置信度：高（道路级）。VS Sand Junk Guild、原中文上船會館、38 HUIGUAN 与商船会馆会馆街38号吻合。保留原中文误写，不在本轮改建筑数据。

来源：[资料 1（维基）](https://zh.wikipedia.org/wiki/商船会馆)；[资料 2](https://www.jfdaily.com/sgh/detail?id=1425502)。

### PUYUTUNG（#1488）

未命中名称，列为缺口候选；置信度：高（道路级）。VS 新普育堂以 PUYUTUNG / PUYUSI 并列，资料明确院区两侧分别为普育东路和普育西路。不是两路同义，也不把斜杠当已验证的十字路口。

来源：[资料 1](https://m.thepaper.cn/newsDetail_forward_29223920)；[资料 2](https://www.volunteer.sh.cn/zyzxw/2020/09/06/14909.shtml)。

### PUYUSI（#1488）

未命中名称，列为缺口候选；置信度：高（道路级）。与新普育堂两侧道路资料对应；现代公益新天地园区为普育西路105号，作为道路与机构关系印证，不能据此补填 VS 原来的 ?? 门牌。

来源：[资料 1](https://m.thepaper.cn/newsDetail_forward_29223920)；[资料 2](https://www.volunteer.sh.cn/zyzxw/2020/09/06/14909.shtml)。

### QUZHENREN LU（#1464）

未命中名称，列为缺口候选；置信度：高（道路级）。瞿真人路改名瞿溪路有明确沿革；VS Bethel Hospital 的制造局路交叉地址与该区域相符。现代医院门牌未核。

来源：[资料 1（维基）](https://zh.wikipedia.org/wiki/瞿溪路)；[资料 2](https://www.thepaper.cn/newsDetail_forward_19362439)。

### SHIQING ROAD（#1587）

未命中名称，列为缺口候选；置信度：高（道路级）。维基和虹口区政府均明确海伦西路旧名士庆路；VS 梅机关相关记录在四川北路交叉处。原中文美機關不静默改写。

来源：[资料 1（维基）](https://zh.wikipedia.org/wiki/海伦西路)；[资料 2](https://www.shhk.gov.cn/xwzx/002008/002008040/20230828/0b6967be-2f19-46c7-a3fa-40d61971e39a.html)。

### TUNGCHIATU ROAD（#1497）

未命中名称，列为缺口候选；置信度：高（道路级）。VS 董家渡天主堂175 TUNGCHIATU ROAD；上海市民宗局确认其位于董家渡路。VS 在线备注另写今址185号，与常见175号资料有差异，本轮仅核路名，不合并旧今门牌。

来源：[资料 1](https://www.virtualshanghai.net/Data/Buildings?ID=1497)；[资料 2（维基）](https://zh.wikipedia.org/wiki/董家渡圣方济各沙勿略堂)；[资料 3](https://mzzj.sh.gov.cn/2021xwzx_ztzl/20260825/06cae64539574646a732090292284fa5.html)。

### YUYUAN (BIS) LU（#1726）

未命中名称，列为缺口候选；置信度：高（道路级）。VS 为湖心亭茶馆，上海会展旅游平台给今址豫园路257号，故不是愚园路，也不是库内豫园老街。VS 原231号和 BIS 标记原样保留，未证明其门牌沿革或 BIS 的含义。

来源：[资料 1（维基）](https://zh.wikipedia.org/wiki/湖心亭_(上海))；[资料 2](https://www.meet-in-shanghai.net/cn/food/shanghai-yu-garden-lake-center-pavilion-321006/)。

### DUOJIA（#1493）

未命中名称，列为缺口候选；置信度：高（道路级）。VS 上海医院1 DUOJIA 与第二人民医院沿革中的多稼路1号上海医院对应。只核道路和历史院址，不据此宣称当前所有医疗功能仍在此。

来源：[资料 1（维基）](https://zh.wikipedia.org/wiki/上海市第二人民医院)。

### DAFOCHANG（#1489）

未命中名称，列为缺口候选；置信度：高（道路级）。清心堂条目明确大佛厂今大昌街，教堂地址资料给大昌街30号，与 VS 30 DAFOCHANG 对应；不把它机械套到跨龙路。

来源：[资料 1（维基）](https://zh.wikipedia.org/wiki/清心堂)；[资料 2](https://www.chinagospeltimes.com/article/index/id/49612)。

### FUSHANTANG（#1491）

未命中名称，列为缺口候选；置信度：高（道路级）。旧复善堂街对应今东江阴街的路段，三昧寺记录也在该区域。不是今江阴街全线；旧107号现门牌和建筑存续未核。

来源：[资料 1](https://m.thepaper.cn/newsDetail_forward_15693579)；[资料 2](https://www.thepaper.cn/newsDetail_forward_12171168)；[资料 3](https://www.sohu.com/a/459414245_556717)。

### CHUMEN ROAD（#1469）

仍待核实；置信度：中。结合瞿真人庙和局门路一带沿革，局门路比原脚本猜测的车门路合理。尚缺直接中外文对照，撤去车门路猜测，保持待查。

待查方向：局门路。

来源：[资料 1](https://www.thepaper.cn/newsDetail_forward_19362439)；[资料 2（维基）](https://zh.wikipedia.org/wiki/局门路)。

### LIUYUSI JIE（#1490）

仍待核实；置信度：中。海潮寺下院即上海留云禅寺，资料说明旧留云寺路今柳市路。但原写法 LIUYUSI 缺少拼音中的 N，且 JIE/LU 不一致，保留候选待查；不能用杭州海潮寺条目匹配上海旧址。

待查方向：留云寺路（今柳市路）。

来源：[资料 1](https://www.thepaper.cn/newsDetail_forward_12171168)。

### FUCHUN JIE（#1257）

仍待核实；置信度：低。维基和房管局资料可确认慈修庵现代门址；没有证据表明 FUCHUN JIE 就是榛岭街。此项是建筑现址线索，不是道路更名结论。

查到的建筑现门址：榛岭街15号。**不填为该外文道路的今名。**

来源：[资料 1（维基）](https://zh.wikipedia.org/wiki/慈修庵)；[资料 2](https://fgj.sh.gov.cn/yxlsjzjk/20240201/680e399bdfd8406a8c3fc734071bf847.html)。

### YUQINGLI LONG / YUQINGLI LOONG（#774、#775）

仍待核实；置信度：低。两校 VS 原点在天潼路、浙江北路周边，只作为进一步检索区域。查到多处同音同名里弄，但没有天后宫小学88-5和群英小学106-6的对应证据，不能套用金陵路余庆里或长寿路裕庆里；现代附近路名不等于弄名更名。

待查方向：余庆里或裕庆里，中文待核。

来源：[资料 1](https://m.thepaper.cn/baijiahao_13957396)；[资料 2](https://news.sina.com.cn/o/2011-02-14/151021951917.shtml)。

## 留给下一轮

- 优先找天后宫小学和群英小学的旧校址名录，核对 YUQINGLI 的中文字与入口；不能把同名余庆里项目当作对应证据。
- CHUMEN ROAD 已撤去“车门路”的无依据猜测；结合瞿真人庙可查局门路，但缺直接对照。
- FUCHUN JIE 可用慈修庵榛岭街现址反查旧地图；“建筑今门址已知”仍不等于“旧路更名已证实”。
- LIUYUSI JIE 候选为留云寺路／今柳市路，需确认拼写漏字与 JIE/LU；不匹配杭州海潮寺。
- 其余 31 种本轮未作新结论，见全量清单的 36 项待查表。中山路、法华等要分别核查所指路段。

机器可读的决策、适用 VS 编号与证据在[续查 JSON](2026-09-23-vs-road-toponym-followup.json)。[全量审计 JSON](2026-09-23-all-vs-address-road-audit.json)为本轮项目附有原始地址、VS 来源链接和 UTM51N 转 WGS84 的参考点；它们不是校准过的门口坐标，未将维基坐标直接抄入地图。

本轮只更新研究文档及只读核查脚本；没有改道路几何、建筑点位、合并关系或生产名称字段。
