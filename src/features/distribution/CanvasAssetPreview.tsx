import React, { useEffect, useState } from 'react';
import { Film, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── CanvasAssetPreview ────────────────────────────────────────────────────────
// Previews Spotify Canvas / Apple Motion assets for a given release.
// Fetches from 'distribution_canvas_assets' where release_id = releaseId.
// Polls every 8s while any asset is still queued or processing.
//
// asset_type='canvas'         + status='done'  → <video loop muted autoPlay />
// asset_type='motion_artwork' + status='done'  → <img />
// status='processing'|'queued'                → "Generating…" spinner overlay
// no assets                                   → informational empty state

interface CanvasAssetPreviewProps {
  releaseId: string;
}

interface CanvasAsset {
  id: string;
  release_id: string;
  asset_type: 'canvas' | 'motion_artwork' | string;
  /** Spec uses 'url'; also fall back to 'asset_url' for backward compat */
  url: string | null;
  asset_url: string | null;
  status: 'queued' | 'processing' | 'done' | string;
  created_at: string;
  title: string | null;
}

function resolveUrl(asset: CanvasAsset): string {
  return asset.url ?? asset.asset_url ?? '';
}

// ── Spinner ────────────────────────────────────────────────────────────────

function Spinner({ size = 24, color = '#9D4EDD' }: { size?: number; color?: string }) {
  return (
    <Loader2
      size={size}
      className="animate-spin"
      style={{ color }}
    />
  );
}

// ── GeneratingOverlay ──────────────────────────────────────────────────────

function GeneratingOverlay() {
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-800/60">
      {/* Gray placeholder box */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-700/40 to-gray-900/40" />
      {/* Spinner + label overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <Spinner size={32} color="#9D4EDD" />
        <p className="text-sm font-semibold text-gray-300">Generating…</p>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function CanvasAssetPreview({ releaseId }: CanvasAssetPreviewProps) {
  const [assets, setAssets] = useState<CanvasAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!releaseId) return;
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from('distribution_canvas_assets')
        .select('id, release_id, asset_type, url, asset_url, status, created_at, title')
        .eq('release_id', releaseId)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (error) {
        setFetchError(error.message);
      } else {
        setAssets((data ?? []) as CanvasAsset[]);
      }
      setLoading(false);
    }

    load();

    // Poll every 8 s while any asset is still in-progress
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('distribution_canvas_assets')
        .select('id, release_id, asset_type, url, asset_url, status, created_at, title')
        .eq('release_id', releaseId)
        .order('created_at', { ascending: false });

      if (cancelled || !data) return;
      setAssets(data as CanvasAsset[]);
      const allDone = data.every((a: CanvasAsset) => a.status === 'done');
      if (allDone) clearInterval(interval);
    }, 8_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [releaseId]);

  // ── Loading ──

  if (loading) {
    return (
      <div className="flex items-center justify-center py-14 bg-[#0B0814]">
        <Spinner size={30} color="#9D4EDD" />
      </div>
    );
  }

  // ── Error ──

  if (fetchError) {
    return (
      <div
        className="flex items-center gap-3 p-4 rounded-xl text-sm text-red-300"
        style={{ background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.25)' }}
      >
        <AlertCircle size={18} className="shrink-0 text-[#FF6B00]" />
        {fetchError}
      </div>
    );
  }

  // ── Empty ──

  if (assets.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-14 rounded-2xl text-center gap-4"
        style={{ background: 'rgba(157,78,221,0.06)', border: '1px solid rgba(157,78,221,0.2)' }}
      >
        {/* Gray placeholder box */}
        <div className="w-full max-w-sm aspect-video rounded-xl bg-gray-800/50 mx-auto" />
        <div className="space-y-1 px-6">
          <p className="text-sm font-semibold text-gray-300">
            No canvas assets generated yet.
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Canvas assets are created automatically when your release is approved.
          </p>
        </div>
      </div>
    );
  }

  // ── Asset list ──

  return (
    <div className="space-y-6">
      {assets.map((asset) => {
        const assetUrl = resolveUrl(asset);
        const isDone = asset.status === 'done';
        const isPending = asset.status === 'processing' || asset.status === 'queued';

        return (
          <div
            key={asset.id}
            className="rounded-2xl overflow-hidden"
            style={{ background: '#0f1020', border: '1px solid rgba(157,78,221,0.22)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderColor: 'rgba(157,78,221,0.15)' }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-[#9D4EDD]">
                {asset.asset_type === 'canvas' ? 'Spotify Canvas' : 'Motion Artwork'}
              </span>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background:
                    isDone ? '#00F5A020' :
                    asset.status === 'processing' ? '#FFB80020' :
                    '#9D4EDD20',
                  color:
                    isDone ? '#00F5A0' :
                    asset.status === 'processing' ? '#FFB800' :
                    '#9D4EDD',
                  border: `1px solid ${isDone ? '#00F5A040' : asset.status === 'processing' ? '#FFB80040' : '#9D4EDD40'}`,
                }}
              >
                {isDone ? 'Ready' : asset.status === 'processing' ? 'Processing' : 'Queued'}
              </span>
            </div>

            {/* Preview */}
            <div className="p-5">
              {isDone && asset.asset_type === 'canvas' && assetUrl ? (
                <video
                  src={assetUrl}
                  loop
                  muted
                  autoPlay
                  playsInline
                  className="w-full aspect-video rounded-xl object-cover"
                />
              ) : isDone && asset.asset_type === 'motion_artwork' && assetUrl ? (
                <img
                  src={assetUrl}
                  alt={asset.title ?? 'Motion artwork'}
                  className="w-full aspect-video rounded-xl object-cover"
                />
              ) : isPending ? (
                <GeneratingOverlay />
              ) : (
                /* Fallback for unknown state */
                <div className="w-full aspect-video rounded-xl bg-gray-800/50 flex items-center justify-center">
                  <Film size={32} className="text-gray-600" />
                </div>
              )}
            </div>

            {/* Footer */}
            {isDone && assetUrl && (
              <div
                className="px-5 py-3 border-t flex justify-end"
                style={{ borderColor: 'rgba(157,78,221,0.1)' }}
              >
                <a
                  href={assetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-[#9D4EDD] hover:text-[#9D4EDD]/80 transition-colors"
                >
                  Open full size ↗
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default CanvasAssetPreview;
