// ตัวแปรสำหรับเก็บรายการเอกสารที่เลือก
let selectedDocuments = [];
let documentTypes = [];

// ฟังก์ชันตรวจสอบว่าเป็นอุปกรณ์มือถือหรือไม่
function isMobileDevice() {
  return window.innerWidth <= 576;
}

// ฟังก์ชันสร้าง quantity control ที่เหมาะสมกับอุปกรณ์
function createQuantityControl(doc, index) {
  if (isMobileDevice()) {
    // สำหรับมือถือ: แสดงตัวเลขและปุ่มแก้ไข
    return `
      <div class="quantity-display">
        <span class="quantity-number" id="qty-${index}">${doc.quantity}</span>
        <button type="button" class="btn btn-outline-primary btn-sm edit-quantity-btn" 
                data-index="${index}" data-bs-toggle="modal" data-bs-target="#editQuantityModal">
          <i class="bi bi-pencil"></i>
        </button>
      </div>
    `;
  } else {
    // สำหรับ PC: แสดง input group ปกติ
    return `
      <div class="input-group input-group-sm">
        <button type="button" class="btn btn-outline-secondary decrease-quantity" data-index="${index}">-</button>
        <input type="number" class="form-control quantity-input text-center" value="${doc.quantity}" min="1" data-index="${index}">
        <button type="button" class="btn btn-outline-secondary increase-quantity" data-index="${index}">+</button>
      </div>
    `;
  }
}

// ฟังก์ชันสำหรับตั้งค่า quantity controls บน PC
function setupDesktopQuantityControls(row, doc, index) {
  const decreaseBtn = row.querySelector('.decrease-quantity');
  const increaseBtn = row.querySelector('.increase-quantity');
  const quantityInput = row.querySelector('.quantity-input');
  
  if (decreaseBtn) {
    decreaseBtn.addEventListener('click', () => {
      if (doc.quantity > 1) {
        doc.quantity--;
        doc.subtotal = doc.quantity * doc.price;
        updateDocumentTable();
        calculatePrice();
      }
    });
  }
  
  if (increaseBtn) {
    increaseBtn.addEventListener('click', () => {
      doc.quantity++;
      doc.subtotal = doc.quantity * doc.price;
      updateDocumentTable();
      calculatePrice();
    });
  }
  
  if (quantityInput) {
    quantityInput.addEventListener('change', () => {
      const newQuantity = parseInt(quantityInput.value);
      if (!isNaN(newQuantity) && newQuantity > 0) {
        doc.quantity = newQuantity;
        doc.subtotal = doc.quantity * doc.price;
        updateDocumentTable();
        calculatePrice();
      } else {
        quantityInput.value = doc.quantity;
      }
    });
  }
}

// ฟังก์ชันสำหรับตั้งค่า Modal แก้ไขจำนวนบนมือถือ
function setupEditQuantityModal(index, doc) {
  // ตั้งค่าข้อมูลใน Modal
  document.getElementById('edit-quantity-input').value = doc.quantity;
  document.getElementById('edit-quantity-document-name').textContent = doc.name;
  
  // เก็บ index ไว้ใน Modal
  document.getElementById('editQuantityModal').setAttribute('data-index', index);
}

// ฟังก์ชันสำหรับบันทึกจำนวนใหม่จาก Modal
function saveQuantityFromModal() {
  const modal = document.getElementById('editQuantityModal');
  const index = parseInt(modal.getAttribute('data-index'));
  const newQuantity = parseInt(document.getElementById('edit-quantity-input').value);
  
  if (!isNaN(newQuantity) && newQuantity > 0 && selectedDocuments[index]) {
    selectedDocuments[index].quantity = newQuantity;
    selectedDocuments[index].subtotal = selectedDocuments[index].quantity * selectedDocuments[index].price;
    updateDocumentTable();
    calculatePrice();
    
    // ปิด Modal
    const modalInstance = bootstrap.Modal.getInstance(modal);
    if (modalInstance) {
      modalInstance.hide();
    }
  }
}

