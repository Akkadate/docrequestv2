require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const { Pool } = require('pg');
const { testLineNotification, getLineConfiguration } = require('./services/lineNotification'); // เพิ่มบรรทัดนี้

// สร้าง Express app
const app = express();
const PORT = process.env.PORT || 3200;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// เชื่อมต่อกับฐานข้อมูล
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// ตั้งค่า multer สำหรับอัปโหลดไฟล์
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'public/uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// นำเข้าเส้นทาง (routes)
const authRoutes = require('./routes/auth')(pool);
const documentRoutes = require('./routes/documents')(pool, upload);
const adminRoutes = require('./routes/admin')(pool);
const reportRoutes = require('./routes/reports')(pool);

// ใช้งานเส้นทาง
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);

// เพิ่ม endpoint สำหรับทดสอบ LINE notification
app.get('/api/test-line', async (req, res) => {
  try {
    console.log('🧪 Testing LINE notification...');
    
    const config = getLineConfiguration();
    console.log('LINE Configuration:', config);
    
    if (!config.configured) {
      return res.status(400).json({
        success: false,
        message: 'LINE notification not properly configured',
        config: config
      });
    }
    
    const result = await testLineNotification();
    
    res.json({
      success: result.success,
      message: result.message,
      config: config,
      details: result.details || null
    });
  } catch (error) {
    console.error('Error testing LINE notification:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// เพิ่ม endpoint สำหรับดูการตั้งค่า LINE
app.get('/api/line-config', (req, res) => {
  try {
    const config = getLineConfiguration();
    res.json(config);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// เส้นทางหลัก
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// เริ่มเซิร์ฟเวอร์
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`🔗 Test LINE notification: http://localhost:${PORT}/api/test-line`);
  console.log(`⚙️  Check LINE config: http://localhost:${PORT}/api/line
