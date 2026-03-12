// services/postService.js
const db = require('../config/db');

/**
 * 创建新文章
 * @param {Object} postData - 文章数据 { title, content, summary? }
 * @param {Number} userId - 作者 ID (从认证中间件获取)
 * @returns {Promise<Object>} 返回创建成功的文章对象
 */
async function createPost(postData, userId) {
	const { title, content, summary,status } = postData;

	// 1. 基础校验
	if (!title || !content) {
		throw new Error('标题和内容不能为空');
	}

	// 生成 slug
	const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

	const insertData = {
		title: title,
		content: content,
		summary: summary || null,
		slug: slug,
		user_id: userId,
		status: status===undefined?1:status,
		// created_at 和 updated_at 会自动由 knex/timestamps 处理
	};

	try {
		// 2. 执行插入 (不要加 .returning())
		// insert 返回的是一个数组，包含受影响的行数或 ID (取决于驱动实现，通常是 [id])
		const insertResult = await db.into('posts').insert(insertData);

		// 3. 获取新生成的 ID
		// MySQL 驱动通常直接返回 ID 数组，例如 [5]
		// 如果返回的是 [{ insertId: 5 }] 这种对象，需要做相应适配
		let newId;

		if (Array.isArray(insertResult) && insertResult.length > 0) {
			// 情况 A: 直接返回 ID 列表 [1, 2, ...] (常见于 mysql2)
			if (typeof insertResult[0] === 'number') {
				newId = insertResult[0];
			}
			// 情况 B: 返回对象列表 [{ insertId: 1 }] (常见于某些配置)
			else if (typeof insertResult[0] === 'object' && insertResult[0].insertId) {
				newId = insertResult[0].insertId;
			}
		}

		if (!newId) {
			throw new Error('获取新生成的文章 ID 失败');
		}

		// 4. 根据 ID 查询完整数据并返回
		const [newPost] = await db.into('posts')
			.select('*')
			.where('id', newId);

		if (!newPost) {
			throw new Error('文章创建成功但无法读取数据');
		}

		return newPost;

	} catch (error) {
		// 捕获具体的数据库错误并抛出更友好的信息
		console.error('Database Insert Error:', error);
		if (error.code === 'ER_DUP_ENTRY') {
			throw new Error('标题或 Slug 已存在');
		}
		// 重新抛出，让路由层处理
		throw error;
	}
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
 * 获取文章列表 (支持多条件筛选)
 * @param {Object} options - 筛选选项
 * @param {Number} [options.userId] - 指定用户ID (查该用户的文章，不传则查所有/公开)
 * @param {String} [options.keyword] - 标题模糊搜索关键词
 * @param {String} [options.startDate] - 开始时间 (ISO字符串 'YYYY-MM-DD')
 * @param {String} [options.endDate] - 结束时间 (ISO字符串 'YYYY-MM-DD')
 * @param {Number} [options.status] - 文章状态 (0:草稿, 1:发布)。如果不传，默认只查发布的(除非指定了userId查自己的)
 * @param {Number} [options.page] - 页码，默认 1
 * @param {Number} [options.pageSize] - 每页数量，默认 10
 * 
 * @returns {Promise<{data: Array, total: Number, page: Number, pageSize: Number}>}
 */
async function getPostList(options = {}) {
	const {
		userId,
		keyword,
		startDate,
		endDate,
		status,
		page = 1,
		pageSize = 10
	} = options;

	const offset = (page - 1) * pageSize;

	// --- 第一步：构建基础查询对象 (用于计数和查数据) ---
	// 我们创建一个辅助函数来应用相同的过滤条件，避免代码重复

	const applyFilters = (query) => {
		// 1. 根据用户ID筛选
		if (userId) {
			query.where('posts.user_id', userId);
		}

		// 2. 根据标题模糊查询
		if (keyword && typeof keyword === 'string') {
			// 使用 like '%keyword%'
			query.where('posts.title', 'like', `%${keyword}%`);
		}

		// 3. 根据时间范围筛选
		if (startDate) {
			query.where('posts.created_at', '>=', startDate);
		}
		if (endDate) {
			// 确保包含结束日期的全天，通常建议将 endDate 设为当天的 23:59:59 或者在代码里处理
			// 这里简单处理为 >= startDate AND < (endDate + 1天) 或者直接 >= endDate
			// 如果前端传的是 '2026-03-06'，数据库是 datetime，建议直接比较
			query.where('posts.created_at', '<=', endDate);
		}

		// 4. 状态筛选逻辑
		// 如果传了 status，直接用传的
		// 如果没传 status 且 没传 userId (公开列表)，默认只查已发布 (status=1)
		// 如果没传 status 但 传了 userId (个人列表)，通常应该查出所有状态(包括草稿)，所以不追加 where
		if (status !== undefined && status !== null) {
			query.where('posts.status', status);
		} else if (!userId) {
			// 公开列表默认只看发布的
			query.where('posts.status', 1);
		}

		return query;
	};

	// --- 第二步：获取总数 (Count) ---
	// 注意：count 在不同数据库驱动返回格式可能不同，通常是 [{ count: 10 }] 或 [{ 'count(*)': 10 }]
	let countQuery = db.into('posts'); // 使用你的 db.into 写法
	countQuery = applyFilters(countQuery);

	const countResult = await countQuery.count('* as total').first();

	// 兼容不同的返回格式
	const total = countResult ? (countResult.total || countResult['count(*)'] || 0) : 0;

	// 如果总数为0，直接返回空数组，避免执行下面的查询
	if (total === 0) {
		return {
			data: [],
			total: 0,
			page: parseInt(page),
			pageSize: parseInt(pageSize)
		};
	}

	// --- 第三步：获取数据列表 (Select) ---
	let dataQuery = db.into('posts');

	// 选择需要的字段，并关联用户表获取作者名 (即使查自己的文章，带上作者名也方便前端展示)
	dataQuery.select(
		'posts.id',
		'posts.title',
		'posts.summary',
		'posts.slug',
		'posts.status',
		'posts.content',
		'posts.created_at',
		'posts.updated_at',
		'users.username as author_name',
		'users.avatar as author_avatar'
	);

	// 关联用户表 (Left Join 防止用户被删导致文章查不出，或者 Inner Join 严格匹配)
	// 这里用 join 默认是 inner join，如果用户被删了文章就不显示了。
	// 如果想显示文章但作者显示未知，可以用 leftJoin
	dataQuery.join('users', 'posts.user_id', 'users.id');

	// 应用相同的过滤条件
	dataQuery = applyFilters(dataQuery);

	// 排序：默认按创建时间倒序
	dataQuery.orderBy('posts.created_at', 'desc');

	// 分页
	dataQuery.limit(pageSize).offset(offset);

	const data = await dataQuery;

	return {
		data,
		total: parseInt(total),
		page: parseInt(page),
		page_size: parseInt(pageSize), // 保持风格统一
		has_more: offset + data.length < total
	};
}

/**
 * 更新文章
 * @param {string|number} id - 文章 ID
 * @param {number} userId - 当前用户 ID (用于权限校验)
 * @param {Object} data - 要更新的数据 { title, content, status, tags }
 */
async function updatePost(id, userId, data) {
    // 1. 先查询文章是否存在，且属于当前用户
    const post = await db('posts')
        .where({ id, user_id: userId })
        .first();

    if (!post) {
        // 如果查不到，可能是文章不存在，也可能是属于别人
        // 为了安全，统一提示“不存在”或“无权限”，这里我们细分一下逻辑
        const exists = await db('posts').where({ id }).first();
        if (!exists) {
            const error = new Error('Post not found');
            throw error;
        }
        const error = new Error('Permission denied');
        throw error;
    }

    // 2. 准备更新数据
    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.status !== undefined) updateData.status = data.status;
    
    // 处理标签 (假设 tags 是数组，转为逗号分隔字符串存储，或者你有单独的标签表)
    if (data.tags !== undefined) {
        if (Array.isArray(data.tags)) {
            updateData.tags = data.tags.join(',');
        } else {
            updateData.tags = data.tags;
        }
    }

    // 自动更新更新时间
    updateData.updated_at = db.fn.now();

    // 3. 执行更新
    await db('posts')
        .where({ id })
        .update(updateData);

    // 4. 返回更新后的完整数据
    const updatedPost = await db('posts')
        .where({ id })
        .first();

    return updatedPost;
}

/**
 * 删除文章
 * @param {string|number} id - 文章 ID
 * @param {number} userId - 当前用户 ID
 */
async function deletePost(id, userId) {
    // 1. 权限校验 & 存在性检查
    // 直接在 delete 语句中带上 user_id 条件，如果 affectedRows 为 0，说明要么不存在，要么不属于该用户
    const affectedRows = await db('posts')
        .where({ id, user_id: userId })
        .del(); // Knex 的删除方法

    if (affectedRows === 0) {
        const exists = await db('posts').where({ id }).first();
        if (!exists) {
            const error = new Error('Post not found');
            throw error;
        }
        const error = new Error('Permission denied');
        throw error;
    }

    // 如果是“软删除”，代码应该是这样：
    /*
    const affectedRows = await db('posts')
        .where({ id, user_id: userId })
        .update({ 
            status: -1, // 假设 -1 代表已删除
            deleted_at: db.fn.now() 
        });
    */

    return true;
}


module.exports = {
	createPost,
	getPostById,
	getPostList,
	updatePost,
	deletePost
};