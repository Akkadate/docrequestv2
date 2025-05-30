// ตรวจสอบว่าเป็นผู้ดูแลระบบหรือไม่
document.addEventListener('DOMContentLoaded', () => {
  console.log('User detail page loaded');
  checkAdmin();
  loadUserDetails();
  setupEventListeners();
});

let currentUserId = null;

// ตั้งค่าการฟังเหตุการณ์
function setupEventListeners() {
  // ปุ่มลบผู้ใช้
  const deleteUserBtn = document.getElementById('delete-user-btn');
  if (deleteUserBtn) {
    deleteUserBtn.addEventListener('click', setupDeleteModal);
  }

  // ปุ่มยืนยันการลบ
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', deleteUser);
  }

  // ช่อง input สำหรับยืนยันการลบ
  const confirmDeleteInput = document.getElementById('confirm-delete-input');
  if (confirmDeleteInput) {
    confirmDeleteInput.addEventListener('input', (e) => {
      const confirmBtn = document.getElementById('confirm-delete-btn');
      if (confirmBtn) {
        confirmBtn.disabled = e.target.value !== 'DELETE';
      }
    });
  }

  // ปุ่มรีเซ็ตรหัสผ่าน
  const resetPasswordBtn = document.getElementById('reset-password-btn');
  if (resetPasswordBtn) {
    resetPasswordBtn.addEventListener('click', () => {
      const resetModal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
      resetModal.show();
    });
  }

  // ปุ่มยืนยันรีเซ็ตรหัสผ่าน
  const confirmResetBtn = document.getElementById('confirm-reset-password-btn');
  if (confirmResetBtn) {
    confirmResetBtn.addEventListener('click', resetUserPassword);
  }
}

