import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProjectBySlug } from '@/lib/projects';

interface Props {
  params: {
    slug: string;
    panoramaId: string;
  };
}

export const dynamic = 'force-dynamic';

export default async function PanoramaPage({ params }: Props) {
  const project = await getProjectBySlug(params.slug);
  if (!project) {
    notFound();
  }

  const panorama = project.panoramas.find((item) => item.id === params.panoramaId);
  if (!panorama) {
    notFound();
  }

  return (
    <div className="space-y-6 rounded-3xl border border-brand-indigo/20 bg-white/80 p-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-indigo/70">Cena panorâmica</p>
          <h2 className="text-2xl font-semibold uppercase tracking-[0.3em] text-brand-teal">{panorama.name}</h2>
        </div>
        <Link
          href={`/projects/${project.slug}`}
          className="rounded-full bg-brand-mint px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-brand-teal"
        >
          Voltar ao mapa
        </Link>
      </header>

      {panorama.imageData && (
        <div className="overflow-hidden rounded-3xl border border-brand-indigo/10">
          <img src={panorama.imageData} alt={panorama.name} className="w-full" />
        </div>
      )}

      <section className="rounded-2xl border border-brand-indigo/20 bg-brand-lilac/30 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-indigo">Hotspots desta cena</h3>
        {panorama.hotspots.length === 0 ? (
          <p className="mt-2 text-sm text-brand-teal/70">
            Nenhum hotspot configurado. Utilize o estúdio ZERO E UM para conectar esta cena a outras áreas.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {panorama.hotspots.map((hotspot) => {
              const target = project.panoramas.find((item) => item.id === hotspot.targetPanoramaId);
              return (
                <li key={hotspot.id} className="rounded-xl border border-brand-indigo/20 bg-white/80 p-3 text-sm text-brand-teal">
                  <p className="text-xs uppercase tracking-[0.3em] text-brand-indigo/80">{hotspot.label}</p>
                  {target ? (
                    <Link
                      href={`/projects/${project.slug}/panoramas/${target.id}`}
                      className="mt-2 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-brand-teal"
                    >
                      Ir para {target.name}
                    </Link>
                  ) : (
                    <p className="mt-2 text-xs text-brand-coral">Panorama de destino não encontrado.</p>
                  )}
                  <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-brand-indigo/60">
                    Yaw: {hotspot.yaw.toFixed(0)}º • Pitch: {hotspot.pitch.toFixed(0)}º
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
