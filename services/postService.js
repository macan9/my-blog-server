// services/postService.js
const db = require('../config/db');

/**
 * 创建新文章
 * @param {Object} postData - 文章数据 { title, content, summary? }
 * @param {Number} userId - 作者 ID (从认证中间件获取)
 * @returns {Promise<Object>} 返回创建成功的文章对象
 */
async function createPost(postData, userId) {
	const { title, content, summary } = postData;

	// 基础校验
	if (!title || !content) {
		throw new Error('标题和内容不能为空');
	}

	// 生成 slug (可选逻辑：将标题转为 URL 友好格式，这里简单演示)
	const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

	const [newPost] = await db.into('posts')
		.insert({
			title: title,
			content: content,
			summary: summary || null,
			slug: slug,
			user_id: userId, // 核心：关联当前用户
			status: 1, // 默认状态：1=发布 (或者 0=草稿，看你的需求)
			// created_at 和 updated_at 由 knex timestamps(true, true) 自动处理
		})
		.returning('*'); // Knex 返回插入后的完整行数据

	if (!newPost) {
		throw new Error('创建文章失败');
	}

	return newPost;
}

/**
 * 获取单篇文章详情 (包含作者信息)
 * @param {Number} postId 
 * @returns {Promise<Object|null>}
 */
async function getPostById(postId) {
	const post = await db.into('posts')
		.select('posts.*', 'users.username as author_name', 'users.avatar as author_avatar')
		.join('users', 'posts.user_id', 'users.id')
		.where('posts.id', postId)
		.first();

	return post || null;
}

/**
 * 获取文章列表 (分页)
 * @param {Number} page 
 * @param {Number} pageSize 
 * @returns {Promise<{data: Array, total: Number}>}
 */
async function getPostList(page = 1, pageSize = 10) {
	const offset = (page - 1) * pageSize;

	// 先查总数
	const [{ count }] = await db.into('posts').where({ status: 1 }).count();

	// 再查数据
	const data = await db.into('posts')
		.select('posts.id', 'posts.title', 'posts.summary', 'posts.slug', 'posts.created_at', 'users.username as author_name')
		.join('users', 'posts.user_id', 'users.id')
		.where('posts.status', 1) // 只查已发布的
		.orderBy('posts.created_at', 'desc')
		.limit(pageSize)
		.offset(offset);

	return {
		data,
		total: parseInt(count),
		page: parseInt(page),
		pageSize: parseInt(pageSize)
	};
}

module.exports = {
	createPost,
	getPostById,
	getPostList
};