// ===============================================
// Advisor Authentication & Authorization Middleware
// ===============================================
// ไฟล์: middleware/advisor.js
// วันที่สร้าง: 30 กรกฎาคม 2025
// วัตถุประสงค์: ตรวจสอบสิทธิ์การเข้าถึงสำหรับอาจารย์ที่ปรึกษา

const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Middleware ตรวจสอบว่าผู้ใช้เป็นอาจารย์ที่ปรึกษาหรือไม่
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isAdvisor = async (req, res, next) => {
  try {
    console.log('🔍 Checking advisor role for user:', req.user?.id);
    
    // ตรวจสอบว่ามี user object จาก authenticateJWT middleware หรือไม่
    if (!req.user) {
      console.log('❌ No user object found in request');
      return res.status(401).json({ 
        message: 'ไม่มีการยืนยันตัวตน',
        error: 'USER_NOT_AUTHENTICATED' 
      });
    }

    // ตรวจสอบ role พื้นฐาน
    const userRole = req.user.role;
    console.log('👤 User role:', userRole);

    // Admin สามารถทำงานของ advisor ได้ (สำหรับการจัดการระบบ)
    if (userRole === 'admin') {
      console.log('✅ Admin access granted to advisor functions');
      req.advisorAccess = {
        type: 'admin',
        canAccessAll: true,
        facultyId: null
      };
      return next();
    }

    // ตรวจสอบว่าเป็น advisor หรือไม่
    if (userRole !== 'advisor' && !req.user.is_advisor) {
      console.log('❌ User is not an advisor, role:', userRole, 'is_advisor:', req.user.is_advisor);
      return res.status(403).json({ 
        message: 'ไม่มีสิทธิ์เข้าถึง - ต้องเป็นอาจารย์ที่ปรึกษา',
        error: 'ADVISOR_ACCESS_DENIED' 
      });
    }

    // ตรวจสอบข้อมูลอาจารย์ที่ปรึกษาในฐานข้อมูล
    const pool = req.app.locals.pool || req.pool;
    if (!pool) {
      console.error('❌ Database pool not available');
      return res.status(500).json({ 
        message: 'เกิดข้อผิดพลาดภายในระบบ',
        error: 'DB_POOL_NOT_AVAILABLE' 
      });
    }

    // ค้นหาข้อมูลอาจารย์ที่ปรึกษา
    const advisorQuery = `
      SELECT 
        fa.id as advisor_id,
        fa.faculty_id,
        fa.advisor_name,
        fa.advisor_email,
        fa.is_active,
        f.name_th as faculty_name_th,
        f.name_en as faculty_name_en,
        u.id as user_id,
        u.full_name,
        u.email
      FROM faculty_advisors fa
      JOIN faculties f ON fa.faculty_id = f.id
      LEFT JOIN users u ON (u.email = fa.advisor_email AND u.is_advisor = true)
      WHERE fa.advisor_email = $1 AND fa.is_active = true
    `;

    const advisorResult = await pool.query(advisorQuery, [req.user.email]);
    console.log('🔍 Advisor query result:', advisorResult.rows.length, 'records found');

    if (advisorResult.rows.length === 0) {
      console.log('❌ Advisor not found in faculty_advisors table for email:', req.user.email);
      return res.status(403).json({ 
        message: 'ไม่พบข้อมูลอาจารย์ที่ปรึกษา กรุณาติดต่อผู้ดูแลระบบ',
        error: 'ADVISOR_NOT_FOUND' 
      });
    }

    const advisorData = advisorResult.rows[0];

    // ตรวจสอบสถานะการใช้งาน
    if (!advisorData.is_active) {
      console.log('❌ Advisor account is inactive');
      return res.status(403).json({ 
        message: 'บัญชีอาจารย์ที่ปรึกษาถูกระงับการใช้งาน',
        error: 'ADVISOR_ACCOUNT_INACTIVE' 
      });
    }

    // เพิ่มข้อมูลอาจารย์ที่ปรึกษาใน request object
    req.advisorAccess = {
      type: 'advisor',
      canAccessAll: false,
      advisorId: advisorData.advisor_id,
      facultyId: advisorData.faculty_id,
      facultyName: {
        th: advisorData.faculty_name_th,
        en: advisorData.faculty_name_en
      },
      advisorName: advisorData.advisor_name,
      advisorEmail: advisorData.advisor_email
    };

    console.log('✅ Advisor access granted for faculty:', advisorData.faculty_name_th);
    next();

  } catch (error) {
    console.error('❌ Error in isAdvisor middleware:', error);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์',
      error: 'ADVISOR_AUTH_ERROR' 
    });
  }
};

