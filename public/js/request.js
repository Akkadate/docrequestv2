// ตัวแปรสำหรับเก็บรายการเอกสารที่เลือก
let selectedDocuments = [];
let documentTypes = [];

// โหลดข้อมูลประเภทเอกสาร
async function loadDocumentTypes() {
  try {
    const response = await fetch(`/api/documents/types?lang=${currentLang}`);
    documentTypes = await response.json();
    
    // เพิ่มรายการประเภทเอกสารในหน้าต่าง Modal
    const modalDocumentTypeSelect = document.getElementById('modal-document-type');
    
    if (modalDocumentTypeSelect) {
      // ล้างตัวเลือกเดิม
      modalDocumentTypeSelect.innerHTML = '';
      
      // เพิ่มตัวเลือกเริ่มต้น
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.disabled = true;
      defaultOption.selected = true;
      defaultOption.textContent = i18n[currentLang].request.selectDocumentType;
      modalDocumentTypeSelect.appendChild(defaultOption);
      
      // เพิ่มรายการประเภทเอกสาร
      documentTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        option.dataset.price = type.price;
        modalDocumentTypeSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading document types:', error);
    showAlert('ไม่สามารถโหลดข้อมูลประเภทเอกสารได้', 'danger');
  }
}

// เพิ่มเอกสารที่เลือกลงในตาราง
function addDocumentToSelection() {
  // รับข้อมูลจาก Modal
  const documentTypeSelect = document.getElementById('modal-document-type');
  const quantity = parseInt(document.getElementById('modal-document-quantity').value);
  
  if (!documentTypeSelect.value || isNaN(quantity) || quantity < 1) {
    showAlert(i18n[currentLang].errors.selectDocumentType, 'danger');
    return;
  }
  
  const selectedOption = documentTypeSelect.options[documentTypeSelect.selectedIndex];
  const documentId = documentTypeSelect.value;
  const documentName = selectedOption.textContent;
  const documentPrice = parseFloat(selectedOption.dataset.price);
  
  // ตรวจสอบว่าเอกสารนี้ถูกเลือกไปแล้วหรือไม่
  const existingDocument = selectedDocuments.find(doc => doc.id === documentId);
  
  if (existingDocument) {
    // ถ้ามีอยู่แล้ว ให้เพิ่มจำนวน
    existingDocument.quantity += quantity;
    existingDocument.subtotal = existingDocument.quantity * existingDocument.price;
  } else {
    // ถ้ายังไม่มี ให้เพิ่มใหม่
    selectedDocuments.push({
      id: documentId,
      name: documentName,
      price: documentPrice,
      quantity: quantity,
      subtotal: documentPrice * quantity
    });
  }
  
  // ปิด Modal
  const modal = bootstrap.Modal.getInstance(document.getElementById('addDocumentModal'));
  modal.hide();
  
  // รีเซ็ตฟอร์มใน Modal
  document.getElementById('add-document-form').reset();
  
  // อัปเดตตารางและราคา
  updateDocumentTable();
  calculatePrice();
}

// อัปเดตตารางเอกสารที่เลือก
function updateDocumentTable() {
  const tableBody = document.getElementById('selected-documents');
  
  // ล้างตารางเดิม
  tableBody.innerHTML = '';
  
  if (selectedDocuments.length === 0) {
    // ถ้าไม่มีเอกสารที่เลือก
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="5" class="text-center" data-i18n="request.noDocumentsSelected">ยังไม่ได้เลือกเอกสาร</td>
    `;
    tableBody.appendChild(emptyRow);
    return;
  }
  
  // เพิ่มแถวสำหรับเอกสารที่เลือกแต่ละรายการ
  selectedDocuments.forEach((doc, index) => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${doc.name}</td>
      <td>${formatCurrency(doc.price, currentLang)}</td>
      <td>
        <div class="input-group input-group-sm">
          <button type="button" class="btn btn-outline-secondary decrease-quantity" data-index="${index}">-</button>
          <input type="number" class="form-control quantity-input text-center" value="${doc.quantity}" min="1" data-index="${index}">
          <button type="button" class="btn btn-outline-secondary increase-quantity" data-index="${index}">+</button>
        </div>
      </td>
      <td>${formatCurrency(doc.subtotal, currentLang)}</td>
      <td>
        <button type="button" class="btn btn-outline-danger btn-sm remove-document" data-index="${index}">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
    
    // เพิ่มการฟังเหตุการณ์สำหรับปุ่มและช่อง input
    const decreaseBtn = row.querySelector('.decrease-quantity');
    const increaseBtn = row.querySelector('.increase-quantity');
    const quantityInput = row.querySelector('.quantity-input');
    const removeBtn = row.querySelector('.remove-document');
    
    // ลดจำนวน
    decreaseBtn.addEventListener('click', () => {
      if (doc.quantity > 1) {
        doc.quantity--;
        doc.subtotal = doc.quantity * doc.price;
        updateDocumentTable();
        calculatePrice();
      }
    });
    
    // เพิ่มจำนวน
    increaseBtn.addEventListener('click', () => {
      doc.quantity++;
      doc.subtotal = doc.quantity * doc.price;
      updateDocumentTable();
      calculatePrice();
    });
    
    // เปลี่ยนจำนวนโดยตรง
    quantityInput.addEventListener('change', () => {
      const newQuantity = parseInt(quantityInput.value);
      if (!isNaN(newQuantity) && newQuantity > 0) {
        doc.quantity = newQuantity;
        doc.subtotal = doc.quantity * doc.price;
        updateDocumentTable();
        calculatePrice();
      } else {
        // ถ้าค่าไม่ถูกต้อง ให้กลับไปใช้ค่าเดิม
        quantityInput.value = doc.quantity;
      }
    });
    
    // ลบเอกสาร
    removeBtn.addEventListener('click', () => {
      selectedDocuments.splice(index, 1);
      updateDocumentTable();
      calculatePrice();
    });
  });
}

// คำนวณราคาทั้งหมด
function calculatePrice() {
  let documentSubtotal = 0;
  let shippingFee = 0;
  let urgentFee = 0;
  let totalPrice = 0;
  
  // คำนวณราคาเอกสารรวม
  documentSubtotal = selectedDocuments.reduce((total, doc) => total + doc.subtotal, 0);
  
  // ตรวจสอบวิธีการรับเอกสาร
  const deliveryMethod = document.querySelector('input[name="delivery_method"]:checked').value;
  
  // ค่าจัดส่งทางไปรษณีย์
  if (deliveryMethod === 'mail') {
    shippingFee = 200; // ค่าจัดส่ง 200 บาท
    document.getElementById('shipping-fee-container').style.display = 'flex';
  } else {
    document.getElementById('shipping-fee-container').style.display = 'none';
  }
  
  // ตรวจสอบบริการเร่งด่วน
  const isUrgent = document.getElementById('urgent').checked;
  
  if (isUrgent && deliveryMethod === 'pickup') {
    urgentFee = 50; // ค่าบริการเร่งด่วนเพิ่ม 50 บาท
    document.getElementById('urgent-fee-container').style.display = 'flex';
  } else {
    document.getElementById('urgent-fee-container').style.display = 'none';
  }
  
  // คำนวณราคารวมทั้งหมด
  totalPrice = documentSubtotal + shippingFee + urgentFee;
  
  // อัปเดตการแสดงผล
  document.getElementById('documents-subtotal').textContent = formatCurrency(documentSubtotal, currentLang);
  document.getElementById('shipping-fee').textContent = formatCurrency(shippingFee, currentLang);
  document.getElementById('urgent-fee').textContent = formatCurrency(urgentFee, currentLang);
  document.getElementById('total-price').textContent = formatCurrency(totalPrice, currentLang);
  
  // อัปเดตสรุปรายการ
  updateSummary(deliveryMethod, isUrgent);
}

// อัปเดตสรุปรายการ
function updateSummary(deliveryMethod, isUrgent) {
  const summaryContainer = document.getElementById('summary-container');
  
  if (selectedDocuments.length === 0) {
    summaryContainer.innerHTML = `<p>${i18n[currentLang].request.emptySelection}</p>`;
    return;
  }
  
  // สร้างข้อความสรุปรายการ
  let summaryHTML = `
    <div class="mb-3">
      <strong>${i18n[currentLang].request.documentType}:</strong>
      <ul class="mb-0">
  `;
  
  // เพิ่มรายการเอกสารแต่ละรายการ
  selectedDocuments.forEach(doc => {
    summaryHTML += `<li>${doc.name} (${doc.quantity} ฉบับ) - ${formatCurrency(doc.subtotal, currentLang)}</li>`;
  });
  
  summaryHTML += `
      </ul>
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
  
  // ตรวจสอบว่ามีการเลือกเอกสารหรือไม่
  if (selectedDocuments.length === 0) {
    showAlert(i18n[currentLang].errors.selectDocumentType, 'danger');
    return;
  }
  
  // รับข้อมูลจากฟอร์ม
  const deliveryMethod = document.querySelector('input[name="delivery_method"]:checked').value;
  const address = document.getElementById('address').value;
  const urgent = document.getElementById('urgent').checked;
  const paymentSlip = document.getElementById('payment_slip').files[0];
  
  // ตรวจสอบว่าได้กรอกที่อยู่หรือไม่ (ถ้าเลือกส่งทางไปรษณีย์)
  if (deliveryMethod === 'mail' && !address) {
    showAlert(i18n[currentLang].errors.enterAddress, 'danger');
    return;
  }
  
  // ตรวจสอบว่ามีการแนบหลักฐานการชำระเงินหรือไม่
  if (!paymentSlip) {
    showAlert(i18n[currentLang].errors.uploadPaymentSlip, 'danger');
    return;
  }
  
  // คำนวณราคารวมของเอกสารทั้งหมด
  const documentsSubtotal = selectedDocuments.reduce((total, doc) => total + doc.subtotal, 0);
  
  // คำนวณค่าจัดส่ง (ถ้ามี)
  const shippingFee = deliveryMethod === 'mail' ? 200 : 0;
  
  // คำนวณค่าบริการเร่งด่วน (ถ้ามี)
  const urgentFee = (urgent && deliveryMethod === 'pickup') ? 50 : 0;
  
  // คำนวณราคารวมทั้งหมด
  const totalPrice = documentsSubtotal + shippingFee + urgentFee;
  
  try {
    // สร้าง FormData สำหรับส่งไฟล์
    const formData = new FormData();
    
    // เพิ่มข้อมูลทั่วไป
    formData.append('documents', JSON.stringify(selectedDocuments));
    formData.append('delivery_method', deliveryMethod);
    formData.append('urgent', urgent);
    formData.append('total_price', totalPrice);
    
    // เพิ่มที่อยู่ (ถ้ามี)
    if (deliveryMethod === 'mail') {
      formData.append('address', address);
    }
    
    // เพิ่มไฟล์หลักฐานการชำระเงิน
    formData.append('payment_slip', paymentSlip);
    
    // ส่งคำขอไปยังเซิร์ฟเวอร์
    const response = await fetch('/api/documents/request-multiple', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showAlert(i18n[currentLang].success.documentRequest, 'success');
      // รีเซ็ตฟอร์มและรายการเอกสารที่เลือก
      document.getElementById('document-request-form').reset();
      selectedDocuments = [];
      updateDocumentTable();
      calculatePrice();
      
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
  
  // ตั้งค่าปุ่มเพิ่มเอกสาร
  const addDocumentButton = document.getElementById('add-document-button');
  if (addDocumentButton) {
    addDocumentButton.addEventListener('click', addDocumentToSelection);
  }
  
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
  if (urgentCheckbox) {
    urgentCheckbox.addEventListener('change', calculatePrice);
  }
  
  // เพิ่มการฟังเหตุการณ์เมื่อส่งฟอร์ม
  const documentRequestForm = document.getElementById('document-request-form');
  if (documentRequestForm) {
    documentRequestForm.addEventListener('submit', submitDocumentRequest);
  }
  
  // โหลดข้อมูลบัญชีธนาคาร
  document.getElementById('bank-name').textContent = 'ธนาคารกรุงไทย';
  document.getElementById('account-number').textContent = '1234567890';
  document.getElementById('account-name').textContent = 'มหาวิทยาลัยนอร์ทกรุงเทพ';
  
  // เริ่มแสดงตารางเอกสารที่ว่าง
  updateDocumentTable();
});
