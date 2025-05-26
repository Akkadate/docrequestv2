// ตัวแปรสำหรับ Pagination
let currentPage = 1;
let pageSize = 10;
let totalRecords = 0;
let totalPages = 0;
let currentSearchQuery = '';
let currentStatusFilter = '';

// ตรวจสอบว่าเป็นผู้ดูแลระบบหรือไม่
document.addEventListener('DOMContentLoaded', () => {
  console.log('Admin requests page loaded');
  checkAdmin();
  loadAllRequests();
  setupFilters();
  setupStatusUpdateModal();
  setupPagination();
});

// ตั้งค่าการกรองและค้นหา
function setupFilters() {
  // เพิ่มการฟังเหตุการณ์สำหรับการกรองตามสถานะ
  const statusFilter = document.getElementById('status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      currentPage = 1; // รีเซ็ตกลับไปหน้าแรก
      const searchQuery = document.getElementById('search-input')?.value || '';
      const statusFilter = document.getElementById('status-filter')?.value || '';
      currentSearchQuery = searchQuery;
      currentStatusFilter = statusFilter;
      loadAllRequests(searchQuery, statusFilter, currentPage, pageSize);
    });
  }
  
  // เพิ่มการฟังเหตุการณ์สำหรับการค้นหา
  const searchButton = document.getElementById('search-button');
  if (searchButton) {
    searchButton.addEventListener('click', () => {
      currentPage = 1; // รีเซ็ตกลับไปหน้าแรก
      const searchQuery = document.getElementById('search-input')?.value || '';
      const statusFilter = document.getElementById('status-filter')?.value || '';
      currentSearchQuery = searchQuery;
      currentStatusFilter = statusFilter;
      loadAllRequests(searchQuery, statusFilter, currentPage, pageSize);
    });
  }
  
  // ฟังเหตุการณ์เมื่อกด Enter ในช่องค้นหา
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        currentPage = 1; // รีเซ็ตกลับไปหน้าแรก
        const searchQuery = document.getElementById('search-input')?.value || '';
        const statusFilter = document.getElementById('status-filter')?.value || '';
        currentSearchQuery = searchQuery;
        currentStatusFilter = statusFilter;
        loadAllRequests(searchQuery, statusFilter, currentPage, pageSize);
      }
    });
  }
}

// ตั้งค่า Pagination
function setupPagination() {
  // เพิ่มการฟังเหตุการณ์สำหรับการเปลี่ยนจำนวนรายการต่อหน้า
  const pageSizeSelect = document.getElementById('page-size-select');
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', () => {
      pageSize = parseInt(pageSizeSelect.value);
      currentPage = 1; // รีเซ็ตกลับไปหน้าแรก
      loadAllRequests(currentSearchQuery, currentStatusFilter, currentPage, pageSize);
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
async function loadAllRequests(searchQuery = '', statusFilter = '', page = 1, limit = 10) {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    console.log('Loading all requests...');
    console.log('Search query:', searchQuery);
    console.log('Status filter:', statusFilter);
    console.log('Page:', page);
    console.log('Limit:', limit);
    
    let url = `/api/admin/requests?lang=${currentLang || 'th'}&page=${page}&limit=${limit}`;
    
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
    
    const result = await response.json();
    console.log('API Response:', result);
    
    // อัปเดตตัวแปร pagination
    totalRecords = result.total || 0;
    totalPages = result.totalPages || 0;
    currentPage = result.currentPage || page;
    
    console.log('Pagination info:', {
      totalRecords,
      totalPages,
      currentPage,
      pageSize: limit
    });
    
    // แสดงข้อมูลคำขอ
    displayAllRequests(result.requests || []);
    
    // อัปเดต pagination UI
    updatePaginationUI();
    
    // อัปเดตข้อมูลสถิติ
    updateResultsInfo();
    
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

// อัปเดต Pagination UI
function updatePaginationUI() {
  const paginationContainer = document.getElementById('pagination-container');
  
  if (!paginationContainer) {
    console.error('Pagination container not found');
    return;
  }
  
  paginationContainer.innerHTML = '';
  
  if (totalPages <= 1) {
    return; // ไม่แสดง pagination ถ้ามีหน้าเดียว
  }
  
  // ปุ่ม Previous
  const prevButton = createPaginationButton('‹', currentPage - 1, currentPage === 1);
  paginationContainer.appendChild(prevButton);
  
  // คำนวณหน้าที่จะแสดง
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);
  
  // ปรับให้แสดง 5 หน้าเสมอ (ถ้าเป็นไปได้)
  if (endPage - startPage < 4) {
    if (startPage === 1) {
      endPage = Math.min(totalPages, startPage + 4);
    } else if (endPage === totalPages) {
      startPage = Math.max(1, endPage - 4);
    }
  }
  
  // แสดงหน้าแรก + ... ถ้าจำเป็น
  if (startPage > 1) {
    const firstButton = createPaginationButton('1', 1, false);
    paginationContainer.appendChild(firstButton);
    
    if (startPage > 2) {
      const dotsButton = createPaginationButton('...', null, true);
      paginationContainer.appendChild(dotsButton);
    }
  }
  
  // แสดงหน้าตามช่วงที่คำนวณ
  for (let i = startPage; i <= endPage; i++) {
    const pageButton = createPaginationButton(i.toString(), i, false, i === currentPage);
    paginationContainer.appendChild(pageButton);
  }
  
  // แสดงหน้าสุดท้าย + ... ถ้าจำเป็น
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dotsButton = createPaginationButton('...', null, true);
      paginationContainer.appendChild(dotsButton);
    }
    
    const lastButton = createPaginationButton(totalPages.toString(), totalPages, false);
    paginationContainer.appendChild(lastButton);
  }
  
  // ปุ่ม Next
  const nextButton = createPaginationButton('›', currentPage + 1, currentPage === totalPages);
  paginationContainer.appendChild(nextButton);
}

// สร้างปุ่ม Pagination
function createPaginationButton(text, page, disabled = false, active = false) {
  const li = document.createElement('li');
  li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
  
  const a = document.createElement('a');
  a.className = 'page-link';
  a.href = '#';
  a.textContent = text;
  
  if (!disabled && page !== null) {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (page !== currentPage) {
        currentPage = page;
        loadAllRequests(currentSearchQuery, currentStatusFilter, currentPage, pageSize);
      }
    });
  }
  
  li.appendChild(a);
  return li;
}

// อัปเดตข้อมูลสถิติ
function updateResultsInfo() {
  const resultsCount = document.getElementById('results-count');
  const paginationInfo = document.getElementById('pagination-info');
  
  if (resultsCount) {
    resultsCount.textContent = `พบ ${totalRecords} รายการ`;
  }
  
  if (paginationInfo) {
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalRecords);
    
    if (totalRecords === 0) {
      paginationInfo.textContent = 'แสดง 0 ถึง 0 จาก 0 รายการ';
    } else {
      paginationInfo.textContent = `แสดง ${start} ถึง ${end} จาก ${totalRecords} รายการ`;
    }
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
      
      // โหลดข้อมูลใหม่ (คงหน้าปัจจุบัน)
      loadAllRequests(currentSearchQuery, currentStatusFilter, currentPage, pageSize);
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
