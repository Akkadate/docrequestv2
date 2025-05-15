// ราคาเอกสาร
let documentPrice = 0;

// โหลดข้อมูลประเภทเอกสาร
async function loadDocumentTypes() {
  try {
    const response = await fetch(`/api/documents/types?lang=${currentLang}`);
    const documentTypes = await response.json();
    
    const documentTypeSelect = document.getElementById('document_type');
    
    if (documentTypeSelect) {
      // ล้างตัวเลือกเดิม
      documentTypeSelect.innerHTML = '';
      
      // เพิ่มตัวเลือกเริ่มต้น
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.disabled = true;
      defaultOption.selected = true;
      defaultOption.textContent = i18n[currentLang].request.selectDocumentType;
      documentTypeSelect.appendChild(defaultOption);
      
      // เพิ่มรายการประเภทเอกสาร
      documentTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        option.dataset.price = type.price;
        documentTypeSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading document types:', error);
  }
}

// คำนวณราคา
function calculatePrice() {
  let totalPrice = 0;
  
  // ราคาเอกสาร
  const documentTypeSelect = document.getElementById('document_type');
  const selectedOption = documentTypeSelect.options[documentTypeSelect.selectedIndex];
  
  if (selectedOption && selectedOption.value) {
    documentPrice = parseFloat(selectedOption.dataset.price || 0);
    totalPrice += documentPrice;
  }
  
  // ตรวจสอบวิธีการรับเอกสาร
  const deliveryMethod = document.querySelector('input[name="delivery_method"]:checked').value;
  
  // ค่าจัดส่งทางไปรษณีย์
  if (deliveryMethod === 'mail') {
    totalPrice += 200; // ค่าจัดส่ง 200 บาท
  }
  
  // ตรวจสอบบริการเร่งด่วน
  const isUrgent = document.getElementById('urgent').checked;
  
  if (isUrgent && deliveryMethod === 'pickup') {
    totalPrice += 50; // ค่าบริการเร่งด่วนเพิ่ม 50 บาท
  }
  
  // อัปเดตราคารวม
  document.getElementById('total-price').textContent = `${formatCurrency(totalPrice, currentLang)}`;
  
  // อัปเดตสรุปรายการ
  updateSummary(deliveryMethod, isUrgent);
}

// อัปเดตสรุปรายการ
function updateSummary(deliveryMethod, isUrgent) {
  const summaryContainer = document.getElementById('summary-container');
  const documentTypeSelect = document.getElementById('document_type');
  const selectedOption = documentTypeSelect.options[documentTypeSelect.selectedIndex];
  
  if (!selectedOption || !selectedOption.value) {
    summaryContainer.innerHTML = `<p>${i18n[currentLang].request.emptySelection}</p>`;
    return;
  }
  
  let summaryHTML = `
    <div class="mb-3">
      <strong>${i18n[currentLang].request.documentType}:</strong>
      <div>${selectedOption.textContent}</div>
      <div>${formatCurrency(documentPrice, currentLang)}</div>
    </div>
  `;
  
  // วิธีการรับเอกสาร
  summaryHTML += `
    <div class="mb-3">
      <strong>${i18n[currentLang].request.deliveryMethod}:</strong>
      <div>${deliveryMethod === 'pickup' ? i18n[currentLang].request.pickup : i18n[currentLang].request.mail}</div>
  `;
  
  // ค่าจัดส่ง (ถ้ามี)
  if (deliveryMethod === 'mail') {
    summaryHTML += `<div>${i18n[currentLang].request.shippingFee}: ${formatCurrency(200, currentLang)}</div>`;
  }
  
  summaryHTML += `</div>`;
  
  // บริการเร่งด่วน (ถ้ามี)
  if (isUrgent && deliveryMethod === 'pickup') {
    summaryHTML += `
      <div class="mb-3">
        <strong>${i18n[currentLang].request.urgentService}:</strong>
        <div>${formatCurrency(50, currentLang)}</div>
      </div>
    `;
  }
  
  summaryContainer.innerHTML = summaryHTML;
}

// ส่งคำขอเอกสาร
async function submitDocumentRequest(event) {
  event.preventDefault();
  
  // ตรวจสอบว่ามีการเข้าสู่ระบบหรือไม่
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }
  
  // รับข้อมูลจากฟอร์ม
  const documentTypeId = document.getElementById('document_type').value;
  const deliveryMethod = document.querySelector('input[name="delivery_method"]:checked').value;
  const address = document.getElementById('address').value;
  const urgent = document.getElementById('urgent').checked;
  const paymentSlip = document.getElementById('payment_slip').files[0];
  
  // ตรวจสอบว่าได้กรอกข้อมูลครบถ้วนหรือไม่
  if (!documentTypeId) {
    showAlert(i18n[currentLang].errors.selectDocumentType, 'danger');
    return;
  }
  
  if (deliveryMethod === 'mail' && !address) {
    showAlert(i18n[currentLang].errors.enterAddress, 'danger');
    return;
  }
  
  if (!paymentSlip) {
    showAlert(i18n[currentLang].errors.uploadPaymentSlip, 'danger');
    return;
  }
  
  // สร้าง FormData สำหรับส่งไฟล์
  const formData = new FormData();
  formData.append('document_type_id', documentTypeId);
  formData.append('delivery_method', deliveryMethod);
  formData.append('urgent', urgent);
  
  if (deliveryMethod === 'mail') {
    formData.append('address', address);
  }
  
  formData.append('payment_slip', paymentSlip);
  
  try {
    const response = await fetch('/api/documents/request', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showAlert(i18n[currentLang].success.documentRequest, 'success');
      // รีเซ็ตฟอร์ม
      document.getElementById('document-request-form').reset();
      // รอ 2 วินาทีแล้วไปที่หน้าตรวจสอบสถานะ
      setTimeout(() => {
        window.location.href = '/status.html';
      }, 2000);
    } else {
      showAlert(data.message || i18n[currentLang].errors.documentRequestFailed, 'danger');
    }
  } catch (error) {
    console.error('Document request error:', error);
    showAlert(i18n[currentLang].errors.serverError, 'danger');
  }
}