// ปรับปรุงฟังก์ชัน loadDocumentTypes เพื่อเพิ่ม debug logs
async function loadDocumentTypes() {
  try {
    console.log('Loading document types, current language:', currentLang);
    const response = await fetch(`/api/documents/types?lang=${currentLang}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load document types: ${response.status} ${response.statusText}`);
    }
    
    documentTypes = await response.json();
    console.log('Loaded document types:', documentTypes);
    
    // เพิ่มรายการประเภทเอกสารในหน้าต่าง Modal
    const modalDocumentTypeSelect = document.getElementById('modal-document-type');
    
    if (modalDocumentTypeSelect) {
      console.log('Found modal-document-type, populating options');
      // ล้างตัวเลือกเดิม
      modalDocumentTypeSelect.innerHTML = '';
      
      // เพิ่มตัวเลือกเริ่มต้น
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.disabled = true;
      defaultOption.selected = true;
      
      // ใช้ข้อความที่เหมาะสมกับภาษาปัจจุบัน
      if (i18n[currentLang] && i18n[currentLang].request && i18n[currentLang].request.selectDocumentType) {
        defaultOption.textContent = i18n[currentLang].request.selectDocumentType;
      } else {
        defaultOption.textContent = 'เลือกประเภทเอกสาร';
        console.warn(`Translation for 'request.selectDocumentType' not found in language ${currentLang}`);
      }
      
      modalDocumentTypeSelect.appendChild(defaultOption);
      
      // เพิ่มรายการประเภทเอกสาร
      if (documentTypes && documentTypes.length > 0) {
        documentTypes.forEach(type => {
          const option = document.createElement('option');
          option.value = type.id;
          option.textContent = type.name;
          option.dataset.price = type.price;
          modalDocumentTypeSelect.appendChild(option);
        });
        
        console.log('Added document types to select:', modalDocumentTypeSelect.options.length - 1);
      } else {
        console.warn('No document types found in response');
      }
    } else {
      console.error('Modal document type select element not found');
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
  const quantityInput = document.getElementById('modal-document-quantity');
  
  if (!documentTypeSelect || !quantityInput) {
    console.error('Form elements not found');
    return;
  }
  
  const quantity = parseInt(quantityInput.value);
  
  if (!documentTypeSelect.value || isNaN(quantity) || quantity < 1) {
    // แสดงข้อความแจ้งเตือนใน Modal
    const modalAlertContainer = document.getElementById('modal-alert-container');
    if (modalAlertContainer) {
      modalAlertContainer.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
          ${i18n[currentLang]?.errors?.selectDocumentType || 'กรุณาเลือกประเภทเอกสารและระบุจำนวน'}
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
      `;
    }
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
  if (modal) {
    modal.hide();
  }
  
  // รีเซ็ตฟอร์มใน Modal
  const addDocumentForm = document.getElementById('add-document-form');
  if (addDocumentForm) {
    addDocumentForm.reset();
  }
  
  // อัปเดตตารางและราคา
  updateDocumentTable();
  calculatePrice();
}

// แก้ไขส่วนนี้ในไฟล์ request.js

// แก้ไขส่วนนี้ในไฟล์ request.js

// อัปเดตตารางเอกสารที่เลือก - แก้ไขใหม่เพื่อรองรับมือถือ
function updateDocumentTable() {
  const tableBody = document.getElementById('selected-documents');
  
  if (!tableBody) {
    console.error('Selected documents table not found');
    return;
  }
  
  // ล้างตารางเดิม
  tableBody.innerHTML = '';
  
  if (selectedDocuments.length === 0) {
    // ถ้าไม่มีเอกสารที่เลือก - ใช้วิธีเข้าถึง i18n ที่ถูกต้อง
    const emptyRow = document.createElement('tr');
    
    // ดึงภาษาปัจจุبันจาก localStorage
    const currentLanguage = localStorage.getItem('language') || 'th';
    
    // ตรวจสอบว่ามี window.i18n หรือไม่
    let noDocumentsText = 'ยังไม่ได้เลือกเอกสาร'; // ค่าเริ่มต้น
    
    if (window.i18n && window.i18n[currentLanguage] && window.i18n[currentLanguage].request) {
      noDocumentsText = window.i18n[currentLanguage].request.noDocumentsSelected || noDocumentsText;
    }
    
    emptyRow.innerHTML = `
      <td colspan="5" class="text-center">${noDocumentsText}</td>
    `;
    tableBody.appendChild(emptyRow);
    return;
  }
  
  // เพิ่มแถวสำหรับเอกสารที่เลือกแต่ละรายการ
  selectedDocuments.forEach((doc, index) => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${doc.name}</td>
      <td>${formatCurrency(doc.price, localStorage.getItem('language') || 'th')}</td>
      <td>
        ${createQuantityControl(doc, index)}
      </td>
      <td>${formatCurrency(doc.subtotal, localStorage.getItem('language') || 'th')}</td>
      <td>
        <button type="button" class="btn btn-outline-danger btn-sm remove-document" data-index="${index}">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
    
    // เพิ่ม event listeners ตามประเภทของ control
    if (isMobileDevice()) {
      // สำหรับมือถือ: เพิ่ม listener สำหรับปุ่มแก้ไข
      const editBtn = row.querySelector('.edit-quantity-btn');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          setupEditQuantityModal(index, doc);
        });
      }
    } else {
      // สำหรับ PC: เพิ่ม listeners ปกติ
      setupDesktopQuantityControls(row, doc, index);
    }
    
    // ปุ่มลบ (ใช้ได้ทั้ง PC และมือถือ)
    const removeBtn = row.querySelector('.remove-document');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        selectedDocuments.splice(index, 1);
        updateDocumentTable();
        calculatePrice();
      });
    }
  });
}

// คำนวณราคาทั้งหมด - แก้ไขใหม่
function calculatePrice() {
  try {
    // รับอิลิเมนต์แสดงราคาต่างๆ
    const documentsSubtotalElement = document.getElementById('documents-subtotal');
    const shippingFeeElement = document.getElementById('shipping-fee');
    const urgentFeeElement = document.getElementById('urgent-fee');
    const totalPriceElement = document.getElementById('total-price');
    const shippingFeeContainer = document.getElementById('shipping-fee-container');
    const urgentFeeContainer = document.getElementById('urgent-fee-container');
    
    if (!documentsSubtotalElement || !totalPriceElement) {
      console.error('Error: Price display elements not found');
      return;
    }
    
    // ตัวแปรเก็บราคา
    let documentSubtotal = 0;
    let shippingFee = 0;
    let urgentFee = 0;
    let totalPrice = 0;
    
    // คำนวณราคาเอกสารรวม
    if (selectedDocuments && selectedDocuments.length > 0) {
      documentSubtotal = selectedDocuments.reduce((total, doc) => total + doc.subtotal, 0);
    }

    // เพิ่มบรรทัดนี้ในส่วนต้นของฟังก์ชัน calculatePrice()
console.log('calculatePrice called, selectedDocuments:', selectedDocuments);

    
    // ตรวจสอบวิธีการรับเอกสาร
    const deliveryMethodElement = document.querySelector('input[name="delivery_method"]:checked');
    if (!deliveryMethodElement) {
      console.error('Error: No delivery method selected');
      return;
    }
    
    const deliveryMethod = deliveryMethodElement.value;
    
    // ค่าจัดส่งทางไปรษณีย์
    if (deliveryMethod === 'mail') {
      shippingFee = 200; // ค่าจัดส่ง 200 บาท
      
      if (shippingFeeContainer) {
        shippingFeeContainer.style.display = 'flex';
      }
    } else {
      shippingFee = 0;
      if (shippingFeeContainer) {
        shippingFeeContainer.style.display = 'none';
      }
    }
    
    // ตรวจสอบบริการเร่งด่วน
    const urgentCheckbox = document.getElementById('urgent');
    if (!urgentCheckbox) {
      console.error('Error: Urgent checkbox not found');
      return;
    }
    
    const isUrgent = urgentCheckbox.checked;
    
    // นับจำนวนเอกสารทั้งหมด
    let totalDocuments = 0;
    if (selectedDocuments && selectedDocuments.length > 0) {
      totalDocuments = selectedDocuments.reduce((count, doc) => count + doc.quantity, 0);
    }
    
    if (isUrgent && deliveryMethod === 'pickup') {
      // คำนวณค่าบริการเร่งด่วนเป็น 50 บาทต่อฉบับ
      urgentFee = 50 * totalDocuments;
      
      if (urgentFeeContainer) {
        urgentFeeContainer.style.display = 'flex';
      }
    } else {
      urgentFee = 0;
      if (urgentFeeContainer) {
        urgentFeeContainer.style.display = 'none';
      }
    }

    // เพิ่มบรรทัดนี้หลังจากคำนวณค่าบริการเร่งด่วน
console.log('Urgent fee calculation:', totalDocuments, 'documents x 50 =', urgentFee);

    
    // คำนวณราคารวมทั้งหมด
    totalPrice = documentSubtotal + shippingFee + urgentFee;
    
    // อัปเดตการแสดงผล
    documentsSubtotalElement.textContent = formatCurrency(documentSubtotal, currentLang);
    
    if (shippingFeeElement) {
      shippingFeeElement.textContent = formatCurrency(shippingFee, currentLang);
    }
    
    if (urgentFeeElement) {
      urgentFeeElement.textContent = formatCurrency(urgentFee, currentLang);
    }
    
    totalPriceElement.textContent = formatCurrency(totalPrice, currentLang);
    
    // อัปเดตสรุปรายการ
    updateSummary(deliveryMethod, isUrgent);

    // เพิ่มบรรทัดนี้ในส่วนท้ายของฟังก์ชัน calculatePrice()
console.log('Final prices:', {documentSubtotal, shippingFee, urgentFee, totalPrice});
    
  } catch (error) {
    console.error('Error in calculatePrice function:', error);
  }
}

// อัปเดตสรุปรายการ - แก้ไขใหม่
function updateSummary(deliveryMethod, isUrgent) {
  try {
    const summaryContainer = document.getElementById('summary-container');
    
    if (!summaryContainer) {
      console.error('Summary container not found');
      return;
    }
    
    if (!selectedDocuments || selectedDocuments.length === 0) {
      // ใช้คำแปลตามภาษาปัจจุบัน
      summaryContainer.innerHTML = `<p>${i18n[currentLang]?.request?.emptySelection || 'กรุณาเลือกประเภทเอกสารและวิธีการรับเอกสาร'}</p>`;
      return;
    }
    
    // นับจำนวนเอกสารทั้งหมด
    const totalDocuments = selectedDocuments.reduce((count, doc) => count + doc.quantity, 0);
    
    // สร้างข้อความสรุปรายการ
    let summaryHTML = `
      <div class="mb-3">
        <strong>${i18n[currentLang]?.request?.documentType || 'ประเภทเอกสาร'}:</strong>
        <ul class="mb-0">
    `;
    
    // เพิ่มรายการเอกสารแต่ละรายการ
    selectedDocuments.forEach(doc => {
      summaryHTML += `<li>${doc.name} ( x ${doc.quantity} ) = ${formatCurrency(doc.subtotal, currentLang)}</li>`;
    });
    
    summaryHTML += `
        </ul>
      </div>
    `;
    
    // วิธีการรับเอกสาร
    summaryHTML += `
      <div class="mb-3">
        <strong>${i18n[currentLang]?.request?.deliveryMethod || 'วิธีการรับเอกสาร'}:</strong>
        <div>${deliveryMethod === 'pickup' ? 
          (i18n[currentLang]?.request?.pickup || 'รับด้วยตนเอง') : 
          (i18n[currentLang]?.request?.mail || 'รับทางไปรษณีย์')}</div>
    `;
    
    // ค่าจัดส่ง (ถ้ามี)
    if (deliveryMethod === 'mail') {
      summaryHTML += `<div>${i18n[currentLang]?.request?.shippingFee || 'ค่าจัดส่ง'}: ${formatCurrency(200, currentLang)}</div>`;
    }
    
    summaryHTML += `</div>`;
    
    // บริการเร่งด่วน (ถ้ามี)
    if (isUrgent && deliveryMethod === 'pickup') {
      const urgentFee = 50 * totalDocuments; // 50 บาท x จำนวนเอกสารทั้งหมด
      
      summaryHTML += `
        <div class="mb-3">
          <strong>${i18n[currentLang]?.request?.urgentService || 'บริการเร่งด่วน'}:</strong>
          <div>${formatCurrency(urgentFee, currentLang)} ( ${totalDocuments} x 50 )</div>
        </div>
      `;
    }
    
    summaryContainer.innerHTML = summaryHTML;
  } catch (error) {
    console.error('Error in updateSummary function:', error);
  }
}

// ส่งคำขอเอกสาร - แก้ไขเล็กน้อย
async function submitDocumentRequest(event) {
  event.preventDefault();
  
  // ตรวจสอบว่ามีการเข้าสู่ระบบหรือไม่
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }
  
  // ตรวจสอบว่ามีการเลือกเอกสารหรือไม่
  if (!selectedDocuments || selectedDocuments.length === 0) {
    showAlert(i18n[currentLang]?.errors?.selectDocumentType || 'กรุณาเลือกประเภทเอกสารและระบุจำนวน', 'danger');
    return;
  }
  
  // รับข้อมูลจากฟอร์ม
  const deliveryMethod = document.querySelector('input[name="delivery_method"]:checked').value;
  const address = document.getElementById('address')?.value || '';
  const urgent = document.getElementById('urgent')?.checked || false;
  const paymentSlip = document.getElementById('payment_slip')?.files[0];
  
  // ตรวจสอบว่าได้กรอกที่อยู่หรือไม่ (ถ้าเลือกส่งทางไปรษณีย์)
  if (deliveryMethod === 'mail' && !address) {
    showAlert(i18n[currentLang]?.errors?.enterAddress || 'กรุณากรอกที่อยู่สำหรับจัดส่ง', 'danger');
    return;
  }
  
  // ตรวจสอบว่ามีการแนบหลักฐานการชำระเงินหรือไม่
  if (!paymentSlip) {
    showAlert(i18n[currentLang]?.errors?.uploadPaymentSlip || 'กรุณาอัปโหลดหลักฐานการชำระเงิน', 'danger');
    return;
  }
  
  // คำนวณราคารวมของเอกสารทั้งหมด
  const documentsSubtotal = selectedDocuments.reduce((total, doc) => total + doc.subtotal, 0);
  
  // คำนวณค่าจัดส่ง (ถ้ามี)
  const shippingFee = deliveryMethod === 'mail' ? 200 : 0;
  
  // คำนวณค่าบริการเร่งด่วน (ถ้ามี)
  const totalDocuments = selectedDocuments.reduce((count, doc) => count + doc.quantity, 0);
  const urgentFee = (urgent && deliveryMethod === 'pickup') ? 50 * totalDocuments : 0;
  
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
    
    // เพิ่มรายละเอียดการคำนวณราคา
    formData.append('price_details', JSON.stringify({
      documentsSubtotal: documentsSubtotal,
      shippingFee: shippingFee,
      urgentFee: urgentFee,
      totalDocuments: totalDocuments,
      totalPrice: totalPrice
    }));
    
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
      showAlert(i18n[currentLang]?.success?.documentRequest || 'สร้างคำขอเอกสารสำเร็จ', 'success');
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
      showAlert(data.message || i18n[currentLang]?.errors?.documentRequestFailed || 'เกิดข้อผิดพลาดในการสร้างคำขอเอกสาร', 'danger');
    }
  } catch (error) {
    console.error('Document request error:', error);
    showAlert(i18n[currentLang]?.errors?.serverError || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'danger');
  }
}

// เพิ่มการฟังเหตุการณ์เมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded, initializing...');
  
  // ตรวจสอบว่ามีการเข้าสู่ระบบหรือไม่
  checkLogin();
  
  // โหลดข้อมูลประเภทเอกสาร
  loadDocumentTypes();
  
  // ตั้งค่าปุ่มเพิ่มเอกสาร
  const addDocumentButton = document.getElementById('add-document-button');
  if (addDocumentButton) {
    addDocumentButton.addEventListener('click', addDocumentToSelection);
    console.log('Add document button listener added');
  } else {
    console.warn('Element with id "add-document-button" not found');
  }
  
  // เพิ่มการฟังเหตุการณ์เมื่อเลือกวิธีการรับเอกสาร
  const deliveryMethods = document.querySelectorAll('input[name="delivery_method"]');
  if (deliveryMethods && deliveryMethods.length > 0) {
    deliveryMethods.forEach(method => {
      method.addEventListener('change', () => {
        console.log('Delivery method changed to:', method.value);
        
        const addressContainer = document.getElementById('address-container');
        const urgentContainer = document.getElementById('urgent-container');
        
        if (addressContainer && urgentContainer) {
          if (method.value === 'mail') {
            addressContainer.style.display = 'block';
            if (document.getElementById('address')) {
              document.getElementById('address').required = true;
            }
            urgentContainer.style.display = 'none';
            if (document.getElementById('urgent')) {
              document.getElementById('urgent').checked = false;
            }
          } else {
            addressContainer.style.display = 'none';
            if (document.getElementById('address')) {
              document.getElementById('address').required = false;
            }
            urgentContainer.style.display = 'block';
          }
        }
        
        calculatePrice();
      });
    });
    console.log('Delivery method listeners added');
  } else {
    console.warn('No delivery method inputs found');
  }
  
  // เพิ่มการฟังเหตุการณ์เมื่อเลือกบริการเร่งด่วน
  const urgentCheckbox = document.getElementById('urgent');
  if (urgentCheckbox) {
    urgentCheckbox.addEventListener('change', () => {
      console.log('Urgent checkbox changed. New state:', urgentCheckbox.checked);
      calculatePrice();
    });
    console.log('Urgent checkbox listener added');
  } else {
    console.warn('Element with id "urgent" not found');
  }
  
  // เพิ่มการฟังเหตุการณ์เมื่อส่งฟอร์ม
  const documentRequestForm = document.getElementById('document-request-form');
  if (documentRequestForm) {
    documentRequestForm.addEventListener('submit', submitDocumentRequest);
    console.log('Document request form listener added');
  } else {
    console.warn('Element with id "document-request-form" not found');
  }
  
  // เพิ่ม event listener สำหรับการเปลี่ยนขนาดหน้าจอ
  window.addEventListener('resize', () => {
    updateDocumentTable(); // อัปเดตตารางเมื่อขนาดหน้าจอเปลี่ยน
  });
  
  // ตั้งค่า Modal controls สำหรับมือถือ
  setupMobileModalControls();
  
  // โหลดข้อมูลบัญชีธนาคาร
  const bankNameElement = document.getElementById('bank-name');
  const accountNumberElement = document.getElementById('account-number');
  const accountNameElement = document.getElementById('account-name');
  
  if (bankNameElement) bankNameElement.textContent = 'ธนาคารกรุงไทย';
  if (accountNumberElement) accountNumberElement.textContent = '1234567890';
  if (accountNameElement) accountNameElement.textContent = 'มหาวิทยาลัยนอร์ทกรุงเทพ';
  
  // เริ่มแสดงตารางเอกสารที่ว่าง
  updateDocumentTable();
  
  console.log('Initialization complete');
  
  // ยกเลิกใช้สคริปต์ฉุกเฉินใน HTML โดยทำให้ตัวแปรเป็น global
  window.selectedDocuments = selectedDocuments;
  window.calculatePrice = calculatePrice;
  window.updateDocumentTable = updateDocumentTable;
  window.updateSummary = updateSummary;
  window.formatCurrency = formatCurrency;
  window.currentLang = currentLang;
  window.saveQuantityFromModal = saveQuantityFromModal;
});

// ฟังก์ชันตั้งค่า Modal controls สำหรับมือถือ
function setupMobileModalControls() {
  // เพิ่ม Modal สำหรับแก้ไขจำนวนบนมือถือ (ถ้ายังไม่มี)
  if (!document.getElementById('editQuantityModal')) {
    const modalHTML = `
      <!-- Modal แก้ไขจำนวนเอกสาร (สำหรับมือถือ) -->
      <div class="modal fade" id="editQuantityModal" tabindex="-1" aria-labelledby="editQuantityModalLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-info text-white">
              <h5 class="modal-title" id="editQuantityModalLabel" data-i18n="request.editQuantity">แก้ไขจำนวนเอกสาร</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label"><strong data-i18n="request.documentName">ชื่อเอกสาร:</strong></label>
                <p id="edit-quantity-document-name" class="text-muted"></p>
              </div>
              <div class="mb-3">
                <label for="edit-quantity-input" class="form-label" data-i18n="request.quantity">จำนวน:</label>
                <div class="row align-items-center">
                  <div class="col-4">
                    <button type="button" class="btn btn-outline-secondary w-100" id="modal-decrease-btn">
                      <i class="bi bi-dash-lg"></i>
                    </button>
                  </div>
                  <div class="col-4">
                    <input type="number" class="form-control text-center" id="edit-quantity-input" min="1" value="1" style="font-size: 18px; font-weight: bold;">
                  </div>
                  <div class="col-4">
                    <button type="button" class="btn btn-outline-secondary w-100" id="modal-increase-btn">
                      <i class="bi bi-plus-lg"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" data-i18n="request.cancel">ยกเลิก</button>
              <button type="button" class="btn btn-primary" onclick="saveQuantityFromModal()" data-i18n="request.save">บันทึก</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // เพิ่ม Modal ลงใน DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
  
  // ตั้งค่า event listeners สำหรับปุ่ม +/- ใน Modal
  const modalDecreaseBtn = document.getElementById('modal-decrease-btn');
  const modalIncreaseBtn = document.getElementById('modal-increase-btn');
  const editQuantityInput = document.getElementById('edit-quantity-input');
  
  if (modalDecreaseBtn) {
    modalDecreaseBtn.addEventListener('click', function() {
      const currentValue = parseInt(editQuantityInput.value) || 1;
      if (currentValue > 1) {
        editQuantityInput.value = currentValue - 1;
      }
    });
  }
  
  if (modalIncreaseBtn) {
    modalIncreaseBtn.addEventListener('click', function() {
      const currentValue = parseInt(editQuantityInput.value) || 1;
      editQuantityInput.value = currentValue + 1;
    });
  }
}

// เพิ่ม CSS สำหรับมือถือ
const mobileCSSStyle = document.createElement('style');
mobileCSSStyle.textContent = `
  /* CSS สำหรับ quantity display บนมือถือ */
  @media (max-width: 576px) {
    .quantity-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    .quantity-number {
      font-size: 18px;
      font-weight: bold;
      color: #0d6efd;
      min-width: 30px;
      text-align: center;
      background-color: #f8f9fa;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #dee2e6;
    }
    
    .edit-quantity-btn {
      padding: 4px 8px;
      font-size: 12px;
      border-radius: 4px;
    }
    
    /* ปรับคอลัมน์จำนวนให้กว้างขึ้นบนมือถือ */
    #document-selection-table th:nth-child(3),
    #document-selection-table td:nth-child(3) {
      width: 30%;
    }
    
    #document-selection-table th:nth-child(1),
    #document-selection-table td:nth-child(1) {
      width: 25%;
    }
  }
`;

document.head.appendChild(mobileCSSStyle);
