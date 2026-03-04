// app.js
const express = require('express');
const bodyParser = require('body-parser');
const userRoutes = require('./routes/userRoutes');
// 如果使用了 dotenv，请取消下面这行的注释
// require('dotenv').config(); 

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json());
// 挂载路由
app.use('/api/users', userRoutes);

// 简单首页测试
app.get('/', (req, res) => {
  res.send('博客服务已启动！请访问 /api/users 测试接口。');
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});