// สร้างไฟล์นี้เพื่อหา Group ID สำหรับระบบขอเอกสาร

const express = require('express');
const line = require('@line/bot-sdk');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const app = express();

console.log('🤖 LINE Bot Configuration:');
console.log('Channel ID:', process.env.LINE_CHANNEL_ID);
console.log('Access Token:', process.env.LINE_CHANNEL_ACCESS_TOKEN ? 'Set ✅' : 'Not Set ❌');
console.log('Channel Secret:', process.env.LINE_CHANNEL_SECRET ? 'Set ✅' : 'Not Set ❌');

// Webhook สำหรับหา Group ID
app.post('/webhook/find-group', line.middleware(config), (req, res) => {
  const events = req.body.events;
  
  console.log('\n=== 📨 LINE Event Received ===');
  console.log('Events count:', events.length);
  
  events.forEach((event, index) => {
    console.log(`\n--- Event ${index + 1} ---`);
    console.log('Event Type:', event.type);
    console.log('Source Type:', event.source.type);
    console.log('Timestamp:', new Date(event.timestamp).toLocaleString('th-TH'));
    
    if (event.source.type === 'group') {
      console.log('\n🎯 GROUP ID FOUND!');
      console.log('Group ID:', event.source.groupId);
      console.log('\n📝 Copy this line to your .env file:');
      console.log(`LINE_GROUP_ID=${event.source.groupId}`);
      console.log('\n🔄 Then restart your server to apply changes.');
      
      if (event.type === 'message') {
        console.log('Message Text:', event.message.text);
        console.log('User ID in Group:', event.source.userId);
      }
    } else if (event.source.type === 'user') {
      console.log('\n👤 USER ID FOUND!');
      console.log('User ID:', event.source.userId);
      console.log('\n📝 If you want to use direct message instead:');
      console.log(`LINE_ADMIN_USER_ID=${event.source.userId}`);
    } else if (event.source.type === 'room') {
      console.log('\n🏠 ROOM ID FOUND!');
      console.log('Room ID:', event.source.roomId);
    }
    
    // แสดงข้อมูลเพิ่มเติม
    if (event.type === 'join') {
      console.log('🎉 Bot joined the group/room!');
    } else if (event.type === 'leave') {
      console.log('👋 Bot left the group/room!');
    }
  });
  
  console.log('================================\n');
  res.json({ status: 'success', eventsProcessed: events.length });
});

// หน้าแสดงสถานะ
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>LINE Group ID Finder - ระบบขอเอกสาร NBU</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
          .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #00C851; margin-bottom: 20px; }
          .step { margin: 15px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #00C851; }
          .code { background: #2d3748; color: #e2e8f0; padding: 10px; border-radius: 5px; font-family: monospace; }
          .warning { background: #fff3cd; border-color: #ffeaa7; color: #856404; }
          .success { background: #d4edda; border-color: #00C851; color: #155724; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔍 LINE Group ID Finder</h1>
          <h2>ระบบขอเอกสารออนไลน์ - มหาวิทยาลัยนอร์ทกรุงเทพ</h2>
          
          <div class="step warning">
            <strong>⚠️ สำคัญ:</strong> ให้แน่ใจว่าได้ตั้งค่า Webhook URL ใน LINE Developers Console แล้ว
          </div>
          
          <div class="step">
            <strong>📋 ขั้นตอนการหา Group ID:</strong>
            <ol>
              <li>ไปที่ <a href="https://developers.line.biz/" target="_blank">LINE Developers Console</a></li>
              <li>เลือก Channel ของคุณ</li>
              <li>ไปที่ Messaging API tab</li>
              <li>ตั้งค่า Webhook URL เป็น: <div class="code">https://your-domain.com/webhook/find-group</div></li>
              <li>เปิด "Use webhook" และปิด "Auto-reply messages"</li>
              <li>เพิ่ม LINE Bot เข้า Group ที่ต้องการ</li>
              <li>ส่งข้อความใดๆ ใน Group</li>
              <li>ดู Console log หรือ Terminal จะแสดง Group ID</li>
            </ol>
          </div>
          
          <div class="step success">
            <strong>✅ เมื่อได้ Group ID แล้ว:</strong><br>
            1. Copy Group ID ไปใส่ในไฟล์ .env<br>
            2. Restart server<br>
            3. ทดสอบการส่งข้อความด้วย <code>/api/test-line</code>
          </div>
          
          <div class="step">
            <strong>🔧 การตั้งค่าปัจจุบัน:</strong><br>
            Channel ID: ${process.env.LINE_CHANNEL_ID || 'ไม่ได้ตั้งค่า'}<br>
            Access Token: ${process.env.LINE_CHANNEL_ACCESS_TOKEN ? '✅ ตั้งค่าแล้ว' : '❌ ยังไม่ได้ตั้งค่า'}<br>
            Channel Secret: ${process.env.LINE_CHANNEL_SECRET ? '✅ ตั้งค่าแล้ว' : '❌ ยังไม่ได้ตั้งค่า'}<br>
            Group ID: ${process.env.LINE_GROUP_ID && process.env.LINE_GROUP_ID !== 'your_line_group_id_here' ? '✅ ตั้งค่าแล้ว' : '❌ ยังไม่ได้ตั้งค่า'}
          </div>
          
          <div class="step">
            <strong>📱 QR Code สำหรับเพิ่มเพื่อน:</strong><br>
            <a href="https://line.me/R/ti/p/${process.env.LINE_CHANNEL_ID}" target="_blank">
              เพิ่มเพื่อน LINE Bot
            </a>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Error handler
app.use((error, req, res, next) => {
  console.error('❌ Webhook Error:', error);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3201;
app.listen(PORT, () => {
  console.log('\n🔍 LINE Group ID Finder Started!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`📡 Webhook: http://localhost:${PORT}/webhook/find-group`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('1. Set Webhook URL in LINE Developers Console');
  console.log('2. Add LINE Bot to your group');
  console.log('3. Send any message in the group');
  console.log('4. Check console for Group ID');
  console.log('5. Add Group ID to .env file');
  console.log('6. Restart main server');
  console.log('');
});
