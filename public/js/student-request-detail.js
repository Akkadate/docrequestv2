// ในฟังก์ชัน displayRequests
function displayRequests(requests) {
  const requestsTable = document.getElementById('requests-table');
  
  requestsTable.innerHTML = '';
  
  if (requests.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="6" class="text-center" data-i18n="status.noRequests">ไม่พบคำขอเอกสารที่ตรงกับเงื่อนไข</td>
    `;
    requestsTable.appendChild(emptyRow);
    return;
  }
  
  requests.forEach(request => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td data-label="${i18n[currentLang].dashboard.documentType}">${request.document_name}</td>
      <td data-label="${i18n[currentLang].dashboard.requestDate}">${formatDate(request.created_at, currentLang)}</td>
      <td data-label="${i18n[currentLang].dashboard.deliveryMethod}">
        ${request.delivery_method === 'pickup' ? 
          `<span data-i18n="request.pickup">${i18n[currentLang].request.pickup}</span>` : 
          `<span data-i18n="request.mail">${i18n[currentLang].request.mail}</span>`}
        ${request.urgent ? `<span class="badge bg-warning text-dark ms-2" data-i18n="request.urgentLabel">${i18n[currentLang].request.urgentLabel}</span>` : ''}
      </td>
      <td data-label="${i18n[currentLang].dashboard.status}">${createStatusBadge(request.status)}</td>
      <td data-label="${i18n[currentLang].dashboard.price}">${formatCurrency(request.total_price, currentLang)}</td>
      <td data-label="${i18n[currentLang].dashboard.actions}">
        <a href="request-detail.html?id=${request.id}" class="btn btn-sm btn-primary" data-i18n="dashboard.viewDetails">ดูรายละเอียด</a>
      </td>
    `;
    
    requestsTable.appendChild(row);
  });
}
