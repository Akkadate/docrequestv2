// ตรวจสอบว่าเป็นผู้ดูแลระบบหรือไม่
document.addEventListener('DOMContentLoaded', () => {
  checkAdmin();
  loadDashboardSummary();
  setupStatusUpdateModal();
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
    showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลแดชบอร์ด', 'danger');
  }
}

// อัปเดต UI ของแดชบอร์ด
function updateDashboardUI(data) {
  // อัปเดตจำนวนคำขอ
  document.getElementById('total-requests').textContent = data.totalRequests;
  document.getElementById('pending-requests').textContent = data.pendingRequests;
  document.getElementById('processing-requests').textContent = data.processingRequests;
  document.getElementById('completed-requests').textContent = data.completedRequests;
  
  // แสดงคำขอล่าสุด
  displayRecentRequests(data.recentRequests);
}

// แสดงคำขอล่าสุด
function displayRecentRequests(requests) {
  const recentRequestsTable = document.getElementById('recent-requests-table');
  
  if (!recentRequestsTable) {
    return;
  }
  
  recentRequestsTable.innerHTML = '';
  
  if (requests.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="7" class="text-center" data-i18n="admin.requests.noRequests">ไม่พบคำขอเอกสาร</td>
    `;
    recentRequestsTable.appendChild(emptyRow);
    return;
  }
  
  requests.forEach(request => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td data-label="${i18n[currentLang].admin.requests.requestID}">${request.id}</td>
      <td data-label="${i18n[currentLang].admin.requests.studentName}">${request.full_name}</td>
      <td data-label="${i18n[currentLang].admin.requests.studentID}">${request.student_id}</td>
      <td data-label="${i18n[currentLang].admin.requests.documentType}">${request.document_name}</td>
      <td data-label="${i18n[currentLang].admin.requests.requestDate}">${formatDate(request.created_at, currentLang)}</td>
      <td data-label="${i18n[currentLang].admin.requests.status}">${createStatusBadge(request.status)}</td>
      <td data-label="${i18n[currentLang].admin.requests.actions}">
        <div class="btn-group">
          <button class="btn btn-sm btn-primary view-details" data-id="${request.id}">
            <i class="bi bi-eye"></i> <span data-i18n="admin.requests.viewDetails">ดูรายละเอียด</span>
          </button>
          <button class="btn btn-sm btn-success update-status" data-id="${request.id}" data-bs-toggle="modal" data-bs-target="#updateStatusModal">
            <i class="bi bi-pencil"></i> <span data-i18n="admin.requests.updateStatus">อัปเดตสถานะ</span>
          </button>
        </div>
      </td>
    `;
    
    recentRequestsTable.appendChild(row);
    
    // เพิ่มการฟังเหตุการณ์สำหรับปุ่มดูรายละเอียด
    row.querySelector('.view-details').addEventListener('click', () => {
      window.location.href = `request-detail.html?id=${request.id}`;
    });
    
    // เพิ่มการฟังเหตุการณ์สำหรับปุ่มอัปเดตสถานะ
    row.querySelector('.update-status').addEventListener('click', () => {
      document.getElementById('request-id').value = request.id;
      document.getElementById('status').value = request.status;
    });
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
    
    const requestId = document.getElementById('request-id').value;
    const status = document.getElementById('status').value;
    const note = document.getElementById('status-note').value;
    
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
      showAlert(i18n[currentLang].success.updateStatus, 'success');
      
      // ปิด Modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('updateStatusModal'));
      modal.hide();
      
      // โหลดข้อมูลใหม่
      loadDashboardSummary();
    } else {
      showAlert(data.message || i18n[currentLang].errors.updateStatusFailed, 'danger');
    }
  } catch (error) {
    console.error('Error updating request status:', error);
    showAlert(i18n[currentLang].errors.serverError, 'danger');
  }
}

