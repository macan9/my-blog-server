function adminOnly(req, res, next) {
	const currentUser = req.user;

	if (!currentUser) {
		return res.status(401).json({ error: '未登录或认证失败' });
	}

	// 只有 auth === 1 的用户允许访问
	if (currentUser.auth !== 1) {
		return res.status(403).json({ error: '权限不足，仅管理员可访问' });
	}

	next();
}

module.exports = adminOnly;

