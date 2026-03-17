// routes/userRoutes.js   
// 负责接收 HTTP 请求、提取参数、调用 Service、处理异常并返回响应
const express = require('express');
const router = express.Router();

// 引入服务层
const userService = require('../services/userService');

// 引入中间件
const authMiddleware = require('../middleware/auth');
const permissionMiddleware = require('../middleware/permission');
const adminOnly = require('../middleware/adminOnly');
const validateCaptcha = require('../middleware/validateCaptcha');

// POST /api/users - 创建用户（注册，带图形验证码）
router.post('/', validateCaptcha, async (req, res) => {
	const { username, password, email, auth, passwordEncrypted } = req.body;

	if (!username || !password) {
		return res.status(400).json({ error: '用户名和密码不能为空' });
	}

	try {
		const newUser = await userService.createUser({ username, password, email, auth, passwordEncrypted });
		res.status(201).json({
			message: '用户创建成功',
			data: newUser
		});
	} catch (error) {
		console.error('创建用户失败:', error);
		if (error.code === 'ER_DUP_ENTRY') {
			return res.status(409).json({ error: '用户名已存在' });
		}
		// 安全处理，避免循环引用
		return res.status(500).json({
			error: '服务器内部错误',
			details: error.message || String(error)
		});
	}
});

// GET /api/users - 获取所有用户
router.get('/', authMiddleware, async (req, res) => {
	try {
		const users = await userService.getAllUsers();
		res.json({ success: true, data: users });
	} catch (error) {
		console.error('获取用户列表失败:', error);
		res.status(500).json({ success: false, error: '服务器内部错误' });
	}
});

// GET /api/users/login-logs - 获取登录日志（需要管理员权限）
// 支持分页与时间范围过滤：
// - currentPage: 当前页（从 1 开始）
// - pageSize: 每页数量
// - start_time / end_time: 时间范围（例如：2025-03-11 20:48:24）
router.get('/login-logs', authMiddleware, adminOnly, async (req, res) => {
	try {
		const { currentPage, pageSize, start_time, end_time } = req.query;
		const result = await userService.getLoginLogs({
			currentPage,
			pageSize,
			startTime: start_time,
			endTime: end_time
		});
		res.json({ success: true, data: result });
	} catch (error) {
		console.error('获取登录日志失败:', error);
		res.status(500).json({ success: false, error: '服务器内部错误' });
	}
});

// GET /api/users/:id - 获取单个用户
router.get('/:id', authMiddleware, async (req, res) => {
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
router.put('/:id', authMiddleware, permissionMiddleware, async (req, res) => {
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
		const status = error?.statusCode || error?.status || null;
		if (status && status >= 400 && status < 600) {
			return res.status(status).json({ success: false, error: error.message || '请求失败' });
		}
		if (error.message === '用户不存在') return res.status(404).json({ success: false, error: error.message });
		console.error('更新用户失败:', error);
		res.status(500).json({ success: false, error: '服务器内部错误', details: error.message });
	}
});

// DELETE /api/users/:id - 删除用户
router.delete('/:id', authMiddleware, permissionMiddleware, async (req, res) => {
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

// POST /api/users/login - 登录（带图形验证码 + 登录日志）
router.post('/login', validateCaptcha, async (req, res) => {
	const { username, password, passwordEncrypted } = req.body;

	console.log('login debug:', {
		username,
		password,
		passwordLength: typeof password === 'string' ? password.length : null,
		passwordEncrypted,
		passwordEncryptType: req.body.passwordEncryptType
	});
	
	if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

	// 获取 IP 和 UA（考虑反向代理）
	const ip =
		(req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0].trim()) ||
		req.ip ||
		req.socket?.remoteAddress ||
		null;
	const userAgent = req.headers['user-agent'] || null;

	try {
		const loginResult = await userService.login(username, password, { passwordEncrypted });

		if (!loginResult) {
			// 登录失败（用户名/密码错误）
			await userService.logLoginAttempt({
				userId: null,
				username,
				ip,
				userAgent,
				success: false,
				message: '用户名或密码错误'
			});
			return res.status(401).json({ error: '用户名或密码错误' });
		}

		// 登录成功
		await userService.logLoginAttempt({
			userId: loginResult.user.id,
			username: loginResult.user.username,
			ip,
			userAgent,
			success: true,
			message: '登录成功'
		});

		res.status(200).json({ message: '登录成功', data: loginResult });
	} catch (err) {
		console.error(err);

		// 异常也记录为一次失败的登录尝试
		try {
			await userService.logLoginAttempt({
				userId: null,
				username,
				ip,
				userAgent,
				success: false,
				message: '服务器异常：' + (err.message || String(err))
			});
		} catch (logErr) {
			console.error('记录登录日志失败：', logErr);
		}

		res.status(500).json({ error: '服务器内部错误' });
	}
});

// GET /api/users/login-logs - 获取登录日志（需要管理员权限）
router.get('/login-logs', authMiddleware, permissionMiddleware, async (req, res) => {
	try {
		const logs = await userService.getLoginLogs();
		res.json({ success: true, data: logs });
	} catch (error) {
		console.error('获取登录日志失败:', error);
		res.status(500).json({ success: false, error: '服务器内部错误' });
	}
});

module.exports = router;
