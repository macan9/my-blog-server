exports.up = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('avatar').nullable().comment('用户头像URL');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('avatar');
  });
};