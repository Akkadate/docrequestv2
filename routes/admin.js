const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
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
      const { status, note } = req.body;
      
      const validStatuses = ['pending', 'processing', 'ready', 'completed', 'rejected'];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
      }
      
      await pool.query(
        'UPDATE document_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, id]
      );
      
      // บันทึกประวัติสถานะ (ถ้ามีตาราง status_history)
      // await pool.query(
      //   'INSERT INTO status_history (request_id, status, note, created_by) VALUES ($1, $2, $3, $4)',
      //   [id, status, note, req.user.id]
      // );
      
      res.status(200).json({ message: 'อัปเดตสถานะคำขอเอกสารสำเร็จ' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะคำขอเอกสาร' });
    }
  });
  
  // ดึงรายละเอียดคำขอเอกสาร
  router.get('/request/:id', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const lang = req.query.lang || 'th';
      const column = `name_${lang}`;
      
      const request = await pool.query(
        `SELECT dr.*, dt.${column} as document_name, u.full_name, u.student_id, u.email, u.phone, u.faculty
        FROM document_requests dr
        JOIN document_types dt ON dr.document_type_id = dt.id
        JOIN users u ON dr.user_id = u.id
        WHERE dr.id = $1`,
        [id]
      );
      
      if (request.rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบคำขอเอกสาร' });
      }
      
      res.status(200).json(request.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำขอเอกสาร' });
    }
  });
  
  // จัดการผู้ใช้งาน
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
  
  // ดึงข้อมูลผู้ใช้คนเดียว
  router.get('/user/:id', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const user = await pool.query(
        'SELECT id, student_id, full_name, email, phone, faculty, role, created_at FROM users WHERE id = $1',
        [id]
      );
      
      if (user.rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
      }
      
      res.status(200).json(user.rows[0]);
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
  
  // Dashboard สำหรับผู้ดูแลระบบ
  router.get('/dashboard-summary', authenticateJWT, isAdmin, async (req, res) => {
    try {
      // จำนวนคำขอทั้งหมด
      const totalRequests = await pool.query('SELECT COUNT(*) FROM document_requests');
      
      // จำนวนคำขอตามสถานะ
      const pendingRequests = await pool.query('SELECT COUNT(*) FROM document_requests WHERE status = $1', ['pending']);
      const processingRequests = await pool.query('SELECT COUNT(*) FROM document_requests WHERE status = $1 OR status = $2', ['processing', 'ready']);
      const completedRequests = await pool.query('SELECT COUNT(*) FROM document_requests WHERE status = $1', ['completed']);
      
      // รายได้ทั้งหมด
      const totalRevenue = await pool.query('SELECT SUM(total_price) FROM document_requests');
      
      // คำขอล่าสุด 5 รายการ
      const recentRequests = await pool.query(
        `SELECT dr.id, dr.status, dr.created_at, dr.total_price, dt.name_th as document_name, u.full_name, u.student_id
        FROM document_requests dr
        JOIN document_types dt ON dr.document_type_id = dt.id
        JOIN users u ON dr.user_id = u.id
        ORDER BY dr.created_at DESC
        LIMIT 5`
      );
      
      res.status(200).json({
        totalRequests: parseInt(totalRequests.rows[0].count),
        pendingRequests: parseInt(pendingRequests.rows[0].count),
        processingRequests: parseInt(processingRequests.rows[0].count),
        completedRequests: parseInt(completedRequests.rows[0].count),
        totalRevenue: parseFloat(totalRevenue.rows[0].sum || 0),
        recentRequests: recentRequests.rows
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแดชบอร์ด' });
    }
  });
  
  return router;
};
