/**
 * renderer.js — Main renderer orchestrator.
 * Initialises all views, handles navigation, theme switching, resize handles,
 * and menu action routing.
 */
'use strict';

(async () => {

  /* ================================================================
   * THEME INITIALISATION
   * ================================================================ */

  const savedTheme = await window.api.getSetting('ui.theme', 'DARK');
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Listen for theme changes from main process
  window.api.onThemeChange((theme) => {
    document.documentElement.setAttribute('data-theme', theme);
  });

  /* ================================================================
   * INIT VIEWS
   * ================================================================ */

  // Sidebar: project tree with navigation callback
  await Sidebar.init(async (type, projectName, detail) => {
    switch (type) {
      case 'project':
        CenterView.showDatabaseConfig(projectName);
        break;
      case 'template':
        CenterView.showTemplateDetails(projectName, detail);
        break;
      case 'section':
        if (detail === 'CHANGE_REQUESTS') CenterView.showChangeRequests(projectName);
        else if (detail === 'DEPLOYMENTS') CenterView.showDeployments(projectName);
        else if (detail === 'SERVICE_ACCOUNTS') CenterView.showServiceAccounts(projectName);
        break;
    }
  });

  // Tasks (right pane)
  await Tasks.init();

  // Show default center view
  CenterView.showDefault();

  /* ================================================================
   * MENU ACTION ROUTING
   * ================================================================ */

  window.api.onMenuAction(async (action, data) => {
    switch (action) {
      case 'newProject':
        Dialogs.showNewProjectDialog(async (name) => {
          await Sidebar.reload();
          Sidebar.selectProject(name);
          CenterView.showDatabaseConfig(name);
        });
        break;

      case 'submitDeployment': {
        const projects = await window.api.getProjectNames();
        if (projects.length === 0) { alert('Create a project first.'); break; }
        // If a project is loaded in center, use that
        const defaultProject = projects[0];
        Dialogs.showDeploymentForm(defaultProject, null, () => {
          CenterView.showDeployments(defaultProject);
        });
        break;
      }

      case 'allChangeRequests':
        Dialogs.showAllChangeRequests();
        break;

      case 'addChangeRequest': {
        const projects = await window.api.getProjectNames();
        if (projects.length === 0) { alert('Create a project first.'); break; }
        Dialogs.showChangeRequestForm(projects[0], null, () => {});
        break;
      }

      case 'allDeployments':
        Dialogs.showAllDeployments();
        break;

      case 'allServiceAccounts':
        Dialogs.showAllServiceAccounts();
        break;

      case 'addServiceAccount': {
        const projects = await window.api.getProjectNames();
        if (projects.length === 0) { alert('Create a project first.'); break; }
        Dialogs.showServiceAccountForm(projects[0], null, () => {});
        break;
      }

      case 'botRunStatus':
        // placeholder — bot run status requires external DB queries
        alert('Bot Run Status: This feature queries external databases configured per-project.');
        break;

      case 'aaRunHistory':
        alert('AA Run History: This feature queries the Automation Anywhere API.');
        break;

      case 'appUsage':
        Dialogs.showAppUsage();
        break;

      case 'workloadReport':
        Dialogs.showWorkloadReport();
        break;

      case 'openSettings':
        Dialogs.showSettings(data === 'URLs' ? 'urls' : null);
        break;

      case 'setTheme':
        document.documentElement.setAttribute('data-theme', data);
        await window.api.setSetting('ui.theme', data);
        break;

      case 'about':
        Dialogs.showAbout();
        break;
    }
  });

  /* ================================================================
   * RESIZE HANDLES
   * ================================================================ */

  setupResize('resize-left', 'sidebar', true);
  setupResize('resize-right', 'right-pane', false);

  function setupResize(handleId, paneId, isLeft) {
    const handle = document.getElementById(handleId);
    const pane = document.getElementById(paneId);
    if (!handle || !pane) return;

    let startX, startWidth;

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startX = e.clientX;
      startWidth = pane.getBoundingClientRect().width;
      handle.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMove = (e) => {
        const delta = isLeft ? (e.clientX - startX) : (startX - e.clientX);
        const newWidth = Math.max(200, Math.min(500, startWidth + delta));
        pane.style.width = newWidth + 'px';
      };

      const onUp = () => {
        handle.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

})();
