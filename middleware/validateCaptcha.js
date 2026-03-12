// 校验图形验证码的中间件
// 默认从 req.body.captcha 读取用户输入
function validateCaptcha(req, res, next) {
	if (!req.session) {
		return res.status(500).json({ error: 'Session 未启用，无法校验验证码' });
	}

	const sessionCode = req.session.captchaText;
	const inputCode = (req.body && req.body.captcha) ? String(req.body.captcha).toLowerCase() : '';

	if (!sessionCode) {
		return res.status(400).json({ error: '验证码已过期或不存在，请重新获取' });
	}

	if (!inputCode) {
		return res.status(400).json({ error: '请输入验证码' });
	}

	if (sessionCode !== inputCode) {
		return res.status(400).json({ error: '验证码错误' });
	}

	// 验证通过后清除，防止重复使用
	req.session.captchaText = null;

	next();
}

module.exports = validateCaptcha;

