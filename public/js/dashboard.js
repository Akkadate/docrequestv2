// โหลดข้อมูลคำขอล่าสุด
async function loadRecentRequests() {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    const response = await fetch(`/api/documents/my-requests?lang=${currentLang}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load requests');
    }
    
    const requests = await response.json();
    
    // อัปเดตจำนวนคำขอ
    updateRequestCounts(requests);
    
    // แสดงคำขอล่าสุด (5 รายการ)
    displayRecentRequests(requests.slice(0, 5));
  } catch (error) {
    console.error('Error loading recent requests:', error);
    showAlert(i18n[currentLang].errors.loadingRequestsFailed, 'danger');
  }
}

// อัปเดตจำนวนคำขอ
function updateRequestCounts(requests) {
  const totalRequests = requests.length;
  const completedRequests = requests.filter(request => request.status === 'completed').length;
  const processingRequests = requests.filter(request => request.status === 'processing' || request.status === 'ready').length;
  const pendingRequests = requests.filter(request => request.status === 'pending').length;
  
  document.getElementById('total-requests').textContent = totalRequests;
  document.getElementById('completed-requests').textContent = completedRequests;
  document.getElementById('processing-requests').textContent = processingRequests;
  document.getElementById('pending-requests').textContent = pendingRequests;
}

// แสดงคำขอล่าสุด
function displayRecentRequests(requests) {
  const recentRequestsTable = document.getElementById('recent-requests-table');
  
  recentRequestsTable.innerHTML = '';
  
  if (requests.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="6" class="text-center" data-i18n="dashboard.noRequests">ไม่มีคำขอเอกสาร</td>
    `;
    recentRequestsTable.appendChild(emptyRow);
    return;
  }
  
  requests.forEach(request => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td data-label="${i18n[currentLang].dashboard.documentType}">${request.document_name}</td>
      <td data-label="${i18n[currentLang].dashboard.requestDate}">${formatDate(request.created_at, currentLang)}</td>
      <td data-label="${i18n[currentLang].dashboard.deliveryMethod}">
        ${request.delivery_method === 'pickup' ? 
          `<span data-i18n="request.pickup">${i18n[currentLang].request.pickup}</span>` : 
          `<span data-i18n="request.mail">${i18n[currentLang].request.mail}</span>`}
        ${request.urgent ? `<span class="badge bg-warning text-dark ms-2" data-i18n="request.urgent">${i18n[currentLang].request.urgentLabel}</span>` : ''}
      </td>
      <td data-label="${i18n[currentLang].dashboard.status}">${createStatusBadge(request.status)}</td>
      <td data-label="${i18n[currentLang].dashboard.price}">${formatCurrency(request.total_price, currentLang)}</td>
      <td data-label="${i18n[currentLang].dashboard.actions}">
        <a href="request-detail.html?id=${request.id}" class="btn btn-sm btn-primary" data-i18n="dashboard.viewDetails">ดูรายละเอียด</a>
      </td>
    `;
    
    recentRequestsTable.appendChild(row);
  });
}

// โหลดข้อมูลผู้ใช้
async function loadUserProfile() {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    const response = await fetch('/api/auth/user', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load user profile');
    }
    
    const user = await response.json();
    
    // แสดงข้อมูลผู้ใช้
    document.getElementById('user-student-id').textContent = user.student_id;
    document.getElementById('user-full-name').textContent = user.full_name;
    document.getElementById('user-faculty').textContent = user.faculty;
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('user-phone').textContent = user.phone;
   document.getElementById('user-join-date').textContent = user.created_at;
    
    if (user.created_at) {
      document.getElementById('user-join-date').textContent = formatDate(user.created_at, currentLang);
    }
  } catch (error) {
    console.error('Error loading user profile:', error);
    showAlert(i18n[currentLang].errors.loadingProfileFailed, 'danger');
  }
}

// เพิ่มการฟังเหตุการณ์เมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
  // ตรวจสอบว่ามีการเข้าสู่ระบบหรือไม่
  checkLogin();
  
  // โหลดข้อมูลคำขอล่าสุด
  loadRecentRequests();
  
  // โหลดข้อมูลผู้ใช้
  loadUserProfile();
});
