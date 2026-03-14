// app.js
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const cors = require('cors');

const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// CORS，允许携带 Cookie（用于 session 验证码）
const FRONTEND_ORIGINS_RAW = process.env.FRONTEND_ORIGIN || 'http://localhost:8010';
const FRONTEND_ORIGINS = FRONTEND_ORIGINS_RAW
  .split(/[,\s]+/)
  .map((v) => v.trim())
  .filter(Boolean);
console.log('FRONTEND_ORIGINS=', FRONTEND_ORIGINS);
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl/postman) with no Origin header
    if (!origin) return callback(null, true);
    if (FRONTEND_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('CORS blocked origin: ' + origin));
  },
  credentials: true,
}
app.use(cors(corsOptions))

// session（用于存储图形验证码等）
app.use(
	session({
		secret: process.env.SESSION_SECRET || 'dev-session-secret',
		resave: false,
		saveUninitialized: true,
		cookie: {
			maxAge: 10 * 60 * 1000,// 10 分钟
			httpOnly: true,               // JS 无法读取
			secure: false,                // HTTP 下必须 false
			sameSite: 'lax'               // 简单跨域兼容 HTTP
		}
	})
);

// 引入路由
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const captchaRoutes = require('./routes/captchaRoutes');

// 注册路由前缀
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api', captchaRoutes);

// 添加根路径处理，避免意外触发中间件
app.get('/', (req, res) => {
	res.status(200).json({ message: 'Welcome to the API. Please use /api endpoints.' });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
	console.log(`Server is running on http://0.0.0.0:${PORT}`);
});