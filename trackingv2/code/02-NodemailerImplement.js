// ===============================================
// Email Service for Approval Workflow
// ===============================================
// ไฟล์: services/emailService.js
// วันที่สร้าง: 30 กรกฎาคม 2025
// วัตถุประสงค์: จัดการการส่งอีเมลแจ้งเตือนอาจารย์ที่ปรึกษา

const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Email Service Class
 * จัดการการส่งอีเมลทั้งหมดในระบบ
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  /**
   * ตั้งค่า Email Transporter
   */
  initializeTransporter() {
    try {
      // ตรวจสอบการตั้งค่า Environment Variables
      const requiredEnvVars = [
        'EMAIL_HOST',
        'EMAIL_PORT', 
        'EMAIL_USER',
        'EMAIL_PASSWORD'
      ];

      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.warn(`⚠️ Email service not configured. Missing environment variables: ${missingVars.join(', ')}`);
        console.warn('📧 Email notifications will be disabled.');
        return;
      }

      // สร้าง Transporter
      this.transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true สำหรับ 465, false สำหรับ ports อื่น
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
        // ตั้งค่าเพิ่มเติมสำหรับ Gmail
        ...(process.env.EMAIL_HOST.includes('gmail') && {
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD, // ใช้ App Password สำหรับ Gmail
          }
        })
      });

      this.isConfigured = true;
      console.log('✅ Email service configured successfully');

      // ทดสอบการเชื่อมต่อ
      this.verifyConnection();

    } catch (error) {
      console.error('❌ Failed to configure email service:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * ทดสอบการเชื่อมต่อกับ Email Server
   */
  async verifyConnection() {
    if (!this.isConfigured) {
      return { success: false, message: 'Email service not configured' };
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email server connection verified');
      return { success: true, message: 'Email connection verified' };
    } catch (error) {
      console.error('❌ Email server connection failed:', error.message);
      this.isConfigured = false;
      return { success: false, message: error.message };
    }
  }

  /**
   * ส่งอีเมลแจ้งเตือนคำขออนุมัติใหม่
   * @param {Object} requestData - ข้อมูลคำขอ
   * @param {Object} advisorData - ข้อมูลอาจารย์ที่ปรึกษา
   * @param {Object} templateData - ข้อมูลเทมเพลต
   * @param {string} language - ภาษา (th, en, zh)
   */
  async sendApprovalNotification(requestData, advisorData, templateData, language = 'th') {
    if (!this.isConfigured) {
      console.warn('📧 Email service not configured - skipping notification');
      return { success: false, message: 'Email service not configured' };
    }

    try {
      // เตรียมข้อมูลสำหรับเทมเพลต
      const templateVars = {
        student_name: requestData.studentName,
        student_id: requestData.studentId,
        faculty_name: requestData.facultyName,
        request_title: requestData.requestTitle,
        request_description: requestData.requestDescription || 'ไม่มีรายละเอียดเพิ่มเติม',
        approval_link: this.generateApprovalLink(requestData.approvalRequestId),
        created_date: this.formatDate(requestData.createdAt, language),
        university_name: 'มหาวิทยาลัยนอร์ทกรุงเทพ'
      };

      // เลือกเทมเพลตตามภาษา
      const subject = this.replaceTemplateVars(templateData[`subject_${language}`], templateVars);
      const htmlBody = this.replaceTemplateVars(templateData[`body_${language}`], templateVars);
      const textBody = this.stripHtml(htmlBody);

      // ตั้งค่าอีเมล
      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'ระบบขอเอกสารออนไลน์ NBU',
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER
        },
        to: advisorData.advisor_email,
        subject: subject,
        text: textBody,
        html: this.createHtmlEmail(htmlBody, templateVars),
        headers: {
          'X-Priority': '1', // High priority
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      };

      // ส่งอีเมล
      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`✅ Approval notification sent to ${advisorData.advisor_email}`);
      console.log(`📧 Message ID: ${result.messageId}`);

      return {
        success: true,
        messageId: result.messageId,
        recipient: advisorData.advisor_email,
        subject: subject
      };

    } catch (error) {
      console.error('❌ Failed to send approval notification:', error.message);
      return {
        success: false,
        error: error.message,
        recipient: advisorData.advisor_email
      };
    }
  }

  /**
   * ส่งอีเมลเตือนสำหรับคำขอที่ยังไม่ได้รับการอนุมัติ
   * @param {Object} requestData - ข้อมูลคำขอ
   * @param {Object} advisorData - ข้อมูลอาจารย์ที่ปรึกษา
   * @param {Object} templateData - ข้อมูลเทมเพลต
   * @param {number} reminderCount - จำนวนครั้งที่เตือน
   * @param {string} language - ภาษา
   */
  async sendApprovalReminder(requestData, advisorData, templateData, reminderCount, language = 'th') {
    if (!this.isConfigured) {
      console.warn('📧 Email service not configured - skipping reminder');
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const templateVars = {
        student_name: requestData.studentName,
        student_id: requestData.studentId,
        faculty_name: requestData.facultyName,
        request_title: requestData.requestTitle,
        approval_link: this.generateApprovalLink(requestData.approvalRequestId),
        created_date: this.formatDate(requestData.createdAt, language),
        reminder_count: reminderCount.toString(),
        days_pending: this.calculateDaysPending(requestData.createdAt)
      };

      const subject = this.replaceTemplateVars(templateData[`subject_${language}`], templateVars);
      const htmlBody = this.replaceTemplateVars(templateData[`body_${language}`], templateVars);

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'ระบบขอเอกสารออนไลน์ NBU',
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER
        },
        to: advisorData.advisor_email,
        subject: subject,
        text: this.stripHtml(htmlBody),
        html: this.createHtmlEmail(htmlBody, templateVars),
        headers: {
          'X-Priority': '2', // Normal priority for reminders
          'X-MSMail-Priority': 'Normal'
        }
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`🔔 Reminder #${reminderCount} sent to ${advisorData.advisor_email}`);

      return {
        success: true,
        messageId: result.messageId,
        recipient: advisorData.advisor_email,
        reminderCount: reminderCount
      };

    } catch (error) {
      console.error('❌ Failed to send reminder:', error.message);
      return {
        success: false,
        error: error.message,
        recipient: advisorData.advisor_email
      };
    }
  }

  /**
   * ส่งอีเมลแจ้งผลการอนุมัติให้นักศึกษา
   * @param {Object} requestData - ข้อมูลคำขอ
   * @param {Object} studentData - ข้อมูลนักศึกษา
   * @param {string} approvalStatus - สถานะการอนุมัติ
   * @param {string} comment - ความคิดเห็นจากอาจารย์
   * @param {string} language - ภาษา
   */
  async sendApprovalResult(requestData, studentData, approvalStatus, comment = '', language = 'th') {
    if (!this.isConfigured) {
      console.warn('📧 Email service not configured - skipping result notification');
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const isApproved = approvalStatus === 'approved_by_advisor';
      const statusTexts = {
        th: isApproved ? 'อนุมัติ' : 'ปฏิเสธ',
        en: isApproved ? 'Approved' : 'Rejected',
        zh: isApproved ? '批准' : '拒绝'
      };

      const subjects = {
        th: `แจ้งผลการพิจารณา: คำขอ${requestData.requestTitle} - ${statusTexts.th}`,
        en: `Approval Result: ${requestData.requestTitle} - ${statusTexts.en}`,
        zh: `审批结果：${requestData.requestTitle} - ${statusTexts.zh}`
      };

      const templateVars = {
        student_name: studentData.full_name,
        request_title: requestData.requestTitle,
        approval_status: statusTexts[language],
        advisor_comment: comment || (language === 'th' ? 'ไม่มีความคิดเห็นเพิ่มเติม' : 'No additional comments'),
        status_date: this.formatDate(new Date(), language),
        next_steps: isApproved ? 
          (language === 'th' ? 'คำขอของคุณจะถูกส่งต่อไปยังแผนกทะเบียนเพื่อดำเนินการต่อ' : 
           language === 'en' ? 'Your request will be forwarded to the Registrar Office for further processing' :
           '您的申请将转发给注册处进行进一步处理') :
          (language === 'th' ? 'กรุณาติดต่อแผนกทะเบียนหรืออาจารย์ที่ปรึกษาเพื่อขอคำปรึกษา' :
           language === 'en' ? 'Please contact the Registrar Office or your advisor for consultation' :
           '请联系注册处或您的指导老师进行咨询')
      };

      const body = this.createApprovalResultBody(templateVars, language);

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'ระบบขอเอกสารออนไลน์ NBU',
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER
        },
        to: studentData.email,
        subject: subjects[language],
        text: this.stripHtml(body),
        html: this.createHtmlEmail(body, templateVars),
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`📬 Approval result sent to ${studentData.email}: ${statusTexts.th}`);

      return {
        success: true,
        messageId: result.messageId,
        recipient: studentData.email,
        approvalStatus: approvalStatus
      };

    } catch (error) {
      console.error('❌ Failed to send approval result:', error.message);
      return {
        success: false,
        error: error.message,
        recipient: studentData.email
      };
    }
  }

  /**
   * ส่งอีเมลทดสอบระบบ
   * @param {string} recipientEmail - อีเมลผู้รับ
   * @param {string} language - ภาษา
   */
  async sendTestEmail(recipientEmail, language = 'th') {
    if (!this.isConfigured) {
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const subjects = {
        th: '🧪 ทดสอบระบบอีเมล - ระบบขอเอกสารออนไลน์',
        en: '🧪 Email System Test - Online Document Request System',
        zh: '🧪 邮件系统测试 - 在线文档申请系统'
      };

      const bodies = {
        th: `
          <h2>🧪 ทดสอบระบบอีเมลสำเร็จ!</h2>
          <p>ระบบส่งอีเมลของระบบขอเอกสารออนไลน์ทำงานปกติ</p>
          <p><strong>เวลาทดสอบ:</strong> ${this.formatDate(new Date(), 'th')}</p>
          <p><strong>เซิร์ฟเวอร์:</strong> ${process.env.EMAIL_HOST}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            มหาวิทยาลัยนอร์ทกรุงเทพ<br>
            ระบบขอเอกสารออนไลน์
          </p>
        `,
        en: `
          <h2>🧪 Email System Test Successful!</h2>
          <p>The email system for Online Document Request System is working properly</p>
          <p><strong>Test Time:</strong> ${this.formatDate(new Date(), 'en')}</p>
          <p><strong>Server:</strong> ${process.env.EMAIL_HOST}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            North Bangkok University<br>
            Online Document Request System
          </p>
        `,
        zh: `
          <h2>🧪 邮件系统测试成功！</h2>
          <p>在线文档申请系统的邮件系统工作正常</p>
          <p><strong>测试时间:</strong> ${this.formatDate(new Date(), 'zh')}</p>
          <p><strong>服务器:</strong> ${process.env.EMAIL_HOST}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            北曼谷大学<br>
            在线文档申请系统
          </p>
        `
      };

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'ระบบขอเอกสารออนไลน์ NBU',
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER
        },
        to: recipientEmail,
        subject: subjects[language],
        text: this.stripHtml(bodies[language]),
        html: this.createHtmlEmail(bodies[language], {})
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`✅ Test email sent to ${recipientEmail}`);

      return {
        success: true,
        messageId: result.messageId,
        recipient: recipientEmail
      };

    } catch (error) {
      console.error('❌ Failed to send test email:', error.message);
      return {
        success: false,
        error: error.message,
        recipient: recipientEmail
      };
    }
  }

  // ======================================
  // Helper Methods
  // ======================================

  /**
   * สร้างลิงก์สำหรับอนุมัติ
   * @param {number} approvalRequestId - ID ของคำขออนุมัติ
   */
  generateApprovalLink(approvalRequestId) {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3200';
    return `${baseUrl}/advisor-dashboard.html?approval_id=${approvalRequestId}`;
  }

  /**
   * แทนที่ตัวแปรในเทมเพลต
   * @param {string} template - เทมเพลต
   * @param {Object} variables - ตัวแปร
   */
  replaceTemplateVars(template, variables) {
    let result = template;
    
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, variables[key] || '');
    });
    
    return result;
  }

  /**
   * สร้าง HTML Email Template
   * @param {string} body - เนื้อหาอีเมล
   * @param {Object} vars - ตัวแปรเพิ่มเติม
   */
  createHtmlEmail(body, vars) {
    return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ระบบขอเอกสารออนไลน์</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f7fa;
            }
            .email-container {
                background-color: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                border-bottom: 3px solid #0d6efd;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #0d6efd;
                margin-bottom: 10px;
            }
            .university {
                color: #666;
                font-size: 14px;
            }
            .content {
                margin-bottom: 30px;
            }
            .button {
                display: inline-block;
                background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%);
                color: white !important;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin: 20px 0;
                text-align: center;
            }
            .footer {
                border-top: 1px solid #eee;
                padding-top: 20px;
                text-align: center;
                font-size: 12px;
                color: #666;
            }
            .highlight {
                background-color: #fff3cd;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #ffc107;
                margin: 20px 0;
            }
            .success {
                background-color: #d1e7dd;
                border-left-color: #198754;
            }
            .danger {
                background-color: #f8d7da;
                border-left-color: #dc3545;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <div class="logo">📄 ระบบขอเอกสารออนไลน์</div>
                <div class="university">มหาวิทยาลัยนอร์ทกรุงเทพ</div>
            </div>
            
            <div class="content">
                ${body.replace(/\n/g, '<br>')}
            </div>
            
            <div class="footer">
                <p>อีเมลนี้ถูกส่งโดยอัตโนมัติจากระบบขอเอกสารออนไลน์</p>
                <p>หากมีปัญหา กรุณาติดต่อแผนกทะเบียนและประมวลผล โทร. 02-555-2222</p>
                <p style="margin-top: 20px;">
                    <strong>มหาวิทยาลัยนอร์ทกรุงเทพ</strong><br>
                    📍 1518 ถ.ประชาราษฎร์ สาย 1 เขตบางซื่อ กรุงเทพฯ 10800<br>
                    📞 02-555-2222 | 🌐 www.nbu.ac.th
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * สร้างเนื้อหาอีเมลแจ้งผลการอนุมัติ
   * @param {Object} vars - ตัวแปร
   * @param {string} language - ภาษา
   */
  createApprovalResultBody(vars, language) {
    const templates = {
      th: `
        <h2>📋 แจ้งผลการพิจารณาคำขออนุมัติ</h2>
        
        <p>เรียน คุณ${vars.student_name}</p>
        
        <div class="highlight ${vars.approval_status === 'อนุมัติ' ? 'success' : 'danger'}">
          <h3>ผลการพิจารณา: <strong>${vars.approval_status}</strong></h3>
          <p><strong>คำขอ:</strong> ${vars.request_title}</p>
          <p><strong>วันที่ประกาศผล:</strong> ${vars.status_date}</p>
        </div>
        
        ${vars.advisor_comment !== 'ไม่มีความคิดเห็นเพิ่มเติม' ? 
          `<p><strong>ความคิดเห็นจากอาจารย์ที่ปรึกษา:</strong><br>${vars.advisor_comment}</p>` : ''}
        
        <p><strong>ขั้นตอนต่อไป:</strong><br>${vars.next_steps}</p>
        
        <a href="${process.env.APP_BASE_URL || 'http://localhost:3200'}/status.html" class="button">
          ตรวจสอบสถานะคำขอ
        </a>
        
        <p>หากมีข้อสงสัย กรุณาติดต่อแผนกทะเบียนและประมวลผล</p>
      `,
      en: `
        <h2>📋 Approval Request Result</h2>
        
        <p>Dear ${vars.student_name}</p>
        
        <div class="highlight ${vars.approval_status === 'Approved' ? 'success' : 'danger'}">
          <h3>Result: <strong>${vars.approval_status}</strong></h3>
          <p><strong>Request:</strong> ${vars.request_title}</p>
          <p><strong>Result Date:</strong> ${vars.status_date}</p>
        </div>
        
        ${vars.advisor_comment !== 'No additional comments' ? 
          `<p><strong>Advisor Comments:</strong><br>${vars.advisor_comment}</p>` : ''}
        
        <p><strong>Next Steps:</strong><br>${vars.next_steps}</p>
        
        <a href="${process.env.APP_BASE_URL || 'http://localhost:3200'}/status.html" class="button">
          Check Request Status
        </a>
        
        <p>If you have any questions, please contact the Registrar Office</p>
      `,
      zh: `
        <h2>📋 批准申请结果</h2>
        
        <p>亲爱的 ${vars.student_name}</p>
        
        <div class="highlight ${vars.approval_status === '批准' ? 'success' : 'danger'}">
          <h3>结果: <strong>${vars.approval_status}</strong></h3>
          <p><strong>申请:</strong> ${vars.request_title}</p>
          <p><strong>结果日期:</strong> ${vars.status_date}</p>
        </div>
        
        ${vars.advisor_comment !== '没有其他意见' ? 
          `<p><strong>指导老师意见:</strong><br>${vars.advisor_comment}</p>` : ''}
        
        <p><strong>下一步:</strong><br>${vars.next_steps}</p>
        
        <a href="${process.env.APP_BASE_URL || 'http://localhost:3200'}/status.html" class="button">
          查看申请状态
        </a>
        
        <p>如有疑问，请联系注册处</p>
      `
    };

    return templates[language] || templates.th;
  }

  /**
   * ลบ HTML tags ออกจากข้อความ
   * @param {string} html - HTML string
   */
  stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * จัดรูปแบบวันที่ตามภาษา
   * @param {Date|string} date - วันที่
   * @param {string} language - ภาษา
   */
  formatDate(date, language = 'th') {
    const dateObj = new Date(date);
    
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Bangkok'
    };

    const locales = {
      th: 'th-TH',
      en: 'en-US',
      zh: 'zh-CN'
    };

    return dateObj.toLocaleDateString(locales[language] || 'th-TH', options);
  }

  /**
   * คำนวณจำนวนวันที่รอการอนุมัติ
   * @param {Date|string} createdDate - วันที่สร้างคำขอ
   */
  calculateDaysPending(createdDate) {
    const created = new Date(createdDate);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * รับสถานะการตั้งค่าอีเมล
   */
  getEmailConfiguration() {
    return {
      configured: this.isConfigured,
      host: process.env.EMAIL_HOST || 'Not configured',
      port: process.env.EMAIL_PORT || 'Not configured',
      user: process.env.EMAIL_USER || 'Not configured',
      secure: process.env.EMAIL_SECURE === 'true',
      fromName: process.env.EMAIL_FROM_NAME || 'ระบบขอเอกสารออนไลน์ NBU',
      fromEmail: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'Not configured'
    };
  }
}

// Export singleton instance
const emailService = new EmailService();

module.exports = {
  EmailService,
  emailService,
  
  // Helper functions for easier import
  sendApprovalNotification: (...args) => emailService.sendApprovalNotification(...args),
  sendApprovalReminder: (...args) => emailService.sendApprovalReminder(...args),
  sendApprovalResult: (...args) => emailService.sendApprovalResult(...args),
  sendTestEmail: (...args) => emailService.sendTestEmail(...args),
  verifyConnection: () => emailService.verifyConnection(),
  getEmailConfiguration: () => emailService.getEmailConfiguration()
};
