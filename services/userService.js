const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function normalizePasswordInput(password, passwordEncrypted) {
	if (typeof password !== 'string') {
		return password;
	}

	return passwordEncrypted ? password.trim() : password;
}

async function comparePassword(password, passwordHash, passwordEncrypted = false) {
	const normalizedPassword = normalizePasswordInput(password, passwordEncrypted);
	return bcrypt.compare(normalizedPassword, passwordHash);
}

async function hashPasswordForStorage(password, passwordEncrypted = false) {
	const normalizedPassword = normalizePasswordInput(password, passwordEncrypted);
	const saltRounds = 10;
	return bcrypt.hash(normalizedPassword, saltRounds);
}

async function getAllUsers() {
	return db
		.select(
			'id',
			'username',
			'email',
			'created_at',
			'auth',
			'avatar',
			'nickname',
			'mobile',
			'description',
			'token_version'
		)
		.from('users');
}

async function getUserById(id) {
	const user = await db('users')
		.select(
			'id',
			'username',
			'email',
			'created_at',
			'auth',
			'avatar',
			'nickname',
			'mobile',
			'description',
			'token_version'
		)
		.where({ id })
		.first();

	return user || null;
}

async function createUser(userData) {
	const { username, password, email, auth, passwordEncrypted = false } = userData;
	const passwordHash = await hashPasswordForStorage(password, passwordEncrypted === true);

	const [insertId] = await db.into('users').insert({
		username,
		email: email || null,
		auth: auth || 2,
		password_hash: passwordHash,
		created_at: db.fn.now()
	});

	const [newUser] = await db('users').select('*').where({ id: insertId });

	return {
		userId: insertId,
		username,
		email,
		auth,
		created_at: newUser.created_at
	};
}

async function updateUser(id, updateData) {
	const existingUser = await db('users').where({ id }).first();
	if (!existingUser) {
		const err = new Error('用户不存在');
		err.statusCode = 404;
		throw err;
	}

	const allowedFields = new Set(['username', 'email', 'auth', 'avatar', 'nickname', 'mobile', 'description']);
	const dataToUpdate = {};

	for (const key of Object.keys(updateData || {})) {
		if (allowedFields.has(key) && updateData[key] !== undefined) {
			dataToUpdate[key] = updateData[key];
		}
	}

	const passwordEncrypted = updateData?.passwordEncrypted === true;
	const nextPassword =
		updateData && updateData.newPassword !== undefined ? updateData.newPassword : updateData?.password;
	const hasPasswordChange = nextPassword !== undefined;

	if (hasPasswordChange) {
		if (typeof nextPassword !== 'string' || nextPassword.trim() === '') {
			const err = new Error('密码不能为空');
			err.statusCode = 400;
			throw err;
		}

		if (updateData.oldPassword !== undefined && updateData.oldPassword !== null) {
			if (typeof updateData.oldPassword !== 'string' || updateData.oldPassword.trim() === '') {
				const err = new Error('原密码不能为空');
				err.statusCode = 400;
				throw err;
			}

			const isMatch = await comparePassword(
				updateData.oldPassword,
				existingUser.password_hash,
				passwordEncrypted
			);
			if (!isMatch) {
				const err = new Error('原密码错误');
				err.statusCode = 400;
				throw err;
			}
		}

		dataToUpdate.password_hash = await hashPasswordForStorage(nextPassword, passwordEncrypted);
		dataToUpdate.token_version = (existingUser.token_version || 0) + 1;
	}

	if (Object.keys(dataToUpdate).length === 0) {
		const err = new Error('没有可更新的字段');
		err.statusCode = 400;
		throw err;
	}

	dataToUpdate.updated_at = db.fn.now();

	await db('users').where({ id }).update(dataToUpdate);
	return getUserById(id);
}

async function deleteUser(id) {
	const deletedCount = await db('users').where({ id }).del();
	if (deletedCount === 0) {
		throw new Error('用户不存在，无法删除');
	}
	return true;
}

async function login(username, password, options = {}) {
	const { passwordEncrypted = false } = options;

	const user = await db('users')
		.select('id', 'username', 'email', 'password_hash', 'created_at', 'token_version', 'auth')
		.where({ username })
		.first();

	if (!user) {
		return null;
	}

	const isMatch = await comparePassword(password, user.password_hash, passwordEncrypted);
	if (!isMatch) {
		return null;
	}

	const newVersion = (user.token_version || 0) + 1;
	const decodedTemp = jwt.decode(
		jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })
	);
	const expiresTimestamp = decodedTemp.exp * 1000;
	const tokenExpiresDate = new Date(expiresTimestamp);

	await db('users')
		.where({ id: user.id })
		.update({
			last_login_at: new Date(),
			last_token: 'active',
			token_expires_at: tokenExpiresDate,
			token_version: newVersion
		});

	const { password_hash, ...userInfo } = user;
	const token = jwt.sign(
		{ id: user.id, username: user.username, tokenVersion: newVersion },
		process.env.JWT_SECRET,
		{ expiresIn: process.env.JWT_EXPIRES_IN }
	);

	return {
		user: userInfo,
		token
	};
}

async function getLoginLogs({ currentPage = 1, pageSize = 10, startTime, endTime } = {}) {
	const page = Math.max(parseInt(currentPage, 10) || 1, 1);
	const size = Math.max(parseInt(pageSize, 10) || 10, 1);
	const offset = (page - 1) * size;

	const baseQuery = db('login_logs')
		.select('id', 'user_id', 'username', 'ip', 'user_agent', 'success', 'message', 'created_at');

	if (startTime) {
		baseQuery.where('created_at', '>=', startTime);
	}
	if (endTime) {
		baseQuery.where('created_at', '<=', endTime);
	}

	const [rows, [{ total }]] = await Promise.all([
		baseQuery.clone().orderBy('created_at', 'desc').limit(size).offset(offset),
		db('login_logs')
			.modify((qb) => {
				if (startTime) qb.where('created_at', '>=', startTime);
				if (endTime) qb.where('created_at', '<=', endTime);
			})
			.count({ total: '*' })
	]);

	return {
		list: rows,
		pagination: {
			currentPage: page,
			pageSize: size,
			total: Number(total) || 0
		}
	};
}

async function logLoginAttempt({ userId = null, username, ip = null, userAgent = null, success, message = null }) {
	await db('login_logs').insert({
		user_id: userId,
		username,
		ip,
		user_agent: userAgent,
		success,
		message
	});
}

module.exports = {
	getAllUsers,
	getUserById,
	createUser,
	updateUser,
	deleteUser,
	login,
	logLoginAttempt,
	getLoginLogs
};
