// ===============================================
// Faculty Management JavaScript
// ===============================================
// ไฟล์: public/js/faculty-management.js
// วันที่สร้าง: 30 กรกฎาคม 2025
// วัตถุประสงค์: จัดการหน้าจัดการคณะและอาจารย์ที่ปรึกษา

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Faculty Management initialized');
    
    // Global variables
    let currentPage = 1;
    let currentFilter = '';
    let currentSearch = '';
    let faculties = [];
    let advisors = [];
    let emailTemplates = [];
    
    // Modal instances
    const addAdvisorModal = new bootstrap.Modal(document.getElementById('addAdvisorModal'));
    const editAdvisorModal = new bootstrap.Modal(document.getElementById('editAdvisorModal'));
    const deleteAdvisorModal = new bootstrap.Modal(document.getElementById('deleteAdvisorModal'));
    const emailTestModal = new bootstrap.Modal(document.getElementById('emailTestModal'));
    const loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
    
    // Elements
    const advisorsTable = document.getElementById('advisors-table');
    const facultyFilterSelect = document.getElementById('faculty-filter');
    const searchInput = document.getElementById('search-advisor');
    const tableInfoSpan = document.getElementById('table-info');
    const paginationUl = document.getElementById('pagination');
    const emailTemplatesTable = document.getElementById('email-templates-table');
    
    // Statistics elements
    const totalFacultiesSpan = document.getElementById('total-faculties');
    const activeAdvisorsSpan = document.getElementById('active-advisors');
    const pendingApprovalsSpan = document.getElementById('pending-approvals');
    const emailsSentSpan = document.getElementById('emails-sent');
    
    // Form elements
    const addAdvisorForm = document.getElementById('add-advisor-form');
    const editAdvisorForm = document.getElementById('edit-advisor-form');
    const emailTestForm = document.getElementById('email-test-form');
    
    // ===== Initialization =====
    
    async function init() {
        try {
            // ตรวจสอบสิทธิ์ Admin
            if (!checkAdminAuth()) {
                return;
            }
            
            // โหลดข้อมูลเริ่มต้น
            await loadFaculties();
            await loadStatistics();
            await loadAdvisors();
            await loadEmailTemplates();
            
            // Setup event listeners
            setupEventListeners();
            
            console.log('✅ Faculty Management ready');
            
        } catch (error) {
            console.error('❌ Error initializing faculty management:', error);
            showAlert('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณารีเฟรชหน้าเว็บ', 'danger');
        }
    }
    
    /**
     * ตรวจสอบสิทธิ์ Admin
     */
    function checkAdminAuth() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '../login.html';
            return false;
        }
        
        // ตรวจสอบ role จาก token (simplified check)
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.role !== 'admin') {
                showAlert('ไม่มีสิทธิ์เข้าถึงหน้านี้', 'danger');
                window.location.href = '../dashboard.html';
                return false;
            }
        } catch (error) {
            console.error('Invalid token:', error);
            localStorage.removeItem('token');
            window.location.href = '../login.html';
            return false;
        }
        
        return true;
    }
    
    /**
     * โหลดรายการคณะ
     */
    async function loadFaculties() {
        try {
            const response = await fetch('/api/documents/types', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                // ใช้ข้อมูลคณะจาก API documents หรือสร้าง API แยก
                faculties = [
                    { id: 1, name_th: 'คณะบริหารธุรกิจ', name_en: 'Faculty of Business Administration' },
                    { id: 2, name_th: 'คณะวิศวกรรมศาสตร์', name_en: 'Faculty of Engineering' },
                    { id: 3, name_th: 'คณะนิติศาสตร์', name_en: 'Faculty of Law' },
                    { id: 4, name_th: 'คณะศิลปกรรมศาสตร์', name_en: 'Faculty of Liberal Arts' },
                    { id: 5, name_th: 'คณะวิทยาศาสตร์และเทคโนโลยี', name_en: 'Faculty of Science and Technology' }
                ];
                
                populateFacultySelects();
            }
        } catch (error) {
            console.error('Error loading faculties:', error);
        }
    }
    
    /**
     * เติมข้อมูลใน faculty selects
     */
    function populateFacultySelects() {
        const selects = [
            facultyFilterSelect,
            document.getElementById('advisor-faculty'),
            document.getElementById('edit-advisor-faculty')
        ];
        
        selects.forEach(select => {
            if (!select) return;
            
            // เคลียร์ options เดิม (ยกเว้น default option)
            const defaultOption = select.querySelector('option[value=""]');
            select.innerHTML = '';
            if (defaultOption) {
                select.appendChild(defaultOption);
            }
            
            // เพิ่ม faculty options
            faculties.forEach(faculty => {
                const option = document.createElement('option');
                option.value = faculty.id;
                option.textContent = faculty.name_th;
                select.appendChild(option);
            });
        });
    }
    
    /**
     * โหลดสถิติ
     */
    async function loadStatistics() {
    try {
        const response = await fetch('/api/admin/faculty-advisors/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            
            // อัปเดตสถิติ
            totalFacultiesSpan.textContent = faculties.length || 5;
            activeAdvisorsSpan.textContent = stats.active || 0;
            pendingApprovalsSpan.textContent = stats.todayStats?.pending || 0;
            emailsSentSpan.textContent = stats.todayStats?.emailsSent || 0;
            
        } else {
            console.error('Failed to load statistics');
        }
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        // แสดงค่าเริ่มต้น
        totalFacultiesSpan.textContent = '5';
        activeAdvisorsSpan.textContent = '0';
        pendingApprovalsSpan.textContent = '0';
        emailsSentSpan.textContent = '0';
    }
}

    
  async function loadAdvisors() {
    try {
        showLoadingInTable();
        
        // สร้าง URL พร้อม query parameters
        const url = new URL('/api/admin/faculty-advisors', window.location.origin);
        url.searchParams.append('page', currentPage.toString());
        url.searchParams.append('limit', '10');
        
        if (currentFilter) {
            url.searchParams.append('faculty_id', currentFilter);
        }
        
        if (currentSearch) {
            url.searchParams.append('search', currentSearch);
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            advisors = data.advisors || [];
            
            // อัปเดตข้อมูล pagination
            if (data.pagination) {
                updateTableInfo(
                    data.pagination.totalItems,
                    ((data.pagination.currentPage - 1) * data.pagination.itemsPerPage) + 1,
                    Math.min(data.pagination.currentPage * data.pagination.itemsPerPage, data.pagination.totalItems)
                );
                updatePagination(data.pagination.currentPage, data.pagination.totalPages);
            }
            
            renderAdvisorsTable();
            
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to load advisors');
        }
        
    } catch (error) {
        console.error('Error loading advisors:', error);
        showErrorInTable('เกิดข้อผิดพลาดในการโหลดข้อมูลอาจารย์ที่ปรึกษา: ' + error.message);
    }
}

  /**
 * แสดงข้อมูลในตารางอาจารย์ที่ปรึกษา (ใช้ข้อมูลจาก API)
 */
