/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('nickname',100).nullable().comment('用户昵称');
    table.string('mobile',100).nullable().comment('用户手机号');
    table.string('description',512).nullable().comment('个性签名');


  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('nickname');
    table.dropColumn('mobile');
    table.dropColumn('description');
  });
};
