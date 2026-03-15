const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth');
const gameScoreService = require('../services/gameScoreService');

// GET /api/game-scores/leaderboard?limit=10
router.get('/leaderboard', async (req, res) => {
	try {
		const { limit } = req.query;
		const list = await gameScoreService.getLeaderboard({ limit });
		res.json({ success: true, data: list });
	} catch (error) {
		console.error('Get leaderboard error:', error);
		res.status(500).json({ success: false, error: '服务器内部错误' });
	}
});

// POST /api/game-scores
// body: { score, scoreTime?, userId? } (userId 仅管理员可指定)
	router.post('/', authMiddleware, async (req, res) => {
		try {
			const { score, scoreTime, userId } = req.body || {};

			let targetUserId = req.user?.id;
			if (userId !== undefined && userId !== null && req.user?.auth === 1) {
				const parsed = Number(userId);
				if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
					return res.status(400).json({ success: false, error: 'userId 必须为正整数' });
				}
				targetUserId = parsed;
			}

		const record = await gameScoreService.createScoreRecord({
			userId: targetUserId,
			score,
			scoreTime
		});

		res.status(201).json({ success: true, message: '新增分数记录成功', data: record });
	} catch (error) {
		const status = error?.statusCode || error?.status || null;
		if (status && status >= 400 && status < 600) {
			return res.status(status).json({ success: false, error: error.message || '请求失败' });
		}
		console.error('Create score record error:', error);
		res.status(500).json({ success: false, error: '服务器内部错误' });
	}
});

module.exports = router;
