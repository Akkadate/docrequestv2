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
        
        // ตรวจสอบประเภทไฟล์และขนาด
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 
                             'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        files.forEach(file => {
            if (!allowedTypes.includes(file.type)) {
                showAlert('ประเภทไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์ PDF, JPG, PNG, DOC หรือ DOCX', 'warning');
                return;
            }
            
            if (file.size > maxSize) {
                showAlert('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)', 'warning');
                return;
            }
            
            selectedFiles.push(file);
        });
        
        updateFileList();
        event.target.value = ''; // Reset input
    }
    
    /**
     * อัปเดตรายการไฟล์ที่เลือก
     */
    function updateFileList() {
        fileListDiv.innerHTML = '';
        
        selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span class="file-name">
                    <i class="bi bi-file-earmark me-1"></i>
                    ${file.name}
                </span>
                <span class="file-size">${formatFileSize(file.size)}</span>
                <button type="button" class="btn btn-outline-danger btn-sm btn-remove" onclick="removeFile(${index})">
                    <i class="bi bi-x"></i>
                </button>
            `;
            fileListDiv.appendChild(fileItem);
        });
    }
    
    /**
     * ลบไฟล์ออกจากรายการ
     */
    window.removeFile = function(index) {
        selectedFiles.splice(index, 1);
        updateFileList();
    }
    
    /**
     * จัดรูปแบบขนาดไฟล์
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * จัดการการส่งฟอร์ม
     */
    async function handleFormSubmit(event) {
        event.preventDefault();
        
        try {
            // ตรวจสอบข้อมูลที่จำเป็น
            if (!validateForm()) {
                return;
            }
            
            // แสดง loading
            loadingModal.show();
            submitBtn.disabled = true;
            
            // เตรียมข้อมูล
            const formData = await prepareFormData();
            
            // ส่งข้อมูล
            const response = await fetch('/api/approval-workflow/submit', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showAlert('ส่งคำขออนุมัติสำเร็จ! ระบบจะส่งอีเมลแจ้งอาจารย์ที่ปรึกษา', 'success');
                
                // รอ 2 วินาที แล้วไปหน้าสถานะ
                setTimeout(() => {
                    window.location.href = 'status.html';
                }, 2000);
                
            } else {
                throw new Error(result.message || 'เกิดข้อผิดพลาดในการส่งคำขอ');
            }
            
        } catch (error) {
            console.error('Error submitting approval request:', error);
            showAlert(error.message, 'danger');
        } finally {
            loadingModal.hide();
            submitBtn.disabled = false;
        }
    }
    
    /**
     * ตรวจสอบความถูกต้องของฟอร์ม
     */
    function validateForm() {
        const documentType = documentTypeSelect.value;
        const requestTitle = document.getElementById('request-title').value.trim();
        const requestDescription = document.getElementById('request-description').value.trim();
        const deliveryMethod = document.querySelector('input[name="delivery-method"]:checked');
        const address = addressInput.value.trim();
        
        // ตรวจสอบประเภทเอกสาร
        if (!documentType) {
            showAlert('กรุณาเลือกประเภทเอกสาร', 'warning');
            documentTypeSelect.focus();
            return false;
        }
        
        // ตรวจสอบหัวข้อคำขอ
        if (!requestTitle) {
            showAlert('กรุณากรอกหัวข้อคำขอ', 'warning');
            document.getElementById('request-title').focus();
            return false;
        }
        
        if (requestTitle.length < 10) {
            showAlert('หัวข้อคำขอต้องมีความยาวอย่างน้อย 10 ตัวอักษร', 'warning');
            document.getElementById('request-title').focus();
            return false;
        }
        
        // ตรวจสอบรายละเอียดคำขอ
        if (!requestDescription) {
            showAlert('กรุณากรอกรายละเอียดคำขอ', 'warning');
            document.getElementById('request-description').focus();
            return false;
        }
        
        if (requestDescription.length < 20) {
            showAlert('รายละเอียดคำขอต้องมีความยาวอย่างน้อย 20 ตัวอักษร', 'warning');
            document.getElementById('request-description').focus();
            return false;
        }
        
        // ตรวจสอบวิธีการรับเอกสาร
        if (!deliveryMethod) {
            showAlert('กรุณาเลือกวิธีการรับเอกสาร', 'warning');
            return false;
        }
        
        // ตรวจสอบที่อยู่จัดส่ง (ถ้าเลือกจัดส่งทางไปรษณีย์)
        if (deliveryMethod.value === 'mail' && !address) {
            showAlert('กรุณากรอกที่อยู่สำหรับจัดส่ง', 'warning');
            addressInput.focus();
            return false;
        }
        
        if (deliveryMethod.value === 'mail' && address.length < 20) {
            showAlert('ที่อยู่จัดส่งต้องมีรายละเอียดอย่างน้อย 20 ตัวอักษร', 'warning');
            addressInput.focus();
            return false;
        }
        
        return true;
    }
    
    /**
     * เตรียมข้อมูลสำหรับส่ง
     */
    async function prepareFormData() {
        const documentType = documentTypeSelect.value;
        const requestTitle = document.getElementById('request-title').value.trim();
        const requestDescription = document.getElementById('request-description').value.trim();
        const deliveryMethod = document.querySelector('input[name="delivery-method"]:checked').value;
        const address = addressInput.value.trim();
        const urgent = urgentCheckbox.checked;
        
        // หา document_type_id จากประเภท
        let documentTypeId;
        if (documentType === 'late_registration') {
            documentTypeId = await getDocumentTypeId('เอกสารขออนุมัติลงทะเบียนเกินกำหนด');
        } else if (documentType === 'add_drop_course') {
            documentTypeId = await getDocumentTypeId('เอกสารขออนุมัติเพิ่มถอนรายวิชา');
        }
        
        const formData = {
            document_type_id: documentTypeId,
            request_type: documentType,
            request_title: requestTitle,
            request_description: requestDescription,
            delivery_method: deliveryMethod,
            address: deliveryMethod === 'mail' ? address : null,
            urgent: urgent
        };
        
        // เพิ่มข้อมูลไฟล์แนบ (ถ้ามี)
        if (selectedFiles.length > 0) {
            const filesData = await Promise.all(selectedFiles.map(async file => {
                return {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    // Note: ในการใช้งานจริง อาจต้องอัปโหลดไฟล์ไปเซิร์ฟเวอร์ก่อน
                    // และเก็บ URL หรือ ID ของไฟล์แทน
                    data: await fileToBase64(file)
                };
            }));
            
            formData.additional_documents = filesData;
        }
        
        return formData;
    }
    
    /**
     * ดึง document_type_id จากชื่อ
     */
    async function getDocumentTypeId(documentName) {
        try {
            const response = await fetch('/api/documents/types', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const types = await response.json();
                const type = types.find(t => t.name_th === documentName);
                return type ? type.id : null;
            }
        } catch (error) {
            console.error('Error fetching document types:', error);
        }
        return null;
    }
    
    /**
     * แปลงไฟล์เป็น Base64
     */
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
    
    /**
     * แสดงข้อความแจ้งเตือน
     */
    function showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alert-container');
        const alertId = 'alert-' + Date.now();
        
        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        alertContainer.innerHTML = alertHtml;
        
        // เลื่อนไปที่ alert
        alertContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // ซ่อน alert อัตโนมัติหลัง 10 วินาที
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                const alert = new bootstrap.Alert(alertElement);
                alert.close();
            }
        }, 10000);
    }
    
    // ===== Initialize =====
    
    // ตั้งค่าเริ่มต้น
    calculatePrice();
    toggleUrgentService();
    
    // ตรวจสอบการเข้าสู่ระบบ
    if (!localStorage.getItem('token')) {
        window.location.href = 'login.html';
        return;
    }
    
    console.log('✅ Approval Request Form ready');
});

// ===== Utility Functions =====

/**
 * Format currency
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}
