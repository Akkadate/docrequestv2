// ===============================================
// Approval Request Form JavaScript
// ===============================================
// ไฟล์: public/js/approval-request.js
// วันที่สร้าง: 30 กรกฎาคม 2025
// วัตถุประสงค์: จัดการฟอร์มขอเอกสารที่ต้องอนุมัติ

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Approval Request Form initialized');
    
    // Elements
    const form = document.getElementById('approval-request-form');
    const documentTypeSelect = document.getElementById('document-type');
    const deliveryMethodRadios = document.querySelectorAll('input[name="delivery-method"]');
    const addressSection = document.getElementById('address-section');
    const addressInput = document.getElementById('address');
    const urgentCheckbox = document.getElementById('urgent');
    const additionalDocsInput = document.getElementById('additional-documents');
    const fileListDiv = document.getElementById('file-list');
    const submitBtn = document.getElementById('submit-btn');
    const loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
    
    // Price elements
    const documentPriceSpan = document.getElementById('document-price');
    const shippingFeeRow = document.getElementById('shipping-fee-row');
    const shippingFeeSpan = document.getElementById('shipping-fee');
    const urgentFeeRow = document.getElementById('urgent-fee-row');
    const urgentFeeSpan = document.getElementById('urgent-fee');
    const totalPriceSpan = document.getElementById('total-price');
    
    // Configuration
    const PRICES = {
        document: 150,
        shipping: 200,
        urgent: 50
    };
    
    let selectedFiles = [];
    
    // ===== Event Listeners =====
    
    // Document type change
    documentTypeSelect.addEventListener('change', function() {
        updateRequestTitle();
        calculatePrice();
    });
    
    // Delivery method change
    deliveryMethodRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            toggleAddressSection();
            toggleUrgentService();
            calculatePrice();
        });
    });
    
    // Urgent service change
    urgentCheckbox.addEventListener('change', calculatePrice);
    
    // File upload
    additionalDocsInput.addEventListener('change', handleFileUpload);
    
    // Form submission
    form.addEventListener('submit', handleFormSubmit);
    
    // ===== Functions =====
    
    /**
     * อัปเดตหัวข้อคำขอตามประเภทเอกสารที่เลือก
     */
    function updateRequestTitle() {
        const docType = documentTypeSelect.value;
        const titleInput = document.getElementById('request-title');
        
        if (docType === 'late_registration') {
            titleInput.placeholder = 'เช่น ขอลงทะเบียนเกินกำหนด ภาคเรียนที่ 2/2567';
        } else if (docType === 'add_drop_course') {
            titleInput.placeholder = 'เช่น ขอเพิ่มรายวิชา ENG1001 และถอนรายวิชา MAT1001';
        } else {
            titleInput.placeholder = 'กรอกหัวข้อคำขอ';
        }
    }
    
    /**
     * แสดง/ซ่อนส่วนที่อยู่จัดส่ง
     */
    function toggleAddressSection() {
        const isMailSelected = document.getElementById('mail').checked;
        
        if (isMailSelected) {
            addressSection.style.display = 'block';
            addressInput.required = true;
        } else {
            addressSection.style.display = 'none';
            addressInput.required = false;
            addressInput.value = '';
        }
    }
    
    /**
     * เปิด/ปิดบริการเร่งด่วน (เฉพาะการรับด้วยตนเอง)
     */
    function toggleUrgentService() {
        const isPickupSelected = document.getElementById('pickup').checked;
        
        if (isPickupSelected) {
            urgentCheckbox.disabled = false;
            urgentCheckbox.parentElement.parentElement.classList.remove('opacity-50');
        } else {
            urgentCheckbox.disabled = true;
            urgentCheckbox.checked = false;
            urgentCheckbox.parentElement.parentElement.classList.add('opacity-50');
        }
    }
    
    /**
     * คำนวณราคารวม
     */
    function calculatePrice() {
        let total = PRICES.document;
        
        // ค่าจัดส่ง
        const isMailSelected = document.getElementById('mail').checked;
        if (isMailSelected) {
            total += PRICES.shipping;
            shippingFeeRow.style.display = 'flex';
        } else {
            shippingFeeRow.style.display = 'none';
        }
        
        // ค่าบริการเร่งด่วน
        if (urgentCheckbox.checked && !urgentCheckbox.disabled) {
            total += PRICES.urgent;
            urgentFeeRow.style.display = 'flex';
        } else {
            urgentFeeRow.style.display = 'none';
        }
        
        // อัปเดตราคา
        documentPriceSpan.textContent = `${PRICES.document} ฿`;
        shippingFeeSpan.textContent = `${PRICES.shipping} ฿`;
        urgentFeeSpan.textContent = `${PRICES.urgent} ฿`;
        totalPriceSpan.textContent = `${total} ฿`;
    }
    
    /**
     * จัดการการอัปโหลดไฟล์
     */
    function handleFileUpload(event) {
        const files = Array.from(event.target.files);
        
        // ตรวจส
