import { PanoramaViewer } from './viewer360.js';

const state = {
  id: null,
  name: '',
  description: '',
  floorPlan: null,
  panoramas: [],
  activePanoramaId: null,
  mode: 'view',
  workspaceEnabled: false
};

const selectors = {
  projectName: document.getElementById('project-name'),
  projectDescription: document.getElementById('project-description'),
  floorPlanInput: document.getElementById('floor-plan'),
  panoramaInput: document.getElementById('panorama-files'),
  startConfig: document.getElementById('start-config'),
  projectList: document.getElementById('project-list'),
  workspaceSection: document.getElementById('workspace-section'),
  floorPlanCanvas: document.getElementById('workspace-floor-plan'),
  floorPlanPreview: document.getElementById('floor-plan-preview'),
  panoramaStrip: document.getElementById('panorama-strip'),
  workspaceViewer: document.getElementById('workspace-viewer'),
  workspaceHint: document.getElementById('workspace-hint'),
  modeButtons: document.querySelectorAll('[data-mode]'),
  markerSummary: document.getElementById('marker-summary'),
  hotspotList: document.getElementById('workspace-hotspot-list'),
  publishSection: document.getElementById('publish-section'),
  publishReview: document.getElementById('project-review'),
  publishButton: document.getElementById('publish-project'),
  headerProject: document.getElementById('header-project')
};

let workspaceViewer = null;

function allPanoramasPositioned() {
  return state.panoramas.length > 0 && state.panoramas.every(p => p.floorPosition);
}

function updateWorkflowVisibility() {
  const hasEssentials = Boolean(state.name && state.floorPlan && state.panoramas.length);
  if (selectors.workspaceSection) {
    selectors.workspaceSection.style.display = hasEssentials && state.workspaceEnabled ? 'block' : 'none';
  }
  if (selectors.publishSection) {
    if (hasEssentials && state.workspaceEnabled) {
      // keep current visibility (may be controlled by startConfig)
    } else {
      selectors.publishSection.style.display = 'none';
      selectors.publishReview.innerHTML = '';
    }
  }
}

