// routes/postRoutes.js
const express = require('express');
const router = express.Router();
const postService = require('../services/postService');
// 假设你有这样一个中间件来验证登录并挂载 req.user
const authMiddleware = require('../middleware/auth');

/**
 * POST /api/posts
 * 创建新文章
 * 需要登录权限
 */
router.post('/', authMiddleware, async (req, res, next) => {
	try {
		const { title, content, summary } = req.body;

		// 从认证中间件获取当前登录用户的 ID
		const userId = req.user.id;

		if (!userId) {
			return res.status(401).json({ error: '未授权，请先登录' });
		}

		const newPost = await postService.createPost(
			{ title, content, summary },
			userId
		);

		res.status(201).json({
			message: '文章创建成功',
			data: newPost
		});

	} catch (error) {
		// 统一错误处理
		console.error('Create Post Error:', error);
		if (error.message.includes('不能为空')) {
			return res.status(400).json({ error: error.message });
		}
		next(error); // 交给全局错误处理中间件
	}
});

/**
 * GET /api/posts/:id
 * 获取文章详情
 * 公开访问 (或者也可以加 authMiddleware 限制)
 */
router.get('/:id', async (req, res, next) => {
	try {
		const postId = parseInt(req.params.id);
		if (isNaN(postId)) {
			return res.status(400).json({ error: '无效的文章ID' });
		}

		const post = await postService.getPostById(postId);

		if (!post) {
			return res.status(404).json({ error: '文章不存在' });
		}

		res.json({ data: post });

	} catch (error) {
		next(error);
	}
});

/**
 * GET /api/posts
 * 获取文章列表
 */
router.get('/', async (req, res, next) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const pageSize = parseInt(req.query.pageSize) || 10;

		const result = await postService.getPostList(page, pageSize);

		res.json({ data: result });

	} catch (error) {
		next(error);
	}
});

module.exports = router;