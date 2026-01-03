/**
 * Dashboard Page Logic
 */

(async function() {
  // Require authentication
  const isAuth = await auth.requireAuth();
  if (!isAuth) return;

  // Render layout
  sidebar.render('sidebar-container', 'dashboard');
  header.render('header-container', 'Dashboard');

  // Load dashboard data
  loadDashboardData();
})();

/**
 * Load all dashboard data
 */
async function loadDashboardData() {
  await Promise.all([
    loadEmployeeStats(),
    loadAttendanceStats(),
    loadLeaveStats(),
    loadPayrollStats(),
    loadRecentLeaves()
  ]);
}

/**
 * Load employee statistics
 */
async function loadEmployeeStats() {
  try {
    const response = await api.employees.list({ per_page: 1 });
    const total = response.pagination?.total || 0;
    
    // Get active/inactive counts (simplified - in real app would have separate endpoint)
    const activeResponse = await api.employees.list({ status: 'active', per_page: 1 });
    const activeCount = activeResponse.pagination?.total || 0;
    const inactiveCount = total - activeCount;

    document.getElementById('total-employees').textContent = formatNumber(total);
    document.getElementById('active-employees').textContent = `Active: ${formatNumber(activeCount)}`;
    document.getElementById('inactive-employees').textContent = `Inactive: ${formatNumber(inactiveCount)}`;
  } catch (error) {
    console.error('Failed to load employee stats:', error);
    document.getElementById('total-employees').textContent = '--';
  }
}

/**
 * Load attendance statistics
 */
async function loadAttendanceStats() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await api.attendance.list({ date_from: today, date_to: today, per_page: 1000 });
    
    const records = response.data || [];
    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    
    // Get total employees for rate calculation
    const empResponse = await api.employees.list({ status: 'active', per_page: 1 });
    const totalEmployees = empResponse.pagination?.total || 1;
    
    const rate = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

    document.getElementById('attendance-rate').textContent = `${rate}%`;
    document.getElementById('present-count').textContent = `Present: ${presentCount}`;
    document.getElementById('absent-count').textContent = `Absent: ${absentCount}`;
    document.getElementById('leave-count').textContent = `Late: ${lateCount}`;
  } catch (error) {
    console.error('Failed to load attendance stats:', error);
    document.getElementById('attendance-rate').textContent = '--%';
  }
}

/**
 * Load leave statistics
 */
async function loadLeaveStats() {
  try {
    const response = await api.leave.requests({ status: 'pending', per_page: 1 });
    const pendingCount = response.pagination?.total || 0;

    document.getElementById('pending-leaves').textContent = formatNumber(pendingCount);
  } catch (error) {
    console.error('Failed to load leave stats:', error);
    document.getElementById('pending-leaves').textContent = '--';
  }
}

/**
 * Load payroll statistics
 */
async function loadPayrollStats() {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const response = await api.payroll.list({ month: currentMonth, per_page: 1000 });
    
    const records = response.data || [];
    const totalNet = records.reduce((sum, r) => sum + parseFloat(r.net_salary || 0), 0);
    const processedCount = records.length;

    document.getElementById('payroll-total').textContent = formatCurrency(totalNet);
    document.getElementById('payroll-status').textContent = `${processedCount} processed`;
  } catch (error) {
    console.error('Failed to load payroll stats:', error);
    document.getElementById('payroll-total').textContent = '$--';
  }
}

/**
 * Load recent leave requests
 */
async function loadRecentLeaves() {
  const container = document.getElementById('recent-leaves');
  
  try {
    const response = await api.leave.requests({ status: 'pending', per_page: 5 });
    const requests = response.data || [];

    if (requests.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
            <line x1="16" x2="16" y1="2" y2="6"></line>
            <line x1="8" x2="8" y1="2" y2="6"></line>
            <line x1="3" x2="21" y1="10" y2="10"></line>
          </svg>
          <p class="empty-state-title">No Pending Requests</p>
          <p class="empty-state-text">All leave requests have been processed.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = requests.map(req => `
      <div class="flex items-center justify-between py-sm border-b" style="border-color: var(--color-border-light);">
        <div class="flex items-center gap-md">
          <div class="user-avatar" style="width: 32px; height: 32px; font-size: 12px;">
            ${getInitials(req.first_name, req.last_name)}
          </div>
          <div>
            <div class="font-medium text-heading text-sm">${escapeHtml(req.first_name)} ${escapeHtml(req.last_name)}</div>
            <div class="text-xs text-muted">${escapeHtml(req.leave_type_name)} • ${formatDate(req.start_date)} - ${formatDate(req.end_date)}</div>
          </div>
        </div>
        <span class="badge badge-warning">${req.total_days} day${req.total_days > 1 ? 's' : ''}</span>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load recent leaves:', error);
    container.innerHTML = `
      <div class="empty-state">
        <p class="text-error">Failed to load leave requests</p>
        <button class="btn btn-outline btn-sm mt-sm" onclick="loadRecentLeaves()">Retry</button>
      </div>
    `;
  }
}

// Utility functions
function formatNumber(num) {
  return new Intl.NumberFormat().format(num);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(firstName, lastName) {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return (first + last).toUpperCase() || '?';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