// โหลดรายละเอียดผู้ใช้
async function loadUserDetails() {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '../login.html';
      return;
    }
    
    // รับ ID ผู้ใช้จาก URL
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    
    if (!userId) {
      window.location.href = 'users.html';
      return;
    }
    
    currentUserId = userId;
    console.log('Loading user details for ID:', userId);
    
    // โหลดข้อมูลผู้ใช้
    const userResponse = await fetch(`/api/admin/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!userResponse.ok) {
      throw new Error('Failed to load user details');
    }
    
    const user = await userResponse.json();
    console.log('User details loaded:', user);
    
    displayUserDetails(user);
    
    // โหลดประวัติการขอเอกสารของผู้ใช้
    await loadUserRequests(userId);
    
  } catch (error) {
    console.error('Error loading user details:', error);
    showAdminAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้', 'danger');
  }
}
// แสดงรายละเอียดผู้ใช้
function displayUserDetails(user) {
  try {
    console.log('Displaying user details:', user); // เพิ่ม debug log
    
    // ข้อมูลพื้นฐาน
    document.getElementById('user-student-id').textContent = user.student_id || '-';
    document.getElementById('user-full-name').textContent = user.full_name || '-';
    document.getElementById('user-email').textContent = user.email || '-';
    document.getElementById('user-phone').textContent = user.phone || '-';
    document.getElementById('user-faculty').textContent = user.faculty || '-';
    
    // แสดงวันเดือนปีเกิด
    const birthDateElement = document.getElementById('user-birth-date');
    if (birthDateElement) {
      if (user.birth_date) {
        // แปลงวันที่จาก ISO format
        const birthDate = new Date(user.birth_date);
        console.log('Birth date raw:', user.birth_date, 'Parsed:', birthDate);
        
        const options = {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'Asia/Bangkok'
        };
        
        const formattedDate = birthDate.toLocaleDateString('th-TH', options);
        console.log('Formatted birth date:', formattedDate);
        
        birthDateElement.textContent = formattedDate;
      } else {
        birthDateElement.textContent = '-';
      }
    } else {
      console.error('Birth date element not found');
    }
    
    // แสดงหมายเลขบัตรประชาชน/Passport
    const idNumberElement = document.getElementById('user-id-number');
    if (idNumberElement) {
      if (user.id_number) {
        console.log('ID Number raw:', user.id_number);
        
        // ซ่อนบางส่วนของหมายเลขเพื่อความปลอดภัย
        const maskedIdNumber = maskIdNumber(user.id_number);
        console.log('Masked ID Number:', maskedIdNumber);
        
        idNumberElement.textContent = maskedIdNumber;
        idNumberElement.title = 'คลิกเพื่อดูหมายเลขเต็ม';
        idNumberElement.style.cursor = 'pointer';
        
        // เพิ่มการคลิกเพื่อแสดงหมายเลขเต็ม
        idNumberElement.addEventListener('click', function() {
          if (this.textContent === maskedIdNumber) {
            this.textContent = user.id_number;
            this.title = 'คลิกเพื่อซ่อนหมายเลข';
          } else {
            this.textContent = maskedIdNumber;
            this.title = 'คลิกเพื่อดูหมายเลขเต็ม';
          }
        });
      } else {
        console.log('No ID number found');
        idNumberElement.textContent = '-';
      }
    } else {
      console.error('ID number element not found');
    }
    
    // วันที่ลงทะเบียน
    const joinDateElement = document.getElementById('user-join-date');
    if (joinDateElement) {
      joinDateElement.textContent = formatDate(user.created_at, window.currentLang || 'th');
    }
    
    // แสดง badge บทบาท
    const roleElement = document.getElementById('user-role-badge');
    if (roleElement) {
      const badgeClass = user.role === 'admin' ? 'bg-danger' : 'bg-primary';
      const roleText = user.role === 'admin' ? 
        (window.i18n?.[window.currentLang]?.admin?.users?.admin || 'ผู้ดูแลระบบ') : 
        (window.i18n?.[window.currentLang]?.admin?.users?.student || 'นักศึกษา');
      
      roleElement.innerHTML = `<span class="badge ${badgeClass}">${roleText}</span>`;
    }
    
    // ซ่อนปุ่มลบสำหรับผู้ดูแลระบบ
    if (user.role === 'admin') {
      const deleteBtn = document.getElementById('delete-user-btn');
      if (deleteBtn) {
        deleteBtn.style.display = 'none';
      }
    }
    
  } catch (error) {
    console.error('Error displaying user details:', error);
  }
}

// ฟังก์ชันซ่อนบางส่วนของหมายเลขบัตรประชาชน/Passport
function maskIdNumber(idNumber) {
  if (!idNumber) return '-';
  
  const str = idNumber.toString();
  
  // ถ้าเป็นบัตรประชาชน (13 หลัก)
  if (str.length === 13 && /^[0-9]+$/.test(str)) {
    return str.substring(0, 1) + '-' + str.substring(1, 5) + '-' + '*'.repeat(5) + '-' + str.substring(10, 12) + '-' + str.substring(12);
  }
  
  // ถ้าเป็น Passport หรืออื่นๆ
  if (str.length >= 6) {
    return str.substring(0, 2) + '*'.repeat(str.length - 4) + str.substring(str.length - 2);
  }
  
  return str;
}

// โหลดประวัติการขอเอกสารของผู้ใช้
async function loadUserRequests(userId) {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`/api/admin/user/${userId}/requests?lang=${currentLang}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.warn('Failed to load user requests, may not be implemented yet');
      displayUserRequests([]);
      return;
    }
    
    const requests = await response.json();
    console.log('User requests loaded:', requests.length);
    
    displayUserRequests(requests);
    updateStatistics(requests);
    
  } catch (error) {
    console.error('Error loading user requests:', error);
    displayUserRequests([]);
  }
}

