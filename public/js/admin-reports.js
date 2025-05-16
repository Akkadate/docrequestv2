// admin-reports.js - เฉพาะสำหรับหน้ารายงานของ admin

document.addEventListener('DOMContentLoaded', () => {
  console.log('Reports page loaded');
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
  
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');
  
  if (startDateInput) startDateInput.valueAsDate = firstDayOfMonth;
  if (endDateInput) endDateInput.valueAsDate = today;
  
  // เพิ่มการฟังเหตุการณ์สำหรับการส่งฟอร์ม
  const dateRangeForm = document.getElementById('date-range-form');
  if (dateRangeForm) {
    dateRangeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      loadSummaryData();
    });
  }
  
  // เพิ่มการฟังเหตุการณ์สำหรับการรีเซ็ตการกรอง
  const resetFilterButton = document.getElementById('reset-filter');
  if (resetFilterButton) {
    resetFilterButton.addEventListener('click', () => {
      if (startDateInput) startDateInput.valueAsDate = firstDayOfMonth;
      if (endDateInput) endDateInput.valueAsDate = today;
      loadSummaryData();
    });
  }
}

// โหลดข้อมูลสรุป
async function loadSummaryData() {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/login.html';
      return;
    }
    
    console.log('Loading summary data...');
    
    const startDate = document.getElementById('start-date')?.value || '';
    const endDate = document.getElementById('end-date')?.value || '';
    
    console.log('Date range:', startDate, 'to', endDate);
    
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
    console.log('Summary data loaded:', summaryData);
    
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
    console.log('Monthly data loaded:', monthlyData);
    
    // อัปเดต UI
    updateSummaryUI(summaryData);
    createCharts(summaryData, monthlyData);
    displayMonthlyData(monthlyData);
  } catch (error) {
    console.error('Error loading report data:', error);
    showAdminAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลรายงาน', 'danger');
  }
}

// อัปเดต UI ของข้อมูลสรุป
function updateSummaryUI(data) {
  const totalRequestsElement = document.getElementById('summary-total-requests');
  if (totalRequestsElement) {
    totalRequestsElement.textContent = data.totalRequests || 0;
  }
  
  const totalRevenueElement = document.getElementById('summary-total-revenue');
  if (totalRevenueElement) {
    totalRevenueElement.textContent = formatCurrency(data.totalRevenue || 0, 'th');
  }
}

// สร้างแผนภูมิ
function createCharts(summaryData, monthlyData) {
  try {
    // แผนภูมิคำขอตามประเภทเอกสาร
    const requestsByTypeChart = document.getElementById('requests-by-type-chart');
    
    if (requestsByTypeChart) {
      // ล้างแผนภูมิเดิม (ถ้ามี)
      if (window.requestsByTypeChartInstance) {
        window.requestsByTypeChartInstance.destroy();
      }
      
      if (!summaryData.requestsByType || summaryData.requestsByType.length === 0) {
        requestsByTypeChart.parentElement.innerHTML = '<div class="text-center p-5">ไม่มีข้อมูล</div>';
        return;
      }
      
      const docTypeLabels = summaryData.requestsByType.map(item => item.name_th || 'ไม่ระบุ');
      const docTypeData = summaryData.requestsByType.map(item => parseInt(item.count) || 0);
      
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
      
      if (!summaryData.requestsByStatus || summaryData.requestsByStatus.length === 0) {
        requestsByStatusChart.parentElement.innerHTML = '<div class="text-center p-5">ไม่มีข้อมูล</div>';
        return;
      }
      
      const statusLabels = summaryData.requestsByStatus.map(item => translateStatus(item.status, 'th'));
      const statusData = summaryData.requestsByStatus.map(item => parseInt(item.count) || 0);
      
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
      
      if (!monthlyData || monthlyData.length === 0) {
        monthlyRequestsChart.parentElement.innerHTML = '<div class="text-center p-5">ไม่มีข้อมูล</div>';
        return;
      }
      
      // เตรียมข้อมูลสำหรับแผนภูมิ
      const monthNames = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
      ];
      
      // สร้างชุดข้อมูลสำหรับทุกเดือน (1-12)
      const requestCounts = Array(12).fill(0);
      const revenues = Array(12).fill(0);
      
      // นำข้อมูลจริงมาใส่ในอาร์เรย์
      monthlyData.forEach(item => {
        const monthIndex = parseInt(item.month) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          requestCounts[monthIndex] = parseInt(item.request_count) || 0;
          revenues[monthIndex] = parseFloat(item.revenue || 0);
        }
      });
      
      window.monthlyRequestsChartInstance = new Chart(monthlyRequestsChart, {
        type: 'bar',
        data: {
          labels: monthNames,
          datasets: [
            {
              label: 'จำนวนคำขอ',
              data: requestCounts,
              backgroundColor: 'rgba(13, 110, 253, 0.5)',
              borderColor: 'rgba(13, 110, 253, 1)',
              borderWidth: 1,
              yAxisID: 'y'
            },
            {
              label: 'รายได้',
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
                text: 'จำนวนคำขอ'
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: 'รายได้'
              },
              grid: {
                drawOnChartArea: false
              }
            }
          }
        }
      });
    }
  } catch (error) {
    console.error('Error creating charts:', error);
    showAdminAlert('เกิดข้อผิดพลาดในการสร้างแผนภูมิ', 'danger');
  }
}

