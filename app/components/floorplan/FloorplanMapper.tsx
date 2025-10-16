'use client';

import Image from 'next/image';
import { useCallback, useMemo, useRef } from 'react';
import type { Panorama } from '@/lib/projects';

interface Props {
  floorplan: string;
  panoramas: Panorama[];
  selectedPanoramaId: string | null;
  onSelectPanorama: (panoramaId: string) => void;
  onPositionChange: (panoramaId: string, position: { x: number; y: number }) => void;
}

export default function FloorplanMapper({
  floorplan,
  panoramas,
  selectedPanoramaId,
  onSelectPanorama,
  onPositionChange
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!selectedPanoramaId) return;
      const element = containerRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      onPositionChange(selectedPanoramaId, { x, y });
    },
    [onPositionChange, selectedPanoramaId]
  );

  const markers = useMemo(
    () =>
      panoramas.map((panorama) => ({
        id: panorama.id,
        name: panorama.name,
        position: panorama.position
      })),
    [panoramas]
  );

  return (
    <div className="rounded-3xl border border-brand-indigo/20 bg-white/80 p-6 shadow-inner shadow-brand-indigo/10">
      <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-indigo">Mapa interativo</h3>
      <div
        ref={containerRef}
        onClick={handleClick}
        className="relative mt-4 aspect-video w-full cursor-crosshair overflow-hidden rounded-2xl border border-brand-indigo/20 bg-brand-lilac/20"
      >
        {floorplan && (
          <Image src={floorplan} alt="Planta baixa" fill className="object-contain" />
        )}
        {markers.map((marker) => (
          <button
            key={marker.id}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelectPanorama(marker.id);
            }}
            style={{
              left: `${marker.position?.x ?? 50}%`,
              top: `${marker.position?.y ?? 50}%`
            }}
            className={`absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-semibold uppercase tracking-[0.15em] transition ${
              selectedPanoramaId === marker.id
                ? 'border-brand-mint bg-brand-indigo text-white'
                : 'border-brand-indigo/50 bg-white/90 text-brand-indigo'
            }`}
          >
            {marker.name.slice(0, 2).toUpperCase()}
          </button>
        ))}
        {!selectedPanoramaId && (
          <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.3em] text-brand-indigo/60">
            Selecione um panorama para posicionar
          </div>
        )}
      </div>
    </div>
  );
}
