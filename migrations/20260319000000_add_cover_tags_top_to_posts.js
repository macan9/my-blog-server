/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('posts', (table) => {
    table.string('cover_image', 512).nullable().comment('博客封面图');
    table.string('tags', 512).nullable().comment('博客标签，逗号分隔');
    table.boolean('is_top').notNullable().defaultTo(false).comment('是否置顶');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('posts', (table) => {
    table.dropColumn('cover_image');
    table.dropColumn('tags');
    table.dropColumn('is_top');
  });
};
