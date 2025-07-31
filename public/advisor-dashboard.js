<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title data-i18n="advisor.dashboard.title">Dashboard อาจารย์ที่ปรึกษา - ระบบขอเอกสารออนไลน์</title>
  
  <!-- Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
  
  <!-- CSS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
  <link rel="stylesheet" href="css/style.css">
  <link rel="stylesheet" href="css/responsive.css">
</head>
<body>
  <!-- Navigation -->
  <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
    <div class="container">
      <a class="navbar-brand" href="#" data-i18n="navbar.title">ระบบขอเอกสารออนไลน์</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav me-auto">
          <li class="nav-item">
            <a class="nav-link active" href="advisor-dashboard.html" data-i18n="advisor.nav.dashboard">หน้าหลัก</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="advisor-requests.html" data-i18n="advisor.nav.requests">คำขออนุมัติ</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="advisor-history.html" data-i18n="advisor.nav.history">ประวัติการอนุมัติ</a>
          </li>
        </ul>
        <div class="language-selector d-flex me-3">
          <button class="btn btn-sm btn-outline-light me-2" data-lang="th">ไทย</button>
          <button class="btn btn-sm btn-outline-light me-2" data-lang="en">English</button>
          <button class="btn btn-sm btn-outline-light" data-lang="zh">中文</button>
        </div>
        <ul class="navbar-nav">
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown">
              <i class="bi bi-person-circle me-1"></i>
              <span id="advisor-name">อาจารย์</span>
            </a>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" href="#" data-i18n="advisor.nav.profile">ข้อมูลส่วนตัว</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item" href="#" id="logout" data-i18n="navbar.logout">ออกจากระบบ</a></li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  </nav>

  <!-- Main Content -->
  <div class="container mt-4">
    
    <!-- Header -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h2 data-i18n="advisor.dashboard.header">Dashboard อาจารย์ที่ปรึกษา</h2>
            <p class="text-muted mb-0">
              <i class="bi bi-building me-1"></i>
              <span id="faculty-name">กำลังโหลด...</span>
            </p>
          </div>
          <div class="text-end">
            <div id="current-datetime" class="text-muted small"></div>
            <div id="notification-status" class="small mt-1"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Alert Container -->
    <div id="alert-container"></div>

    <!-- Statistics Cards -->
    <div class="row mb-4">
      <div class="col-lg-3 col-md-6 mb-3">
        <div class="card bg-warning text-dark summary-card h-100">
          <div class="card-body text-center">
            <i class="bi bi-clock-history fs-1 mb-2"></i>
            <h3 class="number" id="pending-count">-</h3>
            <p class="label mb-0" data-i18n="advisor.dashboard.pendingRequests">รอการอนุมัติ</p>
          </div>
        </div>
      </div>
      <div class="col-lg-3 col-md-6 mb-3">
        <div class="card bg-success text-white summary-card h-100">
          <div class="card-body text-center">
            <i class="bi bi-check-circle fs-1 mb-2"></i>
            <h3 class="number" id="approved-count">-</h3>
            <p class="label mb-0" data-i18n="advisor.dashboard.approvedRequests">อนุมัติแล้ว</p>
          </div>
        </div>
      </div>
      <div class="col-lg-3 col-md-6 mb-3">
        <div class="card bg-danger text-white summary-card h-100">
          <div class="card-body text-center">
            <i class="bi bi-x-circle fs-1 mb-2"></i>
            <h3 class="number" id="rejected-count">-</h3>
            <p class="label mb-0" data-i18n="advisor.dashboard.rejectedRequests">ปฏิเสธ</p>
          </div>
        </div>
      </div>
      <div class="col-lg-3 col-md-6 mb-3">
        <div class="card bg-info text-white summary-card h-100">
          <div class="card-body text-center">
            <i class="bi bi-list-check fs-1 mb-2"></i>
            <h3 class="number" id="total-count">-</h3>
            <p class="label mb-0" data-i18n="advisor.dashboard.totalRequests">ทั้งหมด</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions & Recent Requests -->
    <div class="row">
      
      <!-- Quick Actions -->
      <div class="col-lg-4 mb-4">
        <div class="card h-100">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0">
              <i class="bi bi-lightning-charge me-2"></i>
              <span data-i18n="advisor.dashboard.quickActions">การดำเนินการด่วน</span>
            </h5>
          </div>
          <div class="card-body">
            <div class="d-grid gap-2">
              <a href="advisor-requests.html?status=waiting_approval" class="btn btn-warning">
                <i class="bi bi-clock me-2"></i>
                <span data-i18n="advisor.dashboard.viewPending">ดูคำขอที่รอการอนุมัติ</span>
                <span class="badge bg-light text-dark ms-2" id="pending-badge">0</span>
              </a>
              <a href="advisor-requests.html" class="btn btn-outline-primary">
                <i class="bi bi-list-check me-2"></i>
                <span data-i18n="advisor.dashboard.viewAll">ดูคำขอทั้งหมด</span>
              </a>
              <hr>
              <button class="btn btn-outline-success" onclick="refreshStats()">
                <i class="bi bi-arrow-clockwise me-2"></i>
                <span data-i18n="advisor.dashboard.refresh">รีเฟรชข้อมูล</span>
              </button>
            </div>
            
            <!-- Response Time Stats -->
            <div class="mt-3 p-3 bg-light rounded">
              <h6 class="mb-2" data-i18n="advisor.dashboard.responseTime">เวลาตอบสนองเฉลี่ย</h6>
              <div class="d-flex justify-content-between">
                <span class="small text-muted" data-i18n="advisor.dashboard.avgHours">เฉลี่ย:</span>
                <span class="small fw-bold" id="avg-response-time">- ชั่วโมง</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Requests -->
      <div class="col-lg-8 mb-4">
        <div class="card h-100">
          <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
              <i class="bi bi-clock-history me-2"></i>
              <span data-i18n="advisor.dashboard.recentRequests">คำขอล่าสุด</span>
            </h5>
            <div class="btn-group btn-group-sm" role="group">
              <input type="radio" class="btn-check" name="request-filter" id="filter-all" value="" checked>
              <label class="btn btn-outline-light" for="filter-all" data-i18n="advisor.dashboard.all">ทั้งหมด</label>
              
              <input type="radio" class="btn-check" name="request-filter" id="filter-pending" value="waiting_approval">
              <label class="btn btn-outline-light" for="filter-pending" data-i18n="advisor.dashboard.pending">รอการอนุมัติ</label>
            </div>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="table-light">
                  <tr>
                    <th data-i18n="advisor.dashboard.student">นักศึกษา</th>
                    <th data-i18n="advisor.dashboard.requestTitle">คำขอ</th>
                    <th data-i18n="advisor.dashboard.requestDate">วันที่ขอ</th>
                    <th data-i18n="advisor.dashboard.status">สถานะ</th>
                    <th data-i18n="advisor.dashboard.actions">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody id="recent-requests-table">
                  <tr>
                    <td colspan="5" class="text-center py-4">
                      <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                      </div>
                      <p class="mt-2 mb-0 text-muted" data-i18n="general.loading">กำลังโหลด...</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="card-footer bg-light">
            <div class="d-flex justify-content-between align-items-center">
              <small class="text-muted" id="table-info">แสดง 0 รายการ</small>
              <a href="advisor-requests.html" class="btn btn-sm btn-primary">
                <span data-i18n="advisor.dashboard.viewAllRequests">ดูทั้งหมด</span>
                <i class="bi bi-arrow-right ms-1"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Monthly Statistics Chart -->
    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0">
              <i class="bi bi-bar-chart me-2"></i>
              <span data-i18n="advisor.dashboard.monthlyStats">สถิติรายเดือน</span>
            </h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-lg-8">
                <canvas id="monthly-chart" width="400" height="200"></canvas>
              </div>
              <div class="col-lg-4">
                <h6 data-i18n="advisor.dashboard.thisMonth">เดือนนี้</h6>
                <div class="row g-3">
                  <div class="col-6">
                    <div class="text-center p-2 bg-warning bg-opacity-10 rounded">
                      <div class="fw-bold fs-4" id="month-pending">0</div>
                      <small data-i18n="advisor.dashboard.pending">รอการอนุมัติ</small>
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="text-center p-2 bg-success bg-opacity-10 rounded">
                      <div class="fw-bold fs-4" id="month-approved">0</div>
                      <small data-i18n="advisor.dashboard.approved">อนุมัติแล้ว</small>
                    </div>
                  </div>
                </div>
                
                <hr class="my-3">
                
                <h6 data-i18n="advisor.dashboard.notifications">การแจ้งเตือน</h6>
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <small data-i18n="advisor.dashboard.emailNotifications">อีเมลแจ้งเตือน</small>
                  <span class="badge bg-success" data-i18n="advisor.dashboard.active">เปิด</span>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                  <small data-i18n="advisor.dashboard.autoReminder">เตือนอัตโนมัติ</small>
                  <span class="badge bg-info">24 ชม.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- Quick Approval Modal -->
  <div class="modal fade" id="quickApprovalModal" tabindex="-1" aria-labelledby="quickApprovalModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title" id="quickApprovalModalLabel">
            <i class="bi bi-check-circle me-2"></i>
            <span data-i18n="advisor.dashboard.quickApproval">อนุมัติด่วน</span>
          </h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <!-- Request details will be loaded here -->
          <div id="quick-approval-content">
            <div class="text-center py-4">
              <div class="spinner-border text-primary" role="status"></div>
              <p class="mt-2" data-i18n="general.loading">กำลังโหลด...</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" data-i18n="general.close">ปิด</button>
          <button type="button" class="btn btn-danger" id="quick-reject-btn">
            <i class="bi bi-x-circle me-1"></i>
            <span data-i18n="advisor.dashboard.reject">ปฏิเสธ</span>
          </button>
          <button type="button" class="btn btn-success" id="quick-approve-btn">
            <i class="bi bi-check-circle me-1"></i>
            <span data-i18n="advisor.dashboard.approve">อนุมัติ</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Loading Modal -->
  <div class="modal fade" id="loadingModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-body text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3 mb-0" data-i18n="general.processing">กำลังดำเนินการ...</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="footer mt-5 py-3 bg-light">
    <div class="container text-center">
      <span class="text-muted" data-i18n="footer.copyright">
        © 2025 ระบบขอเอกสารออนไลน์สำหรับนักศึกษามหาวิทยาลัยนอร์ทกรุงเทพ
      </span>
    </div>
  </footer>

  <!-- Scripts -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="js/language.js"></script>
  <script src="js/main.js"></script>
  <script src="js/advisor-dashboard.js"></script>

  <style>
    .summary-card {
      transition: all 0.3s ease;
      cursor: pointer;
    }
    
    .summary-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    
    .summary-card .number {
      font-size: 2.5rem;
      font-weight: 700;
      line-height: 1;
    }
    
    .summary-card .label {
      font-size: 0.9rem;
      font-weight: 500;
      opacity: 0.9;
    }
    
    .btn-group .btn-check:checked + .btn {
      background-color: rgba(255,255,255,0.2) !important;
      border-color: rgba(255,255,255,0.5) !important;
    }
    
    .table-hover tbody tr:hover {
      background-color: rgba(13, 110, 253, 0.05);
    }
    
    .status-badge {
      font-size: 0.75rem;
      padding: 0.35em 0.8em;
      border-radius: 50rem;
      font-weight: 500;
    }
    
    .status-waiting {
      background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%);
      color: #664d03;
      border: 1px solid #ffe69c;
    }
    
    .status-approved {
      background: linear-gradient(135deg, #d1e7dd 0%, #badbcc 100%);
      color: #0f5132;
      border: 1px solid #badbcc;
    }
    
    .status-rejected {
      background: linear-gradient(135deg, #f8d7da 0%, #f5c2c7 100%);
      color: #842029;
      border: 1px solid #f5c2c7;
    }
    
    .request-row {
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .request-row:hover {
      background-color: rgba(13, 110, 253, 0.08) !important;
    }
    
    .urgent-indicator {
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    
    #current-datetime {
      font-family: 'Courier New', monospace;
    }
    
    .card-header.bg-primary {
      background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%) !important;
    }
    
    .notification-dot {
      width: 8px;
      height: 8px;
      background-color: #dc3545;
      border-radius: 50%;
      display: inline-block;
      animation: blink 1.5s infinite;
    }
    
    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }
    
    .chart-container {
      position: relative;
      height: 300px;
    }
    
    .quick-action-card {
      border-left: 4px solid #0d6efd;
      transition: all 0.3s ease;
    }
    
    .quick-action-card:hover {
      border-left-color: #0a58ca;
      box-shadow: 0 4px 12px rgba(13, 110, 253, 0.15);
    }
  </style>

</body>
</html>
