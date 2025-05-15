const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (pool) => {
  // ลงทะเบียน
  router.post('/register', async (req, res) => {
    try {
      const { student_id, password, full_name, email, phone, faculty } = req.body;
      
      // ตรวจสอบว่ามีผู้ใช้นี้อยู่แล้วหรือไม่
      const userCheck = await pool.query(
        'SELECT * FROM users WHERE student_id = $1 OR email = $2',
        [student_id, email]
      );
      
      if (userCheck.rows.length > 0) {
        return res.status(400).json({ message: 'รหัสนักศึกษาหรืออีเมลนี้มีอยู่ในระบบแล้ว' });
      }
      
      // เข้ารหัสรหัสผ่าน
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // เพิ่มผู้ใช้ใหม่
      const newUser = await pool.query(
        'INSERT INTO users (student_id, password, full_name, email, phone, faculty) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [student_id, hashedPassword, full_name, email, phone, faculty]
      );
      
      res.status(201).json({ message: 'ลงทะเบียนสำเร็จ' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลงทะเบียน' });
    }
  });
  
  // เข้าสู่ระบบ
  router.post('/login', async (req, res) => {
    try {
      const { student_id, password } = req.body;
      
      // ค้นหาผู้ใช้
      const user = await pool.query(
        'SELECT * FROM users WHERE student_id = $1',
        [student_id]
      );
      
      if (user.rows.length === 0) {
        return res.status(400).json({ message: 'รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง' });
      }
      
      // ตรวจสอบรหัสผ่าน
      const validPassword = await bcrypt.compare(password, user.rows[0].password);
      
      if (!validPassword) {
        return res.status(400).json({ message: 'รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง' });
      }
      
      // สร้าง token
      const token = jwt.sign(
        { id: user.rows[0].id, student_id: user.rows[0].student_id, role: user.rows[0].role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.status(200).json({
        token,
        user: {
          id: user.rows[0].id,
          student_id: user.rows[0].student_id,
          full_name: user.rows[0].full_name,
          email: user.rows[0].email,
          role: user.rows[0].role
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
    }
  });
  
  // ดึงข้อมูลผู้ใช้ปัจจุบัน
  router.get('/user', async (req, res) => {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await pool.query(
        'SELECT id, student_id, full_name, email, phone, faculty, role FROM users WHERE id = $1',
        [decoded.id]
      );
      
      if (user.rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
      }
      
      res.status(200).json(user.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(401).json({ message: 'ไม่มีการยืนยันตัวตน' });
    }
  });
  
  return router;
};
