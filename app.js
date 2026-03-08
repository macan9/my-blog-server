

// app.js
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// 引入路由
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');

// 注册路由前缀
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);


// 启动服务器
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});