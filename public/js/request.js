// ตัวแปรสำหรับเก็บรายการเอกสารที่เลือก
let selectedDocuments = [];
let documentTypes = [];

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

// อัปเดตตารางเอกสารที่เลือก
function updateDocumentTable() {
  const tableBody = document.getElementById('selected-documents');
  
  if (!tableBody) {
    console.error('Selected documents table not found');
    return;
  }
  
  // ล้างตารางเดิม
  tableBody.innerHTML = '';
  
  if (selectedDocuments.length === 0) {
    // ถ้าไม่มีเอกสารที่เลือก
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="5" class="text-center">${i18n[currentLang]?.request?.noDocumentsSelected || 'ยังไม่ได้เลือกเอกสาร'}</td>
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
    
    // เพิ่มจำนวน
    if (increaseBtn) {
      increaseBtn.addEventListener('click', () => {
        doc.quantity++;
        doc.subtotal = doc.quantity * doc.price;
        updateDocumentTable();
        calculatePrice();
      });
    }
    
    // เปลี่ยนจำนวนโดยตรง
    if (quantityInput) {
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
    }
    
    // ลบเอกสาร
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        selectedDocuments.splice(index, 1);
        updateDocumentTable();
        calculatePrice();
      });
    }
  });
}


// แก้ไขฟังก์ชัน calculatePrice ใหม่ทั้งหมด
function calculatePrice() {
  try {
    console.clear(); // ล้าง console เพื่อดูข้อมูลเฉพาะการคำนวณครั้งล่าสุด
    console.log('==== CALCULATE PRICE FUNCTION CALLED ====');
    
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
    documentSubtotal = selectedDocuments.reduce((total, doc) => total + doc.subtotal, 0);
    console.log('Document subtotal:', documentSubtotal);
    
    // ตรวจสอบวิธีการรับเอกสาร
    const deliveryMethodElement = document.querySelector('input[name="delivery_method"]:checked');
    if (!deliveryMethodElement) {
      console.error('Error: No delivery method selected');
      return;
    }
    
    const deliveryMethod = deliveryMethodElement.value;
    console.log('Delivery method:', deliveryMethod);
    
    // ค่าจัดส่งทางไปรษณีย์
    if (deliveryMethod === 'mail') {
      shippingFee = 200; // ค่าจัดส่ง 200 บาท
      console.log('Shipping fee (mail):', shippingFee);
      
      if (shippingFeeContainer) {
        shippingFeeContainer.style.display = 'flex';
        console.log('Displayed shipping fee container');
      }
    } else {
      shippingFee = 0;
      if (shippingFeeContainer) {
        shippingFeeContainer.style.display = 'none';
        console.log('Hidden shipping fee container');
      }
    }
    
    // ตรวจสอบบริการเร่งด่วน
    const urgentCheckbox = document.getElementById('urgent');
    if (!urgentCheckbox) {
      console.error('Error: Urgent checkbox not found');
      return;
    }
    
    const isUrgent = urgentCheckbox.checked;
    console.log('Is urgent service selected:', isUrgent);
    
    // นับจำนวนเอกสารทั้งหมด
    const totalDocuments = selectedDocuments.reduce((count, doc) => count + doc.quantity, 0);
    console.log('Total document quantity:', totalDocuments);
    
    if (isUrgent && deliveryMethod === 'pickup') {
      // คำนวณค่าบริการเร่งด่วนเป็น 50 บาทต่อฉบับ
      urgentFee = 50 * totalDocuments;
      console.log(`🔴 Urgent fee calculation: ${totalDocuments} documents x 50 baht = ${urgentFee} baht`);
      
      if (urgentFeeContainer) {
        urgentFeeContainer.style.display = 'flex';
        console.log('Displayed urgent fee container');
        
        if (urgentFeeElement) {
          // แสดงค่าบริการเร่งด่วน
          urgentFeeElement.textContent = formatCurrency(urgentFee, currentLang);
          console.log('Updated urgent fee element text to:', urgentFeeElement.textContent);
        } else {
          console.error('Error: Urgent fee element not found');
        }
      } else {
        console.error('Error: Urgent fee container not found');
      }
    } else {
      urgentFee = 0;
      console.log('Urgent fee is 0 (service not selected or mail delivery)');
      
      if (urgentFeeContainer) {
        urgentFeeContainer.style.display = 'none';
        console.log('Hidden urgent fee container');
      }
    }
    
    // คำนวณราคารวมทั้งหมด
    totalPrice = documentSubtotal + shippingFee + urgentFee;
    console.log('Total price calculation:', documentSubtotal, '+', shippingFee, '+', urgentFee, '=', totalPrice);
    
    // อัปเดตการแสดงผล
    documentsSubtotalElement.textContent = formatCurrency(documentSubtotal, currentLang);
    console.log('Updated documents subtotal display:', documentsSubtotalElement.textContent);
    
    if (shippingFeeElement) {
      shippingFeeElement.textContent = formatCurrency(shippingFee, currentLang);
      console.log('Updated shipping fee display:', shippingFeeElement.textContent);
    }
    
    if (urgentFeeElement) {
      urgentFeeElement.textContent = formatCurrency(urgentFee, currentLang);
      console.log('Updated urgent fee display:', urgentFeeElement.textContent);
    }
    
    totalPriceElement.textContent = formatCurrency(totalPrice, currentLang);
    console.log('Updated total price display:', totalPriceElement.textContent);
    
    // อัปเดตสรุปรายการ
    updateSummary(deliveryMethod, isUrgent, totalDocuments);
    console.log('Summary updated');
    
    // แสดง debug info เพิ่มเติม
    console.log('==== CALCULATION COMPLETE ====');
    console.log('Selected documents:', selectedDocuments);
    console.log('Total document count:', totalDocuments);
    console.log('Price breakdown:', {
      documentSubtotal,
      shippingFee,
      urgentFee,
      totalPrice
    });
    
    return {
      documentSubtotal,
      shippingFee,
      urgentFee,
      totalPrice,
      totalDocuments
    };
  } catch (error) {
    console.error('Error in calculatePrice function:', error);
  }
}

