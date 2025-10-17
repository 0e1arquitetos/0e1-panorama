import { PanoramaViewer } from './viewer360.js';

const state = {
  id: null,
  name: '',
  description: '',
  floorPlan: null,
  panoramas: [],
  activePanoramaId: null
};

const selectors = {
  projectName: document.getElementById('project-name'),
  projectDescription: document.getElementById('project-description'),
  floorPlanInput: document.getElementById('floor-plan'),
  panoramaInput: document.getElementById('panorama-files'),
  panoramaList: document.getElementById('panorama-list'),
  startConfig: document.getElementById('start-config'),
  projectList: document.getElementById('project-list'),
  floorPlanSection: document.getElementById('floor-plan-section'),
  floorPlanCanvas: document.getElementById('floor-plan-canvas'),
  floorPlanPreview: document.getElementById('floor-plan-preview'),
  placementViewer: document.getElementById('placement-viewer'),
  goHotspots: document.getElementById('go-hotspots'),
  activePanoramaSelect: document.getElementById('active-panorama'),
  markerSummary: document.getElementById('marker-summary'),
  hotspotSection: document.getElementById('hotspot-section'),
  hotspotViewer: document.getElementById('hotspot-viewer'),
  hotspotPanorama: document.getElementById('hotspot-panorama'),
  hotspotSummary: document.getElementById('hotspot-summary'),
  publishSection: document.getElementById('publish-section'),
  publishReview: document.getElementById('project-review'),
  publishButton: document.getElementById('publish-project'),
  headerProject: document.getElementById('header-project')
};

let placementViewer = null;
let hotspotViewer = null;

let hotspotStageOpened = false;
let hasTriggeredHotspotFullscreen = false;

function allPanoramasPositioned() {
  return state.panoramas.length > 0 && state.panoramas.every(p => p.floorPosition);
}

function updateWorkflowVisibility() {
  const hasEssentials = Boolean(state.name && state.floorPlan && state.panoramas.length);
  selectors.floorPlanSection.style.display = hasEssentials ? 'block' : 'none';

  const positioned = hasEssentials && allPanoramasPositioned();
  const canPreviewNavigation = hasEssentials && state.panoramas.length > 0;
  selectors.goHotspots.disabled = !canPreviewNavigation;
  selectors.goHotspots.textContent = positioned
    ? 'Avançar para hotspots'
    : 'Pré-visualizar tour 360º';
  if (positioned) {
    selectors.goHotspots.removeAttribute('title');
  } else if (canPreviewNavigation) {
    selectors.goHotspots.title = 'Abra o ambiente imersivo mesmo com panoramas pendentes.';
  } else {
    selectors.goHotspots.removeAttribute('title');
  }

  if (!hasEssentials) {
    selectors.hotspotSection.style.display = 'none';
    hotspotStageOpened = false;
    hasTriggeredHotspotFullscreen = false;
  } else if (hotspotStageOpened) {
    selectors.hotspotSection.style.display = 'block';
  }
}

