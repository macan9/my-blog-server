// routes/userRoutes.js
const express = require('express');
const router = express.Router();

// 引入服务层
const userService = require('../services/userService');

// POST /api/users - 创建用户
router.post('/', async (req, res) => {
	const { username, password, email } = req.body;

	if (!username || !password) {
		return res.status(400).json({ error: '用户名和密码不能为空' });
	}

	try {
		const newUser = await userService.createUser({ username, password, email });
		res.status(201).json({
			message: '用户创建成功',
			data: newUser
		});
	} catch (error) {
		console.error('创建用户失败:', error);
		if (error.code === 'ER_DUP_ENTRY') {
			return res.status(409).json({ error: '用户名已存在' });
		}
		res.status(500).json({ error: '服务器内部错误', details: error.message });
	}
});

// GET /api/users - 获取所有用户
router.get('/', async (req, res) => {
	try {
		const users = await userService.getAllUsers();
		res.json({ success: true, data: users });
	} catch (error) {
		console.error('获取用户列表失败:', error);
		res.status(500).json({ success: false, error: '服务器内部错误' });
	}
});

// GET /api/users/:id - 获取单个用户
router.get('/:id', async (req, res) => {
	try {
		const user = await userService.getUserById(req.params.id);

		if (!user) {
			return res.status(404).json({ success: false, error: '用户未找到' });
		}

		res.json({ success: true, data: user });
	} catch (error) {
		console.error('获取用户详情失败:', error);
		res.status(500).json({ success: false, error: '服务器内部错误' });
	}
});

// PUT /api/users/:id - 更新用户
router.put('/:id', async (req, res) => {
	try {
		// 简单的参数校验
		if (!req.body || Object.keys(req.body).length === 0) {
			return res.status(400).json({ success: false, error: '请求体不能为空' });
		}

		const updatedUser = await userService.updateUser(req.params.id, req.body);

		res.json({
			success: true,
			message: '用户更新成功',
			data: updatedUser
		});
	} catch (error) {
		if (error.message === '用户不存在') {
			return res.status(404).json({ success: false, error: error.message });
		}
		console.error('更新用户失败:', error);
		res.status(500).json({ success: false, error: '服务器内部错误', details: error.message });
	}
});

// DELETE /api/users/:id - 删除用户
router.delete('/:id', async (req, res) => {
	try {
		await userService.deleteUser(req.params.id);
		res.json({ success: true, message: '用户删除成功' });
	} catch (error) {
		if (error.message === '用户不存在，无法删除') {
			return res.status(404).json({ success: false, error: error.message });
		}
		console.error('删除用户失败:', error);
		res.status(500).json({ success: false, error: '服务器内部错误' });
	}
});

// POST /api/users/login - 登录测试
router.post('/login', async (req, res) => {
	const { username, password } = req.body;

	// 1. 基础校验
	if (!username || !password) {
		return res.status(400).json({ error: '用户名和密码不能为空' });
	}

	try {
		// 2. 调用服务层验证
		const user = await userService.login(username, password);

		if (!user) {
			// 登录失败（用户不存在 或 密码错误）
			// 为了安全，通常不提示具体是哪种错误，统一提示“用户名或密码错误”
			return res.status(401).json({ error: '用户名或密码错误' });
		}

		// 3. 登录成功
		// 在实际项目中，这里通常会生成一个 JWT Token 返回给前端
		res.status(200).json({
			message: '登录成功',
			data: user
		});

	} catch (error) {
		console.error('登录过程出错:', error);
		res.status(500).json({ error: '服务器内部错误', details: error.message });
	}
});

module.exports = router;