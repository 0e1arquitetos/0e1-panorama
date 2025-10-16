const state = {
  id: null,
  name: '',
  description: '',
  floorPlan: null,
  panoramas: []
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
  activePanoramaSelect: document.getElementById('active-panorama'),
  markerSummary: document.getElementById('marker-summary'),
  hotspotSection: document.getElementById('hotspot-section'),
  panoramaCanvas: document.getElementById('panorama-canvas'),
  panoramaPreview: document.getElementById('panorama-preview'),
  hotspotPanorama: document.getElementById('hotspot-panorama'),
  hotspotSummary: document.getElementById('hotspot-summary'),
  publishSection: document.getElementById('publish-section'),
  publishReview: document.getElementById('project-review'),
  publishButton: document.getElementById('publish-project'),
  headerProject: document.getElementById('header-project')
};

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
}

function updateHeaderProject(name = 'Studio Panorama') {
  selectors.headerProject.textContent = name;
}

function refreshPanoramaList() {
  selectors.panoramaList.innerHTML = '';
  state.panoramas.forEach((panorama, index) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <span><strong>${index + 1}. ${panorama.name || panorama.filename}</strong></span>
      <span class="badge">${panorama.hotspots.length} hotspots</span>
    `;
    selectors.panoramaList.appendChild(item);
  });
}

function populatePanoramaSelects() {
  const selects = [selectors.activePanoramaSelect, selectors.hotspotPanorama];
  selects.forEach(select => {
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
}

function renderHotspots(panoramaId) {
  selectors.panoramaCanvas.querySelectorAll('.hotspot').forEach(h => h.remove());
  const panorama = state.panoramas.find(p => p.id === panoramaId);
  if (!panorama) return;
  selectors.panoramaPreview.src = panorama.dataUrl;
  selectors.panoramaPreview.style.display = 'block';

  panorama.hotspots.forEach((hotspot, index) => {
    const element = document.createElement('div');
    element.className = 'hotspot';
    element.textContent = index + 1;
    element.style.left = `${hotspot.x}%`;
    element.style.top = `${hotspot.y}%`;
    element.title = `Vai para ${(state.panoramas.find(p => p.id === hotspot.targetPanoramaId)?.name) || 'Panorama'}`;
    selectors.panoramaCanvas.appendChild(element);
  });

  selectors.hotspotSummary.innerHTML = '';
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
      renderHotspots(panoramaId);
    });

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remover';
    removeButton.style.background = 'rgba(253,137,255,0.75)';
    removeButton.addEventListener('click', () => {
      panorama.hotspots = panorama.hotspots.filter(h => h.id !== hotspot.id);
      renderHotspots(panoramaId);
      refreshPanoramaList();
    });

    const label = document.createElement('span');
    label.innerHTML = `<strong>${index + 1}.</strong> Hotspot → ${(destination?.name || destination?.filename || 'Selecione destino')}`;

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
  renderMarkers();
}

function prepareHotspots() {
  populatePanoramaSelects();
  if (state.panoramas.length) {
    const panoramaId = selectors.hotspotPanorama.value || state.panoramas[0].id;
    selectors.hotspotPanorama.value = panoramaId;
    renderHotspots(panoramaId);
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
    hotspots: Array.isArray(p.hotspots) ? p.hotspots : []
  }));

  selectors.projectName.value = state.name;
  selectors.projectDescription.value = state.description;
  updateHeaderProject(state.name);
  refreshPanoramaList();
  selectors.floorPlanSection.style.display = 'block';
  selectors.hotspotSection.style.display = 'block';
  prepareCanvas();
  prepareHotspots();
  showPublishStep();
}

async function loadProject(projectId) {
  try {
    const response = await fetch(`/api/projects/${projectId}`);
    if (!response.ok) throw new Error('Erro ao carregar projeto.');
    const project = await response.json();
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
  populatePanoramaSelects();
  selectors.hotspotSection.style.display = state.panoramas.length ? 'block' : 'none';
});

selectors.startConfig.addEventListener('click', () => {
  if (!ensureWorkflowReady()) return;
  selectors.floorPlanSection.style.display = 'block';
  selectors.hotspotSection.style.display = 'block';
  prepareCanvas();
  if (state.panoramas.length) {
    const defaultPanorama = state.panoramas[0].id;
    selectors.activePanoramaSelect.value = defaultPanorama;
    selectors.hotspotPanorama.value = defaultPanorama;
    selectors.panoramaPreview.src = state.panoramas[0].dataUrl;
    renderHotspots(defaultPanorama);
  }
  showPublishStep();
});

selectors.activePanoramaSelect.addEventListener('change', () => {
  // No additional action needed beyond selection for placement.
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
  showPublishStep();
});

selectors.hotspotPanorama.addEventListener('change', event => {
  const panoramaId = event.target.value;
  if (!panoramaId) return;
  renderHotspots(panoramaId);
});

selectors.panoramaCanvas.addEventListener('click', event => {
  const panoramaId = selectors.hotspotPanorama.value;
  if (!panoramaId) {
    alert('Selecione um panorama para adicionar hotspots.');
    return;
  }
  const panorama = state.panoramas.find(p => p.id === panoramaId);
  if (!panorama) return;
  const rect = selectors.panoramaCanvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;

  const possibleTargets = state.panoramas.filter(p => p.id !== panoramaId);
  if (!possibleTargets.length) {
    alert('Cadastre pelo menos dois panoramas para criar hotspots.');
    return;
  }

  const target = possibleTargets[0].id;
  panorama.hotspots.push({
    id: generateLocalId('hotspot'),
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    targetPanoramaId: target
  });
  renderHotspots(panoramaId);
  refreshPanoramaList();
  showPublishStep();
});

selectors.publishButton.addEventListener('click', async () => {
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
