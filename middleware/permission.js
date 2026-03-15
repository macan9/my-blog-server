const userService = require('../services/userService'); // 引入
async function permissionMiddleware(req, res, next) {
	// 1. 直接从 req.user 获取，这是认证中间件查好的
	const currentUser = req.user;

	// 【安全检查】如果前面的认证中间件没生效，req.user 会是 undefined
	if (!currentUser) {
		
		return res.status(401).json({ error: '未登录或认证失败' });
	}

	try {
		const targetUserId = Number(req.params.id);
		if (!Number.isFinite(targetUserId)) {
			return res.status(400).json({ error: 'Invalid user id' });
		}

		const currentUserId = Number(currentUser.id);
		const isSelf = currentUserId === targetUserId;
		const targetUser = await userService.getUserById(targetUserId);

		if (!targetUser) {
			return res.status(404).json({ error: '用户不存在' });
		}

		// 管理员逻辑
		if (currentUser.auth === 1) {

			// 不允许管理员操作其他管理员（但允许操作自己的管理员账号）
			if (targetUser.auth === 1 && !isSelf) {
				return res.status(403).json({ error: '不能操作管理员账号' });
			}

			return next();
		}

		// 普通用户逻辑
		if (currentUser.auth === 2) {

			if (currentUserId !== targetUserId) {
				return res.status(403).json({ error: '只能操作自己的账号' });
			}

			return next();
		}

		return res.status(403).json({ error: '权限不足' });

	} catch (err) {
		return res.status(500).json({
			error: '权限校验失败'
		});
	}
}

module.exports = permissionMiddleware;
