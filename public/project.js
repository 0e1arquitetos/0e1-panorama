import { PanoramaViewer } from './viewer360.js';

const params = new URLSearchParams(window.location.search);
const pathMatch = window.location.pathname.match(/^\/projects\/([^/]+)/);
const projectId = pathMatch ? decodeURIComponent(pathMatch[1]) : params.get('id');

const elements = {
  projectName: document.getElementById('project-name-display'),
  floorPlanImg: document.getElementById('viewer-floor-plan-img'),
  floorPlanCanvas: document.getElementById('viewer-floor-plan'),
  panoramaViewer: document.getElementById('project-panorama-viewer'),
  panoramaList: document.getElementById('panorama-list'),
  panoramaLinks: document.getElementById('panorama-links')
};

let project = null;
let currentPanoramaId = null;
let viewer = null;

function percentToYawPitch(x, y) {
  if (typeof x !== 'number' || typeof y !== 'number') {
    return { yaw: 0, pitch: 0 };
  }
  const yaw = ((x / 100) * 2 * Math.PI) - Math.PI;
  const pitch = Math.PI / 2 - (y / 100) * Math.PI;
  return { yaw, pitch };
}

function normalisePanoramaHotspots(panorama) {
  panorama.hotspots = (panorama.hotspots || []).map(hotspot => {
    if (typeof hotspot.yaw === 'number' && typeof hotspot.pitch === 'number') {
      return hotspot;
    }
    const { yaw, pitch } = percentToYawPitch(hotspot.x, hotspot.y);
    return {
      ...hotspot,
      yaw,
      pitch
    };
  });
}

function updateViewerMarkers(panorama) {
  if (!viewer) return;
  const markers = (panorama.hotspots || []).map((hotspot, index) => {
    const destination = project.panoramas.find(p => p.id === hotspot.targetPanoramaId);
    return {
      id: hotspot.id,
      yaw: hotspot.yaw,
      pitch: hotspot.pitch,
      label: String(index + 1),
      tooltip: destination ? `Ir para ${destination.name || destination.filename}` : 'Hotspot sem destino',
      data: {
        targetPanoramaId: hotspot.targetPanoramaId
      }
    };
  });
  viewer.setMarkers(markers);
}

async function showPanorama(panorama) {
  if (!elements.panoramaViewer || !panorama) return;
  if (!viewer) {
    viewer = new PanoramaViewer(elements.panoramaViewer, {
      markerInteraction: true,
      onMarkerClick: marker => {
        const targetId = marker?.data?.targetPanoramaId;
        if (targetId) {
          setCurrentPanorama(targetId);
        }
      }
    });
  }
  await viewer.setPanorama(panorama.dataUrl);
  updateViewerMarkers(panorama);
}

function renderMarkers() {
  elements.floorPlanCanvas.querySelectorAll('.marker').forEach(marker => marker.remove());
  project.panoramas.forEach((panorama, index) => {
    if (!panorama.floorPosition) return;
    const marker = document.createElement('div');
    marker.className = 'marker';
    marker.textContent = index + 1;
    marker.style.left = `${panorama.floorPosition.x}%`;
    marker.style.top = `${panorama.floorPosition.y}%`;
    marker.title = panorama.name || panorama.filename;
    if (panorama.id === currentPanoramaId) {
      marker.classList.add('active');
    }
    marker.addEventListener('click', () => setCurrentPanorama(panorama.id));
    elements.floorPlanCanvas.appendChild(marker);
  });
}

function renderPanoramaLinks() {
  elements.panoramaLinks.innerHTML = '';
  const panorama = project.panoramas.find(p => p.id === currentPanoramaId);
  if (!panorama) return;
  const tourLink = `${window.location.origin}/projects/${project.id}`;
  const panoramaLink = `${window.location.origin}/panoramas/${project.id}/${panorama.id}`;

  const panoramaLabel = panorama.name || panorama.filename;
  const list = [
    { label: 'Copiar link do tour', value: tourLink },
    { label: `Copiar link do panorama ${panoramaLabel}`, value: panoramaLink }
  ];

  list.forEach(item => {
    const button = document.createElement('button');
    button.textContent = item.label;
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(item.value);
        button.textContent = 'Copiado!';
        setTimeout(() => (button.textContent = item.label), 1500);
      } catch {
        window.prompt('Copie o link:', item.value);
      }
    });
    elements.panoramaLinks.appendChild(button);
  });

  const qrAnchor = document.createElement('a');
  qrAnchor.href = panoramaLink;
  qrAnchor.textContent = 'Abrir QR code';
  qrAnchor.target = '_blank';
  elements.panoramaLinks.appendChild(qrAnchor);
}

function renderPanoramaList() {
  elements.panoramaList.innerHTML = '';
  project.panoramas.forEach((panorama, index) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <span>${index + 1}. ${panorama.name || panorama.filename}</span>
      <span class="badge">${panorama.hotspots.length} hotspots</span>
    `;
    item.style.cursor = 'pointer';
    if (panorama.id === currentPanoramaId) {
      item.style.border = '1px solid var(--brand-indigo)';
      item.style.background = 'rgba(49,84,223,0.12)';
    }
    item.addEventListener('click', () => setCurrentPanorama(panorama.id));
    elements.panoramaList.appendChild(item);
  });
}

function setCurrentPanorama(panoramaId) {
  const panorama = project.panoramas.find(p => p.id === panoramaId);
  if (!panorama) return;
  currentPanoramaId = panoramaId;
  normalisePanoramaHotspots(panorama);
  showPanorama(panorama);
  renderPanoramaLinks();
  renderPanoramaList();
  renderMarkers();
}

async function loadProject() {
  if (!projectId) {
    document.body.innerHTML = '<main><section><h1>Projeto não informado</h1></section></main>';
    return;
  }

  try {
    const response = await fetch(`/api/projects/${projectId}`);
    if (!response.ok) throw new Error('Projeto não encontrado');
    project = await response.json();
    project.panoramas = (project.panoramas || []).map(panorama => ({
      ...panorama,
      hotspots: Array.isArray(panorama.hotspots)
        ? panorama.hotspots.map(hotspot => {
            if (typeof hotspot.yaw === 'number' && typeof hotspot.pitch === 'number') {
              return hotspot;
            }
            const { yaw, pitch } = percentToYawPitch(hotspot.x, hotspot.y);
            return { ...hotspot, yaw, pitch };
          })
        : []
    }));
    elements.projectName.textContent = project.name;
    elements.floorPlanImg.src = project.floorPlan?.dataUrl || '';
    renderMarkers();
    if (project.panoramas.length) {
      setCurrentPanorama(project.panoramas[0].id);
    }
  } catch (error) {
    document.body.innerHTML = `<main><section><h1>${error.message}</h1></section></main>`;
  }
}

loadProject();
