'use client';
import { useState, useEffect, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import { useUserImagesStore } from '../stores/user/user.images.store';
import { cn } from '../lib/utils';

export default function ImageSelectorModal({ open, onClose, onSelect }) {
  const [tab, setTab] = useState('uploaded');
  const [selected, setSelected] = useState(null);
  const fileInputRef = useRef(null);

  const {
    uploadedImages,
    createdImages,
    loading,
    uploading,
    uploadError,
    loadImages,
    uploadImage,
    clearUploadError,
  } = useUserImagesStore();

  useEffect(() => {
    if (!open) return;
    loadImages();
    setSelected(null);
    clearUploadError();
  }, [open]);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadImage(file);
      setSelected(result);
    } catch (_) {}
    finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleSelectConfirm() {
    if (!selected) return;
    onSelect(selected);
    onClose();
  }

  const images = tab === 'uploaded'
    ? uploadedImages
    : createdImages.map((c) => ({ url: c.result_url, path: c.result_path || c.result_url, id: c.job_id }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-lg">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>Select Image</DialogTitle>
        </DialogHeader>

        <div className="px-5">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="uploaded" className="flex-1">Uploaded</TabsTrigger>
              <TabsTrigger value="created" className="flex-1">AI Created</TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-4">
              {tab === 'uploaded' && (
                <div className="mb-4">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    {uploading
                      ? <><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Uploading…</span></>
                      : <><Upload className="w-5 h-5" /><span className="text-sm">Upload Image</span></>}
                  </button>
                  {uploadError && <p className="text-destructive text-xs mt-1">{uploadError}</p>}
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : images.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                  <ImageIcon className="w-8 h-8" />
                  <p className="text-sm">{tab === 'uploaded' ? 'No uploaded images yet' : 'No generated images yet'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
                  {images.map((img, i) => (
                    <button
                      key={img.id || img.url || i}
                      onClick={() => setSelected(img)}
                      className={cn(
                        'relative aspect-square rounded-lg overflow-hidden border-2 transition-colors',
                        selected?.url === img.url ? 'border-primary' : 'border-transparent hover:border-primary/40'
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      {selected?.url === img.url && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="p-6 pt-4 flex items-center justify-between gap-3 border-t border-border mt-4">
          <div className="flex-1">
            {selected && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-primary" />
                <span className="truncate max-w-[160px]">Image selected</span>
                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSelectConfirm} disabled={!selected}>Use Image</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
