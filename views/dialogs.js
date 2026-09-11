/**
 * dialogs.js — All modal dialogs.
 * New Project, Deployment Form, CR Form, Service Account Form,
 * Bot Run Status, Settings, About.
 */
'use strict';

const Dialogs = (() => {
  const DEPLOYMENT_STATUSES = ['Requested', 'Approved', 'Scheduled', 'Deployed', 'Failed', 'Rolled Back', 'Cancelled'];
  const DEPLOYMENT_ENVIRONMENTS = ['DEV', 'TEST', 'UAT', 'PROD'];
  const CR_STATUSES = ['New', 'Analysis', 'In Development', 'Testing', 'UAT', 'On Hold', 'Deployed', 'Rejected', 'Cancelled', 'Withdrawn'];
  const CR_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
  const SA_ENVIRONMENTS = ['DEV', 'TEST', 'UAT', 'PROD'];

  /* ================================================================
   * MODAL HELPERS
   * ================================================================ */

  function openModal(html, cssClass) {
    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');
    container.className = 'modal' + (cssClass ? ' ' + cssClass : '');
    container.innerHTML = html;
    overlay.classList.add('active');

    // Close on backdrop click
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

    // Close on Escape
    const escHandler = (e) => {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('active');
  }

  function esc(str) {
    if (str == null) return '';
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  function options(list, selected) {
    return list.map(v =>
      `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(v)}</option>`
    ).join('');
  }

  /* ================================================================
   * NEW PROJECT DIALOG
   * ================================================================ */

  async function showNewProjectDialog(onCreated) {
    openModal(`
      <div class="modal-header">
        <h3>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
          New Project
        </h3>
        <button class="btn-icon" onclick="Dialogs.close()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Project Name</label>
          <input type="text" class="form-input" id="dlg-project-name" placeholder="Enter project name..." autofocus>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Dialogs.close()">Cancel</button>
        <button class="btn btn-primary" id="dlg-create-project-btn">Create Project</button>
      </div>
    `, 'modal-sm');

    const createBtn = document.getElementById('dlg-create-project-btn');
    const nameInput = document.getElementById('dlg-project-name');

    const create = async () => {
      const name = nameInput.value.trim();
      if (!name) { alert('Please enter a project name.'); return; }
      const exists = await window.api.projectExists(name);
      if (exists) { alert(`"${name}" already exists.`); return; }
      await window.api.addProject(name);
      // Add template nodes for the new project
      const templates = await window.api.getTemplateItems();
      for (const t of templates) await window.api.saveNodeState(name, t, false);
      closeModal();
      if (onCreated) onCreated(name);
    };

    createBtn.addEventListener('click', create);
    nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); });
  }

  /* ================================================================
   * CHANGE REQUEST FORM
   * ================================================================ */

  async function showChangeRequestForm(projectName, cr, onSaved) {
    const isEdit = cr && cr.id > 0;
    const devNames = await window.api.getDeveloperNames();
    const deployments = await window.api.getDeployments(projectName);

    openModal(`
      <div class="modal-header">
        <h3>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
          ${isEdit ? 'Edit' : 'Add'} Change Request
        </h3>
        <button class="btn-icon" onclick="Dialogs.close()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">CR Number</label>
            <input type="text" class="form-input" id="cr-number" value="${esc(cr?.crNumber)}"></div>
          <div class="form-group"><label class="form-label">Title</label>
            <input type="text" class="form-input" id="cr-title" value="${esc(cr?.title)}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Requested By</label>
            <input type="text" class="form-input" id="cr-requested-by" value="${esc(cr?.requestedBy)}"></div>
          <div class="form-group"><label class="form-label">Received Date</label>
            <input type="date" class="form-input" id="cr-received-date" value="${esc(cr?.receivedDate)}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Priority</label>
            <select class="form-select" id="cr-priority">${options(CR_PRIORITIES, cr?.priority || 'Medium')}</select></div>
          <div class="form-group"><label class="form-label">Status</label>
            <select class="form-select" id="cr-status">${options(CR_STATUSES, cr?.status || 'New')}</select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Target Date</label>
            <input type="date" class="form-input" id="cr-target-date" value="${esc(cr?.targetDate)}"></div>
          <div class="form-group"><label class="form-label">Delivered Date</label>
            <input type="date" class="form-input" id="cr-delivered-date" value="${esc(cr?.deliveredDate)}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Assigned To</label>
            <select class="form-select" id="cr-assigned-to">
              <option value="">(Unassigned)</option>
              ${devNames.map(d => `<option value="${esc(d)}" ${d === cr?.assignedTo ? 'selected' : ''}>${esc(d)}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Deployment</label>
            <select class="form-select" id="cr-deployment-id">
              <option value="0">(None)</option>
              ${deployments.map(dep => {
                const label = (dep.name || `#${dep.id}`) + (dep.ritmNumber ? ` / ${dep.ritmNumber}` : '') + (dep.environment ? ` (${dep.environment})` : '');
                return `<option value="${dep.id}" ${dep.id === cr?.deploymentId ? 'selected' : ''}>${esc(label)}</option>`;
              }).join('')}
            </select></div>
        </div>
        <div class="form-group"><label class="form-label">Notes</label>
          <textarea class="form-textarea" id="cr-notes">${esc(cr?.notes)}</textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Dialogs.close()">Cancel</button>
        <button class="btn btn-primary" id="cr-save-btn">${isEdit ? 'Update' : 'Create'}</button>
      </div>
    `);

    document.getElementById('cr-save-btn').addEventListener('click', async () => {
      const data = {
        id: cr?.id || 0,
        projectName: projectName,
        crNumber: document.getElementById('cr-number').value,
        title: document.getElementById('cr-title').value,
        requestedBy: document.getElementById('cr-requested-by').value,
        receivedDate: document.getElementById('cr-received-date').value,
        priority: document.getElementById('cr-priority').value,
        status: document.getElementById('cr-status').value,
        targetDate: document.getElementById('cr-target-date').value,
        deliveredDate: document.getElementById('cr-delivered-date').value,
        assignedTo: document.getElementById('cr-assigned-to').value,
        deploymentId: parseInt(document.getElementById('cr-deployment-id').value) || 0,
        notes: document.getElementById('cr-notes').value
      };

      if (isEdit) {
        const existing = await window.api.getChangeRequests(projectName);
        const idx = existing.findIndex(r => r.id === data.id);
        if (idx >= 0) existing[idx] = data;
        else existing.push(data);
        await window.api.saveChangeRequests(projectName, existing);
      } else {
        await window.api.addChangeRequest(data);
      }
      closeModal();
      if (onSaved) onSaved();
    });
  }

  /* ================================================================
   * DEPLOYMENT FORM
   * ================================================================ */

  async function showDeploymentForm(projectName, dep, onSaved) {
    const isEdit = dep && dep.id > 0;

    openModal(`
      <div class="modal-header">
        <h3>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
          ${isEdit ? 'Edit' : 'Submit'} Deployment Request
        </h3>
        <button class="btn-icon" onclick="Dialogs.close()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Deployment Name</label>
            <input type="text" class="form-input" id="dep-name" value="${esc(dep?.name)}"></div>
          <div class="form-group"><label class="form-label">RITM Number</label>
            <input type="text" class="form-input" id="dep-ritm" value="${esc(dep?.ritmNumber)}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Environment</label>
            <select class="form-select" id="dep-env">${options(DEPLOYMENT_ENVIRONMENTS, dep?.environment || 'PROD')}</select></div>
          <div class="form-group"><label class="form-label">Status</label>
            <select class="form-select" id="dep-status">${options(DEPLOYMENT_STATUSES, dep?.status || 'Requested')}</select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Requested Date</label>
            <input type="date" class="form-input" id="dep-requested-date" value="${esc(dep?.requestedDate)}"></div>
          <div class="form-group"><label class="form-label">Deployed Date</label>
            <input type="date" class="form-input" id="dep-deployed-date" value="${esc(dep?.deployedDate)}"></div>
        </div>
        <div class="form-group"><label class="form-label">Requested By</label>
          <input type="text" class="form-input" id="dep-requested-by" value="${esc(dep?.requestedBy)}"></div>
        <div class="form-group"><label class="form-label">Change Description</label>
          <textarea class="form-textarea" id="dep-change-desc">${esc(dep?.changeDescription)}</textarea></div>
        <div class="form-group"><label class="form-label">Tasks to Deploy</label>
          <textarea class="form-textarea" id="dep-tasks">${esc(dep?.tasksToDeploy)}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Test Log Path</label>
            <input type="text" class="form-input" id="dep-test-log" value="${esc(dep?.testLogPath)}"></div>
          <div class="form-group"><label class="form-label">Code Analysis Path</label>
            <input type="text" class="form-input" id="dep-code-analysis" value="${esc(dep?.codeAnalysisPath)}"></div>
        </div>
        <div class="form-group"><label class="form-label">Code Moved to Test?</label>
          <select class="form-select" id="dep-code-moved" style="max-width:120px;">
            <option value="No" ${dep?.codeMovedToTest !== 'Yes' ? 'selected' : ''}>No</option>
            <option value="Yes" ${dep?.codeMovedToTest === 'Yes' ? 'selected' : ''}>Yes</option>
          </select></div>
        <div class="form-group"><label class="form-label">Notes</label>
          <textarea class="form-textarea" id="dep-notes">${esc(dep?.notes)}</textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Dialogs.close()">Cancel</button>
        <button class="btn btn-primary" id="dep-save-btn">${isEdit ? 'Update' : 'Submit'}</button>
      </div>
    `, 'modal-lg');

    document.getElementById('dep-save-btn').addEventListener('click', async () => {
      const data = {
        id: dep?.id || 0,
        projectName: projectName,
        name: document.getElementById('dep-name').value,
        ritmNumber: document.getElementById('dep-ritm').value,
        environment: document.getElementById('dep-env').value,
        status: document.getElementById('dep-status').value,
        requestedDate: document.getElementById('dep-requested-date').value,
        deployedDate: document.getElementById('dep-deployed-date').value,
        requestedBy: document.getElementById('dep-requested-by').value,
        changeDescription: document.getElementById('dep-change-desc').value,
        tasksToDeploy: document.getElementById('dep-tasks').value,
        testLogPath: document.getElementById('dep-test-log').value,
        codeAnalysisPath: document.getElementById('dep-code-analysis').value,
        codeMovedToTest: document.getElementById('dep-code-moved').value,
        notes: document.getElementById('dep-notes').value
      };

      if (isEdit) {
        const existing = await window.api.getDeployments(projectName);
        const idx = existing.findIndex(d => d.id === data.id);
        if (idx >= 0) existing[idx] = data;
        else existing.push(data);
        await window.api.saveDeployments(projectName, existing);
      } else {
        await window.api.addDeployment(data);
      }
      closeModal();
      if (onSaved) onSaved();
    });
  }

  /* ================================================================
   * SERVICE ACCOUNT FORM
   * ================================================================ */

  async function showServiceAccountForm(projectName, sa, onSaved) {
    const isEdit = sa && sa.id > 0;

    openModal(`
      <div class="modal-header">
        <h3>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
          ${isEdit ? 'Edit' : 'Add'} Service Account
        </h3>
        <button class="btn-icon" onclick="Dialogs.close()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Environment</label>
            <select class="form-select" id="sa-env">${options(SA_ENVIRONMENTS, sa?.environment || 'PROD')}</select></div>
          <div class="form-group"><label class="form-label">Account ID</label>
            <input type="text" class="form-input" id="sa-account-id" value="${esc(sa?.accountId)}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Alias</label>
            <input type="text" class="form-input" id="sa-alias" value="${esc(sa?.alias)}"></div>
          <div class="form-group"><label class="form-label">App Name</label>
            <input type="text" class="form-input" id="sa-app-name" value="${esc(sa?.appName)}"></div>
        </div>
        <div class="form-group"><label class="form-label">Email</label>
          <input type="email" class="form-input" id="sa-email" value="${esc(sa?.email)}"></div>
        <div class="form-group"><label class="form-label">Description</label>
          <textarea class="form-textarea" id="sa-desc">${esc(sa?.description)}</textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Dialogs.close()">Cancel</button>
        <button class="btn btn-primary" id="sa-save-btn">${isEdit ? 'Update' : 'Add'}</button>
      </div>
    `, 'modal-sm');

    document.getElementById('sa-save-btn').addEventListener('click', async () => {
      const data = {
        id: sa?.id || 0,
        projectName: projectName,
        environment: document.getElementById('sa-env').value,
        accountId: document.getElementById('sa-account-id').value,
        alias: document.getElementById('sa-alias').value,
        appName: document.getElementById('sa-app-name').value,
        email: document.getElementById('sa-email').value,
        description: document.getElementById('sa-desc').value
      };

      if (isEdit) {
        await window.api.updateServiceAccount(data);
      } else {
        await window.api.addServiceAccount(data);
      }
      closeModal();
      if (onSaved) onSaved();
    });
  }

  /* ================================================================
   * ALL CHANGE REQUESTS (cross-project)
   * ================================================================ */

  async function showAllChangeRequests() {
    const all = await window.api.getAllChangeRequests();

    openModal(`
      <div class="modal-header">
        <h3>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
          All Change Requests
        </h3>
        <button class="btn-icon" onclick="Dialogs.close()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="table-container">
          <table>
            <thead><tr><th>Project</th><th>CR #</th><th>Title</th><th>Priority</th><th>Status</th><th>Assigned</th></tr></thead>
            <tbody>
              ${all.map(cr => `<tr>
                <td>${esc(cr.projectName)}</td><td>${esc(cr.crNumber)}</td><td>${esc(cr.title)}</td>
                <td><span class="badge ${priorityBadge(cr.priority)}">${esc(cr.priority)}</span></td>
                <td><span class="badge ${statusBadge(cr.status)}">${esc(cr.status)}</span></td>
                <td>${esc(cr.assignedTo)}</td>
              </tr>`).join('')}
              ${all.length === 0 ? '<tr><td colspan="6" class="text-muted" style="text-align:center;padding:24px;">No change requests.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Dialogs.close()">Close</button>
      </div>
    `, 'modal-lg');
  }

  /* ================================================================
   * ALL DEPLOYMENTS (cross-project)
   * ================================================================ */

  async function showAllDeployments() {
    const all = await window.api.getAllDeployments();

    openModal(`
      <div class="modal-header">
        <h3>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
          All Deployments
        </h3>
        <button class="btn-icon" onclick="Dialogs.close()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="table-container">
          <table>
            <thead><tr><th>Project</th><th>Name</th><th>RITM</th><th>Env</th><th>Status</th><th>Deployed</th></tr></thead>
            <tbody>
              ${all.map(d => `<tr>
                <td>${esc(d.projectName)}</td><td>${esc(d.name)}</td><td>${esc(d.ritmNumber)}</td>
                <td><span class="badge badge-todo">${esc(d.environment)}</span></td>
                <td><span class="badge ${statusBadge(d.status)}">${esc(d.status)}</span></td>
                <td>${esc(d.deployedDate)}</td>
              </tr>`).join('')}
              ${all.length === 0 ? '<tr><td colspan="6" class="text-muted" style="text-align:center;padding:24px;">No deployments.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Dialogs.close()">Close</button>
      </div>
    `, 'modal-lg');
  }

  /* ================================================================
   * ALL SERVICE ACCOUNTS (cross-project)
   * ================================================================ */

  async function showAllServiceAccounts() {
    const all = await window.api.getAllServiceAccounts();

    openModal(`
      <div class="modal-header">
        <h3>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
          All Service Accounts
        </h3>
        <button class="btn-icon" onclick="Dialogs.close()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="table-container">
          <table>
            <thead><tr><th>Project</th><th>Env</th><th>Account ID</th><th>Alias</th><th>App</th><th>Email</th></tr></thead>
            <tbody>
              ${all.map(sa => `<tr>
                <td>${esc(sa.projectName)}</td><td><span class="badge badge-todo">${esc(sa.environment)}</span></td>
                <td>${esc(sa.accountId)}</td><td>${esc(sa.alias)}</td>
                <td>${esc(sa.appName)}</td><td>${esc(sa.email)}</td>
              </tr>`).join('')}
              ${all.length === 0 ? '<tr><td colspan="6" class="text-muted" style="text-align:center;padding:24px;">No service accounts.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Dialogs.close()">Close</button>
      </div>
    `, 'modal-lg');
  }

  /* ================================================================
   * SETTINGS DIALOG
   * ================================================================ */

  async function showSettings(initialPage) {
    const templates = await window.api.getTemplateItems();
    const urlItems = await window.api.getUrlItems();
    const apps = await window.api.getApplications();
    const devs = await window.api.getDevelopers();
    const currentTheme = await window.api.getSetting('ui.theme', 'DARK');
    const page = initialPage || 'templates';

    openModal(`
      <div class="modal-header">
        <h3>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          Settings
        </h3>
        <button class="btn-icon" onclick="Dialogs.close()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body" style="padding:0; display:flex; height:420px;">
        <div class="settings-layout" style="width:100%;">
          <div class="settings-sidebar">
            <div class="settings-nav-item ${page === 'templates' ? 'active' : ''}" data-page="templates">📋 Templates</div>
            <div class="settings-nav-item ${page === 'urls' ? 'active' : ''}" data-page="urls">🔗 URLs</div>
            <div class="settings-nav-item ${page === 'applications' ? 'active' : ''}" data-page="applications">📦 Applications</div>
            <div class="settings-nav-item ${page === 'developers' ? 'active' : ''}" data-page="developers">👤 Developers</div>
            <div class="settings-nav-item ${page === 'appearance' ? 'active' : ''}" data-page="appearance">🎨 Appearance</div>
          </div>
          <div class="settings-content" id="settings-content">

            <!-- Templates page -->
            <div class="settings-page ${page === 'templates' ? 'active' : ''}" data-page="templates">
              <div class="settings-page-title">Project Template Items</div>
              <div class="settings-page-desc">These nodes will be added to every new project.</div>
              <div class="table-container card mb-md" style="max-height:200px; overflow-y:auto;">
                <table><thead><tr><th>Template Node Name</th></tr></thead>
                <tbody id="settings-templates-body">
                  ${templates.map(t => `<tr><td>${esc(t)}</td></tr>`).join('')}
                </tbody></table>
              </div>
              <div class="flex gap-sm">
                <input type="text" class="form-input flex-1" id="settings-new-template" placeholder="New template name">
                <button class="btn btn-primary btn-sm" id="settings-add-template">+ Add</button>
                <button class="btn btn-secondary btn-sm" id="settings-remove-template">− Remove Selected</button>
              </div>
            </div>

            <!-- URLs page -->
            <div class="settings-page ${page === 'urls' ? 'active' : ''}" data-page="urls">
              <div class="settings-page-title">Default Project URLs</div>
              <div class="settings-page-desc">Manage URL categories and set default values.</div>
              <div class="table-container card mb-md" style="max-height:180px; overflow-y:auto;">
                <table><thead><tr><th>Category</th><th>URL Name</th><th>Default URL</th></tr></thead>
                <tbody id="settings-urls-body">
                  ${urlItems.map((u, i) => `<tr data-idx="${i}">
                    <td><input type="text" class="form-input" style="font-size:12px;padding:4px 8px;" value="${esc(u.category)}" data-field="cat"></td>
                    <td><input type="text" class="form-input" style="font-size:12px;padding:4px 8px;" value="${esc(u.name)}" data-field="name"></td>
                    <td><input type="text" class="form-input" style="font-size:12px;padding:4px 8px;" value="${esc(u.url)}" data-field="url"></td>
                  </tr>`).join('')}
                </tbody></table>
              </div>
              <div class="flex gap-sm mb-sm">
                <input type="text" class="form-input" id="settings-new-url-cat" placeholder="Category" style="flex:0.4;">
                <input type="text" class="form-input flex-1" id="settings-new-url-name" placeholder="URL Name">
                <button class="btn btn-primary btn-sm" id="settings-add-url">+ Add</button>
              </div>
              <button class="btn btn-primary" id="settings-save-urls">Save All URLs</button>
            </div>

            <!-- Applications page -->
            <div class="settings-page ${page === 'applications' ? 'active' : ''}" data-page="applications">
              <div class="settings-page-title">Applications</div>
              <div class="settings-page-desc">The unique applications your RPAs use.</div>
              <div class="table-container card mb-md" style="max-height:200px; overflow-y:auto;">
                <table><thead><tr><th>Application Name</th></tr></thead>
                <tbody id="settings-apps-body">
                  ${apps.map(a => `<tr><td>${esc(a)}</td></tr>`).join('')}
                </tbody></table>
              </div>
              <div class="flex gap-sm">
                <input type="text" class="form-input flex-1" id="settings-new-app" placeholder="New application name">
                <button class="btn btn-primary btn-sm" id="settings-add-app">+ Add</button>
                <button class="btn btn-secondary btn-sm" id="settings-remove-app">− Remove Selected</button>
              </div>
            </div>

            <!-- Developers page -->
            <div class="settings-page ${page === 'developers' ? 'active' : ''}" data-page="developers">
              <div class="settings-page-title">Developers</div>
              <div class="settings-page-desc">Add developers, then assign them projects and work items.</div>
              <div class="table-container card mb-md" style="max-height:200px; overflow-y:auto;">
                <table><thead><tr><th>Name</th><th>Emp ID</th><th>Email</th><th>Active</th></tr></thead>
                <tbody id="settings-devs-body">
                  ${devs.map(d => `<tr><td>${esc(d.name)}</td><td>${esc(d.empId)}</td><td>${esc(d.email)}</td>
                    <td>${d.active ? '✅' : '❌'}</td></tr>`).join('')}
                </tbody></table>
              </div>
              <div class="flex gap-sm">
                <input type="text" class="form-input" id="settings-new-dev-name" placeholder="Name" style="flex:1;">
                <input type="text" class="form-input" id="settings-new-dev-empid" placeholder="Emp ID" style="flex:0.5;">
                <input type="text" class="form-input" id="settings-new-dev-email" placeholder="Email" style="flex:1;">
                <button class="btn btn-primary btn-sm" id="settings-add-dev">+ Add</button>
                <button class="btn btn-secondary btn-sm" id="settings-remove-dev">− Remove</button>
              </div>
            </div>

            <!-- Appearance page -->
            <div class="settings-page ${page === 'appearance' ? 'active' : ''}" data-page="appearance">
              <div class="settings-page-title">Appearance</div>
              <div class="settings-page-desc">Pick the theme used across the application.</div>
              <div class="card card-padding-sm" style="max-width:300px;">
                <label class="form-label">Theme</label>
                ${['LIGHT', 'BLUE', 'DARK'].map(t => `
                  <label class="form-checkbox mb-sm">
                    <input type="radio" name="settings-theme" value="${t}" ${t === currentTheme ? 'checked' : ''}>
                    ${t.charAt(0) + t.slice(1).toLowerCase()}
                  </label>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Dialogs.close()">Close</button>
      </div>
    `, 'modal-lg');

    // Tab navigation
    document.querySelectorAll('.settings-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.settings-page').forEach(p => p.classList.remove('active'));
        item.classList.add('active');
        const target = document.querySelector(`.settings-page[data-page="${item.dataset.page}"]`);
        if (target) target.classList.add('active');
      });
    });

    // Template actions
    document.getElementById('settings-add-template')?.addEventListener('click', async () => {
      const name = document.getElementById('settings-new-template').value.trim();
      if (!name) { alert('Enter a template name first.'); return; }
      const ok = await window.api.addTemplateItem(name);
      if (!ok) { alert(`"${name}" already exists.`); return; }
      // Materialise for all projects
      const projects = await window.api.getProjectNames();
      for (const p of projects) await window.api.saveNodeState(p, name, false);
      closeModal();
      showSettings('templates');
    });

    document.getElementById('settings-remove-template')?.addEventListener('click', async () => {
      const rows = document.querySelectorAll('#settings-templates-body tr');
      // Remove last selected (simple approach)
      if (rows.length === 0) return;
      const name = rows[rows.length - 1].textContent.trim();
      if (confirm(`Remove "${name}" from every project?`)) {
        await window.api.removeTemplateItem(name);
        closeModal();
        showSettings('templates');
      }
    });

    // URL actions
    document.getElementById('settings-add-url')?.addEventListener('click', () => {
      const urlBody = document.getElementById('settings-urls-body');
      const cat = document.getElementById('settings-new-url-cat').value.trim();
      const name = document.getElementById('settings-new-url-name').value.trim();
      if (!name) { alert('Enter a URL name first.'); return; }
      const idx = urlBody.children.length;
      urlBody.insertAdjacentHTML('beforeend', `<tr data-idx="${idx}">
        <td><input type="text" class="form-input" style="font-size:12px;padding:4px 8px;" value="${esc(cat)}" data-field="cat"></td>
        <td><input type="text" class="form-input" style="font-size:12px;padding:4px 8px;" value="${esc(name)}" data-field="name"></td>
        <td><input type="text" class="form-input" style="font-size:12px;padding:4px 8px;" value="" data-field="url"></td>
      </tr>`);
      document.getElementById('settings-new-url-name').value = '';
    });

    document.getElementById('settings-save-urls')?.addEventListener('click', async () => {
      const rows = document.querySelectorAll('#settings-urls-body tr');
      const items = [];
      rows.forEach(row => {
        const cat = row.querySelector('[data-field="cat"]')?.value?.trim() || '';
        const name = row.querySelector('[data-field="name"]')?.value?.trim() || '';
        const url = row.querySelector('[data-field="url"]')?.value?.trim() || '';
        if (name) items.push({ category: cat, name, url });
      });
      await window.api.replaceUrlItems(items);
      alert(`Saved ${items.length} URL(s).`);
    });

    // Application actions
    document.getElementById('settings-add-app')?.addEventListener('click', async () => {
      const name = document.getElementById('settings-new-app').value.trim();
      if (!name) { alert('Enter an application name first.'); return; }
      const ok = await window.api.addApplication(name);
      if (!ok) { alert(`"${name}" already exists.`); return; }
      closeModal(); showSettings('applications');
    });

    document.getElementById('settings-remove-app')?.addEventListener('click', async () => {
      const rows = document.querySelectorAll('#settings-apps-body tr');
      if (rows.length === 0) return;
      const name = rows[rows.length - 1].textContent.trim();
      if (confirm(`Remove "${name}"?`)) {
        await window.api.removeApplication(name);
        closeModal(); showSettings('applications');
      }
    });

    // Developer actions
    document.getElementById('settings-add-dev')?.addEventListener('click', async () => {
      const name = document.getElementById('settings-new-dev-name').value.trim();
      const empId = document.getElementById('settings-new-dev-empid').value.trim();
      const email = document.getElementById('settings-new-dev-email').value.trim();
      if (!name) { alert('Enter a developer name first.'); return; }
      const ok = await window.api.addDeveloper(name, empId, email);
      if (!ok) { alert(`"${name}" already exists.`); return; }
      closeModal(); showSettings('developers');
    });

    document.getElementById('settings-remove-dev')?.addEventListener('click', async () => {
      const rows = document.querySelectorAll('#settings-devs-body tr');
      if (rows.length === 0) return;
      const name = rows[rows.length - 1].cells[0].textContent.trim();
      if (confirm(`Remove "${name}"?`)) {
        await window.api.removeDeveloper(name);
        closeModal(); showSettings('developers');
      }
    });

    // Theme radios
    document.querySelectorAll('input[name="settings-theme"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          window.api.setTheme(radio.value);
        }
      });
    });
  }

  /* ================================================================
   * APP USAGE REPORT
   * ================================================================ */

  async function showAppUsage() {
    const usage = await window.api.getApplicationUsage();
    // Group by application
    const grouped = {};
    for (const u of usage) {
      if (!grouped[u.applicationName]) grouped[u.applicationName] = [];
      if (u.projectName) grouped[u.applicationName].push(u.projectName);
    }

    const rows = Object.entries(grouped).map(([app, projects]) =>
      `<tr><td>${esc(app)}</td><td>${projects.length > 0 ? projects.map(p => esc(p)).join(', ') : '<span class="text-muted">—</span>'}</td></tr>`
    ).join('');

    openModal(`
      <div class="modal-header">
        <h3>📦 Application Usage</h3>
        <button class="btn-icon" onclick="Dialogs.close()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="table-container">
          <table><thead><tr><th>Application</th><th>Used By Projects</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="2" class="text-muted" style="text-align:center;padding:24px;">No applications defined yet.</td></tr>'}</tbody></table>
        </div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="Dialogs.close()">Close</button></div>
    `);
  }

  /* ================================================================
   * WORKLOAD REPORT
   * ================================================================ */

  async function showWorkloadReport() {
    const devs = await window.api.getDevelopers();
    const owners = await window.api.getProjectOwners();
    const allCrs = await window.api.getAllChangeRequests();

    const rows = devs.filter(d => d.active).map(d => {
      const projects = Object.entries(owners).filter(([_, owner]) => owner === d.name).map(([p]) => p);
      const crs = allCrs.filter(cr => cr.assignedTo === d.name && !['Deployed', 'Rejected', 'Cancelled', 'Withdrawn'].includes(cr.status));
      return `<tr><td>${esc(d.name)}</td><td>${projects.length}</td><td>${crs.length}</td>
        <td>${projects.join(', ') || '—'}</td></tr>`;
    }).join('');

    openModal(`
      <div class="modal-header">
        <h3>👥 Workload by Developer</h3>
        <button class="btn-icon" onclick="Dialogs.close()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="table-container">
          <table><thead><tr><th>Developer</th><th># Projects</th><th># Open CRs</th><th>Projects</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4" class="text-muted" style="text-align:center;padding:24px;">No developers defined yet.</td></tr>'}</tbody></table>
        </div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="Dialogs.close()">Close</button></div>
    `, 'modal-lg');
  }

  /* ================================================================
   * ABOUT DIALOG
   * ================================================================ */

  async function showAbout() {
    const counts = await window.api.getRecordCounts();
    const countRows = Object.entries(counts).map(([label, count]) =>
      `<tr><td>${esc(label)}</td><td style="text-align:right;font-weight:600;">${count}</td></tr>`
    ).join('');

    openModal(`
      <div class="modal-header">
        <h3>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          About AshApp
        </h3>
        <button class="btn-icon" onclick="Dialogs.close()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body" style="text-align:center;">
        <div style="font-size:28px; font-weight:700; color:var(--accent); margin-bottom:4px;">AshApp</div>
        <div style="font-size:14px; color:var(--text-secondary); margin-bottom:4px;">RPA Project Manager</div>
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">Version 1.0 — Electron Edition</div>
        <div style="font-size:13px; color:var(--text-secondary); margin-bottom:24px; max-width:400px; margin-left:auto; margin-right:auto;">
          Track RPA projects, change requests and deployments in one place.
        </div>
        <div class="table-container card" style="max-width:360px; margin:0 auto;">
          <table><thead><tr><th>Category</th><th style="text-align:right;">Count</th></tr></thead>
          <tbody>${countRows}</tbody></table>
        </div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="Dialogs.close()">Close</button></div>
    `, 'modal-sm');
  }

  /* ================================================================
   * BADGE HELPERS
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

  return {
    showNewProjectDialog,
    showChangeRequestForm, showDeploymentForm, showServiceAccountForm,
    showAllChangeRequests, showAllDeployments, showAllServiceAccounts,
    showSettings, showAppUsage, showWorkloadReport, showAbout,
    close: closeModal
  };
})();