function focusPanorama(panoramaId, { scrollToFloor = false } = {}) {
  if (!panoramaId) return;
  const panorama = state.panoramas.find(p => p.id === panoramaId);
  if (!panorama) return;
  state.activePanoramaId = panoramaId;
  showWorkspacePanorama(panorama);
  highlightActivePanorama();
  renderHotspotList(panoramaId);
  if (scrollToFloor && selectors.floorPlanCanvas) {
    selectors.floorPlanCanvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

async function showWorkspacePanorama(panorama) {
  if (!selectors.workspaceViewer || !panorama) return;
  try {
    if (!workspaceViewer) {
      workspaceViewer = new PanoramaViewer(selectors.workspaceViewer, {
        markerInteraction: false,
        onClick: ({ yaw, pitch }) => handleWorkspaceClick(yaw, pitch)
      });
    }
    await workspaceViewer.setPanorama(panorama.dataUrl);
    if (workspaceViewer) {
      workspaceViewer.setMarkers((panorama.hotspots || []).map(mapHotspotToMarker));
    }
  } catch (error) {
    console.warn('Não foi possível carregar o panorama selecionado.', error);
  }
}

function setMode(mode) {
  state.mode = mode;
  selectors.modeButtons.forEach(button => {
    const isActive = button.dataset.mode === mode;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive);
  });
  updateWorkspaceHint();
}

function updateWorkspaceHint() {
  if (!selectors.workspaceHint) return;
  if (!state.panoramas.length) {
    selectors.workspaceHint.textContent = 'Adicione panoramas para começar a edição.';
    return;
  }
  if (state.mode === 'hotspot') {
    selectors.workspaceHint.textContent = 'Clique no panorama para posicionar o hotspot e depois escolha a imagem de destino.';
  } else {
    selectors.workspaceHint.textContent = 'Use o mouse para navegar. Clique na planta para definir a posição do panorama ativo.';
  }
}

function highlightActivePanorama() {
  const activeId = state.activePanoramaId;
  if (selectors.panoramaStrip) {
    selectors.panoramaStrip
      .querySelectorAll('.panorama-chip')
      .forEach(button => button.classList.toggle('is-active', button.dataset.panoramaId === activeId));
  }
  if (selectors.floorPlanCanvas) {
    selectors.floorPlanCanvas
      .querySelectorAll('.marker')
      .forEach(marker => marker.classList.toggle('active', marker.dataset.panoramaId === activeId));
  }
}

function mapHotspotToMarker(hotspot, index) {
  const destination = state.panoramas.find(p => p.id === hotspot.targetPanoramaId);
  return {
    id: hotspot.id,
    yaw: hotspot.yaw,
    pitch: hotspot.pitch,
    label: String((index ?? 0) + 1),
    tooltip: destination ? `Vai para ${destination.name || destination.filename}` : 'Selecione o destino'
  };
}

function renderHotspotList(panoramaId) {
  if (!selectors.hotspotList) return;
  selectors.hotspotList.innerHTML = '';
  const panorama = state.panoramas.find(p => p.id === panoramaId);
  if (!panorama) {
    selectors.hotspotList.innerHTML = '<p class="muted">Selecione um panorama para ver os hotspots.</p>';
    return;
  }

  panorama.hotspots = panorama.hotspots.map(normaliseHotspotAngles);

  if (!panorama.hotspots.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Nenhum hotspot criado ainda. Clique em “Adicionar hotspot” e depois na imagem 360º.';
    selectors.hotspotList.appendChild(empty);
  }

  panorama.hotspots.forEach((hotspot, index) => {
    const item = document.createElement('div');
    item.className = 'hotspot-item';

    const info = document.createElement('div');
    info.className = 'hotspot-info';
    const angles = formatAngles(hotspot);
    const destination = state.panoramas.find(p => p.id === hotspot.targetPanoramaId);
    info.innerHTML = `
      <strong>${index + 1}.</strong>
      <span>${destination ? destination.name || destination.filename : 'Selecione o destino'}</span>
      <small class="muted">Yaw ${angles.yaw} • Pitch ${angles.pitch}</small>
    `;

    const select = document.createElement('select');
    select.className = 'hotspot-select';
    state.panoramas.forEach(p => {
      if (p.id === panorama.id) return;
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = p.name || p.filename;
      if (p.id === hotspot.targetPanoramaId) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener('change', () => {
      hotspot.targetPanoramaId = select.value;
      if (workspaceViewer) {
        workspaceViewer.setMarkers(panorama.hotspots.map((h, idx) => mapHotspotToMarker(h, idx)));
      }
      renderHotspotList(panoramaId);
      showPublishStep();
    });

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'secondary-button';
    removeButton.textContent = 'Remover';
    removeButton.addEventListener('click', () => {
      panorama.hotspots = panorama.hotspots.filter(h => h.id !== hotspot.id);
      if (workspaceViewer) {
        workspaceViewer.setMarkers(panorama.hotspots.map((h, idx) => mapHotspotToMarker(h, idx)));
      }
      renderHotspotList(panoramaId);
      showPublishStep();
    });

    const actions = document.createElement('div');
    actions.className = 'hotspot-actions';
    actions.appendChild(select);
    actions.appendChild(removeButton);

    item.appendChild(info);
    item.appendChild(actions);
    selectors.hotspotList.appendChild(item);
  });

  if (workspaceViewer) {
    workspaceViewer.setMarkers(panorama.hotspots.map((hotspot, index) => mapHotspotToMarker(hotspot, index)));
  }
}

function handleWorkspaceClick(yaw, pitch) {
  if (state.mode !== 'hotspot') return;
  const panoramaId = state.activePanoramaId;
  if (!panoramaId) return;
  const panorama = state.panoramas.find(p => p.id === panoramaId);
  if (!panorama) return;
  const possibleTargets = state.panoramas.filter(p => p.id !== panoramaId);
  if (!possibleTargets.length) {
    alert('Cadastre pelo menos dois panoramas para criar hotspots.');
    setMode('view');
    return;
  }

  const { x, y } = yawPitchToPercent(yaw, pitch);
  const newHotspot = normaliseHotspotAngles({
    id: generateLocalId('hotspot'),
    x,
    y,
    targetPanoramaId: possibleTargets[0].id,
    yaw,
    pitch
  });
  panorama.hotspots.push(newHotspot);
  if (workspaceViewer) {
    workspaceViewer.setMarkers(panorama.hotspots.map((hotspot, index) => mapHotspotToMarker(hotspot, index)));
  }
  renderHotspotList(panoramaId);
  refreshPanoramaList();
  showPublishStep();
  setMode('view');
}

function yawPitchToPercent(yaw, pitch) {
  const normalizedYaw = ((yaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const x = (normalizedYaw / (2 * Math.PI)) * 100;
  const clampedPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
  const y = ((Math.PI / 2 - clampedPitch) / Math.PI) * 100;
  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2))
  };
}

function percentToYawPitch(x, y) {
  if (typeof x !== 'number' || typeof y !== 'number') {
    return { yaw: 0, pitch: 0 };
  }
  const yaw = ((x / 100) * 2 * Math.PI) - Math.PI;
  const pitch = Math.PI / 2 - (y / 100) * Math.PI;
  return { yaw, pitch };
}

function normaliseHotspotAngles(hotspot) {
  if (typeof hotspot.yaw === 'number' && typeof hotspot.pitch === 'number') {
    return hotspot;
  }
  const { yaw, pitch } = percentToYawPitch(hotspot.x, hotspot.y);
  return {
    ...hotspot,
    yaw,
    pitch
  };
}

function formatAngles(hotspot) {
  return {
    yaw: `${(hotspot.yaw * (180 / Math.PI)).toFixed(1)}º`,
    pitch: `${(hotspot.pitch * (180 / Math.PI)).toFixed(1)}º`
  };
}

function generateLocalId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function resetWorkflow() {
  if (selectors.workspaceSection) {
    selectors.workspaceSection.style.display = 'none';
  }
  if (selectors.publishSection) {
    selectors.publishSection.style.display = 'none';
  }
  selectors.publishReview.innerHTML = '';
  state.activePanoramaId = null;
  state.mode = 'view';
  state.workspaceEnabled = false;
  if (workspaceViewer) {
    workspaceViewer.setMarkers([]);
  }
  setMode('view');
  updateWorkspaceHint();
  if (selectors.panoramaStrip) {
    selectors.panoramaStrip.innerHTML = '';
  }
  if (selectors.hotspotList) {
    selectors.hotspotList.innerHTML = '';
  }
}

function updateHeaderProject(name = 'Studio Panorama') {
  selectors.headerProject.textContent = name;
}

function refreshPanoramaList() {
  if (!selectors.panoramaStrip) return;
  selectors.panoramaStrip.innerHTML = '';
  if (!state.panoramas.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Adicione panoramas para iniciar o posicionamento.';
    selectors.panoramaStrip.appendChild(empty);
    updateWorkspaceHint();
    updateWorkflowVisibility();
    return;
  }

  state.panoramas.forEach((panorama, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'panorama-chip';
    button.dataset.panoramaId = panorama.id;
    const hasPosition = Boolean(panorama.floorPosition);
    const hasHotspots = panorama.hotspots.length > 0;
    button.innerHTML = `
      <span class="chip-index">${index + 1}</span>
      <span class="chip-name">${panorama.name || panorama.filename}</span>
      <span class="chip-status ${hasPosition ? 'is-ready' : 'is-pending'}">${hasPosition ? 'Na planta' : 'Sem posição'}</span>
      <span class="chip-status ${hasHotspots ? 'is-ready' : 'is-pending'}">${panorama.hotspots.length} hotspot${panorama.hotspots.length === 1 ? '' : 's'}</span>
    `;
    button.addEventListener('click', () => focusPanorama(panorama.id));
    selectors.panoramaStrip.appendChild(button);
  });

  highlightActivePanorama();
  updateWorkspaceHint();
  updateWorkflowVisibility();
}

function renderMarkers() {
  if (!selectors.floorPlanCanvas) return;
  selectors.floorPlanCanvas.querySelectorAll('.marker').forEach(marker => marker.remove());
  state.panoramas.forEach((panorama, index) => {
    if (!panorama.floorPosition) return;
    const marker = document.createElement('div');
    marker.className = 'marker';
    marker.textContent = index + 1;
    marker.style.left = `${panorama.floorPosition.x}%`;
    marker.style.top = `${panorama.floorPosition.y}%`;
    marker.title = panorama.name || panorama.filename;
    marker.dataset.panoramaId = panorama.id;
    if (state.activePanoramaId === panorama.id) {
      marker.classList.add('active');
    }
    marker.addEventListener('click', event => {
      event.stopPropagation();
      focusPanorama(panorama.id);
    });
    selectors.floorPlanCanvas.appendChild(marker);
  });

  selectors.markerSummary.innerHTML = '';
  if (!state.panoramas.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Sem panoramas carregados ainda.';
    selectors.markerSummary.appendChild(empty);
  } else {
    state.panoramas.forEach((panorama, index) => {
      const summaryItem = document.createElement('div');
      summaryItem.className = 'summary-item';
      const hasPosition = Boolean(panorama.floorPosition);
      summaryItem.innerHTML = `
        <span class="summary-index">${index + 1}</span>
        <span class="summary-name">${panorama.name || panorama.filename}</span>
        <span class="summary-status ${hasPosition ? 'is-ready' : 'is-pending'}">${hasPosition ? 'Posicionado' : 'Pendente'}</span>
      `;
      selectors.markerSummary.appendChild(summaryItem);
    });
  }

  updateWorkflowVisibility();
}

function showPublishStep() {
  selectors.publishSection.style.display = 'block';
  const missingMarkers = state.panoramas.filter(p => !p.floorPosition).length;
  const missingHotspots = state.panoramas.some(p => p.hotspots.length === 0);

  selectors.publishReview.innerHTML = `
    <h3>${state.name}</h3>
    <p>${state.description || 'Sem descrição'}</p>
    <p><strong>${state.panoramas.length}</strong> panoramas cadastrados.</p>
    <p>${missingMarkers ? `<span class="badge" style="background: rgba(253,137,255,0.25); color: var(--brand-indigo);">${missingMarkers} panoramas sem posição</span>` : 'Todas as câmeras posicionadas na planta.'}</p>
    <p>${missingHotspots ? '<span class="badge" style="background: rgba(253,137,255,0.25); color: var(--brand-indigo);">Existem panoramas sem hotspot</span>' : 'Hotspots configurados.'}</p>
  `;
  selectors.publishButton.disabled = Boolean(missingMarkers || missingHotspots);
}

function renderProjectList(projects) {
  selectors.projectList.innerHTML = '';
  if (!projects.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Nenhum projeto criado ainda.';
    selectors.projectList.appendChild(empty);
    return;
  }

  projects.forEach(project => {
    const item = document.createElement('div');
    item.className = 'card';
    item.style.padding = '12px 16px';
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
        <div>
          <strong>${project.name}</strong><br />
          <small>${new Date(project.updatedAt || project.createdAt).toLocaleString('pt-BR')}</small>
        </div>
        <div class="links">
          <a href="/projects/${project.id}">Abrir tour</a>
          <button data-load="${project.id}" style="background: rgba(0,255,203,0.75); color: var(--brand-teal);">Editar</button>
        </div>
      </div>
    `;
    item.querySelector('button').addEventListener('click', () => loadProject(project.id));
    selectors.projectList.appendChild(item);
  });
}

async function fetchProjects() {
  try {
    const response = await fetch('/api/projects');
    const data = await response.json();
    renderProjectList(data);
  } catch (error) {
    selectors.projectList.innerHTML = '<p>Não foi possível carregar os projetos.</p>';
  }
}

function ensureWorkflowReady() {
  if (!state.name || !state.floorPlan || !state.panoramas.length) {
    alert('Informe nome, planta e ao menos um panorama.');
    return false;
  }
  return true;
}

function prepareCanvas() {
  selectors.floorPlanPreview.src = state.floorPlan?.dataUrl || '';
  selectors.floorPlanPreview.style.display = state.floorPlan ? 'block' : 'none';
  refreshPanoramaList();
  const activeId = state.activePanoramaId || state.panoramas[0]?.id;
  if (activeId) {
    focusPanorama(activeId);
  } else if (workspaceViewer) {
    workspaceViewer.setMarkers([]);
  }
  renderMarkers();
  updateWorkspaceHint();
}

function hydrateStateFromProject(project) {
  state.id = project.id;
  state.name = project.name;
  state.description = project.description || '';
  state.floorPlan = project.floorPlan;
  state.panoramas = project.panoramas.map(p => ({
    ...p,
    floorPosition: p.floorPosition || null,
    hotspots: Array.isArray(p.hotspots) ? p.hotspots.map(normaliseHotspotAngles) : []
  }));
  state.activePanoramaId = state.panoramas[0]?.id || null;
  state.workspaceEnabled = true;

  selectors.projectName.value = state.name;
  selectors.projectDescription.value = state.description;
  updateHeaderProject(state.name);
  prepareCanvas();
  updateWorkflowVisibility();
  if (selectors.workspaceSection) {
    selectors.workspaceSection.style.display = 'block';
  }
  if (selectors.publishSection) {
    selectors.publishSection.style.display = 'block';
  }
  showPublishStep();
}

async function loadProject(projectId) {
  try {
    const response = await fetch(`/api/projects/${projectId}`);
    if (!response.ok) throw new Error('Erro ao carregar projeto.');
    const project = await response.json();
    resetWorkflow();
    hydrateStateFromProject(project);
  } catch (error) {
    alert('Não foi possível carregar o projeto selecionado.');
  }
}

selectors.projectName.addEventListener('input', event => {
  state.name = event.target.value.trim();
  updateHeaderProject(state.name || 'Studio Panorama');
});

selectors.projectDescription.addEventListener('input', event => {
  state.description = event.target.value;
});

selectors.floorPlanInput.addEventListener('change', async event => {
  const [file] = event.target.files;
  if (!file) return;
  const dataUrl = await fileToDataUrl(file);
  state.floorPlan = {
    filename: file.name,
    dataUrl
  };
  selectors.floorPlanPreview.src = dataUrl;
  prepareCanvas();
  updateWorkflowVisibility();
});

selectors.panoramaInput.addEventListener('change', async event => {
  const files = Array.from(event.target.files || []);
  for (const file of files) {
    const dataUrl = await fileToDataUrl(file);
    state.panoramas.push({
      id: generateLocalId('panorama'),
      filename: file.name,
      name: file.name.replace(/\.[^.]+$/, ''),
      dataUrl,
      floorPosition: null,
      hotspots: []
    });
  }
  prepareCanvas();
  updateWorkflowVisibility();
  if (selectors.publishSection && selectors.publishSection.style.display !== 'none') {
    showPublishStep();
  }
});

selectors.startConfig.addEventListener('click', () => {
  if (!ensureWorkflowReady()) return;
  prepareCanvas();
  state.workspaceEnabled = true;
  if (selectors.workspaceSection) {
    selectors.workspaceSection.style.display = 'block';
  }
  if (selectors.publishSection) {
    selectors.publishSection.style.display = 'block';
  }
  updateWorkflowVisibility();
  showPublishStep();
  selectors.workspaceSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

selectors.modeButtons.forEach(button => {
  button.addEventListener('click', () => {
    setMode(button.dataset.mode);
  });
});

selectors.floorPlanCanvas.addEventListener('click', event => {
  const activeId = state.activePanoramaId;
  if (!activeId) {
    alert('Selecione um panorama na faixa de imagens antes de marcar a posição.');
    return;
  }
  const rect = selectors.floorPlanCanvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  const panorama = state.panoramas.find(p => p.id === activeId);
  if (!panorama) return;
  panorama.floorPosition = { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  renderMarkers();
  refreshPanoramaList();
  showPublishStep();
});

selectors.publishButton.addEventListener('click', async () => {
  if (!allPanoramasPositioned()) {
    alert('Posicione todas as câmeras na planta antes de publicar.');
    return;
  }
  if (state.panoramas.some(p => p.hotspots.length === 0)) {
    alert('Configure pelo menos um hotspot em cada panorama antes de publicar.');
    return;
  }
  const payload = {
    name: state.name,
    description: state.description,
    floorPlan: state.floorPlan,
    panoramas: state.panoramas.map(p => ({
      id: p.id,
      name: p.name,
      filename: p.filename,
      dataUrl: p.dataUrl,
      floorPosition: p.floorPosition,
      hotspots: p.hotspots
    }))
  };

  try {
    const method = state.id ? 'PUT' : 'POST';
    const endpoint = state.id ? `/api/projects/${state.id}` : '/api/projects';
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Erro ao salvar.');
    const project = await response.json();
    state.id = project.id;
    renderPublicationLinks(project);
    fetchProjects();
  } catch (error) {
    alert('Não foi possível publicar o projeto.');
  }
});

function renderPublicationLinks(project) {
  selectors.publishReview.innerHTML = `
    <h3>${project.name}</h3>
    <p>Projeto publicado com sucesso! Compartilhe os links abaixo:</p>
    <div class="links">
      <a href="/projects/${project.id}" target="_blank">Visão do cliente</a>
      ${project.panoramas
        .map(
          panorama => `
            <a href="/panoramas/${project.id}/${panorama.id}" target="_blank">
              QR Panorama: ${panorama.name || panorama.filename}
            </a>
          `
        )
        .join('')}
    </div>
  `;
}

fetchProjects();
resetWorkflow();
