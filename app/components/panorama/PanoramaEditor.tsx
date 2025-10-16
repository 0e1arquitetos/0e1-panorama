'use client';

import { useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import type { Hotspot, Panorama } from '@/lib/projects';

interface Props {
  panorama: Panorama;
  panoramas: Panorama[];
  onChangeImage: (imageData: string) => void;
  onChangeHotspots: (hotspots: Hotspot[]) => void;
}

export default function PanoramaEditor({ panorama, panoramas, onChangeImage, onChangeHotspots }: Props) {
  const handleFile = useCallback(
    async (file: File) => {
      const arrayBuffer = await file.arrayBuffer();
      const dataUrl = `data:${file.type};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
      onChangeImage(dataUrl);
    },
    [onChangeImage]
  );

  const updateHotspot = useCallback(
    (id: string, update: Partial<Hotspot>) => {
      onChangeHotspots(
        panorama.hotspots.map((hotspot) => (hotspot.id === id ? { ...hotspot, ...update } : hotspot))
      );
    },
    [onChangeHotspots, panorama.hotspots]
  );

  const deleteHotspot = useCallback(
    (id: string) => {
      onChangeHotspots(panorama.hotspots.filter((hotspot) => hotspot.id !== id));
    },
    [onChangeHotspots, panorama.hotspots]
  );

  const createHotspot = useCallback(() => {
    const label = prompt('Nome do hotspot (ex: Cozinha)');
    if (!label) return;
    const newHotspot: Hotspot = {
      id: uuid(),
      label,
      targetPanoramaId: panorama.id,
      pitch: 0,
      yaw: 0
    };
    onChangeHotspots([...panorama.hotspots, newHotspot]);
  }, [onChangeHotspots, panorama.hotspots, panorama.id]);

  return (
    <div className="rounded-3xl border border-brand-indigo/20 bg-white/80 p-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-indigo">Cena selecionada</h3>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-teal/60">{panorama.name}</p>
          <label className="block text-xs uppercase tracking-[0.3em] text-brand-indigo">
            Imagem panorâmica (PNG ou JPG)
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleFile(file);
                }
              }}
              className="mt-2 w-full rounded-xl border border-dashed border-brand-indigo/40 bg-white/70 px-4 py-3 text-brand-teal outline-none focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/40"
            />
          </label>
          {panorama.imageData && (
            <div className="overflow-hidden rounded-2xl border border-brand-indigo/10">
              <img src={panorama.imageData} alt={panorama.name} className="w-full" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-indigo">Hotspots</h3>
            <button
              type="button"
              onClick={createHotspot}
              className="rounded-full bg-brand-mint px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-brand-teal shadow"
            >
              Novo hotspot
            </button>
          </div>
          {panorama.hotspots.length === 0 ? (
            <p className="text-sm text-brand-teal/70">
              Adicione conexões para orientar o cliente entre os ambientes. Defina o destino e os ângulos iniciais.
            </p>
          ) : (
            <ul className="space-y-4">
              {panorama.hotspots.map((hotspot) => (
                <li key={hotspot.id} className="rounded-2xl border border-brand-indigo/20 bg-brand-lilac/30 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-teal">{hotspot.label}</p>
                      <label className="mt-2 block text-[10px] uppercase tracking-[0.3em] text-brand-indigo/80">
                        Panorama de destino
                        <select
                          value={hotspot.targetPanoramaId}
                          onChange={(event) => updateHotspot(hotspot.id, { targetPanoramaId: event.target.value })}
                          className="mt-1 w-full rounded-lg border border-brand-indigo/30 bg-white/80 px-3 py-2 text-xs uppercase tracking-[0.2em] text-brand-teal focus:border-brand-indigo"
                        >
                          {panoramas.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="mt-3 flex gap-3">
                        <label className="block text-[10px] uppercase tracking-[0.3em] text-brand-indigo/80">
                          Yaw (º)
                          <input
                            type="number"
                            value={hotspot.yaw}
                            onChange={(event) => updateHotspot(hotspot.id, { yaw: Number(event.target.value) })}
                            className="mt-1 w-24 rounded-lg border border-brand-indigo/30 bg-white/80 px-3 py-2 text-xs text-brand-teal focus:border-brand-indigo"
                          />
                        </label>
                        <label className="block text-[10px] uppercase tracking-[0.3em] text-brand-indigo/80">
                          Pitch (º)
                          <input
                            type="number"
                            value={hotspot.pitch}
                            onChange={(event) => updateHotspot(hotspot.id, { pitch: Number(event.target.value) })}
                            className="mt-1 w-24 rounded-lg border border-brand-indigo/30 bg-white/80 px-3 py-2 text-xs text-brand-teal focus:border-brand-indigo"
                          />
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteHotspot(hotspot.id)}
                      className="text-[10px] uppercase tracking-[0.3em] text-brand-coral"
                    >
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
