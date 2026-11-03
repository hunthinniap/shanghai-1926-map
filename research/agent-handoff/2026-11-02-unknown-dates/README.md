# 交给外部 agent 的年代检索包

快照：2026年11月2日。共 **2227 条未解决时间线事件、1878 组派发对象，45 个独立分包**。每包不超过50条事件，同一组不拆到多个包。分组仅为避免重复调查，不代表同栋或同址身份已经核定。

## 最快用法

把一个分包的 JSON 和同编号 prompt 发给一个 agent。例如：

- 输入：`batches/date-agent-001.json`
- 指令：`prompts/date-agent-001.md`
- 回传：`date-agent-001.result.json`，可从 `templates/date-agent-001.result.json` 起填。

不同 agent 领不同编号；一个 agent 可以依次处理多个包。优先级1的包排在前面；`manifest.json`列出每包名称样例及任务ID。

## 文件

- `all-tasks.json`：全量主清单。
- `batches/`：可独立上传的分包，含身份原字段、待核问题、既有检索、最多3个未核候选。
- `prompts/`：已写好分包编号、事件数及回传文件名的指令。
- `PROMPT.md`：通用指令，含公开数据库检索及全文读取方式。
- `templates/`：逐事件回传模板，全部初始状态为not_researched。
- `result-schema.json`：回传结构约定。
- `validate-results.mjs`：只检查回传结构、ID、输入指纹及证据字段，不验证史实。

分包可在不读取项目代码的情况下独立调查。候选摘要仅为线索，完整查询响应仍保存在项目`research/rechecks/2026-11-02-shtong-full-date-search/`中；不共享该文件夹也可以根据分包内链接重新打开来源。

## 回传检查

在本包根目录运行：

```powershell
node validate-results.mjs batches/date-agent-001.json returned/date-agent-001.result.json
```

返回格式检查通过不代表年代已确认，不会自动改地图。拿到各agent的结果后再逐条对照证据回填。

本包只含当前仍无年份的事件；此前已补入的日期已排除。无专名、同名异址、机构成立与具体门址迁入不一致、复杂楼栋和年代区间均须如实保留不确定性。
