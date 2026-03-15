const crypto = require('crypto');
const path = require('path');
const https = require('https');

/**
 * Gitee 上传服务
 *
 * 通过 Gitee API v5 上传文件到仓库：`POST /repos/:owner/:repo/contents/:path`
 *
 * 必填环境变量：
 * - `GITEE_OWNER` 仓库 owner
 * - `GITEE_REPO` 仓库名
 * - `GITEE_ACCESS_TOKEN` 访问令牌（注意保密）
 *
 * 可选环境变量：
 * - `GITEE_BRANCH` 分支名（默认：`master`）
 * - `GITEE_MESSAGE` 提交信息前缀（默认：`upload image`）
 * - `GITEE_RAW_BASE` raw 链接的 base（高级用法，可覆盖默认拼接）
 *
 * 备注：
 * - 上传目录由请求参数 `path` 决定，且为必填。
 * - `path` 会做校验，防止目录穿越（如 `..`）以及异常字符。
 * - 上传到新目录（如 `user/avatar`）时，Gitee 会在创建该路径文件时隐式创建目录。
 * - 本文件抛出的错误尽量带上 `err.statusCode`，由路由层转换成 HTTP 响应。
 */
function requiredEnv(name) {
	const value = process.env[name];
	if (!value) {
		const err = new Error(`missing env: ${name}`);
		err.statusCode = 500;
		throw err;
	}
	return value;
}

/**
 * 对路径的每个 segment 做 URL 编码，用于拼到 Gitee API URL 中。
 * 保留 `/` 作为分隔符，仅对每段内部的特殊字符编码。
 */
function encodePathSegments(p) {
	return String(p)
		.split('/')
		.filter(Boolean)
		.map((seg) => encodeURIComponent(seg))
		.join('/');
}

/**
 * Gitee API 的 JSON 请求小封装。
 * 出错时尽量返回带 `statusCode` 和 `details` 的 Error，便于上层返回给前端。
 */
function requestJson({ method, url, body, timeoutMs = 15000 }) {
	return new Promise((resolve, reject) => {
		const payload = body == null ? null : Buffer.from(JSON.stringify(body), 'utf8');
		const req = https.request(
			url,
			{
				method,
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json; charset=utf-8',
					'User-Agent': 'my-blog-server',
					...(payload ? { 'Content-Length': payload.length } : null),
				},
				timeout: timeoutMs,
			},
			(res) => {
				const chunks = [];
				res.on('data', (c) => chunks.push(c));
				res.on('end', () => {
					const text = Buffer.concat(chunks).toString('utf8');
					let parsed = null;
					try {
						parsed = text ? JSON.parse(text) : null;
					} catch {
						parsed = { raw: text };
					}

					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						return resolve(parsed);
					}
					const err = new Error(
						`gitee api error: ${res.statusCode} ${res.statusMessage || ''}`.trim()
					);
					err.statusCode = res.statusCode || 502;
					err.details = parsed;
					return reject(err);
				});
			}
		);

		req.on('timeout', () => {
			req.destroy(new Error('gitee api timeout'));
		});
		req.on('error', (e) => {
			const err = new Error(`gitee request failed: ${e.message || String(e)}`);
			err.statusCode = 502;
			reject(err);
		});

		if (payload) req.write(payload);
		req.end();
	});
}

/**
 * 推断图片扩展名：只允许常见图片后缀，不命中则回退为 `.png`。
 */
function pickExtension(originalName, mimeType) {
	const allowed = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']);
	const extFromName = path.extname(originalName || '').toLowerCase();
	if (allowed.has(extFromName)) return extFromName;

	const byMime = {
		'image/png': '.png',
		'image/jpeg': '.jpg',
		'image/webp': '.webp',
		'image/gif': '.gif',
		'image/bmp': '.bmp',
		'image/svg+xml': '.svg',
	};
	return byMime[mimeType] || '.png';
}

/**
 * 规范化并校验仓库内上传目录（`path`）。
 *
 * 规则：
 * - 必填（不能为空）
 * - 支持多级目录，如 `user/avatar`
 * - 去掉首尾 `/`，并把 `\` 统一成 `/`
 * - 禁止出现 `.` / `..` 段，防止目录穿越
 * - 禁止控制字符与 `%`，避免产生“已编码路径/歧义路径”
 */
function normalizeUploadDir(input) {
	if (input == null) {
		const err = new Error('missing path');
		err.statusCode = 400;
		throw err;
	}
	const raw = String(input).trim();
	if (!raw) {
		const err = new Error('missing path');
		err.statusCode = 400;
		throw err;
	}

	const cleaned = raw.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
	if (!cleaned) {
		const err = new Error('missing path');
		err.statusCode = 400;
		throw err;
	}
	if (cleaned.length > 256) {
		const err = new Error('path is too long');
		err.statusCode = 400;
		throw err;
	}

	const segments = cleaned.split('/').filter(Boolean);
	if (segments.length === 0) {
		const err = new Error('missing path');
		err.statusCode = 400;
		throw err;
	}
	if (segments.some((s) => s === '.' || s === '..')) {
		const err = new Error('invalid path segment');
		err.statusCode = 400;
		throw err;
	}
	if (
		segments.some(
			(s) =>
				s.length > 64 ||
				/[\u0000-\u001F\u007F]/.test(s) ||
				s.includes('%') ||
				s.includes('\\')
		)
	) {
		const err = new Error('invalid path');
		err.statusCode = 400;
		throw err;
	}

	return segments.join('/');
}

/**
 * 上传图片到 Gitee，并返回仓库内路径与 raw 链接。
 *
 * @param {object} args
 * @param {Buffer} args.buffer 图片二进制（必填）
 * @param {string} args.originalName 原始文件名（用于推断后缀）
 * @param {string} args.mimeType MIME 类型（用于推断后缀）
 * @param {string|number} [args.userId] 用于文件命名前缀
 * @param {string} args.path 仓库内目标目录（必填），例如 `avatar` / `user/avatar`
 * @returns {Promise<{path: string, url: string}>}
 */
async function uploadAvatar({ buffer, originalName, mimeType, userId, path: uploadDir }) {
	if (!buffer || !Buffer.isBuffer(buffer)) {
		const err = new Error('invalid file buffer');
		err.statusCode = 400;
		throw err;
	}

	const owner = requiredEnv('GITEE_OWNER');
	const repo = requiredEnv('GITEE_REPO');
	const accessToken = requiredEnv('GITEE_ACCESS_TOKEN');

	const branch = process.env.GITEE_BRANCH || 'master';
	const message = process.env.GITEE_MESSAGE || 'upload image';

	const ext = pickExtension(originalName, mimeType);
	const suffix = crypto.randomBytes(8).toString('hex');
	const prefix = userId ? `u${userId}` : 'anon';
	const filename = `${prefix}-${Date.now()}-${suffix}${ext}`;

	const targetDir = normalizeUploadDir(uploadDir);
	const filePath = [targetDir, filename].join('/');
	const encodedFilePath = encodePathSegments(filePath);

	const apiUrl = `https://gitee.com/api/v5/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
		repo
	)}/contents/${encodedFilePath}`;

	await requestJson({
		method: 'POST',
		url: apiUrl,
		body: {
			access_token: accessToken,
			content: buffer.toString('base64'),
			message: `${message}: ${filename}`,
			branch,
		},
	});

	const rawUrl =
		process.env.GITEE_RAW_BASE ||
		`https://gitee.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/raw/${encodeURIComponent(
			branch
		)}/${encodedFilePath}`;

	return { path: filePath, url: rawUrl };
}

module.exports = { uploadAvatar };
