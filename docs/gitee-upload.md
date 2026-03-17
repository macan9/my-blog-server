# Gitee 图床上传（/upload/avatar）

服务端提供 `POST /upload/avatar`（同时也支持 `POST /api/upload/avatar`）用于把图片写入你的 Gitee 仓库。
同时提供目录浏览接口，前端可以读取当前图床目录下的文件和文件夹。

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

## 3) 目录浏览接口

所有接口都需要带 `Authorization: Bearer <JWT>`。

获取当前图床配置：

```http
GET /upload/gitee/config
GET /api/upload/gitee/config
```

示例返回：

```json
{
  "success": true,
  "config": {
    "owner": "your-owner",
    "repo": "your-repo",
    "branch": "master",
    "basePath": "ceshi"
  }
}
```

读取当前目录内容：

```http
GET /upload/gitee/contents
GET /api/upload/gitee/contents
GET /upload/gitee/contents?path=avatar
GET /upload/gitee/contents?path=article/2026
```

- `path` 是相对于 `GITEE_REPO_PATH` 的子路径。
- 如果没有传 `path`，默认读取当前配置的图床根目录。
- 返回结果同时包含文件和文件夹，前端点击文件夹后，把该文件夹的 `relativePath` 继续传给 `path` 即可。

示例返回：

```json
{
  "success": true,
  "owner": "your-owner",
  "repo": "your-repo",
  "branch": "master",
  "basePath": "ceshi",
  "currentPath": "avatar",
  "fullPath": "ceshi/avatar",
  "items": [
    {
      "type": "dir",
      "name": "2026",
      "path": "ceshi/avatar/2026",
      "relativePath": "avatar/2026",
      "size": 0,
      "sha": "xxx",
      "url": "https://gitee.com/...",
      "downloadUrl": null
    },
    {
      "type": "file",
      "name": "demo.png",
      "path": "ceshi/avatar/demo.png",
      "relativePath": "avatar/demo.png",
      "size": 12345,
      "sha": "yyy",
      "url": "https://gitee.com/...",
      "downloadUrl": "https://gitee.com/.../raw/..."
    }
  ]
}
```

删除文件或文件夹：

```http
DELETE /upload/gitee/contents?path=avatar/demo.png
DELETE /api/upload/gitee/contents?path=article/2026
```

也可以把 `path` 放到 JSON body：

```json
{
  "path": "avatar/demo.png"
}
```

说明：

- 传文件路径时，删除单个文件。
- 传文件夹路径时，服务端会递归删除该目录下的全部文件。
- 为了避免误删，不允许直接删除 `GITEE_REPO_PATH` 对应的图床根目录。

示例返回：

```json
{
  "success": true,
  "owner": "your-owner",
  "repo": "your-repo",
  "branch": "master",
  "basePath": "ceshi",
  "targetPath": "avatar",
  "fullPath": "ceshi/avatar",
  "deletedCount": 2,
  "deleted": [
    {
      "name": "a.png",
      "path": "ceshi/avatar/a.png",
      "relativePath": "avatar/a.png",
      "type": "file"
    },
    {
      "name": "b.png",
      "path": "ceshi/avatar/2026/b.png",
      "relativePath": "avatar/2026/b.png",
      "type": "file"
    }
  ]
}
```

## 4) 安全建议

- 你在聊天里暴露的 `access_token` 建议立刻在 Gitee 里撤销并重新生成。
- 如果仓库是私有仓库，`raw` 链接可能无法匿名访问（需要你自行做鉴权或改用公开仓库）。

