// ตรวจสอบว่ามีการเข้าสู่ระบบหรือไม่
document.addEventListener('DOMContentLoaded', () => {
  console.log('Student request detail page loaded');
  // ตรวจสอบว่ามีการเข้าสู่ระบบหรือไม่
  checkLogin();
  // โหลดข้อมูลคำขอเอกสาร
  loadRequestDetails();
  // เพิ่มการฟังเหตุการณ์สำหรับการอัปโหลดหลักฐานการชำระเงิน
  const uploadForm = document.getElementById('upload-payment-form');
  if (uploadForm) {
    uploadForm.addEventListener('submit', uploadPaymentSlip);
  }
});

// โหลดรายละเอียดคำขอเอกสาร
async function loadRequestDetails() {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    // รับ ID คำขอจาก URL
    const urlParams = new URLSearchParams(window.location.search);
    const requestId = urlParams.get('id');
    
    console.log('Request ID:', requestId);
    
    if (!requestId) {
      window.location.href = '/status.html';
      return;
    }
    
    // บันทึก ID คำขอไว้ในฟอร์ม
    const paymentRequestIdInput = document.getElementById('payment-request-id');
    if (paymentRequestIdInput) {
      paymentRequestIdInput.value = requestId;
    }
    
    console.log('Fetching request details...');
    const response = await fetch(`/api/documents/request/${requestId}?lang=${currentLang}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error('Failed to load request details');
    }
    
    const request = await response.json();
    console.log('Request details:', request);
    
    displayRequestDetails(request);
  } catch (error) {
    console.error('Error loading request details:', error);
    showAlert(i18n[currentLang]?.errors?.requestNotFound || 'ไม่พบข้อมูลคำขอเอกสาร', 'danger');
  }
}

// แสดงรายละเอียดคำขอเอกสาร
function displayRequestDetails(request) {
  try {
    console.log('Displaying request details:', request);
    
    // ข้อมูลคำขอ
    const detailId = document.getElementById('detail-id');
    if (detailId) detailId.textContent = request.id;
    
    const detailDocName = document.getElementById('detail-document-name');
    if (detailDocName) detailDocName.textContent = request.document_name;
    
    const detailDeliveryMethod = document.getElementById('detail-delivery-method');
    if (detailDeliveryMethod) {
      detailDeliveryMethod.textContent = request.delivery_method === 'pickup' ? 
        (i18n[currentLang]?.request?.pickup || 'รับด้วยตนเอง') : 
        (i18n[currentLang]?.request?.mail || 'รับทางไปรษณีย์');
    
      if (request.urgent) {
        detailDeliveryMethod.innerHTML += ` <span class="badge bg-warning text-dark">${i18n[currentLang]?.request?.urgentLabel || 'เร่งด่วน'}</span>`;
      }
    }
    
    const detailCreatedAt = document.getElementById('detail-created-at');
    if (detailCreatedAt) detailCreatedAt.textContent = formatDate(request.created_at, currentLang);
    
    const detailUpdatedAt = document.getElementById('detail-updated-at');
    if (detailUpdatedAt) detailUpdatedAt.textContent = formatDate(request.updated_at, currentLang);
    
    const detailStatus = document.getElementById('detail-status');
    if (detailStatus) detailStatus.innerHTML = createStatusBadge(request.status);
    
    const detailPrice = document.getElementById('detail-price');
    if (detailPrice) detailPrice.textContent = formatCurrency(request.total_price, currentLang);
    
    // ที่อยู่จัดส่ง (ถ้ามี)
    const detailAddressContainer = document.getElementById('detail-address-container');
    const detailAddress = document.getElementById('detail-address');
    
    if (detailAddressContainer && detailAddress) {
      if (request.delivery_method === 'mail' && request.address) {
        detailAddressContainer.style.display = 'block';
        detailAddress.textContent = request.address;
      } else {
        detailAddressContainer.style.display = 'none';
      }
    }
    
    // หลักฐานการชำระเงิน
    const detailPaymentSlip = document.getElementById('detail-payment-slip');
    const uploadPaymentContainer = document.getElementById('upload-payment-container');
    
    if (detailPaymentSlip) {
      if (request.payment_slip_url) {
        const fileExtension = request.payment_slip_url.split('.').pop().toLowerCase();
        
        if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
          detailPaymentSlip.innerHTML = `
            <img src="${request.payment_slip_url}" alt="Payment Slip" class="img-fluid" style="max-height: 300px;">
          `;
        } else {
          detailPaymentSlip.innerHTML = `
            <p><i class="bi bi-file-earmark-pdf"></i> <a href="${request.payment_slip_url}" target="_blank">ดูหลักฐานการชำระเงิน</a></p>
          `;
        }
        
        if (uploadPaymentContainer) {
          uploadPaymentContainer.style.display = 'none';
        }
      } else {
        detailPaymentSlip.innerHTML = `
          <p class="text-muted">ยังไม่มีหลักฐานการชำระเงิน</p>
        `;
        
        // แสดงฟอร์มอัปโหลดหลักฐานการชำระเงินสำหรับคำขอที่อยู่ในสถานะ pending
        if (uploadPaymentContainer && request.status === 'pending') {
          uploadPaymentContainer.style.display = 'block';
        } else if (uploadPaymentContainer) {
          uploadPaymentContainer.style.display = 'none';
        }
      }
    }
    
    // ประวัติสถานะ
    const statusHistoryTable = document.getElementById('status-history-table');
    if (statusHistoryTable) {
      statusHistoryTable.innerHTML = '';
      
      // สถานะปัจจุบัน
      const statusRow = document.createElement('tr');
      statusRow.innerHTML = `
        <td>${formatDate(request.updated_at, currentLang)}</td>
        <td>${createStatusBadge(request.status)}</td>
      `;
      statusHistoryTable.appendChild(statusRow);
      
      // สถานะรอดำเนินการ (เริ่มต้น)
      if (request.status !== 'pending') {
        const pendingRow = document.createElement('tr');
        pendingRow.innerHTML = `
          <td>${formatDate(request.created_at, currentLang)}</td>
          <td>${createStatusBadge('pending')}</td>
        `;
        statusHistoryTable.appendChild(pendingRow);
      }
    }
    
    // แสดงข้อความตามสถานะ
    const statusInfoContainer = document.getElementById('status-info-container');
    const statusInfoText = document.getElementById('status-info-text');
    
    if (statusInfoContainer && statusInfoText) {
      let infoText = '';
      
      switch (request.status) {
        case 'pending':
          infoText = 'คำขอของคุณอยู่ระหว่างรอการดำเนินการ โปรดรอการตรวจสอบจากเจ้าหน้าที่';
          if (!request.payment_slip_url) {
            infoText += ' กรุณาอัปโหลดหลักฐานการชำระเงินเพื่อดำเนินการต่อ';
          }
          break;
        case 'processing':
          infoText = 'คำขอของคุณกำลังอยู่ระหว่างการดำเนินการ เจ้าหน้าที่กำลังจัดเตรียมเอกสารให้คุณ';
          break;
        case 'ready':
          if (request.delivery_method === 'pickup') {
            infoText = 'เอกสารของคุณพร้อมให้รับแล้ว กรุณาติดต่อรับเอกสารได้ที่สำนักทะเบียนและประมวลผล ชั้น 1 อาคารอำนวยการ';
          } else {
            infoText = 'เอกสารของคุณพร้อมสำหรับจัดส่งแล้ว และจะถูกจัดส่งไปยังที่อยู่ที่คุณระบุไว้ในไม่ช้า';
          }
          break;
        case 'completed':
          if (request.delivery_method === 'pickup') {
            infoText = 'คำขอของคุณเสร็จสิ้นแล้ว คุณได้รับเอกสารเรียบร้อยแล้ว';
          } else {
            infoText = 'คำขอของคุณเสร็จสิ้นแล้ว เอกสารถูกจัดส่งไปยังที่อยู่ที่คุณระบุไว้เรียบร้อยแล้ว';
          }
          break;
        case 'rejected':
          infoText = 'คำขอของคุณถูกปฏิเสธ โปรดติดต่อเจ้าหน้าที่เพื่อขอข้อมูลเพิ่มเติม';
          break;
        default:
          infoText = '';
      }
      
      if (infoText) {
        statusInfoText.textContent = infoText;
        statusInfoContainer.style.display = 'block';
      } else {
        statusInfoContainer.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error in displayRequestDetails:', error);
  }
}

// อัปโหลดหลักฐานการชำระเงิน
async function uploadPaymentSlip(event) {
  event.preventDefault();
  
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    const requestId = document.getElementById('payment-request-id').value;
    const paymentSlip = document.getElementById('payment-slip').files[0];
    
    if (!paymentSlip) {
      showAlert(i18n[currentLang]?.errors?.uploadPaymentSlip || 'กรุณาอัปโหลดหลักฐานการชำระเงิน', 'danger');
      return;
    }
    
    const formData = new FormData();
    formData.append('payment_slip', paymentSlip);
    
    const response = await fetch(`/api/documents/upload-payment/${requestId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showAlert(i18n[currentLang]?.success?.uploadPaymentSlip || 'อัปโหลดหลักฐานการชำระเงินสำเร็จ', 'success');
      
      // โหลดข้อมูลใหม่
      setTimeout(() => {
        loadRequestDetails();
      }, 1000);
    } else {
      showAlert(data.message || i18n[currentLang]?.errors?.uploadFailed || 'อัปโหลดไม่สำเร็จ', 'danger');
    }
  } catch (error) {
    console.error('Error uploading payment slip:', error);
    showAlert(i18n[currentLang]?.errors?.serverError || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'danger');
  }
}

