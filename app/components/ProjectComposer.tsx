'use client';

import { useCallback, useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import type { Hotspot, Panorama, Project } from '@/lib/projects';
import FloorplanMapper from './floorplan/FloorplanMapper';
import PanoramaEditor from './panorama/PanoramaEditor';

interface DraftPanorama extends Panorama {}

interface SaveState {
  loading: boolean;
  success?: Project;
  error?: string;
}

export default function ProjectComposer() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [floorplanImage, setFloorplanImage] = useState<string | undefined>();
  const [panoramas, setPanoramas] = useState<DraftPanorama[]>([]);
  const [selectedPanoramaId, setSelectedPanoramaId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ loading: false });

  const selectedPanorama = useMemo(
    () => panoramas.find((panorama) => panorama.id === selectedPanoramaId) ?? null,
    [panoramas, selectedPanoramaId]
  );

  const handleFloorplanUpload = useCallback(async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    setFloorplanImage(dataUrl);
  }, []);

  const handleCreatePanorama = useCallback(() => {
    const panoramaName = prompt('Nome da cena panorâmica');
    if (!panoramaName) return;
    const newPanorama: DraftPanorama = {
      id: uuid(),
      name: panoramaName,
      imageData: '',
      hotspots: []
    };
    setPanoramas((items) => [...items, newPanorama]);
    setSelectedPanoramaId(newPanorama.id);
  }, []);

  const handleUpdatePanorama = useCallback((panoramaId: string, update: Partial<DraftPanorama>) => {
    setPanoramas((items) =>
      items.map((item) => (item.id === panoramaId ? { ...item, ...update, hotspots: update.hotspots ?? item.hotspots } : item))
    );
  }, []);

  const handleDeletePanorama = useCallback((panoramaId: string) => {
    setPanoramas((items) => items.filter((item) => item.id !== panoramaId));
    if (selectedPanoramaId === panoramaId) {
      setSelectedPanoramaId(null);
    }
  }, [selectedPanoramaId]);

  const handlePositionSelected = useCallback(
    (panoramaId: string, position: { x: number; y: number }) => {
      handleUpdatePanorama(panoramaId, { position });
    },
    [handleUpdatePanorama]
  );

  const handleHotspotUpdate = useCallback(
    (panoramaId: string, hotspots: Hotspot[]) => {
      handleUpdatePanorama(panoramaId, { hotspots });
    },
    [handleUpdatePanorama]
  );

  const handleSubmit = useCallback(async () => {
    if (!name || panoramas.length === 0) {
      setSaveState({ loading: false, error: 'Informe o nome do projeto e adicione pelo menos um panorama.' });
      return;
    }
    setSaveState({ loading: true });
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, floorplanImage, panoramas })
      });
      if (!response.ok) {
        const message = await response.json();
        throw new Error(message.error ?? 'Não foi possível salvar.');
      }
      const data = (await response.json()) as { project: Project };
      setSaveState({ loading: false, success: data.project });
      setName('');
      setDescription('');
      setFloorplanImage(undefined);
      setPanoramas([]);
      setSelectedPanoramaId(null);
    } catch (error) {
      setSaveState({ loading: false, error: (error as Error).message });
    }
  }, [name, description, floorplanImage, panoramas]);

  const disableSave = useMemo(() => !name || panoramas.length === 0, [name, panoramas.length]);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <label className="block text-xs uppercase tracking-[0.3em] text-brand-indigo">
            Nome do projeto
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-brand-indigo/30 bg-white/70 px-4 py-3 text-brand-teal outline-none focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/40"
              placeholder="Residência 360"
            />
          </label>
          <label className="block text-xs uppercase tracking-[0.3em] text-brand-indigo">
            Descrição
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 h-28 w-full rounded-xl border border-brand-indigo/30 bg-white/70 px-4 py-3 text-brand-teal outline-none focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/40"
              placeholder="Detalhe o objetivo do passeio"
            />
          </label>
          <label className="block text-xs uppercase tracking-[0.3em] text-brand-indigo">
            Planta baixa (PNG)
            <input
              type="file"
              accept="image/png"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  handleFloorplanUpload(file);
                }
              }}
              className="mt-2 w-full rounded-xl border border-dashed border-brand-indigo/40 bg-white/70 px-4 py-3 text-brand-teal outline-none focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/40"
            />
          </label>
          <div className="rounded-2xl border border-brand-indigo/20 bg-brand-lilac/40 p-4 text-sm text-brand-teal/80">
            Carregue a planta baixa para posicionar cada panorama clicando no mapa. Use os hotspots para conectar cenas em 360°.
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-indigo">Panoramas</h3>
            <button
              type="button"
              onClick={handleCreatePanorama}
              className="rounded-full bg-brand-mint px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-brand-teal shadow"
            >
              Novo panorama
            </button>
          </div>
          <ul className="space-y-3">
            {panoramas.map((panorama) => (
              <li key={panorama.id}>
                <button
                  type="button"
                  onClick={() => setSelectedPanoramaId(panorama.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left ${
                    selectedPanoramaId === panorama.id
                      ? 'border-brand-indigo bg-white shadow'
                      : 'border-brand-indigo/20 bg-white/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm uppercase tracking-[0.25em] text-brand-teal">{panorama.name}</span>
                    <span className="text-xs text-brand-indigo/60">
                      {panorama.imageData ? 'imagem carregada' : 'aguardando imagem'}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {selectedPanorama && (
            <button
              onClick={() => handleDeletePanorama(selectedPanorama.id)}
              type="button"
              className="text-xs uppercase tracking-[0.3em] text-brand-coral"
            >
              Remover panorama
            </button>
          )}
        </div>
      </div>

      {floorplanImage && panoramas.length > 0 && (
        <FloorplanMapper
          floorplan={floorplanImage}
          panoramas={panoramas}
          selectedPanoramaId={selectedPanoramaId}
          onSelectPanorama={setSelectedPanoramaId}
          onPositionChange={handlePositionSelected}
        />
      )}

      {selectedPanorama && (
        <PanoramaEditor
          panorama={selectedPanorama}
          panoramas={panoramas}
          onChangeImage={(imageData) => handleUpdatePanorama(selectedPanorama.id, { imageData })}
          onChangeHotspots={(hotspots) => handleHotspotUpdate(selectedPanorama.id, hotspots)}
        />
      )}

      <div className="flex items-center justify-between rounded-2xl border border-brand-indigo/20 bg-white/80 px-6 py-4">
        <div className="text-sm text-brand-teal/80">
          Garanta que todas as cenas tenham posições na planta e hotspots conectando as áreas do passeio.
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disableSave || saveState.loading}
          className="rounded-full bg-brand-indigo px-6 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-white shadow disabled:cursor-not-allowed disabled:bg-brand-indigo/40"
        >
          {saveState.loading ? 'Salvando...' : 'Publicar projeto'}
        </button>
      </div>

      {saveState.error && (
        <p className="text-sm text-brand-coral">{saveState.error}</p>
      )}
      {saveState.success && (
        <div className="rounded-2xl border border-brand-mint/50 bg-brand-mint/20 p-4 text-sm text-brand-teal">
          Projeto publicado! Compartilhe o link:{' '}
          <a href={`/projects/${saveState.success.slug}`} className="font-semibold" target="_blank" rel="noreferrer">
            /projects/{saveState.success.slug}
          </a>
        </div>
      )}
    </div>
  );
}

async function fileToDataUrl(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const base64String = Buffer.from(arrayBuffer).toString('base64');
  return `data:${file.type};base64,${base64String}`;
}
