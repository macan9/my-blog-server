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
		const { title, content, summary,  status } = req.body;

		// 从认证中间件获取当前登录用户的 ID
		const userId = req.user.id;

		if (!userId) {
			return res.status(401).json({ error: '未授权，请先登录' });
		}

		const newPost = await postService.createPost(
			{ title, content, summary, status },
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
router.get('single/:id', async (req, res, next) => {
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


router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { 
      page, 
      pageSize, 
      keyword, 
      startDate, 
      endDate, 
      status 
    } = req.query;

    // 场景判断：
    // 1. 如果是访问 '/api/posts/my' (个人中心)，强制加上当前用户ID
    // 2. 如果是访问 '/api/posts' (公开列表)，不加 userId，只看公开的
    
    // 这里演示一个通用的列表接口，通过参数控制是否查自己的
    // 或者你可以拆分两个路由：/my (强制 userId) 和 / (公开)
    
    let userId = null;
    
    // 示例：如果请求路径是 /my，或者有个参数 ?mine=true
    if (req.path === '/my' || req.query.mine === 'true') {
      userId = req.user.id; // 只有登录用户才能查自己的
    }

    const result = await postService.getPostList({
      userId: userId,
      keyword: keyword,
      startDate: startDate,
      endDate: endDate,
      status: status ? parseInt(status) : undefined,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 10
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

// 专门查自己文章的路由示例
router.get('/my', authMiddleware, async (req, res, next) => {
  // 复用上面的逻辑，或者直接调用 service 并强制传 userId
  // 这里为了演示拆分，你可以把上面的逻辑提取出来，或者简单地：
  try {
     const { page, pageSize, keyword, startDate, endDate, status } = req.query;
     
     const result = await postService.getPostList({
       userId: req.user.id, // 强制绑定当前用户
       keyword,
       startDate,
       endDate,
       status: status ? parseInt(status) : undefined, // 允许用户查自己的草稿
       page: page ? parseInt(page) : 1,
       pageSize: pageSize ? parseInt(pageSize) : 10
     });
     
     res.json({ code: 200, data: result });
  } catch (e) {
	console.log("e:",e)
    next(e);
  }
});

// 修改文章
router.put('/:id',authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id; // 假设中间件已解析 token 并放入 req.user

        if (!userId) {
            return res.status(401).json({ message: '未授权，请先登录' });
        }

        // 从 Body 获取更新数据
        const { title, content, status, tags } = req.body;

        // 简单校验：至少得有一个字段要更新
        if (!title && !content && status === undefined) {
            return res.status(400).json({ message: '请提供至少一个要更新的字段 (title, content, status)' });
        }

        const updatedPost = await postService.updatePost(id, userId, {
            title,
            content,
            status,
            tags // 假设 tags 是数组或逗号分隔字符串
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
 * @route   DELETE /api/posts/:id
 * @desc    删除文章
 * @access  Private (需要登录)
 */
router.delete('/:id',authMiddleware, async (req, res) => {
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