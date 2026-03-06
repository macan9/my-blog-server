// createTable 新建表
// alterTable 修改表
// dropTable 删除表
// renameTable 重命名表
// addColumn 增加列
// dropColumn 删除列
// renameColumn 重命名列

/**
# 如果是新表
npx knex migrate:latest

# 如果表已经存在，需要先 rollback 再 migrate
npx knex migrate:rollback
npx knex migrate:latest
*/

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
	await knex.schema.alterTable('users', table => {
		table.increments('id').primary().comment('用户ID，自增主键');
		table.string('username', 50).notNullable().unique().comment('用户名，唯一');
		table.string('password_hash', 255).notNullable().comment('密码哈希');
		table.string('email', 100).nullable().comment('邮箱，可选，不做唯一约束');
		table.string('last_token', 512).nullable().comment('最近一次登录生成的 JWT');
		table.dateTime('token_expires_at').nullable().comment('JWT 过期时间');
		table.dateTime('last_login_at').nullable().comment('最近登录时间');
		table.timestamp('created_at').defaultTo(knex.fn.now()).comment('创建时间');
		table.timestamp('updated_at').defaultTo(knex.fn.now()).comment('更新时间');
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
	await knex.schema.alterTable('users', table => {
		table.dropColumn('last_token');
		table.dropColumn('token_expires_at');
		table.dropColumn('last_login_at');
	});
};