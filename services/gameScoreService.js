const db = require('../config/db');

function toValidDateOrNull(value) {
	if (value === undefined || value === null || value === '') return null;
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date;
}

async function createScoreRecord({ userId, score, scoreTime }) {
	if (!userId) {
		const err = new Error('userId 不能为空');
		err.statusCode = 400;
		throw err;
	}

	const numericScore = Number(score);
	if (!Number.isFinite(numericScore) || !Number.isInteger(numericScore)) {
		const err = new Error('score 必须为整数');
		err.statusCode = 400;
		throw err;
	}

	const when = toValidDateOrNull(scoreTime);
	if (scoreTime !== undefined && when === null) {
		const err = new Error('scoreTime 格式不正确');
		err.statusCode = 400;
		throw err;
	}

	const [insertId] = await db('game_scores').insert({
		user_id: userId,
		score: numericScore,
		...(when ? { score_time: when } : {})
	});

	const row = await db('game_scores')
		.select('id', 'user_id', 'score', 'score_time', 'created_at')
		.where({ id: insertId })
		.first();

	return row;
}

async function getLeaderboard({ limit = 10 } = {}) {
	const size = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

	const rows = await db('game_scores as gs')
		.join('users as u', 'u.id', 'gs.user_id')
		.select('u.avatar', 'u.username', 'gs.score', 'gs.score_time')
		.orderBy('gs.score', 'desc')
		.orderBy('gs.score_time', 'asc')
		.limit(size);

	return rows;
}

module.exports = {
	createScoreRecord,
	getLeaderboard
};
