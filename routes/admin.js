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

 // แทนที่ endpoint /line-config เดิมด้วยโค้ดนี้

router.get('/line-config', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const lineNotification = require('../services/lineNotification');
    const config = lineNotification.getLineConfiguration();
    
    res.status(200).json(config);
  } catch (error) {
    console.error('Error checking LINE config:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบการตั้งค่า' });
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
  
  // ในไฟล์ routes/admin.js 
// แก้ไข endpoint GET /request/:id ให้ดึงข้อมูล birth_date และ id_number

router.get('/request/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const lang = req.query.lang || 'th';
    const column = `name_${lang}`;
    
    // เพิ่มฟิลด์ birth_date และ id_number
    const request = await pool.query(
      `SELECT dr.*, dt.${column} as document_name, 
       u.full_name, u.student_id, u.email, u.phone, u.faculty, u.birth_date, u.id_number
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
  
  // จัดการผู้ใช้งาน - อัปเดตให้รวมฟิลด์ใหม่และการค้นหา
  router.get('/users', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const search = req.query.search || '';
      
      let query = 'SELECT id, student_id, full_name, email, phone, faculty, birth_date, id_number, role, created_at FROM users';
      let queryParams = [];
      
      // เพิ่มการค้นหา
      if (search) {
        query += ` WHERE (
          student_id ILIKE $1 OR
          full_name ILIKE $1 OR
          email ILIKE $1 OR
          phone ILIKE $1 OR
          faculty ILIKE $1 OR
          id_number ILIKE $1
        )`;
        queryParams.push(`%${search}%`);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const users = await pool.query(query, queryParams);
      
      res.status(200).json(users.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' });
    }
  });

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
 
  // ดึงข้อมูลผู้ใช้คนเดียว - อัปเดตให้รวมฟิลด์ใหม่
  router.get('/user/:id', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const user = await pool.query(
        'SELECT id, student_id, full_name, email, phone, faculty, birth_date, id_number, role, created_at FROM users WHERE id = $1',
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
  
  // เพิ่มผู้ดูแลระบบใหม่ - อัปเดตให้รองรับฟิลด์ใหม่
  router.post('/add-admin', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const { student_id, password, full_name, email, phone, birth_date, id_number } = req.body;
      
      // ตรวจสอบข้อมูลที่จำเป็น
      if (!student_id || !password || !full_name || !email || !phone) {
        return res.status(400).json({ message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
      }
      
      // ตรวจสอบรูปแบบวันเกิด (ถ้ามีการกรอก)
      if (birth_date && !isValidDate(birth_date)) {
        return res.status(400).json({ message: 'รูปแบบวันเดือนปีเกิดไม่ถูกต้อง' });
      }
      
      // ตรวจสอบรูปแบบหมายเลขบัตรประชาชน/Passport (ถ้ามีการกรอก)
      if (id_number && !isValidIdNumber(id_number)) {
        return res.status(400).json({ message: 'รูปแบบหมายเลขบัตรประชาชนหรือ Passport ไม่ถูกต้อง' });
      }
      
      // ตรวจสอบว่ามีผู้ใช้นี้อยู่แล้วหรือไม่
      const userCheck = await pool.query(
        'SELECT * FROM users WHERE student_id = $1 OR email = $2',
        [student_id, email]
      );
      
      if (userCheck.rows.length > 0) {
        return res.status(400).json({ message: 'รหัสนักศึกษาหรืออีเมลนี้มีอยู่ในระบบแล้ว' });
      }
      
      // ตรวจสอบหมายเลขบัตรประชาชน/Passport ซ้ำ (ถ้ามีการกรอก)
      if (id_number) {
        const idCheck = await pool.query(
          'SELECT * FROM users WHERE id_number = $1',
          [id_number]
        );
        
        if (idCheck.rows.length > 0) {
          return res.status(400).json({ message: 'หมายเลขบัตรประชาชนหรือ Passport นี้มีอยู่ในระบบแล้ว' });
        }
      }
      
      // เข้ารหัสรหัสผ่าน
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // เพิ่มผู้ดูแลระบบใหม่
      await pool.query(
        'INSERT INTO users (student_id, password, full_name, email, phone, faculty, birth_date, id_number, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [student_id, hashedPassword, full_name, email, phone, 'Admin', birth_date || null, id_number || null, 'admin']
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
 /**
   * ดึงรายการอาจารย์ที่ปรึกษาทั้งหมด
   * GET /api/admin/faculty-advisors
   */
  router.get('/faculty-advisors', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const { faculty_id, search, page = 1, limit = 10 } = req.query;
      
      let whereClause = 'WHERE 1=1';
      let queryParams = [];
      let paramIndex = 1;
      
      // กรองตามคณะ
      if (faculty_id) {
        whereClause += ` AND fa.faculty_id = $${paramIndex}`;
        queryParams.push(faculty_id);
        paramIndex++;
      }
      
      // ค้นหา
      if (search) {
        whereClause += ` AND (
          fa.advisor_name ILIKE $${paramIndex} OR
          fa.advisor_email ILIKE $${paramIndex} OR
          fa.department ILIKE $${paramIndex}
        )`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const query = `
        SELECT 
          fa.*,
          f.name_th as faculty_name_th,
          f.name_en as faculty_name_en,
          u.id as user_id,
          u.full_name as user_full_name
        FROM faculty_advisors fa
        JOIN faculties f ON fa.faculty_id = f.id
        LEFT JOIN users u ON u.email = fa.advisor_email AND u.is_advisor = true
        ${whereClause}
        ORDER BY fa.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(parseInt(limit), offset);
      
      const result = await pool.query(query, queryParams);
      
      // นับจำนวนรวม
      const countQuery = `
        SELECT COUNT(*) 
        FROM faculty_advisors fa
        JOIN faculties f ON fa.faculty_id = f.id
        ${whereClause}
      `;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const totalItems = parseInt(countResult.rows[0].count);
      
      res.status(200).json({
        advisors: result.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalItems / parseInt(limit)),
          totalItems: totalItems,
          itemsPerPage: parseInt(limit)
        }
      });
      
    } catch (error) {
      console.error('Error fetching faculty advisors:', error);
      res.status(500).json({ 
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลอาจารย์ที่ปรึกษา' 
      });
    }
  });

  /**
   * เพิ่มอาจารย์ที่ปรึกษาใหม่
   * POST /api/admin/faculty-advisors
   */
  router.post('/faculty-advisors', authenticateJWT, isAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { 
        advisor_name, 
        advisor_email, 
        faculty_id, 
        advisor_phone, 
        department, 
        is_active = true 
      } = req.body;
      
      // Validation
      if (!advisor_name || !advisor_email || !faculty_id) {
        return res.status(400).json({ 
          message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน',
          required: ['advisor_name', 'advisor_email', 'faculty_id']
        });
      }
      
      // ตรวจสอบรูปแบบอีเมล
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(advisor_email)) {
        return res.status(400).json({ message: 'รูปแบบอีเมลไม่ถูกต้อง' });
      }
      
      await client.query('BEGIN');
      
      // ตรวจสอบอีเมลซ้ำ
      const duplicateCheck = await client.query(
        'SELECT id FROM faculty_advisors WHERE advisor_email = $1',
        [advisor_email]
      );
      
      if (duplicateCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'อีเมลนี้มีการใช้งานแล้ว' });
      }
      
      // ตรวจสอบคณะมีอยู่จริง
      const facultyCheck = await client.query(
        'SELECT id FROM faculties WHERE id = $1',
        [faculty_id]
      );
      
      if (facultyCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'ไม่พบข้อมูลคณะที่ระบุ' });
      }
      
      // เพิ่มอาจารย์ที่ปรึกษา
      const insertQuery = `
        INSERT INTO faculty_advisors 
        (advisor_name, advisor_email, faculty_id, advisor_phone, department, is_active, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const insertResult = await client.query(insertQuery, [
        advisor_name,
        advisor_email,
        faculty_id,
        advisor_phone || null,
        department || null,
        is_active,
        req.user.id
      ]);
      
      const newAdvisor = insertResult.rows[0];
      
      // ดึงข้อมูลคณะ
      const facultyResult = await client.query(
        'SELECT name_th, name_en FROM faculties WHERE id = $1',
        [faculty_id]
      );
      
      await client.query('COMMIT');
      
      const response = {
        ...newAdvisor,
        faculty_name_th: facultyResult.rows[0]?.name_th,
        faculty_name_en: facultyResult.rows[0]?.name_en
      };
      
      res.status(201).json({
        message: 'เพิ่มอาจารย์ที่ปรึกษาสำเร็จ',
        advisor: response
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating faculty advisor:', error);
      res.status(500).json({ 
        message: 'เกิดข้อผิดพลาดในการเพิ่มอาจารย์ที่ปรึกษา' 
      });
    } finally {
      client.release();
    }
  });

  /**
   * อัปเดตข้อมูลอาจารย์ที่ปรึกษา
   * PUT /api/admin/faculty-advisors/:id
   */
  router.put('/faculty-advisors/:id', authenticateJWT, isAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;
      const { 
        advisor_name, 
        advisor_email, 
        faculty_id, 
        advisor_phone, 
        department, 
        is_active 
      } = req.body;
      
      // Validation
      if (!advisor_name || !advisor_email || !faculty_id) {
        return res.status(400).json({ 
          message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' 
        });
      }
      
      await client.query('BEGIN');
      
      // ตรวจสอบอาจารย์มีอยู่จริง
      const advisorCheck = await client.query(
        'SELECT id FROM faculty_advisors WHERE id = $1',
        [id]
      );
      
      if (advisorCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'ไม่พบอาจารย์ที่ปรึกษา' });
      }
      
      // ตรวจสอบอีเมลซ้ำ (ยกเว้นตัวเอง)
      const duplicateCheck = await client.query(
        'SELECT id FROM faculty_advisors WHERE advisor_email = $1 AND id != $2',
        [advisor_email, id]
      );
      
      if (duplicateCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'อีเมลนี้มีการใช้งานแล้ว' });
      }
      
      // อัปเดตข้อมูล
      const updateQuery = `
        UPDATE faculty_advisors 
        SET 
          advisor_name = $1,
          advisor_email = $2,
          faculty_id = $3,
          advisor_phone = $4,
          department = $5,
          is_active = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `;
      
      const updateResult = await client.query(updateQuery, [
        advisor_name,
        advisor_email,
        faculty_id,
        advisor_phone || null,
        department || null,
        is_active,
        id
      ]);
      
      // ดึงข้อมูลคณะ
      const facultyResult = await client.query(
        'SELECT name_th, name_en FROM faculties WHERE id = $1',
        [faculty_id]
      );
      
      await client.query('COMMIT');
      
      const response = {
        ...updateResult.rows[0],
        faculty_name_th: facultyResult.rows[0]?.name_th,
        faculty_name_en: facultyResult.rows[0]?.name_en
      };
      
      res.status(200).json({
        message: 'อัปเดตข้อมูลอาจารย์ที่ปรึกษาสำเร็จ',
        advisor: response
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating faculty advisor:', error);
      res.status(500).json({ 
        message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' 
      });
    } finally {
      client.release();
    }
  });

  /**
   * ลบอาจารย์ที่ปรึกษา
   * DELETE /api/admin/faculty-advisors/:id
   */
  router.delete('/faculty-advisors/:id', authenticateJWT, isAdmin, async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;
      
      await client.query('BEGIN');
      
      // ตรวจสอบอาจารย์มีอยู่จริง
      const advisorCheck = await client.query(
        'SELECT advisor_name, advisor_email FROM faculty_advisors WHERE id = $1',
        [id]
      );
      
      if (advisorCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'ไม่พบอาจารย์ที่ปรึกษา' });
      }
      
      const advisor = advisorCheck.rows[0];
      
      // ตรวจสอบว่ามีคำขออนุมัติที่ยังไม่เสร็จสิ้นหรือไม่
      const pendingCheck = await client.query(
        'SELECT COUNT(*) FROM approval_requests WHERE advisor_id = $1 AND approval_status = $2',
        [id, 'waiting_approval']
      );
      
      const pendingCount = parseInt(pendingCheck.rows[0].count);
      
      if (pendingCount > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: `ไม่สามารถลบอาจารย์ได้ เนื่องจากมีคำขออนุมัติ ${pendingCount} รายการที่รอการพิจารณา`,
          pendingCount: pendingCount
        });
      }
      
      // ลบอาจารย์
      await client.query('DELETE FROM faculty_advisors WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      
      console.log(`Faculty advisor deleted: ${advisor.advisor_name} (${advisor.advisor_email})`);
      
      res.status(200).json({
        message: 'ลบอาจารย์ที่ปรึกษาสำเร็จ',
        deletedAdvisor: advisor
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting faculty advisor:', error);
      res.status(500).json({ 
        message: 'เกิดข้อผิดพลาดในการลบอาจารย์ที่ปรึกษา' 
      });
    } finally {
      client.release();
    }
  });

  /**
   * ดึงสถิติอาจารย์ที่ปรึกษา
   * GET /api/admin/faculty-advisors/stats
   */
  router.get('/faculty-advisors/stats', authenticateJWT, isAdmin, async (req, res) => {
    try {
      // จำนวนอาจารย์ทั้งหมด
      const totalQuery = 'SELECT COUNT(*) FROM faculty_advisors';
      const totalResult = await pool.query(totalQuery);
      
      // จำนวนอาจารย์ที่ใช้งาน
      const activeQuery = 'SELECT COUNT(*) FROM faculty_advisors WHERE is_active = true';
      const activeResult = await pool.query(activeQuery);
      
      // สถิติการอนุมัติ
      const approvalStatsQuery = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN approval_status = 'waiting_approval' THEN 1 END) as pending,
          COUNT(CASE WHEN approval_status = 'approved_by_advisor' THEN 1 END) as approved,
          COUNT(CASE WHEN approval_status = 'rejected_by_advisor' THEN 1 END) as rejected
        FROM approval_requests
        WHERE created_at >= CURRENT_DATE
      `;
      const approvalStatsResult = await pool.query(approvalStatsQuery);
      
      // จำนวนอีเมลที่ส่งวันนี้
      const emailsQuery = `
        SELECT COUNT(*) 
        FROM approval_requests 
        WHERE email_sent_at >= CURRENT_DATE
      `;
      const emailsResult = await pool.query(emailsQuery);
      
      res.status(200).json({
        total: parseInt(totalResult.rows[0].count),
        active: parseInt(activeResult.rows[0].count),
        inactive: parseInt(totalResult.rows[0].count) - parseInt(activeResult.rows[0].count),
        todayStats: {
          ...approvalStatsResult.rows[0],
          emailsSent: parseInt(emailsResult.rows[0].count)
        }
      });
      
    } catch (error) {
      console.error('Error fetching advisor stats:', error);
      res.status(500).json({ 
        message: 'เกิดข้อผิดพลาดในการดึงสถิติ' 
      });
    }
  });

  return router;
};