// แสดงข้อมูลรายเดือนในตาราง
function displayMonthlyData(monthlyData) {
  const monthlyDataTable = document.getElementById('monthly-data-table');
  
  if (!monthlyDataTable) {
    console.warn('Monthly data table not found');
    return;
  }
  
  monthlyDataTable.innerHTML = '';
  
  // คำอธิบายชื่อเดือน
  const monthNames = {
    '01': 'มกราคม',
    '02': 'กุมภาพันธ์',
    '03': 'มีนาคม',
    '04': 'เมษายน',
    '05': 'พฤษภาคม',
    '06': 'มิถุนายน',
    '07': 'กรกฎาคม',
    '08': 'สิงหาคม',
    '09': 'กันยายน',
    '10': 'ตุลาคม',
    '11': 'พฤศจิกายน',
    '12': 'ธันวาคม'
  };
  
  // สร้างข้อมูลสำหรับทุกเดือน
  const currentYear = new Date().getFullYear();
  let totalRequests = 0;
  let totalRevenue = 0;
  
  // สร้างแถวข้อมูลสำหรับทุกเดือน (1-12)
  for (let i = 1; i <= 12; i++) {
    const monthKey = i.toString().padStart(2, '0');
    const monthData = monthlyData.find(item => item.month === monthKey) || { request_count: 0, revenue: 0 };
    
    const requestCount = parseInt(monthData.request_count) || 0;
    const revenue = parseFloat(monthData.revenue) || 0;
    
    totalRequests += requestCount;
    totalRevenue += revenue;
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${monthNames[monthKey]}</td>
      <td class="text-center">${requestCount}</td>
      <td class="text-end">${formatCurrency(revenue, 'th')}</td>
    `;
    
    monthlyDataTable.appendChild(row);
  }
  
  // เพิ่มแถวสรุปผลรวม
  const totalRow = document.createElement('tr');
  totalRow.className = 'table-active fw-bold';
  totalRow.innerHTML = `
    <td>รวมทั้งหมด</td>
    <td class="text-center">${totalRequests}</td>
    <td class="text-end">${formatCurrency(totalRevenue, 'th')}</td>
  `;
  
  monthlyDataTable.appendChild(totalRow);
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
  
  // ปุ่มดาวน์โหลด PDF
  const downloadPdfButton = document.getElementById('download-pdf');
  if (downloadPdfButton) {
    downloadPdfButton.addEventListener('click', generatePDF);
  }
  
  // ปุ่มดาวน์โหลด Excel
  const downloadExcelButton = document.getElementById('download-excel');
  if (downloadExcelButton) {
    downloadExcelButton.addEventListener('click', generateExcel);
  }
}

// สร้างไฟล์ PDF สำหรับดาวน์โหลด
function generatePDF() {
  console.log('Generating PDF report...');
  
  try {
    // ตรวจสอบว่ามีไลบรารี jsPDF หรือไม่
    if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
      showAdminAlert('ไม่พบไลบรารี jsPDF โปรดตรวจสอบว่าโหลดไลบรารีแล้ว', 'danger');
      return;
    }
    
    // สร้างเอกสาร PDF
    const { jsPDF } = jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // เพิ่มฟอนต์ไทย
    if (typeof promptFont !== 'undefined') {
      // ถ้ามีฟอนต์ Prompt จาก CDN
      doc.addFileToVFS('Prompt-Regular.ttf', promptFont.regular);
      doc.addFileToVFS('Prompt-Bold.ttf', promptFont.bold);
      doc.addFont('Prompt-Regular.ttf', 'Prompt', 'normal');
      doc.addFont('Prompt-Bold.ttf', 'Prompt', 'bold');
      doc.setFont('Prompt');
    } else if (typeof thsarabunnew !== 'undefined') {
      // Fallback ไปใช้ THSarabunNew ถ้าไม่มี Prompt
      doc.addFileToVFS('THSarabunNew-normal.ttf', thsarabunnew.normal);
      doc.addFileToVFS('THSarabunNew-bold.ttf', thsarabunnew.bold);
      doc.addFont('THSarabunNew-normal.ttf', 'THSarabunNew', 'normal');
      doc.addFont('THSarabunNew-bold.ttf', 'THSarabunNew', 'bold');
      doc.setFont('THSarabunNew');
    }
    
    
    // ข้อความหัวเรื่อง
    doc.setFontSize(18);
    doc.text('รายงานระบบขอเอกสารออนไลน์', 105, 15, { align: 'center' });
    
    // ข้อความวันที่
    const startDate = document.getElementById('start-date')?.value || '';
    const endDate = document.getElementById('end-date')?.value || '';
    doc.setFontSize(12);
    doc.text(`วันที่: ${startDate} ถึง ${endDate}`, 105, 25, { align: 'center' });
    
    // ข้อมูลสรุป
    doc.setFontSize(16);
    doc.text('ข้อมูลสรุป', 15, 40);
    
    const totalRequests = document.getElementById('summary-total-requests')?.textContent || '0';
    const totalRevenue = document.getElementById('summary-total-revenue')?.textContent || '0';
    
    doc.setFontSize(12);
    doc.text(`จำนวนคำขอทั้งหมด: ${totalRequests}`, 15, 50);
    doc.text(`รายได้ทั้งหมด: ${totalRevenue}`, 15, 60);
    
    // บันทึกขนาดหน้ากระดาษ A4
    const pageWidth = 210;
    const pageHeight = 297;
    
    // แปลงแผนภูมิเป็นรูปภาพ
    let yPosition = 70;
    
    // แผนภูมิคำขอตามประเภทเอกสาร
    const requestsByTypeCanvas = document.getElementById('requests-by-type-chart');
    if (requestsByTypeCanvas) {
      doc.setFontSize(14);
      doc.text('คำขอตามประเภทเอกสาร', 15, yPosition);
      yPosition += 5;
      
      // แปลง Canvas เป็นรูปภาพ
      const requestsByTypeImg = requestsByTypeCanvas.toDataURL('image/png');
      doc.addImage(requestsByTypeImg, 'PNG', 15, yPosition, 180, 90);
      yPosition += 95;
    }
    
    // ตรวจสอบว่าเกินขนาดหน้ากระดาษหรือไม่
    if (yPosition + 100 > pageHeight) {
      doc.addPage();
      yPosition = 15;
    }
    
    // แผนภูมิคำขอตามสถานะ
    const requestsByStatusCanvas = document.getElementById('requests-by-status-chart');
    if (requestsByStatusCanvas) {
      doc.setFontSize(14);
      doc.text('คำขอตามสถานะ', 15, yPosition);
      yPosition += 5;
      
      // แปลง Canvas เป็นรูปภาพ
      const requestsByStatusImg = requestsByStatusCanvas.toDataURL('image/png');
      doc.addImage(requestsByStatusImg, 'PNG', 15, yPosition, 180, 90);
      yPosition += 95;
    }
    
    // ตรวจสอบว่าเกินขนาดหน้ากระดาษหรือไม่
    if (yPosition + 100 > pageHeight) {
      doc.addPage();
      yPosition = 15;
    }
    
    // แผนภูมิคำขอรายเดือน
    const monthlyRequestsCanvas = document.getElementById('monthly-requests-chart');
    if (monthlyRequestsCanvas) {
      doc.setFontSize(14);
      doc.text('คำขอรายเดือน', 15, yPosition);
      yPosition += 5;
      
      // แปลง Canvas เป็นรูปภาพ
      const monthlyRequestsImg = monthlyRequestsCanvas.toDataURL('image/png');
      doc.addImage(monthlyRequestsImg, 'PNG', 15, yPosition, 180, 90);
      yPosition += 95;
    }
    
    // ตรวจสอบว่าเกินขนาดหน้ากระดาษหรือไม่
    if (yPosition + 100 > pageHeight) {
      doc.addPage();
      yPosition = 15;
    }
    
    // ตารางข้อมูลรายเดือน
    doc.setFontSize(14);
    doc.text('ข้อมูลรายเดือน', 15, yPosition);
    yPosition += 10;
    
    // สร้างตาราง
    const monthlyDataTable = document.getElementById('monthly-data-table');
    if (monthlyDataTable) {
      // สร้างข้อมูลสำหรับตาราง
      const tableData = [];
      const tableHeaders = ['เดือน', 'จำนวนคำขอ', 'รายได้'];
      
      // ดึงข้อมูลจากตาราง HTML
      for (let i = 0; i < monthlyDataTable.rows.length; i++) {
        const row = monthlyDataTable.rows[i];
        tableData.push([
          row.cells[0].textContent,
          row.cells[1].textContent,
          row.cells[2].textContent
        ]);
      }
      
      // สร้างตารางใน PDF (ใช้ฟอนต์ไทย)
       doc.autoTable({
      head: [tableHeaders],
      body: tableData,
      startY: yPosition,
      theme: 'grid',
      styles: {
        font: typeof promptFont !== 'undefined' ? 'Prompt' : 
              (typeof thsarabunnew !== 'undefined' ? 'THSarabunNew' : undefined),
        fontSize: 10
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        font: typeof promptFont !== 'undefined' ? 'Prompt' : 
              (typeof thsarabunnew !== 'undefined' ? 'THSarabunNew' : undefined),
        fontStyle: 'bold'
      },
        footStyles: {
          fillColor: [220, 220, 220],
          fontStyle: 'bold',
          font: typeof thsarabunnew !== 'undefined' ? 'THSarabunNew' : undefined
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240]
        }
      });
    }
    
    // ข้อความท้ายหน้า
    const currentDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    doc.setFontSize(10);
    doc.text(`พิมพ์เมื่อ: ${currentDate}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
    
    // ดาวน์โหลด PDF
    const fileName = `รายงาน_${startDate}_ถึง_${endDate}.pdf`;
    doc.save(fileName);
    
    console.log('PDF generated successfully');
  } catch (error) {
    console.error('Error generating PDF:', error);
    showAdminAlert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF', 'danger');
  }
}

