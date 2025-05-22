// ลงทะเบียน
async function register(event) {
  event.preventDefault();
  
  const formData = {
    student_id: document.getElementById('student_id').value,
    password: document.getElementById('password').value,
    confirm_password: document.getElementById('confirm_password').value,
    full_name: document.getElementById('full_name').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    faculty: document.getElementById('faculty').value
  };
  
  // ตรวจสอบรหัสผ่าน
  if (formData.password !== formData.confirm_password) {
    showAlert(i18n[currentLang].errors.passwordMismatch, 'danger');
    return;
  }
  
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showAlert(i18n[currentLang].success.registration, 'success');
      // รีเซ็ตฟอร์ม
      document.getElementById('register-form').reset();
      // รอ 2 วินาทีแล้วไปที่หน้าล็อกอิน
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 2000);
    } else {
      showAlert(data.message || i18n[currentLang].errors.registrationFailed, 'danger');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showAlert(i18n[currentLang].errors.serverError, 'danger');
  }
}

// เข้าสู่ระบบ
async function login(event) {
  event.preventDefault();
  
  const formData = {
    student_id: document.getElementById('student_id').value,
    password: document.getElementById('password').value
  };
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // บันทึกข้อมูลผู้ใช้และ token
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('studentId', data.student_id);
      localStorage.setItem('userName', data.user.full_name);
      localStorage.setItem('userRole', data.user.role);
      
      // ไปที่หน้าแดชบอร์ด
      if (data.user.role === 'admin') {
        window.location.href = '/admin/dashboard.html';
      } else {
        window.location.href = '/dashboard.html';
      }
    } else {
      showAlert(data.message || i18n[currentLang].errors.loginFailed, 'danger');
    }
  } catch (error) {
    console.error('Login error:', error);
    showAlert(i18n[currentLang].errors.serverError, 'danger');
  }
}

// โหลดข้อมูลคณะ
async function loadFaculties() {
  try {
    const response = await fetch(`/api/documents/faculties?lang=${currentLang}`);
    const faculties = await response.json();
    
    const facultySelect = document.getElementById('faculty');
    
    if (facultySelect) {
      faculties.forEach(faculty => {
        const option = document.createElement('option');
        option.value = faculty.name;
        option.textContent = faculty.name;
        facultySelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading faculties:', error);
  }
}

// เพิ่มการฟังเหตุการณ์เมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('register-form');
  const loginForm = document.getElementById('login-form');
  
  if (registerForm) {
    registerForm.addEventListener('submit', register);
    loadFaculties();
  }
  
  if (loginForm) {
    loginForm.addEventListener('submit', login);
  }
});