// ฟังก์ชันตรวจสอบรูปแบบวันที่
function isValidDate(dateString) {
  if (!dateString) return true; // อนุญาตให้เป็นค่าว่าง
  
  const date = new Date(dateString);
  const today = new Date();
  
  // ตรวจสอบว่าเป็นวันที่ที่ถูกต้อง
  if (isNaN(date.getTime())) {
    return false;
  }
  
  // ตรวจสอบว่าไม่เป็นวันที่ในอนาคต
  if (date > today) {
    return false;
  }
  
  // ตรวจสอบว่าไม่เก่าเกินไป (100 ปี)
  const hundredYearsAgo = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
  if (date < hundredYearsAgo) {
    return false;
  }
  
  return true;
}

// ฟังก์ชันตรวจสอบรูปแบบหมายเลขบัตรประชาชน/Passport
function isValidIdNumber(idNumber) {
  if (!idNumber) return true; // อนุญาตให้เป็นค่าว่าง
  
  const trimmedId = idNumber.trim();
  
  // ตรวจสอบบัตรประชาชน (13 หลัก)
  if (/^[0-9]{13}$/.test(trimmedId)) {
    return true;
  }
  
  // ตรวจสอบ Passport (6-12 ตัวอักษรและตัวเลข)
  if (/^[A-Za-z0-9]{6,12}$/.test(trimmedId)) {
    return true;
  }
  
  return false;
}
