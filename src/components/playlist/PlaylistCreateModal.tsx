import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  open:        boolean;
  initial?:    { name: string; description?: string };
  title?:      string;
  onConfirm:   (name: string, description: string, isPublic: boolean) => Promise<void>;
  onClose:     () => void;
}

const inp = 'w-full bg-[#0B0814] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/40 text-sm';

export default function PlaylistCreateModal({ open, initial, title = 'Create Playlist', onConfirm, onClose }: Props) {
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [isPublic,    setIsPublic]    = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
      setIsPublic(true);
      setError('');
    }
  }, [open, initial]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Playlist name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await onConfirm(name.trim(), description.trim(), isPublic);
      onClose();
    } catch {
      setError('Failed to save playlist. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#0B0814] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Playlist Name *</label>
            <input
              className={inp}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My awesome playlist"
              autoFocus
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description <span className="text-gray-500 font-normal">(optional)</span></label>
            <textarea
              className={inp + ' resize-none'}
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe this playlist..."
              maxLength={300}
            />
          </div>

          <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">Public playlist</p>
              <p className="text-xs text-gray-400">Anyone can find and follow this playlist</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`w-12 h-6 rounded-full relative transition-colors ${isPublic ? 'bg-[#00D9FF]/70' : 'bg-gray-700'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 font-medium py-3 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 bg-[#9D4EDD] hover:bg-[#7C3AED] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {saving ? 'Saving...' : title.includes('Rename') ? 'Save Changes' : 'Create Playlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
