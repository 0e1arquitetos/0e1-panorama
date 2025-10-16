import Link from 'next/link';
import { listProjects } from '@/lib/projects';
import ProjectComposer from './components/ProjectComposer';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const projects = await listProjects();

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-white/80 p-8 shadow-xl shadow-brand-indigo/10">
        <h1 className="text-3xl font-semibold uppercase tracking-[0.3em] text-brand-indigo">Novo projeto</h1>
        <p className="mt-3 max-w-2xl text-brand-teal/80">
          Faça upload da planta baixa em PNG, organize seus panoramas e conecte as cenas com hotspots interativos.
          Ao salvar, geramos um link exclusivo e QR Codes em SVG para compartilhar com os clientes.
        </p>
        <div className="mt-8">
          <ProjectComposer />
        </div>
      </section>

      <section className="rounded-3xl border border-brand-indigo/20 bg-white/70 p-8">
        <h2 className="text-xl font-semibold uppercase tracking-[0.3em] text-brand-indigo">Projetos publicados</h2>
        {projects.length === 0 ? (
          <p className="mt-4 text-brand-teal/70">Crie o primeiro passeio virtual da ZERO E UM.</p>
        ) : (
          <ul className="mt-6 grid gap-6 md:grid-cols-2">
            {projects.map((project) => (
              <li key={project.id} className="rounded-2xl border border-brand-indigo/10 bg-brand-lilac/40 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold uppercase tracking-[0.2em] text-brand-teal">
                      {project.name}
                    </h3>
                    <p className="text-xs uppercase tracking-[0.3em] text-brand-indigo/70">
                      atualizado em {new Date(project.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Link
                    href={`/projects/${project.slug}`}
                    className="rounded-full bg-brand-mint px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-brand-teal shadow"
                  >
                    Abrir passeio
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
