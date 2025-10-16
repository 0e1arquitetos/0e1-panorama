import type { ReactNode } from 'react';
import { getProjectBySlug } from '@/lib/projects';

interface Props {
  children: ReactNode;
  params: {
    slug: string;
  };
}

export default async function ProjectLayout({ children, params }: Props) {
  const project = await getProjectBySlug(params.slug);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-white/90 p-8 shadow shadow-brand-indigo/10">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-indigo/80">Projeto ZERO E UM</p>
        <h1 className="mt-2 text-3xl font-semibold uppercase tracking-[0.3em] text-brand-indigo">{project?.name}</h1>
        {project?.description && <p className="mt-4 max-w-2xl text-brand-teal/80">{project.description}</p>}
      </div>
      {children}
    </div>
  );
}
