/**
 * center.js — Central detail views.
 * Switches between: Default, Database Config, Template Details,
 * Change Requests, Deployments, Service Accounts.
 */
'use strict';

const CenterView = (() => {
  let loadedProject = null;
  let loadedTemplateProject = null;
  let loadedTemplateNode = null;
  let loadedCrProject = null;
  let loadedDeploymentProject = null;
  let loadedServiceAccountProject = null;

  function setTitle(icon, title, subtitle) {
    const iconMap = {
      info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
      database: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>`,
      file: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`,
      inbox: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
      upload: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>`,
      key: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
    };
    document.getElementById('center-title').innerHTML = `${iconMap[icon] || iconMap.info} Details View`;
    document.getElementById('center-subtitle').textContent = subtitle || '';
  }

  function showDefault() {
    flushPendingEdits();
    clearLoaded();
    setTitle('info', 'Details View', 'Select an item from the tree');
    const content = document.getElementById('center-content');
    content.innerHTML = `
      <div class="empty-state animate-in">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect width="7" height="7" x="14" y="3" rx="1"/><path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3"/>
        </svg>
        <p>Pick a project or a template node to see its details.</p>
      </div>
    `;
  }

  function clearLoaded() {
    loadedProject = null;
    loadedTemplateProject = null;
    loadedTemplateNode = null;
    loadedCrProject = null;
    loadedDeploymentProject = null;
    loadedServiceAccountProject = null;
  }

  /* ================================================================
   * DATABASE CONFIG VIEW
   * ================================================================ */

  async function showDatabaseConfig(projectName) {
    flushPendingEdits();
    clearLoaded();
    setTitle('database', 'Details View', `Project: ${projectName}`);

    const config = await window.api.getProjectConfig(projectName);
    const machines = await window.api.getMachines(projectName);
    const allApps = await window.api.getApplications();
    const projectApps = await window.api.getProjectApplications(projectName);

    const content = document.getElementById('center-content');
    content.innerHTML = `
      <div class="card card-padding animate-in" id="db-config-card">
        <h3 class="font-bold mb-md flex items-center gap-sm" style="font-size:14px; color: var(--accent);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>
          Database Configuration (Bot Status)
        </h3>

        <div class="form-group">
          <label class="form-label">DB Path</label>
          <div class="flex gap-sm">
            <input type="text" class="form-input flex-1" id="cfg-db-path" value="${esc(config.dbPath)}" placeholder="Path to database file...">
            <button class="btn btn-secondary btn-sm" id="cfg-browse-btn">Browse...</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Machines</label>
          <div id="machines-list">${renderMachineRows(machines)}</div>
          <div class="flex gap-sm mt-sm">
            <button class="btn btn-secondary btn-sm" id="cfg-add-machine">+ Add Machine/User</button>
            <button class="btn btn-secondary btn-sm" id="cfg-paste-machines">Paste from Clipboard</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Applications Used</label>
          <div id="apps-checklist" class="flex" style="flex-wrap:wrap; gap:12px 24px;">
            ${allApps.map(app => `
              <label class="form-checkbox">
                <input type="checkbox" data-app="${esc(app)}" ${projectApps.includes(app) ? 'checked' : ''}>
                ${esc(app)}
              </label>
            `).join('')}
            ${allApps.length === 0 ? '<span class="text-muted text-sm">No applications defined yet — add them in Settings > Applications.</span>' : ''}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Received Query</label>
          <textarea class="form-textarea" id="cfg-received-query" rows="3">${esc(config.receivedQuery)}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Pending Query</label>
          <textarea class="form-textarea" id="cfg-pending-query" rows="3">${esc(config.pendingQuery)}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Processed Query</label>
          <textarea class="form-textarea" id="cfg-processed-query" rows="3">${esc(config.processedQuery)}</textarea>
        </div>

        <div class="flex gap-sm mt-md">
          <button class="btn btn-primary" id="cfg-save-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Save All Bot Configs
          </button>
          <button class="btn btn-secondary" id="cfg-remove-btn">Remove Database Config</button>
        </div>
      </div>
    `;

    loadedProject = projectName;

    // Event listeners
    document.getElementById('cfg-browse-btn').addEventListener('click', async () => {
      const filePath = await window.api.showFilePicker();
      if (filePath) document.getElementById('cfg-db-path').value = filePath;
    });

    document.getElementById('cfg-add-machine').addEventListener('click', () => {
      addMachineRow('', '');
    });

    document.getElementById('cfg-paste-machines').addEventListener('click', () => {
      pasteMachinesFromClipboard();
    });

    document.getElementById('cfg-save-btn').addEventListener('click', () => {
      saveProjectConfig(true);
    });

    document.getElementById('cfg-remove-btn').addEventListener('click', async () => {
      if (confirm('Remove the database configuration for this project?')) {
        await window.api.deleteProjectConfig(projectName);
        showDatabaseConfig(projectName);
      }
    });
  }

  function renderMachineRows(machines) {
    return machines.map((m, i) => machineRowHtml(m.machine, m.user, i)).join('');
  }

  function machineRowHtml(machine, user, index) {
    return `
      <div class="flex gap-sm items-center mb-sm machine-row" data-index="${index}">
        <input type="text" class="form-input" placeholder="Machine name" value="${esc(machine)}" style="flex:1;" data-field="machine">
        <input type="text" class="form-input" placeholder="User name" value="${esc(user)}" style="flex:1;" data-field="user">
        <button class="btn-icon" title="Remove" onclick="this.closest('.machine-row').remove()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;
  }

  function addMachineRow(machine, user) {
    const list = document.getElementById('machines-list');
    if (!list) return;
    const idx = list.children.length;
    list.insertAdjacentHTML('beforeend', machineRowHtml(machine, user, idx));
  }

  async function pasteMachinesFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) { alert('Clipboard is empty.'); return; }

      let added = 0;
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let parts;
        if (trimmed.includes('\t')) parts = trimmed.split('\t');
        else if (trimmed.includes(',')) parts = trimmed.split(',');
        else parts = trimmed.split(/\s+/);

        const machine = (parts[0] || '').trim();
        const user = (parts[1] || '').trim();
        if (machine.toLowerCase() === 'machine') continue; // skip headers
        addMachineRow(machine, user);
        added++;
      }
      if (added === 0) alert('Could not read any machine/user pairs from clipboard.');
    } catch (_) { alert('Could not read clipboard.'); }
  }

  async function saveProjectConfig(notify) {
    if (!loadedProject) return;
    const dbPath = (document.getElementById('cfg-db-path')?.value || '').trim();
    const rq = document.getElementById('cfg-received-query')?.value || '';
    const pq = document.getElementById('cfg-pending-query')?.value || '';
    const procq = document.getElementById('cfg-processed-query')?.value || '';

    await window.api.saveProjectConfig(loadedProject, dbPath, rq, pq, procq);

    // Machines
    const machineEls = document.querySelectorAll('.machine-row');
    const machines = [];
    machineEls.forEach(el => {
      const m = el.querySelector('[data-field="machine"]')?.value?.trim() || '';
      const u = el.querySelector('[data-field="user"]')?.value?.trim() || '';
      if (m || u) machines.push({ machine: m, user: u });
    });
    await window.api.replaceMachines(loadedProject, machines);

    // Applications
    const appChecks = document.querySelectorAll('#apps-checklist input[type="checkbox"]');
    const apps = [];
    appChecks.forEach(cb => { if (cb.checked) apps.push(cb.dataset.app); });
    await window.api.replaceProjectApplications(loadedProject, apps);

    if (notify) showToast('Configuration saved.');
  }

  /* ================================================================
   * TEMPLATE DETAILS VIEW
   * ================================================================ */

  async function showTemplateDetails(projectName, templateName) {
    flushPendingEdits();
    clearLoaded();
    setTitle('file', 'Details View', `Project: ${projectName}   |   Node: ${templateName}`);

    const details = await window.api.getTemplateDetails(projectName, templateName);
    const content = document.getElementById('center-content');

    content.innerHTML = `
      <div class="card card-padding animate-in">
        <div class="form-group">
          <label class="form-label">Completion Date</label>
          <input type="date" class="form-input" id="tpl-date" value="${esc(details.completionDate)}" style="max-width:220px;">
        </div>
        <div class="form-group">
          <label class="form-label">Comments</label>
          <textarea class="form-textarea" id="tpl-comments" rows="5">${esc(details.comments)}</textarea>
        </div>
        <button class="btn btn-primary" id="tpl-save-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Save Details
        </button>
      </div>
    `;

    loadedTemplateProject = projectName;
    loadedTemplateNode = templateName;

    document.getElementById('tpl-save-btn').addEventListener('click', () => {
      saveTemplateDetails(true);
    });
  }

  async function saveTemplateDetails(notify) {
    if (!loadedTemplateProject || !loadedTemplateNode) return;
    const date = document.getElementById('tpl-date')?.value || '';
    const comments = document.getElementById('tpl-comments')?.value || '';
    await window.api.saveTemplateDetails(loadedTemplateProject, loadedTemplateNode, date, comments);
    if (notify) showToast(`Saved details for "${loadedTemplateNode}".`);
  }

  /* ================================================================
   * CHANGE REQUESTS VIEW
   * ================================================================ */

  async function showChangeRequests(projectName) {
    flushPendingEdits();
    clearLoaded();
    setTitle('inbox', 'Details View', `Project: ${projectName}   |   Change Requests`);
    loadedCrProject = projectName;

    const requests = await window.api.getChangeRequests(projectName);
    const devNames = await window.api.getDeveloperNames();
    const deployments = await window.api.getDeployments(projectName);
    const content = document.getElementById('center-content');

    content.innerHTML = `
      <div class="animate-in">
        <div class="flex justify-between items-center mb-md">
          <span class="text-muted text-sm">${requests.length} change request${requests.length !== 1 ? 's' : ''}</span>
          <button class="btn btn-primary btn-sm" id="cr-add-btn">+ Add Change Request</button>
        </div>
        <div class="table-container card">
          <table>
            <thead><tr>
              <th>CR #</th><th>Title</th><th>Requested By</th><th>Priority</th>
              <th>Status</th><th>Target Date</th><th>Assigned To</th><th>Actions</th>
            </tr></thead>
            <tbody id="cr-table-body">
              ${requests.map(cr => crRow(cr, devNames, deployments)).join('')}
              ${requests.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:24px;" class="text-muted">No change requests yet.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('cr-add-btn').addEventListener('click', () => {
      Dialogs.showChangeRequestForm(projectName, null, () => showChangeRequests(projectName));
    });

    // Edit buttons
    content.querySelectorAll('.cr-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const crId = parseInt(btn.dataset.id);
        const cr = requests.find(r => r.id === crId);
        if (cr) Dialogs.showChangeRequestForm(projectName, cr, () => showChangeRequests(projectName));
      });
    });
  }

  function crRow(cr, devNames, deployments) {
    return `<tr>
      <td>${esc(cr.crNumber)}</td>
      <td>${esc(cr.title)}</td>
      <td>${esc(cr.requestedBy)}</td>
      <td><span class="badge ${priorityBadge(cr.priority)}">${esc(cr.priority)}</span></td>
      <td><span class="badge ${statusBadge(cr.status)}">${esc(cr.status)}</span></td>
      <td>${esc(cr.targetDate)}</td>
      <td>${esc(cr.assignedTo)}</td>
      <td><button class="btn btn-ghost btn-sm cr-edit-btn" data-id="${cr.id}">Edit</button></td>
    </tr>`;
  }

  /* ================================================================
   * DEPLOYMENTS VIEW
   * ================================================================ */

  async function showDeployments(projectName) {
    flushPendingEdits();
    clearLoaded();
    setTitle('upload', 'Details View', `Project: ${projectName}   |   Deployments & RITMs`);
    loadedDeploymentProject = projectName;

    const deployments = await window.api.getDeployments(projectName);
    const content = document.getElementById('center-content');

    content.innerHTML = `
      <div class="animate-in">
        <div class="flex justify-between items-center mb-md">
          <span class="text-muted text-sm">${deployments.length} deployment${deployments.length !== 1 ? 's' : ''}</span>
          <button class="btn btn-primary btn-sm" id="dep-add-btn">+ Submit Deployment</button>
        </div>
        <div class="table-container card">
          <table>
            <thead><tr>
              <th>Name</th><th>RITM #</th><th>Environment</th><th>Requested</th>
              <th>Status</th><th>Deployed</th><th>Actions</th>
            </tr></thead>
            <tbody id="dep-table-body">
              ${deployments.map(d => depRow(d)).join('')}
              ${deployments.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:24px;" class="text-muted">No deployments yet.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('dep-add-btn').addEventListener('click', () => {
      Dialogs.showDeploymentForm(projectName, null, () => showDeployments(projectName));
    });

    content.querySelectorAll('.dep-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const depId = parseInt(btn.dataset.id);
        const d = deployments.find(r => r.id === depId);
        if (d) Dialogs.showDeploymentForm(projectName, d, () => showDeployments(projectName));
      });
    });
  }

  function depRow(d) {
    return `<tr>
      <td>${esc(d.name)}</td>
      <td>${esc(d.ritmNumber)}</td>
      <td><span class="badge badge-todo">${esc(d.environment)}</span></td>
      <td>${esc(d.requestedDate)}</td>
      <td><span class="badge ${statusBadge(d.status)}">${esc(d.status)}</span></td>
      <td>${esc(d.deployedDate)}</td>
      <td><button class="btn btn-ghost btn-sm dep-edit-btn" data-id="${d.id}">Edit</button></td>
    </tr>`;
  }

  /* ================================================================
   * SERVICE ACCOUNTS VIEW
   * ================================================================ */

  async function showServiceAccounts(projectName) {
    flushPendingEdits();
    clearLoaded();
    setTitle('key', 'Details View', `Project: ${projectName}   |   Service Accounts`);
    loadedServiceAccountProject = projectName;

    const accounts = await window.api.getServiceAccounts(projectName);
    const content = document.getElementById('center-content');

    content.innerHTML = `
      <div class="animate-in">
        <div class="flex justify-between items-center mb-md">
          <span class="text-muted text-sm">${accounts.length} service account${accounts.length !== 1 ? 's' : ''}</span>
          <button class="btn btn-primary btn-sm" id="sa-add-btn">+ Add Service Account</button>
        </div>
        <div class="table-container card">
          <table>
            <thead><tr>
              <th>Environment</th><th>Account ID</th><th>Alias</th>
              <th>App Name</th><th>Email</th><th>Actions</th>
            </tr></thead>
            <tbody id="sa-table-body">
              ${accounts.map(sa => saRow(sa)).join('')}
              ${accounts.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:24px;" class="text-muted">No service accounts yet.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('sa-add-btn').addEventListener('click', () => {
      Dialogs.showServiceAccountForm(projectName, null, () => showServiceAccounts(projectName));
    });

    content.querySelectorAll('.sa-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const saId = parseInt(btn.dataset.id);
        const sa = accounts.find(r => r.id === saId);
        if (sa) Dialogs.showServiceAccountForm(projectName, sa, () => showServiceAccounts(projectName));
      });
    });

    content.querySelectorAll('.sa-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Delete this service account?')) {
          await window.api.deleteServiceAccount(parseInt(btn.dataset.id));
          showServiceAccounts(projectName);
        }
      });
    });
  }

  function saRow(sa) {
    return `<tr>
      <td><span class="badge badge-todo">${esc(sa.environment)}</span></td>
      <td>${esc(sa.accountId)}</td>
      <td>${esc(sa.alias)}</td>
      <td>${esc(sa.appName)}</td>
      <td>${esc(sa.email)}</td>
      <td>
        <button class="btn btn-ghost btn-sm sa-edit-btn" data-id="${sa.id}">Edit</button>
        <button class="btn btn-ghost btn-sm sa-delete-btn" data-id="${sa.id}" style="color:var(--badge-error-fg)">Delete</button>
      </td>
    </tr>`;
  }

  /* ================================================================
   * HELPERS
   * ================================================================ */

  function statusBadge(status) {
    if (!status) return 'badge-todo';
    const s = status.toLowerCase();
    if (['done', 'deployed', 'approved'].includes(s)) return 'badge-done';
    if (['in progress', 'in development', 'testing', 'uat', 'scheduled', 'analysis'].includes(s)) return 'badge-progress';
    if (['failed', 'rolled back', 'cancelled', 'rejected', 'withdrawn', 'blocked'].includes(s)) return 'badge-error';
    return 'badge-todo';
  }

  function priorityBadge(priority) {
    if (!priority) return 'badge-todo';
    const p = priority.toLowerCase();
    if (p === 'critical' || p === 'high') return 'badge-error';
    if (p === 'medium') return 'badge-progress';
    return 'badge-todo';
  }

  function flushPendingEdits() {
    if (loadedTemplateProject && loadedTemplateNode) saveTemplateDetails(false);
    if (loadedProject) saveProjectConfig(false);
  }

  function showToast(message) {
    // Simple inline toast
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.style.cssText = `
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
        background: var(--accent-gradient); color: white; padding: 10px 24px;
        border-radius: 8px; font-size: 13px; font-weight: 500;
        box-shadow: var(--shadow-lg); z-index: 2000;
        opacity: 0; transition: opacity 0.3s ease;
        pointer-events: none;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2500);
  }

  function esc(str) {
    if (str == null) return '';
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  return {
    showDefault, showDatabaseConfig, showTemplateDetails,
    showChangeRequests, showDeployments, showServiceAccounts,
    flushPendingEdits, showToast
  };
})();