// แสดงประวัติการขอเอกสาร
function displayUserRequests(requests) {
  const tableBody = document.getElementById('user-requests-table');
  
  if (!tableBody) {
    console.error('User requests table not found');
    return;
  }
  
  tableBody.innerHTML = '';
  
  if (requests.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="6" class="text-center">ไม่พบประวัติการขอเอกสาร</td>
    `;
    tableBody.appendChild(emptyRow);
    return;
  }
  
  requests.forEach(request => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${request.id}</td>
      <td>${request.document_name || '-'}</td>
      <td>${formatDate(request.created_at, currentLang)}</td>
      <td>${createStatusBadge(request.status)}</td>
      <td>${formatCurrency(request.total_price, currentLang)}</td>
      <td>
        <a href="request-detail.html?id=${request.id}" class="btn btn-sm btn-primary">
          <i class="bi bi-eye"></i> ดูรายละเอียด
        </a>
      </td>
    `;
    
    tableBody.appendChild(row);
  });
}

// อัปเดตสถิติการใช้งาน
function updateStatistics(requests) {
  try {
    const totalRequests = requests.length;
    const completedRequests = requests.filter(r => r.status === 'completed').length;
    const pendingRequests = requests.filter(r => r.status === 'pending').length;
    const totalSpent = requests.reduce((sum, r) => sum + parseFloat(r.total_price || 0), 0);
    
    document.getElementById('total-requests').textContent = totalRequests;
    document.getElementById('completed-requests').textContent = completedRequests;
    document.getElementById('pending-requests').textContent = pendingRequests;
    document.getElementById('total-spent').textContent = formatCurrency(totalSpent, currentLang);
    
  } catch (error) {
    console.error('Error updating statistics:', error);
  }
}

// ตั้งค่า Modal การลบ
function setupDeleteModal() {
  const userStudentId = document.getElementById('user-student-id').textContent;
  const userFullName = document.getElementById('user-full-name').textContent;
  const userEmail = document.getElementById('user-email').textContent;
  
  document.getElementById('delete-user-student-id').textContent = userStudentId;
  document.getElementById('delete-user-name').textContent = userFullName;
  document.getElementById('delete-user-email').textContent = userEmail;
  
  // รีเซ็ตช่อง input
  const confirmInput = document.getElementById('confirm-delete-input');
  if (confirmInput) {
    confirmInput.value = '';
  }
  
  const confirmBtn = document.getElementById('confirm-delete-btn');
  if (confirmBtn) {
    confirmBtn.disabled = true;
  }
}

// ลบผู้ใช้
async function deleteUser() {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '../login.html';
      return;
    }
    
    if (!currentUserId) {
      showAdminAlert('ไม่พบ ID ผู้ใช้', 'danger');
      return;
    }
    
    console.log('Deleting user:', currentUserId);
    
    const response = await fetch(`/api/admin/user/${currentUserId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showAdminAlert('ลบผู้ใช้สำเร็จ', 'success');
      
      // ปิด Modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('deleteUserModal'));
      if (modal) {
        modal.hide();
      }
      
      // กลับไปหน้ารายการผู้ใช้
      setTimeout(() => {
        window.location.href = 'users.html';
      }, 2000);
      
    } else {
      showAdminAlert(data.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้', 'danger');
    }
    
  } catch (error) {
    console.error('Error deleting user:', error);
    showAdminAlert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'danger');
  }
}

// รีเซ็ตรหัสผ่าน
async function resetUserPassword() {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '../login.html';
      return;
    }
    
    if (!currentUserId) {
      showAdminAlert('ไม่พบ ID ผู้ใช้', 'danger');
      return;
    }
    
    console.log('Resetting password for user:', currentUserId);
    
    const response = await fetch(`/api/admin/user/${currentUserId}/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showAdminAlert('รีเซ็ตรหัสผ่านสำเร็จ รหัสผ่านใหม่: 123456', 'success');
      
      // ปิด Modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('resetPasswordModal'));
      if (modal) {
        modal.hide();
      }
      
    } else {
      showAdminAlert(data.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน', 'danger');
    }
    
  } catch (error) {
    console.error('Error resetting password:', error);
    showAdminAlert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'danger');
  }
}

// ฟังก์ชันสำหรับใช้จากฟังก์ชันอื่น
window.loadUserDetails = loadUserDetails;
window.deleteUser = deleteUser;
window.resetUserPassword = resetUserPassword;
