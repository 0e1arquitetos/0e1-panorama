import { createQrSvg } from './lib/qrcode.js';
import { PanoramaViewer } from './viewer360.js';

const params = new URLSearchParams(window.location.search);
const pathMatch = window.location.pathname.match(/^\/panoramas\/([^/]+)\/([^/]+)/);
const projectId = pathMatch ? decodeURIComponent(pathMatch[1]) : params.get('project');
const panoramaId = pathMatch ? decodeURIComponent(pathMatch[2]) : params.get('panorama');

const elements = {
  projectName: document.getElementById('panorama-project-name'),
  panoramaName: document.getElementById('panorama-name'),
  panoramaViewer: document.getElementById('single-panorama-viewer'),
  qrPreview: document.getElementById('qr-preview'),
  downloadSvg: document.getElementById('download-svg'),
  copyLink: document.getElementById('copy-link')
};

let shareUrl = '';
let viewer = null;

async function showPanorama(panorama) {
  if (!elements.panoramaViewer || !panorama?.dataUrl) return;
  if (!viewer) {
    viewer = new PanoramaViewer(elements.panoramaViewer, {
      markerInteraction: false
    });
  }
  await viewer.setPanorama(panorama.dataUrl);
}

function downloadSvg(svgContent, fileName) {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function loadPanorama() {
  if (!projectId || !panoramaId) {
    document.body.innerHTML = '<main><section><h1>Panorama não encontrado</h1></section></main>';
    return;
  }

  try {
    const response = await fetch(`/api/projects/${projectId}/panoramas/${panoramaId}`);
    if (!response.ok) throw new Error('Panorama não encontrado');
    const { project, panorama } = await response.json();

    shareUrl = `${window.location.origin}/panoramas/${project.id}/${panorama.id}`;
    elements.projectName.textContent = project.name;
    elements.panoramaName.textContent = panorama.name || panorama.filename;
    await showPanorama(panorama);

    const svg = createQrSvg(shareUrl, {
      color: '#2436be',
      background: '#f6f8ff',
      scale: 8,
      margin: 2
    });
    elements.qrPreview.innerHTML = svg;

    elements.downloadSvg.addEventListener('click', () => {
      downloadSvg(svg, `${project.id}-${panorama.id}.svg`);
    });

    elements.copyLink.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        elements.copyLink.textContent = 'Link copiado!';
        setTimeout(() => (elements.copyLink.textContent = 'Copiar link'), 1500);
      } catch {
        window.prompt('Copie o link', shareUrl);
      }
    });
  } catch (error) {
    document.body.innerHTML = `<main><section><h1>${error.message}</h1></section></main>`;
  }
}

loadPanorama();
