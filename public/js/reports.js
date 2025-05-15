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
// แผนภูมิคำขอตามสถานะ
  const requestsByStatusChart = document.getElementById('requests-by-status-chart');
  
  if (requestsByStatusChart) {
    // ล้างแผนภูมิเดิม (ถ้ามี)
    if (window.requestsByStatusChartInstance) {
      window.requestsByStatusChartInstance.destroy();
    }
    
    const statusLabels = summaryData.requestsByStatus.map(item => translateStatus(item.status, currentLang));
    const statusData = summaryData.requestsByStatus.map(item => parseInt(item.count));
    
    const statusColors = {
      'pending': '#ffc107',
      'processing': '#0dcaf0',
      'ready': '#198754',
      'completed': '#0d6efd',
      'rejected': '#dc3545'
    };
    
    const backgroundColors = summaryData.requestsByStatus.map(item => statusColors[item.status] || '#6c757d');
    
    window.requestsByStatusChartInstance = new Chart(requestsByStatusChart, {
      type: 'doughnut',
      data: {
        labels: statusLabels,
        datasets: [{
          data: statusData,
          backgroundColor: backgroundColors
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
  
  // แผนภูมิคำขอรายเดือน
  const monthlyRequestsChart = document.getElementById('monthly-requests-chart');
  
  if (monthlyRequestsChart) {
    // ล้างแผนภูมิเดิม (ถ้ามี)
    if (window.monthlyRequestsChartInstance) {
      window.monthlyRequestsChartInstance.destroy();
    }
    
    // เตรียมข้อมูลสำหรับแผนภูมิ
    const monthNames = [
      i18n[currentLang].admin.reports.jan,
      i18n[currentLang].admin.reports.feb,
      i18n[currentLang].admin.reports.mar,
      i18n[currentLang].admin.reports.apr,
      i18n[currentLang].admin.reports.may,
      i18n[currentLang].admin.reports.jun,
      i18n[currentLang].admin.reports.jul,
      i18n[currentLang].admin.reports.aug,
      i18n[currentLang].admin.reports.sep,
      i18n[currentLang].admin.reports.oct,
      i18n[currentLang].admin.reports.nov,
      i18n[currentLang].admin.reports.dec
    ];
    
    // สร้างชุดข้อมูลสำหรับทุกเดือน (1-12)
    const requestCounts = Array(12).fill(0);
    const revenues = Array(12).fill(0);
    
    // นำข้อมูลจริงมาใส่ในอาร์เรย์
    monthlyData.forEach(item => {
      const monthIndex = parseInt(item.month) - 1;
      requestCounts[monthIndex] = parseInt(item.request_count);
      revenues[monthIndex] = parseFloat(item.revenue || 0);
    });
    
    window.monthlyRequestsChartInstance = new Chart(monthlyRequestsChart, {
      type: 'bar',
      data: {
        labels: monthNames,
        datasets: [
          {
            label: i18n[currentLang].admin.reports.requests,
            data: requestCounts,
            backgroundColor: 'rgba(13, 110, 253, 0.5)',
            borderColor: 'rgba(13, 110, 253, 1)',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: i18n[currentLang].admin.reports.revenue,
            data: revenues,
            backgroundColor: 'rgba(25, 135, 84, 0.5)',
            borderColor: 'rgba(25, 135, 84, 1)',
            borderWidth: 1,
            type: 'line',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: i18n[currentLang].admin.reports.requests
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: i18n[currentLang].admin.reports.revenue
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });
  }
}

// แสดงข้อมูลรายเดือนในตาราง
function displayMonthlyData(monthlyData) {
  const monthlyDataTable = document.getElementById('monthly-data-table');
  
  if (!monthlyDataTable) {
    return;
  }
  
  monthlyDataTable.innerHTML = '';
  
  // คำอธิบายชื่อเดือน
  const monthNames = {
    '01': i18n[currentLang].admin.reports.jan,
    '02': i18n[currentLang].admin.reports.feb,
    '03': i18n[currentLang].admin.reports.mar,
    '04': i18n[currentLang].admin.reports.apr,
    '05': i18n[currentLang].admin.reports.may,
    '06': i18n[currentLang].admin.reports.jun,
    '07': i18n[currentLang].admin.reports.jul,
    '08': i18n[currentLang].admin.reports.aug,
    '09': i18n[currentLang].admin.reports.sep,
    '10': i18n[currentLang].admin.reports.oct,
    '11': i18n[currentLang].admin.reports.nov,
    '12': i18n[currentLang].admin.reports.dec
  };
  
  // สร้างแถวข้อมูลสำหรับทุกเดือน (1-12)
  for (let i = 1; i <= 12; i++) {
    const monthKey = i.toString().padStart(2, '0');
    const monthData = monthlyData.find(item => item.month === monthKey) || { request_count: 0, revenue: 0 };
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${monthNames[monthKey]}</td>
      <td>${monthData.request_count || 0}</td>
      <td>${formatCurrency(monthData.revenue || 0, currentLang)}</td>
    `;
    
    monthlyDataTable.appendChild(row);
  }
}

// ตั้งค่าการพิมพ์และดาวน์โหลดรายงาน
function setupPrintAndDownload() {
  // ปุ่มพิมพ์
  const printButton = document.getElementById('print-report');
  if (printButton) {
    printButton.addEventListener('click', () => {
      window.print();
    });
  }
  
  // ปุ่มดาวน์โหลด
  const downloadButton = document.getElementById('download-report');
  if (downloadButton) {
    downloadButton.addEventListener('click', generatePDF);
  }
}

// สร้างไฟล์ PDF สำหรับดาวน์โหลด
function generatePDF() {
  const { jsPDF } = window.jspdf;
  
  // สร้างเอกสาร PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // ข้อความหัวเรื่อง
  doc.setFontSize(18);
  doc.text(i18n[currentLang].admin.reports.header, 105, 15, { align: 'center' });
  
  // ข้อความวันที่
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  doc.setFontSize(12);
  doc.text(
    `${i18n[currentLang].admin.reports.dateRange}: ${startDate} - ${endDate}`,
    105, 25, { align: 'center' }
  );
  
  // ข้อมูลสรุป
  doc.setFontSize(16);
  doc.text(i18n[currentLang].admin.reports.summary, 15, 40);
  
  doc.setFontSize(12);
  doc.text(`${i18n[currentLang].admin.reports.totalRequests}: ${document.getElementById('summary-total-requests').textContent}`, 15, 50);
  doc.text(`${i18n[currentLang].admin.reports.totalRevenue}: ${document.getElementById('summary-total-revenue').textContent}`, 15, 60);
  
  // แผนภูมิ
  // แผนภูมิคำขอตามประเภทเอกสาร
  const requestsByTypeCanvas = document.getElementById('requests-by-type-chart');
  if (requestsByTypeCanvas) {
    doc.setFontSize(14);
    doc.text(i18n[currentLang].admin.reports.requestsByType, 15, 75);
    
    // แปลง Canvas เป็นรูปภาพ
    const requestsByTypeImg = requestsByTypeCanvas.toDataURL('image/png');
    doc.addImage(requestsByTypeImg, 'PNG', 15, 80, 180, 90);
  }
  
  // แผนภูมิคำขอตามสถานะ
  const requestsByStatusCanvas = document.getElementById('requests-by-status-chart');
  if (requestsByStatusCanvas) {
    doc.setFontSize(14);
    doc.text(i18n[currentLang].admin.reports.requestsByStatus, 15, 180);
    
    // แปลง Canvas เป็นรูปภาพ
    const requestsByStatusImg = requestsByStatusCanvas.toDataURL('image/png');
    doc.addImage(requestsByStatusImg, 'PNG', 15, 185, 180, 90);
  }
  
  // หน้าใหม่สำหรับแผนภูมิรายเดือน
  doc.addPage();
  
  // แผนภูมิคำขอรายเดือน
  const monthlyRequestsCanvas = document.getElementById('monthly-requests-chart');
  if (monthlyRequestsCanvas) {
    doc.setFontSize(16);
    doc.text(i18n[currentLang].admin.reports.monthlyRequests, 105, 15, { align: 'center' });
    
    // แปลง Canvas เป็นรูปภาพ
    const monthlyRequestsImg = monthlyRequestsCanvas.toDataURL('image/png');
    doc.addImage(monthlyRequestsImg, 'PNG', 15, 25, 180, 90);
  }
  
  // ตารางข้อมูลรายเดือน
  doc.setFontSize(14);
  doc.text(i18n[currentLang].admin.reports.monthlyRequests, 15, 130);
  
  // สร้างตาราง
  const monthlyDataTable = document.getElementById('monthly-data-table');
  if (monthlyDataTable) {
    const headers = [
      i18n[currentLang].admin.reports.month,
      i18n[currentLang].admin.reports.requests,
      i18n[currentLang].admin.reports.revenue
    ];
    
    const rows = [];
    for (let i = 0; i < monthlyDataTable.rows.length; i++) {
      const row = monthlyDataTable.rows[i];
      rows.push([
        row.cells[0].textContent,
        row.cells[1].textContent,
        row.cells[2].textContent
      ]);
    }
    
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 135,
      theme: 'grid'
    });
  }
  
  // ดาวน์โหลด PDF
  const fileName = `report_${startDate}_to_${endDate}.pdf`;
  doc.save(fileName);
}
