// สร้างไฟล์นี้เพื่อหา Group ID

const express = require('express');
const line = require('@line/bot-sdk');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const app = express();

// Webhook สำหรับหา Group ID
app.post('/webhook/find-group', line.middleware(config), (req, res) => {
  const events = req.body.events;
  
  events.forEach(event => {
    console.log('=== LINE Event ===');
    console.log('Event Type:', event.type);
    console.log('Source Type:', event.source.type);
    
    if (event.source.type === 'group') {
      console.log('🎯 GROUP ID FOUND:', event.source.groupId);
      console.log('📝 Add this to your .env file:');
      console.log(`LINE_GROUP_ID=${event.source.groupId}`);
    } else if (event.source.type === 'user') {
      console.log('👤 USER ID:', event.source.userId);
      console.log('📝 Add this to your .env file:');
      console.log(`LINE_ADMIN_USER_ID=${event.source.userId}`);
    }
    
    console.log('==================');
  });
  
  res.json({ status: 'success' });
});

// วิธีการใช้งาน:
// 1. รันไฟล์นี้: node utils/findGroupId.js
// 2. ใช้ ngrok หรือ tool อื่นเพื่อ expose localhost
// 3. ตั้งค่า Webhook URL ใน LINE Developers Console
// 4. เพิ่ม LINE Bot เข้า Group และส่งข้อความ
// 5. ดู Console จะแสดง Group ID

const PORT = process.env.PORT || 3201;
app.listen(PORT, () => {
  console.log(`🔍 Group ID Finder running on port ${PORT}`);
  console.log('📋 Steps to find Group ID:');
  console.log('1. Set Webhook URL in LINE Developers Console');
  console.log('2. Add LINE Bot to your group');
  console.log('3. Send any message in the group');
  console.log('4. Check console for Group ID');
});
