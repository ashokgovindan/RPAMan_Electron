/**
 * preload.js — Secure bridge between renderer and main process.
 * Exposes a typed API surface via contextBridge.
 */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Projects
  getProjectNames: () => ipcRenderer.invoke('db:getProjectNames'),
  addProject: (name) => ipcRenderer.invoke('db:addProject', name),
  projectExists: (name) => ipcRenderer.invoke('db:projectExists', name),

  // Template items (global)
  getTemplateItems: () => ipcRenderer.invoke('db:getTemplateItems'),
  addTemplateItem: (name) => ipcRenderer.invoke('db:addTemplateItem', name),
  removeTemplateItem: (name) => ipcRenderer.invoke('db:removeTemplateItem', name),

  // Template node state
  saveNodeState: (project, node, selected) => ipcRenderer.invoke('db:saveNodeState', project, node, selected),
  isNodeSelected: (project, node) => ipcRenderer.invoke('db:isNodeSelected', project, node),

  // Template details
  saveTemplateDetails: (project, node, date, comments) => ipcRenderer.invoke('db:saveTemplateDetails', project, node, date, comments),
  getTemplateDetails: (project, node) => ipcRenderer.invoke('db:getTemplateDetails', project, node),

  // Project config
  getProjectConfig: (project) => ipcRenderer.invoke('db:getProjectConfig', project),
  saveProjectConfig: (project, dbPath, rq, pq, procq) => ipcRenderer.invoke('db:saveProjectConfig', project, dbPath, rq, pq, procq),
  deleteProjectConfig: (project) => ipcRenderer.invoke('db:deleteProjectConfig', project),

  // Machines
  getMachines: (project) => ipcRenderer.invoke('db:getMachines', project),
  getAllMachines: () => ipcRenderer.invoke('db:getAllMachines'),
  replaceMachines: (project, machines) => ipcRenderer.invoke('db:replaceMachines', project, machines),

  // Tasks
  addTask: (desc, date, status) => ipcRenderer.invoke('db:addTask', desc, date, status),
  updateTask: (id, desc, date, status) => ipcRenderer.invoke('db:updateTask', id, desc, date, status),
  getAllTasks: () => ipcRenderer.invoke('db:getAllTasks'),

  // Change requests
  getChangeRequests: (project) => ipcRenderer.invoke('db:getChangeRequests', project),
  getAllChangeRequests: () => ipcRenderer.invoke('db:getAllChangeRequests'),
  addChangeRequest: (cr) => ipcRenderer.invoke('db:addChangeRequest', cr),
  saveChangeRequests: (project, requests) => ipcRenderer.invoke('db:saveChangeRequests', project, requests),

  // Deployments
  getDeployments: (project) => ipcRenderer.invoke('db:getDeployments', project),
  getAllDeployments: () => ipcRenderer.invoke('db:getAllDeployments'),
  addDeployment: (d) => ipcRenderer.invoke('db:addDeployment', d),
  saveDeployments: (project, deployments) => ipcRenderer.invoke('db:saveDeployments', project, deployments),

  // Service accounts
  getServiceAccounts: (project) => ipcRenderer.invoke('db:getServiceAccounts', project),
  getAllServiceAccounts: () => ipcRenderer.invoke('db:getAllServiceAccounts'),
  addServiceAccount: (sa) => ipcRenderer.invoke('db:addServiceAccount', sa),
  updateServiceAccount: (sa) => ipcRenderer.invoke('db:updateServiceAccount', sa),
  deleteServiceAccount: (id) => ipcRenderer.invoke('db:deleteServiceAccount', id),

  // Applications
  getApplications: () => ipcRenderer.invoke('db:getApplications'),
  addApplication: (name) => ipcRenderer.invoke('db:addApplication', name),
  removeApplication: (name) => ipcRenderer.invoke('db:removeApplication', name),
  getProjectApplications: (project) => ipcRenderer.invoke('db:getProjectApplications', project),
  replaceProjectApplications: (project, apps) => ipcRenderer.invoke('db:replaceProjectApplications', project, apps),
  getApplicationUsage: () => ipcRenderer.invoke('db:getApplicationUsage'),

  // Developers
  getDevelopers: () => ipcRenderer.invoke('db:getDevelopers'),
  getDeveloperNames: () => ipcRenderer.invoke('db:getDeveloperNames'),
  addDeveloper: (name, empId, email) => ipcRenderer.invoke('db:addDeveloper', name, empId, email),
  updateDeveloper: (id, name, empId, email, active) => ipcRenderer.invoke('db:updateDeveloper', id, name, empId, email, active),
  removeDeveloper: (name) => ipcRenderer.invoke('db:removeDeveloper', name),

  // Ownership
  getProjectOwners: () => ipcRenderer.invoke('db:getProjectOwners'),
  setProjectOwner: (project, dev) => ipcRenderer.invoke('db:setProjectOwner', project, dev),
  setChangeRequestOwner: (crId, dev) => ipcRenderer.invoke('db:setChangeRequestOwner', crId, dev),

  // Adhoc items
  getAdhocItems: (dev) => ipcRenderer.invoke('db:getAdhocItems', dev),
  saveAdhocItems: (dev, items) => ipcRenderer.invoke('db:saveAdhocItems', dev, items),

  // URLs
  getUrlItems: () => ipcRenderer.invoke('db:getUrlItems'),
  replaceUrlItems: (items) => ipcRenderer.invoke('db:replaceUrlItems', items),

  // Settings
  getSetting: (key, defaultValue) => ipcRenderer.invoke('db:getSetting', key, defaultValue),
  setSetting: (key, value) => ipcRenderer.invoke('db:setSetting', key, value),

  // Summary
  getRecordCounts: () => ipcRenderer.invoke('db:getRecordCounts'),

  // App actions
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  showFilePicker: () => ipcRenderer.invoke('app:showFilePicker'),

  // Theme
  onThemeChange: (callback) => ipcRenderer.on('theme:changed', (_, theme) => callback(theme)),
  setTheme: (theme) => ipcRenderer.invoke('theme:set', theme),

  // Menu events
  onMenuAction: (callback) => ipcRenderer.on('menu:action', (_, action, data) => callback(action, data)),
});
