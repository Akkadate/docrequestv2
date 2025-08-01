// ===============================================
// Enhanced Status Tracking JavaScript
// ===============================================
// ไฟล์: public/js/enhanced-status.js
// วันที่สร้าง: 30 กรกฎาคม 2025
// วัตถุประสงค์: เพิ่มเติมการแสดงสถานะการอนุมัติในหน้า status.html

// เพิ่มฟังก์ชันใหม่ให้กับไฟล์ status.js ที่มีอยู่แล้ว
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Enhanced Status Tracking initialized');
    
    // ตรวจสอบว่ามีการโหลด status.js แล้วหรือไม่
    if (typeof loadUserRequests === 'undefined') {
        console.warn('⚠️ Base status.js not loaded, some features may not work');
    }
    
    // Override หรือ extend ฟังก์ชันที่มีอยู่
    enhanceStatusDisplay();
    addApprovalStatusSupport();
});

/**
 * เพิ่มการแสดงสถานะการอนุมัติ
 */
function enhanceStatusDisplay() {
    // เพิ่มสถานะใหม่สำหรับ approval workflow
    const originalGetStatusBadge = window.getStatusBadge;
    
    window.getStatusBadge = function(status) {
        // เพิ่มสถานะใหม่สำหรับ approval workflow
        const approvalStatuses = {
            'waiting_approval': {
                class: 'bg-warning text-dark',
                icon: 'clock-history',
                text: 'รอการอนุมัติ'
            },
            'approved_by_advisor': {
                class: 'bg-info text-white',
                icon: 'check-circle',
                text: 'อนุมัติแล้ว'
            },
            'rejected_by_advisor': {
                class: 'bg-danger text-white',
                icon: 'x-circle',
                text: 'ปฏิเสธโดยอาจารย์'
            }
        };
        
        if (approvalStatuses[status]) {
            const statusInfo = approvalStatuses[status];
            return `
                <span class="badge ${statusInfo.class} d-inline-flex align-items-center">
                    <i class="bi bi-${statusInfo.icon} me-1"></i>
                    ${statusInfo.text}
                </span>
            `;
        }
        
        // ใช้ฟังก์ชันเดิมสำหรับสถานะปกติ
        if (originalGetStatusBadge) {
            return originalGetStatusBadge(status);
        }
        
        // Fallback สำหรับสถานะปกติ
        const normalStatuses = {
            'pending': {
                class: 'bg-secondary text-white',
                icon: 'clock',
                text: 'รอดำเนินการ'
            },
            'processing': {
                class: 'bg-primary text-white',
                icon: 'gear',
                text: 'กำลังดำเนินการ'
            },
            'ready': {
                class: 'bg-success text-white',
                icon: 'check-square',
                text: 'พร้อมรับเอกสาร'
            },
            'completed': {
                class: 'bg-success text-white',
                icon: 'check-circle',
                text: 'เสร็จสิ้น'
            },
            'rejected': {
                class: 'bg-danger text-white',
                icon: 'x-circle',
                text: 'ถูกปฏิเสธ'
            }
        };
        
        const statusInfo = normalStatuses[status] || normalStatuses['pending'];
        return `
            <span class="badge ${statusInfo.class} d-inline-flex align-items-center">
                <i class="bi bi-${statusInfo.icon} me-1"></i>
                ${statusInfo.text}
            </span>
        `;
    };
}

/**
 * เพิ่มการสนับสนุนสถานะการอนุมัติ
 */
function addApprovalStatusSupport() {
    // Override ฟังก์ชันสร้างแถวตาราง
    const originalCreateRequestRow = window.createRequestRow;
    
    window.createRequestRow = function(request) {
        // ตรวจสอบว่าเป็นคำขอที่ต้องอนุมัติหรือไม่
        const isApprovalRequest = request.request_type && 
            ['late_registration', 'add_drop_course'].includes(request.request_type);
        
        let documentName = request.document_name || '';
        let statusBadge = window.getStatusBadge(request.status);
        let additionalInfo = '';
        
        // เพิ่มข้อมูลพิเศษสำหรับคำขอที่ต้องอนุมัติ
        if (isApprovalRequest) {
            documentName = `
                <div class="d-flex align-items-center">
                    <i class="bi bi-shield-check text-warning me-2" title="ต้องการการอนุมัติ"></i>
                    <div>
                        <div class="fw-semibold">${escapeHtml(request.request_title || documentName)}</div>
                        <small class="text-muted">${escapeHtml(documentName)}</small>
                    </div>
                </div>
            `;
            
            // แสดงสถานะการอนุมัติ
            if (request.approval_status) {
                statusBadge = window.getStatusBadge(request.approval_status);
            }
            
            // เพิ่มข้อมูลอาจารย์ที่ปรึกษา
            if (request.advisor_name) {
                additionalInfo = `
                    <div class="mt-1">
                        <small class="text-muted">
                            <i class="bi bi-person me-1"></i>
                            อาจารย์ที่ปรึกษา: ${escapeHtml(request.advisor_name)}
                        </small>
                    </div>
                `;
            }
        }
        
        // ใช้ฟังก์ชันเดิมถ้ามี
        if (originalCreateRequestRow && !isApprovalRequest) {
            return originalCreateRequestRow(request);
        }
        
        // สร้างแถวใหม่
        const createdDate = new Date(request.created_at).toLocaleDateString('th-TH');
        const deliveryText = request.delivery_method === 'mail' ? 'จัดส่งทางไปรษณีย์' : 'รับด้วยตนเอง';
        const urgentBadge = request.urgent ? '<span class="badge bg-warning text-dark ms-1">เร่งด่วน</span>' : '';
        
        return `
            <tr onclick="viewRequestDetail(${request.id})" style="cursor: pointer;" 
                title="คลิกเพื่อดูรายละเอียด">
                <td>
                    <div class="d-flex align-items-center">
                        <div class="me-2">
                            <div class="request-id-badge">#${request.id}</div>
                        </div>
                        <div class="flex-grow-1">
                            ${documentName}
                            ${additionalInfo}
                        </div>
                    </div>
                </td>
                <td>
                    <small class="text-muted">${createdDate}</small>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="bi bi-${request.delivery_method === 'mail' ? 'mailbox' : 'building'} me-1"></i>
                        <span>${deliveryText}</span>
                        ${urgentBadge}
                    </div>
                </td>
                <td>${statusBadge}</td>
                <td>
                    <div class="text-end">
                        <strong>${request.total_price} ฿</strong>
                    </div>
                </td>
            </tr>
        `;
    };
}

