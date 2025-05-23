const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/auth');
const { notifyNewDocumentRequest } = require('../services/lineNotification'); // เพิ่มบรรทัดนี้

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
  
  // สร้างคำขอเอกสาร (เดิม - สำหรับความเข้ากันได้กับระบบเก่า)
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

      // ดึงข้อมูลเพิ่มเติมสำหรับ LINE notification
      const userInfo = await pool.query(
        'SELECT student_id, full_name FROM users WHERE id = $1',
        [user_id]
      );

      const docTypeInfo = await pool.query(
        'SELECT name_th FROM document_types WHERE id = $1',
        [document_type_id]
      );

      // ส่ง LINE notification
      try {
        const notificationData = {
          requestId: newRequest.rows[0].id,
          studentId: userInfo.rows[0].student_id,
          studentName: userInfo.rows[0].full_name,
          documentName: docTypeInfo.rows[0].name_th,
          deliveryMethod: delivery_method,
          urgent: urgent === 'true',
          totalPrice: total_price,
          timestamp: new Date().toISOString()
        };

        await notifyNewDocumentRequest(notificationData);
        console.log(`✅ LINE notification sent for request ID: ${newRequest.rows[0].id}`);
      } catch (lineError) {
        console.error('❌ LINE notification failed:', lineError);
        // ไม่ให้ error ของ LINE ส่งผลต่อการสร้างคำขอ
      }
      
      res.status(201).json({
        message: 'สร้างคำขอเอกสารสำเร็จ',
        request: newRequest.rows[0]
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างคำขอเอกสาร' });
    }
  });
  
  // สร้างคำขอเอกสารหลายรายการ (ใหม่) - เพิ่ม LINE notification
  router.post('/request-multiple', authenticateJWT, upload.single('payment_slip'), async (req, res) => {
    try {
      const { delivery_method, address, urgent, total_price } = req.body;
      const user_id = req.user.id;
      
      // รับข้อมูลเอกสารที่เลือกทั้งหมด
      const documents = JSON.parse(req.body.documents);
      
      if (!documents || documents.length === 0) {
        return res.status(400).json({ message: 'กรุณาเลือกเอกสารอย่างน้อย 1 รายการ' });
      }
      
      // บันทึกหลักฐานการชำระเงิน (ถ้ามี)
      let payment_slip_url = null;
      if (req.file) {
        payment_slip_url = `/uploads/${req.file.filename}`;
      }
      
      // เริ่มรายการ transaction
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // สร้างคำขอเอกสารหลักสำหรับอ้างอิง
        const mainRequest = await client.query(
          'INSERT INTO document_requests (user_id, document_type_id, delivery_method, address, urgent, total_price, payment_slip_url, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
          [user_id, documents[0].id, delivery_method, address, urgent === 'true', total_price, payment_slip_url, 'pending']
        );
        
        const mainRequestId = mainRequest.rows[0].id;
        
        // สร้างตารางใหม่สำหรับเก็บรายละเอียดคำขอเอกสารหลายรายการ
        // ถ้ายังไม่มีตาราง document_request_items ให้สร้างก่อน
        await client.query(`
          CREATE TABLE IF NOT EXISTS document_request_items (
            id SERIAL PRIMARY KEY,
            request_id INTEGER REFERENCES document_requests(id),
            document_type_id INTEGER REFERENCES document_types(id),
            quantity INTEGER NOT NULL DEFAULT 1,
            price_per_unit DECIMAL(10, 2) NOT NULL,
            subtotal DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // บันทึกรายการเอกสารย่อยทั้งหมด
        for (const doc of documents) {
          await client.query(
            'INSERT INTO document_request_items (request_id, document_type_id, quantity, price_per_unit, subtotal) VALUES ($1, $2, $3, $4, $5)',
            [mainRequestId, doc.id, doc.quantity, doc.price, doc.subtotal]
          );
        }
        
        await client.query('COMMIT');

        // ดึงข้อมูลเพิ่มเติมสำหรับ LINE notification
        const userInfo = await pool.query(
          'SELECT student_id, full_name FROM users WHERE id = $1',
          [user_id]
        );

        // สร้างข้อความรายการเอกสาร
        let documentNames = '';
        if (documents.length === 1) {
          documentNames = documents[0].name;
        } else {
          documentNames = `${documents.length} รายการ (${documents.map(doc => `${doc.name} x${doc.quantity}`).join(', ')})`;
        }

        // ส่ง LINE notification
        try {
          const notificationData = {
            requestId: mainRequestId,
            studentId: userInfo.rows[0].student_id,
            studentName: userInfo.rows[0].full_name,
            documentName: documentNames,
            deliveryMethod: delivery_method,
            urgent: urgent === 'true',
            totalPrice: total_price,
            timestamp: new Date().toISOString()
          };

          await notifyNewDocumentRequest(notificationData);
          console.log(`✅ LINE notification sent for multiple documents request ID: ${mainRequestId}`);
        } catch (lineError) {
          console.error('❌ LINE notification failed:', lineError);
          // ไม่ให้ error ของ LINE ส่งผลต่อการสร้างคำขอ
        }
        
        res.status(201).json({
          message: 'สร้างคำขอเอกสารสำเร็จ',
          request_id: mainRequestId
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
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
      const status = req.query.status || '';
      const search = req.query.search || '';
      
      let query = `
        SELECT dr.*, dt.${column} as document_name
        FROM document_requests dr
        JOIN document_types dt ON dr.document_type_id = dt.id
        WHERE dr.user_id = $1
      `;
      
      const queryParams = [req.user.id];
      let paramIndex = 2;
      
      // เพิ่มการกรองตามสถานะ (ถ้ามี)
      if (status) {
        query += ` AND dr.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }
      
      // เพิ่มการค้นหา (ถ้ามี)
      if (search) {
        query += ` AND (dt.${column} ILIKE $${paramIndex} OR CAST(dr.id AS TEXT) LIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
      
      query += ' ORDER BY dr.created_at DESC';
      
      const requests = await pool.query(query, queryParams);
      
      // สำหรับคำขอที่มีหลายรายการ เพิ่มข้อมูลเพิ่มเติม
      const enhancedRequests = await Promise.all(requests.rows.map(async (request) => {
        try {
          // ตรวจสอบว่ามีรายการย่อยหรือไม่
          const itemsQuery = `
            SELECT dri.*, dt.${column} as document_name
            FROM document_request_items dri
            JOIN document_types dt ON dri.document_type_id = dt.id
            WHERE dri.request_id = $1
          `;
          
          const itemsResult = await pool.query(itemsQuery, [request.id]);
          
          if (itemsResult.rows.length > 0) {
            // ถ้ามีรายการย่อย
            request.has_multiple_items = true;
            request.document_items = itemsResult.rows;
            request.item_count = itemsResult.rows.length;
          } else {
            request.has_multiple_items = false;
          }
          
          return request;
        } catch (error) {
          console.error(`Error fetching items for request ${request.id}:`, error);
          return request;
        }
      }));
      
      res.status(200).json(enhancedRequests);
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
  
  // เพิ่ม endpoint สำหรับดึงประวัติสถานะ
  router.get('/request/:id/status-history', authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // ตรวจสอบว่าคำขอนี้เป็นของผู้ใช้นี้หรือไม่
      const requestCheck = await pool.query(
        'SELECT user_id FROM document_requests WHERE id = $1',
        [id]
      );
      
      if (requestCheck.rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบคำขอเอกสาร' });
      }
      
      if (requestCheck.rows[0].user_id !== userId) {
        return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ดูข้อมูลคำขอนี้' });
      }
      
      // ดึงประวัติสถานะ
      const query = `
        SELECT 
          sh.id,
          sh.status,
          sh.note,
          sh.created_at,
          CASE 
            WHEN u.role = 'admin' THEN 'เจ้าหน้าที่'
            ELSE u.full_name
          END as created_by_name
        FROM status_history sh
        LEFT JOIN users u ON sh.created_by = u.id
        WHERE sh.request_id = $1
        ORDER BY sh.created_at DESC
      `;
      
      const result = await pool.query(query, [id]);
      
      res.json(result.rows);
      
    } catch (err) {
      console.error('Error fetching status history:', err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงประวัติสถานะ' });
    }
  });
  
  return router;
};
