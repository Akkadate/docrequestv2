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
    const search = req.query.search || ''; // เพิ่มการรับ search parameter
    
    let query = `
      SELECT dr.*, dt.${column} as document_name, u.full_name, u.student_id
      FROM document_requests dr
      JOIN document_types dt ON dr.document_type_id = dt.id
      JOIN users u ON dr.user_id = u.id
    `;
    
    // สร้าง WHERE clause array
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;
    
    // เพิ่มเงื่อนไข status
    if (status) {
      whereConditions.push(`dr.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    // เพิ่มเงื่อนไขการค้นหา
    if (search) {
      // ค้นหาจากหลายฟิลด์: รหัสคำขอ, รหัสนักศึกษา, ชื่อนักศึกษา, ชื่อเอกสาร
      whereConditions.push(`(
        dr.id::text ILIKE $${paramIndex} OR
        u.student_id ILIKE $${paramIndex} OR
        u.full_name ILIKE $${paramIndex} OR
        dt.${column} ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    // เพิ่ม WHERE clause ถ้ามีเงื่อนไข
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    query += ' ORDER BY dr.created_at DESC';
    
    // Execute query ด้วย parameters
    const requests = await pool.query(query, queryParams);
    
    res.status(200).json(requests.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำขอเอกสาร' });
  }
});
  
  // อัปเดตสถานะคำขอเอกสาร (แก้ไขให้รองรับประวัติสถานะ)
  router.put('/request/:id/status', authenticateJWT, isAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;
      const { status, note } = req.body;
      const adminId = req.user.id; // ID ของ admin ที่ล็อกอินอยู่
      
      const validStatuses = ['pending', 'processing', 'ready', 'completed', 'rejected'];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
      }
      
      // เริ่ม transaction
      await client.query('BEGIN');
      
      // อัปเดตสถานะในตาราง document_requests
      const updateResult = await client.query(
        'UPDATE document_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id]
      );
      
      if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'ไม่พบคำขอเอกสาร' });
      }
      
      // บันทึกประวัติสถานะ
      await client.query(
        'INSERT INTO status_history (request_id, status, note, created_by) VALUES ($1, $2, $3, $4)',
        [id, status, note || null, adminId]
      );
      
      // commit transaction
      await client.query('COMMIT');
      
      res.status(200).json({ 
        message: 'อัปเดตสถานะคำขอเอกสารสำเร็จ',
        request: updateResult.rows[0]
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะคำขอเอกสาร' });
    } finally {
      client.release();
    }
  });
  
  // เพิ่ม endpoint สำหรับดึงประวัติสถานะ
  router.get('/request/:id/status-history', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          sh.id,
          sh.status,
          sh.note,
          sh.created_at,
          u.full_name as created_by_name
        FROM status_history sh
        LEFT JOIN users u ON sh.created_by = u.id
        WHERE sh.request_id = $1
        ORDER BY sh.created_at DESC
      `;
      
      const result = await pool.query(query, [id]);
      
      res.status(200).json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงประวัติสถานะ' });
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
      
      // ดึงรายการย่อย (ถ้ามี)
      const itemsQuery = `
        SELECT dri.*, dt.${column} as document_name
        FROM document_request_items dri
        JOIN document_types dt ON dri.document_type_id = dt.id
        WHERE dri.request_id = $1
      `;
      
      const itemsResult = await pool.query(itemsQuery, [id]);
      
      // ประกอบข้อมูลรายการย่อยเข้ากับคำขอหลัก
      const result = request.rows[0];
      if (itemsResult.rows.length > 0) {
        result.has_multiple_items = true;
        result.document_items = itemsResult.rows;
        result.item_count = itemsResult.rows.length;
      } else {
        result.has_multiple_items = false;
      }
      
      res.status(200).json(result);
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

 // เพิ่ม endpoints เหล่านี้ในไฟล์ routes/admin.js

  // ดึงประวัติการขอเอกสารของผู้ใช้คนเดียว
  router.get('/user/:id/requests', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const lang = req.query.lang || 'th';
      const column = `name_${lang}`;
      
      const requests = await pool.query(
        `SELECT dr.*, dt.${column} as document_name
        FROM document_requests dr
        JOIN document_types dt ON dr.document_type_id = dt.id
        WHERE dr.user_id = $1
        ORDER BY dr.created_at DESC`,
        [id]
      );
      
      res.status(200).json(requests.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลประวัติการขอเอกสาร' });
    }
  });

  // ลบผู้ใช้
  router.delete('/user/:id', authenticateJWT, isAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;
      
      // ตรวจสอบว่าผู้ใช้มีอยู่จริงหรือไม่
      const userCheck = await client.query(
        'SELECT id, role, student_id, full_name FROM users WHERE id = $1',
        [id]
      );
      
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
      }
      
      const user = userCheck.rows[0];
      
      // ไม่อนุญาตให้ลบผู้ดูแลระบบ
      if (user.role === 'admin') {
        return res.status(403).json({ message: 'ไม่สามารถลบผู้ดูแลระบบได้' });
      }
      
      // เริ่ม transaction
      await client.query('BEGIN');
      
      // ลบประวัติสถานะที่เกี่ยวข้อง
      await client.query(
        'DELETE FROM status_history WHERE request_id IN (SELECT id FROM document_requests WHERE user_id = $1)',
        [id]
      );
      
      // ลบรายการเอกสารย่อย
      await client.query(
        'DELETE FROM document_request_items WHERE request_id IN (SELECT id FROM document_requests WHERE user_id = $1)',
        [id]
      );
      
      // ลบคำขอเอกสาร
      await client.query(
        'DELETE FROM document_requests WHERE user_id = $1',
        [id]
      );
      
      // ลบผู้ใช้
      await client.query(
        'DELETE FROM users WHERE id = $1',
        [id]
      );
      
      // commit transaction
      await client.query('COMMIT');
      
      console.log(`User deleted: ${user.student_id} - ${user.full_name}`);
      
      res.status(200).json({ 
        message: 'ลบผู้ใช้สำเร็จ',
        deletedUser: {
          id: user.id,
          student_id: user.student_id,
          full_name: user.full_name
        }
      });
      
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error deleting user:', err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบผู้ใช้' });
    } finally {
      client.release();
    }
  });

  // รีเซ็ตรหัสผ่านผู้ใช้
  router.post('/user/:id/reset-password', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // ตรวจสอบว่าผู้ใช้มีอยู่จริงหรือไม่
      const userCheck = await pool.query(
        'SELECT id, student_id, full_name FROM users WHERE id = $1',
        [id]
      );
      
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
      }
      
      const user = userCheck.rows[0];
      
      // เข้ารหัสรหัสผ่านใหม่ (123456)
      const newPassword = '123456';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // อัปเดตรหัสผ่าน
      await pool.query(
        'UPDATE users SET password = $1 WHERE id = $2',
        [hashedPassword, id]
      );
      
      console.log(`Password reset for user: ${user.student_id} - ${user.full_name}`);
      
      res.status(200).json({ 
        message: 'รีเซ็ตรหัสผ่านสำเร็จ',
        newPassword: newPassword,
        user: {
          id: user.id,
          student_id: user.student_id,
          full_name: user.full_name
        }
      });
      
    } catch (err) {
      console.error('Error resetting password:', err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน' });
    }
  });

  // ระงับ/เปิดใช้งานผู้ใช้ (เพิ่มฟีเจอร์ในอนาคต)
  router.post('/user/:id/toggle-status', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body; // 'active' หรือ 'suspended'
      
      // ตรวจสอบว่าผู้ใช้มีอยู่จริงหรือไม่
      const userCheck = await pool.query(
        'SELECT id, student_id, full_name, status FROM users WHERE id = $1',
        [id]
      );
      
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
      }
      
      // อัปเดตสถานะผู้ใช้ (ต้องเพิ่มคอลัมน์ status ในตาราง users ก่อน)
      // ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';
      
      await pool.query(
        'UPDATE users SET status = $1 WHERE id = $2',
        [status, id]
      );
      
      const action = status === 'active' ? 'เปิดใช้งาน' : 'ระงับ';
      
      res.status(200).json({ 
        message: `${action}ผู้ใช้สำเร็จ`,
        user: userCheck.rows[0],
        newStatus: status
      });
      
    } catch (err) {
      console.error('Error toggling user status:', err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะผู้ใช้' });
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
