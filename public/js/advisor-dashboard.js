// ===============================================
// Advisor Dashboard JavaScript
// ===============================================
// ไฟล์: public/js/advisor-dashboard.js
// วันที่สร้าง: 30 กรกฎาคม 2025
// วัตถุประสงค์: จัดการ Dashboard สำหรับอาจารย์ที่ปรึกษา

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Advisor Dashboard initialized');
    
    // Global variables
    let advisorInfo = null;
    let currentFilter = '';
    let refreshInterval = null;
    let monthlyChart = null;
    
    // Elements
    const advisorNameSpan = document.getElementById('advisor-name');
    const facultyNameSpan = document.getElementById('faculty-name');
    const currentDatetimeDiv = document.getElementById('current-datetime');
    const notificationStatusDiv = document.getElementById('notification-status');
    const recentRequestsTable = document.getElementById('recent-requests-table');
    const filterRadios = document.querySelectorAll('input[name="request-filter"]');
    const quickApprovalModal = new bootstrap.Modal(document.getElementById('quickApprovalModal'));
    const loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
    
    // Statistics elements
    const pendingCountSpan = document.getElementById('pending-count');
    const approvedCountSpan = document.getElementById('approved-count');
    const rejectedCountSpan = document.getElementById('rejected-count');
    const totalCountSpan = document.getElementById('total-count');
    const avgResponseTimeSpan = document.getElementById('avg-response-time');
    const pendingBadge = document.getElementById('pending-badge');
    
    // Monthly stats elements
    const monthPendingSpan = document.getElementById('month-pending');
    const monthApprovedSpan = document.getElementById('month-approved');
    
    // ===== Initialization =====
    
    async function init() {
        try {
            // ตรวจสอบการเข้าสู่ระบบ
            if (!checkAuth()) {
                return;
            }
            
            // เริ่มต้นการทำงาน
            updateDateTime();
            await loadAdvisorInfo();
            await loadDashboardStats();
            await loadRecentRequests();
            await loadMonthlyChart();
            
            // ตั้งค่า intervals
            setInterval(updateDateTime, 1000);
            refreshInterval = setInterval(refreshStats, 300000); // รีเฟรชทุก 5 นาที
            
            console.log('✅ Advisor Dashboard ready');
            
        } catch (error) {
            console.error('❌ Error initializing dashboard:', error);
            showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณารีเฟรชหน้าเว็บ', 'danger');
        }
    }
    
    /**
     * ตรวจสอบการเข้าสู่ระบบ
     */
    function checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
    
    /**
     * อัปเดตเวลาปัจจุบัน
     */
    function updateDateTime() {
        const now = new Date();
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Bangkok'
        };
        
        currentDatetimeDiv.textContent = now.toLocaleDateString('th-TH', options);
    }
    
    /**
     * โหลดข้อมูลอาจารย์ที่ปรึกษา
     */
    async function loadAdvisorInfo() {
        try {
            const response = await fetch('/api/auth/user', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const user = await response.json();
                advisorInfo = user;
                
                // อัปเดตชื่ออาจารย์
                advisorNameSpan.textContent = user.full_name || 'อาจารย์';
                
                // ดึงข้อมูลคณะ
                await loadFacultyInfo();
                
            } else {
                throw new Error('Failed to load advisor info');
            }
            
        } catch (error) {
            console.error('Error loading advisor info:', error);
            advisorNameSpan.textContent = 'อาจารย์';
            facultyNameSpan.textContent = 'กำลังโหลด...';
        }
    }
    
    /**
     * โหลดข้อมูลคณะ
     */
    async function loadFacultyInfo() {
        try {
            // ใช้ API ของ advisor เพื่อดึงข้อมูลคณะ
            const response = await fetch('/api/approval-workflow/advisor/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                facultyNameSpan.textContent = data.advisorInfo?.facultyName || 'คณะ';
                
                // อัปเดตสถานะการแจ้งเตือน
                updateNotificationStatus(data.advisorInfo);
                
            } else {
                facultyNameSpan.textContent = 'คณะ';
            }
            
        } catch (error) {
            console.error('Error loading faculty info:', error);
            facultyNameSpan.textContent = 'คณะ';
        }
    }
    
    /**
     * อัปเดตสถานะการแจ้งเตือน
     */
    function updateNotificationStatus(advisorInfo) {
        if (advisorInfo) {
            notificationStatusDiv.innerHTML = `
                <span class="notification-dot me-1"></span>
                <span class="text-success">การแจ้งเตือนเปิดใช้งาน</span>
            `;
        } else {
            notificationStatusDiv.innerHTML = `
                <span class="text-warning">ไม่มีการแจ้งเตือน</span>
            `;
        }
    }
    
    /**
     * โหลดสถิติ Dashboard
     */
    async function loadDashboardStats() {
        try {
            const response = await fetch('/api/approval-workflow/advisor/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                updateStatsCards(data.summary);
                updateMonthlyStats(data.trends);
            } else {
                throw new Error('Failed to load stats');
            }
            
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            // แสดงค่าเริ่มต้น
            updateStatsCards({
                total_requests: 0,
                pending: 0,
                approved: 0,
                rejected: 0,
                avg_response_hours: 0
            });
        }
    }
    
    /**
     * อัปเดตการ์ดสถิติ
     */
    function updateStatsCards(stats) {
        pendingCountSpan.textContent = stats.pending || 0;
        approvedCountSpan.textContent = stats.approved || 0;
        rejectedCountSpan.textContent = stats.rejected || 0;
        totalCountSpan.textContent = stats.total_requests || 0;
        
        // อัปเดต badge
        pendingBadge.textContent = stats.pending || 0;
        
        // อัปเดตเวลาตอบสนองเฉลี่ย
        if (stats.avg_response_hours) {
            const hours = Math.round(stats.avg_response_hours * 10) / 10;
            avgResponseTimeSpan.textContent = `${hours} ชั่วโมง`;
        } else {
            avgResponseTimeSpan.textContent = '- ชั่วโมง';
        }
        
        // เพิ่มแอนิเมชันให้ตัวเลข
        animateNumbers();
    }
    
    /**
     * แอนิเมชันตัวเลข
     */
    function animateNumbers() {
        const numberElements = document.querySelectorAll('.summary-card .number');
        numberElements.forEach(element => {
            element.style.transform = 'scale(1.1)';
            element.style.transition = 'transform 0.3s ease';
            
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 300);
        });
    }
    
    /**
     * อัปเดตสถิติรายเดือน
     */
    function updateMonthlyStats(trends) {
        if (trends && trends.length > 0) {
            const currentMonth = trends[0];
            monthPendingSpan.textContent = currentMonth.pending || 0;
            monthApprovedSpan.textContent = currentMonth.approved || 0;
        }
    }
    
    /**
     * โหลดคำขอล่าสุด
     */
    async function loadRecentRequests() {
        try {
            const url = new URL('/api/approval-workflow/advisor/requests', window.location.origin);
            url.searchParams.append('limit', '10');
            if (currentFilter) {
                url.searchParams.append('status', currentFilter);
            }
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                updateRecentRequestsTable(data.requests);
                updateTableInfo(data.requests.length);
            } else {
                throw new Error('Failed to load recent requests');
            }
            
        } catch (error) {
            console.error('Error loading recent requests:', error);
            showEmptyTable('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        }
    }
    
    /**
     * อัปเดตตารางคำขอล่าสุด
     */
    function updateRecentRequestsTable(requests) {
        if (!requests || requests.length === 0) {
            showEmptyTable('ไม่มีคำขอ');
            return;
        }
        
        const tableHtml = requests.map(request => {
            const statusClass = getStatusClass(request.approval_status);
            const statusText = getStatusText(request.approval_status);
            const isUrgent = request.urgent;
            const requestDate = new Date(request.created_at).toLocaleDateString('th-TH');
            
            return `
                <tr class="request-row" onclick="viewRequestDetail(${request.id})"
                    data-bs-toggle="tooltip" title="คลิกเพื่อดูรายละเอียด">
                    <td>
                        <div class="d-flex align-items-center">
                            ${isUrgent ? '<i class="bi bi-lightning-charge text-warning urgent-indicator me-2"></i>' : ''}
                            <div>
                                <div class="fw-semibold">${escapeHtml(request.student_name)}</div>
                                <small class="text-muted">${escapeHtml(request.student_id)}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="text-truncate" style="max-width: 200px;" title="${escapeHtml(request.request_title)}">
                            ${escapeHtml(request.request_title)}
                        </div>
                        <small class="text-muted">${escapeHtml(request.document_type_name || '')}</small>
                    </td>
                    <td>
                        <small>${requestDate}</small>
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary btn-sm" onclick="event.stopPropagation(); viewRequestDetail(${request.id})"
                                    title="ดูรายละเอียด">
                                <i class="bi bi-eye"></i>
                            </button>
                            ${request.approval_status === 'waiting_approval' ? `
                                <button class="btn btn-outline-success btn-sm" onclick="event.stopPropagation(); quickApprove(${request.id})"
                                        title="อนุมัติด่วน">
                                    <i class="bi bi-check"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        recentRequestsTable.innerHTML = tableHtml;
        
        // เปิดใช้งาน tooltips
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(tooltip => {
            new bootstrap.Tooltip(tooltip);
        });
    }
    
    /**
     * แสดงตารางว่าง
     */
    function showEmptyTable(message) {
        recentRequestsTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4 text-muted">
                    <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                    <p>${message}</p>
                </td>
            </tr>
        `;
    }
    
    /**
     * อัปเดตข้อมูลตาราง
     */
    function updateTableInfo(count) {
        const tableInfo = document.getElementById('table-info');
        if (tableInfo) {
            tableInfo.textContent = `แสดง ${count} รายการ`;
        }
    }
    
    /**
     * โหลดกราฟรายเดือน
     */
    async function loadMonthlyChart() {
        try {
            const response = await fetch('/api/approval-workflow/advisor/stats?period=month', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                createMonthlyChart(data.trends);
            }
            
        } catch (error) {
            console.error('Error loading monthly chart:', error);
        }
    }
    
    /**
     * สร้างกราฟรายเดือน
     */
    function createMonthlyChart(trends) {
        const canvas = document.getElementById('monthly-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // เตรียมข้อมูล
        const labels = trends.slice(0, 6).reverse().map(item => {
            const date = new Date(item.period);
            return date.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' });
        });
        
        const approvedData = trends.slice(0, 6).reverse().map(item => item.approved || 0);
        const rejectedData = trends.slice(0, 6).reverse().map(item => item.rejected || 0);
        
        // สร้างกราฟ
        if (monthlyChart) {
            monthlyChart.destroy();
        }
        
        monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'อนุมัติ',
                        data: approvedData,
                        backgroundColor: 'rgba(25, 135, 84, 0.8)',
                        borderColor: 'rgba(25, 135, 84, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'ปฏิเสธ',
                        data: rejectedData,
                        backgroundColor: 'rgba(220, 53, 69, 0.8)',
                        borderColor: 'rgba(220, 53, 69, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }
    
    // ===== Event Listeners =====
    
    /**
     * Filter change event
     */
    filterRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            currentFilter = this.value;
            loadRecentRequests();
        });
    });
    
    /**
     * Logout event
     */
    document.getElementById('logout').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });
    
    // ===== Global Functions =====
    
    /**
     * รีเฟรชสถิติ
     */
    window.refreshStats = async function() {
        try {
            showAlert('กำลังรีเฟรชข้อมูล...', 'info');
            await loadDashboardStats();
            await loadRecentRequests();
            showAlert('รีเฟรชข้อมูลสำเร็จ', 'success');
        } catch (error) {
            console.error('Error refreshing stats:', error);
            showAlert('เกิดข้อผิดพลาดในการรีเฟรชข้อมูล', 'danger');
        }
    };
    
    /**
     * ดูรายละเอียดคำขอ
     */
    window.viewRequestDetail = function(requestId) {
        window.location.href = `advisor-request-detail.html?id=${requestId}`;
    };
    
    /**
     * อนุมัติด่วน
     */
    window.quickApprove = async function(requestId) {
        try {
            loadingModal.show();
            
            // โหลดรายละเอียดคำขอ
            const response = await fetch(`/api/approval-workflow/advisor/request/${requestId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const request = await response.json();
                showQuickApprovalModal(request);
            } else {
                throw new Error('ไม่สามารถโหลดรายละเอียดคำขอได้');
            }
            
        } catch (error) {
            console.error('Error loading request for quick approval:', error);
            showAlert(error.message, 'danger');
        } finally {
            loadingModal.hide();
        }
    };
    
    /**
     * แสดง Quick Approval Modal
     */
    function showQuickApprovalModal(request) {
        const content = document.getElementById('quick-approval-content');
        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>ข้อมูลนักศึกษา</h6>
                    <p><strong>ชื่อ:</strong> ${escapeHtml(request.student_name)}</p>
                    <p><strong>รหัส:</strong> ${escapeHtml(request.student_id)}</p>
                    <p><strong>คณะ:</strong> ${escapeHtml(request.faculty_name)}</p>
                </div>
                <div class="col-md-6">
                    <h6>ข้อมูลคำขอ</h6>
                    <p><strong>วันที่:</strong> ${new Date(request.created_at).toLocaleDateString('th-TH')}</p>
                    <p><strong>ประเภท:</strong> ${escapeHtml(request.document_type_name)}</p>
                </div>
            </div>
            <hr>
            <h6>หัวข้อคำขอ</h6>
            <p>${escapeHtml(request.request_title)}</p>
            <h6>รายละเอียด</h6>
            <p class="border p-3 bg-light rounded">${escapeHtml(request.request_description).replace(/\n/g, '<br>')}</p>
            
            <div class="mt-3">
                <label for="quick-comment" class="form-label">ความคิดเห็น (ถ้ามี)</label>
                <textarea class="form-control" id="quick-comment" rows="2" placeholder="เพิ่มความคิดเห็นหรือข้อแนะนำ"></textarea>
            </div>
        `;
        
        // ตั้งค่าปุ่ม
        document.getElementById('quick-approve-btn').onclick = () => approveRequest(request.id);
        document.getElementById('quick-reject-btn').onclick = () => rejectRequest(request.id);
        
        quickApprovalModal.show();
    }
    
    /**
     * อนุมัติคำขอ
     */
    async function approveRequest(requestId) {
        try {
            const comment = document.getElementById('quick-comment').value;
            
            const response = await fetch(`/api/approval-workflow/advisor/approve/${requestId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ comment })
            });
            
            if (response.ok) {
                quickApprovalModal.hide();
                showAlert('อนุมัติคำขอสำเร็จ', 'success');
                await refreshStats();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'เกิดข้อผิดพลาดในการอนุมัติ');
            }
            
        } catch (error) {
            console.error('Error approving request:', error);
            showAlert(error.message, 'danger');
        }
    }
    
    /**
     * ปฏิเสธคำขอ
     */
    async function rejectRequest(requestId) {
        try {
            const reason = prompt('กรุณาระบุเหตุผลในการปฏิเสธ:');
            if (!reason || reason.trim() === '') {
                showAlert('กรุณาระบุเหตุผลในการปฏิเสธ', 'warning');
                return;
            }
            
            const response = await fetch(`/api/approval-workflow/advisor/reject/${requestId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rejection_reason: reason })
            });
            
            if (response.ok) {
                quickApprovalModal.hide();
                showAlert('ปฏิเสธคำขอสำเร็จ', 'success');
                await refreshStats();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'เกิดข้อผิดพลาดในการปฏิเสธ');
            }
            
        } catch (error) {
            console.error('Error rejecting request:', error);
            showAlert(error.message, 'danger');
        }
    }
    
    // ===== Utility Functions =====
    
    /**
     * ได้รับคลาส CSS สำหรับสถานะ
     */
    function getStatusClass(status) {
        switch (status) {
            case 'waiting_approval':
                return 'status-waiting';
            case 'approved_by_advisor':
                return 'status-approved';
            case 'rejected_by_advisor':
                return 'status-rejected';
            default:
                return 'status-waiting';
        }
    }
    
    /**
     * ได้รับข้อความแสดงสถานะ
     */
    function getStatusText(status) {
        switch (status) {
            case 'waiting_approval':
                return 'รอการอนุมัติ';
            case 'approved_by_advisor':
                return 'อนุมัติแล้ว';
            case 'rejected_by_advisor':
                return 'ปฏิเสธ';
            default:
                return 'ไม่ทราบสถานะ';
        }
    }
    
    /**
     * หลีกเลี่ยง HTML injection
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * แสดงข้อความแจ้งเตือน
     */
    function showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;
        
        const alertId = 'alert-' + Date.now();
        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="bi bi-${getAlertIcon(type)} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        alertContainer.innerHTML = alertHtml;
        
        // เลื่อนไปที่ alert
        alertContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // ซ่อน alert อัตโนมัติ
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                const alert = bootstrap.Alert.getOrCreateInstance(alertElement);
                alert.close();
            }
        }, type === 'success' ? 3000 : 5000);
    }
    
    /**
     * ได้รับไอคอนสำหรับ alert
     */
    function getAlertIcon(type) {
        switch (type) {
            case 'success':
                return 'check-circle';
            case 'danger':
                return 'exclamation-triangle';
            case 'warning':
                return 'exclamation-circle';
            case 'info':
            default:
                return 'info-circle';
        }
    }
    
    /**
     * จัดรูปแบบวันที่
     */
    function formatDate(dateString, includeTime = false) {
        const date = new Date(dateString);
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'Asia/Bangkok'
        };
        
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        
        return date.toLocaleDateString('th-TH', options);
    }
    
    /**
     * คำนวณเวลาที่ผ่านมา
     */
    function timeAgo(dateString) {
        const now = new Date();
        const past = new Date(dateString);
        const diffInSeconds = Math.floor((now - past) / 1000);
        
        if (diffInSeconds < 60) {
            return 'เมื่อสักครู่';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} นาทีที่แล้ว`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} ชั่วโมงที่แล้ว`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} วันที่แล้ว`;
        }
    }
    
    /**
     * เพิ่มเสียงแจ้งเตือน
     */
    function playNotificationSound() {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+/3yHkpBSV+zPLaizAGHWhv5+OZSA0PVqzn8bllHgg2jdv10XwwBSF1w+/glEILElyx6+SdTgwOUarm7rJdGAc5k9nzx3ElBSl+zOrlnlAODlOq5O2zXhoGPJPY88yCKgUme8rx4ZVEDBFYr+jmsVsaC0Am+PTEfigDKHfH8eCQQAoWXblv+SZWEAhMnuL0t2UeBy6Bz/LZiygELIHO8t2OOgcRVKnj8K5iGQc7ktr0unMpBit+zPPbl0YNCVGn4/SvXBgHN47Y8Md0KAUrd8rx3Y0+CQ5Stu7or1saC0Al8PbJgygEJ3TL8+OQQAYRVq7o4qVUFQg9jdn2wHQlBCtxzu7dnEENElGr5fGwZRsGOpDX9MBxKQctds7y2o05ChNSreTuq2AcBzWP2fPCfysPKm3J8eeaSw0NUann6qVlHQs3j9fzzXktBSR4yu3ej0MKElOu6eOmVBQIOojY+8VzKwYod8nw4I9BChNYr+vrmFgUByqB0fPWgjEFKnTH8N2NPwkOVKvl7q5iGgc5k9j0w3QoByuAzvLZiycELYDR89qLNAcPXLfj77JdGAY2kdn0xHUoBnHL8N+QQgoSVa7n7K5fGgc1j9n0wXQoBH/M8eCPQQoSVK7o5qNWFggoh8r11n4uBCJ0w+/gl0ULDk+l6e2vYhsFPJTZ9b95LgUtds7y2o05ChNSreTuq2AcBzWP2fPCfysPK3DJ8eeaSw0NUann6qVlHQs3j9fzzXktBSR4yu3ej0UKElWu6+OpVxUILYPK9tl+LwUjccPv4JdECw5PpuvusGIbBTyU2fa/eS4FLXbO8tqNOQoTUq3k7qtgHAc1j9nzwn8rDy');
            audio.volume = 0.3;
            audio.play().catch(() => {
                // ไม่สามารถเล่นเสียงได้ (browser policy)
            });
        } catch (error) {
            // ไม่สำคัญถ้าเล่นเสียงไม่ได้
        }
    }
    
    // ===== Cleanup =====
    
    /**
     * ทำความสะอาดเมื่อออกจากหน้า
     */
    window.addEventListener('beforeunload', function() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
        if (monthlyChart) {
            monthlyChart.destroy();
        }
    });
    
    // ===== Start Application =====
    
    init();
});

// ===== Service Worker สำหรับ Notifications (Optional) =====

/**
 * ลงทะเบียน Service Worker สำหรับ Push Notifications
 */
if ('serviceWorker' in navigator && 'PushManager' in window) {
    navigator.serviceWorker.register('/sw.js')
        .then(function(registration) {
            console.log('ServiceWorker registration successful');
        })
        .catch(function(err) {
            console.log('ServiceWorker registration failed: ', err);
        });
}

// ===== Keyboard Shortcuts =====

document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + R = Refresh
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        if (typeof refreshStats === 'function') {
            refreshStats();
        }
    }
    
    // Ctrl/Cmd + 1 = Go to pending requests
    if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        window.location.href = 'advisor-requests.html?status=waiting_approval';
    }
});

console.log('✅ Advisor Dashboard JavaScript loaded');
