/**
 * tasks.js — Right pane task management.
 * Table with search, add/edit form, status pills.
 */
'use strict';

const Tasks = (() => {
  let tasks = [];
  let selectedTaskId = -1;
  let searchQuery = '';

  async function init() {
    await loadTasks();
    renderForm();

    document.getElementById('task-search').addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderTable();
    });
  }

  async function loadTasks() {
    tasks = await window.api.getAllTasks();
    renderTable();
  }

  function renderTable() {
    const container = document.getElementById('task-table-container');
    const filtered = tasks.filter(t => {
      if (!searchQuery) return true;
      return (t.description || '').toLowerCase().includes(searchQuery)
        || (t.due_date || '').toLowerCase().includes(searchQuery)
        || (t.status || '').toLowerCase().includes(searchQuery);
    });

    container.innerHTML = `
      <div class="card" style="margin-top:8px;">
        <div class="table-container" style="max-height:calc(100vh - 360px); overflow-y:auto;">
          <table>
            <thead><tr>
              <th>Description</th>
              <th style="width:100px;">Due Date</th>
              <th style="width:100px;">Status</th>
            </tr></thead>
            <tbody>
              ${filtered.map(t => `
                <tr class="task-row" data-id="${t.id}" style="cursor:pointer;" title="Double-click to edit">
                  <td>${esc(t.description)}</td>
                  <td>${esc(t.due_date)}</td>
                  <td><span class="badge ${taskBadge(t.status)}">${esc(t.status)}</span></td>
                </tr>
              `).join('')}
              ${filtered.length === 0 ? '<tr><td colspan="3" style="text-align:center;padding:20px;" class="text-muted">No tasks yet.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Double-click to edit
    container.querySelectorAll('.task-row').forEach(row => {
      row.addEventListener('dblclick', () => {
        const id = parseInt(row.dataset.id);
        const task = tasks.find(t => t.id === id);
        if (task) editTask(task);
      });
    });
  }

  function renderForm() {
    const container = document.getElementById('task-form-container');
    container.innerHTML = `
      <div class="card card-padding-sm">
        <label class="form-label">New Task</label>
        <input type="text" class="form-input mb-sm" id="task-desc" placeholder="Task description">
        <div class="form-row mb-sm">
          <input type="date" class="form-input" id="task-date">
          <select class="form-select" id="task-status">
            <option value="To Do" selected>To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
        </div>
        <button class="btn btn-primary w-full" id="task-submit-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Task
        </button>
      </div>
    `;

    document.getElementById('task-submit-btn').addEventListener('click', submitTask);
    document.getElementById('task-desc').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitTask();
    });
  }

  async function submitTask() {
    const desc = document.getElementById('task-desc').value.trim();
    const date = document.getElementById('task-date').value;
    const status = document.getElementById('task-status').value;

    if (!desc) {
      alert('Please enter a task description.');
      return;
    }

    if (selectedTaskId === -1) {
      await window.api.addTask(desc, date, status);
    } else {
      await window.api.updateTask(selectedTaskId, desc, date, status);
    }

    resetForm();
    await loadTasks();
  }

  function editTask(task) {
    selectedTaskId = task.id;
    document.getElementById('task-desc').value = task.description || '';
    document.getElementById('task-date').value = task.due_date || '';
    document.getElementById('task-status').value = task.status || 'To Do';

    const btn = document.getElementById('task-submit-btn');
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      Update Task
    `;

    document.getElementById('task-desc').focus();
  }

  function resetForm() {
    selectedTaskId = -1;
    document.getElementById('task-desc').value = '';
    document.getElementById('task-date').value = '';
    document.getElementById('task-status').value = 'To Do';

    const btn = document.getElementById('task-submit-btn');
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Add Task
    `;
  }

  function taskBadge(status) {
    if (!status) return 'badge-todo';
    const s = status.toLowerCase();
    if (s === 'done') return 'badge-done';
    if (s === 'in progress') return 'badge-progress';
    return 'badge-todo';
  }

  function esc(str) {
    if (str == null) return '';
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  return { init, loadTasks };
})();
