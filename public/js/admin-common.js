// admin-common.js - ฟังก์ชันที่ใช้ร่วมกันในทุกหน้าของ admin

// ตรวจสอบว่าเป็นผู้ดูแลระบบหรือไม่
function checkAdmin() {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  
  console.log('Admin page - Token:', token ? 'Token exists' : 'No token');
  console.log('Admin page - User role:', userRole);
  
  if (!token || userRole !== 'admin') {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

// แสดงข้อความแจ้งเตือน
function showAdminAlert(message, type = 'success') {
  const alertContainer = document.getElementById('alert-container');
  
  if (!alertContainer) {
    console.error('Alert container not found');
    return;
  }
  
  alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
  
  // ซ่อนข้อความแจ้งเตือนหลังจาก 5 วินาที
  setTimeout(() => {
    const alertElement = alertContainer.querySelector('.alert');
    if (alertElement) {
      alertElement.remove();
    }
  }, 5000);
}

// สร้าง badge แสดงสถานะ
function createStatusBadge(status) {
  const statusClass = `status-${status}`;
  const statusText = translateStatus(status, 'th');
  
  return `<span class="status-badge ${statusClass}">${statusText}</span>`;
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

// แปลงวันที่เป็นรูปแบบที่อ่านง่าย
function formatDate(dateString, lang = 'th') {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  const locales = {
    'th': 'th-TH',
    'en': 'en-US',
    'zh': 'zh-CN'
  };
  
  try {
    return date.toLocaleDateString(locales[lang] || 'th-TH', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

// อัปเดตสถานะคำขอเอกสาร
async function updateRequestStatus() {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    const requestIdInput = document.getElementById('request-id');
    const statusSelect = document.getElementById('status');
    const statusNoteInput = document.getElementById('status-note');
    
    if (!requestIdInput || !statusSelect) {
      console.error('Required form elements not found');
      return;
    }
    
    const requestId = requestIdInput.value;
    const status = statusSelect.value;
    const note = statusNoteInput ? statusNoteInput.value : '';
    
    console.log('Updating request status:', requestId, status, note);
    
    const response = await fetch(`/api/admin/request/${requestId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status, note })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // ปิด Modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('updateStatusModal'));
      if (modal) {
        modal.hide();
      }
      
      showAdminAlert('อัปเดตสถานะคำขอเอกสารสำเร็จ', 'success');
      
      // รีโหลดข้อมูล - จะถูกจัดการโดยหน้าแต่ละหน้า
      if (window.reloadAfterStatusUpdate && typeof window.reloadAfterStatusUpdate === 'function') {
        window.reloadAfterStatusUpdate();
      }
    } else {
      showAdminAlert(data.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะคำขอเอกสาร', 'danger');
    }
  } catch (error) {
    console.error('Error updating request status:', error);
    showAdminAlert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'danger');
  }
}

// ตั้งค่า Modal อัปเดตสถานะ
function setupStatusUpdateModal() {
  const updateStatusButton = document.getElementById('update-status-button');
  
  if (updateStatusButton) {
    updateStatusButton.addEventListener('click', updateRequestStatus);
  }
}

// เมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
  // ตรวจสอบว่าเป็นผู้ดูแลระบบหรือไม่
  checkAdmin();
  
  // ตั้งค่า Modal อัปเดตสถานะ
  setupStatusUpdateModal();
});
