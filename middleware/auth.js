const jwt = require('jsonwebtoken');
const userService = require('../services/userService'); 

async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: '用户未登录' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: '用户未登录' });

    try {
        // 1. JWT 自带过期验证 (如果过期，这里直接 throw 错误)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 2. 查库获取最新状态
        const user = await userService.getUserById(decoded.id);

        if (!user) {
            return res.status(401).json({ error: '用户不存在' });
        }
		// console.log("decoded,user:",decoded,user,)

		// 3.如果用户重新登录了，数据库 version 会变 (+1)，而旧 Token 里的 version 还是旧的
		if (decoded.tokenVersion !== user.token_version) {
			return res.status(401).json({ error: '会话已失效，您已在其他设备登录' });
		}

        // 4. 【增强】二次验证数据库中的过期时间 (实现强制下线功能)
        // 只有当你确实在 login 时更新了 user.token_expires_at 字段，这段代码才有意义
        if (user.token_expires_at) {
            const dbExpiresAt = new Date(user.token_expires_at);
            if (dbExpiresAt < new Date()) {
                return res.status(401).json({ error: '会话已过期，请重新登录' });
            }
        }

        req.user = user;
        next();
    } catch (err) {
        // 区分一下错误类型会让调试更清晰 (可选)
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token 已过期' });
        }
        return res.status(401).json({ error: 'Token 无效或认证失败' });
    }
}

module.exports = authMiddleware;