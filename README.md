# Node.js 用户管理系统 (Express + Knex + bcryptjs)

一个轻量级的 RESTful API 项目，实现了安全的用户注册、登录及 CRUD 功能。

## 🛠️ 技术栈
- **后端**: Node.js + Express
- **数据库**: MySQL + Knex.js
- **安全**: bcryptjs (密码加密)

## 🚀 快速启动

1. **安装依赖**
   ```bash
   npm install
   ```

2. **配置环境变量**（创建 `.env`）
   ```bash
   PORT=3000
   SESSION_SECRET=your-session-secret

   # 允许的前端域名：支持多个（逗号或空格分隔）
   FRONTEND_ORIGIN=http://localhost:8010,https://a.example.com,https://b.example.com
   ```

3. **启动服务**
   ```bash
   npm run dev
   # 或
   npm start
   ```

## 📁 项目结构

```text
├── app.js              # 入口
├── config/             # 数据库配置
├── routes/             # 路由控制
├── services/           # 业务逻辑 (加密/DB操作)
└── package.json
```