function focusPanorama(panoramaId, { scrollToCanvas = false } = {}) {
  if (!panoramaId) return;
  const panorama = state.panoramas.find(p => p.id === panoramaId);
  if (!panorama) return;
  state.activePanoramaId = panoramaId;
  if (selectors.activePanoramaSelect) {
    selectors.activePanoramaSelect.value = panoramaId;
  }
  showPlacementPanorama(panorama);
  if (selectors.panoramaList) {
    selectors.panoramaList
      .querySelectorAll('.list-item')
      .forEach(item => item.classList.toggle('is-active', item.dataset.panoramaId === panoramaId));
  }
  if (selectors.floorPlanCanvas) {
    const markers = selectors.floorPlanCanvas.querySelectorAll('.marker');
    markers.forEach(marker => {
      marker.classList.toggle('active', marker.dataset.panoramaId === panoramaId);
    });
  }
  if (scrollToCanvas && selectors.floorPlanSection) {
    selectors.floorPlanSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

async function showPlacementPanorama(panorama) {
  if (!selectors.placementViewer || !panorama) return;
  try {
    if (!placementViewer) {
      placementViewer = new PanoramaViewer(selectors.placementViewer, {
        markerInteraction: false
      });
    }
    await placementViewer.setPanorama(panorama.dataUrl);
  } catch (error) {
    console.warn('Não foi possível carregar o panorama selecionado.', error);
  }
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

async function ensureHotspotViewer(panorama) {
  if (!selectors.hotspotViewer || !panorama) return;
  try {
    if (!hotspotViewer) {
      hotspotViewer = new PanoramaViewer(selectors.hotspotViewer, {
        onClick: ({ yaw, pitch }) => handleHotspotClick(yaw, pitch),
        markerInteraction: false
      });
    }
    await hotspotViewer.setPanorama(panorama.dataUrl);
    updateHotspotMarkers(panorama);
  } catch (error) {
    console.warn('Não foi possível carregar o panorama para hotspots.', error);
  }
}

function updateHotspotMarkers(panorama) {
  if (!hotspotViewer) return;
  const markers = panorama.hotspots.map((hotspot, index) => {
    const destination = state.panoramas.find(p => p.id === hotspot.targetPanoramaId);
    return {
      id: hotspot.id,
      yaw: hotspot.yaw,
      pitch: hotspot.pitch,
      label: String(index + 1),
      tooltip: destination ? `Vai para ${destination.name || destination.filename}` : 'Selecione o destino'
    };
  });
  hotspotViewer.setMarkers(markers);
}

function handleHotspotClick(yaw, pitch) {
  const panoramaId = selectors.hotspotPanorama.value;
  if (!panoramaId) {
    alert('Selecione um panorama para adicionar hotspots.');
    return;
  }
  const panorama = state.panoramas.find(p => p.id === panoramaId);
  if (!panorama) return;
  const possibleTargets = state.panoramas.filter(p => p.id !== panoramaId);
  if (!possibleTargets.length) {
    alert('Cadastre pelo menos dois panoramas para criar hotspots.');
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
  renderHotspots(panoramaId);
  refreshPanoramaList();
  showPublishStep();
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
  selectors.floorPlanSection.style.display = 'none';
  selectors.hotspotSection.style.display = 'none';
  selectors.publishSection.style.display = 'none';
  selectors.publishReview.innerHTML = '';
  selectors.goHotspots.disabled = true;
  selectors.goHotspots.textContent = 'Pré-visualizar tour 360º';
  selectors.goHotspots.removeAttribute('title');
  state.activePanoramaId = null;
  hotspotStageOpened = false;
  hasTriggeredHotspotFullscreen = false;
}

function updateHeaderProject(name = 'Studio Panorama') {
  selectors.headerProject.textContent = name;
}

function refreshPanoramaList() {
  selectors.panoramaList.innerHTML = '';
  if (!state.panoramas.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Adicione panoramas para iniciar o posicionamento.';
    selectors.panoramaList.appendChild(empty);
    updateWorkflowVisibility();
    return;
  }
  state.panoramas.forEach((panorama, index) => {
    const item = document.createElement('div');
    item.className = 'list-item panorama-item';
    item.dataset.panoramaId = panorama.id;

    const thumb = document.createElement('img');
    thumb.className = 'panorama-thumb';
    thumb.src = panorama.dataUrl;
    thumb.alt = `Panorama ${panorama.name || panorama.filename}`;

    const hasPosition = Boolean(panorama.floorPosition);
    const status = [
      hasPosition ? 'Na planta' : 'Sem posição',
      `${panorama.hotspots.length} hotspot${panorama.hotspots.length === 1 ? '' : 's'}`
    ].join(' • ');

    const textWrapper = document.createElement('div');
    textWrapper.innerHTML = `
      <strong>${index + 1}. ${panorama.name || panorama.filename}</strong>
      <br />
      <small class="muted">${status}</small>
    `;

    const info = document.createElement('div');
    info.className = 'panorama-info';
    info.appendChild(thumb);
    info.appendChild(textWrapper);

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.style.background = hasPosition ? 'rgba(0,255,203,0.25)' : 'rgba(253,137,255,0.25)';
    badge.style.color = hasPosition ? 'var(--brand-teal)' : 'var(--brand-indigo)';
    badge.textContent = hasPosition ? 'Posicionado' : 'Pendente';

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'secondary-button';
    action.textContent = hasPosition ? 'Rever posição' : 'Posicionar';
    action.addEventListener('click', event => {
      event.stopPropagation();
      focusPanorama(panorama.id, { scrollToCanvas: true });
    });

    const meta = document.createElement('div');
    meta.className = 'panorama-meta';
    meta.appendChild(badge);
    meta.appendChild(action);

    item.appendChild(info);
    item.appendChild(meta);
    item.addEventListener('click', () => focusPanorama(panorama.id, { scrollToCanvas: true }));
    item.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        focusPanorama(panorama.id, { scrollToCanvas: true });
      }
    });
    item.tabIndex = 0;

    if (state.activePanoramaId === panorama.id) {
      item.classList.add('is-active');
    }

    selectors.panoramaList.appendChild(item);
  });
  updateWorkflowVisibility();
}

function populatePanoramaSelects() {
  const selects = [selectors.activePanoramaSelect, selectors.hotspotPanorama];
  selects.forEach(select => {
    if (!select) return;
    const previousValue = select.value;
    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecione';
    select.appendChild(placeholder);
    state.panoramas.forEach(panorama => {
      const option = document.createElement('option');
      option.value = panorama.id;
      option.textContent = panorama.name || panorama.filename;
      select.appendChild(option);
    });
    if (previousValue) {
      select.value = previousValue;
    }
  });
}

function renderMarkers() {
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
  state.panoramas.forEach((panorama, index) => {
    const summaryItem = document.createElement('div');
    summaryItem.className = 'list-item';
    const hasPosition = Boolean(panorama.floorPosition);
    summaryItem.innerHTML = `
      <span>${index + 1}. ${panorama.name || panorama.filename}</span>
      <span class="badge" style="background: ${hasPosition ? 'rgba(0,255,203,0.25)' : 'rgba(253,137,255,0.25)'}; color: ${hasPosition ? 'var(--brand-teal)' : 'var(--brand-indigo)'};">
        ${hasPosition ? 'Posicionado' : 'Pendente'}
      </span>
    `;
    selectors.markerSummary.appendChild(summaryItem);
  });

  updateWorkflowVisibility();
}

async function renderHotspots(panoramaId) {
  const panorama = state.panoramas.find(p => p.id === panoramaId);
  if (!panorama) {
    selectors.hotspotSummary.innerHTML = '';
    hotspotViewer?.setMarkers([]);
    return;
  }
  selectors.hotspotPanorama.value = panoramaId;
  panorama.hotspots = panorama.hotspots.map(normaliseHotspotAngles);
  await ensureHotspotViewer(panorama);
  updateHotspotMarkers(panorama);

  selectors.hotspotSummary.innerHTML = '';
  if (!panorama.hotspots.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Nenhum hotspot criado ainda. Clique no panorama para adicionar.';
    selectors.hotspotSummary.appendChild(empty);
    return;
  }

  panorama.hotspots.forEach((hotspot, index) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    const destination = state.panoramas.find(p => p.id === hotspot.targetPanoramaId);
    const select = document.createElement('select');
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
      updateHotspotMarkers(panorama);
      renderHotspots(panoramaId);
      refreshPanoramaList();
      showPublishStep();
    });

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remover';
    removeButton.style.background = 'rgba(253,137,255,0.75)';
    removeButton.addEventListener('click', () => {
      panorama.hotspots = panorama.hotspots.filter(h => h.id !== hotspot.id);
      updateHotspotMarkers(panorama);
      renderHotspots(panoramaId);
      refreshPanoramaList();
      showPublishStep();
    });

    const label = document.createElement('div');
    const angles = formatAngles(hotspot);
    label.innerHTML = `<strong>${index + 1}.</strong> Hotspot → ${(destination?.name || destination?.filename || 'Selecione destino')}<br><small class="muted">Yaw ${angles.yaw} • Pitch ${angles.pitch}</small>`;

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = '8px';
    container.style.alignItems = 'center';
    container.appendChild(label);
    container.appendChild(select);

    item.innerHTML = '';
    item.appendChild(container);
    item.appendChild(removeButton);
    selectors.hotspotSummary.appendChild(item);
  });
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
  populatePanoramaSelects();
  const activeId = state.activePanoramaId || selectors.activePanoramaSelect.value || state.panoramas[0]?.id;
  if (activeId) {
    focusPanorama(activeId);
  }
  renderMarkers();
}

