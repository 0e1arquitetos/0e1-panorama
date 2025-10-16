import { NextResponse } from 'next/server';
import { getProjectBySlug, updateProject } from '@/lib/projects';

interface Params {
  params: {
    slug: string;
  };
}

export async function GET(_: Request, { params }: Params) {
  const project = await getProjectBySlug(params.slug);
  if (!project) {
    return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
  }
  return NextResponse.json({ project });
}

export async function PUT(request: Request, { params }: Params) {
  const payload = await request.json();
  const updated = await updateProject(params.slug, payload);
  if (!updated) {
    return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
  }
  return NextResponse.json({ project: updated });
}
