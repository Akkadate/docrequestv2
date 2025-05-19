const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/auth');

module.exports = (pool, upload) => {
  // ดึงรายการประเภทเอกสาร
  router.get('/types', async (req, res) => {
    try {
      const lang = req.query.lang || 'th';
      const column = `name_${lang}`;
      
      const documentTypes = await pool.query(
        `SELECT id, ${column} as name, price FROM document_types`
      );
      
      res.status(200).json(documentTypes.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลประเภทเอกสาร' });
    }
  });
  
  // ดึงรายการคณะ
  router.get('/faculties', async (req, res) => {
    try {
      const lang = req.query.lang || 'th';
      const column = `name_${lang}`;
      
      const faculties = await pool.query(
        `SELECT id, ${column} as name FROM faculties`
      );
      
      res.status(200).json(faculties.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคณะ' });
    }
  });
  
  // สร้างคำขอเอกสาร
  router.post('/request', authenticateJWT, upload.single('payment_slip'), async (req, res) => {
    try {
      const { document_type_id, delivery_method, address, urgent } = req.body;
      const user_id = req.user.id;
      
      // คำนวณราคา
      let total_price = 0;
      
      // ดึงราคาเอกสาร
      const documentType = await pool.query(
        'SELECT price FROM document_types WHERE id = $1',
        [document_type_id]
      );
      
      if (documentType.rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบประเภทเอกสาร' });
      }
      
      total_price += documentType.rows[0].price;
      
      // เพิ่มค่าบริการเร่งด่วน (ถ้ามี)
      if (urgent === 'true' && delivery_method === 'pickup') {
        total_price += 50; // ค่าบริการเร่งด่วนเพิ่ม 50 บาท
      }
      
      // เพิ่มค่าจัดส่ง (ถ้ามี)
      if (delivery_method === 'mail') {
        total_price += 200; // ค่าจัดส่ง 200 บาท
      }
      
      // บันทึกหลักฐานการชำระเงิน (ถ้ามี)
      let payment_slip_url = null;
      if (req.file) {
        payment_slip_url = `/uploads/${req.file.filename}`;
      }
      
      // บันทึกคำขอเอกสาร
      const newRequest = await pool.query(
        'INSERT INTO document_requests (user_id, document_type_id, delivery_method, address, urgent, total_price, payment_slip_url, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [user_id, document_type_id, delivery_method, address, urgent === 'true', total_price, payment_slip_url, 'pending']
      );
      
      res.status(201).json({
        message: 'สร้างคำขอเอกสารสำเร็จ',
        request: newRequest.rows[0]
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างคำขอเอกสาร' });
    }
  });
  
  // อัปโหลดหลักฐานการชำระเงิน
  router.post('/upload-payment/:request_id', authenticateJWT, upload.single('payment_slip'), async (req, res) => {
    try {
      const { request_id } = req.params;
      
      // ตรวจสอบว่าคำขอนี้เป็นของผู้ใช้นี้หรือไม่
      const request = await pool.query(
        'SELECT * FROM document_requests WHERE id = $1 AND user_id = $2',
        [request_id, req.user.id]
      );
      
      if (request.rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบคำขอเอกสาร' });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: 'ไม่พบไฟล์อัปโหลด' });
      }
      
      const payment_slip_url = `/uploads/${req.file.filename}`;
      
      // อัปเดตหลักฐานการชำระเงิน
      await pool.query(
        'UPDATE document_requests SET payment_slip_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [payment_slip_url, request_id]
      );
      
      res.status(200).json({ message: 'อัปโหลดหลักฐานการชำระเงินสำเร็จ' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปโหลดหลักฐานการชำระเงิน' });
    }
  });
  
  // ดึงรายการคำขอเอกสารของผู้ใช้
  router.get('/my-requests', authenticateJWT, async (req, res) => {
    try {
      const lang = req.query.lang || 'th';
      const column = `name_${lang}`;
      
      const requests = await pool.query(
        `SELECT dr.*, dt.${column} as document_name
        FROM document_requests dr
        JOIN document_types dt ON dr.document_type_id = dt.id
        WHERE dr.user_id = $1
        ORDER BY dr.created_at DESC`,
        [req.user.id]
      );
      
      res.status(200).json(requests.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำขอเอกสาร' });
    }
  });
  
  // ดึงรายละเอียดคำขอเอกสาร
  router.get('/request/:id', authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      const lang = req.query.lang || 'th';
      const column = `name_${lang}`;
      
      // ตรวจสอบว่าคำขอนี้เป็นของผู้ใช้นี้หรือเป็นผู้ดูแลระบบ
      const isAdmin = req.user.role === 'admin';
      
      let request;
      if (isAdmin) {
        request = await pool.query(
          `SELECT dr.*, dt.${column} as document_name, u.full_name, u.student_id, u.email, u.phone
          FROM document_requests dr
          JOIN document_types dt ON dr.document_type_id = dt.id
          JOIN users u ON dr.user_id = u.id
          WHERE dr.id = $1`,
          [id]
        );
      } else {
        request = await pool.query(
          `SELECT dr.*, dt.${column} as document_name
          FROM document_requests dr
          JOIN document_types dt ON dr.document_type_id = dt.id
          WHERE dr.id = $1 AND dr.user_id = $2`,
          [id, req.user.id]
        );
      }
      
      if (request.rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบคำขอเอกสาร' });
      }
      
      res.status(200).json(request.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำขอเอกสาร' });
    }
  });
  
  return router;
};
