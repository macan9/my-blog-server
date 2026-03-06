// services/userService.js  业务逻辑
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * 1. 获取所有用户
 */
async function getAllUsers() {
	// 方式 A: 链式调用 (推荐，更安全)
	const rows = await db.select('id', 'username', 'email', 'created_at','auth').from('users');
	return rows;
}

// 2. 获取单个用户 (新增)
async function getUserById(id) {
	const user = await db('users').select('id', 'username', 'email', 'created_at').where({ id }).first();
	return user || null;
}


/**
 * 3. 新增用户
 * @param {Object} userData - 包含 username, password, email 的对象
 * @returns {Object} - 返回插入结果（包含 insertId）
 */
async function createUser(userData) {
	const { username, password, email, auth } = userData;
	console.log('userData',userData)

	// 2. 【关键】先对密码进行哈希加密
	const saltRounds = 10;
	const passwordHash = await bcrypt.hash(password, saltRounds);

	// 3. 【关键】修改 insert 对象中的键名为 password_hash
	 
	const [insertId] = await db.into('users').insert({
		username: username,
		email: email || null,
		auth: auth || 2,
		password_hash: passwordHash, // <--- 这里改了：从 password 改为 password_hash
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

// 4. 更新用户
async function updateUser(id, updateData) {
	// 先检查用户是否存在
	const existingUser = await db('users').where({ id }).first();
	if (!existingUser) {
		throw new Error('用户不存在');
	}

	// 如果要更新密码，必须重新哈希
	const dataToUpdate = { ...updateData };
	if (dataToUpdate.password) {
		const saltRounds = 10;
		dataToUpdate.password_hash = await bcrypt.hash(dataToUpdate.password, saltRounds);
		delete dataToUpdate.password; // 移除明文密码字段，避免写入错误列
	}

	// 执行更新 (忽略 created_at 等不可变字段)
	await db('users').where({ id }).update(dataToUpdate);

	// 返回更新后的最新数据
	return getUserById(id);
}


// 5. 删除用户
async function deleteUser(id) {
	const deletedCount = await db('users').where({ id }).del();
	if (deletedCount === 0) {
		throw new Error('用户不存在，无法删除');
	}
	return true;
}

/**
 * 用户登录验证
 * @param {string} username - 用户名
 * @param {string} password - 用户输入的明文密码
 * @returns {Object|null} - 登录成功返回用户信息(不含密码)，失败返回 null
 */
async function login(username, password) {
	// 1. 先根据用户名查找用户
	// 注意：这里只查 username 和 password_hash，不要查所有字段以防泄露
	const user = await db('users')
		.select('id', 'username', 'email', 'password_hash', 'created_at')
		.where({ username })
		.first(); // .first() 表示只取第一条结果

	// 2. 如果没找到用户，直接返回 null
	if (!user) {
		return null;
	}

	// 3. 【关键】比对密码
	// bcrypt.compare(明文密码, 数据库里的哈希值)
	const isMatch = await bcrypt.compare(password, user.password_hash);

	if (!isMatch) {
		// 密码不匹配
		return null;
	}

	// 4. 密码匹配成功，返回用户信息（记得把 password_hash 删掉再返回，安全第一）
	const { password_hash, ...userInfo } = user;

	// 5. 生成 token
	const token = jwt.sign(
		{ id: user.id, username: user.username }, // payload
		process.env.JWT_SECRET,
		{ expiresIn: process.env.JWT_EXPIRES_IN } // 时效控制
	);

	return {
		user: userInfo,
		token
	};
}

module.exports = {
	getAllUsers,
	getUserById,
	createUser,
	updateUser,
	deleteUser,
	login
};