async function prepareHotspots({ autoFullscreen = false } = {}) {
  populatePanoramaSelects();
  if (!state.panoramas.length) return;

  const panoramaId = selectors.hotspotPanorama.value || state.panoramas[0].id;
  selectors.hotspotPanorama.value = panoramaId;
  await renderHotspots(panoramaId);

  if (autoFullscreen) {
    try {
      selectors.hotspotViewer.requestFullscreen?.();
    } catch (error) {
      console.warn('Não foi possível iniciar o modo tela cheia automaticamente.', error);
    }
  }
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

  selectors.projectName.value = state.name;
  selectors.projectDescription.value = state.description;
  updateHeaderProject(state.name);
  refreshPanoramaList();
  prepareCanvas();
  updateWorkflowVisibility();
  if (allPanoramasPositioned()) {
    hotspotStageOpened = true;
    selectors.hotspotSection.style.display = 'block';
    hasTriggeredHotspotFullscreen = true;
    prepareHotspots();
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
  selectors.floorPlanSection.style.display = 'block';
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
  refreshPanoramaList();
  prepareCanvas();
  if (!hotspotStageOpened) {
    selectors.hotspotSection.style.display = 'none';
  } else {
    prepareHotspots();
  }
  updateWorkflowVisibility();
  if (selectors.publishSection.style.display !== 'none') {
    showPublishStep();
  }
});

selectors.startConfig.addEventListener('click', () => {
  if (!ensureWorkflowReady()) return;
  selectors.floorPlanSection.style.display = 'block';
  selectors.hotspotSection.style.display = 'none';
  selectors.publishSection.style.display = 'block';
  prepareCanvas();
  updateWorkflowVisibility();
  showPublishStep();
});

selectors.activePanoramaSelect.addEventListener('change', event => {
  focusPanorama(event.target.value);
});

selectors.floorPlanCanvas.addEventListener('click', event => {
  const activeId = selectors.activePanoramaSelect.value;
  if (!activeId) {
    alert('Selecione um panorama para posicionar.');
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

selectors.goHotspots.addEventListener('click', async () => {
  if (selectors.goHotspots.disabled) return;
  hotspotStageOpened = true;
  selectors.hotspotSection.style.display = 'block';
  await prepareHotspots({ autoFullscreen: !hasTriggeredHotspotFullscreen });
  hasTriggeredHotspotFullscreen = true;
  showPublishStep();
  selectors.hotspotSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

selectors.hotspotPanorama.addEventListener('change', event => {
  const panoramaId = event.target.value;
  if (!panoramaId) return;
  renderHotspots(panoramaId);
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
