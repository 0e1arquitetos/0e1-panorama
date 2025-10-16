import { createServer } from 'http';
import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, 'data', 'projects.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

async function ensureDataFile() {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify({ projects: [] }, null, 2), 'utf-8');
  }
}

async function readProjects() {
  await ensureDataFile();
  const content = await fs.readFile(DATA_PATH, 'utf-8');
  return JSON.parse(content);
}

async function writeProjects(data) {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function generateId(name = '') {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const timestamp = Date.now().toString(36);
  return slug ? `${slug}-${timestamp}` : timestamp;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk.toString();
      if (data.length > 50 * 1024 * 1024) {
        reject(new Error('Payload muito grande.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const parsed = data ? JSON.parse(data) : {};
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon'
  }[ext] || 'application/octet-stream';

  const stream = createReadStream(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  stream.pipe(res);
  stream.on('error', () => {
    res.writeHead(500);
    res.end('Erro ao ler o arquivo.');
  });
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Não encontrado' }));
}

function handleOptions(req, res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end();
}

function getProjectById(projects, id) {
  return projects.find(project => project.id === id);
}

function getPanorama(project, panoramaId) {
  return project?.panoramas?.find(panorama => panorama.id === panoramaId);
}

const server = createServer(async (req, res) => {
  const { method, url: requestUrl } = req;
  const parsedUrl = new URL(requestUrl, 'http://localhost');
  const pathname = parsedUrl.pathname;

  if (method === 'OPTIONS') {
    handleOptions(req, res);
    return;
  }

  if (pathname.startsWith('/api/projects')) {
    try {
      const data = await readProjects();
      const segments = pathname.split('/').filter(Boolean);

      if (method === 'GET' && segments.length === 2) {
        sendJson(res, 200, data.projects);
        return;
      }

      if (method === 'POST' && segments.length === 2) {
        const body = await parseBody(req);
        if (!body.name || !body.floorPlan || !Array.isArray(body.panoramas)) {
          sendJson(res, 400, { error: 'Dados inválidos para criação do projeto.' });
          return;
        }
        const id = generateId(body.name);
        const project = {
          id,
          name: body.name,
          description: body.description || '',
          floorPlan: body.floorPlan,
          panoramas: body.panoramas.map(panorama => ({
            ...panorama,
            id: panorama.id || generateId(panorama.name || 'panorama')
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        data.projects.push(project);
        await writeProjects(data);
        sendJson(res, 201, project);
        return;
      }

      if (segments.length >= 3) {
        const projectId = segments[2];
        const project = getProjectById(data.projects, projectId);
        if (!project) {
          sendJson(res, 404, { error: 'Projeto não encontrado.' });
          return;
        }

        if (method === 'GET' && segments.length === 3) {
          sendJson(res, 200, project);
          return;
        }

        if (method === 'PUT' && segments.length === 3) {
          const body = await parseBody(req);
          const index = data.projects.findIndex(p => p.id === projectId);
          data.projects[index] = {
            ...project,
            ...body,
            id: projectId,
            updatedAt: new Date().toISOString()
          };
          await writeProjects(data);
          sendJson(res, 200, data.projects[index]);
          return;
        }

        if (segments.length === 5 && segments[3] === 'panoramas') {
          const panoramaId = segments[4];
          const panorama = getPanorama(project, panoramaId);
          if (!panorama) {
            sendJson(res, 404, { error: 'Panorama não encontrado.' });
            return;
          }
          sendJson(res, 200, { project: { id: project.id, name: project.name }, panorama });
          return;
        }
      }

      notFound(res);
      return;
    } catch (error) {
      console.error(error);
      sendJson(res, 500, { error: 'Erro interno do servidor.' });
      return;
    }
  }

  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    notFound(res);
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    serveStatic(filePath, res);
  } catch (error) {
    if (/^\/projects\//.test(pathname)) {
      const projectPage = path.join(PUBLIC_DIR, 'project.html');
      serveStatic(projectPage, res);
      return;
    }
    if (/^\/panoramas\//.test(pathname)) {
      const panoramaPage = path.join(PUBLIC_DIR, 'panorama.html');
      serveStatic(panoramaPage, res);
      return;
    }
    if (pathname.endsWith('/')) {
      notFound(res);
      return;
    }
    const fallback = path.join(PUBLIC_DIR, `${pathname}.html`);
    try {
      await fs.access(fallback);
      serveStatic(fallback, res);
    } catch {
      notFound(res);
    }
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor iniciado em http://localhost:${PORT}`);
});
