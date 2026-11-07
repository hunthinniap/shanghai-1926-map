# 卡片问题反馈

道路、地标及优秀历史建筑卡片的关闭按钮下方有反馈入口。反馈包含问题类型、说明、选填邮箱，以及自动附带的地点 ID、名称、地址、当前年份和页面地址。提交失败会保留本机草稿。

## 本地开发与预览

`npm run dev` 和 `npm run preview` 均接收反馈，追加保存到项目内的 `.local/feedback.ndjson`。每行是一条独立 JSON 记录，可按 `place-id` 和 `receivedAt` 筛选。

该目录已被 Git 忽略。反馈内容、联系邮箱和用户草稿不要提交到代码仓库。自动化连通性自检记录使用 `category: 自动化验证`。

## Netlify

1. 在站点的 **Forms** 中启用表单检测（如果尚未开启）。
2. 部署包含 `index.html` 中 `map-feedback` 静态表单的构建。
3. 在 **Forms → map-feedback** 查看、导出或处理反馈。

前端使用同源 URL 编码 POST，不需要在网页中放置令牌或管理端密钥。上线前应在实际部署站点验证一次提交确实进入 Forms 后台；本地成功不代表云端表单检测已经启用。

参考：[Netlify Forms 设置](https://docs.netlify.com/manage/forms/setup/)、[提交管理](https://docs.netlify.com/manage/forms/submissions/)。
