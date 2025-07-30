-- ===============================================
-- Approval Workflow Database Schema Extension
-- ===============================================
-- วันที่สร้าง: 30 กรกฎาคม 2025
-- วัตถุประสงค์: เพิ่มระบบอนุมัติเอกสารโดยอาจารย์ที่ปรึกษา

-- 1. เพิ่มตารางข้อมูลอาจารย์ที่ปรึกษาแต่ละคณะ
CREATE TABLE IF NOT EXISTS faculty_advisors (
    id SERIAL PRIMARY KEY,
    faculty_id INTEGER REFERENCES faculties(id) ON DELETE CASCADE,
    advisor_name VARCHAR(100) NOT NULL,
    advisor_email VARCHAR(100) NOT NULL,
    advisor_phone VARCHAR(20),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    
    -- Constraints
    UNIQUE(faculty_id, advisor_email),
    CHECK (advisor_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- สร้าง index เพื่อความเร็ว
CREATE INDEX IF NOT EXISTS idx_faculty_advisors_faculty_id ON faculty_advisors(faculty_id);
CREATE INDEX IF NOT EXISTS idx_faculty_advisors_email ON faculty_advisors(advisor_email);
CREATE INDEX IF NOT EXISTS idx_faculty_advisors_active ON faculty_advisors(is_active) WHERE is_active = true;

-- Comment อธิบายตาราง
COMMENT ON TABLE faculty_advisors IS 'ข้อมูลอาจารย์ที่ปรึกษาของแต่ละคณะ';
COMMENT ON COLUMN faculty_advisors.faculty_id IS 'รหัสคณะที่อ้างอิง';
COMMENT ON COLUMN faculty_advisors.advisor_name IS 'ชื่อ-นามสกุลอาจารย์ที่ปรึกษา';
COMMENT ON COLUMN faculty_advisors.advisor_email IS 'อีเมลอาจารย์ที่ปรึกษา (สำหรับส่งการแจ้งเตือน)';
COMMENT ON COLUMN faculty_advisors.is_active IS 'สถานะการใช้งาน (true = ใช้งาน, false = ระงับ)';

-- 2. เพิ่มตารางคำขอที่ต้องการการอนุมัติ
CREATE TABLE IF NOT EXISTS approval_requests (
    id SERIAL PRIMARY KEY,
    document_request_id INTEGER REFERENCES document_requests(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    faculty_id INTEGER REFERENCES faculties(id),
    advisor_id INTEGER REFERENCES faculty_advisors(id),
    
    -- ข้อมูลคำขอ
    request_type VARCHAR(50) NOT NULL, -- 'late_registration', 'add_drop_course'
    request_title VARCHAR(200) NOT NULL,
    request_description TEXT,
    additional_documents JSONB, -- เก็บข้อมูลเอกสารแนบเพิ่มเติม
    
    -- สถานะการอนุมัติ
    approval_status VARCHAR(30) DEFAULT 'waiting_approval',
    -- 'waiting_approval', 'approved_by_advisor', 'rejected_by_advisor', 'sent_to_registry'
    
    -- ข้อมูลการอนุมัติ
    advisor_comment TEXT,
    approved_at TIMESTAMP,
    approved_by INTEGER REFERENCES users(id), -- อาจารย์ที่อนุมัติ
    rejection_reason TEXT,
    rejected_at TIMESTAMP,
    
    -- Email tracking
    email_sent_at TIMESTAMP,
    email_opened_at TIMESTAMP,
    reminder_count INTEGER DEFAULT 0,
    last_reminder_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CHECK (approval_status IN ('waiting_approval', 'approved_by_advisor', 'rejected_by_advisor', 'sent_to_registry')),
    CHECK (request_type IN ('late_registration', 'add_drop_course')),
    CHECK (
        (approval_status = 'approved_by_advisor' AND approved_at IS NOT NULL) OR 
        (approval_status != 'approved_by_advisor')
    ),
    CHECK (
        (approval_status = 'rejected_by_advisor' AND rejected_at IS NOT NULL) OR 
        (approval_status != 'rejected_by_advisor')
    )
);

-- สร้าง index เพื่อความเร็ว
CREATE INDEX IF NOT EXISTS idx_approval_requests_document_id ON approval_requests(document_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_student_id ON approval_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_advisor_id ON approval_requests(advisor_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(approval_status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_type ON approval_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_created_at ON approval_requests(created_at);

-- Comment อธิบายตาราง
COMMENT ON TABLE approval_requests IS 'คำขอเอกสารที่ต้องการการอนุมัติจากอาจารย์ที่ปรึกษา';
COMMENT ON COLUMN approval_requests.request_type IS 'ประเภทคำขอ: late_registration, add_drop_course';
COMMENT ON COLUMN approval_requests.approval_status IS 'สถานะการอนุมัติ';
COMMENT ON COLUMN approval_requests.additional_documents IS 'เอกสารแนบเพิ่มเติม (JSON format)';
COMMENT ON COLUMN approval_requests.reminder_count IS 'จำนวนครั้งที่ส่งอีเมลเตือน';

-- 3. เพิ่มตารางประวัติการอนุมัติ (Audit Trail)
CREATE TABLE IF NOT EXISTS approval_history (
    id SERIAL PRIMARY KEY,
    approval_request_id INTEGER REFERENCES approval_requests(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'email_sent', 'approved', 'rejected', 'reminder_sent'
    previous_status VARCHAR(30),
    new_status VARCHAR(30),
    comment TEXT,
    metadata JSONB, -- เก็บข้อมูลเพิ่มเติม เช่น IP address, User agent
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CHECK (action IN ('created', 'email_sent', 'approved', 'rejected', 'reminder_sent', 'updated'))
);

-- สร้าง index
CREATE INDEX IF NOT EXISTS idx_approval_history_request_id ON approval_history(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_action ON approval_history(action);
CREATE INDEX IF NOT EXISTS idx_approval_history_created_at ON approval_history(created_at);

-- Comment อธิบายตาราง
COMMENT ON TABLE approval_history IS 'ประวัติการดำเนินการทั้งหมดของคำขออนุมัติ';
COMMENT ON COLUMN approval_history.action IS 'ประเภทการดำเนินการ';
COMMENT ON COLUMN approval_history.metadata IS 'ข้อมูลเพิ่มเติม (JSON format)';

-- 4. เพิ่ม role ใหม่ในระบบ (อัปเดต enum ถ้าจำเป็น)
-- เพิ่มคอลัมน์สำหรับ advisor ใน users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS advisor_faculty_id INTEGER REFERENCES faculties(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS advisor_department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_advisor BOOLEAN DEFAULT FALSE;

-- สร้าง index
CREATE INDEX IF NOT EXISTS idx_users_advisor_faculty ON users(advisor_faculty_id) WHERE is_advisor = true;
CREATE INDEX IF NOT EXISTS idx_users_is_advisor ON users(is_advisor) WHERE is_advisor = true;

-- Comment
COMMENT ON COLUMN users.advisor_faculty_id IS 'คณะที่อาจารย์ท่านนี้สังกัด (สำหรับ advisor เท่านั้น)';
COMMENT ON COLUMN users.is_advisor IS 'เป็นอาจารย์ที่ปรึกษาหรือไม่';

-- 5. เพิ่มประเภทเอกสารใหม่ที่ต้องการการอนุมัติ
INSERT INTO document_types (name_th, name_en, name_zh, price) VALUES
    ('เอกสารขออนุมัติลงทะเบียนเกินกำหนด', 'Late Registration Approval Document', '延期注册批准文件', 150),
    ('เอกสารขออนุมัติเพิ่มถอนรายวิชา', 'Course Add/Drop Approval Document', '加退课批准文件', 150)
ON CONFLICT (name_th) DO NOTHING;

-- 6. เพิ่มสถานะใหม่สำหรับ document_requests ที่เกี่ยวข้องกับการอนุมัติ
-- ใช้สถานะเดิม แต่เพิ่มความหมายใหม่:
-- 'pending' = รอการอนุมัติจากอาจารย์ (สำหรับเอกสารที่ต้องอนุมัติ)
-- 'processing' = อนุมัติแล้ว กำลังดำเนินการโดยแผนกทะเบียน
-- สถานะอื่นใช้เหมือนเดิม

-- 7. เพิ่มตารางเทมเพลตอีเมล
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE NOT NULL,
    subject_th VARCHAR(200) NOT NULL,
    subject_en VARCHAR(200) NOT NULL,
    subject_zh VARCHAR(200) NOT NULL,
    body_th TEXT NOT NULL,
    body_en TEXT NOT NULL,
    body_zh TEXT NOT NULL,
    template_variables JSONB, -- ตัวแปรที่ใช้ในเทมเพลต
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้าง index
CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active) WHERE is_active = true;

-- Comment
COMMENT ON TABLE email_templates IS 'เทมเพลตอีเมลสำหรับส่งการแจ้งเตือน';
COMMENT ON COLUMN email_templates.template_variables IS 'รายการตัวแปรที่ใช้ในเทมเพลต (JSON format)';

-- 8. เพิ่มเทมเพลตอีเมลเริ่มต้น
INSERT INTO email_templates (template_name, subject_th, subject_en, subject_zh, body_th, body_en, body_zh, template_variables) VALUES
(
    'approval_request_notification',
    'แจ้งเตือน: มีคำขออนุมัติเอกสารใหม่จาก {{student_name}}',
    'Notification: New Document Approval Request from {{student_name}}',
    '通知：来自{{student_name}}的新文档批准请求',
    
    'เรียน อาจารย์ที่ปรึกษา

มีนักศึกษาชื่อ {{student_name}} ({{student_id}}) จากคณะ{{faculty_name}} 
ได้ยื่นคำขออนุมัติ{{request_title}}

รายละเอียดคำขอ:
{{request_description}}

กรุณาเข้าสู่ระบบเพื่อพิจารณาอนุมัติที่ลิงก์ด้านล่าง:
{{approval_link}}

หากท่านมีข้อสงสัย กรุณาติดต่อแผนกทะเบียนและประมวลผล

ขอบคุณครับ/ค่ะ
ระบบขอเอกสารออนไลน์
มหาวิทยาลัยนอร์ทกรุงเทพ',

    'Dear Advisor,

Student {{student_name}} ({{student_id}}) from Faculty of {{faculty_name}} 
has submitted an approval request for {{request_title}}.

Request Details:
{{request_description}}

Please login to review and approve at the following link:
{{approval_link}}

If you have any questions, please contact the Registrar Office.

Best regards,
Online Document Request System
North Bangkok University',

    '尊敬的指导老师：

来自{{faculty_name}}的学生{{student_name}}（{{student_id}}）
已提交{{request_title}}的批准申请。

申请详情：
{{request_description}}

请通过以下链接登录系统进行审核：
{{approval_link}}

如有疑问，请联系注册处。

此致
敬礼

在线文档申请系统
北曼谷大学',

    '{"student_name": "ชื่อนักศึกษา", "student_id": "รหัสนักศึกษา", "faculty_name": "ชื่อคณะ", "request_title": "ชื่อคำขอ", "request_description": "รายละเอียดคำขอ", "approval_link": "ลิงก์อนุมัติ"}'
),
(
    'approval_reminder',
    'เตือน: คำขออนุมัติเอกสารจาก {{student_name}} (ครั้งที่ {{reminder_count}})',
    'Reminder: Document Approval Request from {{student_name}} (Attempt {{reminder_count}})',
    '提醒：来自{{student_name}}的文档批准申请（第{{reminder_count}}次）',
    
    'เรียน อาจารย์ที่ปรึกษา

นี่เป็นการเตือนครั้งที่ {{reminder_count}} สำหรับคำขออนุมัติเอกสารจาก
นักศึกษา {{student_name}} ({{student_id}}) 

คำขอ: {{request_title}}
ยื่นเมื่อ: {{created_date}}

กรุณาเข้าสู่ระบบเพื่อพิจารณาอนุมัติ:
{{approval_link}}

ขอบคุณครับ/ค่ะ',

    'Dear Advisor,

This is reminder #{{reminder_count}} for the document approval request from
Student {{student_name}} ({{student_id}})

Request: {{request_title}}
Submitted: {{created_date}}

Please login to review and approve:
{{approval_link}}

Best regards',

    '尊敬的指导老师：

这是第{{reminder_count}}次提醒，关于学生{{student_name}}（{{student_id}}）的文档批准申请

申请：{{request_title}}
提交时间：{{created_date}}

请登录系统进行审核：
{{approval_link}}

此致敬礼',

    '{"student_name": "ชื่อนักศึกษา", "student_id": "รหัสนักศึกษา", "request_title": "ชื่อคำขอ", "created_date": "วันที่ยื่นคำขอ", "reminder_count": "ครั้งที่เตือน", "approval_link": "ลิงก์อนุมัติ"}'
)
ON CONFLICT (template_name) DO NOTHING;

-- 9. เพิ่มข้อมูลอาจารย์ที่ปรึกษาตัวอย่าง (สำหรับการทดสอบ)
INSERT INTO faculty_advisors (faculty_id, advisor_name, advisor_email, advisor_phone, department, is_active, created_by) VALUES
    (1, 'ผศ.ดร.สมชาย วิชาการ', 'somchai.business@nbu.ac.th', '02-555-0001', 'ภาควิชาการจัดการ', true, 1),
    (2, 'รศ.ดร.สมหญิง เทคโนโลยี', 'somying.engineer@nbu.ac.th', '02-555-0002', 'ภาควิชาวิศวกรรมคอมพิวเตอร์', true, 1),
    (3, 'ผศ.ดร.วิรัตน์ กฎหมาย', 'wirat.law@nbu.ac.th', '02-555-0003', 'ภาควิชานิติศาสตร์', true, 1),
    (4, 'อ.ดร.นิภา ศิลปกรรม', 'nipha.liberal@nbu.ac.th', '02-555-0004', 'ภาควิชาภาษาไทย', true, 1),
    (5, 'ผศ.ดร.ประชาต วิทยาศาสตร์', 'prachat.science@nbu.ac.th', '02-555-0005', 'ภาควิชาวิทยาการคอมพิวเตอร์', true, 1)
ON CONFLICT (faculty_id, advisor_email) DO NOTHING;

-- 10. สร้าง Function สำหรับอัปเดต updated_at อัตโนมัติ
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- สร้าง Trigger สำหรับตารางที่ต้องการ
DROP TRIGGER IF EXISTS update_faculty_advisors_updated_at ON faculty_advisors;
CREATE TRIGGER update_faculty_advisors_updated_at 
    BEFORE UPDATE ON faculty_advisors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_approval_requests_updated_at ON approval_requests;
CREATE TRIGGER update_approval_requests_updated_at 
    BEFORE UPDATE ON approval_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. สร้าง View สำหรับดูข้อมูลรวม
CREATE OR REPLACE VIEW approval_requests_view AS
SELECT 
    ar.id,
    ar.document_request_id,
    ar.request_type,
    ar.request_title,
    ar.approval_status,
    ar.created_at,
    ar.approved_at,
    ar.rejected_at,
    
    -- ข้อมูลนักศึกษา
    u.student_id,
    u.full_name as student_name,
    u.email as student_email,
    
    -- ข้อมูลคณะ
    f.name_th as faculty_name_th,
    f.name_en as faculty_name_en,
    
    -- ข้อมูลอาจารย์ที่ปรึกษา
    fa.advisor_name,
    fa.advisor_email,
    
    -- ข้อมูลคำขอเอกสาร
    dr.total_price,
    dr.delivery_method,
    dr.status as document_status
    
FROM approval_requests ar
LEFT JOIN users u ON ar.student_id = u.id
LEFT JOIN faculties f ON ar.faculty_id = f.id
LEFT JOIN faculty_advisors fa ON ar.advisor_id = fa.id
LEFT JOIN document_requests dr ON ar.document_request_id = dr.id;

-- Comment สำหรับ View
COMMENT ON VIEW approval_requests_view IS 'View สำหรับดูข้อมูลคำขออนุมัติพร้อมรายละเอียดที่เกี่ยวข้อง';

-- 12. เพิ่มข้อมูล Constraint เพิ่มเติม
-- เพิ่ม constraint เพื่อป้องกันการมี approval_request หลายรายการสำหรับ document_request เดียว
ALTER TABLE approval_requests ADD CONSTRAINT unique_document_request_approval 
    UNIQUE (document_request_id);

-- เพิ่ม constraint เพื่อให้แน่ใจว่า student อยู่ในคณะเดียวกับ advisor
-- (จะเพิ่มใน business logic แทน เพื่อความยืดหยุ่น)

-- ===============================================
-- สิ้นสุดการสร้าง Schema
-- ===============================================

-- การตรวจสอบ Schema ที่สร้าง
SELECT 'Schema creation completed successfully!' as status;

-- แสดงจำนวน record ในตารางใหม่
SELECT 
    'faculty_advisors' as table_name, 
    COUNT(*) as record_count 
FROM faculty_advisors
UNION ALL
SELECT 
    'approval_requests' as table_name, 
    COUNT(*) as record_count 
FROM approval_requests
UNION ALL
SELECT 
    'email_templates' as table_name, 
    COUNT(*) as record_count 
FROM email_templates;
