/**
 * database.js — Full SQLite layer for RPAMan.
 *
 * Mirrors every table and operation from the Java DatabaseManager so the
 * Electron app is fully compatible with the existing rpa_manager.db.
 */
'use strict';

const path = require('path');
const Database = require('better-sqlite3');

class DatabaseManager {
  constructor(dbPath) {
    const resolved = dbPath || path.join(process.cwd(), 'rpa_manager.db');
    this.db = new Database(resolved);
    this.db.pragma('journal_mode = WAL');
    this._initializeDatabase();
  }

  /* ================================================================
   * SCHEMA
   * ================================================================ */

  _initializeDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS Tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        due_date TEXT,
        status TEXT
      );

      CREATE TABLE IF NOT EXISTS Projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS TemplateNodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT,
        node_name TEXT,
        is_selected INTEGER DEFAULT 0,
        completion_date TEXT,
        comments TEXT,
        UNIQUE(project_name, node_name)
      );

      CREATE TABLE IF NOT EXISTS Settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS ProjectConfig (
        project_name TEXT PRIMARY KEY,
        db_path TEXT,
        received_query TEXT,
        pending_query TEXT,
        processed_query TEXT
      );

      CREATE TABLE IF NOT EXISTS ProjectMachines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        machine_name TEXT,
        user_name TEXT
      );

      CREATE TABLE IF NOT EXISTS TemplateItems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS UrlItems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        name TEXT NOT NULL,
        url TEXT,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS Applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS ProjectApplications (
        project_name TEXT NOT NULL,
        application_name TEXT NOT NULL,
        UNIQUE(project_name, application_name)
      );

      CREATE TABLE IF NOT EXISTS Deployments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        name TEXT,
        ritm_number TEXT,
        environment TEXT,
        requested_date TEXT,
        deployed_date TEXT,
        status TEXT,
        requested_by TEXT,
        change_description TEXT,
        tasks_to_deploy TEXT,
        test_log_path TEXT,
        code_analysis_path TEXT,
        code_moved_to_test TEXT,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS ChangeRequests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        cr_number TEXT,
        title TEXT,
        requested_by TEXT,
        received_date TEXT,
        priority TEXT,
        status TEXT,
        target_date TEXT,
        delivered_date TEXT,
        deployment_id INTEGER DEFAULT 0,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS ServiceAccounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        environment TEXT,
        account_id TEXT,
        alias TEXT,
        app_name TEXT,
        email TEXT,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS Developers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        emp_id TEXT,
        email TEXT,
        active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS AdhocItems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        developer_name TEXT,
        title TEXT,
        description TEXT,
        status TEXT,
        priority TEXT,
        start_date TEXT,
        due_date TEXT,
        completed_date TEXT
      );

      CREATE TABLE IF NOT EXISTS AaActivity (
        id TEXT PRIMARY KEY,
        activity_name TEXT,
        automation_name TEXT,
        automation_type TEXT,
        device_name TEXT,
        run_as_user TEXT,
        status TEXT,
        running_time TEXT,
        activity_type TEXT,
        started_on TEXT,
        started_display TEXT,
        ended_on TEXT,
        fetched_at TEXT
      );
    `);

    this._migrateSchema();
    this._seedDefaultTemplateItems();
    this._seedDefaultProjects();
  }

  _migrateSchema() {
    const migrations = [
      ['Deployments', 'ritm_number', 'TEXT'],
      ['Deployments', 'change_description', 'TEXT'],
      ['Deployments', 'tasks_to_deploy', 'TEXT'],
      ['Deployments', 'test_log_path', 'TEXT'],
      ['Deployments', 'code_analysis_path', 'TEXT'],
      ['Deployments', 'code_moved_to_test', 'TEXT'],
      ['Projects', 'assigned_developer', 'TEXT'],
      ['ChangeRequests', 'assigned_to', 'TEXT'],
      ['Developers', 'emp_id', 'TEXT'],
      ['ServiceAccounts', 'account_id', 'TEXT'],
      ['ServiceAccounts', 'alias', 'TEXT'],
      ['ServiceAccounts', 'app_name', 'TEXT'],
      ['ServiceAccounts', 'email', 'TEXT'],
      ['ServiceAccounts', 'description', 'TEXT'],
    ];

    for (const [table, column, type] of migrations) {
      this._addColumnIfMissing(table, column, type);
    }

    // Rename QA → TEST
    for (const table of ['Deployments', 'ServiceAccounts']) {
      try {
        this.db.prepare(`UPDATE ${table} SET environment = ? WHERE environment = ?`).run('TEST', 'QA');
      } catch (_) { /* ignore */ }
    }
  }

  _addColumnIfMissing(table, column, type) {
    try {
      const cols = this.db.prepare(`PRAGMA table_info(${table})`).all();
      const names = cols.map(c => c.name.toLowerCase());
      if (!names.includes(column.toLowerCase())) {
        this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      }
    } catch (_) { /* ignore */ }
  }

  _seedDefaultTemplateItems() {
    if (this.getTemplateItems().length > 0) return;
    const defaults = [
      'TPM Name Requested', 'TPM Entry', 'Qualification', 'Define',
      'BCA', 'Development', 'Deployment', 'Prod Validation'
    ];
    for (const name of defaults) this.addTemplateItem(name);
  }

  _seedDefaultProjects() {
    if (this.getProjectNames().length > 0) return;
    for (const name of ['NAR Umbrella', 'Another Test', 'Test33']) {
      this.addProject(name);
    }
  }

  /* ================================================================
   * PROJECTS
   * ================================================================ */

  getProjectNames() {
    return this.db.prepare('SELECT name FROM Projects ORDER BY id').all().map(r => r.name || '');
  }

  addProject(name) {
    if (!name || !name.trim()) return false;
    try {
      const info = this.db.prepare('INSERT OR IGNORE INTO Projects (name) VALUES (?)').run(name.trim());
      return info.changes > 0;
    } catch (_) { return false; }
  }

  projectExists(name) {
    if (!name) return false;
    const row = this.db.prepare('SELECT 1 FROM Projects WHERE name = ? COLLATE NOCASE').get(name.trim());
    return !!row;
  }

  /* ================================================================
   * SETTINGS
   * ================================================================ */

  getSetting(key, defaultValue) {
    const row = this.db.prepare('SELECT value FROM Settings WHERE key = ?').get(key);
    return (row && row.value != null) ? row.value : (defaultValue || '');
  }

  setSetting(key, value) {
    this.db.prepare(
      'INSERT INTO Settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?'
    ).run(key, value, value);
  }

  /* ================================================================
   * TEMPLATE ITEMS (global)
   * ================================================================ */

  getTemplateItems() {
    return this.db.prepare('SELECT name FROM TemplateItems ORDER BY sort_order, id').all().map(r => r.name || '');
  }

  addTemplateItem(name) {
    if (!name || !name.trim()) return false;
    try {
      const info = this.db.prepare(
        'INSERT OR IGNORE INTO TemplateItems (name, sort_order) VALUES (?, (SELECT IFNULL(MAX(sort_order), 0) + 1 FROM TemplateItems))'
      ).run(name.trim());
      return info.changes > 0;
    } catch (_) { return false; }
  }

  removeTemplateItem(name) {
    this.db.prepare('DELETE FROM TemplateItems WHERE name = ?').run(name);
    this.db.prepare('DELETE FROM TemplateNodes WHERE node_name = ?').run(name);
  }

  /* ================================================================
   * TEMPLATE NODE STATE (per project)
   * ================================================================ */

  saveNodeState(projectName, nodeName, isSelected) {
    this.db.prepare(
      `INSERT INTO TemplateNodes (project_name, node_name, is_selected) VALUES (?, ?, ?)
       ON CONFLICT(project_name, node_name) DO UPDATE SET is_selected = ?`
    ).run(projectName, nodeName, isSelected ? 1 : 0, isSelected ? 1 : 0);
  }

  isNodeSelected(projectName, nodeName) {
    const row = this.db.prepare(
      'SELECT is_selected FROM TemplateNodes WHERE project_name = ? AND node_name = ?'
    ).get(projectName, nodeName);
    return row ? row.is_selected === 1 : false;
  }

  /* ================================================================
   * TEMPLATE NODE DETAILS
   * ================================================================ */

  saveTemplateDetails(projectName, nodeName, completionDate, comments) {
    this.db.prepare(
      `INSERT INTO TemplateNodes (project_name, node_name, completion_date, comments) VALUES (?, ?, ?, ?)
       ON CONFLICT(project_name, node_name) DO UPDATE SET completion_date = ?, comments = ?`
    ).run(projectName, nodeName, completionDate, comments, completionDate, comments);
  }

  getTemplateDetails(projectName, nodeName) {
    const row = this.db.prepare(
      'SELECT completion_date, comments FROM TemplateNodes WHERE project_name = ? AND node_name = ?'
    ).get(projectName, nodeName);
    return {
      completionDate: (row && row.completion_date) || '',
      comments: (row && row.comments) || ''
    };
  }

  /* ================================================================
   * PROJECT CONFIG (Bot Status)
   * ================================================================ */

  getProjectConfig(projectName) {
    const row = this.db.prepare(
      'SELECT db_path, received_query, pending_query, processed_query FROM ProjectConfig WHERE project_name = ?'
    ).get(projectName);
    return {
      dbPath: (row && row.db_path) || '',
      receivedQuery: (row && row.received_query) || '',
      pendingQuery: (row && row.pending_query) || '',
      processedQuery: (row && row.processed_query) || ''
    };
  }

  saveProjectConfig(projectName, dbPath, receivedQuery, pendingQuery, processedQuery) {
    this.db.prepare(
      `INSERT INTO ProjectConfig (project_name, db_path, received_query, pending_query, processed_query)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(project_name) DO UPDATE SET db_path = ?, received_query = ?, pending_query = ?, processed_query = ?`
    ).run(projectName, dbPath, receivedQuery, pendingQuery, processedQuery,
          dbPath, receivedQuery, pendingQuery, processedQuery);
  }

  deleteProjectConfig(projectName) {
    this.db.prepare('DELETE FROM ProjectConfig WHERE project_name = ?').run(projectName);
    this.db.prepare('DELETE FROM ProjectMachines WHERE project_name = ?').run(projectName);
  }

  /* ================================================================
   * MACHINES
   * ================================================================ */

  getMachines(projectName) {
    return this.db.prepare(
      'SELECT machine_name, user_name FROM ProjectMachines WHERE project_name = ? ORDER BY id'
    ).all(projectName).map(r => ({ machine: r.machine_name || '', user: r.user_name || '' }));
  }

  getAllMachines() {
    return this.db.prepare(
      'SELECT project_name, machine_name, user_name FROM ProjectMachines ORDER BY project_name COLLATE NOCASE, id'
    ).all().map(r => ({ project: r.project_name || '', machine: r.machine_name || '', user: r.user_name || '' }));
  }

  replaceMachines(projectName, machines) {
    const txn = this.db.transaction(() => {
      this.db.prepare('DELETE FROM ProjectMachines WHERE project_name = ?').run(projectName);
      const ins = this.db.prepare('INSERT INTO ProjectMachines (project_name, machine_name, user_name) VALUES (?, ?, ?)');
      for (const m of machines) {
        ins.run(projectName, m.machine || '', m.user || '');
      }
    });
    txn();
  }

  /* ================================================================
   * TASKS
   * ================================================================ */

  addTask(description, dueDate, status) {
    this.db.prepare('INSERT INTO Tasks (description, due_date, status) VALUES (?, ?, ?)').run(description, dueDate, status);
  }

  updateTask(id, description, dueDate, status) {
    this.db.prepare('UPDATE Tasks SET description = ?, due_date = ?, status = ? WHERE id = ?').run(description, dueDate, status, id);
  }

  getAllTasks() {
    return this.db.prepare('SELECT id, description, due_date, status FROM Tasks').all();
  }

  /* ================================================================
   * CHANGE REQUESTS
   * ================================================================ */

  getChangeRequests(projectName) {
    return this.db.prepare('SELECT * FROM ChangeRequests WHERE project_name = ? ORDER BY id').all(projectName).map(r => this._mapCR(r));
  }

  getAllChangeRequests() {
    return this.db.prepare('SELECT * FROM ChangeRequests ORDER BY project_name COLLATE NOCASE, id').all().map(r => this._mapCR(r));
  }

  _mapCR(r) {
    return {
      id: r.id, projectName: r.project_name || '', crNumber: r.cr_number || '',
      title: r.title || '', requestedBy: r.requested_by || '', receivedDate: r.received_date || '',
      priority: r.priority || '', status: r.status || '', targetDate: r.target_date || '',
      deliveredDate: r.delivered_date || '', deploymentId: r.deployment_id || 0,
      notes: r.notes || '', assignedTo: r.assigned_to || ''
    };
  }

  addChangeRequest(cr) {
    const info = this.db.prepare(
      `INSERT INTO ChangeRequests (project_name, cr_number, title, requested_by, received_date,
       priority, status, target_date, delivered_date, deployment_id, notes, assigned_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(cr.projectName, cr.crNumber, cr.title, cr.requestedBy, cr.receivedDate,
          cr.priority, cr.status, cr.targetDate, cr.deliveredDate, cr.deploymentId || 0,
          cr.notes, cr.assignedTo);
    return { ...cr, id: info.lastInsertRowid };
  }

  saveChangeRequests(projectName, requests) {
    const txn = this.db.transaction(() => {
      this.db.prepare('DELETE FROM ChangeRequests WHERE project_name = ?').run(projectName);
      const ins = this.db.prepare(
        `INSERT INTO ChangeRequests (project_name, cr_number, title, requested_by, received_date,
         priority, status, target_date, delivered_date, deployment_id, notes, assigned_to)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const cr of requests) {
        if (!cr.crNumber && !cr.title) continue;
        ins.run(projectName, cr.crNumber, cr.title, cr.requestedBy, cr.receivedDate,
                cr.priority, cr.status, cr.targetDate, cr.deliveredDate, cr.deploymentId || 0,
                cr.notes, cr.assignedTo);
      }
    });
    txn();
  }

  /* ================================================================
   * DEPLOYMENTS
   * ================================================================ */

  getDeployments(projectName) {
    return this.db.prepare('SELECT * FROM Deployments WHERE project_name = ? ORDER BY id').all(projectName).map(r => this._mapDeploy(r));
  }

  getAllDeployments() {
    return this.db.prepare('SELECT * FROM Deployments ORDER BY project_name COLLATE NOCASE, id').all().map(r => this._mapDeploy(r));
  }

  _mapDeploy(r) {
    return {
      id: r.id, projectName: r.project_name || '', name: r.name || '',
      ritmNumber: r.ritm_number || '', environment: r.environment || '',
      requestedDate: r.requested_date || '', deployedDate: r.deployed_date || '',
      status: r.status || '', requestedBy: r.requested_by || '',
      changeDescription: r.change_description || '', tasksToDeploy: r.tasks_to_deploy || '',
      testLogPath: r.test_log_path || '', codeAnalysisPath: r.code_analysis_path || '',
      codeMovedToTest: r.code_moved_to_test || '', notes: r.notes || ''
    };
  }

  addDeployment(d) {
    const info = this.db.prepare(
      `INSERT INTO Deployments (project_name, name, ritm_number, environment, requested_date,
       deployed_date, status, requested_by, change_description, tasks_to_deploy,
       test_log_path, code_analysis_path, code_moved_to_test, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(d.projectName, d.name, d.ritmNumber, d.environment, d.requestedDate,
          d.deployedDate, d.status, d.requestedBy, d.changeDescription, d.tasksToDeploy,
          d.testLogPath, d.codeAnalysisPath, d.codeMovedToTest, d.notes);
    return { ...d, id: info.lastInsertRowid };
  }

  saveDeployments(projectName, deployments) {
    const txn = this.db.transaction(() => {
      const keepIds = deployments.filter(d => d.id > 0).map(d => d.id);
      if (keepIds.length > 0) {
        this.db.prepare(`DELETE FROM Deployments WHERE project_name = ? AND id NOT IN (${keepIds.join(',')})`).run(projectName);
      } else {
        this.db.prepare('DELETE FROM Deployments WHERE project_name = ?').run(projectName);
      }
      this.db.exec('UPDATE ChangeRequests SET deployment_id = 0 WHERE deployment_id NOT IN (SELECT id FROM Deployments)');

      const upd = this.db.prepare(
        `UPDATE Deployments SET name = ?, ritm_number = ?, environment = ?, requested_date = ?,
         deployed_date = ?, status = ?, requested_by = ?, change_description = ?, tasks_to_deploy = ?,
         test_log_path = ?, code_analysis_path = ?, code_moved_to_test = ?, notes = ? WHERE id = ?`
      );
      const ins = this.db.prepare(
        `INSERT INTO Deployments (project_name, name, ritm_number, environment, requested_date,
         deployed_date, status, requested_by, change_description, tasks_to_deploy,
         test_log_path, code_analysis_path, code_moved_to_test, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (const d of deployments) {
        if (d.id > 0) {
          upd.run(d.name, d.ritmNumber, d.environment, d.requestedDate,
                  d.deployedDate, d.status, d.requestedBy, d.changeDescription, d.tasksToDeploy,
                  d.testLogPath, d.codeAnalysisPath, d.codeMovedToTest, d.notes, d.id);
        } else {
          const info = ins.run(projectName, d.name, d.ritmNumber, d.environment, d.requestedDate,
                               d.deployedDate, d.status, d.requestedBy, d.changeDescription, d.tasksToDeploy,
                               d.testLogPath, d.codeAnalysisPath, d.codeMovedToTest, d.notes);
          d.id = info.lastInsertRowid;
          d.projectName = projectName;
        }
      }
    });
    txn();
  }

  /* ================================================================
   * SERVICE ACCOUNTS
   * ================================================================ */

  getServiceAccounts(projectName) {
    return this.db.prepare('SELECT * FROM ServiceAccounts WHERE project_name = ? ORDER BY id').all(projectName).map(r => this._mapSA(r));
  }

  getAllServiceAccounts() {
    return this.db.prepare('SELECT * FROM ServiceAccounts ORDER BY project_name COLLATE NOCASE, id').all().map(r => this._mapSA(r));
  }

  _mapSA(r) {
    return {
      id: r.id, projectName: r.project_name || '', environment: r.environment || '',
      accountId: r.account_id || '', alias: r.alias || '', appName: r.app_name || '',
      email: r.email || '', description: r.description || ''
    };
  }

  addServiceAccount(sa) {
    const info = this.db.prepare(
      `INSERT INTO ServiceAccounts (project_name, environment, account_id, alias, app_name, email, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(sa.projectName, sa.environment, sa.accountId, sa.alias, sa.appName, sa.email, sa.description);
    return { ...sa, id: info.lastInsertRowid };
  }

  updateServiceAccount(sa) {
    this.db.prepare(
      'UPDATE ServiceAccounts SET environment = ?, account_id = ?, alias = ?, app_name = ?, email = ?, description = ? WHERE id = ?'
    ).run(sa.environment, sa.accountId, sa.alias, sa.appName, sa.email, sa.description, sa.id);
  }

  deleteServiceAccount(id) {
    this.db.prepare('DELETE FROM ServiceAccounts WHERE id = ?').run(id);
  }

  /* ================================================================
   * APPLICATIONS
   * ================================================================ */

  getApplications() {
    return this.db.prepare('SELECT name FROM Applications ORDER BY sort_order, id').all().map(r => r.name || '');
  }

  addApplication(name) {
    if (!name || !name.trim()) return false;
    try {
      const info = this.db.prepare(
        'INSERT OR IGNORE INTO Applications (name, sort_order) VALUES (?, (SELECT IFNULL(MAX(sort_order), 0) + 1 FROM Applications))'
      ).run(name.trim());
      return info.changes > 0;
    } catch (_) { return false; }
  }

  removeApplication(name) {
    this.db.prepare('DELETE FROM Applications WHERE name = ?').run(name);
    this.db.prepare('DELETE FROM ProjectApplications WHERE application_name = ?').run(name);
  }

  getProjectApplications(projectName) {
    return this.db.prepare(
      'SELECT application_name FROM ProjectApplications WHERE project_name = ? ORDER BY application_name COLLATE NOCASE'
    ).all(projectName).map(r => r.application_name || '');
  }

  replaceProjectApplications(projectName, applications) {
    const txn = this.db.transaction(() => {
      this.db.prepare('DELETE FROM ProjectApplications WHERE project_name = ?').run(projectName);
      const ins = this.db.prepare('INSERT OR IGNORE INTO ProjectApplications (project_name, application_name) VALUES (?, ?)');
      for (const app of (applications || [])) {
        ins.run(projectName, app);
      }
    });
    txn();
  }

  getApplicationUsage() {
    return this.db.prepare(
      `SELECT a.name AS application_name, IFNULL(pa.project_name, '') AS project_name
       FROM Applications a LEFT JOIN ProjectApplications pa ON pa.application_name = a.name
       ORDER BY a.sort_order, a.id, pa.project_name COLLATE NOCASE`
    ).all().map(r => ({ applicationName: r.application_name || '', projectName: r.project_name || '' }));
  }

  /* ================================================================
   * DEVELOPERS
   * ================================================================ */

  getDevelopers() {
    return this.db.prepare('SELECT * FROM Developers ORDER BY sort_order, id').all().map(r => ({
      id: r.id, name: r.name || '', empId: r.emp_id || '', email: r.email || '', active: r.active === 1
    }));
  }

  getDeveloperNames() {
    return this.getDevelopers().map(d => d.name);
  }

  addDeveloper(name, empId, email) {
    if (!name || !name.trim()) return false;
    try {
      const info = this.db.prepare(
        `INSERT OR IGNORE INTO Developers (name, emp_id, email, active, sort_order)
         VALUES (?, ?, ?, 1, (SELECT IFNULL(MAX(sort_order), 0) + 1 FROM Developers))`
      ).run(name.trim(), empId || '', email || '');
      return info.changes > 0;
    } catch (_) { return false; }
  }

  updateDeveloper(id, name, empId, email, active) {
    this.db.prepare('UPDATE Developers SET name = ?, emp_id = ?, email = ?, active = ? WHERE id = ?')
      .run(name || '', empId || '', email || '', active ? 1 : 0, id);
  }

  removeDeveloper(name) {
    this.db.prepare('DELETE FROM Developers WHERE name = ?').run(name);
    this.db.prepare('DELETE FROM AdhocItems WHERE developer_name = ?').run(name);
    try {
      this.db.prepare("UPDATE Projects SET assigned_developer = '' WHERE assigned_developer = ?").run(name);
    } catch (_) { /* column may not exist yet */ }
    try {
      this.db.prepare("UPDATE ChangeRequests SET assigned_to = '' WHERE assigned_to = ?").run(name);
    } catch (_) { /* column may not exist yet */ }
  }

  /* ================================================================
   * OWNERSHIP
   * ================================================================ */

  getProjectOwners() {
    try {
      return this.db.prepare(
        "SELECT name, IFNULL(assigned_developer, '') AS owner FROM Projects ORDER BY id"
      ).all().reduce((map, r) => {
        if (r.owner) map[r.name] = r.owner;
        return map;
      }, {});
    } catch (_) { return {}; }
  }

  setProjectOwner(projectName, developerName) {
    try {
      this.db.prepare('UPDATE Projects SET assigned_developer = ? WHERE name = ?').run(developerName || '', projectName);
    } catch (_) { /* ignore */ }
  }

  setChangeRequestOwner(changeRequestId, developerName) {
    try {
      this.db.prepare('UPDATE ChangeRequests SET assigned_to = ? WHERE id = ?').run(developerName || '', changeRequestId);
    } catch (_) { /* ignore */ }
  }

  /* ================================================================
   * ADHOC ITEMS
   * ================================================================ */

  getAdhocItems(developerName) {
    const sql = developerName
      ? 'SELECT * FROM AdhocItems WHERE developer_name = ? ORDER BY id'
      : 'SELECT * FROM AdhocItems ORDER BY developer_name COLLATE NOCASE, id';
    const rows = developerName
      ? this.db.prepare(sql).all(developerName)
      : this.db.prepare(sql).all();
    return rows.map(r => ({
      id: r.id, developerName: r.developer_name || '', title: r.title || '',
      description: r.description || '', status: r.status || '', priority: r.priority || '',
      startDate: r.start_date || '', dueDate: r.due_date || '', completedDate: r.completed_date || ''
    }));
  }

  saveAdhocItems(developerName, items) {
    if (!developerName || !developerName.trim()) return;
    const txn = this.db.transaction(() => {
      this.db.prepare('DELETE FROM AdhocItems WHERE developer_name = ?').run(developerName);
      const ins = this.db.prepare(
        `INSERT INTO AdhocItems (developer_name, title, description, status, priority, start_date, due_date, completed_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const item of items) {
        if (!item.title) continue;
        ins.run(developerName, item.title, item.description, item.status, item.priority,
                item.startDate, item.dueDate, item.completedDate);
      }
    });
    txn();
  }

  /* ================================================================
   * URLS
   * ================================================================ */

  getUrlItems() {
    return this.db.prepare('SELECT category, name, url FROM UrlItems ORDER BY category, sort_order, id')
      .all().map(r => ({ category: r.category || '', name: r.name || '', url: r.url || '' }));
  }

  replaceUrlItems(items) {
    const txn = this.db.transaction(() => {
      this.db.exec('DELETE FROM UrlItems');
      const ins = this.db.prepare('INSERT INTO UrlItems (category, name, url, sort_order) VALUES (?, ?, ?, ?)');
      let order = 0;
      for (const item of items) {
        ins.run(item.category || '', item.name || '', item.url || '', order++);
      }
    });
    txn();
  }

  /* ================================================================
   * SUMMARY
   * ================================================================ */

  getRecordCounts() {
    const tables = [
      ['Projects', 'RPA projects'],
      ['ChangeRequests', 'Change requests'],
      ['Deployments', 'Deployments'],
      ['Developers', 'Developers'],
      ['AdhocItems', 'Adhoc items'],
      ['Applications', 'Applications'],
      ['Tasks', 'Tasks'],
      ['AaActivity', 'AA activity rows']
    ];
    const counts = {};
    for (const [table, label] of tables) {
      try {
        const row = this.db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get();
        counts[label] = row ? row.total : 0;
      } catch (_) { counts[label] = 0; }
    }
    return counts;
  }

  /* ================================================================
   * CLOSE
   * ================================================================ */

  close() {
    if (this.db) this.db.close();
  }
}

module.exports = DatabaseManager;
