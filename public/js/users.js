// ตรวจสอบว่าเป็นผู้ดูแลระบบหรือไม่
document.addEventListener('DOMContentLoaded', () => {
  checkAdmin();
  loadUsers();
  setupSearch();
  setupAddAdmin();
  setupAdminFormValidation();
});

// ตั้งค่าการค้นหา
function setupSearch() {
  // เพิ่มการฟังเหตุการณ์สำหรับการค้นหา
  document.getElementById('search-button').addEventListener('click', () => {
    const searchQuery = document.getElementById('search-input').value;
    loadUsers(searchQuery);
  });
  
  // ฟังเหตุการณ์เมื่อกด Enter ในช่องค้นหา
  document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const searchQuery = document.getElementById('search-input').value;
      loadUsers(searchQuery);
    }
  });
}

// ตั้งค่าการเพิ่มผู้ดูแลระบบ
function setupAddAdmin() {
  const addAdminButton = document.getElementById('add-admin-button');
  
  if (addAdminButton) {
    addAdminButton.addEventListener('click', () => {
      const form = document.getElementById('add-admin-form');
      
      // ตรวจสอบความถูกต้องของฟอร์ม
      if (form.checkValidity()) {
        // เรียกฟังก์ชันเพิ่มผู้ดูแลระบบ
        addAdmin(new Event('submit'));
      } else {
        // แสดงข้อความกรุณากรอกข้อมูลให้ครบถ้วน
        form.reportValidity();
      }
    });
  }
}

// ตั้งค่าการตรวจสอบฟอร์มผู้ดูแลระบบ
function setupAdminFormValidation() {
  // ตั้งค่าวันที่สูงสุดสำหรับวันเกิด
  const birthDateInput = document.getElementById('admin-birth-date');
  if (birthDateInput) {
    const today = new Date();
    const maxDate = today.toISOString().split('T')[0];
    birthDateInput.setAttribute('max', maxDate);
    
    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    birthDateInput.setAttribute('min', minDate.toISOString().split('T')[0]);
  }
  
  // ตั้งค่าการตรวจสอบหมายเลขบัตรประชาชน/Passport
  const idNumberInput = document.getElementById('admin-id-number');
  if (idNumberInput) {
    idNumberInput.addEventListener('input', function(e) {
      const value = e.target.value.trim();
      const parentDiv = e.target.parentNode;
      let helpText = parentDiv.querySelector('.form-text small');
      
      if (value.length === 0) {
        helpText.textContent = 'ไม่จำเป็นต้องกรอก';
        helpText.className = 'text-muted';
        return;
      }
      
      // ตรวจสอบรูปแบบ
      if (/^[0-9]{13}$/.test(value)) {
        helpText.textContent = '✓ รูปแบบบัตรประชาชนถูกต้อง';
        helpText.className = 'text-success';
      } else if (/^[A-Za-z0-9]{6,12}$/.test(value)) {
        helpText.textContent = '✓ รูปแบบ Passport ถูกต้อง';
        helpText.className = 'text-success';
      } else {
        if (value.length < 6) {
          helpText.textContent = '⚠ หมายเลขสั้นเกินไป';
        } else if (value.length > 13) {
          helpText.textContent = '⚠ หมายเลขยาวเกินไป';
        } else if (/^[0-9]+$/.test(value) && value.length !== 13) {
          helpText.textContent = '⚠ บัตรประชาชนต้องเป็น 13 หลัก';
        } else {
          helpText.textContent = '⚠ รูปแบบไม่ถูกต้อง';
        }
        helpText.className = 'text-warning';
      }
    });
  }
}

// โหลดข้อมูลผู้ใช้ทั้งหมด
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

