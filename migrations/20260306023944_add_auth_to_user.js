exports.up = async function(knex) {
	// 在 user 表新增 auth 字段，默认值为 2
	await knex.schema.alterTable('users', function(table) {
	  table.integer('auth').notNullable().defaultTo(2).comment('权限 1=管理员 2=普通用户');
	});
  };
  
  exports.down = async function(knex) {
	// 回滚操作：删除 auth 字段
	await knex.schema.alterTable('users', function(table) {
	  table.dropColumn('auth');
	});
  };