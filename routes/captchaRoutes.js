const express = require('express');
const svgCaptcha = require('svg-captcha');

const router = express.Router();

// GET /api/captcha - 生成图形验证码（1 秒限频）
router.get('/captcha', (req, res) => {
	if (!req.session) {
		return res.status(500).json({ error: 'Session 未启用，无法生成验证码' });
	}

	// 频率限制：1 秒只能请求一次
	const now = Date.now();
	const lastTime = req.session.lastCaptchaAt || 0;
	if (now - lastTime < 1000) {
		return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
	}

	// 生成验证码
	const captcha = svgCaptcha.create({
		size: 4,
		noise: 2,
		color: true,
		ignoreChars: '0oO1ilI', // 避免易混淆字符
		background: '#f5f5f5'
	});

	// 存入 session，统一用小写存储
	req.session.captchaText = captcha.text.toLowerCase();
	req.session.lastCaptchaAt = now;

	// 返回 SVG 图片
	res.type('svg');
	res.status(200).send(captcha.data);
});

module.exports = router;

