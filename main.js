/**
 * main.js — Electron main process.
 * Creates the window, native menu bar, and wires IPC to DatabaseManager.
 */
'use strict';

const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const DatabaseManager = require('./database');

let mainWindow;
let dbManager;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 820,
    minWidth: 1040,
    minHeight: 640,
    title: 'AshApp - RPA Project Manager',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#1a1d23',
    show: false,
  });

  mainWindow.maximize();
  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', () => {
    if (dbManager) dbManager.close();
  });
}

/* ================================================================
 * NATIVE MENU
 * ================================================================ */

function buildMenu() {
  const send = (action, data) => {
    if (mainWindow) mainWindow.webContents.send('menu:action', action, data);
  };

  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New Project...', accelerator: 'CmdOrCtrl+N', click: () => send('newProject') },
        { label: 'Submit Deployment Request...', accelerator: 'CmdOrCtrl+D', click: () => send('submitDeployment') },
        { type: 'separator' },
        { label: 'Exit', click: () => app.quit() }
      ]
    },
    {
      label: 'Change Requests',
      submenu: [
        { label: 'All Change Requests...', click: () => send('allChangeRequests') },
        { type: 'separator' },
        { label: 'Add Change Request...', click: () => send('addChangeRequest') }
      ]
    },
    {
      label: 'Deployments',
      submenu: [
        { label: 'All Deployments...', click: () => send('allDeployments') },
        { type: 'separator' },
        { label: 'Submit Deployment Request...', click: () => send('submitDeployment') }
      ]
    },
    {
      label: 'Service Accounts',
      submenu: [
        { label: 'All Service Accounts...', click: () => send('allServiceAccounts') },
        { type: 'separator' },
        { label: 'Add Service Account...', click: () => send('addServiceAccount') }
      ]
    },
    {
      label: 'URLs',
      submenu: buildUrlsSubmenu()
    },
    {
      label: 'View',
      submenu: [
        { label: 'Bot Run Status', click: () => send('botRunStatus') },
        { label: 'AA Run History (24 hr)', click: () => send('aaRunHistory') },
        { label: 'App Usage', click: () => send('appUsage') },
        { label: 'Workload by Developer', click: () => send('workloadReport') },
        { type: 'separator' },
        { label: 'Settings...', click: () => send('openSettings') },
        {
          label: 'Themes',
          submenu: [
            { label: 'Light', type: 'radio', click: () => send('setTheme', 'LIGHT') },
            { label: 'Blue', type: 'radio', click: () => send('setTheme', 'BLUE') },
            { label: 'Dark', type: 'radio', checked: true, click: () => send('setTheme', 'DARK') },
          ]
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About AshApp', click: () => send('about') }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function buildUrlsSubmenu() {
  if (!dbManager) return [{ label: 'No URLs configured', enabled: false }];
  const items = dbManager.getUrlItems();
  const submenu = [];
  const categories = {};

  for (const item of items) {
    const menuItem = {
      label: item.name,
      click: () => {
        let url = (item.url || '').trim();
        if (url && !/^[a-z][a-z0-9+.\-]*:\/\//i.test(url)) url = 'https://' + url;
        if (url) shell.openExternal(url);
      }
    };

    if (item.category) {
      if (!categories[item.category]) {
        categories[item.category] = { label: item.category, submenu: [] };
        submenu.push(categories[item.category]);
      }
      categories[item.category].submenu.push(menuItem);
    } else {
      submenu.push(menuItem);
    }
  }

  if (submenu.length === 0) {
    submenu.push({ label: 'No URLs configured', enabled: false });
  }

  submenu.push({ type: 'separator' });
  submenu.push({
    label: 'Manage URLs...',
    click: () => { if (mainWindow) mainWindow.webContents.send('menu:action', 'openSettings', 'URLs'); }
  });

  return submenu;
}

/* ================================================================
 * IPC HANDLERS
 * ================================================================ */

function registerIpcHandlers() {
  const db = dbManager;

  // Projects
  ipcMain.handle('db:getProjectNames', () => db.getProjectNames());
  ipcMain.handle('db:addProject', (_, name) => db.addProject(name));
  ipcMain.handle('db:projectExists', (_, name) => db.projectExists(name));

  // Template items
  ipcMain.handle('db:getTemplateItems', () => db.getTemplateItems());
  ipcMain.handle('db:addTemplateItem', (_, name) => db.addTemplateItem(name));
  ipcMain.handle('db:removeTemplateItem', (_, name) => db.removeTemplateItem(name));

  // Template node state
  ipcMain.handle('db:saveNodeState', (_, project, node, selected) => db.saveNodeState(project, node, selected));
  ipcMain.handle('db:isNodeSelected', (_, project, node) => db.isNodeSelected(project, node));

  // Template details
  ipcMain.handle('db:saveTemplateDetails', (_, project, node, date, comments) => db.saveTemplateDetails(project, node, date, comments));
  ipcMain.handle('db:getTemplateDetails', (_, project, node) => db.getTemplateDetails(project, node));

  // Project config
  ipcMain.handle('db:getProjectConfig', (_, project) => db.getProjectConfig(project));
  ipcMain.handle('db:saveProjectConfig', (_, project, dbPath, rq, pq, procq) => db.saveProjectConfig(project, dbPath, rq, pq, procq));
  ipcMain.handle('db:deleteProjectConfig', (_, project) => db.deleteProjectConfig(project));

  // Machines
  ipcMain.handle('db:getMachines', (_, project) => db.getMachines(project));
  ipcMain.handle('db:getAllMachines', () => db.getAllMachines());
  ipcMain.handle('db:replaceMachines', (_, project, machines) => db.replaceMachines(project, machines));

  // Tasks
  ipcMain.handle('db:addTask', (_, desc, date, status) => db.addTask(desc, date, status));
  ipcMain.handle('db:updateTask', (_, id, desc, date, status) => db.updateTask(id, desc, date, status));
  ipcMain.handle('db:getAllTasks', () => db.getAllTasks());

  // Change requests
  ipcMain.handle('db:getChangeRequests', (_, project) => db.getChangeRequests(project));
  ipcMain.handle('db:getAllChangeRequests', () => db.getAllChangeRequests());
  ipcMain.handle('db:addChangeRequest', (_, cr) => db.addChangeRequest(cr));
  ipcMain.handle('db:saveChangeRequests', (_, project, requests) => db.saveChangeRequests(project, requests));

  // Deployments
  ipcMain.handle('db:getDeployments', (_, project) => db.getDeployments(project));
  ipcMain.handle('db:getAllDeployments', () => db.getAllDeployments());
  ipcMain.handle('db:addDeployment', (_, d) => db.addDeployment(d));
  ipcMain.handle('db:saveDeployments', (_, project, deployments) => db.saveDeployments(project, deployments));

  // Service accounts
  ipcMain.handle('db:getServiceAccounts', (_, project) => db.getServiceAccounts(project));
  ipcMain.handle('db:getAllServiceAccounts', () => db.getAllServiceAccounts());
  ipcMain.handle('db:addServiceAccount', (_, sa) => db.addServiceAccount(sa));
  ipcMain.handle('db:updateServiceAccount', (_, sa) => db.updateServiceAccount(sa));
  ipcMain.handle('db:deleteServiceAccount', (_, id) => db.deleteServiceAccount(id));

  // Applications
  ipcMain.handle('db:getApplications', () => db.getApplications());
  ipcMain.handle('db:addApplication', (_, name) => db.addApplication(name));
  ipcMain.handle('db:removeApplication', (_, name) => db.removeApplication(name));
  ipcMain.handle('db:getProjectApplications', (_, project) => db.getProjectApplications(project));
  ipcMain.handle('db:replaceProjectApplications', (_, project, apps) => db.replaceProjectApplications(project, apps));
  ipcMain.handle('db:getApplicationUsage', () => db.getApplicationUsage());

  // Developers
  ipcMain.handle('db:getDevelopers', () => db.getDevelopers());
  ipcMain.handle('db:getDeveloperNames', () => db.getDeveloperNames());
  ipcMain.handle('db:addDeveloper', (_, name, empId, email) => db.addDeveloper(name, empId, email));
  ipcMain.handle('db:updateDeveloper', (_, id, name, empId, email, active) => db.updateDeveloper(id, name, empId, email, active));
  ipcMain.handle('db:removeDeveloper', (_, name) => db.removeDeveloper(name));

  // Ownership
  ipcMain.handle('db:getProjectOwners', () => db.getProjectOwners());
  ipcMain.handle('db:setProjectOwner', (_, project, dev) => db.setProjectOwner(project, dev));
  ipcMain.handle('db:setChangeRequestOwner', (_, crId, dev) => db.setChangeRequestOwner(crId, dev));

  // Adhoc items
  ipcMain.handle('db:getAdhocItems', (_, dev) => db.getAdhocItems(dev));
  ipcMain.handle('db:saveAdhocItems', (_, dev, items) => db.saveAdhocItems(dev, items));

  // URLs
  ipcMain.handle('db:getUrlItems', () => db.getUrlItems());
  ipcMain.handle('db:replaceUrlItems', (_, items) => { db.replaceUrlItems(items); buildMenu(); });

  // Settings
  ipcMain.handle('db:getSetting', (_, key, defaultValue) => db.getSetting(key, defaultValue));
  ipcMain.handle('db:setSetting', (_, key, value) => db.setSetting(key, value));

  // Summary
  ipcMain.handle('db:getRecordCounts', () => db.getRecordCounts());

  // App actions
  ipcMain.handle('app:openExternal', (_, url) => {
    let target = (url || '').trim();
    if (target && !/^[a-z][a-z0-9+.\-]*:\/\//i.test(target)) target = 'https://' + target;
    if (target) shell.openExternal(target);
  });

  ipcMain.handle('app:showFilePicker', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Database Files', extensions: ['db', 'sqlite', 'accdb', 'mdb'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Theme
  ipcMain.handle('theme:set', (_, theme) => {
    db.setSetting('ui.theme', theme);
    if (mainWindow) mainWindow.webContents.send('theme:changed', theme);
  });
}

/* ================================================================
 * APP LIFECYCLE
 * ================================================================ */

app.whenReady().then(() => {
  dbManager = new DatabaseManager();
  registerIpcHandlers();
  buildMenu();
  createWindow();
});

app.on('window-all-closed', () => {
  if (dbManager) dbManager.close();
  app.quit();
});