// แสดงข้อมูลผู้ใช้
function displayUsers(users) {
  const usersTable = document.getElementById('users-table');
  
  if (!usersTable) {
    return;
  }
  
  usersTable.innerHTML = '';
  
  if (users.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="8" class="text-center" data-i18n="admin.users.noUsers">ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข</td>
    `;
    usersTable.appendChild(emptyRow);
    return;
  }
  
  users.forEach(user => {
    const row = document.createElement('tr');
    
    // ตรวจสอบว่ามี i18n หรือไม่
    const studentIdLabel = (window.i18n && window.i18n[window.currentLang]) ? 
      window.i18n[window.currentLang].admin.users.studentID : 'รหัสนักศึกษา';
    const fullNameLabel = (window.i18n && window.i18n[window.currentLang]) ? 
      window.i18n[window.currentLang].admin.users.fullName : 'ชื่อ-นามสกุล';
    const emailLabel = (window.i18n && window.i18n[window.currentLang]) ? 
      window.i18n[window.currentLang].admin.users.email : 'อีเมล';
    const phoneLabel = (window.i18n && window.i18n[window.currentLang]) ? 
      window.i18n[window.currentLang].admin.users.phone : 'เบอร์โทรศัพท์';
    const facultyLabel = (window.i18n && window.i18n[window.currentLang]) ? 
      window.i18n[window.currentLang].admin.users.faculty : 'คณะ';
    const roleLabel = (window.i18n && window.i18n[window.currentLang]) ? 
      window.i18n[window.currentLang].admin.users.role : 'บทบาท';
    const joinDateLabel = (window.i18n && window.i18n[window.currentLang]) ? 
      window.i18n[window.currentLang].admin.users.joinDate : 'วันที่ลงทะเบียน';
    const actionsLabel = (window.i18n && window.i18n[window.currentLang]) ? 
      window.i18n[window.currentLang].admin.users.actions : 'การดำเนินการ';
    
    const adminText = (window.i18n && window.i18n[window.currentLang]) ? 
      window.i18n[window.currentLang].admin.users.admin : 'ผู้ดูแลระบบ';
    const studentText = (window.i18n && window.i18n[window.currentLang]) ? 
      window.i18n[window.currentLang].admin.users.student : 'นักศึกษา';
    const viewDetailsText = (window.i18n && window.i18n[window.currentLang]) ? 
      window.i18n[window.currentLang].admin.users.viewDetails : 'ดูรายละเอียด';
    
    row.innerHTML = `
      <td data-label="${studentIdLabel}">${user.student_id}</td>
      <td data-label="${fullNameLabel}">${user.full_name}</td>
      <td data-label="${emailLabel}">${user.email}</td>
      <td data-label="${phoneLabel}">${user.phone}</td>
      <td data-label="${facultyLabel}">${user.faculty}</td>
      <td data-label="${roleLabel}">
        <span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}">
          ${user.role === 'admin' ? adminText : studentText}
        </span>
      </td>
      <td data-label="${joinDateLabel}">${formatDate(user.created_at, window.currentLang || 'th')}</td>
      <td data-label="${actionsLabel}">
        <button class="btn btn-sm btn-primary view-user" data-id="${user.id}">
          <i class="bi bi-eye"></i> <span data-i18n="admin.users.viewDetails">${viewDetailsText}</span>
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

// เพิ่มผู้ดูแลระบบใหม่
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
      phone: document.getElementById('admin-phone').value,
      birth_date: document.getElementById('admin-birth-date').value || null,
      id_number: document.getElementById('admin-id-number').value || null
    };
    
    // ตรวจสอบรหัสผ่าน
    if (formData.password !== formData.confirm_password) {
      const errorMsg = (window.i18n && window.i18n[window.currentLang]) ? 
        window.i18n[window.currentLang].errors.passwordMismatch : 'รหัสผ่านไม่ตรงกัน';
      showAlert(errorMsg, 'danger');
      return;
    }
    
    // ตรวจสอบรูปแบบหมายเลขบัตรประชาชน/Passport (ถ้ามีการกรอก)
    if (formData.id_number) {
      const idNumber = formData.id_number.trim();
      if (!/^[0-9]{13}$/.test(idNumber) && !/^[A-Za-z0-9]{6,12}$/.test(idNumber)) {
        showAlert('รูปแบบหมายเลขบัตรประชาชนหรือ Passport ไม่ถูกต้อง', 'danger');
        return;
      }
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
      const successMsg = (window.i18n && window.i18n[window.currentLang]) ? 
        window.i18n[window.currentLang].success.addAdmin : 'เพิ่มผู้ดูแลระบบสำเร็จ';
      showAlert(successMsg, 'success');
      
      // รีเซ็ตฟอร์ม
      document.getElementById('add-admin-form').reset();
      
      // รีเซ็ต help text
      const helpTexts = document.querySelectorAll('#add-admin-form .form-text small');
      helpTexts.forEach(text => {
        text.textContent = 'ไม่จำเป็นต้องกรอก';
        text.className = 'text-muted';
      });
      
      // ปิด Modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('addAdminModal'));
      modal.hide();
      
      // โหลดข้อมูลผู้ใช้ใหม่
      loadUsers();
    } else {
      showAlert(data.message || 'เกิดข้อผิดพลาดในการเพิ่มผู้ดูแลระบบ', 'danger');
    }
  } catch (error) {
    console.error('Error adding admin:', error);
    const errorMsg = (window.i18n && window.i18n[window.currentLang]) ? 
      window.i18n[window.currentLang].errors.serverError : 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์';
    showAlert(errorMsg, 'danger');
  }
}

// ฟังก์ชันแสดงข้อความแจ้งเตือน (ถ้ายังไม่มีในไฟล์อื่น)
function showAlert(message, type = 'success') {
  const alertContainer = document.getElementById('alert-container');
  
  if (!alertContainer) {
    console.error('Alert container not found');
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
    const alertElement = alertContainer.querySelector('.alert');
    if (alertElement) {
      alertElement.remove();
    }
  }, 5000);
}

// ฟังก์ชันจัดรูปแบบวันที่ (ถ้ายังไม่มีในไฟล์อื่น)
function formatDate(dateString, lang = 'th') {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok'
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
