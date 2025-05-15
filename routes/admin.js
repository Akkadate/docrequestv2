const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/auth');
const isAdmin = require('../middleware/admin');

module.exports = (pool) => {
  // ดึงรายการคำขอเอกสารทั้งหมด
  router.get('/requests', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const lang = req.query.lang || 'th';
      const column = `name_${lang}`;
      const status = req.query.status || '';
      
      let query = `
        SELECT dr.*, dt.${column} as document_name, u.full_name, u.student_id
        FROM document_requests dr
        JOIN document_types dt ON dr.document_type_id = dt.id
        JOIN users u ON dr.user_id = u.id
      `;
      
      if (status) {
        query += ` WHERE dr.status = '${status}'`;
      }
      
      query += ' ORDER BY dr.created_at DESC';
      
      const requests = await pool.query(query);
      
      res.status(200).json(requests.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำขอเอกสาร' });
    }
  });
  
  // อัปเดตสถานะคำขอเอกสาร
  router.put('/request/:id/status', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const validStatuses = ['pending', 'processing', 'ready', 'completed', 'rejected'];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
      }
      
      await pool.query(
        'UPDATE document_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, id]
      );
      
      res.status(200).json({ message: 'อัปเดตสถานะคำขอเอกสารสำเร็จ' });
    } catch (err) {

    // จัดการผู้ใช้งาน---------------------------------------------------------------
  router.get('/users', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const users = await pool.query(
        'SELECT id, student_id, full_name, email, phone, faculty, role, created_at FROM users ORDER BY created_at DESC'
      );
      
      res.status(200).json(users.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' });
    }
  });
  
  // เพิ่มผู้ดูแลระบบใหม่
  router.post('/add-admin', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const { student_id, password, full_name, email, phone } = req.body;
      
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
      
      // เพิ่มผู้ดูแลระบบใหม่
      await pool.query(
        'INSERT INTO users (student_id, password, full_name, email, phone, faculty, role) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [student_id, hashedPassword, full_name, email, phone, 'Admin', 'admin']
      );
      
      res.status(201).json({ message: 'เพิ่มผู้ดูแลระบบสำเร็จ' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเพิ่มผู้ดูแลระบบ' });
    }
  });
  
  return router;
};