function renderAdvisorsTable() {
    if (!advisors || advisors.length === 0) {
        showEmptyTable();
        return;
    }
    
    // สร้าง HTML (ไม่ต้องกรองข้อมูลเพราะ API กรองให้แล้ว)
    const tableHtml = advisors.map(advisor => {
        const statusClass = advisor.is_active ? 'status-active' : 'status-inactive';
        const statusText = advisor.is_active ? 'ใช้งาน' : 'ระงับ';
        
        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="me-3">
                            <i class="bi bi-person-circle fs-4 text-primary"></i>
                        </div>
                        <div>
                            <div class="fw-semibold">${escapeHtml(advisor.advisor_name)}</div>
                            <small class="text-muted">ID: ${advisor.id}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-light text-dark border">
                        ${escapeHtml(advisor.faculty_name_th)}
                    </span>
                </td>
                <td>
                    <div>${escapeHtml(advisor.department || '-')}</div>
                </td>
                <td>
                    <div>
                        <i class="bi bi-envelope me-1"></i>
                        <a href="mailto:${advisor.advisor_email}" class="text-decoration-none">
                            ${escapeHtml(advisor.advisor_email)}
                        </a>
                    </div>
                </td>
                <td>
                    <div>
                        <i class="bi bi-telephone me-1"></i>
                        ${escapeHtml(advisor.advisor_phone || '-')}
                    </div>
                </td>
                <td>
                    <span class="${statusClass}">${statusText}</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-warning btn-action" onclick="editAdvisor(${advisor.id})"
                                title="แก้ไขข้อมูล">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-info btn-action" onclick="sendTestEmail('${advisor.advisor_email}')"
                                title="ส่งอีเมลทดสอบ">
                            <i class="bi bi-envelope"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-action" onclick="deleteAdvisor(${advisor.id})"
                                title="ลบอาจารย์">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    advisorsTable.innerHTML = tableHtml;
}
        
        // อัปเดตข้อมูลตาราง
        updateTableInfo(filteredAdvisors.length, startIndex + 1, Math.min(endIndex, filteredAdvisors.length));
        
        // อัปเดต pagination
        updatePagination(currentPage, totalPages);
    }
    
    /**
     * แสดงตารางว่าง
     */
    function showEmptyTable() {
        advisorsTable.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <i class="bi bi-person-x fs-1 text-muted mb-3 d-block"></i>
                    <p class="text-muted mb-0">ไม่พบข้อมูลอาจารย์ที่ปรึกษา</p>
                    <button class="btn btn-primary btn-sm mt-2" data-bs-toggle="modal" data-bs-target="#addAdvisorModal">
                        <i class="bi bi-person-plus me-1"></i>
                        เพิ่มอาจารย์ที่ปรึกษา
                    </button>
                </td>
            </tr>
        `;
        updateTableInfo(0, 0, 0);
        updatePagination(1, 1);
    }
    
    /**
     * แสดง loading ในตาราง
     */
    function showLoadingInTable() {
        advisorsTable.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 mb-0 text-muted">กำลังโหลดข้อมูล...</p>
                </td>
            </tr>
        `;
    }
    
    /**
     * แสดงข้อผิดพลาดในตาราง
     */
    function showErrorInTable(message) {
        advisorsTable.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="bi bi-exclamation-triangle fs-1 text-danger mb-2 d-block"></i>
                    <p class="text-danger mb-2">${message}</p>
                    <button class="btn btn-outline-primary btn-sm" onclick="loadAdvisors()">
                        <i class="bi bi-arrow-clockwise me-1"></i>
                        ลองใหม่
                    </button>
                </td>
            </tr>
        `;
    }
    
    /**
     * อัปเดตข้อมูลตาราง
     */
    function updateTableInfo(totalItems, startItem, endItem) {
        if (tableInfoSpan) {
            if (totalItems === 0) {
                tableInfoSpan.textContent = 'ไม่มีข้อมูล';
            } else {
                tableInfoSpan.textContent = `แสดง ${startItem}-${endItem} จาก ${totalItems} รายการ`;
            }
        }
    }
    
    /**
     * อัปเดต pagination
     */
    function updatePagination(currentPage, totalPages) {
        if (!paginationUl) return;
        
        let paginationHtml = '';
        
        if (totalPages <= 1) {
            paginationUl.innerHTML = '';
            return;
        }
        
        // Previous button
        paginationHtml += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage - 1})" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `;
        
        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                </li>
            `;
        }
        
        // Next button
        paginationHtml += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage + 1})" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `;
        
        paginationUl.innerHTML = paginationHtml;
    }
    
    /**
     * เปลี่ยนหน้า
     */
    window.changePage = function(page) {
        currentPage = page;
        renderAdvisorsTable();
    };
    
    /**
     * โหลดเทมเพลตอีเมล
     */
    async function loadEmailTemplates() {
        try {
            const response = await fetch('/api/approval-workflow/email-templates', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                emailTemplates = await response.json();
                renderEmailTemplatesTable();
            } else {
                // ใช้ mock data
                emailTemplates = [
                    {
                        id: 1,
                        template_name: 'approval_request_notification',
                        subject_th: 'แจ้งเตือน: มีคำขออนุมัติเอกสารใหม่',
                        is_active: true,
                        updated_at: '2025-07-30T10:00:00Z'
                    },
                    {
                        id: 2,
                        template_name: 'approval_reminder',
                        subject_th: 'เตือน: คำขออนุมัติเอกสาร',
                        is_active: true,
                        updated_at: '2025-07-30T10:00:00Z'
                    }
                ];
                renderEmailTemplatesTable();
            }
        } catch (error) {
            console.error('Error loading email templates:', error);
            emailTemplatesTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-3 text-muted">
                        เกิดข้อผิดพลาดในการโหลดเทมเพลตอีเมล
                    </td>
                </tr>
            `;
        }
    }
    
    /**
     * แสดงตารางเทมเพลตอีเมล
     */
    function renderEmailTemplatesTable() {
        if (!emailTemplates || emailTemplates.length === 0) {
            emailTemplatesTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-3 text-muted">
                        ไม่มีเทมเพลตอีเมล
                    </td>
                </tr>
            `;
            return;
        }
        
        const tableHtml = emailTemplates.map(template => {
            const statusClass = template.is_active ? 'template-status-active' : 'template-status-inactive';
            const statusIcon = template.is_active ? 'bi-check-circle' : 'bi-x-circle';
            const statusText = template.is_active ? 'ใช้งาน' : 'ปิดใช้งาน';
            const updatedDate = new Date(template.updated_at).toLocaleDateString('th-TH');
            
            return `
                <tr class="email-template-row" onclick="editEmailTemplate(${template.id})">
                    <td>
                        <div class="fw-semibold">${escapeHtml(template.template_name)}</div>
                    </td>
                    <td>
                        <div class="text-truncate" style="max-width: 300px;" title="${escapeHtml(template.subject_th)}">
                            ${escapeHtml(template.subject_th)}
                        </div>
                    </td>
                    <td>
                        <i class="bi ${statusIcon} ${statusClass} me-1"></i>
                        <span class="${statusClass}">${statusText}</span>
                    </td>
                    <td>
                        <small class="text-muted">${updatedDate}</small>
                    </td>
                    <td>
                        <button class="btn btn-outline-primary btn-sm" onclick="event.stopPropagation(); editEmailTemplate(${template.id})"
                                title="แก้ไขเทมเพลต">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        emailTemplatesTable.innerHTML = tableHtml;
    }
    
    // ===== Event Listeners =====
    
    function setupEventListeners() {
        // Search input
        searchInput.addEventListener('input', debounce(function() {
            currentSearch = this.value.trim();
            currentPage = 1;
            renderAdvisorsTable();
        }, 300));
        
        // Faculty filter
        facultyFilterSelect.addEventListener('change', function() {
            currentFilter = this.value;
            currentPage = 1;
            renderAdvisorsTable();
        });
        
        // Add advisor form
        document.getElementById('save-advisor-btn').addEventListener('click', saveAdvisor);
        
        // Edit advisor form
        document.getElementById('update-advisor-btn').addEventListener('click', updateAdvisor);
        
        // Delete confirmation
        document.getElementById('confirm-delete-btn').addEventListener('click', confirmDeleteAdvisor);
        
        // Email test
        document.getElementById('send-test-email-btn').addEventListener('click', sendTestEmailAction);
        
        // Logout
        document.getElementById('logout').addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = '../login.html';
        });
    }
    
    // ===== Global Functions =====
    
    /**
     * แก้ไขอาจารย์
     */
    window.editAdvisor = function(advisorId) {
        const advisor = advisors.find(a => a.id === advisorId);
        if (!advisor) {
            showAlert('ไม่พบข้อมูลอาจารย์ที่ปรึกษา', 'error');
            return;
        }
        
        // เติมข้อมูลในฟอร์ม
        document.getElementById('edit-advisor-id').value = advisor.id;
        document.getElementById('edit-advisor-name').value = advisor.advisor_name;
        document.getElementById('edit-advisor-email').value = advisor.advisor_email;
        document.getElementById('edit-advisor-faculty').value = advisor.faculty_id;
        document.getElementById('edit-advisor-phone').value = advisor.advisor_phone || '';
        document.getElementById('edit-advisor-department').value = advisor.department || '';
        document.getElementById('edit-advisor-active').checked = advisor.is_active;
        
        editAdvisorModal.show();
    };
    
    /**
     * ลบอาจารย์
     */
    window.deleteAdvisor = function(advisorId) {
        const advisor = advisors.find(a => a.id === advisorId);
        if (!advisor) {
            showAlert('ไม่พบข้อมูลอาจารย์ที่ปรึกษา', 'error');
            return;
        }
        
        // แสดงข้อมูลอาจารย์ที่จะลบ
        document.getElementById('advisor-delete-info').innerHTML = `
            <div class="row">
                <div class="col-4">
                    <strong>ชื่อ:</strong>
                </div>
                <div class="col-8">
                    ${escapeHtml(advisor.advisor_name)}
                </div>
            </div>
            <div class="row">
                <div class="col-4">
                    <strong>อีเมล:</strong>
                </div>
                <div class="col-8">
                    ${escapeHtml(advisor.advisor_email)}
                </div>
            </div>
            <div class="row">
                <div class="col-4">
                    <strong>คณะ:</strong>
                </div>
                <div class="col-8">
                    ${escapeHtml(advisor.faculty_name)}
                </div>
            </div>
        `;
        
        // เก็บ ID สำหรับการลบ
        document.getElementById('confirm-delete-btn').setAttribute('data-advisor-id', advisorId);
        
        deleteAdvisorModal.show();
    };
    
    /**
     * ส่งอีเมลทดสอบ
     */
    window.sendTestEmail = function(email) {
        document.getElementById('test-email').value = email;
        emailTestModal.show();
    };
    
    /**
     * ทดสอบระบบอีเมล
     */
    window.testEmailSystem = function() {
        document.getElementById('test-email').value = '';
        emailTestModal.show();
    };
    
    /**
     * แก้ไขเทมเพลตอีเมล
     */
    window.editEmailTemplate = function(templateId) {
        showAlert('ฟีเจอร์แก้ไขเทมเพลตอีเมลจะเพิ่มในเวอร์ชันถัดไป', 'info');
    };
    
    // ===== Form Actions =====
    
    /**
     * บันทึกอาจารย์ใหม่
     */
  /**
 * บันทึกอาจารย์ใหม่ใน Database
 */
async function saveAdvisor() {
    try {
        const formData = {
            advisor_name: document.getElementById('advisor-name').value.trim(),
            advisor_email: document.getElementById('advisor-email').value.trim(),
            faculty_id: parseInt(document.getElementById('advisor-faculty').value),
            advisor_phone: document.getElementById('advisor-phone').value.trim(),
            department: document.getElementById('advisor-department').value.trim(),
            is_active: document.getElementById('advisor-active').checked
        };
        
        // Validation
        if (!formData.advisor_name || !formData.advisor_email || !formData.faculty_id) {
            showAlert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'warning');
            return;
        }
        
        if (!isValidEmail(formData.advisor_email)) {
            showAlert('รูปแบบอีเมลไม่ถูกต้อง', 'warning');
            return;
        }
        
        showLoading('กำลังบันทึกข้อมูล...');
        
        const response = await fetch('/api/admin/faculty-advisors', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            addAdvisorModal.hide();
            addAdvisorForm.reset();
            
            // รีโหลดข้อมูล
            await loadAdvisors();
            await loadStatistics();
            
            showAlert(result.message || 'เพิ่มอาจารย์ที่ปรึกษาสำเร็จ', 'success');
            
        } else {
            throw new Error(result.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
        
    } catch (error) {
        console.error('Error saving advisor:', error);
        showAlert(error.message, 'danger');
    } finally {
        hideLoading();
    }
}
    
    /**
     * อัปเดตข้อมูลอาจารย์
     */
    async function updateAdvisor() {
        try {
            const advisorId = parseInt(document.getElementById('edit-advisor-id').value);
            const formData = {
                advisor_name: document.getElementById('edit-advisor-name').value.trim(),
                advisor_email: document.getElementById('edit-advisor-email').value.trim(),
                faculty_id: parseInt(document.getElementById('edit-advisor-faculty').value),
                advisor_phone: document.getElementById('edit-advisor-phone').value.trim(),
                department: document.getElementById('edit-advisor-department').value.trim(),
                is_active: document.getElementById('edit-advisor-active').checked
            };
            
            // Validation
            if (!formData.advisor_name || !formData.advisor_email || !formData.faculty_id) {
                showAlert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'warning');
                return;
            }
            
            if (!isValidEmail(formData.advisor_email)) {
                showAlert('รูปแบบอีเมลไม่ถูกต้อง', 'warning');
                return;
            }
            
            // Check duplicate email (exclude current advisor)
            if (advisors.some(a => a.advisor_email === formData.advisor_email && a.id !== advisorId)) {
                showAlert('อีเมลนี้มีการใช้งานแล้ว', 'warning');
                return;
            }
            
            showLoading('กำลังอัปเดตข้อมูล...');
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // อัปเดตข้อมูล (mock)
            const advisorIndex = advisors.findIndex(a => a.id === advisorId);
            if (advisorIndex !== -1) {
                advisors[advisorIndex] = {
                    ...advisors[advisorIndex],
                    ...formData,
                    faculty_name: faculties.find(f => f.id === formData.faculty_id)?.name_th || '',
                    updated_at: new Date().toISOString()
                };
            }
            
            editAdvisorModal.hide();
            renderAdvisorsTable();
            await loadStatistics();
            
            showAlert('อัปเดตข้อมูลอาจารย์ที่ปรึกษาสำเร็จ', 'success');
            
        } catch (error) {
            console.error('Error updating advisor:', error);
            showAlert('เกิดข้อผิดพลาดในการอัปเดตข้อมูล', 'danger');
        } finally {
            hideLoading();
        }
    }
    
    /**
     * ยืนยันการลบอาจารย์
     */
    async function confirmDeleteAdvisor() {
        try {
            const advisorId = parseInt(document.getElementById('confirm-delete-btn').getAttribute('data-advisor-id'));
            
            showLoading('กำลังลบข้อมูล...');
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // ลบข้อมูล (mock)
            advisors = advisors.filter(a => a.id !== advisorId);
            
            deleteAdvisorModal.hide();
            renderAdvisorsTable();
            await loadStatistics();
            
            showAlert('ลบอาจารย์ที่ปรึกษาสำเร็จ', 'success');
            
        } catch (error) {
            console.error('Error deleting advisor:', error);
            showAlert('เกิดข้อผิดพลาดในการลบข้อมูล', 'danger');
        } finally {
            hideLoading();
        }
    }
    
    /**
     * ส่งอีเมลทดสอบ
     */
    async function sendTestEmailAction() {
        try {
            const email = document.getElementById('test-email').value.trim();
            const language = document.getElementById('test-language').value;
            
            if (!email) {
                showAlert('กรุณากรอกอีเมลสำหรับทดสอบ', 'warning');
                return;
            }
            
            if (!isValidEmail(email)) {
                showAlert('รูปแบบอีเมลไม่ถูกต้อง', 'warning');
                return;
            }
            
            const resultDiv = document.getElementById('email-test-result');
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                    <span>กำลังส่งอีเมลทดสอบ...</span>
                </div>
            `;
            
            // ทดสอบการส่งอีเมล
            const response = await fetch('/api/approval-workflow/test-email', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, language })
            });
            
            const result = await response.json();
            
            if (result.success) {
                resultDiv.innerHTML = `
                    <div class="alert alert-success">
                        <i class="bi bi-check-circle me-2"></i>
                        ส่งอีเมลทดสอบสำเร็จ!
                        <br><small>Message ID: ${result.messageId || 'N/A'}</small>
                    </div>
                `;
            } else {
                resultDiv.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-x-circle me-2"></i>
                        ส่งอีเมลทดสอบไม่สำเร็จ
                        <br><small>${result.message || 'Unknown error'}</small>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Error sending test email:', error);
            const resultDiv = document.getElementById('email-test-result');
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle me-2"></i>
                    เกิดข้อผิดพลาดในการส่งอีเมลทดสอบ
                </div>
            `;
        }
    }
    
    // ===== Utility Functions =====
    
    /**
     * แสดง Loading Modal
     */
    function showLoading(message = 'กำลังดำเนินการ...') {
        document.getElementById('loading-message').textContent = message;
        loadingModal.show();
    }
    
    /**
     * ซ่อน Loading Modal
     */
    function hideLoading() {
        loadingModal.hide();
    }
    
    /**
     * ตรวจสอบรูปแบบอีเมล
     */
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
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
     * Debounce function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * แสดงข้อความแจ้งเตือน
     */
    function showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;
        
        const alertId = 'alert-' + Date.now();
        const iconMap = {
            success: 'check-circle',
            danger: 'exclamation-triangle',
            warning: 'exclamation-circle',
            info: 'info-circle'
        };
        
        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="bi bi-${iconMap[type] || 'info-circle'} me-2"></i>
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
    
    // ===== Start Application =====
    
    init();
});

console.log('✅ Faculty Management JavaScript loaded');
