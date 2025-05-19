// ตรวจสอบว่าเป็นผู้ดูแลระบบหรือไม่
document.addEventListener('DOMContentLoaded', () => {
  checkAdmin();
  loadRequestDetails();
  setupStatusUpdate();
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
    
    if (!requestId) {
      window.location.href = 'requests.html';
      return;
    }
    
    // บันทึก ID คำขอไว้ในฟอร์ม
    document.getElementById('request-id').value = requestId;
    
    // โหลดข้อมูลคำขอ
    const response = await fetch(`/api/admin/request/${requestId}?lang=${currentLang}`, {
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
    showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลคำขอเอกสาร', 'danger');
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
  
  // ข้อมูลนักศึกษา
  document.getElementById('detail-student-name').textContent = request.full_name;
  document.getElementById('detail-student-id').textContent = request.student_id;
  document.getElementById('detail-student-email').textContent = request.email;
  document.getElementById('detail-student-phone').textContent = request.phone;
  document.getElementById('detail-student-faculty').textContent = request.faculty;
  
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
  } else {
    document.getElementById('detail-payment-slip').innerHTML = `
      <p class="text-muted">ยังไม่มีหลักฐานการชำระเงิน</p>
    `;
  }
  
  // ตั้งค่าสถานะปัจจุบันในฟอร์ม
  document.getElementById('status').value = request.status;
}

// ตั้งค่าการอัปเดตสถานะ
function setupStatusUpdate() {
  const updateStatusButton = document.getElementById('update-status-button');
  
  if (updateStatusButton) {
    updateStatusButton.addEventListener('click', updateRequestStatus);
  }
}

// อัปเดตสถานะคำขอเอกสาร
async function updateRequestStatus() {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    const requestId = document.getElementById('request-id').value;
    const status = document.getElementById('status').value;
    const note = document.getElementById('status-note').value;
    
    const response = await fetch(`/api/admin/request/${requestId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status, note })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showAlert(i18n[currentLang].success.updateStatus, 'success');
      
      // โหลดข้อมูลใหม่
      setTimeout(() => {
        loadRequestDetails();
      }, 1000);
    } else {
      showAlert(data.message || i18n[currentLang].errors.updateStatusFailed, 'danger');
    }
  } catch (error) {
    console.error('Error updating request status:', error);
    showAlert(i18n[currentLang].errors.serverError, 'danger');
  }
}
