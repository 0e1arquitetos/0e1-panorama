import { NextResponse } from 'next/server';
import { createProject, listProjects, Project } from '@/lib/projects';

export async function GET() {
  const projects = await listProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<Project>;
  if (!payload.name) {
    return NextResponse.json({ error: 'Nome do projeto é obrigatório.' }, { status: 400 });
  }

  const project = await createProject({
    name: payload.name,
    description: payload.description,
    floorplanImage: payload.floorplanImage,
    panoramas: payload.panoramas ?? []
  });

  return NextResponse.json({ project }, { status: 201 });
}
