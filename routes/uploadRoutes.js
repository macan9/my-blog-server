const express = require('express');
const multer = require('multer');

const authMiddleware = require('../middleware/auth');
const giteeUploadService = require('../services/giteeUploadService');

const router = express.Router();

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

router.get('/upload/gitee/config', authMiddleware, async (req, res) => {
	try {
		const config = giteeUploadService.getDirectoryConfig();
		return res.json({ success: true, config });
	} catch (err) {
		const status = err?.statusCode || err?.status || 500;
		const message = err?.message || String(err);
		return res.status(status >= 400 && status < 600 ? status : 500).json({
			success: false,
			error: 'get gitee config failed',
			details: message,
		});
	}
});

router.get('/upload/gitee/contents', authMiddleware, async (req, res) => {
	try {
		const result = await giteeUploadService.listDirectory({
			path: req.query?.path ?? '',
		});

		return res.json({ success: true, ...result });
	} catch (err) {
		const status = err?.statusCode || err?.status || 500;
		const message = err?.message || String(err);
		return res.status(status >= 400 && status < 600 ? status : 500).json({
			success: false,
			error: 'get gitee contents failed',
			details: message,
		});
	}
});

router.delete('/upload/gitee/contents', authMiddleware, async (req, res) => {
	try {
		const result = await giteeUploadService.deleteContent({
			path: req.body?.path ?? req.query?.path,
		});

		return res.json({ success: true, ...result });
	} catch (err) {
		const status = err?.statusCode || err?.status || 500;
		const message = err?.message || String(err);
		return res.status(status >= 400 && status < 600 ? status : 500).json({
			success: false,
			error: 'delete gitee content failed',
			details: message,
		});
	}
});

// POST /upload/avatar (also available as /api/upload/avatar)
// form-data: file=<image>
router.post('/upload/avatar', authMiddleware, upload.single('file'), async (req, res) => {
	try {
		if (!req.file) return res.status(400).json({ success: false, error: 'missing file field: file' });
		if (!req.file.mimetype || !req.file.mimetype.startsWith('image/')) {
			return res.status(400).json({ success: false, error: 'only image/* is allowed' });
		}

		const uploadPath = req.body?.path ?? req.query?.path;
		if (uploadPath == null || String(uploadPath).trim() === '') {
			return res.status(400).json({ success: false, error: 'missing field: path' });
		}

		const result = await giteeUploadService.uploadAvatar({
			buffer: req.file.buffer,
			originalName: req.file.originalname,
			mimeType: req.file.mimetype,
			userId: req.user?.id,
			path: uploadPath,
		});

		return res.json({ success: true, url: result.url, path: result.path });
	} catch (err) {
		const status = err?.statusCode || err?.status || 500;
		const message = err?.message || String(err);
		return res.status(status >= 400 && status < 600 ? status : 500).json({
			success: false,
			error: 'upload failed',
			details: message,
		});
	}
});

module.exports = router;
