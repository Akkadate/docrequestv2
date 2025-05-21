// ตรวจสอบว่าเป็นผู้ดูแลระบบหรือไม่
document.addEventListener('DOMContentLoaded', () => {
  console.log('Admin requests page loaded');
  checkAdmin();
  loadAllRequests();
  setupFilters();
  setupStatusUpdateModal();
});

// ตั้งค่าการกรองและค้นหา
function setupFilters() {
  // เพิ่มการฟังเหตุการณ์สำหรับการกรองตามสถานะ
  const statusFilter = document.getElementById('status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      const searchQuery = document.getElementById('search-input')?.value || '';
      const statusFilter = document.getElementById('status-filter')?.value || '';
      loadAllRequests(searchQuery, statusFilter);
    });
  }
  
  // เพิ่มการฟังเหตุการณ์สำหรับการค้นหา
  const searchButton = document.getElementById('search-button');
  if (searchButton) {
    searchButton.addEventListener('click', () => {
      const searchQuery = document.getElementById('search-input')?.value || '';
      const statusFilter = document.getElementById('status-filter')?.value || '';
      loadAllRequests(searchQuery, statusFilter);
    });
  }
  
  // ฟังเหตุการณ์เมื่อกด Enter ในช่องค้นหา
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const searchQuery = document.getElementById('search-input')?.value || '';
        const statusFilter = document.getElementById('status-filter')?.value || '';
        loadAllRequests(searchQuery, statusFilter);
      }
    });
  }
}

// ตั้งค่า Modal อัปเดตสถานะ
function setupStatusUpdateModal() {
  const updateStatusButton = document.getElementById('update-status-button');
  
  if (updateStatusButton) {
    updateStatusButton.addEventListener('click', updateRequestStatus);
  }
}

// โหลดข้อมูลคำขอทั้งหมด
async function loadAllRequests(searchQuery = '', statusFilter = '') {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    console.log('Loading all requests...');
    console.log('Search query:', searchQuery);
    console.log('Status filter:', statusFilter);
    
    let url = `/api/admin/requests?lang=${currentLang || 'th'}`;
    
    // ถ้ามีการกรองตามสถานะ
    if (statusFilter) {
      url += `&status=${statusFilter}`;
    }
    
    // ถ้ามีการค้นหา
    if (searchQuery) {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }
    
    console.log('API URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error('Failed to load requests');
    }
    
    const requests = await response.json();
    console.log('Requests loaded:', requests.length);
    
    displayAllRequests(requests);
  } catch (error) {
    console.error('Error loading all requests:', error);
    const alertContainer = document.getElementById('alert-container');
    if (alertContainer) {
      alertContainer.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
          เกิดข้อผิดพลาดในการโหลดข้อมูลคำขอเอกสาร
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
      `;
    }
  }
}

// แสดงข้อมูลคำขอทั้งหมด
function displayAllRequests(requests) {
  const requestsTable = document.getElementById('requests-table');
  
  if (!requestsTable) {
    console.error('Requests table element not found');
    return;
  }
  
  requestsTable.innerHTML = '';
  
  if (requests.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="8" class="text-center">ไม่พบคำขอเอกสารที่ตรงกับเงื่อนไข</td>
    `;
    requestsTable.appendChild(emptyRow);
    return;
  }
  
  requests.forEach(request => {
    try {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td data-label="รหัสคำขอ">${request.id}</td>
        <td data-label="ชื่อนักศึกษา">${request.full_name || '-'}</td>
        <td data-label="รหัสนักศึกษา">${request.student_id || '-'}</td>
        <td data-label="ประเภทเอกสาร">${request.document_name || '-'}</td>
        <td data-label="วันที่ขอ">${formatDate(request.created_at) || '-'}</td>
        <td data-label="วิธีการรับ">
          ${request.delivery_method === 'pickup' ? 
            'รับด้วยตนเอง' : 
            'รับทางไปรษณีย์'}
          ${request.urgent ? '<span class="badge bg-warning text-dark ms-2">เร่งด่วน</span>' : ''}
        </td>
        <td data-label="สถานะ">${createStatusBadge(request.status)}</td>
        <td data-label="การดำเนินการ">
          <div class="btn-group">
            <a href="request-detail.html?id=${request.id}" class="btn btn-sm btn-primary">
              <i class="bi bi-eye"></i> ดูรายละเอียด
            </a>
            <button class="btn btn-sm btn-success update-status" data-id="${request.id}" data-status="${request.status}" data-bs-toggle="modal" data-bs-target="#updateStatusModal">
              <i class="bi bi-pencil"></i> อัปเดตสถานะ
            </button>
          </div>
        </td>
      `;
      
      requestsTable.appendChild(row);
      
      // เพิ่มการฟังเหตุการณ์สำหรับปุ่มอัปเดตสถานะ
      const updateStatusButton = row.querySelector('.update-status');
      if (updateStatusButton) {
        updateStatusButton.addEventListener('click', () => {
          const requestId = updateStatusButton.getAttribute('data-id');
          const currentStatus = updateStatusButton.getAttribute('data-status');
          
          const requestIdInput = document.getElementById('request-id');
          const statusSelect = document.getElementById('status');
          
          if (requestIdInput) requestIdInput.value = requestId;
          if (statusSelect) statusSelect.value = currentStatus;
        });
      }
    } catch (err) {
      console.error('Error displaying request row:', err);
    }
  });
}

// อัปเดตสถานะคำขอเอกสาร
async function updateRequestStatus() {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    const requestId = document.getElementById('request-id').value;
    const status = document.getElementById('status').value;
    const note = document.getElementById('status-note')?.value || '';
    
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
      if (modal) modal.hide();
      
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
      const searchQuery = document.getElementById('search-input')?.value || '';
      const statusFilter = document.getElementById('status-filter')?.value || '';
      loadAllRequests(searchQuery, statusFilter);
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
    minute: '2-digit',
    timeZone: 'Asia/Bangkok' // เพิ่มบรรทัดนี้
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
