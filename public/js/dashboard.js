// ฟังก์ชันรอให้ i18n โหลดเสร็จ
function waitForI18n(callback, maxAttempts = 10, currentAttempt = 0) {
  if (window.i18n && window.i18n[currentLang] && window.i18n[currentLang].dashboard && window.i18n[currentLang].errors) {
    callback();
  } else if (currentAttempt < maxAttempts) {
    console.log(`Waiting for i18n... attempt ${currentAttempt + 1}/${maxAttempts}`);
    setTimeout(() => {
      waitForI18n(callback, maxAttempts, currentAttempt + 1);
    }, 200);
  } else {
    console.warn('i18n failed to load after maximum attempts, using fallback');
    callback(); // เรียก callback ต่อไปแม้ว่า i18n จะไม่พร้อม
  }
}

// ฟังก์ชัน helper สำหรับดึงข้อความแปล
function getTranslation(key, fallback = '') {
  try {
    const keys = key.split('.');
    let translation = window.i18n && window.i18n[currentLang];
    
    for (const k of keys) {
      if (translation && translation[k]) {
        translation = translation[k];
      } else {
        console.warn(`Translation not found for key: ${key}`);
        return fallback;
      }
    }
    
    return translation || fallback;
  } catch (error) {
    console.warn(`Error getting translation for key: ${key}`, error);
    return fallback;
  }
}


// โหลดข้อมูลคำขอล่าสุด - แก้ไขใหม่
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
    
    // ใช้ getTranslation แทนการเข้าถึง i18n โดยตรง
    const errorMessage = getTranslation('errors.loadingRequestsFailed', 'ไม่สามารถโหลดข้อมูลคำขอเอกสารได้');
    showAlert(errorMessage, 'danger');
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


// แสดงคำขอล่าสุด - แก้ไขใหม่
function displayRecentRequests(requests) {
  const recentRequestsTable = document.getElementById('recent-requests-table');
  
  recentRequestsTable.innerHTML = '';
  
  if (requests.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="6" class="text-center">${getTranslation('dashboard.noRequests', 'ไม่มีคำขอเอกสาร')}</td>
    `;
    recentRequestsTable.appendChild(emptyRow);
    return;
  }
  
  requests.forEach(request => {
    const row = document.createElement('tr');
    
    // ใช้ getTranslation สำหรับ data-label
    const documentTypeLabel = getTranslation('dashboard.documentType', 'ประเภทเอกสาร');
    const requestDateLabel = getTranslation('dashboard.requestDate', 'วันที่ขอ');
    const deliveryMethodLabel = getTranslation('dashboard.deliveryMethod', 'วิธีการรับ');
    const statusLabel = getTranslation('dashboard.status', 'สถานะ');
    const priceLabel = getTranslation('dashboard.price', 'ราคา');
    const actionsLabel = getTranslation('dashboard.actions', 'การดำเนินการ');
    
    // ใช้ getTranslation สำหรับข้อความ
    const pickupText = getTranslation('request.pickup', 'รับด้วยตนเอง');
    const mailText = getTranslation('request.mail', 'รับทางไปรษณีย์');
    const urgentText = getTranslation('request.urgentLabel', 'เร่งด่วน');
    const viewDetailsText = getTranslation('dashboard.viewDetails', 'ดูรายละเอียด');
    
    row.innerHTML = `
      <td data-label="${documentTypeLabel}">${request.document_name}</td>
      <td data-label="${requestDateLabel}">${formatDate(request.created_at, currentLang)}</td>
      <td data-label="${deliveryMethodLabel}">
        ${request.delivery_method === 'pickup' ? pickupText : mailText}
        ${request.urgent ? `<span class="badge bg-warning text-dark ms-2">${urgentText}</span>` : ''}
      </td>
      <td data-label="${statusLabel}">${createStatusBadge(request.status)}</td>
      <td data-label="${priceLabel}">${formatCurrency(request.total_price, currentLang)}</td>
      <td data-label="${actionsLabel}">
        <a href="request-detail.html?id=${request.id}" class="btn btn-sm btn-primary">${viewDetailsText}</a>
      </td>
    `;
    
    recentRequestsTable.appendChild(row);
  });
}


// โหลดข้อมูลผู้ใช้ - แก้ไขใหม่
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
    console.log("User data:", user); // Debug log
    
    // แสดงข้อมูลผู้ใช้
    document.getElementById('user-student-id').textContent = user.student_id || '-';
    document.getElementById('user-full-name').textContent = user.full_name || '-';
    document.getElementById('user-faculty').textContent = user.faculty || '-';
    document.getElementById('user-email').textContent = user.email || '-';
    document.getElementById('user-phone').textContent = user.phone || '-';
    
    // แก้ไขการแสดงวันที่ลงทะเบียน
    console.log("Register date:", user.created_at); // Debug log
    if (user.created_at) {
      document.getElementById('user-join-date').textContent = formatDate(user.created_at, currentLang);
    } else {
      document.getElementById('user-join-date').textContent = '-';
    }
    
  } catch (error) {
    console.error('Error loading user profile:', error);
    
    // ใช้ getTranslation แทนการเข้าถึง i18n โดยตรง
    const errorMessage = getTranslation('errors.loadingProfileFailed', 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
    showAlert(errorMessage, 'danger');
  }
}

// ฟังก์ชันเริ่มต้นหลักของหน้า Dashboard
function initializeDashboard() {
  console.log('Initializing dashboard...');
  
  // ตรวจสอบว่ามีการเข้าสู่ระบบหรือไม่
  checkLogin();
  
  // โหลดข้อมูลคำขอล่าสุด
  loadRecentRequests();
  
  // โหลดข้อมูลผู้ใช้
  loadUserProfile();
}

// แก้ไข DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
  console.log('Dashboard page loaded, waiting for i18n...');
  
  // รอให้ i18n โหลดเสร็จก่อนแล้วค่อยเริ่มต้น dashboard
  waitForI18n(() => {
    console.log('i18n ready, initializing dashboard');
    initializeDashboard();
  });
});
