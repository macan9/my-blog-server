// knexfile.js 数据迁移
const config = require('./config/database');

module.exports = {
	development: {
		...config,
		migrations: {
			directory: './migrations'
		}
	},
	production: {
		...config,
		migrations: {
			directory: './migrations'
		}
	}
};