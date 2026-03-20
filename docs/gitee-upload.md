# Gitee 图床上传与管理

服务端提供以下能力，同时支持 `/upload/*` 和 `/api/upload/*` 两套路径：

- 上传图片到 Gitee 仓库
- 浏览图床目录
- 删除文件或目录
- 下载指定图片，并以附件形式返回给前端

## 1. 环境变量

在 `.env` 中配置：

- `GITEE_OWNER`: 仓库 owner
- `GITEE_REPO`: 仓库名
- `GITEE_REPO_PATH`: 仓库内根目录，可为空，例如 `ceshi`
- `GITEE_BRANCH`: 分支名，默认 `master`
- `GITEE_MESSAGE`: 提交信息前缀
- `GITEE_ACCESS_TOKEN`: Gitee access token

## 2. 上传接口

接口：

```http
POST /upload/avatar
POST /api/upload/avatar
```

要求：

- 需要登录，携带 `Authorization: Bearer <JWT>`
- 请求类型为 `multipart/form-data`
- 文件字段名固定为 `file`
- 额外传入 `path`，表示上传到图床中的目标目录，例如 `avatar` 或 `article/2026`

PowerShell 示例：

```powershell
$token = "<你的JWT>"
$filePath = "C:\\path\\to\\avatar.png"

curl -X POST "http://localhost:3000/api/upload/avatar" `
  -H "Authorization: Bearer $token" `
  -F "path=avatar" `
  -F "file=@$filePath"
```

成功返回：

```json
{
  "success": true,
  "url": "https://gitee.com/.../raw/...png",
  "path": "avatar/u1-1740000000000-xxxx.png"
}
```

## 3. 浏览目录接口

接口：

```http
GET /upload/gitee/config
GET /api/upload/gitee/config

GET /upload/gitee/contents
GET /api/upload/gitee/contents
GET /api/upload/gitee/contents?path=avatar
GET /api/upload/gitee/contents?path=article/2026
```

说明：

- 需要登录，携带 `Authorization: Bearer <JWT>`
- `path` 相对于 `GITEE_REPO_PATH`
- 不传 `path` 时，读取图床根目录
- 返回结果中，文件项会带上 `relativePath` 和 `downloadUrl`

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

## 4. 删除接口

接口：

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

- 需要登录，携带 `Authorization: Bearer <JWT>`
- 传文件路径时删除单个文件
- 传目录路径时递归删除目录下全部文件
- 不允许直接删除 `GITEE_REPO_PATH` 对应的根目录

## 5. 下载接口

接口：

```http
GET /upload/gitee/download?path=avatar/demo.png
GET /api/upload/gitee/download?path=avatar/demo.png
```

说明：

- `path` 必填，且必须指向单个文件
- `path` 相对于 `GITEE_REPO_PATH`
- 服务端会从 Gitee 拉取文件流，并设置 `Content-Disposition: attachment`
- 前端只要打开这个 URL，浏览器就会直接下载该图片

前端示例：

```js
const downloadPath = encodeURIComponent(item.relativePath);
window.open(`/api/upload/gitee/download?path=${downloadPath}`, '_self');
```

如果你是按钮点击事件里处理，也可以这样写：

```js
function handleDownload(item) {
  const downloadPath = encodeURIComponent(item.relativePath);
  window.location.href = `/api/upload/gitee/download?path=${downloadPath}`;
}
```

## 6. 安全说明

- 建议不要泄露 `GITEE_ACCESS_TOKEN`
- 私有仓库的 raw 地址通常不能匿名访问，但本下载接口由服务端代理文件流，前端不需要直接访问 raw 地址