// เพิ่มการฟังเหตุการณ์เมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
  // ตรวจสอบว่ามีการเข้าสู่ระบบหรือไม่
  checkLogin();
  
  // โหลดข้อมูลประเภทเอกสาร
  loadDocumentTypes();
  
  // เพิ่มการฟังเหตุการณ์เมื่อเลือกประเภทเอกสาร
  const documentTypeSelect = document.getElementById('document_type');
  documentTypeSelect.addEventListener('change', calculatePrice);
  
  // เพิ่มการฟังเหตุการณ์เมื่อเลือกวิธีการรับเอกสาร
  const deliveryMethods = document.querySelectorAll('input[name="delivery_method"]');
  deliveryMethods.forEach(method => {
    method.addEventListener('change', () => {
      const addressContainer = document.getElementById('address-container');
      const urgentContainer = document.getElementById('urgent-container');
      
      if (method.value === 'mail') {
        addressContainer.style.display = 'block';
        document.getElementById('address').required = true;
        urgentContainer.style.display = 'none';
        document.getElementById('urgent').checked = false;
      } else {
        addressContainer.style.display = 'none';
        document.getElementById('address').required = false;
        urgentContainer.style.display = 'block';
      }
      
      calculatePrice();
    });
  });
  
  // เพิ่มการฟังเหตุการณ์เมื่อเลือกบริการเร่งด่วน
  const urgentCheckbox = document.getElementById('urgent');
  urgentCheckbox.addEventListener('change', calculatePrice);
  
  // เพิ่มการฟังเหตุการณ์เมื่อส่งฟอร์ม
  const documentRequestForm = document.getElementById('document-request-form');
  documentRequestForm.addEventListener('submit', submitDocumentRequest);
  
  // โหลดข้อมูลบัญชีธนาคาร
  document.getElementById('bank-name').textContent = 'ธนาคารกรุงไทย';
  document.getElementById('account-number').textContent = '1234567890';
  document.getElementById('account-name').textContent = 'มหาวิทยาลัยนอร์ทกรุงเทพ';
});
