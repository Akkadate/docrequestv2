# Document Request System - Project Overview

## 📋 Project Information

**Project Name:** ระบบขอเอกสารออนไลน์ - เพิ่มฟีเจอร์การอนุมัติ  
**Client:** มหาวิทยาลัยนอร์ทกรุงเทพ  
**Start Date:** July 30, 2025  
**Tech Stack:** Node.js, Express, PostgreSQL, Vanilla JavaScript, Bootstrap  
**GitHub:** https://github.com/Akkadate/document-request-system  

## 🎯 Project Objectives

เพิ่มฟีเจอร์การอนุมัติเอกสารประเภทใหม่ที่ต้องได้รับการอนุมัติจากอาจารย์ที่ปรึกษาก่อนส่งไปยังแผนกทะเบียน

### เอกสารประเภทใหม่:
1. **เอกสารขออนุมัติลงทะเบียนเกินกำหนด**
2. **เอกสารขออนุมัติเพิ่มถอนรายวิชา**

### Workflow ใหม่:
```
นักศึกษายื่นขอ → ส่งอีเมลแจ้งอาจารย์ที่ปรึกษา → อาจารย์ login อนุมัติ → ส่งต่อแผนกทะเบียน
```

## 🏗️ Current System Architecture

### Database Tables (Existing):
- `users` - ข้อมูลผู้ใช้งาน (roles: student, admin)
- `faculties` - ข้อมูลคณะ (5 คณะ)
- `document_types` - ประเภทเอกสาร (11 ประเภท)
- `document_requests` - คำขอเอกสาร
- `document_request_items` - รายการเอกสารย่อย
- `status_history` - ประวัติการเปลี่ยนสถานะ

### API Endpoints (Existing):
- `/api/auth/*` - Authentication
- `/api/documents/*` - Document management  
- `/api/admin/*` - Admin functions
- `/api/reports/*` - Reports

### Current Roles:
- `student` - นักศึกษา
- `admin` - ผู้ดูแลระบบ

### Current Document Statuses:
- `pending` - รอดำเนินการ
- `processing` - กำลังดำเนินการ
- `ready` - พร้อมจัดส่ง/รับเอกสาร  
- `completed` - เสร็จสิ้น
- `rejected` - ถูกปฏิเสธ

## 🆕 New Features to Implement

### 1. Database Extensions
- Add table: `faculty_advisors` - ข้อมูลอีเมลอาจารย์ที่ปรึกษาแต่ละคณะ
- Add table: `approval_requests` - คำขอที่ต้องการการอนุมัติ
- Add role: `advisor` - อาจารย์ที่ปรึกษา
- Add new document types for approval workflow
- Add new statuses: `waiting_approval`, `approved_by_advisor`, `rejected_by_advisor`

### 2. Backend Services
- **Email Service** - ส่งอีเมลแจ้งอาจารย์ที่ปรึกษา
- **Approval Workflow API** - จัดการกระบวนการอนุมัติ
- **Advisor API** - สำหรับอาจารย์เข้าไปอนุมัติ/ปฏิเสธ
- **Faculty Management API** - จัดการข้อมูลอาจารย์ที่ปรึกษา

### 3. Frontend Components
- **Approval Request Form** - ฟอร์มขอเอกสารแบบต้องอนุมัติ
- **Advisor Dashboard** - หน้า Dashboard สำหรับอาจารย์
- **Faculty Management Page** - หน้าจัดการข้อมูลคณะและอาจารย์ (Admin)
- **Enhanced Status Tracking** - แสดงสถานะการอนุมัติ

## 👥 User Roles & Permissions

### Student (นักศึกษา)
- ยื่นขอเอกสารทั่วไป (เดิม)
- ยื่นขอเอกสารที่ต้องอนุมัติ (ใหม่)
- ติดตามสถานะการอนุมัติ (ใหม่)

