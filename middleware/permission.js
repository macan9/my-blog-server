async function permissionMiddleware(req, res, next) {
	const currentUser = req.user;
	const targetUserId = Number(req.params.id);

	try {
		const targetUser = await userService.getUserById(targetUserId);

		if (!targetUser) {
			return res.status(404).json({ error: '用户不存在' });
		}

		// 管理员逻辑
		if (currentUser.auth === 1) {

			// 不允许管理员操作其他管理员
			if (targetUser.auth === 1) {
				return res.status(403).json({ error: '不能操作管理员账号' });
			}

			return next();
		}

		// 普通用户逻辑
		if (currentUser.auth === 2) {

			if (currentUser.id !== targetUserId) {
				return res.status(403).json({ error: '只能操作自己的账号' });
			}

			return next();
		}

		return res.status(403).json({ error: '权限不足' });

	} catch (err) {
		return res.status(500).json({ error: '权限校验失败' });
	}
}

module.exports = permissionMiddleware;