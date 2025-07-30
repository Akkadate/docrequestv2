// ===============================================
// Approval Workflow API Routes
// ===============================================
// ไฟล์: routes/approval-workflow.js
// วันที่สร้าง: 30 กรกฎาคม 2025
// วัตถุประสงค์: จัดการ API endpoints สำหรับ approval workflow

const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/auth');
const { isAdvisor, canAccessApprovalRequest, canModifyApprovalRequest, logAdvisorAccess } = require('../middleware/advisor');
const { emailService } = require('../services/emailService');

module.exports = (pool) => {

  // ===============================================
  // STUDENT ENDPOINTS - สำหรับนักศึกษายื่นคำขออนุมัติ
  // ===============================================

  /**
   * ยื่นคำขออนุมัติเอกสารใหม่
   * POST /api/approval-workflow/submit
   */
  router.post('/submit', authenticateJWT, async (req, res) => {
    const client = await pool.connect();
    
    try {
      const {
        document_type_id,
        request_type, // 'late_registration', 'add_drop_course'
        request_title,
        request_description,
        delivery_method,
        address,
        urgent,
        additional_documents
      } = req.body;

      const userId = req.user.id;

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!document_type_id || !request_type || !request_title) {
        return res.status(400).json({ 
          message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน',
          required: ['document_type_id', 'request_type', 'request_title']
        });
      }

      // ตรวจสอบประเภทคำขอ
      const validRequestTypes = ['late_registration', 'add_drop_course'];
      if (!validRequestTypes.includes(request_type)) {
        return res.status(400).json({ 
          message: 'ประเภทคำขอไม่ถูกต้อง',
          validTypes: validRequestTypes
        });
      }

      await client.query('BEGIN');

      // ดึงข้อมูลนักศึกษาและคณะ
      const userQuery = `
        SELECT u.*, f.id as faculty_id, f.name_th as faculty_name
        FROM users u
        LEFT JOIN faculties f ON f.name_th = u.faculty
        WHERE u.id = $1
      `;
      const userResult = await client.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
      }

      const userData = userResult.rows[0];
      
      if (!userData.faculty_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: 'ไม่พบข้อมูลคณะของผู้ใช้ กรุณาติดต่อผู้ดูแลระบบ' 
        });
      }

      // ค้นหาอาจารย์ที่ปรึกษาของคณะ
      const advisorQuery = `
        SELECT * FROM faculty_advisors 
        WHERE faculty_id = $1 AND is_active = true
        ORDER BY id LIMIT 1
      `;
      const advisorResult = await client.query(advisorQuery, [userData.faculty_id]);
      
      if (advisorResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: 'ไม่พบอาจารย์ที่ปรึกษาสำหรับคณะของคุณ กรุณาติดต่อแผนกทะเบียน' 
        });
      }

      const advisorData = advisorResult.rows[0];

      // คำนวณราคาเอกสาร
      const docTypeQuery = 'SELECT price FROM document_types WHERE id = $1';
      const docTypeResult = await client.query(docTypeQuery, [document_type_id]);
      
      if (docTypeResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'ไม่พบประเภทเอกสารที่ระบุ' });
      }

      let totalPrice = docTypeResult.rows[0].price;
      
      // เพิ่มค่าจัดส่ง
      if (delivery_method === 'mail') {
        totalPrice += 200;
      }
      
      // เพิ่มค่าเร่งด่วน
      if (urgent && delivery_method === 'pickup') {
        totalPrice += 50;
      }

      // สร้างคำขอเอกสารหลัก (สถานะ pending รอการอนุมัติ)
      const docRequestQuery = `
        INSERT INTO document_requests 
        (user_id, document_type_id, delivery_method, address, urgent, total_price, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING *
      `;
      
      const docRequestResult = await client.query(docRequestQuery, [
        userId, document_type_id, delivery_method, address || null, urgent || false, totalPrice
      ]);

      const documentRequest = docRequestResult.rows[0];

      // สร้างคำขออนุมัติ
      const approvalRequestQuery = `
        INSERT INTO approval_requests 
        (document_request_id, student_id, faculty_id, advisor_id, request_type, request_title, 
         request_description, additional_documents, approval_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'waiting_approval')
        RETURNING *
      `;
      
      const approvalRequestResult = await client.query(approvalRequestQuery, [
        documentRequest.id,
        userId,
        userData.faculty_id,
        advisorData.id,
        request_type,
        request_title,
        request_description || null,
        additional_documents ? JSON.stringify(additional_documents) : null
      ]);

      const approvalRequest = approvalRequestResult.rows[0];

      // บันทึกประวัติการสร้างคำขอ
      await client.query(`
        INSERT INTO approval_history 
        (approval_request_id, action, new_status, comment, created_by)
        VALUES ($1, 'created', 'waiting_approval', $2, $3)
      `, [
        approvalRequest.id,
        `สร้างคำขออนุมัติ: ${request_title}`,
        userId
      ]);

      await client.query('COMMIT');

      // ส่งอีเมลแจ้งเตือนอาจารย์ที่ปรึกษา (ไม่บล็อกการตอบกลับ)
      setImmediate(async () => {
        try {
          // ดึงเทมเพลตอีเมล
          const templateQuery = `
            SELECT * FROM email_templates 
            WHERE template_name = 'approval_request_notification' AND is_active = true
          `;
          const templateResult = await pool.query(templateQuery);
          
          if (templateResult.rows.length > 0) {
            const template = templateResult.rows[0];
            
            const emailResult = await emailService.sendApprovalNotification(
              {
                approvalRequestId: approvalRequest.id,
                studentName: userData.full_name,
                studentId: userData.student_id,
                facultyName: userData.faculty_name,
                requestTitle: request_title,
                requestDescription: request_description,
                createdAt: approvalRequest.created_at
              },
              advisorData,
              template,
              'th' // Default language
            );

            // อัปเดตสถานะการส่งอีเมล
            if (emailResult.success) {
              await pool.query(`
                UPDATE approval_requests 
                SET email_sent_at = CURRENT_TIMESTAMP 
                WHERE id = $1
              `, [approvalRequest.id]);

              await pool.query(`
                INSERT INTO approval_history 
                (approval_request_id, action, comment, metadata)
                VALUES ($1, 'email_sent', 'ส่งอีเมลแจ้งเตือนอาจารย์ที่ปรึกษาสำเร็จ', $2)
              `, [
                approvalRequest.id,
                JSON.stringify({ messageId: emailResult.messageId })
              ]);

              console.log('📧 Approval notification email sent successfully');
            } else {
              console.error('❌ Failed to send approval notification email:', emailResult.error);
            }
          }
        } catch (emailError) {
          console.error('❌ Error sending approval notification email:', emailError);
        }
      });

      res.status(201).json({
        message: 'ยื่นคำขออนุมัติสำเร็จ กรุณารอการพิจารณาจากอาจารย์ที่ปรึกษา',
        approvalRequest: {
          id: approvalRequest.id,
          documentRequestId: documentRequest.id,
          requestType: request_type,
          requestTitle: request_title,
          approvalStatus: 'waiting_approval',
          advisorName: advisorData.advisor_name,
          createdAt: approvalRequest.created_at
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error submitting approval request:', error);
      res.status(500).json({ 
        message: 'เกิดข้อผิดพลาดในการยื่นคำขออนุมัติ',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      client.release();
    }
  });

  /**
   * ดึงรายการคำขออนุมัติของนักศึกษา
   * GET /api/approval-workflow/my-requests
   */
  router.get('/my-requests', authenticateJWT, async (req, res) => {
    try {
      const userId = req.user.id;
      const { status, page = 1, limit = 10 } = req.query;

      let whereClause = 'WHERE ar.student_id = $1';
      let queryParams = [userId];
      let paramIndex = 2;

      if (status) {
        whereClause += ` AND ar.approval_status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const query = `
        SELECT 
          ar.*,
          dr.total_price,
          dr.delivery_method,
          dr.urgent,
          dr.status as document_status,
          dt.name_th as document_type_name,
          fa.advisor_name,
          fa.advisor_email,
          f.name_th as faculty_name
        FROM approval_requests ar
        JOIN document_requests dr ON ar.document_request_id = dr.id
        JOIN document_types dt ON dr.document_type_id = dt.id
        JOIN faculty_advisors fa ON ar.advisor_id = fa.id
        JOIN faculties f ON ar.faculty_id = f.id
        ${whereClause}
        ORDER BY ar.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(parseInt(limit), offset);

      const result = await pool.query(query, queryParams);

      // นับจำนวนรายการทั้งหมด
      const countQuery = `
        SELECT COUNT(*) 
        FROM approval_requests ar 
        ${whereClause.replace(/\$(\d+)/g, (match, num) => `${parseInt(num) - 1}`)}
      `;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const totalItems = parseInt(countResult.rows[0].count);

      res.status(200).json({
        requests: result.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalItems / parseInt(limit)),
          totalItems: totalItems,
          itemsPerPage: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error fetching approval requests:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายการคำขออนุมัติ' });
    }
  });

  /**
   * ดึงรายละเอียดคำขออนุมัติเฉพาะรายการ
   * GET /api/approval-workflow/request/:id
   */
  router.get('/request/:id', authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';

      let query, queryParams;

      if (isAdmin) {
        // Admin สามารถดูได้ทั้งหมด
        query = `
          SELECT 
            ar.*,
            dr.total_price, dr.delivery_method, dr.urgent, dr.address,
            dr.status as document_status, dr.payment_slip_url,
            dt.name_th as document_type_name,
            u.full_name as student_name, u.student_id, u.email as student_email,
            fa.advisor_name, fa.advisor_email,
            f.name_th as faculty_name
          FROM approval_requests ar
          JOIN document_requests dr ON ar.document_request_id = dr.id
          JOIN document_types dt ON dr.document_type_id = dt.id
          JOIN users u ON ar.student_id = u.id
          JOIN faculty_advisors fa ON ar.advisor_id = fa.id
          JOIN faculties f ON ar.faculty_id = f.id
          WHERE ar.id = $1
        `;
        queryParams = [id];
      } else {
        // นักศึกษาดูได้เฉพาะของตัวเอง
        query = `
          SELECT 
            ar.*,
            dr.total_price, dr.delivery_method, dr.urgent, dr.address,
            dr.status as document_status, dr.payment_slip_url,
            dt.name_th as document_type_name,
            fa.advisor_name,
            f.name_th as faculty_name
          FROM approval_requests ar
          JOIN document_requests dr ON ar.document_request_id = dr.id
          JOIN document_types dt ON dr.document_type_id = dt.id
          JOIN faculty_advisors fa ON ar.advisor_id = fa.id
          JOIN faculties f ON ar.faculty_id = f.id
          WHERE ar.id = $1 AND ar.student_id = $2
        `;
        queryParams = [id, userId];
      }

      const result = await pool.query(query, queryParams);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบคำขออนุมัติที่ระบุ' });
      }

      const requestData = result.rows[0];

      // ดึงประวัติการดำเนินการ
      const historyQuery = `
        SELECT 
          ah.*,
          u.full_name as created_by_name
        FROM approval_history ah
        LEFT JOIN users u ON ah.created_by = u.id
        WHERE ah.approval_request_id = $1
        ORDER BY ah.created_at DESC
      `;

      const historyResult = await pool.query(historyQuery, [id]);

      res.status(200).json({
        ...requestData,
        history: historyResult.rows
      });

    } catch (error) {
      console.error('Error fetching approval request details:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายละเอียดคำขออนุมัติ' });
    }
  });

  // ===============================================
  // ADVISOR ENDPOINTS - สำหรับอาจารย์ที่ปรึกษา
  // ===============================================

  /**
   * ดึงรายการคำขออนุมัติสำหรับอาจารย์ที่ปรึกษา
   * GET /api/approval-workflow/advisor/requests
   */
  router.get('/advisor/requests', authenticateJWT, isAdvisor, logAdvisorAccess, async (req, res) => {
    try {
      const { status, page = 1, limit = 10, search } = req.query;

      let whereClause = '';
      let queryParams = [];
      let paramIndex = 1;

      // Admin ดูได้ทั้งหมด, Advisor ดูเฉพาะคณะตัวเอง
      if (req.advisorAccess.type !== 'admin') {
        whereClause = 'WHERE ar.faculty_id = $1';
        queryParams.push(req.advisorAccess.facultyId);
        paramIndex++;
      } else {
        whereClause = 'WHERE 1=1';
      }

      // กรองตามสถานะ
      if (status) {
        whereClause += ` AND ar.approval_status = ${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      // ค้นหา
      if (search) {
        whereClause += ` AND (
          u.full_name ILIKE ${paramIndex} OR 
          u.student_id ILIKE ${paramIndex} OR 
          ar.request_title ILIKE ${paramIndex}
        )`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const query = `
        SELECT 
          ar.*,
          dr.total_price, dr.delivery_method, dr.urgent,
          dt.name_th as document_type_name,
          u.full_name as student_name, u.student_id, u.email as student_email,
          f.name_th as faculty_name
        FROM approval_requests ar
        JOIN document_requests dr ON ar.document_request_id = dr.id
        JOIN document_types dt ON dr.document_type_id = dt.id
        JOIN users u ON ar.student_id = u.id
        JOIN faculties f ON ar.faculty_id = f.id
        ${whereClause}
        ORDER BY 
          CASE ar.approval_status 
            WHEN 'waiting_approval' THEN 1 
            ELSE 2 
          END,
          ar.created_at DESC
        LIMIT ${paramIndex} OFFSET ${paramIndex + 1}
      `;

      queryParams.push(parseInt(limit), offset);

      const result = await pool.query(query, queryParams);

      // นับจำนวนรายการทั้งหมด
      const countQuery = `
        SELECT COUNT(*) 
        FROM approval_requests ar
        JOIN users u ON ar.student_id = u.id
        ${whereClause}
      `;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const totalItems = parseInt(countResult.rows[0].count);

      res.status(200).json({
        requests: result.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalItems / parseInt(limit)),
          totalItems: totalItems,
          itemsPerPage: parseInt(limit)
        },
        advisorInfo: {
          facultyName: req.advisorAccess.facultyName,
          advisorName: req.advisorAccess.advisorName,
          canAccessAll: req.advisorAccess.type === 'admin'
        }
      });

    } catch (error) {
      console.error('Error fetching advisor requests:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายการคำขออนุมัติ' });
    }
  });

  /**
   * ดึงรายละเอียดคำขออนุมัติสำหรับอาจารย์
   * GET /api/approval-workflow/advisor/request/:approval_id
   */
  router.get('/advisor/request/:approval_id', authenticateJWT, isAdvisor, canAccessApprovalRequest, logAdvisorAccess, async (req, res) => {
    try {
      const { approval_id } = req.params;

      const query = `
        SELECT 
          ar.*,
          dr.total_price, dr.delivery_method, dr.urgent, dr.address,
          dr.status as document_status, dr.payment_slip_url,
          dt.name_th as document_type_name, dt.price as document_price,
          u.full_name as student_name, u.student_id, u.email as student_email,
          u.phone as student_phone, u.faculty as student_faculty,
          fa.advisor_name, fa.advisor_email,
          f.name_th as faculty_name
        FROM approval_requests ar
        JOIN document_requests dr ON ar.document_request_id = dr.id
        JOIN document_types dt ON dr.document_type_id = dt.id
        JOIN users u ON ar.student_id = u.id
        JOIN faculty_advisors fa ON ar.advisor_id = fa.id
        JOIN faculties f ON ar.faculty_id = f.id
        WHERE ar.id = $1
      `;

      const result = await pool.query(query, [approval_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบคำขออนุมัติที่ระบุ' });
      }

      const requestData = result.rows[0];

      // ดึงประวัติการดำเนินการ
      const historyQuery = `
        SELECT 
          ah.*,
          CASE 
            WHEN u.role = 'admin' THEN 'ผู้ดูแลระบบ'
            WHEN u.is_advisor = true THEN 'อาจารย์ที่ปรึกษา'
            ELSE u.full_name
          END as created_by_name
        FROM approval_history ah
        LEFT JOIN users u ON ah.created_by = u.id
        WHERE ah.approval_request_id = $1
        ORDER BY ah.created_at DESC
      `;

      const historyResult = await pool.query(historyQuery, [approval_id]);

      res.status(200).json({
        ...requestData,
        history: historyResult.rows,
        canModify: ['waiting_approval'].includes(requestData.approval_status)
      });

    } catch (error) {
      console.error('Error fetching approval request for advisor:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายละเอียดคำขออนุมัติ' });
    }
  });

  /**
   * อนุมัติคำขอ
   * POST /api/approval-workflow/advisor/approve/:approval_id
   */
  router.post('/advisor/approve/:approval_id', authenticateJWT, isAdvisor, canAccessApprovalRequest, canModifyApprovalRequest, logAdvisorAccess, async (req, res) => {
    const client = await pool.connect();

    try {
      const { approval_id } = req.params;
      const { comment } = req.body;
      const advisorId = req.user.id;

      await client.query('BEGIN');

      // อัปเดตสถานะคำขออนุมัติ
      const updateQuery = `
        UPDATE approval_requests 
        SET 
          approval_status = 'approved_by_advisor',
          advisor_comment = $1,
          approved_at = CURRENT_TIMESTAMP,
          approved_by = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [comment || null, advisorId, approval_id]);
      const approvalRequest = updateResult.rows[0];

      // อัปเดตสถานะคำขอเอกสารหลักให้เป็น processing
      await client.query(`
        UPDATE document_requests 
        SET status = 'processing', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [approvalRequest.document_request_id]);

      // บันทึกประวัติการอนุมัติ
      await client.query(`
        INSERT INTO approval_history 
        (approval_request_id, action, previous_status, new_status, comment, created_by)
        VALUES ($1, 'approved', 'waiting_approval', 'approved_by_advisor', $2, $3)
      `, [
        approval_id,
        comment || 'อนุมัติคำขอ',
        advisorId
      ]);

      await client.query('COMMIT');

      // ส่งอีเมลแจ้งผล (ไม่บล็อกการตอบกลับ)
      setImmediate(async () => {
        try {
          // ดึงข้อมูลนักศึกษา
          const studentQuery = `
            SELECT u.*, ar.request_title
            FROM users u
            JOIN approval_requests ar ON u.id = ar.student_id
            WHERE ar.id = $1
          `;
          const studentResult = await pool.query(studentQuery, [approval_id]);
          
          if (studentResult.rows.length > 0) {
            const studentData = studentResult.rows[0];
            
            await emailService.sendApprovalResult(
              {
                requestTitle: studentData.request_title
              },
              studentData,
              'approved_by_advisor',
              comment,
              'th'
            );

            console.log('📧 Approval result email sent to student');
          }
        } catch (emailError) {
          console.error('❌ Error sending approval result email:', emailError);
        }
      });

      res.status(200).json({
        message: 'อนุมัติคำขอสำเร็จ คำขอจะถูกส่งต่อไปยังแผนกทะเบียน',
        approvalRequest: {
          id: approvalRequest.id,
          approvalStatus: 'approved_by_advisor',
          approvedAt: approvalRequest.approved_at,
          advisorComment: comment
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error approving request:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอนุมัติคำขอ' });
    } finally {
      client.release();
    }
  });

  /**
   * ปฏิเสธคำขอ
   * POST /api/approval-workflow/advisor/reject/:approval_id
   */
  router.post('/advisor/reject/:approval_id', authenticateJWT, isAdvisor, canAccessApprovalRequest, canModifyApprovalRequest, logAdvisorAccess, async (req, res) => {
    const client = await pool.connect();

    try {
      const { approval_id } = req.params;
      const { rejection_reason } = req.body;
      const advisorId = req.user.id;

      if (!rejection_reason || rejection_reason.trim().length === 0) {
        return res.status(400).json({ 
          message: 'กรุณาระบุเหตุผลในการปฏิเสธคำขอ' 
        });
      }

      await client.query('BEGIN');

      // อัปเดตสถานะคำขออนุมัติ
      const updateQuery = `
        UPDATE approval_requests 
        SET 
          approval_status = 'rejected_by_advisor',
          rejection_reason = $1,
          rejected_at = CURRENT_TIMESTAMP,
          approved_by = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [rejection_reason, advisorId, approval_id]);
      const approvalRequest = updateResult.rows[0];

      // อัปเดตสถานะคำขอเอกสารหลักให้เป็น rejected
      await client.query(`
        UPDATE document_requests 
        SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [approvalRequest.document_request_id]);

      // บันทึกประวัติการปฏิเสธ
      await client.query(`
        INSERT INTO approval_history 
        (approval_request_id, action, previous_status, new_status, comment, created_by)
        VALUES ($1, 'rejected', 'waiting_approval', 'rejected_by_advisor', $2, $3)
      `, [
        approval_id,
        `ปฏิเสธคำขอ: ${rejection_reason}`,
        advisorId
      ]);

      await client.query('COMMIT');

      // ส่งอีเมลแจ้งผล (ไม่บล็อกการตอบกลับ)
      setImmediate(async () => {
        try {
          const studentQuery = `
            SELECT u.*, ar.request_title
            FROM users u
            JOIN approval_requests ar ON u.id = ar.student_id
            WHERE ar.id = $1
          `;
          const studentResult = await pool.query(studentQuery, [approval_id]);
          
          if (studentResult.rows.length > 0) {
            const studentData = studentResult.rows[0];
            
            await emailService.sendApprovalResult(
              {
                requestTitle: studentData.request_title
              },
              studentData,
              'rejected_by_advisor',
              rejection_reason,
              'th'
            );

            console.log('📧 Rejection result email sent to student');
          }
        } catch (emailError) {
          console.error('❌ Error sending rejection result email:', emailError);
        }
      });

      res.status(200).json({
        message: 'ปฏิเสธคำขอสำเร็จ',
        approvalRequest: {
          id: approvalRequest.id,
          approvalStatus: 'rejected_by_advisor',
          rejectedAt: approvalRequest.rejected_at,
          rejectionReason: rejection_reason
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error rejecting request:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการปฏิเสธคำขอ' });
    } finally {
      client.release();
    }
  });

  /**
   * ดึงสถิติสำหรับอาจารย์
   * GET /api/approval-workflow/advisor/stats
   */
  router.get('/advisor/stats', authenticateJWT, isAdvisor, logAdvisorAccess, async (req, res) => {
    try {
      const { period = 'month' } = req.query; // month, quarter, year

      let whereClause = '';
      let queryParams = [];

      if (req.advisorAccess.type !== 'admin') {
        whereClause = 'WHERE ar.faculty_id = $1';
        queryParams.push(req.advisorAccess.facultyId);
      }

      // สถิติรวม
      const totalQuery = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN ar.approval_status = 'waiting_approval' THEN 1 END) as pending,
          COUNT(CASE WHEN ar.approval_status = 'approved_by_advisor' THEN 1 END) as approved,
          COUNT(CASE WHEN ar.approval_status = 'rejected_by_advisor' THEN 1 END) as rejected,
          AVG(EXTRACT(EPOCH FROM (COALESCE(ar.approved_at, ar.rejected_at) - ar.created_at))/3600) as avg_response_hours
        FROM approval_requests ar
        ${whereClause}
      `;

      const totalResult = await pool.query(totalQuery, queryParams);

      // สถิติตามช่วงเวลา
      let periodClause;
      switch (period) {
        case 'quarter':
          periodClause = "DATE_TRUNC('quarter', ar.created_at)";
          break;
        case 'year':
          periodClause = "DATE_TRUNC('year', ar.created_at)";
          break;
        default:
          periodClause = "DATE_TRUNC('month', ar.created_at)";
      }

      const periodQuery = `
        SELECT 
          ${periodClause} as period,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN ar.approval_status = 'approved_by_advisor' THEN 1 END) as approved,
          COUNT(CASE WHEN ar.approval_status = 'rejected_by_advisor' THEN 1 END) as rejected
        FROM approval_requests ar
        ${whereClause}
        GROUP BY ${periodClause}
        ORDER BY period DESC
        LIMIT 12
      `;

      const periodResult = await pool.query(periodQuery, queryParams);

      res.status(200).json({
        summary: totalResult.rows[0],
        trends: periodResult.rows,
        advisorInfo: {
          facultyName: req.advisorAccess.facultyName,
          advisorName: req.advisorAccess.advisorName,
          type: req.advisorAccess.type
        }
      });

    } catch (error) {
      console.error('Error fetching advisor stats:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงสถิติ' });
    }
  });

  // ===============================================  
  // ADMIN ENDPOINTS - สำหรับผู้ดูแลระบบ
  // ===============================================

  /**
   * ส่งการเตือนใหม่ (Admin only)
   * POST /api/approval-workflow/admin/send-reminder/:approval_id
   */
  router.post('/admin/send-reminder/:approval_id', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const client = await pool.connect();

    try {
      const { approval_id } = req.params;

      // ดึงข้อมูลคำขออนุมัติ
      const requestQuery = `
        SELECT 
          ar.*,
          u.full_name as student_name, u.student_id,
          fa.advisor_name, fa.advisor_email,
          f.name_th as faculty_name
        FROM approval_requests ar
        JOIN users u ON ar.student_id = u.id
        JOIN faculty_advisors fa ON ar.advisor_id = fa.id
        JOIN faculties f ON ar.faculty_id = f.id
        WHERE ar.id = $1 AND ar.approval_status = 'waiting_approval'
      `;

      const requestResult = await pool.query(requestQuery, [approval_id]);

      if (requestResult.rows.length === 0) {
        return res.status(404).json({ 
          message: 'ไม่พบคำขออนุมัติที่รอการพิจารณา' 
        });
      }

      const requestData = requestResult.rows[0];

      await client.query('BEGIN');

      // อัปเดตจำนวนการเตือน
      const newReminderCount = (requestData.reminder_count || 0) + 1;
      
      await client.query(`
        UPDATE approval_requests 
        SET 
          reminder_count = $1,
          last_reminder_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [newReminderCount, approval_id]);

      // บันทึกประวัติ
      await client.query(`
        INSERT INTO approval_history 
        (approval_request_id, action, comment, created_by)
        VALUES ($1, 'reminder_sent', $2, $3)
      `, [
        approval_id,
        `ส่งการเตือนครั้งที่ ${newReminderCount}`,
        req.user.id
      ]);

      await client.query('COMMIT');

      // ส่งอีเมลเตือน
      const templateQuery = `
        SELECT * FROM email_templates 
        WHERE template_name = 'approval_reminder' AND is_active = true
      `;
      const templateResult = await pool.query(templateQuery);

      if (templateResult.rows.length > 0) {
        const template = templateResult.rows[0];

        const emailResult = await emailService.sendApprovalReminder(
          {
            approvalRequestId: approval_id,
            studentName: requestData.student_name,
            studentId: requestData.student_id,
            facultyName: requestData.faculty_name,
            requestTitle: requestData.request_title,
            createdAt: requestData.created_at
          },
          {
            advisor_email: requestData.advisor_email,
            advisor_name: requestData.advisor_name
          },
          template,
          newReminderCount,
          'th'
        );

        if (emailResult.success) {
          res.status(200).json({
            message: `ส่งการเตือนครั้งที่ ${newReminderCount} สำเร็จ`,
            reminderCount: newReminderCount,
            emailResult: emailResult
          });
        } else {
          res.status(500).json({
            message: 'ส่งการเตือนไม่สำเร็จ',
            error: emailResult.error
          });
        }
      } else {
        res.status(404).json({ 
          message: 'ไม่พบเทมเพลตอีเมลสำหรับการเตือน' 
        });
      }

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error sending reminder:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการส่งการเตือน' });
    } finally {
      client.release();
    }
  });

  /**
   * ดึงสถิติรวมของระบบ (Admin only)
   * GET /api/approval-workflow/admin/system-stats
   */
  router.get('/admin/system-stats', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    try {
      // สถิติรวมทั้งระบบ
      const systemStatsQuery = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN ar.approval_status = 'waiting_approval' THEN 1 END) as pending,
          COUNT(CASE WHEN ar.approval_status = 'approved_by_advisor' THEN 1 END) as approved,
          COUNT(CASE WHEN ar.approval_status = 'rejected_by_advisor' THEN 1 END) as rejected,
          COUNT(CASE WHEN ar.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as this_week,
          COUNT(CASE WHEN ar.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as this_month,
          AVG(EXTRACT(EPOCH FROM (COALESCE(ar.approved_at, ar.rejected_at) - ar.created_at))/3600) as avg_response_hours
        FROM approval_requests ar
      `;

      const systemStatsResult = await pool.query(systemStatsQuery);

      // สถิติแยกตามคณะ
      const facultyStatsQuery = `
        SELECT 
          f.name_th as faculty_name,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN ar.approval_status = 'waiting_approval' THEN 1 END) as pending,
          COUNT(CASE WHEN ar.approval_status = 'approved_by_advisor' THEN 1 END) as approved,
          COUNT(CASE WHEN ar.approval_status = 'rejected_by_advisor' THEN 1 END) as rejected,
          fa.advisor_name,
          fa.advisor_email
        FROM approval_requests ar
        JOIN faculties f ON ar.faculty_id = f.id
        JOIN faculty_advisors fa ON ar.advisor_id = fa.id
        GROUP BY 
          f.id, f.name_th, fa.advisor_name, fa.advisor_email
        ORDER BY total_requests DESC
      `;

      const facultyStatsResult = await pool.query(facultyStatsQuery);

      // สถิติตามช่วงเวลา
      const trendsQuery = `
        SELECT 
          DATE_TRUNC('day', ar.created_at) as date,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN ar.approval_status = 'approved_by_advisor' THEN 1 END) as approved,
          COUNT(CASE WHEN ar.approval_status = 'rejected_by_advisor' THEN 1 END) as rejected
        FROM approval_requests ar
        WHERE ar.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', ar.created_at)
        ORDER BY date DESC
      `;

      const trendsResult = await pool.query(trendsQuery);

      res.status(200).json({
        systemStats: systemStatsResult.rows[0],
        facultyStats: facultyStatsResult.rows,
        trends: trendsResult.rows
      });

    } catch (error) {
      console.error('Error fetching system stats:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงสถิติระบบ' });
    }
  });

  // ===============================================
  // UTILITY ENDPOINTS - สำหรับการทดสอบและยูทิลิตี้
  // ===============================================

  /**
   * ทดสอบการส่งอีเมล
   * POST /api/approval-workflow/test-email
   */
  router.post('/test-email', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    try {
      const { email, language = 'th' } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'กรุณาระบุอีเมลสำหรับทดสอบ' });
      }

      const result = await emailService.sendTestEmail(email, language);

      res.status(200).json({
        message: result.success ? 'ส่งอีเมลทดสอบสำเร็จ' : 'ส่งอีเมลทดสอบไม่สำเร็จ',
        result: result
      });

    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการส่งอีเมลทดสอบ' });
    }
  });

  /**
   * ดึงการตั้งค่าอีเมล
   * GET /api/approval-workflow/email-config
   */
  router.get('/email-config', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    try {
      const config = emailService.getEmailConfiguration();
      const connectionStatus = await emailService.verifyConnection();

      res.status(200).json({
        configuration: config,
        connectionStatus: connectionStatus,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error getting email config:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงการตั้งค่าอีเมล' });
    }
  });

  /**
   * รีเซ็ตสถานะคำขออนุมัติ (Admin only - สำหรับการทดสอบ)
   * POST /api/approval-workflow/admin/reset-request/:approval_id
   */
  router.post('/admin/reset-request/:approval_id', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const client = await pool.connect();

    try {
      const { approval_id } = req.params;
      const { reason } = req.body;

      await client.query('BEGIN');

      // รีเซ็ตสถานะคำขออนุมัติ
      await client.query(`
        UPDATE approval_requests 
        SET 
          approval_status = 'waiting_approval',
          advisor_comment = NULL,
          approved_at = NULL,
          approved_by = NULL,
          rejection_reason = NULL,
          rejected_at = NULL,
          reminder_count = 0,
          last_reminder_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [approval_id]);

      // รีเซ็ตสถานะคำขอเอกสารหลัก
      await client.query(`
        UPDATE document_requests 
        SET status = 'pending', updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT document_request_id FROM approval_requests WHERE id = $1)
      `, [approval_id]);

      // บันทึกประวัติการรีเซ็ต
      await client.query(`
        INSERT INTO approval_history 
        (approval_request_id, action, comment, created_by)
        VALUES ($1, 'reset', $2, $3)
      `, [
        approval_id,
        reason || 'รีเซ็ตสถานะคำขออนุมัติโดยผู้ดูแลระบบ',
        req.user.id
      ]);

      await client.query('COMMIT');

      res.status(200).json({
        message: 'รีเซ็ตสถานะคำขออนุมัติสำเร็จ',
        approvalId: approval_id
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error resetting approval request:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการรีเซ็ตสถานะคำขออนุมัติ' });
    } finally {
      client.release();
    }
  });

  /**
   * ดึงรายการเทมเพลตอีเมล
   * GET /api/approval-workflow/email-templates
   */
  router.get('/email-templates', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    try {
      const query = `
        SELECT 
          id, template_name, subject_th, subject_en, subject_zh,
          is_active, created_at, updated_at
        FROM email_templates
        ORDER BY template_name
      `;

      const result = await pool.query(query);

      res.status(200).json({
        templates: result.rows
      });

    } catch (error) {
      console.error('Error fetching email templates:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงเทมเพลตอีเมล' });
    }
  });

  /**
   * อัปเดตเทมเพลตอีเมล
   * PUT /api/approval-workflow/email-template/:id
   */
  router.put('/email-template/:id', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    try {
      const { id } = req.params;
      const {
        subject_th, subject_en, subject_zh,
        body_th, body_en, body_zh,
        is_active
      } = req.body;

      const updateQuery = `
        UPDATE email_templates 
        SET 
          subject_th = COALESCE($1, subject_th),
          subject_en = COALESCE($2, subject_en),
          subject_zh = COALESCE($3, subject_zh),
          body_th = COALESCE($4, body_th),
          body_en = COALESCE($5, body_en),
          body_zh = COALESCE($6, body_zh),
          is_active = COALESCE($7, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [
        subject_th, subject_en, subject_zh,
        body_th, body_en, body_zh,
        is_active, id
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบเทมเพลตอีเมลที่ระบุ' });
      }

      res.status(200).json({
        message: 'อัปเดตเทมเพลตอีเมลสำเร็จ',
        template: result.rows[0]
      });

    } catch (error) {
      console.error('Error updating email template:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตเทมเพลตอีเมล' });
    }
  });

  // ===============================================
  // ERROR HANDLING & LOGGING
  // ===============================================

  /**
   * Global error handler สำหรับ approval workflow routes
   */
  router.use((error, req, res, next) => {
    console.error('Approval Workflow API Error:', {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      user: req.user?.id,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    res.status(500).json({
      message: 'เกิดข้อผิดพลาดในระบบ approval workflow',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  });

  return router;
};
