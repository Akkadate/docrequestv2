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
      window.location.href = '../login.html';
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
    console.log('Request data loaded:', request);
    displayRequestDetails(request);
    
    // โหลดประวัติสถานะ
    await loadStatusHistory(requestId);
  } catch (error) {
    console.error('Error loading request details:', error);
    showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลคำขอเอกสาร', 'danger');
  }
}

// โหลดประวัติสถานะ
async function loadStatusHistory(requestId) {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`/api/admin/request/${requestId}/status-history`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load status history');
    }
    
    const history = await response.json();
    displayStatusHistory(history);
  } catch (error) {
    console.error('Error loading status history:', error);
    // ไม่แสดงข้อผิดพลาดถ้าโหลดประวัติไม่ได้ แต่แสดงข้อความว่าไม่มีประวัติ
    document.getElementById('no-history-message').style.display = 'block';
  }
}

// แสดงประวัติสถานะ
function displayStatusHistory(history) {
  const statusHistoryTable = document.getElementById('status-history-table');
  const noHistoryMessage = document.getElementById('no-history-message');
  
  if (!statusHistoryTable) return;
  
  statusHistoryTable.innerHTML = '';
  
  if (!history || history.length === 0) {
    noHistoryMessage.style.display = 'block';
    return;
  }
  
  noHistoryMessage.style.display = 'none';
  
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
      <td>${item.created_by_name || 'ระบบ'}</td>
    `;
    
    statusHistoryTable.appendChild(row);
  });
}

// แก้ไขโค้ดในฟังก์ชัน displayRequestDetails ในไฟล์ request-detail.js
function displayRequestDetails(request) {
  // ข้อมูลคำขอพื้นฐาน
  document.getElementById('detail-id').textContent = request.id;
  
  // แสดงข้อมูลเอกสาร - ตรวจสอบว่ามีหลายรายการหรือไม่
  if (request.has_multiple_items && request.document_items && request.document_items.length > 0) {
    console.log('Document has multiple items:', request.document_items);
    
    // กรณีมีหลายรายการ - สร้างตารางแสดงรายการ
    const documentItemsHTML = `
      <div class="table-responsive mt-2">
        <table class="table table-sm table-bordered">
          <thead>
            <tr>
              <th>${i18n[currentLang]?.requestDetail?.documentType || 'ประเภทเอกสาร'}</th>
              <th class="text-center">${i18n[currentLang]?.requestDetail?.quantity || 'จำนวน'}</th>
              <th class="text-end">${i18n[currentLang]?.requestDetail?.unitPrice || 'ราคาต่อชิ้น'}</th>
              <th class="text-end">${i18n[currentLang]?.requestDetail?.subtotal || 'รวม'}</th>
            </tr>
          </thead>
          <tbody>
            ${request.document_items.map(item => `
              <tr>
                <td>${item.document_name}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-end">${formatCurrency(item.price_per_unit)}</td>
                <td class="text-end">${formatCurrency(item.subtotal)}</td>
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
    
    document.getElementById('detail-document-name').innerHTML = `
      <span class="fw-bold">${i18n[currentLang]?.requestDetail?.multipleItems || 'หลายรายการ'} (${request.document_items.length} ${i18n[currentLang]?.requestDetail?.items || 'รายการ'})</span>
      ${documentItemsHTML}
    `;
  } else {
    // กรณีมีเอกสารเดียว
    document.getElementById('detail-document-name').textContent = request.document_name || 'ไม่ระบุ';
  }
  
  // ข้อมูลวิธีรับเอกสาร
  let deliveryMethodText = request.delivery_method === 'pickup' ? 
    (i18n[currentLang]?.request?.pickup || 'รับด้วยตนเอง') : 
    (i18n[currentLang]?.request?.mail || 'รับทางไปรษณีย์');
  
  document.getElementById('detail-delivery-method').textContent = deliveryMethodText;
  
  // เพิ่มแสดงป้ายเร่งด่วน (ถ้ามี)
  if (request.urgent) {
    document.getElementById('detail-delivery-method').innerHTML = deliveryMethodText + 
      ` <span class="badge bg-warning text-dark">${i18n[currentLang]?.request?.urgentLabel || 'เร่งด่วน'}</span>`;
  }
  
  // วันที่ขอและวันที่อัปเดตล่าสุด
  document.getElementById('detail-created-at').textContent = formatDate(request.created_at);
  document.getElementById('detail-updated-at').textContent = formatDate(request.updated_at);
  
  // สถานะคำขอและราคารวม
  document.getElementById('detail-status').innerHTML = createStatusBadge(request.status);
  document.getElementById('detail-price').textContent = formatCurrency(request.total_price);
  
  // ข้อมูลนักศึกษา
  const studentInfoElements = {
    'detail-student-name': request.full_name || '',
    'detail-student-id': request.student_id || '',
    'detail-student-email': request.email || '',
    'detail-student-phone': request.phone || '',
    'detail-student-faculty': request.faculty || ''
  };
  
  Object.keys(studentInfoElements).forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = studentInfoElements[id];
    }
  });
  
   // แสดงวันเดือนปีเกิด
  const studentBirthDateElement = document.getElementById('detail-student-birth-date');
  if (studentBirthDateElement) {
    if (request.birth_date) {
      // แปลงวันที่จาก ISO format
      const birthDate = new Date(request.birth_date);
      console.log('Student birth date raw:', request.birth_date, 'Parsed:', birthDate);
      
      const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Bangkok'
      };

      const formattedDate = birthDate.toLocaleDateString('th-TH', options);
      console.log('Formatted student birth date:', formattedDate);
      
      studentBirthDateElement.textContent = formattedDate;
    } else {
      studentBirthDateElement.textContent = '-';
    }
  }

   
   // แสดงหมายเลขบัตรประชาชน/Passport
  const studentIdNumberElement = document.getElementById('detail-student-id-number');
  if (studentIdNumberElement) {
    if (request.id_number) {
      console.log('Student ID Number raw:', request.id_number);
      
      // ซ่อนบางส่วนของหมายเลขเพื่อความปลอดภัย
      const maskedIdNumber = maskIdNumber(request.id_number);
      console.log('Masked Student ID Number:', maskedIdNumber);
      
      studentIdNumberElement.textContent = maskedIdNumber;
      studentIdNumberElement.title = 'คลิกเพื่อดูหมายเลขเต็ม';
      studentIdNumberElement.style.cursor = 'pointer';
      
      // เพิ่มการคลิกเพื่อแสดงหมายเลขเต็ม
      studentIdNumberElement.addEventListener('click', function() {
        if (this.textContent === maskedIdNumber) {
          this.textContent = request.id_number;
          this.title = 'คลิกเพื่อซ่อนหมายเลข';
        } else {
          this.textContent = maskedIdNumber;
          this.title = 'คลิกเพื่อดูหมายเลขเต็ม';
        }
      });
    } else {
      console.log('No student ID number found');
      studentIdNumberElement.textContent = '-';
    }
  }
  
  
 
  
   
  // ที่อยู่จัดส่ง (ถ้ามี)
  if (request.delivery_method === 'mail' && request.address) {
    document.getElementById('detail-address-container').style.display = 'block';
    document.getElementById('detail-address').textContent = request.address;
    const studentNameInAddressElement = document.getElementById('detail-student-name-address');
    if (studentNameInAddressElement) {
      studentNameInAddressElement.textContent = request.full_name || '';
    }
  } else {
    document.getElementById('detail-address-container').style.display = 'none';
  }
  
  // หลักฐานการชำระเงิน
  if (request.payment_slip_url) {
    const fileExtension = request.payment_slip_url.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
      document.getElementById('detail-payment-slip').innerHTML = `
        <img src="${request.payment_slip_url}" alt="Payment Slip" class="img-fluid" style="max-height: 300px; cursor: pointer" 
        onclick="showImageModal('${request.payment_slip_url}')">
      `;
    } else {
      document.getElementById('detail-payment-slip').innerHTML = `
        <p><i class="bi bi-file-earmark-pdf"></i> <a href="${request.payment_slip_url}" target="_blank">${i18n[currentLang]?.requestDetail?.viewPaymentSlip || 'ดูหลักฐานการชำระเงิน'}</a></p>
      `;
    }
  } else {
    document.getElementById('detail-payment-slip').innerHTML = `
      <p class="text-muted">${i18n[currentLang]?.requestDetail?.noPaymentSlip || 'ยังไม่มีหลักฐานการชำระเงิน'}</p>
    `;
  }
  
  // ตั้งค่าสถานะปัจจุบันในฟอร์ม
  document.getElementById('status').value = request.status;
  
  // ล้างหมายเหตุเดิม
  document.getElementById('status-note').value = '';
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
      window.location.href = '../login.html';
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
      showAlert(i18n[currentLang]?.success?.updateStatus || 'อัปเดตสถานะสำเร็จ', 'success');
      
      // ล้างฟอร์มหมายเหตุ
      document.getElementById('status-note').value = '';
      
      // โหลดข้อมูลใหม่
      setTimeout(() => {
        loadRequestDetails();
      }, 1000);
    } else {
      showAlert(data.message || i18n[currentLang]?.errors?.updateStatusFailed || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ', 'danger');
    }
  } catch (error) {
    console.error('Error updating request status:', error);
    showAlert(i18n[currentLang]?.errors?.serverError || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'danger');
  }
}

// แสดงรูปภาพในโมดัล
function showImageModal(imageUrl) {
  const modalImage = document.getElementById('modalImage');
  if (modalImage) {
    modalImage.src = imageUrl;
    
    // เปิดโมดัล
    const imageModal = new bootstrap.Modal(document.getElementById('imageModal'));
    imageModal.show();
  }
}


// อัปเดตฟังก์ชัน printReceipt ในไฟล์ request-detail.js
function printReceipt() {
  try {
    // ดึงข้อมูลจาก DOM
    const requestId = document.getElementById('detail-id').textContent;
    
    // ดึงข้อมูลนักศึกษา
    const studentNameElement = document.getElementById('detail-student-name');
    const studentIdElement = document.getElementById('detail-student-id');
    
    const studentName = studentNameElement ? studentNameElement.textContent : '';
    const studentId = studentIdElement ? studentIdElement.textContent : '';
    const createdAt = document.getElementById('detail-created-at').textContent;
    const totalPrice = document.getElementById('detail-price').textContent;
    
    // ดึงข้อมูลวิธีการรับเอกสาร
    let deliveryMethod = document.getElementById('detail-delivery-method').textContent;
    // ตัดข้อความ "เร่งด่วน" ออกจากวิธีการรับเอกสาร (หากมี)
    deliveryMethod = deliveryMethod.replace(/เร่งด่วน/g, '').trim();
    
    // สร้างหน้าต่างใหม่สำหรับพิมพ์
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    // ดึงตารางรายการเอกสาร
    const documentTableHTML = document.querySelector('#detail-document-name table');
    let documentListHTML = '';
    
    if (documentTableHTML) {
      // มีหลายรายการ (ในรูปแบบตาราง)
      documentListHTML = `
        <table class="document-items">
          <thead>
            <tr>
              <th>ประเภทเอกสาร</th>
              <th>จำนวน</th>
              <th>ราคาต่อชิ้น</th>
              <th>รวม</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      // ดึงข้อมูลจากแถวของตาราง
      const rows = documentTableHTML.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
          documentListHTML += `
            <tr>
              <td>${cells[0].textContent}</td>
              <td class="quantity">${cells[1].textContent}</td>
              <td class="price">${cells[2].textContent}</td>
              <td class="subtotal">${cells[3].textContent}</td>
            </tr>
          `;
        }
      });
      
      // ดึงข้อมูลจาก tfoot (ราคารวม)
      const footerRows = documentTableHTML.querySelectorAll('tfoot tr');
      if (footerRows.length > 0) {
        documentListHTML += `</tbody><tfoot>`;
        
        footerRows.forEach(row => {
          const cells = row.querySelectorAll('th');
          if (cells.length >= 2) {
            documentListHTML += `
              <tr>
                <th colspan="3" style="text-align: right;">${cells[0].textContent}</th>
                <th style="text-align: right;">${cells[1].textContent}</th>
              </tr>
            `;
          }
        });
        
        documentListHTML += `</tfoot>`;
      }
      
      documentListHTML += `</table>`;
    } else {
      // มีเอกสารเดียว
      const documentName = document.getElementById('detail-document-name').textContent;
      documentListHTML = `<p>${documentName}</p>`;
    }
    
    // สร้าง HTML สำหรับพิมพ์
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>ใบรับคำขอเอกสาร #${requestId}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');
          body {
            font-family: 'Prompt', sans-serif;
            font-size: 14px;
            line-height: 1.5;
            margin: 0;
            padding: 20px;
          }
          .receipt {
            border: 1px solid #ddd;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #0d6efd;
            padding-bottom: 15px;
          }
          .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 10px;
          }
          h1 {
            font-size: 22px;
            margin: 0;
            color: #0d6efd;
          }
          h2 {
            font-size: 16px;
            margin: 0 0 5px 0;
            color: #333;
          }
          p {
            margin: 0 0 5px 0;
          }
          .info {
            margin-bottom: 20px;
          }
          .info-group {
            margin-bottom: 15px;
          }
          .contact {
            border-top: 1px solid #ddd;
            padding-top: 15px;
            margin-top: 20px;
            font-size: 12px;
            text-align: center;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          .total {
            text-align: right;
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
          }
          .signature {
            width: 45%;
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #000;
            margin-top: 50px;
            display: inline-block;
            width: 80%;
          }
          .document-items {
            width: 100%;
            margin-bottom: 15px;
            border-collapse: collapse;
          }
          .document-items th {
            background-color: #f2f2f2;
            text-align: center;
            padding: 8px;
            border: 1px solid #ddd;
          }
          .document-items td {
            padding: 8px;
            border: 1px solid #ddd;
          }
          .document-items td.quantity, 
          .document-items td.price, 
          .document-items td.subtotal,
          .document-items th:nth-child(2), 
          .document-items th:nth-child(3), 
          .document-items th:nth-child(4) {
            text-align: right;
          }
          .document-items tfoot th {
            text-align: right;
            font-weight: bold;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
            .receipt {
              border: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <img src="../img/logo.png" alt="Logo" class="logo">
            <h1>ใบรับคำขอเอกสาร</h1>
            <h2>สำนักทะเบียนและประมวลผล มหาวิทยาลัยนอร์ทกรุงเทพ</h2>
          </div>
          
          <div class="info">
            <div class="info-group">
              <p><strong>เลขที่คำขอ:</strong> ${requestId}</p>
              <p><strong>วันที่ขอ:</strong> ${createdAt}</p>
            </div>
            
            <div class="info-group">
              <p><strong>ชื่อนักศึกษา:</strong> ${studentName}</p>
              <p><strong>รหัสนักศึกษา:</strong> ${studentId}</p>
            </div>
            
            <div class="info-group">
              <p><strong>รายการเอกสารที่ขอ:</strong></p>
              ${documentListHTML}
            </div>
            
            <div class="info-group">
              <p><strong>วิธีการรับเอกสาร:</strong> ${deliveryMethod}</p>
              <p><strong>ราคารวม:</strong> ${totalPrice}</p>
            </div>
          </div>
          
          <div class="footer">
            <div class="signature">
              <div class="signature-line"></div>
              <p>ลายมือชื่อนักศึกษา</p>
            </div>
            
            <div class="signature">
              <div class="signature-line"></div>
              <p>ลายมือชื่อเจ้าหน้าที่</p>
            </div>
          </div>
          
          <div class="contact">
            <p>มหาวิทยาลัยนอร์ทกรุงเทพ สำนักบริการการศึกษา</p>
            <p>โทร. 02-972-7200 ต่อ 230 | อีเมล: registrar@northbkk.ac.th</p>
          </div>
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print();" style="padding: 10px 20px; background-color: #0d6efd; color: white; border: none; border-radius: 4px; cursor: pointer;">พิมพ์ใบรับคำขอ</button>
          <button onclick="window.close();" style="padding: 10px 20px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">ปิด</button>
        </div>
      </body>
      </html>
    `;
    
    // เขียน HTML ลงในหน้าต่างใหม่
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // รอให้เนื้อหาโหลดเสร็จก่อนแสดงหน้าต่างพิมพ์
    printWindow.onload = function() {
      setTimeout(function() {
        printWindow.focus();
      }, 500);
    };
  } catch (error) {
    console.error('Error generating print receipt:', error);
    alert('เกิดข้อผิดพลาดในการสร้างใบรับคำขอ กรุณาลองใหม่อีกครั้ง');
  }
}