// สร้างไฟล์ Excel สำหรับดาวน์โหลด
function generateExcel() {
  console.log('Generating Excel report...');
  
  try {
    // ตรวจสอบว่ามีไลบรารี xlsx หรือไม่
    if (typeof XLSX === 'undefined') {
      showAdminAlert('ไม่พบไลบรารี XLSX โปรดตรวจสอบว่าโหลดไลบรารีแล้ว', 'danger');
      return;
    }
    
    // สร้างข้อมูลสำหรับไฟล์ Excel
    const workbook = XLSX.utils.book_new();
    
    // ข้อมูลหัวรายงาน
    const startDate = document.getElementById('start-date')?.value || '';
    const endDate = document.getElementById('end-date')?.value || '';
    const reportTitle = `รายงานระบบขอเอกสารออนไลน์ (${startDate} ถึง ${endDate})`;
    
    // ข้อมูลสรุป
    const totalRequests = document.getElementById('summary-total-requests')?.textContent || '0';
    const totalRevenue = document.getElementById('summary-total-revenue')?.textContent || '0';
    
    const summaryData = [
      ['รายงานระบบขอเอกสารออนไลน์'],
      [`วันที่: ${startDate} ถึง ${endDate}`],
      [''],
      ['ข้อมูลสรุป'],
      [`จำนวนคำขอทั้งหมด:`, totalRequests],
      [`รายได้ทั้งหมด:`, totalRevenue],
      ['']
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'สรุป');
    
   // ข้อมูลรายเดือน
    const monthlyDataTable = document.getElementById('monthly-data-table');
    if (monthlyDataTable) {
      // สร้างข้อมูลสำหรับตาราง Excel
      const monthlyData = [
        ['เดือน', 'จำนวนคำขอ', 'รายได้']
      ];
      
      // ดึงข้อมูลจากตาราง HTML
      for (let i = 0; i < monthlyDataTable.rows.length; i++) {
        const row = monthlyDataTable.rows[i];
        monthlyData.push([
          row.cells[0].textContent,
          parseInt(row.cells[1].textContent) || 0,
          row.cells[2].textContent.replace(/[^\d.-]/g, '') // ลบสัญลักษณ์สกุลเงินออก
        ]);
      }
      
      const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyData);
      XLSX.utils.book_append_sheet(workbook, monthlySheet, 'ข้อมูลรายเดือน');
      
      // จัดรูปแบบสำหรับตาราง
      // กำหนดความกว้างคอลัมน์
      const monthlySheetCols = [
        { wch: 20 }, // เดือน
        { wch: 15 }, // จำนวนคำขอ
        { wch: 15 }  // รายได้
      ];
      monthlySheet['!cols'] = monthlySheetCols;
    }
    
    // ข้อมูลประเภทเอกสาร
    if (window.requestsByTypeChartInstance) {
      const chartData = window.requestsByTypeChartInstance.data;
      const documentTypeData = [
        ['ประเภทเอกสาร', 'จำนวนคำขอ']
      ];
      
      for (let i = 0; i < chartData.labels.length; i++) {
        documentTypeData.push([
          chartData.labels[i],
          chartData.datasets[0].data[i]
        ]);
      }
      
      const documentTypeSheet = XLSX.utils.aoa_to_sheet(documentTypeData);
      XLSX.utils.book_append_sheet(workbook, documentTypeSheet, 'ประเภทเอกสาร');
      
      // กำหนดความกว้างคอลัมน์
      const documentTypeSheetCols = [
        { wch: 30 }, // ประเภทเอกสาร
        { wch: 15 }  // จำนวนคำขอ
      ];
      documentTypeSheet['!cols'] = documentTypeSheetCols;
    }
    
    // ข้อมูลตามสถานะ
    if (window.requestsByStatusChartInstance) {
      const chartData = window.requestsByStatusChartInstance.data;
      const statusData = [
        ['สถานะ', 'จำนวนคำขอ']
      ];
      
      for (let i = 0; i < chartData.labels.length; i++) {
        statusData.push([
          chartData.labels[i],
          chartData.datasets[0].data[i]
        ]);
      }
      
      const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
      XLSX.utils.book_append_sheet(workbook, statusSheet, 'สถานะคำขอ');
      
      // กำหนดความกว้างคอลัมน์
      const statusSheetCols = [
        { wch: 25 }, // สถานะ
        { wch: 15 }  // จำนวนคำขอ
      ];
      statusSheet['!cols'] = statusSheetCols;
    }
    
    // ข้อมูลรายเดือน (แผนภูมิ)
    if (window.monthlyRequestsChartInstance) {
      const chartData = window.monthlyRequestsChartInstance.data;
      const monthlyChartData = [
        ['เดือน', 'จำนวนคำขอ', 'รายได้']
      ];
      
      for (let i = 0; i < chartData.labels.length; i++) {
        monthlyChartData.push([
          chartData.labels[i],
          chartData.datasets[0].data[i],
          chartData.datasets[1].data[i]
        ]);
      }
      
      const monthlyChartSheet = XLSX.utils.aoa_to_sheet(monthlyChartData);
      XLSX.utils.book_append_sheet(workbook, monthlyChartSheet, 'แผนภูมิรายเดือน');
      
      // กำหนดความกว้างคอลัมน์
      const monthlyChartSheetCols = [
        { wch: 15 }, // เดือน
        { wch: 15 }, // จำนวนคำขอ
        { wch: 15 }  // รายได้
      ];
      monthlyChartSheet['!cols'] = monthlyChartSheetCols;
    }
    
    // ตั้งค่าสไตล์ของหัวตาราง (ทุกชีท)
    Object.keys(workbook.Sheets).forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      if (sheet['A1']) {
        // สร้างสไตล์สำหรับหัวตาราง
        sheet['A1'].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "4F81BD" } },
          alignment: { horizontal: "center" }
        };
      }
    });
    
    // ชื่อไฟล์
    const fileName = `รายงาน_${startDate}_ถึง_${endDate}.xlsx`;
    
    // แปลง workbook เป็น array buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    // สร้าง Blob และ URL
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    
    // สร้างลิงก์สำหรับดาวน์โหลด
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    
    // คืนทรัพยากร
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
    
    console.log('Excel generated successfully');
    showAdminAlert('สร้างไฟล์ Excel สำเร็จแล้ว', 'success');
  } catch (error) {
    console.error('Error generating Excel:', error);
    showAdminAlert('เกิดข้อผิดพลาดในการสร้างไฟล์ Excel', 'danger');
  }
}
