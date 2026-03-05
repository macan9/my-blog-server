// config/db.js
const knex = require('knex');
const config = require('./database');

const db = knex(config);

module.exports = db;