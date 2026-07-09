import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface CanvasAsset {
  id: string;
  release_id: string;
  asset_type: 'canvas' | 'motion_artwork';
  asset_url: string;
  status: 'pending' | 'processing' | 'done' | 'error';
}

interface CanvasPreviewProps {
  releaseId: string;
}

const CanvasPreview: React.FC<CanvasPreviewProps> = ({ releaseId }) => {
  const [asset, setAsset] = useState<CanvasAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchAsset = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('distribution_canvas_assets')
        .select('id, release_id, asset_type, asset_url, status')
        .eq('release_id', releaseId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setAsset(data as CanvasAsset | null);
        }
        setLoading(false);
      }
    };

    fetchAsset();
    return () => { cancelled = true; };
  }, [releaseId]);

  if (loading) {
    return (
      <div className="relative rounded-xl overflow-hidden aspect-video bg-[#120C22] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00D9FF] animate-spin" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="relative rounded-xl overflow-hidden aspect-video bg-[#120C22] flex items-center justify-center">
        <span className="text-gray-500 text-sm">No canvas available</span>
      </div>
    );
  }

  const isDone = asset.status === 'done';

  return (
    <div className="relative rounded-xl overflow-hidden aspect-video bg-[#0B0814]">
      {asset.asset_type === 'canvas' ? (
        <video
          src={asset.asset_url}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <img
          src={asset.asset_url}
          alt="Motion artwork"
          className="w-full h-full object-cover"
        />
      )}

      {/* Status overlay when not done */}
      {!isDone && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-8 h-8 text-[#00D9FF] animate-spin" />
          <span className="text-white text-sm font-medium">
            {asset.status === 'error' ? 'Generation failed' : 'Generating...'}
          </span>
          {asset.status === 'processing' && (
            <span className="text-gray-400 text-xs">This may take a moment</span>
          )}
        </div>
      )}
    </div>
  );
};

export default CanvasPreview;