### Advisor (อาจารย์ที่ปรึกษา) - ใหม่
- รับอีเมลแจ้งเตือนคำขอใหม่
- เข้าสู่ระบบเพื่ออนุมัติ/ปฏิเสธ
- ดูประวัติการอนุมัติ
- เพิ่มความคิดเห็น/หมายเหตุ

### Admin (ผู้ดูแลระบบ)
- จัดการข้อมูลอาจารย์ที่ปรึกษาแต่ละคณะ (ใหม่)
- ดูสถิติการอนุมัติ (ใหม่)
- จัดการเอกสารประเภทใหม่ (ใหม่)
- ฟีเจอร์เดิมทั้งหมด

## 🎨 UI/UX Considerations

### Multi-language Support:
- Thai (ไทย)
- English (English)  
- Chinese (中文)

### Responsive Design:
- Mobile-first approach
- Bootstrap 5 framework
- Custom CSS with modern animations

### Accessibility:
- ARIA labels
- Keyboard navigation
- High contrast colors

## 🔧 Technical Specifications

### Environment:
- **Backend:** Node.js 18+, Express.js
- **Database:** PostgreSQL 13+
- **Frontend:** Vanilla JavaScript, Bootstrap 5
- **Email:** Nodemailer (SMTP)
- **Authentication:** JWT tokens
- **File Upload:** Multer
- **Notifications:** LINE Bot SDK (existing)

### Development Standards:
- RESTful API design
- MVC architecture pattern
- Database transactions for data integrity
- Input validation and sanitization
- Error handling and logging
- Responsive design principles

## 📁 Project Structure

```
document-request-system/
├── server.js                 # Main server file
├── package.json              # Dependencies
├── .env                      # Environment variables
├── database/
│   └── schema.sql           # Database schema
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── documents.js         # Document routes
│   ├── admin.js             # Admin routes
│   ├── reports.js           # Report routes
│   ├── advisors.js          # NEW: Advisor routes
│   └── approval-workflow.js # NEW: Approval workflow
├── middleware/
│   ├── auth.js              # JWT middleware
│   ├── admin.js             # Admin check
│   └── advisor.js           # NEW: Advisor check
├── services/
│   ├── lineNotification.js  # LINE notifications
│   └── emailService.js      # NEW: Email service
└── public/
    ├── index.html           # Main page
    ├── request.html         # Document request
    ├── status.html          # Status checking
    ├── approval-request.html # NEW: Approval request
    ├── advisor-dashboard.html # NEW: Advisor dashboard
    ├── js/
    ├── css/
    └── locales/
```

## 🚀 Implementation Strategy

### Phase 1: Database & Backend Foundation
1. Create new database tables
2. Add email service
3. Implement approval workflow API
4. Add advisor authentication

### Phase 2: Frontend Development  
1. Create approval request form
2. Build advisor dashboard
3. Add faculty management interface
4. Update existing status tracking

### Phase 3: Integration & Testing
1. Connect approval workflow
2. Test email notifications
3. Validate user permissions
4. Cross-browser testing

### Phase 4: Documentation & Deployment
1. Update API documentation
2. Create user guides
3. Performance optimization
4. Production deployment

## 📊 Success Metrics

- ✅ New document types integrated seamlessly
- ✅ Email notifications working properly  
- ✅ Advisor approval workflow functional
- ✅ Existing functionality unaffected
- ✅ Multi-language support maintained
- ✅ Responsive design preserved
- ✅ Security standards maintained

## ⚠️ Risk Mitigation

### Technical Risks:
- **Database Migration:** Use IF NOT EXISTS for new tables
- **API Compatibility:** Create new endpoints, don't modify existing
- **Frontend Integration:** Add new pages, minimize changes to existing

### Business Risks:
- **User Training:** Provide clear documentation
- **Change Management:** Gradual rollout of new features
- **Data Backup:** Full backup before implementation

## 📞 Contact Information

**Developer:** Claude (Anthropic AI)  
**Project Start:** July 30, 2025  
**Last Updated:** July 30, 2025
