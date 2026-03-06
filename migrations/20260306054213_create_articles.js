/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
	return knex.schema.createTable('posts', (table) => {
		table.increments('id').primary();
	
		// 【核心】这里直接存 user_id，不需要额外的关联表
		table.integer('user_id').unsigned().notNullable();
		
		// 添加外键约束 (确保 user_id 必须在 users 表中存在)
		// onDelete('CASCADE'): 如果用户被删除，他的文章也自动删除 (可选策略)
		table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
	
		table.string('title', 255).notNullable();
		table.text('content').notNullable();
		
		// 可选：增加一个 slug 字段用于生成友好的 URL (如 /post/my-first-blog)
		table.string('slug', 255).unique(); 
	
		table.tinyint('status').defaultTo(0).comment('0:草稿, 1:发布');
		
		table.timestamps(true, true);
	  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
	return knex.schema.dropTable('posts');
};
