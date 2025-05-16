// ตรวจสอบว่าเป็นผู้ดูแลระบบหรือไม่
document.addEventListener('DOMContentLoaded', () => {
  console.log('Admin page loaded');
  
  // ตรวจสอบว่ามีการเข้าสู่ระบบเป็นผู้ดูแลระบบหรือไม่
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  
  console.log('Admin page - Token:', token ? 'Token exists' : 'No token');
  console.log('Admin page - User role:', userRole);
  
  if (!token || userRole !== 'admin') {
    window.location.href = '/login.html';
    return false;
  }
  
  // ตรวจสอบว่าเป็นหน้า dashboard หรือไม่
  // โดยดูว่ามีองค์ประกอบ UI ของหน้า dashboard หรือไม่
  const isDashboardPage = 
    document.getElementById('total-requests') !== null || 
    document.getElementById('recent-requests-table') !== null;
  
  if (isDashboardPage) {
    console.log('Loading dashboard summary...');
    loadDashboardSummary();
    setupStatusUpdateModal();
  }
});

// โหลดข้อมูลสรุปสำหรับแดชบอร์ด
async function loadDashboardSummary() {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    const response = await fetch('/api/admin/dashboard-summary', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load dashboard summary');
    }
    
    const data = await response.json();
    updateDashboardUI(data);
  } catch (error) {
    console.error('Error loading dashboard summary:', error);
    const alertContainer = document.getElementById('alert-container');
    if (alertContainer) {
      alertContainer.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
          เกิดข้อผิดพลาดในการโหลดข้อมูลแดชบอร์ด
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
      `;
    }
  }
}

// อัปเดต UI ของแดชบอร์ด
function updateDashboardUI(data) {
  // ตรวจสอบว่าอิลิเมนต์มีอยู่จริงก่อนที่จะอัปเดต
  const totalRequestsElement = document.getElementById('total-requests');
  if (totalRequestsElement) {
    totalRequestsElement.textContent = data.totalRequests;
  }
  
  const pendingRequestsElement = document.getElementById('pending-requests');
  if (pendingRequestsElement) {
    pendingRequestsElement.textContent = data.pendingRequests;
  }
  
  const processingRequestsElement = document.getElementById('processing-requests');
  if (processingRequestsElement) {
    processingRequestsElement.textContent = data.processingRequests;
  }
  
  const completedRequestsElement = document.getElementById('completed-requests');
  if (completedRequestsElement) {
    completedRequestsElement.textContent = data.completedRequests;
  }
  
  // แสดงคำขอล่าสุด
  displayRecentRequests(data.recentRequests);
}

// แสดงคำขอล่าสุด
function displayRecentRequests(requests) {
  const recentRequestsTable = document.getElementById('recent-requests-table');
  
  // ตรวจสอบว่าอิลิเมนต์มีอยู่จริง
  if (!recentRequestsTable) {
    return; // ออกจากฟังก์ชันหากไม่พบตาราง
  }
  
  recentRequestsTable.innerHTML = '';
  
  if (!requests || requests.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="7" class="text-center">ไม่พบคำขอเอกสาร</td>
    `;
    recentRequestsTable.appendChild(emptyRow);
    return;
  }
  
  requests.forEach(request => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td data-label="รหัสคำขอ">${request.id}</td>
      <td data-label="ชื่อนักศึกษา">${request.full_name}</td>
      <td data-label="รหัสนักศึกษา">${request.student_id}</td>
      <td data-label="ประเภทเอกสาร">${request.document_name}</td>
      <td data-label="วันที่ขอ">${formatDate(request.created_at, 'th')}</td>
      <td data-label="สถานะ">${createStatusBadge(request.status)}</td>
      <td data-label="การดำเนินการ">
        <div class="btn-group">
          <a href="request-detail.html?id=${request.id}" class="btn btn-sm btn-primary">
            <i class="bi bi-eye"></i> ดูรายละเอียด
          </a>
          <button class="btn btn-sm btn-success update-status" data-id="${request.id}" data-bs-toggle="modal" data-bs-target="#updateStatusModal">
            <i class="bi bi-pencil"></i> อัปเดตสถานะ
          </button>
        </div>
      </td>
    `;
    
    recentRequestsTable.appendChild(row);
    
    // เพิ่มการฟังเหตุการณ์สำหรับปุ่มอัปเดตสถานะ
    const updateStatusButton = row.querySelector('.update-status');
    if (updateStatusButton) {
      updateStatusButton.addEventListener('click', () => {
        const requestIdInput = document.getElementById('request-id');
        if (requestIdInput) {
          requestIdInput.value = request.id;
        }
      });
    }
  });
}

// ตั้งค่า Modal อัปเดตสถานะ
function setupStatusUpdateModal() {
  const updateStatusButton = document.getElementById('update-status-button');
  
  if (updateStatusButton) {
    updateStatusButton.addEventListener('click', updateRequestStatus);
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
      
      // แสดงข้อความแจ้งเตือน
      const alertContainer = document.getElementById('alert-container');
      if (alertContainer) {
        alertContainer.innerHTML = `
          <div class="alert alert-success alert-dismissible fade show" role="alert">
            อัปเดตสถานะคำขอเอกสารสำเร็จ
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          </div>
        `;
      }
      
      // โหลดข้อมูลใหม่
      const isDashboardPage = document.getElementById('total-requests') !== null;
      if (isDashboardPage) {
        loadDashboardSummary();
      } else {
        // ถ้าอยู่ในหน้าอื่น (เช่น requests.html) ให้รีโหลดหน้าเว็บ
        // หรือเรียกฟังก์ชัน loadAllRequests() ถ้ามีฟังก์ชันนี้
        if (typeof loadAllRequests === 'function') {
          loadAllRequests();
        }
      }
    } else {
      // แสดงข้อความแจ้งเตือน
      const alertContainer = document.getElementById('alert-container');
      if (alertContainer) {
        alertContainer.innerHTML = `
          <div class="alert alert-danger alert-dismissible fade show" role="alert">
            ${data.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะคำขอเอกสาร'}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('Error updating request status:', error);
    const alertContainer = document.getElementById('alert-container');
    if (alertContainer) {
      alertContainer.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
          เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
      `;
    }
  }
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

// ฟังก์ชันตรวจสอบว่าเป็นผู้ดูแลระบบหรือไม่
function checkAdmin() {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  
  if (!token || userRole !== 'admin') {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}
