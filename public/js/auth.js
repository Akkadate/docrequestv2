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
    faculty: document.getElementById('faculty').value,
    birth_date: document.getElementById('birth_date').value,
    id_number: document.getElementById('id_number').value
  };
  
  // ตรวจสอบรหัสผ่าน
  if (formData.password !== formData.confirm_password) {
    showAlert(i18n[currentLang].errors.passwordMismatch, 'danger');
    return;
  }
  
  // ตรวจสอบว่ากรอกข้อมูลครบหรือไม่
  if (!formData.birth_date) {
    showAlert('กรุณาเลือกวันเดือนปีเกิด', 'danger');
    return;
  }
  
  if (!formData.id_number || formData.id_number.trim().length === 0) {
    showAlert('กรุณากรอกหมายเลขบัตรประชาชนหรือ Passport', 'danger');
    return;
  }
  
  // ตรวจสอบรูปแบบหมายเลขบัตรประชาชน (13 หลัก) หรือ Passport
  const idNumber = formData.id_number.trim();
  if (!/^[0-9]{13}$/.test(idNumber) && !/^[A-Za-z0-9]{6,12}$/.test(idNumber)) {
    showAlert('กรุณากรอกหมายเลขบัตรประชาชน 13 หลัก หรือหมายเลข Passport ที่ถูกต้อง', 'danger');
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
      localStorage.setItem('studentId', data.user.student_id);
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
      // ล้างตัวเลือกเดิม (ยกเว้น option แรก)
      const firstOption = facultySelect.querySelector('option[value=""]');
      facultySelect.innerHTML = '';
      if (firstOption) {
        facultySelect.appendChild(firstOption);
      }
      
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

// ตั้งค่าวันที่สูงสุดสำหรับวันเกิด (ป้องกันการเลือกวันที่ในอนาคต)
function setupBirthDateValidation() {
  const birthDateInput = document.getElementById('birth_date');
  if (birthDateInput) {
    // ตั้งค่าวันที่สูงสุดเป็นวันนี้
    const today = new Date();
    const maxDate = today.toISOString().split('T')[0];
    birthDateInput.setAttribute('max', maxDate);
    
    // ตั้งค่าวันที่ต่ำสุดเป็น 100 ปีที่แล้ว
    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    birthDateInput.setAttribute('min', minDate.toISOString().split('T')[0]);
  }
}

// ตั้งค่าการตรวจสอบหมายเลขบัตรประชาชน/Passport
function setupIdNumberValidation() {
  const idNumberInput = document.getElementById('id_number');
  if (idNumberInput) {
    idNumberInput.addEventListener('input', function(e) {
      const value = e.target.value.trim();
      const helpText = e.target.parentNode.querySelector('.form-text small');
      
      if (value.length === 0) {
        helpText.textContent = 'กรอกหมายเลขบัตรประชาชน 13 หลักหรือหมายเลข Passport';
        helpText.className = 'text-muted';
        return;
      }
      
      // ตรวจสอบว่าเป็นตัวเลข 13 หลัก (บัตรประชาชน)
      if (/^[0-9]{13}$/.test(value)) {
        helpText.textContent = '✓ รูปแบบบัตรประชาชนถูกต้อง';
        helpText.className = 'text-success';
      }
      // ตรวจสอบว่าเป็น Passport (6-12 ตัวอักษรและตัวเลข)
      else if (/^[A-Za-z0-9]{6,12}$/.test(value)) {
        helpText.textContent = '✓ รูปแบบ Passport ถูกต้อง';
        helpText.className = 'text-success';
      }
      // รูปแบบไม่ถูกต้อง
      else {
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

// เพิ่มการฟังเหตุการณ์เมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('register-form');
  const loginForm = document.getElementById('login-form');
  
  if (registerForm) {
    registerForm.addEventListener('submit', register);
    loadFaculties();
    setupBirthDateValidation();
    setupIdNumberValidation();
  }
  
  if (loginForm) {
    loginForm.addEventListener('submit', login);
  }
});
