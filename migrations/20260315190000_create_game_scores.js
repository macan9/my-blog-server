/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.createTable('game_scores', (table) => {
		table.increments('id').primary();

		table.integer('user_id').unsigned().notNullable();
		table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

		table.integer('score').notNullable().comment('游戏分数/积分');
		table.timestamp('score_time').notNullable().defaultTo(knex.fn.now()).comment('积分时间');

		table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).comment('记录创建时间');

		table.index(['score', 'score_time'], 'idx_game_scores_score_time');
		table.index(['user_id', 'score_time'], 'idx_game_scores_user_time');
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return knex.schema.dropTableIfExists('game_scores');
};

