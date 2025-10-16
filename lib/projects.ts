import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';

export interface Hotspot {
  id: string;
  label: string;
  targetPanoramaId: string;
  pitch: number;
  yaw: number;
}

export interface Panorama {
  id: string;
  name: string;
  imageData: string;
  hotspots: Hotspot[];
  position?: { x: number; y: number };
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  floorplanImage?: string;
  panoramas: Panorama[];
}

const dataPath = path.join(process.cwd(), 'data', 'projects.json');

async function ensureStore() {
  try {
    await fs.access(dataPath);
  } catch (error) {
    const seed = { projects: [] as Project[] };
    await fs.mkdir(path.dirname(dataPath), { recursive: true });
    await fs.writeFile(dataPath, JSON.stringify(seed, null, 2), 'utf-8');
  }
}

export async function listProjects(): Promise<Project[]> {
  await ensureStore();
  const content = await fs.readFile(dataPath, 'utf-8');
  const parsed = JSON.parse(content) as { projects: Project[] };
  return parsed.projects;
}

export async function getProjectBySlug(slug: string): Promise<Project | undefined> {
  const projects = await listProjects();
  return projects.find((project) => project.slug === slug);
}

export async function createProject(
  project: Omit<Project, 'id' | 'createdAt' | 'slug'> & { slug?: string }
): Promise<Project> {
  const projects = await listProjects();
  const finalSlug = (project.slug ?? project.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  const uniqueSlug = ensureUniqueSlug(finalSlug, projects.map((item) => item.slug));
  const newProject: Project = {
    ...project,
    id: uuid(),
    slug: uniqueSlug,
    createdAt: new Date().toISOString()
  };
  projects.push(newProject);
  await fs.writeFile(dataPath, JSON.stringify({ projects }, null, 2), 'utf-8');
  return newProject;
}

export async function updateProject(slug: string, payload: Partial<Project>): Promise<Project | undefined> {
  const projects = await listProjects();
  const index = projects.findIndex((project) => project.slug === slug);
  if (index === -1) {
    return undefined;
  }
  const updated: Project = {
    ...projects[index],
    ...payload,
    panoramas: payload.panoramas ?? projects[index].panoramas
  };
  projects[index] = updated;
  await fs.writeFile(dataPath, JSON.stringify({ projects }, null, 2), 'utf-8');
  return updated;
}

function ensureUniqueSlug(slug: string, existing: string[]): string {
  if (!existing.includes(slug)) {
    return slug;
  }
  let counter = 2;
  let candidate = `${slug}-${counter}`;
  while (existing.includes(candidate)) {
    counter += 1;
    candidate = `${slug}-${counter}`;
  }
  return candidate;
}

export function createEmptyProject(name: string): Project {
  return {
    id: uuid(),
    name,
    slug: name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, ''),
    createdAt: new Date().toISOString(),
    panoramas: []
  };
}