/**
 * เพิ่มฟิลเตอร์สำหรับคำขอที่ต้องอนุมัติ
 */
function addApprovalFilters() {
    const statusFilter = document.getElementById('status-filter');
    if (!statusFilter) return;
    
    // เพิ่ม options ใหม่
    const approvalOptions = [
        { value: 'waiting_approval', text: 'รอการอนุมัติ' },
        { value: 'approved_by_advisor', text: 'อนุมัติแล้ว' },
        { value: 'rejected_by_advisor', text: 'ปฏิเสธโดยอาจารย์' }
    ];
    
    approvalOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        statusFilter.appendChild(optionElement);
    });
}

/**
 * เพิ่มการแสดงรายละเอียดการอนุมัติในหน้า request detail
 */
function enhanceRequestDetail() {
    // เพิ่มการแสดงข้อมูลการอนุมัติ
    const originalLoadRequestDetail = window.loadRequestDetail;
    
    window.loadRequestDetail = async function(requestId) {
        try {
            // เรียกฟังก์ชันเดิมก่อน
            if (originalLoadRequestDetail) {
                await originalLoadRequestDetail(requestId);
            }
            
            // ตรวจสอบว่าเป็นคำขอที่ต้องอนุมัติหรือไม่
            const approvalResponse = await fetch(`/api/approval-workflow/request/${requestId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (approvalResponse.ok) {
                const approvalData = await approvalResponse.json();
                addApprovalSection(approvalData);
            }
            
        } catch (error) {
            console.error('Error loading approval details:', error);
        }
    };
}

/**
 * เพิ่มส่วนแสดงข้อมูลการอนุมัติ
 */
function addApprovalSection(approvalData) {
    const requestInfoCard = document.querySelector('.card-body');
    if (!requestInfoCard) return;
    
    // สร้าง HTML สำหรับข้อมูลการอนุมัติ
    const approvalHtml = `
        <hr>
        <div class="approval-section">
            <h6 class="text-primary mb-3">
                <i class="bi bi-shield-check me-2"></i>
                ข้อมูลการอนุมัติ
            </h6>
            
            <div class="row">
                <div class="col-md-6">
                    <p><strong>ประเภทคำขอ:</strong> ${getRequestTypeText(approvalData.request_type)}</p>
                    <p><strong>หัวข้อคำขอ:</strong> ${escapeHtml(approvalData.request_title)}</p>
                    <p><strong>สถานะการอนุมัติ:</strong> ${window.getStatusBadge(approvalData.approval_status)}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>อาจารย์ที่ปรึกษา:</strong> ${escapeHtml(approvalData.advisor_name)}</p>
                    <p><strong>อีเมลอาจารย์:</strong> 
                        <a href="mailto:${approvalData.advisor_email}">${escapeHtml(approvalData.advisor_email)}</a>
                    </p>
                    ${approvalData.email_sent_at ? `
                        <p><strong>ส่งอีเมลแจ้งเตือน:</strong> 
                            <small class="text-success">
                                <i class="bi bi-check-circle me-1"></i>
                                ${new Date(approvalData.email_sent_at).toLocaleDateString('th-TH')}
                            </small>
                        </p>
                    ` : ''}
                </div>
            </div>
            
            <div class="row">
                <div class="col-12">
                    <p><strong>รายละเอียดคำขอ:</strong></p>
                    <div class="bg-light p-3 rounded">
                        ${escapeHtml(approvalData.request_description).replace(/\n/g, '<br>')}
                    </div>
                </div>
            </div>
            
            ${approvalData.advisor_comment ? `
                <div class="row mt-3">
                    <div class="col-12">
                        <p><strong>ความคิดเห็นจากอาจารย์:</strong></p>
                        <div class="alert alert-info">
                            <i class="bi bi-chat-quote me-2"></i>
                            ${escapeHtml(approvalData.advisor_comment)}
                        </div>
                    </div>
                </div>
            ` : ''}
            
            ${approvalData.rejection_reason ? `
                <div class="row mt-3">
                    <div class="col-12">
                        <p><strong>เหตุผลการปฏิเสธ:</strong></p>
                        <div class="alert alert-danger">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            ${escapeHtml(approvalData.rejection_reason)}
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    // เพิ่มส่วนการอนุมัติลงในการ์ด
    requestInfoCard.insertAdjacentHTML('beforeend', approvalHtml);
    
    // เพิ่มประวัติการอนุมัติ
    if (approvalData.history && approvalData.history.length > 0) {
        addApprovalHistory(approvalData.history);
    }
}

/**
 * เพิ่มประวัติการอนุมัติ
 */
function addApprovalHistory(history) {
    const statusHistoryTable = document.getElementById('status-history-table');
    if (!statusHistoryTable) return;
    
    // เพิ่มประวัติการอนุมัติ
    const approvalHistoryHtml = history.map(item => {
        const actionText = getActionText(item.action);
        const dateTime = new Date(item.created_at).toLocaleString('th-TH');
        
        return `
            <tr class="approval-history-row">
                <td>
                    <small>${dateTime}</small>
                </td>
                <td>
                    <span class="badge bg-info">${actionText}</span>
                </td>
                <td>
                    ${escapeHtml(item.comment || '-')}
                </td>
                <td>
                    <small class="text-muted">${escapeHtml(item.created_by_name || 'ระบบ')}</small>
                </td>
            </tr>
        `;
    }).join('');
    
    // เพิ่มแถวใหม่ที่ด้านบนของตาราง
    statusHistoryTable.insertAdjacentHTML('afterbegin', approvalHistoryHtml);
}

/**
 * แปลงประเภทคำขอเป็นข้อความ
 */
function getRequestTypeText(requestType) {
    const types = {
        'late_registration': 'ขออนุมัติลงทะเบียนเกินกำหนด',
        'add_drop_course': 'ขออนุมัติเพิ่มถอนรายวิชา'
    };
    return types[requestType] || requestType;
}

/**
 * แปลงการกระทำเป็นข้อความ
 */
function getActionText(action) {
    const actions = {
        'created': 'สร้างคำขอ',
        'email_sent': 'ส่งอีเมลแจ้งเตือน',
        'approved': 'อนุมัติ',
        'rejected': 'ปฏิเสธ',
        'reminder_sent': 'ส่งการเตือน',
        'updated': 'อัปเดต'
    };
    return actions[action] || action;
}

/**
 * เพิ่มไอคอนแสดงประเภทเอกสาร
 */
function addDocumentTypeIcons() {
    // เพิ่ม CSS สำหรับไอคอนประเภทเอกสาร
    const style = document.createElement('style');
    style.textContent = `
        .request-id-badge {
            background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%);
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 0.375rem;
            font-size: 0.75rem;
            font-weight: 600;
            letter-spacing: 0.05em;
        }
        
        .approval-history-row {
            background-color: rgba(13, 110, 253, 0.05);
            border-left: 3px solid #0d6efd;
        }
        
        .approval-section {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 1.5rem;
            border-radius: 0.75rem;
            border: 1px solid #dee2e6;
        }
        
        .approval-section h6 {
            border-bottom: 2px solid #0d6efd;
            padding-bottom: 0.5rem;
        }
    `;
    document.head.appendChild(style);
}

/**
 * เพิ่มการแจ้งเตือนสำหรับสถานะใหม่
 */
function addStatusNotifications() {
    // ตรวจสอบคำขอที่รอการอนุมัติ
    const pendingApprovals = document.querySelectorAll('[data-status="waiting_approval"]');
    
    if (pendingApprovals.length > 0) {
        showNotification(
            `มีคำขอ ${pendingApprovals.length} รายการที่รอการอนุมัติจากอาจารย์ที่ปรึกษา`,
            'info'
        );
    }
}

/**
 * แสดงการแจ้งเตือน
 */
function showNotification(message, type = 'info') {
    // สร้าง notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 1050;
        max-width: 350px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    notification.innerHTML = `
        <i class="bi bi-info-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // ลบการแจ้งเตือนหลัง 5 วินาที
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

/**
 * Utility function สำหรับ escape HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Initialize Enhanced Features =====

// เพิ่มฟิลเตอร์การอนุมัติ
setTimeout(() => {
    addApprovalFilters();
    addDocumentTypeIcons();
    enhanceRequestDetail();
    addStatusNotifications();
}, 100);

// เพิ่ม event listener สำหรับการโหลดข้อมูลใหม่
document.addEventListener('requestsLoaded', function() {
    addStatusNotifications();
});

console.log('✅ Enhanced Status Tracking JavaScript loaded');
