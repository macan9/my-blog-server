// config/database.js
require('dotenv').config();

const config = {
	client: 'mysql2',
	connection: {
		host: process.env.DB_HOST || '127.0.0.1',
		port: parseInt(process.env.DB_PORT, 10) || 3306,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		charset: 'utf8mb4'
	},
	pool: { min: 2, max: 10 }
};

module.exports = config;