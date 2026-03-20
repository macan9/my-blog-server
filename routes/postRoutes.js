// routes/postRoutes.js
const express = require('express');
const router = express.Router();
const postService = require('../services/postService');
const authMiddleware = require('../middleware/auth');

/**
 * POST /api/posts
 * 创建文章
 */
router.post('/', authMiddleware, async (req, res, next) => {
	try {
		const { title, content, summary, status, cover_image, tags, is_top } = req.body;
		const userId = req.user.id;

		if (!userId) {
			return res.status(401).json({ error: '未授权，请先登录' });
		}

		const newPost = await postService.createPost(
			{ title, content, summary, status, cover_image, tags, is_top },
			userId
		);

		res.status(201).json({
			message: '文章创建成功',
			data: newPost
		});
	} catch (error) {
		console.error('Create Post Error:', error);
		if (error.message.includes('不能为空')) {
			return res.status(400).json({ error: error.message });
		}
		next(error);
	}
});

/**
 * GET /api/posts/single/:id
 * 获取文章详情
 */
router.get('/single/:id', async (req, res, next) => {
	try {
		const postId = parseInt(req.params.id, 10);
		if (isNaN(postId)) {
			return res.status(400).json({ error: '无效的文章ID' });
		}

		const post = await postService.getPostById(postId);

		if (!post) {
			return res.status(404).json({ error: '文章不存在' });
		}

		res.json({
			code: 200,
			message: 'success',
			data: post
		});
	} catch (error) {
		console.error('Get Post Detail Error:', error);
		next(error);
	}
});

router.get('/', authMiddleware, async (req, res, next) => {
	try {
		const {
			page,
			pageSize,
			keyword,
			startDate,
			endDate,
			status,
			userId
		} = req.query;

		const result = await postService.getPostList({
			userId: userId,
			keyword: keyword,
			startDate: startDate,
			endDate: endDate,
			status: status ? parseInt(status, 10) : undefined,
			page: page ? parseInt(page, 10) : 1,
			pageSize: pageSize ? parseInt(pageSize, 10) : 10
		});

		res.json({
			code: 200,
			message: 'success',
			data: result
		});
	} catch (error) {
		console.error('Get Post List Error:', error);
		next(error);
	}
});

router.get('/my', authMiddleware, async (req, res, next) => {
	try {
		const { page, pageSize, keyword, startDate, endDate, status } = req.query;

		const result = await postService.getPostList({
			userId: req.user.id,
			keyword,
			startDate,
			endDate,
			status: status ? parseInt(status, 10) : undefined,
			page: page ? parseInt(page, 10) : 1,
			pageSize: pageSize ? parseInt(pageSize, 10) : 10
		});

		res.json({
			code: 200,
			message: 'success',
			data: result
		});
	} catch (error) {
		console.log('Get My Post List Error:', error);
		next(error);
	}
});

router.put('/:id', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({ message: '未授权，请先登录' });
		}

		const { title, content, summary, status, tags, cover_image, is_top } = req.body;

		if (
			title === undefined &&
			content === undefined &&
			summary === undefined &&
			status === undefined &&
			tags === undefined &&
			cover_image === undefined &&
			is_top === undefined
		) {
			return res.status(400).json({
				message: '请至少提供一个要更新的字段(title, content, summary, status, tags, cover_image, is_top)'
			});
		}

		const updatedPost = await postService.updatePost(id, userId, {
			title,
			content,
			summary,
			status,
			tags,
			cover_image,
			is_top
		});

		res.json({
			message: '文章更新成功',
			data: updatedPost
		});
	} catch (error) {
		console.error('Update post error:', error);
		if (error.message === 'Post not found') {
			return res.status(404).json({ message: '文章不存在' });
		}
		if (error.message === 'Permission denied') {
			return res.status(403).json({ message: '无权修改此文章' });
		}
		res.status(500).json({ message: '服务器内部错误', error: error.message });
	}
});

/**
 * DELETE /api/posts/:id
 * 删除文章
 */
router.delete('/:id', authMiddleware, async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({ message: '未授权，请先登录' });
		}

		await postService.deletePost(id, userId);

		res.json({
			message: '文章删除成功',
			data: { id }
		});
	} catch (error) {
		console.error('Delete post error:', error);
		if (error.message === 'Post not found') {
			return res.status(404).json({ message: '文章不存在' });
		}
		if (error.message === 'Permission denied') {
			return res.status(403).json({ message: '无权删除此文章' });
		}
		res.status(500).json({ message: '服务器内部错误', error: error.message });
	}
});

module.exports = router;
