/**
 * Leave Management Page Logic
 */

let currentPage = 1;
let totalPages = 1;
let pendingAction = null;

(async function() {
  const isAuth = await auth.requireAuth();
  if (!isAuth) return;

  sidebar.render('sidebar-container', 'leave');
  header.render('header-container', 'Leave Management');

  initEventListeners();
  loadLeaveTypes();
  loadPendingRequests();
  loadAllRequests();
})();

function initEventListeners() {
  document.getElementById('status-filter').addEventListener('change', () => {
    currentPage = 1;
    loadAllRequests();
  });

  document.getElementById('type-filter').addEventListener('change', () => {
    currentPage = 1;
    loadAllRequests();
  });

  document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadAllRequests();
    }
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadAllRequests();
    }
  });

  document.getElementById('confirm-modal').addEventListener('click', (e) => {
    if (e.target.id === 'confirm-modal') closeConfirmModal();
  });
}

async function loadLeaveTypes() {
  try {
    const response = await api.leave.types();
    const types = response.data || [];
    
    const select = document.getElementById('type-filter');
    select.innerHTML = '<option value="">All Types</option>' + 
      types.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  } catch (error) {
    console.error('Failed to load leave types:', error);
  }
}

async function loadPendingRequests() {
  const container = document.getElementById('pending-requests');

  try {
    const response = await api.leave.requests({ status: 'pending', per_page: 10 });
    const requests = response.data || [];
    const total = response.pagination?.total || 0;

    document.getElementById('pending-count').textContent = total;

    if (requests.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <p class="empty-state-title">All Caught Up!</p>
          <p class="empty-state-text">No pending leave requests to review.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = requests.map(req => `
      <div class="flex items-center justify-between py-md border-b" style="border-color: var(--color-border-light);">
        <div class="flex items-center gap-md">
          <div class="user-avatar" style="width: 40px; height: 40px;">
            ${getInitials(req.first_name, req.last_name)}
          </div>
          <div>
            <div class="font-medium text-heading">${escapeHtml(req.first_name)} ${escapeHtml(req.last_name)}</div>
            <div class="text-sm text-muted">
              ${escapeHtml(req.leave_type_name)} • ${formatDate(req.start_date)} - ${formatDate(req.end_date)} (${req.total_days} day${req.total_days > 1 ? 's' : ''})
            </div>
            ${req.reason ? `<div class="text-xs text-muted mt-xs">"${escapeHtml(req.reason)}"</div>` : ''}
          </div>
        </div>
        <div class="flex gap-sm">
          <button class="btn btn-success btn-sm" onclick="approveRequest(${req.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Approve
          </button>
          <button class="btn btn-danger btn-sm" onclick="rejectRequest(${req.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Reject
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load pending requests:', error);
    container.innerHTML = `
      <div class="text-center p-lg">
        <p class="text-error">Failed to load pending requests</p>
        <button class="btn btn-outline btn-sm mt-sm" onclick="loadPendingRequests()">Retry</button>
      </div>
    `;
  }
}

async function loadAllRequests() {
  const tbody = document.getElementById('requests-tbody');
  tbody.innerHTML = `<tr><td colspan="7" class="text-center p-lg"><div class="spinner"></div></td></tr>`;

  try {
    const params = {
      page: currentPage,
      per_page: 20,
      status: document.getElementById('status-filter').value,
      leave_type_id: document.getElementById('type-filter').value
    };

    Object.keys(params).forEach(key => {
      if (!params[key]) delete params[key];
    });

    const response = await api.leave.requests(params);
    const requests = response.data || [];
    const pagination = response.pagination || {};

    totalPages = pagination.total_pages || 1;
    updatePaginationInfo(pagination);
    renderRequests(requests);
  } catch (error) {
    console.error('Failed to load requests:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center p-lg">
          <p class="text-error">Failed to load leave requests</p>
          <button class="btn btn-outline btn-sm mt-sm" onclick="loadAllRequests()">Retry</button>
        </td>
      </tr>
    `;
  }
}

function renderRequests(requests) {
  const tbody = document.getElementById('requests-tbody');

  if (requests.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center p-lg">
          <div class="empty-state">
            <p class="empty-state-title">No Leave Requests</p>
            <p class="empty-state-text">No requests match your filters.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = requests.map(req => `
    <tr>
      <td>
        <div class="flex items-center gap-md">
          <div class="user-avatar" style="width: 32px; height: 32px; font-size: 12px;">
            ${getInitials(req.first_name, req.last_name)}
          </div>
          <div>
            <div class="font-medium text-heading text-sm">${escapeHtml(req.first_name)} ${escapeHtml(req.last_name)}</div>
            <div class="text-xs text-muted">${escapeHtml(req.employee_code || '')}</div>
          </div>
        </div>
      </td>
      <td>${escapeHtml(req.leave_type_name)}</td>
      <td>${formatDate(req.start_date)}</td>
      <td>${formatDate(req.end_date)}</td>
      <td>${req.total_days}</td>
      <td>
        <span class="badge ${getStatusBadgeClass(req.status)}">
          ${req.status}
        </span>
      </td>
      <td>
        ${req.status === 'pending' ? `
          <div class="flex gap-xs">
            <button class="btn btn-ghost btn-sm btn-icon text-success" onclick="approveRequest(${req.id})" title="Approve">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-icon text-error" onclick="rejectRequest(${req.id})" title="Reject">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        ` : '-'}
      </td>
    </tr>
  `).join('');
}

function getStatusBadgeClass(status) {
  const classes = {
    pending: 'badge-warning',
    approved: 'badge-success',
    rejected: 'badge-error'
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

function approveRequest(id) {
  pendingAction = { type: 'approve', id };
  document.getElementById('confirm-title').textContent = 'Approve Leave Request';
  document.getElementById('confirm-message').textContent = 'Are you sure you want to approve this leave request?';
  document.getElementById('reject-reason-group').style.display = 'none';
  document.getElementById('confirm-btn').className = 'btn btn-success';
  document.getElementById('confirm-btn').textContent = 'Approve';
  document.getElementById('confirm-btn').onclick = confirmAction;
  document.getElementById('confirm-modal').classList.add('open');
}

function rejectRequest(id) {
  pendingAction = { type: 'reject', id };
  document.getElementById('confirm-title').textContent = 'Reject Leave Request';
  document.getElementById('confirm-message').textContent = 'Are you sure you want to reject this leave request?';
  document.getElementById('reject-reason-group').style.display = 'block';
  document.getElementById('reject-reason').value = '';
  document.getElementById('confirm-btn').className = 'btn btn-danger';
  document.getElementById('confirm-btn').textContent = 'Reject';
  document.getElementById('confirm-btn').onclick = confirmAction;
  document.getElementById('confirm-modal').classList.add('open');
}

async function confirmAction() {
  if (!pendingAction) return;

  const btn = document.getElementById('confirm-btn');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  try {
    if (pendingAction.type === 'approve') {
      await api.leave.approve(pendingAction.id);
      toast.success('Leave request approved');
    } else {
      const reason = document.getElementById('reject-reason').value;
      await api.leave.reject(pendingAction.id, reason);
      toast.success('Leave request rejected');
    }
    closeConfirmModal();
    loadPendingRequests();
    loadAllRequests();
  } catch (error) {
    toast.error(error.message || 'Failed to process request');
  } finally {
    btn.disabled = false;
    btn.textContent = pendingAction.type === 'approve' ? 'Approve' : 'Reject';
  }
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.remove('open');
  pendingAction = null;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(firstName, lastName) {
  return ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase() || '?';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
