const captchaStore = require('../services/captchaStore');

// 校验图形验证码的中间件
// 默认从 req.body.captcha 读取用户输入
function validateCaptcha(req, res, next) {
	const inputCode = (req.body && req.body.captcha) ? String(req.body.captcha).toLowerCase() : '';
	const sessionCode = req.session ? req.session.captchaText : null;
	const captchaId =
		(req.body && (req.body.captchaId || req.body.captcha_id || req.body.captchaToken || req.body.captcha_token)) ||
		req.headers['x-captcha-id'] ||
		req.headers['x-captcha-token'] ||
		null;

	if (!inputCode) {
		return res.status(400).json({ error: '请输入验证码' });
	}

	// 优先使用 session 验证
	if (sessionCode) {
		if (sessionCode !== inputCode) {
			return res.status(400).json({ error: '验证码错误' });
		}
		// 验证通过后清除，防止重复使用
		req.session.captchaText = null;
		return next();
	}

	// token 兜底（不依赖 cookie/session）
	if (captchaId) {
		const tokenText = captchaStore.consume(String(captchaId));
		if (!tokenText) {
			return res.status(400).json({ error: '验证码已过期或不存在，请重新获取' });
		}
		if (tokenText !== inputCode) {
			return res.status(400).json({ error: '验证码错误' });
		}
		return next();
	}

	return res.status(400).json({
		error: '验证码已过期或不存在，请重新获取',
		hint: '可能是跨域请求未携带 Cookie/Session；可改用 /api/captcha/json 获取 captchaId，并在登录/注册时一并传 captchaId（或请求头 X-Captcha-Id）'
	});
}

module.exports = validateCaptcha;
