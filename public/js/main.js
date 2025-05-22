// ตรวจสอบสถานะการล็อกอินและอัปเดตเมนู
function checkAuthStatus() {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  
  const guestMenuItems = document.querySelectorAll('.guest-menu');
  const userMenuItems = document.querySelectorAll('.user-menu');
  const adminMenuItems = document.querySelectorAll('.admin-menu');
  
  if (token) {
    // ผู้ใช้ล็อกอินแล้ว
    guestMenuItems.forEach(item => item.style.display = 'none');
    userMenuItems.forEach(item => item.style.display = 'block');
    
    // ตรวจสอบว่าเป็นผู้ดูแลระบบหรือไม่
    if (userRole === 'admin') {
      adminMenuItems.forEach(item => item.style.display = 'block');
    } else {
      adminMenuItems.forEach(item => item.style.display = 'none');
    }
  } else {
    // ยังไม่ได้ล็อกอิน
    guestMenuItems.forEach(item => item.style.display = 'block');
    userMenuItems.forEach(item => item.style.display = 'none');
    adminMenuItems.forEach(item => item.style.display = 'none');
  }
}

// ออกจากระบบ
function logout() {
  localStorage.removeItem('studentId');
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  localStorage.removeItem('userRole');
  
  window.location.href = '/index.html';
}

// แปลงสถานะเป็นข้อความภาษาไทย
function translateStatus(status, lang = 'th') {
  const statusTranslations = {
    'pending': {
      'th': 'รอดำเนินการ',
      'en': 'Pending',
      'zh': '待处理'
    },
    'processing': {
      'th': 'กำลังดำเนินการ',
      'en': 'Processing',
      'zh': '处理中'
    },
    'ready': {
      'th': 'พร้อมจัดส่ง/รับเอกสาร',
      'en': 'Ready',
      'zh': '准备好了'
    },
    'completed': {
      'th': 'เสร็จสิ้น',
      'en': 'Completed',
      'zh': '已完成'
    },
    'rejected': {
      'th': 'ถูกปฏิเสธ',
      'en': 'Rejected',
      'zh': '被拒绝'
    }
  };
  
  return statusTranslations[status]?.[lang] || status;
}

// สร้าง badge สำหรับแสดงสถานะ
function createStatusBadge(status) {
  const statusClass = `status-${status}`;
  const statusText = translateStatus(status, currentLang);
  
  return `<span class="status-badge ${statusClass}">${statusText}</span>`;
}

// แปลงวันที่เป็นรูปแบบที่อ่านง่าย
function formatDate(dateString, lang = 'th') {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok' // เพิ่มบรรทัดนี้
  };
  
  const locales = {
    'th': 'th-TH',
    'en': 'en-US',
    'zh': 'zh-CN'
  };
  
  return date.toLocaleDateString(locales[lang] || 'th-TH', options);
}

// รับ locale ตามภาษา
function getLocale(lang) {
  const locales = {
    'th': 'th-TH',
    'en': 'en-US',
    'zh': 'zh-CN'
  };
  
  return locales[lang] || 'th-TH';
}

// แปลงตัวเลขเป็นรูปแบบเงิน
function formatCurrency(amount, lang = 'th') {
  const currencies = {
    'th': 'THB',
    'en': 'THB',
    'zh': 'THB'
  };
  
  const formatter = new Intl.NumberFormat(getLocale(lang), {
    style: 'currency',
    currency: currencies[lang],
    minimumFractionDigits: 2
  });
  
  return formatter.format(amount);
}

// เพิ่มการฟังเหตุการณ์คลิกปุ่มออกจากระบบ
function setupLogoutButton() {
  const logoutButton = document.getElementById('logout');
  
  if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
}

// ตรวจสอบว่าผู้ใช้ล็อกอินแล้วหรือยัง
function checkLogin() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    window.location.href = '/login.html';
  }
}

// ตรวจสอบว่าผู้ใช้เป็นผู้ดูแลระบบหรือไม่
function checkAdmin() {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  
  if (!token || userRole !== 'admin') {
    window.location.href = '/login.html';
  }
}

// แสดงข้อความแจ้งเตือน
function showAlert(message, type = 'success') {
  const alertContainer = document.getElementById('alert-container');
  
  if (!alertContainer) {
    return;
  }
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.role = 'alert';
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  alertContainer.innerHTML = '';
  alertContainer.appendChild(alert);
  
  // ซ่อนข้อความแจ้งเตือนหลังจาก 5 วินาที
  setTimeout(() => {
    const alertElement = document.querySelector('.alert');
    if (alertElement) {
      alertElement.remove();
    }
  }, 5000);
}

// เพิ่มการฟังเหตุการณ์เมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
  setupLogoutButton();
});