/**
 * Middleware ตรวจสอบว่าอาจารย์มีสิทธิ์เข้าถึงคำขออนุมัติเฉพาะรายการหรือไม่
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next function
 */
const canAccessApprovalRequest = async (req, res, next) => {
  try {
    const { approval_id, request_id } = req.params;
    const requestId = approval_id || request_id;

    if (!requestId) {
      return res.status(400).json({ 
        message: 'ไม่พบรหัสคำขออนุมัติ',
        error: 'MISSING_REQUEST_ID' 
      });
    }

    // Admin สามารถเข้าถึงได้ทั้งหมด
    if (req.advisorAccess?.type === 'admin') {
      console.log('✅ Admin can access all approval requests');
      return next();
    }

    const pool = req.app.locals.pool || req.pool;
    if (!pool) {
      return res.status(500).json({ 
        message: 'เกิดข้อผิดพลาดภายในระบบ',
        error: 'DB_POOL_NOT_AVAILABLE' 
      });
    }

    // ตรวจสอบว่าคำขออนุมัตินี้เป็นของคณะที่อาจารย์ดูแลหรือไม่
    const accessQuery = `
      SELECT 
        ar.id,
        ar.faculty_id,
        ar.advisor_id,
        ar.approval_status,
        u.full_name as student_name,
        u.student_id,
        f.name_th as faculty_name
      FROM approval_requests ar
      JOIN users u ON ar.student_id = u.id
      JOIN faculties f ON ar.faculty_id = f.id
      WHERE ar.id = $1
    `;

    const result = await pool.query(accessQuery, [requestId]);

    if (result.rows.length === 0) {
      console.log('❌ Approval request not found:', requestId);
      return res.status(404).json({ 
        message: 'ไม่พบคำขออนุมัติที่ระบุ',
        error: 'APPROVAL_REQUEST_NOT_FOUND' 
      });
    }

    const requestData = result.rows[0];

    // ตรวจสอบว่าคำขออนุมัติเป็นของคณะที่อาจารย์ดูแลหรือไม่
    if (requestData.faculty_id !== req.advisorAccess.facultyId) {
      console.log('❌ Advisor cannot access request from different faculty');
      console.log('Request faculty ID:', requestData.faculty_id);
      console.log('Advisor faculty ID:', req.advisorAccess.facultyId);
      
      return res.status(403).json({ 
        message: 'ไม่มีสิทธิ์เข้าถึงคำขออนุมัติจากคณะอื่น',
        error: 'CROSS_FACULTY_ACCESS_DENIED' 
      });
    }

    // เพิ่มข้อมูลคำขออนุมัติใน request object
    req.approvalRequestData = requestData;

    console.log('✅ Advisor can access approval request:', requestId);
    next();

  } catch (error) {
    console.error('❌ Error in canAccessApprovalRequest middleware:', error);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์เข้าถึงคำขออนุมัติ',
      error: 'ACCESS_CHECK_ERROR' 
    });
  }
};

/**
 * Middleware ตรวจสอบว่าคำขออนุมัติยังสามารถแก้ไขได้หรือไม่
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const canModifyApprovalRequest = (req, res, next) => {
  try {
    // Admin สามารถแก้ไขได้เสมอ
    if (req.advisorAccess?.type === 'admin') {
      console.log('✅ Admin can modify any approval request');
      return next();
    }

    // ตรวจสอบสถานะคำขออนุมัติ
    const requestData = req.approvalRequestData;
    if (!requestData) {
      return res.status(400).json({ 
        message: 'ไม่พบข้อมูลคำขออนุมัติ',
        error: 'APPROVAL_REQUEST_DATA_MISSING' 
      });
    }

    const currentStatus = requestData.approval_status;
    const modifiableStatuses = ['waiting_approval'];

    if (!modifiableStatuses.includes(currentStatus)) {
      console.log('❌ Cannot modify approval request with status:', currentStatus);
      return res.status(400).json({ 
        message: `ไม่สามารถแก้ไขคำขออนุมัติที่มีสถานะ "${currentStatus}" ได้`,
        error: 'APPROVAL_REQUEST_NOT_MODIFIABLE',
        currentStatus: currentStatus
      });
    }

    console.log('✅ Approval request can be modified');
    next();

  } catch (error) {
    console.error('❌ Error in canModifyApprovalRequest middleware:', error);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์แก้ไข',
      error: 'MODIFY_CHECK_ERROR' 
    });
  }
};

/**
 * Middleware เพิ่มข้อมูล Pool ให้กับ request (helper)
 * @param {Object} pool - Database pool
 */
