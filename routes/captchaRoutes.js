const express = require('express');
const svgCaptcha = require('svg-captcha');
const captchaStore = require('../services/captchaStore');

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

	const captcha = svgCaptcha.create({
		size: 4,
		noise: 2,
		color: true,
		ignoreChars: '0oO1ilI',
		background: '#f5f5f5'
	});

	// 存入 session（统一用小写存储）
	req.session.captchaText = captcha.text.toLowerCase();
	req.session.lastCaptchaAt = now;

	// 同时发放一个短期 token，便于跨域/不携带 cookie 的客户端使用
	const captchaId = captchaStore.put(captcha.text);
	res.set('X-Captcha-Id', captchaId);
	res.set('Access-Control-Expose-Headers', 'X-Captcha-Id');

	res.type('svg');
	res.status(200).send(captcha.data);
});

// GET /api/captcha/json - JSON 版本，返回 { captchaId, svg }
router.get('/captcha/json', (req, res) => {
	const now = Date.now();

	// 如果 session 可用就做限频（不强制要求 session）
	if (req.session) {
		const lastTime = req.session.lastCaptchaAt || 0;
		if (now - lastTime < 1000) {
			return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
		}
		req.session.lastCaptchaAt = now;
	}

	const captcha = svgCaptcha.create({
		size: 4,
		noise: 2,
		color: true,
		ignoreChars: '0oO1ilI',
		background: '#f5f5f5'
	});

	if (req.session) req.session.captchaText = captcha.text.toLowerCase();

	const captchaId = captchaStore.put(captcha.text);
	res.set('X-Captcha-Id', captchaId);
	res.set('Access-Control-Expose-Headers', 'X-Captcha-Id');

	return res.status(200).json({ captchaId, svg: captcha.data });
});

module.exports = router;
