-- ตารางผู้ใช้งาน  DB_NAME=document_request_system (อัปเดต)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    faculty VARCHAR(100) NOT NULL,
    birth_date DATE,
    id_number VARCHAR(20),
    role VARCHAR(20) DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- เพิ่มคอลัมน์ใหม่ในตารางที่มีอยู่แล้ว (สำหรับระบบที่มีข้อมูลอยู่แล้ว)
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_number VARCHAR(20);

-- ตารางคณะ
CREATE TABLE faculties (
    id SERIAL PRIMARY KEY,
    name_th VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_zh VARCHAR(100) NOT NULL
);

-- ตารางประเภทเอกสาร
CREATE TABLE document_types (
    id SERIAL PRIMARY KEY,
    name_th VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_zh VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);

-- ตารางคำขอเอกสาร
CREATE TABLE document_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    document_type_id INTEGER REFERENCES document_types(id),
    delivery_method VARCHAR(50) NOT NULL,  -- 'pickup' หรือ 'mail'
    address TEXT,  -- สำหรับการจัดส่งทางไปรษณีย์
    urgent BOOLEAN DEFAULT FALSE,  -- เร่งด่วนหรือไม่
    total_price DECIMAL(10, 2) NOT NULL,
    payment_slip_url VARCHAR(255),  -- URL ของหลักฐานการชำระเงิน
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'processing', 'ready', 'completed', 'rejected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- document_request_items.sql
-- สร้างตารางสำหรับเก็บรายละเอียดรายการเอกสารในคำขอ

CREATE TABLE IF NOT EXISTS document_request_items (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES document_requests(id) ON DELETE CASCADE,
  document_type_id INTEGER REFERENCES document_types(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้าง index เพื่อความเร็วในการค้นหา
CREATE INDEX IF NOT EXISTS idx_document_request_items_request_id ON document_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_document_request_items_document_type_id ON document_request_items(document_type_id);

-- อัพเดทสถานะคำขอเอกสาร
ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS has_multiple_items BOOLEAN DEFAULT FALSE;

-- สร้าง comment เพื่ออธิบายการทำงานของตาราง
COMMENT ON TABLE document_request_items IS 'เก็บรายละเอียดรายการเอกสารในคำขอแต่ละรายการ';
COMMENT ON COLUMN document_request_items.request_id IS 'รหัสอ้างอิงคำขอหลัก';
COMMENT ON COLUMN document_request_items.document_type_id IS 'รหัสประเภทเอกสาร';
COMMENT ON COLUMN document_request_items.quantity IS 'จำนวนเอกสาร';
COMMENT ON COLUMN document_request_items.price_per_unit IS 'ราคาต่อฉบับ';
COMMENT ON COLUMN document_request_items.subtotal IS 'ราคารวมของรายการนี้';

-- สร้างตารางประวัติสถานะ
CREATE TABLE IF NOT EXISTS status_history (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES document_requests(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    note TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้าง index เพื่อความเร็วในการค้นหา
CREATE INDEX IF NOT EXISTS idx_status_history_request_id ON status_history(request_id);

-- เพิ่ม comment สำหรับคอลัมน์ใหม่
COMMENT ON COLUMN users.birth_date IS 'วันเดือนปีเกิด';
COMMENT ON COLUMN users.id_number IS 'หมายเลขบัตรประชาชนหรือ Passport';

-- เพิ่มข้อมูลคณะ
INSERT INTO faculties (name_th, name_en, name_zh) VALUES
    ('คณะบริหารธุรกิจ', 'Faculty of Business Administration', '工商管理学院'),
    ('คณะวิศวกรรมศาสตร์', 'Faculty of Engineering', '工程学院'),
    ('คณะนิติศาสตร์', 'Faculty of Law', '法学院'),
    ('คณะศิลปศาสตร์', 'Faculty of Liberal Arts', '文学院'),
    ('คณะวิทยาศาสตร์และเทคโนโลยี', 'Faculty of Science and Technology', '科学技术学院')
ON CONFLICT DO NOTHING;

-- เพิ่มข้อมูลประเภทเอกสาร
INSERT INTO document_types (name_th, name_en, name_zh, price) VALUES
    ('ใบแสดงผลการศึกษา', 'Transcript', '成绩单', 100),
    ('หนังสือรับรองการเป็นนักศึกษา', 'Student Certificate', '学生证明', 100),
    ('หนังสือรับรองคาดว่าสำเร็จการศึกษา', 'Expected Graduation Certificate', '预计毕业证明', 100),
    ('หนังสือรับรองการสำเร็จการศึกษา', 'Graduation Certificate', '毕业证明', 100),
    ('หนังสือรับรองรายวิชา', 'Course Certificate', '课程证明', 100),
    ('สำเนาใบปริญญาบัตร', 'Copy of Degree Certificate', '学位证书副本', 100),
    ('หนังสือรับรองความประพฤติ', 'Certificate of Good Conduct', '品行证明', 100),
    ('หนังสือรับรองอื่น ๆ', 'Other Certificates', '其他证明', 100)
ON CONFLICT DO NOTHING;

-- เพิ่มผู้ดูแลระบบ (อัปเดตรหัสผ่านถ้ามีอยู่แล้ว)
INSERT INTO users (student_id, password, full_name, email, phone, faculty, role) VALUES
    ('admin', '$2b$10$X9f4bQXSyxMb7sQ4b5xYG.9JcZBj5nLo8/.kG3vD8EU2TqRV0Y/EW', 'ผู้ดูแลระบบ', 'admin@nbu.ac.th', '0899999999', 'Admin', 'admin')
ON CONFLICT (student_id) DO UPDATE SET
    password = EXCLUDED.password,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    faculty = EXCLUDED.faculty,
    role = EXCLUDED.role;
