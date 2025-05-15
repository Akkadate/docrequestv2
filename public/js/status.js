// ตรวจสอบว่ามีการเข้าสู่ระบบหรือไม่
document.addEventListener('DOMContentLoaded', () => {
  checkLogin();
  loadRequests();
  
  // เพิ่มการฟังเหตุการณ์สำหรับการกรองตามสถานะ
  document.getElementById('status-filter').addEventListener('change', loadRequests);
  
  // เพิ่มการฟังเหตุการณ์สำหรับการค้นหา
  document.getElementById('search-button').addEventListener('click', () => {
    loadRequests(document.getElementById('search-input').value);
  });
  
  // ฟังเหตุการณ์เมื่อกด Enter ในช่องค้นหา
  document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loadRequests(document.getElementById('search-input').value);
    }
  });
  
  // เพิ่มการฟังเหตุการณ์สำหรับการอัปโหลดหลักฐานการชำระเงิน
  document.getElementById('upload-payment-form').addEventListener('submit', uploadPaymentSlip);
});

// โหลดข้อมูลคำขอเอกสาร
async function loadRequests(searchQuery = '') {
  try {
    const token = localStorage.getItem('token');
    const statusFilter = document.getElementById('status-filter').value;
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    let url = `/api/documents/my-requests?lang=${currentLang}`;
    
    // ถ้ามีการกรองตามสถานะ
    if (statusFilter) {
      url += `&status=${statusFilter}`;
    }
    
    // ถ้ามีการค้นหา
    if (searchQuery) {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load requests');
    }
    
    const requests = await response.json();
    displayRequests(requests);
  } catch (error) {
    console.error('Error loading requests:', error);
    showAlert(i18n[currentLang].errors.loadingRequestsFailed, 'danger');
  }
}

