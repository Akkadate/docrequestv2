// ภาษาปัจจุบัน
let currentLang = localStorage.getItem('language') || 'th';

// ข้อความในภาษาต่างๆ
const i18n = {
  th: {},
  en: {},
  zh: {}
};

// สถานะการโหลด i18n
let i18nLoaded = false;

// โหลดไฟล์ภาษา - แก้ไขใหม่
async function loadLanguageFiles() {
  try {
    console.log('Loading language files...');
    
    const thResponse = await fetch('/locales/th.json');
    const enResponse = await fetch('/locales/en.json');
    const zhResponse = await fetch('/locales/zh.json');
    
    if (!thResponse.ok || !enResponse.ok || !zhResponse.ok) {
      throw new Error('Failed to load language files');
    }
    
    i18n.th = await thResponse.json();
    i18n.en = await enResponse.json();
    i18n.zh = await zhResponse.json();
    
    console.log('Language files loaded successfully');
    
    // ตั้งค่าสถานะว่าโหลดเสร็จแล้ว
    i18nLoaded = true;
    
    // ทำให้ตัวแปรเป็น global
    window.i18n = i18n;
    window.currentLang = currentLang;
    window.i18nLoaded = i18nLoaded;
    
    // อัปเดตภาษาในหน้าเว็บ
    updatePageLanguage();
    
    // ส่ง custom event เพื่อแจ้งว่า i18n พร้อมแล้ว
    const i18nReadyEvent = new CustomEvent('i18nReady', {
      detail: { i18n, currentLang }
    });
    document.dispatchEvent(i18nReadyEvent);
    
    console.log('i18n ready event dispatched');
    
  } catch (error) {
    console.error('Error loading language files:', error);
    
    // แม้จะ error ยังต้องตั้งค่า global variables
    window.i18n = i18n;
    window.currentLang = currentLang;
    window.i18nLoaded = false;
  }
}

// อัปเดตภาษาในหน้าเว็บ - แก้ไขใหม่
function updatePageLanguage() {
  console.log('Updating page language to:', currentLang);
  
  // กำหนดภาษาให้กับ HTML tag
  document.documentElement.lang = currentLang;

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
  
  // อัปเดตตารางเอกสารถ้ามีฟังก์ชัน updateDocumentTable
  if (typeof window.updateDocumentTable === 'function') {
    window.updateDocumentTable();
  }
}

// เปลี่ยนภาษา - แก้ไขใหม่
function changeLanguage(lang) {
  console.log('Changing language to:', lang);
  
  currentLang = lang;
  localStorage.setItem('language', lang);
  
  // กำหนดภาษาให้กับ HTML tag
  document.documentElement.lang = lang;
  
  // อัปเดต global variable
  window.currentLang = currentLang;
  
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

// เพิ่มฟังก์ชัน helper เพื่อตรวจสอบว่า i18n พร้อมหรือไม่
function isI18nReady() {
  return window.i18nLoaded && window.i18n && window.i18n[currentLang];
}

// โหลดภาษาเมื่อโหลดหน้าเว็บ - แก้ไขใหม่
document.addEventListener('DOMContentLoaded', async () => {
  console.log('language.js: DOM loaded');
  
  // กำหนดภาษาให้กับ HTML tag ก่อนโหลด
  document.documentElement.lang = currentLang;
  
  // ตั้งค่า global variables ก่อน
  window.currentLang = currentLang;
  
  await loadLanguageFiles();
  setupLanguageSelector();
});
