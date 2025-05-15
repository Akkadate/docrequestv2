const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/auth');
const isAdmin = require('../middleware/admin');

module.exports = (pool) => {
  // รายงานสรุปรายการขอเอกสาร
  router.get('/summary', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const { start_date, end_date } = req.query;
      
      // คำนวณจำนวนคำขอเอกสารทั้งหมด
      const totalRequests = await pool.query(
        'SELECT COUNT(*) FROM document_requests WHERE created_at BETWEEN $1 AND $2',
        [start_date || '1900-01-01', end_date || '2999-12-31']
      );
      
      // จำนวนคำขอเอกสารแยกตามสถานะ
      const requestsByStatus = await pool.query(
        'SELECT status, COUNT(*) FROM document_requests WHERE created_at BETWEEN $1 AND $2 GROUP BY status',
        [start_date || '1900-01-01', end_date || '2999-12-31']
      );
      
      // จำนวนคำขอเอกสารแยกตามประเภทเอกสาร
      const requestsByType = await pool.query(
        `SELECT dt.name_th, COUNT(*) 
        FROM document_requests dr
        JOIN document_types dt ON dr.document_type_id = dt.id
        WHERE dr.created_at BETWEEN $1 AND $2
        GROUP BY dt.name_th`,
        [start_date || '1900-01-01', end_date || '2999-12-31']
      );
      
      // รายได้ทั้งหมด
      const totalRevenue = await pool.query(
        'SELECT SUM(total_price) FROM document_requests WHERE created_at BETWEEN $1 AND $2',
        [start_date || '1900-01-01', end_date || '2999-12-31']
      );
      
      res.status(200).json({
        totalRequests: parseInt(totalRequests.rows[0].count),
        requestsByStatus: requestsByStatus.rows,
        requestsByType: requestsByType.rows,
        totalRevenue: parseFloat(totalRevenue.rows[0].sum || 0)
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน' });
    }
  });
  
  // รายงานคำขอเอกสารรายเดือน
  router.get('/monthly', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const { year } = req.query;
      const currentYear = year || new Date().getFullYear();
      
      const monthlyReport = await pool.query(
        `SELECT 
          TO_CHAR(created_at, 'MM') as month,
          COUNT(*) as request_count,
          SUM(total_price) as revenue
        FROM document_requests
        WHERE EXTRACT(YEAR FROM created_at) = $1
        GROUP BY month
        ORDER BY month`,
        [currentYear]
      );
      
      res.status(200).json(monthlyReport.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงานรายเดือน' });
    }
  });
  
  return router;
};
