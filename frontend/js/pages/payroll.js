/**
 * Payroll Page Logic
 */

let currentPage = 1;
let totalPages = 1;

(async function() {
  const isAuth = await auth.requireAuth();
  if (!isAuth) return;

  sidebar.render('sidebar-container', 'payroll');
  header.render('header-container', 'Payroll');

  // Set default month to current
  const currentMonth = new Date().toISOString().slice(0, 7);
  document.getElementById('month-filter').value = currentMonth;
  document.getElementById('process-month').value = currentMonth;

  initEventListeners();
  loadPayroll();
})();

function initEventListeners() {
  document.getElementById('month-filter').addEventListener('change', () => {
    currentPage = 1;
    loadPayroll();
  });

  document.getElementById('status-filter').addEventListener('change', () => {
    currentPage = 1;
    loadPayroll();
  });

  document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadPayroll();
    }
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadPayroll();
    }
  });

  document.getElementById('process-btn').addEventListener('click', openProcessModal);
  document.getElementById('confirm-process-btn').addEventListener('click', processPayroll);
  document.getElementById('export-btn').addEventListener('click', exportPayroll);

  document.getElementById('process-modal').addEventListener('click', (e) => {
    if (e.target.id === 'process-modal') closeProcessModal();
  });
}

async function loadPayroll() {
  const tbody = document.getElementById('payroll-tbody');
  tbody.innerHTML = `<tr><td colspan="6" class="text-center p-lg"><div class="spinner"></div></td></tr>`;

  try {
    const params = {
      page: currentPage,
      per_page: 20,
      month: document.getElementById('month-filter').value,
      status: document.getElementById('status-filter').value
    };

    Object.keys(params).forEach(key => {
      if (!params[key]) delete params[key];
    });

    const response = await api.payroll.list(params);
    const records = response.data || [];
    const pagination = response.pagination || {};

    totalPages = pagination.total_pages || 1;
    updatePaginationInfo(pagination);
    updateSummary(records);
    renderPayroll(records);
  } catch (error) {
    console.error('Failed to load payroll:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center p-lg">
          <p class="text-error">Failed to load payroll records</p>
          <button class="btn btn-outline btn-sm mt-sm" onclick="loadPayroll()">Retry</button>
        </td>
      </tr>
    `;
  }
}

function updateSummary(records) {
  const totalGross = records.reduce((sum, r) => sum + parseFloat(r.gross_salary || 0), 0);
  const totalDeductions = records.reduce((sum, r) => sum + parseFloat(r.deductions || 0), 0);
  const totalNet = records.reduce((sum, r) => sum + parseFloat(r.net_salary || 0), 0);

  document.getElementById('total-gross').textContent = formatCurrency(totalGross);
  document.getElementById('total-deductions').textContent = formatCurrency(totalDeductions);
  document.getElementById('total-net').textContent = formatCurrency(totalNet);
  document.getElementById('total-records').textContent = records.length;
}

function renderPayroll(records) {
  const tbody = document.getElementById('payroll-tbody');

  if (records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center p-lg">
          <div class="empty-state">
            <svg class="empty-state-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <line x1="12" x2="12" y1="2" y2="22"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <p class="empty-state-title">No Payroll Records</p>
            <p class="empty-state-text">No payroll has been processed for this period.</p>
            <button class="btn btn-primary mt-md" onclick="openProcessModal()">Process Payroll</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = records.map(rec => `
    <tr>
      <td>
        <div class="flex items-center gap-md">
          <div class="user-avatar" style="width: 32px; height: 32px; font-size: 12px;">
            ${getInitials(rec.first_name, rec.last_name)}
          </div>
          <div>
            <div class="font-medium text-heading text-sm">${escapeHtml(rec.first_name)} ${escapeHtml(rec.last_name)}</div>
            <div class="text-xs text-muted">${escapeHtml(rec.employee_code || '')}</div>
          </div>
        </div>
      </td>
      <td>${formatPeriod(rec.pay_period_start, rec.pay_period_end)}</td>
      <td class="font-medium">${formatCurrency(rec.gross_salary)}</td>
      <td class="text-error">${formatCurrency(rec.deductions)}</td>
      <td class="font-semibold text-success">${formatCurrency(rec.net_salary)}</td>
      <td>
        <span class="badge ${getStatusBadgeClass(rec.status)}">
          ${rec.status}
        </span>
      </td>
    </tr>
  `).join('');
}

function getStatusBadgeClass(status) {
  const classes = {
    pending: 'badge-warning',
    processed: 'badge-info',
    paid: 'badge-success'
  };
  return classes[status] || 'badge-neutral';
}

function updatePaginationInfo(pagination) {
  const total = pagination.total || 0;
  const page = pagination.page || 1;
  const perPage = pagination.per_page || 20;
  const start = total > 0 ? (page - 1) * perPage + 1 : 0;
  const end = Math.min(page * perPage, total);

  document.getElementById('pagination-info').textContent = `Showing ${start}-${end} of ${total}`;
  document.getElementById('prev-btn').disabled = page <= 1;
  document.getElementById('next-btn').disabled = page >= totalPages;
}

function openProcessModal() {
  document.getElementById('process-preview').style.display = 'none';
  document.getElementById('process-modal').classList.add('open');
}

function closeProcessModal() {
  document.getElementById('process-modal').classList.remove('open');
}

async function processPayroll() {
  const month = document.getElementById('process-month').value;
  if (!month) {
    toast.error('Please select a month');
    return;
  }

  const btn = document.getElementById('confirm-process-btn');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  try {
    const response = await api.payroll.process(month);
    const result = response.data;

    toast.success(`Payroll processed: ${result.processed_count} records created`);
    
    if (result.skipped_count > 0) {
      toast.warning(`${result.skipped_count} employees skipped (already processed)`);
    }

    closeProcessModal();
    document.getElementById('month-filter').value = month;
    loadPayroll();
  } catch (error) {
    toast.error(error.message || 'Failed to process payroll');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Process Payroll';
  }
}

function exportPayroll() {
  const month = document.getElementById('month-filter').value;
  toast.info('Export functionality coming soon');
  // In a real app, this would trigger a CSV/Excel download
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function formatPeriod(start, end) {
  if (!start) return '-';
  const startDate = new Date(start);
  return startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function getInitials(firstName, lastName) {
  return ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase() || '?';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
