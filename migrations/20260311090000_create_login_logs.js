exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('login_logs');
  if (exists) {
    return;
  }

  await knex.schema.createTable('login_logs', table => {
    table.increments('id').primary().comment('登录日志ID，自增主键');
    table.integer('user_id').unsigned().nullable().comment('用户ID，可为空');
    table.string('username', 50).notNullable().comment('登录时提交的用户名');
    table.string('ip', 64).nullable().comment('登录来源IP');
    table.string('user_agent', 512).nullable().comment('客户端User-Agent');
    table.boolean('success').notNullable().comment('是否登录成功');
    table.string('message', 255).nullable().comment('登录结果说明');
    table.timestamp('created_at').defaultTo(knex.fn.now()).comment('创建时间');

    table.index(['user_id'], 'idx_login_logs_user_id');
    table.index(['created_at'], 'idx_login_logs_created_at');
  });
};

exports.down = async function(knex) {
  const exists = await knex.schema.hasTable('login_logs');
  if (!exists) {
    return;
  }

  await knex.schema.dropTable('login_logs');
};
