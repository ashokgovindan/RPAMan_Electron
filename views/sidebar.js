/**
 * sidebar.js — Project tree with checkboxes, search, and section nodes.
 */
'use strict';

const Sidebar = (() => {
  let projectNames = [];
  let templateNodes = [];
  let treeFilter = '';
  let expandedProjects = new Set();
  let selectedPath = null; // { project, node?, section? }
  let onSelect = null;

  const SECTIONS = [
    { kind: 'CHANGE_REQUESTS', label: 'Change Requests', icon: 'inbox' },
    { kind: 'DEPLOYMENTS', label: 'Deployments', icon: 'upload' },
    { kind: 'SERVICE_ACCOUNTS', label: 'Service Accounts', icon: 'key' }
  ];

  function svgIcon(name, size = 14) {
    const icons = {
      folder: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`,
      inbox: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
      upload: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>`,
      key: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
    };
    return icons[name] || '';
  }

  async function init(selectCallback) {
    onSelect = selectCallback;
    await reload();

    document.getElementById('project-search').addEventListener('input', (e) => {
      treeFilter = e.target.value.trim().toLowerCase();
      renderTree();
    });

    document.getElementById('btn-expand-all').addEventListener('click', () => {
      projectNames.forEach(name => expandedProjects.add(name));
      renderTree();
    });

    document.getElementById('btn-collapse-all').addEventListener('click', () => {
      expandedProjects.clear();
      renderTree();
    });
  }

  async function reload() {
    projectNames = await window.api.getProjectNames();
    templateNodes = await window.api.getTemplateItems();
    // Expand all by default on first load
    if (expandedProjects.size === 0) {
      projectNames.forEach(name => expandedProjects.add(name));
    }
    renderTree();
  }

  async function renderTree() {
    const container = document.getElementById('project-tree');
    container.innerHTML = '';

    const query = treeFilter;

    for (const projectName of projectNames) {
      const projectMatches = !query || projectName.toLowerCase().includes(query);

      const visibleNodes = templateNodes.filter(n =>
        projectMatches || n.toLowerCase().includes(query)
      );

      const sectionMatches = SECTIONS.some(s =>
        s.label.toLowerCase().includes(query)
      );

      if (!projectMatches && visibleNodes.length === 0 && !sectionMatches) continue;

      const projectEl = document.createElement('div');
      projectEl.className = 'tree-project';

      const isExpanded = expandedProjects.has(projectName);
      const isProjectSelected = selectedPath && selectedPath.project === projectName && !selectedPath.node && !selectedPath.section;

      // Project header
      const header = document.createElement('div');
      header.className = 'tree-project-header' + (isProjectSelected ? ' selected' : '');
      header.innerHTML = `
        <span class="chevron ${isExpanded ? 'expanded' : ''}">▶</span>
        ${svgIcon('folder', 15)}
        <span style="flex:1; overflow:hidden; text-overflow:ellipsis;">${escHtml(projectName)}</span>
      `;

      header.addEventListener('click', (e) => {
        // Toggle expand
        if (isExpanded) expandedProjects.delete(projectName);
        else expandedProjects.add(projectName);

        // Select project
        selectedPath = { project: projectName };
        if (onSelect) onSelect('project', projectName);
        renderTree();
      });

      projectEl.appendChild(header);

      // Children container
      const childContainer = document.createElement('div');
      childContainer.className = 'tree-children' + (isExpanded ? '' : ' collapsed');
      if (isExpanded) childContainer.style.maxHeight = ((visibleNodes.length + SECTIONS.length) * 32 + 10) + 'px';

      // Template nodes
      for (const nodeName of visibleNodes) {
        const isChecked = await window.api.isNodeSelected(projectName, nodeName);
        const isNodeSelected = selectedPath && selectedPath.project === projectName && selectedPath.node === nodeName;

        const nodeEl = document.createElement('div');
        nodeEl.className = 'tree-node' + (isNodeSelected ? ' selected' : '');

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = isChecked;
        cb.addEventListener('click', async (e) => {
          e.stopPropagation();
          await window.api.saveNodeState(projectName, nodeName, cb.checked);
        });

        const label = document.createElement('span');
        label.textContent = nodeName;
        label.style.cssText = 'flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';

        nodeEl.appendChild(cb);
        nodeEl.appendChild(label);

        nodeEl.addEventListener('click', () => {
          selectedPath = { project: projectName, node: nodeName };
          if (onSelect) onSelect('template', projectName, nodeName);
          renderTree();
        });

        childContainer.appendChild(nodeEl);
      }

      // Section nodes
      for (const section of SECTIONS) {
        if (!projectMatches && !section.label.toLowerCase().includes(query)) continue;

        const isSectionSelected = selectedPath && selectedPath.project === projectName && selectedPath.section === section.kind;

        const sectionEl = document.createElement('div');
        sectionEl.className = 'tree-section' + (isSectionSelected ? ' selected' : '');
        sectionEl.innerHTML = `${svgIcon(section.icon, 12)} ${section.label}`;

        sectionEl.addEventListener('click', () => {
          selectedPath = { project: projectName, section: section.kind };
          if (onSelect) onSelect('section', projectName, section.kind);
          renderTree();
        });

        childContainer.appendChild(sectionEl);
      }

      projectEl.appendChild(childContainer);
      container.appendChild(projectEl);
    }
  }

  function selectProject(projectName) {
    selectedPath = { project: projectName };
    expandedProjects.add(projectName);
    renderTree();
  }

  function escHtml(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  return { init, reload, selectProject };
})();
