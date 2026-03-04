// config/database.js
const knex = require('knex');

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1', // 默认本地，可通过环境变量覆盖
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'user',      // 你的 MySQL 用户名
    password: process.env.DB_PASSWORD || 'Password#123',  // 你的 MySQL 密码
    database: process.env.DB_NAME || 'my_blog',
    charset: 'utf8mb4',
  },
  pool: {
    min: 2,
    max: 10
  }
});

module.exports = db;