// แสดงข้อมูลคำขอเอกสาร
function displayRequests(requests) {
  const requestsTable = document.getElementById('requests-table');
  
  requestsTable.innerHTML = '';
  
  if (requests.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="6" class="text-center" data-i18n="status.noRequests">ไม่พบคำขอเอกสารที่ตรงกับเงื่อนไข</td>
    `;
    requestsTable.appendChild(emptyRow);
    return;
  }
  
  requests.forEach(request => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td data-label="${i18n[currentLang].dashboard.documentType}">${request.document_name}</td>
      <td data-label="${i18n[currentLang].dashboard.requestDate}">${formatDate(request.created_at, currentLang)}</td>
      <td data-label="${i18n[currentLang].dashboard.deliveryMethod}">
        ${request.delivery_method === 'pickup' ? 
          `<span data-i18n="request.pickup">${i18n[currentLang].request.pickup}</span>` : 
          `<span data-i18n="request.mail">${i18n[currentLang].request.mail}</span>`}
        ${request.urgent ? `<span class="badge bg-warning text-dark ms-2" data-i18n="request.urgentLabel">${i18n[currentLang].request.urgentLabel}</span>` : ''}
      </td>
      <td data-label="${i18n[currentLang].dashboard.status}">${createStatusBadge(request.status)}</td>
      <td data-label="${i18n[currentLang].dashboard.price}">${formatCurrency(request.total_price, currentLang)}</td>
      <td data-label="${i18n[currentLang].dashboard.actions}">
        <button class="btn btn-sm btn-primary view-details" data-id="${request.id}" data-bs-toggle="modal" data-bs-target="#requestDetailModal">
          <i class="bi bi-eye"></i> <span data-i18n="dashboard.viewDetails">ดูรายละเอียด</span>
        </button>
      </td>
    `;
    
    requestsTable.appendChild(row);
    
 // เพิ่มการฟังเหตุการณ์สำหรับปุ่มดูรายละเอียด
    row.querySelector('.view-details').addEventListener('click', () => loadRequestDetails(request.id));
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
    
    const response = await fetch(`/api/documents/request/${requestId}?lang=${currentLang}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load request details');
    }
    
    const request = await response.json();
    displayRequestDetails(request);
  } catch (error) {
    console.error('Error loading request details:', error);
    showAlert(i18n[currentLang].errors.requestNotFound, 'danger');
  }
}

// แสดงรายละเอียดคำขอเอกสาร
function displayRequestDetails(request) {
  // ข้อมูลคำขอ
  document.getElementById('detail-id').textContent = request.id;
  document.getElementById('detail-document-name').textContent = request.document_name;
  document.getElementById('detail-delivery-method').textContent = request.delivery_method === 'pickup' ? 
    i18n[currentLang].request.pickup : i18n[currentLang].request.mail;
  
  if (request.urgent) {
    document.getElementById('detail-delivery-method').innerHTML += ` <span class="badge bg-warning text-dark">${i18n[currentLang].request.urgentLabel}</span>`;
  }
  
  document.getElementById('detail-created-at').textContent = formatDate(request.created_at, currentLang);
  document.getElementById('detail-updated-at').textContent = formatDate(request.updated_at, currentLang);
  document.getElementById('detail-status').innerHTML = createStatusBadge(request.status);
  document.getElementById('detail-price').textContent = formatCurrency(request.total_price, currentLang);
  
  // ที่อยู่จัดส่ง (ถ้ามี)
  if (request.delivery_method === 'mail' && request.address) {
    document.getElementById('detail-address-container').style.display = 'block';
    document.getElementById('detail-address').textContent = request.address;
  } else {
    document.getElementById('detail-address-container').style.display = 'none';
  }
  
  // หลักฐานการชำระเงิน
  if (request.payment_slip_url) {
    const fileExtension = request.payment_slip_url.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
      document.getElementById('detail-payment-slip').innerHTML = `
        <img src="${request.payment_slip_url}" alt="Payment Slip" class="img-fluid" style="max-height: 300px;">
      `;
    } else {
      document.getElementById('detail-payment-slip').innerHTML = `
        <p><i class="bi bi-file-earmark-pdf"></i> <a href="${request.payment_slip_url}" target="_blank">ดูหลักฐานการชำระเงิน</a></p>
      `;
    }
    
    document.getElementById('upload-payment-container').style.display = 'none';
  } else {
    document.getElementById('detail-payment-slip').innerHTML = `
      <p class="text-muted">ยังไม่มีหลักฐานการชำระเงิน</p>
    `;
    
    // แสดงฟอร์มอัปโหลดหลักฐานการชำระเงินสำหรับคำขอที่อยู่ในสถานะ pending
    if (request.status === 'pending') {
      document.getElementById('upload-payment-container').style.display = 'block';
      document.getElementById('payment-request-id').value = request.id;
    } else {
      document.getElementById('upload-payment-container').style.display = 'none';
    }
  }
  
  // ประวัติสถานะ
  const statusHistoryTable = document.getElementById('status-history-table');
  statusHistoryTable.innerHTML = '';
  
  // สถานะปัจจุบัน
  const statusRow = document.createElement('tr');
  statusRow.innerHTML = `
    <td>${formatDate(request.updated_at, currentLang)}</td>
    <td>${createStatusBadge(request.status)}</td>
    <td></td>
  `;
  statusHistoryTable.appendChild(statusRow);
  
  // สถานะรอดำเนินการ (เริ่มต้น)
  if (request.status !== 'pending') {
    const pendingRow = document.createElement('tr');
    pendingRow.innerHTML = `
      <td>${formatDate(request.created_at, currentLang)}</td>
      <td>${createStatusBadge('pending')}</td>
      <td></td>
    `;
    statusHistoryTable.appendChild(pendingRow);
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
      showAlert(i18n[currentLang].errors.uploadPaymentSlip, 'danger');
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
      showAlert(i18n[currentLang].success.uploadPaymentSlip, 'success');
      
      // ปิด Modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('requestDetailModal'));
      modal.hide();
      
      // โหลดข้อมูลใหม่
      loadRequests();
    } else {
      showAlert(data.message || i18n[currentLang].errors.uploadFailed, 'danger');
    }
  } catch (error) {
    console.error('Error uploading payment slip:', error);
    showAlert(i18n[currentLang].errors.serverError, 'danger');
  }
}
