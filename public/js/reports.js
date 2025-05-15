// ตรวจสอบว่าเป็นผู้ดูแลระบบหรือไม่
document.addEventListener('DOMContentLoaded', () => {
  checkAdmin();
  setupDateFilter();
  loadSummaryData();
  setupPrintAndDownload();
});

// ตั้งค่าการกรองตามวันที่
function setupDateFilter() {
  // ตั้งค่าวันที่เริ่มต้นเป็นวันแรกของเดือนปัจจุบัน
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  document.getElementById('start-date').valueAsDate = firstDayOfMonth;
  document.getElementById('end-date').valueAsDate = today;
  
  // เพิ่มการฟังเหตุการณ์สำหรับการส่งฟอร์ม
  document.getElementById('date-range-form').addEventListener('submit', (e) => {
    e.preventDefault();
    loadSummaryData();
  });
  
  // เพิ่มการฟังเหตุการณ์สำหรับการรีเซ็ตการกรอง
  document.getElementById('reset-filter').addEventListener('click', () => {
    document.getElementById('start-date').valueAsDate = firstDayOfMonth;
    document.getElementById('end-date').valueAsDate = today;
    loadSummaryData();
  });
}

// โหลดข้อมูลสรุป
async function loadSummaryData() {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    // โหลดข้อมูลสรุป
    const summaryResponse = await fetch(`/api/reports/summary?start_date=${startDate}&end_date=${endDate}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!summaryResponse.ok) {
      throw new Error('Failed to load summary data');
    }
    
    const summaryData = await summaryResponse.json();
    
    // โหลดข้อมูลรายเดือน
    const currentYear = new Date().getFullYear();
    const monthlyResponse = await fetch(`/api/reports/monthly?year=${currentYear}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!monthlyResponse.ok) {
      throw new Error('Failed to load monthly data');
    }
    
    const monthlyData = await monthlyResponse.json();
    
    // อัปเดต UI
    updateSummaryUI(summaryData);
    createCharts(summaryData, monthlyData);
    displayMonthlyData(monthlyData);
  } catch (error) {
    console.error('Error loading report data:', error);
    showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลรายงาน', 'danger');
  }
}

// อัปเดต UI ของข้อมูลสรุป
function updateSummaryUI(data) {
  document.getElementById('summary-total-requests').textContent = data.totalRequests;
  document.getElementById('summary-total-revenue').textContent = formatCurrency(data.totalRevenue || 0, currentLang);
}

// สร้างแผนภูมิ
function createCharts(summaryData, monthlyData) {
  // แผนภูมิคำขอตามประเภทเอกสาร
  const requestsByTypeChart = document.getElementById('requests-by-type-chart');
  
  if (requestsByTypeChart) {
    // ล้างแผนภูมิเดิม (ถ้ามี)
    if (window.requestsByTypeChartInstance) {
      window.requestsByTypeChartInstance.destroy();
    }
    
    const docTypeLabels = summaryData.requestsByType.map(item => item.name_th);
    const docTypeData = summaryData.requestsByType.map(item => parseInt(item.count));
    
    window.requestsByTypeChartInstance = new Chart(requestsByTypeChart, {
      type: 'pie',
      data: {
        labels: docTypeLabels,
        datasets: [{
          data: docTypeData,
          backgroundColor: [
            '#0d6efd', '#6610f2', '#6f42c1',
            '#d63384', '#dc3545', '#fd7e14',
            '#ffc107', '#198754', '#20c997'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }
