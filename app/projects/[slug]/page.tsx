import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProjectBySlug } from '@/lib/projects';
import { createSvgQr } from '@/lib/qr';

interface Props {
  params: {
    slug: string;
  };
}

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: Props) {
  const project = await getProjectBySlug(params.slug);
  if (!project) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

  return (
    <div className="space-y-8">
      {project.floorplanImage && (
        <div className="rounded-3xl border border-brand-indigo/20 bg-white/80 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-indigo">Planta baixa navegável</h2>
          <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-brand-indigo/20">
            <Image src={project.floorplanImage} alt={`Planta do projeto ${project.name}`} fill className="object-contain" />
            {project.panoramas.map((panorama) => (
              <Link
                key={panorama.id}
                href={`/projects/${project.slug}/panoramas/${panorama.id}`}
                style={{
                  left: `${panorama.position?.x ?? 50}%`,
                  top: `${panorama.position?.y ?? 50}%`
                }}
                className="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-brand-mint bg-brand-indigo text-xs font-semibold uppercase tracking-[0.2em] text-white shadow"
              >
                {panorama.name.slice(0, 2).toUpperCase()}
              </Link>
            ))}
          </div>
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-indigo">Experiências panorâmicas</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {await Promise.all(
            project.panoramas.map(async (panorama) => {
              const directUrl = `${baseUrl}/projects/${project.slug}/panoramas/${panorama.id}`;
              const qrSvg = await createSvgQr(directUrl);
              return (
                <article
                  key={panorama.id}
                  className="flex h-full flex-col justify-between rounded-3xl border border-brand-indigo/20 bg-white/80 p-6 shadow-sm"
                >
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold uppercase tracking-[0.3em] text-brand-teal">{panorama.name}</h3>
                    {panorama.imageData && (
                      <div className="overflow-hidden rounded-2xl border border-brand-indigo/10">
                        <img src={panorama.imageData} alt={panorama.name} className="w-full" />
                      </div>
                    )}
                    <p className="text-xs uppercase tracking-[0.3em] text-brand-indigo/70">
                      {panorama.hotspots.length} hotspots conectados
                    </p>
                    <Link
                      href={`/projects/${project.slug}/panoramas/${panorama.id}`}
                      className="inline-flex items-center gap-2 rounded-full bg-brand-mint px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-brand-teal"
                    >
                      Abrir cena
                    </Link>
                  </div>
                  <div className="mt-4 rounded-2xl border border-brand-indigo/20 bg-brand-lilac/30 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-brand-indigo/80">QR Code em SVG</p>
                    <div className="mt-3 flex items-center gap-4">
                      <div className="h-28 w-28" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                      <a
                        href={`data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}`}
                        download={`${project.slug}-${panorama.id}.svg`}
                        className="rounded-full bg-brand-indigo px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white"
                      >
                        Baixar QR
                      </a>
                    </div>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-brand-teal/60">{directUrl}</p>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