// โหลดข้อมูลผู้ใช้ทั้งหมด (สำหรับหน้าจัดการผู้ใช้)
async function loadUsers(searchQuery = '') {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    let url = '/api/admin/users';
    
    // ถ้ามีการค้นหา
    if (searchQuery) {
      url += `?search=${encodeURIComponent(searchQuery)}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load users');
    }
    
    const users = await response.json();
    displayUsers(users);
  } catch (error) {
    console.error('Error loading users:', error);
    showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้', 'danger');
  }
}

// แสดงข้อมูลผู้ใช้ (สำหรับหน้าจัดการผู้ใช้)
function displayUsers(users) {
  const usersTable = document.getElementById('users-table');
  
  if (!usersTable) {
    return;
  }
  
  usersTable.innerHTML = '';
  
  if (users.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="7" class="text-center" data-i18n="admin.users.noUsers">ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข</td>
    `;
    usersTable.appendChild(emptyRow);
    return;
  }
  
  users.forEach(user => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td data-label="${i18n[currentLang].admin.users.studentID}">${user.student_id}</td>
      <td data-label="${i18n[currentLang].admin.users.fullName}">${user.full_name}</td>
      <td data-label="${i18n[currentLang].admin.users.email}">${user.email}</td>
      <td data-label="${i18n[currentLang].admin.users.phone}">${user.phone}</td>
      <td data-label="${i18n[currentLang].admin.users.faculty}">${user.faculty}</td>
      <td data-label="${i18n[currentLang].admin.users.role}">
        <span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}">
          ${user.role === 'admin' ? i18n[currentLang].admin.users.admin : i18n[currentLang].admin.users.student}
        </span>
      </td>
      <td data-label="${i18n[currentLang].admin.users.joinDate}">${formatDate(user.created_at, currentLang)}</td>
      <td data-label="${i18n[currentLang].admin.users.actions}">
        <button class="btn btn-sm btn-primary view-user" data-id="${user.id}">
          <i class="bi bi-eye"></i> <span data-i18n="admin.users.viewDetails">ดูรายละเอียด</span>
        </button>
      </td>
    `;
    
    usersTable.appendChild(row);
    
    // เพิ่มการฟังเหตุการณ์สำหรับปุ่มดูรายละเอียด
    row.querySelector('.view-user').addEventListener('click', () => {
      window.location.href = `user-detail.html?id=${user.id}`;
    });
  });
}

// ฟังก์ชันสำหรับเพิ่มผู้ดูแลระบบใหม่
async function addAdmin(event) {
  event.preventDefault();
  
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    const formData = {
      student_id: document.getElementById('admin-student-id').value,
      password: document.getElementById('admin-password').value,
      confirm_password: document.getElementById('admin-confirm-password').value,
      full_name: document.getElementById('admin-full-name').value,
      email: document.getElementById('admin-email').value,
      phone: document.getElementById('admin-phone').value
    };
    
    // ตรวจสอบรหัสผ่าน
    if (formData.password !== formData.confirm_password) {
      showAlert(i18n[currentLang].errors.passwordMismatch, 'danger');
      return;
    }
    
    const response = await fetch('/api/admin/add-admin', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showAlert(i18n[currentLang].success.addAdmin, 'success');
      
      // รีเซ็ตฟอร์ม
      document.getElementById('add-admin-form').reset();
      
      // ปิด Modal (ถ้ามี)
      const modal = document.getElementById('addAdminModal');
      if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) {
          bsModal.hide();
        }
      }
      
      // โหลดข้อมูลผู้ใช้ใหม่ (ถ้าอยู่ในหน้าจัดการผู้ใช้)
      if (document.getElementById('users-table')) {
        loadUsers();
      }
    } else {
      showAlert(data.message || 'เกิดข้อผิดพลาดในการเพิ่มผู้ดูแลระบบ', 'danger');
    }
  } catch (error) {
    console.error('Error adding admin:', error);
    showAlert(i18n[currentLang].errors.serverError, 'danger');
  }
}

// โหลดข้อมูลคำขอทั้งหมด (สำหรับหน้าจัดการคำขอเอกสาร)
async function loadAllRequests(searchQuery = '', statusFilter = '') {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    let url = `/api/admin/requests?lang=${currentLang}`;
    
    // ถ้ามีการกรองตามสถานะ
    if (statusFilter) {
      url += `&status=${statusFilter}`;
    }
    
    // ถ้ามีการค้นหา
    if (searchQuery) {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load requests');
    }
    
    const requests = await response.json();
    displayAllRequests(requests);
  } catch (error) {
    console.error('Error loading all requests:', error);
    showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลคำขอเอกสาร', 'danger');
  }
}

// แสดงข้อมูลคำขอทั้งหมด (สำหรับหน้าจัดการคำขอเอกสาร)
function displayAllRequests(requests) {
  const requestsTable = document.getElementById('requests-table');
  
  if (!requestsTable) {
    return;
  }
  
  requestsTable.innerHTML = '';
  
  if (requests.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="7" class="text-center" data-i18n="admin.requests.noRequests">ไม่พบคำขอเอกสารที่ตรงกับเงื่อนไข</td>
    `;
    requestsTable.appendChild(emptyRow);
    return;
  }
  
  requests.forEach(request => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td data-label="${i18n[currentLang].admin.requests.requestID}">${request.id}</td>
      <td data-label="${i18n[currentLang].admin.requests.studentName}">${request.full_name}</td>
      <td data-label="${i18n[currentLang].admin.requests.studentID}">${request.student_id}</td>
      <td data-label="${i18n[currentLang].admin.requests.documentType}">${request.document_name}</td>
      <td data-label="${i18n[currentLang].admin.requests.requestDate}">${formatDate(request.created_at, currentLang)}</td>
      <td data-label="${i18n[currentLang].admin.requests.deliveryMethod}">
        ${request.delivery_method === 'pickup' ? 
          `<span data-i18n="request.pickup">${i18n[currentLang].request.pickup}</span>` : 
          `<span data-i18n="request.mail">${i18n[currentLang].request.mail}</span>`}
        ${request.urgent ? `<span class="badge bg-warning text-dark ms-2" data-i18n="request.urgentLabel">${i18n[currentLang].request.urgentLabel}</span>` : ''}
      </td>
      <td data-label="${i18n[currentLang].admin.requests.status}">${createStatusBadge(request.status)}</td>
      <td data-label="${i18n[currentLang].admin.requests.actions}">
        <div class="btn-group">
          <button class="btn btn-sm btn-primary view-details" data-id="${request.id}">
            <i class="bi bi-eye"></i> <span data-i18n="admin.requests.viewDetails">ดูรายละเอียด</span>
          </button>
          <button class="btn btn-sm btn-success update-status" data-id="${request.id}" data-bs-toggle="modal" data-bs-target="#updateStatusModal">
            <i class="bi bi-pencil"></i> <span data-i18n="admin.requests.updateStatus">อัปเดตสถานะ</span>
          </button>
        </div>
      </td>
    `;
    
    requestsTable.appendChild(row);
    
    // เพิ่มการฟังเหตุการณ์สำหรับปุ่มดูรายละเอียด
    row.querySelector('.view-details').addEventListener('click', () => {
      window.location.href = `request-detail.html?id=${request.id}`;
    });
    
    // เพิ่มการฟังเหตุการณ์สำหรับปุ่มอัปเดตสถานะ
    row.querySelector('.update-status').addEventListener('click', () => {
      document.getElementById('request-id').value = request.id;
      document.getElementById('status').value = request.status;
    });
  });
}