// สร้าง badge แสดงสถานะ
function createStatusBadge(status) {
  const statusClass = `status-${status}`;
  const statusText = translateStatus(status, currentLang);
  
  return `<span class="status-badge ${statusClass}">${statusText}</span>`;
}

// แปลงสถานะเป็นข้อความภาษาไทย
function translateStatus(status, lang = 'th') {
  const statusTranslations = {
    'pending': {
      'th': 'รอดำเนินการ',
      'en': 'Pending',
      'zh': '待处理'
    },
    'processing': {
      'th': 'กำลังดำเนินการ',
      'en': 'Processing',
      'zh': '处理中'
    },
    'ready': {
      'th': 'พร้อมจัดส่ง/รับเอกสาร',
      'en': 'Ready',
      'zh': '准备好了'
    },
    'completed': {
      'th': 'เสร็จสิ้น',
      'en': 'Completed',
      'zh': '已完成'
    },
    'rejected': {
      'th': 'ถูกปฏิเสธ',
      'en': 'Rejected',
      'zh': '被拒绝'
    }
  };
  
  return statusTranslations[status]?.[lang] || status;
}

// แปลงวันที่เป็นรูปแบบที่อ่านง่าย
function formatDate(dateString, lang = 'th') {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  try {
    return date.toLocaleDateString(getLocale(lang), options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

// รับ locale ตามภาษา
function getLocale(lang) {
  const locales = {
    'th': 'th-TH',
    'en': 'en-US',
    'zh': 'zh-CN'
  };
  
  return locales[lang] || 'th-TH';
}

// แปลงตัวเลขเป็นรูปแบบเงิน
function formatCurrency(amount, lang = 'th') {
  if (amount === undefined || amount === null) return '-';
  
  const currencies = {
    'th': 'THB',
    'en': 'THB',
    'zh': 'THB'
  };
  
  try {
    const formatter = new Intl.NumberFormat(getLocale(lang), {
      style: 'currency',
      currency: currencies[lang],
      minimumFractionDigits: 2
    });
    
    return formatter.format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${amount} บาท`;
  }
}

// แสดงข้อความแจ้งเตือน
function showAlert(message, type = 'success') {
  const alertContainer = document.getElementById('alert-container');
  
  if (!alertContainer) {
    console.error('Alert container not found');
    return;
  }
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.role = 'alert';
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  alertContainer.innerHTML = '';
  alertContainer.appendChild(alert);
  
  // ซ่อนข้อความแจ้งเตือนหลังจาก 5 วินาที
  setTimeout(() => {
    const alertElement = document.querySelector('.alert');
    if (alertElement) {
      alertElement.remove();
    }
  }, 5000);
}