// แก้ไขฟังก์ชัน updateSummary ด้วย
function updateSummary(deliveryMethod, isUrgent) {
  try {
    console.log('updateSummary called with:', { deliveryMethod, isUrgent });
    
    const summaryContainer = document.getElementById('summary-container');
    
    if (!summaryContainer) {
      console.error('Summary container not found');
      return;
    }
    
    if (selectedDocuments.length === 0) {
      // ใช้คำแปลตามภาษาปัจจุบัน
      summaryContainer.innerHTML = `<p>${i18n[currentLang]?.request?.emptySelection || 'กรุณาเลือกประเภทเอกสารและวิธีการรับเอกสาร'}</p>`;
      return;
    }
    
    // นับจำนวนเอกสารทั้งหมด
    const totalDocuments = selectedDocuments.reduce((count, doc) => count + doc.quantity, 0);
    console.log('Total documents in updateSummary:', totalDocuments);
    
    // สร้างข้อความสรุปรายการ
    let summaryHTML = `
      <div class="mb-3">
        <strong>${i18n[currentLang]?.request?.documentType || 'ประเภทเอกสาร'}:</strong>
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
      console.log('🔴 Urgent fee in summary:', urgentFee, '(', totalDocuments, 'x 50)');
      
      summaryHTML += `
        <div class="mb-3">
          <strong>${i18n[currentLang]?.request?.urgentService || 'บริการเร่งด่วน'}:</strong>
          <div>${formatCurrency(urgentFee, currentLang)} (${totalDocuments} ฉบับ x 50 บาท)</div>
        </div>
      `;
    }
    
    summaryContainer.innerHTML = summaryHTML;
    console.log('Summary updated successfully');
  } catch (error) {
    console.error('Error in updateSummary function:', error);
  }
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
  
  console.log('Submitting request with prices:', { 
    documentsSubtotal, 
    shippingFee, 
    urgentFee, 
    totalDocuments, 
    urgent, 
    deliveryMethod 
  });
  
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
});

