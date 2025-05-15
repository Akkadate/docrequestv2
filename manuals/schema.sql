-- ตารางผู้ใช้งาน
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    faculty VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- เพิ่มข้อมูลคณะ
INSERT INTO faculties (name_th, name_en, name_zh) VALUES
    ('คณะบริหารธุรกิจ', 'Faculty of Business Administration', '工商管理学院'),
    ('คณะวิศวกรรมศาสตร์', 'Faculty of Engineering', '工程学院'),
    ('คณะนิติศาสตร์', 'Faculty of Law', '法学院'),
    ('คณะศิลปศาสตร์', 'Faculty of Liberal Arts', '文学院'),
    ('คณะวิทยาศาสตร์และเทคโนโลยี', 'Faculty of Science and Technology', '科学技术学院');

-- เพิ่มข้อมูลประเภทเอกสาร
INSERT INTO document_types (name_th, name_en, name_zh, price) VALUES
    ('ใบแสดงผลการศึกษา', 'Transcript', '成绩单', 100),
    ('หนังสือรับรองการเป็นนักศึกษา', 'Student Certificate', '学生证明', 100),
    ('หนังสือรับรองคาดว่าสำเร็จการศึกษา', 'Expected Graduation Certificate', '预计毕业证明', 100),
    ('หนังสือรับรองการสำเร็จการศึกษา', 'Graduation Certificate', '毕业证明', 100),
    ('หนังสือรับรองรายวิชา', 'Course Certificate', '课程证明', 100),
    ('สำเนาใบปริญญาบัตร', 'Copy of Degree Certificate', '学位证书副本', 100),
    ('หนังสือรับรองความประพฤติ', 'Certificate of Good Conduct', '品行证明', 100),
    ('หนังสือรับรองอื่น ๆ', 'Other Certificates', '其他证明', 100);

-- เพิ่มผู้ดูแลระบบ
INSERT INTO users (student_id, password, full_name, email, phone, faculty, role) VALUES
    ('admin', '$2b$10$X9f4bQXSyxMb7sQ4b5xYG.9JcZBj5nLo8/.kG3vD8EU2TqRV0Y/EW', 'ผู้ดูแลระบบ', 'admin@nbu.ac.th', '0899999999', 'Admin', 'admin');
