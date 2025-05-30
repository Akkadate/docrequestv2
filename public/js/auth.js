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
      // รีเซ็ต Flatpickr ถ้ามี
      if (window.birthDatePicker) {
        window.birthDatePicker.clear();
      }
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

// ตั้งค่า Date Picker
function setupBirthDateValidation() {
  const birthDateInput = document.getElementById('birth_date');
  if (!birthDateInput) return null;
  
  // ตรวจสอบว่ามี Flatpickr หรือไม่
  if (typeof flatpickr !== 'undefined') {
    // ใช้ Flatpickr
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    
    const fp = flatpickr(birthDateInput, {
      dateFormat: "Y-m-d",
      locale: "en", // บังคับให้เป็นภาษาอังกฤษ
      maxDate: today,
      minDate: minDate,
      allowInput: false,
      clickOpens: true,
      placeholder: "เลือกวันเกิด",
      onChange: function(selectedDates, dateStr, instance) {
        if (selectedDates.length > 0) {
          const selectedDate = selectedDates[0];
          if (selectedDate > today) {
            showAlert('วันเกิดไม่สามารถเป็นวันที่ในอนาคตได้', 'warning');
            instance.clear();
          }
        }
      },
      onReady: function(selectedDates, dateStr, instance) {
        const calendarContainer = instance.calendarContainer;
        if (calendarContainer) {
          calendarContainer.style.fontFamily = "'Prompt', Arial, sans-serif";
        }
      }
    });
    
    console.log('Flatpickr initialized successfully');
    return fp;
  } else {
    // Fallback สำหรับ native date picker
    console.log('Flatpickr not found, using native date picker');
    
    birthDateInput.setAttribute('type', 'date');
    
    const today = new Date();
    const maxDate = today.toISOString().split('T')[0];
    birthDateInput.setAttribute('max', maxDate);
    
    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    birthDateInput.setAttribute('min', minDate.toISOString().split('T')[0]);
    
    birthDateInput.setAttribute('lang', 'en-US');
    
    birthDateInput.addEventListener('change', function(e) {
      const selectedDate = new Date(e.target.value);
      if (selectedDate > today) {
        showAlert('วันเกิดไม่สามารถเป็นวันที่ในอนาคตได้', 'warning');
        e.target.value = '';
      }
    });
    
    return null;
  }
}

// ตั้งค่าการตรวจสอบหมายเลขบัตรประชาชน/Passport
function setupIdNumberValidation() {
  const idNumberInput = document.getElementById('id_number');
  if (idNumberInput) {
    idNumberInput.addEventListener('input', function(e) {
      const value = e.target.value.trim();
      const helpText = e.target.parentNode.querySelector('.form-text small');
      
      if (!helpText) return;
      
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

// อัปเดตภาษาของ Date Picker
function updateDatePickerLanguage() {
  const birthDateInput = document.getElementById('birth_date');
  if (birthDateInput) {
    // อัปเดต help text ตามภาษาที่เลือก
    const helpText = birthDateInput.parentNode.querySelector('.form-text small');
    if (helpText) {
      const currentLanguage = window.currentLang || 'th';
      
      const dateFormatTexts = {
        'th': 'รูปแบบ: วัน/เดือน/ปี (English Format)',
        'en': 'Format: DD/MM/YYYY',
        'zh': '格式：日/月/年 (English Format)'
      };
      
      helpText.textContent = dateFormatTexts[currentLanguage] || dateFormatTexts['th'];
    }
    
    // ถ้าใช้ Flatpickr ให้อัปเดต placeholder
    if (window.birthDatePicker && window.birthDatePicker.config) {
      const placeholderTexts = {
        'th': 'เลือกวันเกิด',
        'en': 'Select birth date',
        'zh': '选择出生日期'
      };
      
      birthDateInput.setAttribute('placeholder', placeholderTexts[window.currentLang || 'th']);
    }
  }
}

// เมื่อหน้าเว็บโหลดเสร็จ
document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('register-form');
  const loginForm = document.getElementById('login-form');
  
  if (registerForm) {
    console.log('Register form found, initializing...');
    
    registerForm.addEventListener('submit', register);
    loadFaculties();
    
    // ตั้งค่า date picker และเก็บ reference
    setTimeout(() => {
      window.birthDatePicker = setupBirthDateValidation();
      console.log('Birth date picker:', window.birthDatePicker);
    }, 100);
    
    setupIdNumberValidation();
    updateDatePickerLanguage();
    
    // ฟังการเปลี่ยนภาษา
    const languageButtons = document.querySelectorAll('[data-lang]');
    languageButtons.forEach(button => {
      button.addEventListener('click', () => {
        setTimeout(() => {
          updateDatePickerLanguage();
        }, 100);
      });
    });
  }
  
  if (loginForm) {
    loginForm.addEventListener('submit', login);
  }
});
