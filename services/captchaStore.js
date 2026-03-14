const crypto = require('crypto');

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ENTRIES = 5000;

// Simple in-memory captcha store to avoid relying on session cookies in cross-origin scenarios.
// Best-effort for single-instance deployments.
const store = new Map(); // id -> { text, expiresAt }

function cleanupExpired() {
	const now = Date.now();
	for (const [id, item] of store.entries()) {
		if (!item || item.expiresAt <= now) store.delete(id);
	}
	if (store.size > MAX_ENTRIES) {
		let removeCount = store.size - MAX_ENTRIES;
		for (const id of store.keys()) {
			store.delete(id);
			removeCount -= 1;
			if (removeCount <= 0) break;
		}
	}
}

function createCaptchaId() {
	return crypto.randomBytes(16).toString('hex');
}

function put(text, ttlMs = DEFAULT_TTL_MS) {
	cleanupExpired();
	const id = createCaptchaId();
	store.set(id, { text: String(text || '').toLowerCase(), expiresAt: Date.now() + ttlMs });
	return id;
}

function consume(id) {
	if (!id) return null;
	const item = store.get(id);
	if (!item) return null;
	if (item.expiresAt <= Date.now()) {
		store.delete(id);
		return null;
	}
	store.delete(id);
	return item.text;
}

module.exports = { put, consume };
