const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
	const authHeader = req.headers.authorization;
	if (!authHeader) {
		return res.status(401).json({ error: '用户未登录' });
	}

	const token = authHeader.split(' ')[1]; // Bearer token
	if (!token) return res.status(401).json({ error: '用户未登录' });

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = decoded; // 挂载用户信息到 req
		next();
	} catch (err) {
		return res.status(401).json({ error: 'Token 无效或过期' });
	}
}

module.exports = authMiddleware;