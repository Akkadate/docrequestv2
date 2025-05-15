// ตรวจสอบว่าเป็นผู้ดูแลระบบหรือไม่
document.addEventListener('DOMContentLoaded', () => {
  checkAdmin();
  loadUsers();
  setupSearch();
  setupAddAdmin();
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
    showAlert(i18n[currentLang].errors.serverError, 'danger');
  }
}
