// config/database.js

const knex = require('knex');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_NAME:', process.env.DB_NAME);
const db = knex({
	client: 'mysql2',
	connection: {
	  host: process.env.DB_HOST?.trim() || '127.0.0.1',
	  port: parseInt(process.env.DB_PORT?.trim(), 10) || 3307,
	  user: process.env.DB_USER?.trim() || 'user',
	  password: process.env.DB_PASSWORD?.trim() || 'Password#123',
	  database: process.env.DB_NAME?.trim() || 'my_blog',
	  charset: 'utf8mb4',
	  socketPath: undefined // ⚠ 显式强制 TCP 连接
	},
	pool: { min: 2, max: 10 }
  });

//   const db = require('knex')({
// 	client: 'mysql2',
// 	connection: {
// 	  host: '127.0.0.1',            // 本地隧道
// 	  port: 3307,                    // 本地映射端口
// 	  user: 'user',
// 	  password: 'Password#123',
// 	  database: 'my_blog',
// 	  charset: 'utf8mb4',
// 	  socketPath: undefined           // 强制 TCP
// 	},
// 	pool: { min: 2, max: 10 }
//   });

module.exports = db;