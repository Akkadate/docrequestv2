// admin-dashboard.js - เฉพาะสำหรับหน้า dashboard ของ admin

// โหลดข้อมูลสรุปสำหรับแดชบอร์ด
async function loadDashboardSummary() {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    console.log('Loading dashboard summary...');
    
    const response = await fetch('/api/admin/dashboard-summary', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Dashboard summary response status:', response.status);
    
    if (!response.ok) {
      throw new Error('Failed to load dashboard summary');
    }
    
    const data = await response.json();
    console.log('Dashboard data loaded:', data);
    
    updateDashboardUI(data);
  } catch (error) {
    console.error('Error loading dashboard summary:', error);
    showAdminAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลแดชบอร์ด', 'danger');
  }
}

// อัปเดต UI ของแดชบอร์ด
function updateDashboardUI(data) {
  console.log('Updating dashboard UI with data:', data);
  
  // ตรวจสอบว่าอิลิเมนต์มีอยู่จริงก่อนที่จะอัปเดต
  const totalRequestsElement = document.getElementById('total-requests');
  if (totalRequestsElement) {
    totalRequestsElement.textContent = data.totalRequests;
  } else {
    console.warn('Element #total-requests not found');
  }
  
  const pendingRequestsElement = document.getElementById('pending-requests');
  if (pendingRequestsElement) {
    pendingRequestsElement.textContent = data.pendingRequests;
  } else {
    console.warn('Element #pending-requests not found');
  }
  
  const processingRequestsElement = document.getElementById('processing-requests');
  if (processingRequestsElement) {
    processingRequestsElement.textContent = data.processingRequests;
  } else {
    console.warn('Element #processing-requests not found');
  }
  
  const completedRequestsElement = document.getElementById('completed-requests');
  if (completedRequestsElement) {
    completedRequestsElement.textContent = data.completedRequests;
  } else {
    console.warn('Element #completed-requests not found');
  }
  
  // แสดงคำขอล่าสุด
  displayRecentRequests(data.recentRequests);
}

// แสดงคำขอล่าสุด
function displayRecentRequests(requests) {
  console.log('Displaying recent requests:', requests?.length || 0);
  
  const recentRequestsTable = document.getElementById('recent-requests-table');
  
  // ตรวจสอบว่าอิลิเมนต์มีอยู่จริง
  if (!recentRequestsTable) {
    console.warn('Element #recent-requests-table not found');
    return; // ออกจากฟังก์ชันหากไม่พบตาราง
  }
  
  recentRequestsTable.innerHTML = '';
  
  if (!requests || requests.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="7" class="text-center">ไม่พบคำขอเอกสาร</td>
    `;
    recentRequestsTable.appendChild(emptyRow);
    return;
  }
  
  requests.forEach(request => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td data-label="รหัสคำขอ">${request.id}</td>
      <td data-label="ชื่อนักศึกษา">${request.full_name}</td>
      <td data-label="รหัสนักศึกษา">${request.student_id}</td>
      <td data-label="ประเภทเอกสาร">${request.document_name}</td>
      <td data-label="วันที่ขอ">${formatDate(request.created_at, 'th')}</td>
      <td data-label="สถานะ">${createStatusBadge(request.status)}</td>
      <td data-label="การดำเนินการ">
        <div class="btn-group">
          <a href="request-detail.html?id=${request.id}" class="btn btn-sm btn-primary">
            <i class="bi bi-eye"></i> ดูรายละเอียด
          </a>
          <button class="btn btn-sm btn-success update-status" data-id="${request.id}" data-bs-toggle="modal" data-bs-target="#updateStatusModal">
            <i class="bi bi-pencil"></i> อัปเดตสถานะ
          </button>
        </div>
      </td>
    `;
    
    recentRequestsTable.appendChild(row);
    
    // เพิ่มการฟังเหตุการณ์สำหรับปุ่มอัปเดตสถานะ
    const updateStatusButton = row.querySelector('.update-status');
    if (updateStatusButton) {
      updateStatusButton.addEventListener('click', () => {
        const requestIdInput = document.getElementById('request-id');
        if (requestIdInput) {
          requestIdInput.value = request.id;
        }
      });
    }
  });
}

// ฟังก์ชันสำหรับรีโหลดข้อมูลหลังจากอัปเดตสถานะ
window.reloadAfterStatusUpdate = function() {
  loadDashboardSummary();
};

// เมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
  console.log('Dashboard page loaded');
  loadDashboardSummary();
});
