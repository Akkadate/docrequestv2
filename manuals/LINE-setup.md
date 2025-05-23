## สรุปสิ่งที่ต้องทำ:
### 1. ติดตั้ง dependencies
```
npm install @line/bot-sdk
```
### 2. อัปเดตไฟล์ที่มีอยู่แล้ว:

- routes/documents.js - เพิ่ม LINE notification เมื่อมีคำขอใหม่
- package.json - เพิ่ม @line/bot-sdk
- server.js - เพิ่ม endpoint ทดสอบ
- .env - ใส่ LINE_GROUP_ID

### 3. หา LINE Group ID:
```
# รันไฟล์หา Group ID
node utils/findGroupId.js
```
### 4. ทดสอบระบบ:
```
# ทดสอบส่งข้อความ
curl http://localhost:3200/api/test-line

# ดูการตั้งค่า
curl http://localhost:3200/api/line-config
```
### 5. การทำงาน:
เมื่อนักศึกษาส่งคำขอเอกสารใหม่ (ทั้งแบบเดี่ยวและหลายรายการ) ระบบจะส่งข้อความแจ้งเตือนไปยัง LINE Group โดยอัตโนมัติ โดยข้อความจะมี:

- รหัสคำขอ
- ชื่อนักศึกษา และรหัสนักศึกษา
- ประเภทเอกสาร
- วิธีการรับเอกสาร
- ยอดเงินรวม
- เวลาที่ส่งคำขอ
สถานะเร่งด่วน (ถ้ามี)
