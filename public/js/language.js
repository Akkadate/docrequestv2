// ภาษาปัจจุบัน
let currentLang = localStorage.getItem('language') || 'th';

// ข้อความในภาษาต่างๆ
const i18n = {
  th: {},
  en: {},
  zh: {}
};

// โหลดไฟล์ภาษา
async function loadLanguageFiles() {
  try {
    const thResponse = await fetch('/locales/th.json');
    const enResponse = await fetch('/locales/en.json');
    const zhResponse = await fetch('/locales/zh.json');
    
    i18n.th = await thResponse.json();
    i18n.en = await enResponse.json();
    i18n.zh = await zhResponse.json();
    
    // อัปเดตภาษาในหน้าเว็บ
    updatePageLanguage();
  } catch (error) {
    console.error('Error loading language files:', error);
  }
}

// อัปเดตภาษาในหน้าเว็บ
function updatePageLanguage() {
  const elements = document.querySelectorAll('[data-i18n]');
  
  elements.forEach(element => {
    const key = element.getAttribute('data-i18n');
    const keys = key.split('.');
    
    // ค้นหาคำแปลในไฟล์ภาษา
    let translation = i18n[currentLang];
    for (const k of keys) {
      if (translation && translation[k]) {
        translation = translation[k];
      } else {
        translation = null;
        break;
      }
    }
    
    // อัปเดตข้อความ
    if (translation) {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.placeholder = translation;
      } else {
        element.textContent = translation;
      }
    }
  });
  
  // อัปเดต placeholder ในฟอร์ม
  const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
  
  placeholders.forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    const keys = key.split('.');
    
    let translation = i18n[currentLang];
    for (const k of keys) {
      if (translation && translation[k]) {
        translation = translation[k];
      } else {
        translation = null;
        break;
      }
    }
    
    if (translation) {
      element.placeholder = translation;
    }
  });
  
  // อัปเดตคำอธิบายในฟอร์ม
  const tooltips = document.querySelectorAll('[data-i18n-tooltip]');
  
  tooltips.forEach(element => {
    const key = element.getAttribute('data-i18n-tooltip');
    const keys = key.split('.');
    
    let translation = i18n[currentLang];
    for (const k of keys) {
      if (translation && translation[k]) {
        translation = translation[k];
      } else {
        translation = null;
        break;
      }
    }
    
    if (translation) {
      element.title = translation;
    }
  });
}

// เปลี่ยนภาษา
function changeLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('language', lang);
  updatePageLanguage();
}

// เพิ่มการฟังเหตุการณ์คลิกปุ่มเปลี่ยนภาษา
function setupLanguageSelector() {
  const languageButtons = document.querySelectorAll('[data-lang]');
  
  languageButtons.forEach(button => {
    button.addEventListener('click', () => {
      const lang = button.getAttribute('data-lang');
      changeLanguage(lang);
      
      // เปลี่ยนสถานะปุ่ม
      languageButtons.forEach(btn => {
        btn.classList.remove('btn-light');
        btn.classList.add('btn-outline-light');
      });
      
      button.classList.remove('btn-outline-light');
      button.classList.add('btn-light');
    });
    
    // ตั้งค่าสถานะปุ่มตามภาษาปัจจุบัน
    if (button.getAttribute('data-lang') === currentLang) {
      button.classList.remove('btn-outline-light');
      button.classList.add('btn-light');
    }
  });
}

// โหลดภาษาเมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', async () => {
  await loadLanguageFiles();
  setupLanguageSelector();
});
