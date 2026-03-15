# Gitee 图床上传（/upload/avatar）

服务端提供 `POST /upload/avatar`（同时也支持 `POST /api/upload/avatar`）用于把图片写入你的 Gitee 仓库。

## 1) 环境变量

在你的 `.env` 里加入（示例见 `.env.example`）：

- `GITEE_OWNER`：仓库 owner
- `GITEE_REPO`：仓库名
- `GITEE_REPO_PATH`：仓库内目录（可空），例如 `ceshi`
- `GITEE_BRANCH`：分支名，默认 `master`
- `GITEE_MESSAGE`：提交信息前缀
- `GITEE_ACCESS_TOKEN`：访问令牌（不要提交到 git）

## 2) 请求方式

必须是 `multipart/form-data`，字段名固定为 `file`。

PowerShell 示例：

```powershell
$token = "<你的JWT>"
$filePath = "C:\\path\\to\\avatar.png"

curl -X POST "http://localhost:3000/upload/avatar" `
  -H "Authorization: Bearer $token" `
  -F "file=@$filePath"
```

成功返回：

```json
{ "success": true, "url": "https://gitee.com/.../raw/...png", "path": "ceshi/avatar/....png" }
```

## 3) 安全建议

- 你在聊天里暴露的 `access_token` 建议立刻在 Gitee 里撤销并重新生成。
- 如果仓库是私有仓库，`raw` 链接可能无法匿名访问（需要你自行做鉴权或改用公开仓库）。