const addPoolToRequest = (pool) => {
  return (req, res, next) => {
    req.pool = pool;
    req.app.locals.pool = pool;
    next();
  };
};

/**
 * Middleware สำหรับ log การเข้าถึงของ advisor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const logAdvisorAccess = (req, res, next) => {
  if (req.advisorAccess) {
    console.log(`📝 Advisor Access Log:`, {
      timestamp: new Date().toISOString(),
      advisorEmail: req.advisorAccess.advisorEmail,
      facultyId: req.advisorAccess.facultyId,
      action: `${req.method} ${req.originalUrl}`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    });
  }
  next();
};

/**
 * Helper function สำหรับตรวจสอบว่า user เป็น advisor ของคณะที่ระบุหรือไม่
 * @param {Object} pool - Database pool
 * @param {string} userEmail - อีเมลของผู้ใช้
 * @param {number} facultyId - ID ของคณะ
 * @returns {Promise<boolean>} - true หาก user เป็น advisor ของคณะนั้น
 */
const isAdvisorOfFaculty = async (pool, userEmail, facultyId) => {
  try {
    const query = `
      SELECT id FROM faculty_advisors 
      WHERE advisor_email = $1 AND faculty_id = $2 AND is_active = true
    `;
    const result = await pool.query(query, [userEmail, facultyId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking advisor faculty:', error);
    return false;
  }
};

/**
 * Helper function สำหรับดึงข้อมูลอาจารย์ที่ปรึกษาจากอีเมล
 * @param {Object} pool - Database pool
 * @param {string} advisorEmail - อีเมลอาจารย์ที่ปรึกษา
 * @returns {Promise<Object|null>} - ข้อมูลอาจารย์หรือ null
 */
const getAdvisorByEmail = async (pool, advisorEmail) => {
  try {
    const query = `
      SELECT 
        fa.*,
        f.name_th as faculty_name_th,
        f.name_en as faculty_name_en
      FROM faculty_advisors fa
      JOIN faculties f ON fa.faculty_id = f.id
      WHERE fa.advisor_email = $1 AND fa.is_active = true
    `;
    const result = await pool.query(query, [advisorEmail]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting advisor by email:', error);
    return null;
  }
};

/**
 * Middleware สำหรับดึงรายการคำขออนุมัติที่อาจารย์สามารถเข้าถึงได้
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const getAdvisorApprovalRequests = async (req, res, next) => {
  try {
    const pool = req.app.locals.pool || req.pool;
    
    // Admin สามารถดูทั้งหมด
    if (req.advisorAccess?.type === 'admin') {
      req.advisorRequests = { canViewAll: true, facultyFilter: null };
      return next();
    }

    // Advisor ดูได้เฉพาะคณะตัวเอง
    req.advisorRequests = { 
      canViewAll: false, 
      facultyFilter: req.advisorAccess.facultyId 
    };
    
    next();

  } catch (error) {
    console.error('❌ Error in getAdvisorApprovalRequests middleware:', error);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการดึงรายการคำขออนุมัติ',
      error: 'GET_REQUESTS_ERROR' 
    });
  }
};

module.exports = {
  isAdvisor,
  canAccessApprovalRequest,
  canModifyApprovalRequest,
  addPoolToRequest,
  logAdvisorAccess,
  getAdvisorApprovalRequests,
  
  // Helper functions
  isAdvisorOfFaculty,
  getAdvisorByEmail
};
