🚀 Node.js Express 用户管理系统 (Knex + bcryptjs)
一个基于 Node.js、Express 和 Knex.js 构建的轻量级 RESTful API 用户管理系统。实现了安全的用户注册、登录（bcrypt 加密）、CRUD 操作。
✨ 主要功能
🔐 安全认证：使用 bcryptjs 对用户密码进行哈希加密存储，登录时自动比对。
🗄️ 数据库操作：使用 Knex.js 作为 SQL 查询构建器，连接 MySQL 数据库。
🛠️ RESTful API：标准的 CRUD 接口（创建、读取、更新、删除）。
️ 分层架构：清晰的 Routes -> Services -> Database 分层结构，易于维护和扩展。
🛡️ 数据安全：API 响应自动过滤敏感字段（如 password_hash），防止泄露。
技术栈
Runtime: Node.js
Framework: Express.js
Database Driver: Knex.js
Database: MySQL / MariaDB
Security: bcryptjs
Package Manager: npm / yarn
🚀 快速开始
1. 环境准备
确保你已安装：
Node.js (推荐 v14+)
MySQL 数据库
2. 安装依赖
bash

编辑



npm install
3. 数据库配置
在 MySQL 中创建数据库：
sql

编辑



CREATE DATABASE my_blog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
创建 users 表（如果尚未创建）：
sql

编辑



USE my_blog;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100),
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
修改配置文件：
编辑 config/database.js (或 .env 文件)，填入你的数据库信息：
javascript

编辑



// config/database.js 示例
module.exports = {
  client: 'mysql',
  connection: {
    host: '127.0.0.1',
    user: 'root',      // 你的数据库用户名
    password: 'your_password', // 你的数据库密码
    database: 'my_blog'
  },
  pool: { min: 0, max: 7 }
};
4. 启动服务
bash

编辑



node app.js
服务将在 http://localhost:3000 启动。
