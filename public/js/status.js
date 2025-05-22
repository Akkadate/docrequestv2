// ตรวจสอบว่ามีการเข้าสู่ระบบหรือไม่
document.addEventListener('DOMContentLoaded', () => {
  console.log('Status page loaded');
  // ตรวจสอบว่ามีการเข้าสู่ระบบหรือไม่
  checkLogin();
  
  // โหลดคำขอเอกสารทั้งหมดของผู้ใช้
  loadRequestsList();
  
  // เพิ่มการฟังเหตุการณ์สำหรับการค้นหาและการกรอง
  const searchButton = document.getElementById('search-button');
  const searchInput = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');
  
  if (searchButton) {
    searchButton.addEventListener('click', () => {
      loadRequestsList(searchInput?.value, statusFilter?.value);
    });
  }
  
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        loadRequestsList(searchInput.value, statusFilter?.value);
      }
    });
  }
  
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      loadRequestsList(searchInput?.value, statusFilter.value);
    });
  }
  
  // เพิ่มการฟังเหตุการณ์สำหรับการอัปโหลดหลักฐานการชำระเงิน
  const uploadForm = document.getElementById('upload-payment-form');
  if (uploadForm) {
    uploadForm.addEventListener('submit', uploadPaymentSlip);
  }
});

// โหลดรายการคำขอเอกสารทั้งหมดของผู้ใช้
async function loadRequestsList(search = '', status = '') {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    // สร้าง query parameters
    const params = new URLSearchParams();
    params.append('lang', currentLang);
    
    if (search) {
      params.append('search', search);
    }
    
    if (status) {
      params.append('status', status);
    }
    
    // ดึงข้อมูลคำขอเอกสารทั้งหมดของผู้ใช้
    const response = await fetch(`/api/documents/my-requests?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load requests');
    }
    
    const requests = await response.json();
    displayRequestsList(requests);
  } catch (error) {
    console.error('Error loading requests list:', error);
    showAlert(i18n[currentLang]?.errors?.loadRequestsFailed || 'ไม่สามารถโหลดรายการคำขอเอกสาร', 'danger');
  }
}

// แสดงรายการคำขอเอกสาร
function displayRequestsList(requests) {
  const tableBody = document.getElementById('requests-table');
  
  if (!tableBody) {
    console.error('Requests table not found');
    return;
  }
  
  // ล้างข้อมูลเดิม
  tableBody.innerHTML = '';
  
  if (requests.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">${i18n[currentLang]?.status?.noRequests || 'ไม่พบรายการคำขอเอกสาร'}</td>
      </tr>
    `;
    return;
  }
  
  // สร้างแถวสำหรับแต่ละคำขอ
  requests.forEach(request => {
    const row = document.createElement('tr');
    
    // แสดงชื่อเอกสาร
    let documentName = request.document_name;
    
    // กรณีมีหลายรายการ
    if (request.has_multiple_items && request.document_items && request.document_items.length > 0) {
      documentName = `${i18n[currentLang]?.status?.multipleDocuments || 'หลายรายการ'} (${request.document_items.length} ${i18n[currentLang]?.status?.items || 'รายการ'})`;
    }
    
    row.innerHTML = `
      <td>${documentName}</td>
      <td>${formatDate(request.created_at, currentLang)}</td>
      <td>
        ${request.delivery_method === 'pickup' ? 
          (i18n[currentLang]?.request?.pickup || 'รับด้วยตนเอง') : 
          (i18n[currentLang]?.request?.mail || 'รับทางไปรษณีย์')}
        ${request.urgent ? `<span class="badge bg-warning text-dark">${i18n[currentLang]?.request?.urgentLabel || 'เร่งด่วน'}</span>` : ''}
      </td>
      <td>${createStatusBadge(request.status)}</td>
      <td>${formatCurrency(request.total_price, currentLang)}</td>
      <td>
        <button type="button" class="btn btn-sm btn-primary view-details" data-request-id="${request.id}">
          <i class="bi bi-eye"></i> ${i18n[currentLang]?.dashboard?.viewDetails || 'ดูรายละเอียด'}
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
    
    // เพิ่มการฟังเหตุการณ์สำหรับปุ่มดูรายละเอียด
    const viewButton = row.querySelector('.view-details');
    if (viewButton) {
      viewButton.addEventListener('click', () => {
        // เรียกฟังก์ชันโหลดรายละเอียดคำขอเอกสาร
        loadRequestDetails(request.id);
      });
    }
  });
}

// โหลดรายละเอียดคำขอเอกสาร
async function loadRequestDetails(requestId) {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    console.log('Fetching request details for ID:', requestId);
    
    if (!requestId) {
      console.error('No request ID provided');
      return;
    }
    
    // บันทึก ID คำขอไว้ในฟอร์ม
    const paymentRequestIdInput = document.getElementById('payment-request-id');
    if (paymentRequestIdInput) {
      paymentRequestIdInput.value = requestId;
    }
    
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
    
    // แสดง Modal รายละเอียด
    const detailModal = new bootstrap.Modal(document.getElementById('requestDetailModal'));
    if (detailModal) {
      detailModal.show();
    } else {
      console.error('Detail modal not found');
    }
    
    // แสดงรายละเอียดคำขอ
    displayRequestDetails(request);
    
    // โหลดประวัติสถานะ
    await loadStatusHistory(requestId);
  } catch (error) {
    console.error('Error loading request details:', error);
    showAlert(i18n[currentLang]?.errors?.requestNotFound || 'ไม่พบข้อมูลคำขอเอกสาร', 'danger');
  }
}

// โหลดประวัติสถานะ
async function loadStatusHistory(requestId) {
  try {
    const token = localStorage.getItem('token');
    
    console.log('Loading status history for request:', requestId);
    
    const response = await fetch(`/api/documents/request/${requestId}/status-history`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 404) {
      // ถ้า API ยังไม่มี ให้แสดงเฉพาะสถานะปัจจุบัน
      console.warn('Status history endpoint not found, showing current status only');
      displayCurrentStatusOnly();
      return;
    }
    
    if (!response.ok) {
      throw new Error('Failed to load status history');
    }
    
    const history = await response.json();
    console.log('Status history loaded:', history);
    displayStatusHistory(history);
  } catch (error) {
    console.error('Error loading status history:', error);
    // แสดงสถานะปัจจุบันจากข้อมูลคำขอแทน
    displayCurrentStatusOnly();
  }
}

// แสดงประวัติสถานะ
function displayStatusHistory(history) {
  const statusHistoryTable = document.getElementById('status-history-table');
  
  if (!statusHistoryTable) {
    console.warn('Status history table not found');
    return;
  }
  
  statusHistoryTable.innerHTML = '';
  
  if (!history || history.length === 0) {
    // ถ้าไม่มีประวัติ ให้แสดงเฉพาะสถานะปัจจุบัน
    displayCurrentStatusOnly();
    return;
  }
  
  history.forEach((item, index) => {
    const row = document.createElement('tr');
    
    // ไฮไลท์สถานะปัจจุบัน (รายการแรก)
    if (index === 0) {
      row.classList.add('table-active');
    }
    
    row.innerHTML = `
      <td>${formatDate(item.created_at, currentLang)}</td>
      <td>${createStatusBadge(item.status)}</td>
      <td>${item.note || '-'}</td>
    `;
    
    statusHistoryTable.appendChild(row);
  });
}

// แสดงเฉพาะสถานะปัจจุบัน (กรณีไม่มีประวัติจาก API)
function displayCurrentStatusOnly() {
  const statusHistoryTable = document.getElementById('status-history-table');
  if (!statusHistoryTable) return;
  
  // ดึงข้อมูลสถานะปัจจุบันจาก modal
  const currentStatus = document.getElementById('detail-status');
  const currentDate = document.getElementById('detail-updated-at');
  
  if (currentStatus && currentDate) {
    statusHistoryTable.innerHTML = `
      <tr class="table-active">
        <td>${currentDate.textContent}</td>
        <td>${currentStatus.innerHTML}</td>
        <td>-</td>
      </tr>
    `;
  }
}

// แสดงรายละเอียดคำขอเอกสาร
function displayRequestDetails(request) {
  try {
    console.log('Displaying request details:', request);
    
    // ข้อมูลคำขอ
    const detailId = document.getElementById('detail-id');
    if (detailId) detailId.textContent = request.id;
    
    // แสดงข้อมูลเอกสาร
    const detailDocName = document.getElementById('detail-document-name');
    if (detailDocName) {
      if (request.has_multiple_items && request.document_items && request.document_items.length > 0) {
        // กรณีมีหลายรายการ
        const documentItemsHTML = `
          <div class="table-responsive mt-2">
            <table class="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>${i18n[currentLang]?.requestDetail?.documentType || 'ประเภทเอกสาร'}</th>
                  <th>${i18n[currentLang]?.requestDetail?.quantity || 'จำนวน'}</th>
                  <th>${i18n[currentLang]?.requestDetail?.unitPrice || 'ราคาต่อชิ้น'}</th>
                  <th>${i18n[currentLang]?.requestDetail?.subtotal || 'รวม'}</th>
                </tr>
              </thead>
              <tbody>
                ${request.document_items.map(item => `
                  <tr>
                    <td>${item.document_name}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-end">${formatCurrency(item.price_per_unit, currentLang)}</td>
                    <td class="text-end">${formatCurrency(item.subtotal, currentLang)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <th colspan="3" class="text-end">${i18n[currentLang]?.requestDetail?.documentSubtotal || 'รวมค่าเอกสาร'}:</th>
                  <th class="text-end">${formatCurrency(request.document_items.reduce((total, item) => total + parseFloat(item.subtotal), 0))}</th>
                </tr>
                ${request.delivery_method === 'mail' ? `
                  <tr>
                    <th colspan="3" class="text-end">${i18n[currentLang]?.requestDetail?.shippingFee || 'ค่าจัดส่ง'}:</th>
                    <th class="text-end">${formatCurrency(200)}</th>
                  </tr>
                ` : ''}
                ${request.urgent ? `
                  <tr>
                    <th colspan="3" class="text-end">${i18n[currentLang]?.requestDetail?.urgentFee || 'ค่าบริการเร่งด่วน'}:</th>
                    <th class="text-end">${formatCurrency(50 * request.document_items.reduce((count, item) => count + parseInt(item.quantity), 0))}</th>
                  </tr>
                ` : ''}
                <tr>
                  <th colspan="3" class="text-end">${i18n[currentLang]?.requestDetail?.totalPrice || 'ราคารวมทั้งหมด'}:</th>
                  <th class="text-end">${formatCurrency(request.total_price)}</th>
                </tr>
              </tfoot>
            </table>
          </div>
        `;
        
        detailDocName.innerHTML = `${i18n[currentLang]?.status?.multipleDocuments || 'หลายรายการ'} (${request.document_items.length} ${i18n[currentLang]?.status?.items || 'รายการ'}) ${documentItemsHTML}`;
      } else {
        // กรณีมีเอกสารเดียว
        detailDocName.textContent = request.document_name;
      }
    }
    
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
            <p><i class="bi bi-file-earmark-pdf"></i> <a href="${request.payment_slip_url}" target="_blank">${i18n[currentLang]?.requestDetail?.viewPaymentSlip || 'ดูหลักฐานการชำระเงิน'}</a></p>
          `;
        }
        
        if (uploadPaymentContainer) {
          uploadPaymentContainer.style.display = 'none';
        }
      } else {
        detailPaymentSlip.innerHTML = `
          <p class="text-muted">${i18n[currentLang]?.requestDetail?.noPaymentSlip || 'ยังไม่มีหลักฐานการชำระเงิน'}</p>
        `;
        
        // แสดงฟอร์มอัปโหลดหลักฐานการชำระเงินสำหรับคำขอที่อยู่ในสถานะ pending
        if (uploadPaymentContainer && request.status === 'pending') {
          uploadPaymentContainer.style.display = 'block';
        } else if (uploadPaymentContainer) {
          uploadPaymentContainer.style.display = 'none';
        }
      }
    }
    
    // แสดงข้อความตามสถานะ
    displayStatusInfo(request);
    
  } catch (error) {
    console.error('Error in displayRequestDetails:', error);
  }
}

// แสดงข้อความตามสถานะ
function displayStatusInfo(request) {
  const statusInfoContainer = document.getElementById('status-info-container');
  const statusInfoText = document.getElementById('status-info-text');
  
  if (statusInfoContainer && statusInfoText) {
    let infoText = '';
    
    switch (request.status) {
      case 'pending':
        infoText = i18n[currentLang]?.statusInfo?.pending || 'คำขอของคุณอยู่ระหว่างรอการดำเนินการ โปรดรอการตรวจสอบจากเจ้าหน้าที่';
        if (!request.payment_slip_url) {
          infoText += i18n[currentLang]?.statusInfo?.pendingNoPayment || ' กรุณาอัปโหลดหลักฐานการชำระเงินเพื่อดำเนินการต่อ';
        }
        break;
      case 'processing':
        infoText = i18n[currentLang]?.statusInfo?.processing || 'คำขอของคุณกำลังอยู่ระหว่างการดำเนินการ เจ้าหน้าที่กำลังจัดเตรียมเอกสารให้คุณ';
        break;
      case 'ready':
        if (request.delivery_method === 'pickup') {
          infoText = i18n[currentLang]?.statusInfo?.readyPickup || 'เอกสารของคุณพร้อมให้รับแล้ว กรุณาติดต่อรับเอกสารได้ที่สำนักทะเบียนและประมวลผล ชั้น 1 อาคารอำนวยการ';
        } else {
          infoText = i18n[currentLang]?.statusInfo?.readyMail || 'เอกสารของคุณพร้อมสำหรับจัดส่งแล้ว และจะถูกจัดส่งไปยังที่อยู่ที่คุณระบุไว้ในไม่ช้า';
        }
        break;
      case 'completed':
        if (request.delivery_method === 'pickup') {
          infoText = i18n[currentLang]?.statusInfo?.completedPickup || 'คำขอของคุณเสร็จสิ้นแล้ว คุณได้รับเอกสารเรียบร้อยแล้ว';
        } else {
          infoText = i18n[currentLang]?.statusInfo?.completedMail || 'คำขอของคุณเสร็จสิ้นแล้ว เอกสารถูกจัดส่งไปยังที่อยู่ที่คุณระบุไว้เรียบร้อยแล้ว';
        }
        break;
      case 'rejected':
        infoText = i18n[currentLang]?.statusInfo?.rejected || 'คำขอของคุณถูกปฏิเสธ โปรดติดต่อเจ้าหน้าที่เพื่อขอข้อมูลเพิ่มเติม';
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
        loadRequestDetails(requestId);
      }, 1000);
    } else {
      showAlert(data.message || i18n[currentLang]?.errors?.uploadFailed || 'อัปโหลดไม่สำเร็จ', 'danger');
    }
  } catch (error) {
    console.error('Error uploading payment slip:', error);
    showAlert(i18n[currentLang]?.errors?.serverError || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'danger');
  }
}
