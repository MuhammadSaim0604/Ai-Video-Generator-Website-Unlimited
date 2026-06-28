'use client';
import { useState, useRef } from 'react';
import { Upload, CheckCircle, XCircle, Loader2, FileJson } from 'lucide-react';
import { adminUploadAccounts } from '../../lib/api';

export default function AccountsUpload({ onUploaded }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file || !file.name.endsWith('.json')) {
      setError('Please upload a valid .json file');
      return;
    }
    setError('');
    setResults(null);
    setUploading(true);
    try {
      const data = await adminUploadAccounts(file);
      setResults(data.results || []);
      onUploaded && onUploaded();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <h2 className="font-semibold flex items-center gap-2">
        <FileJson className="w-4 h-4 text-primary" />
        Upload Pixverse Accounts
      </h2>

      <p className="text-xs text-muted-foreground">
        Upload the accounts JSON file. The system will test each token, re-login if expired,
        sync credits & HD times, and add/update accounts in the database.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Processing accounts…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="w-8 h-8" />
            <p className="text-sm font-medium">Drop JSON file here or click to upload</p>
            <p className="text-xs">Format: {'{ email: { email, username, password, token, account_id } }'}</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive flex items-center gap-1.5">
          <XCircle className="w-4 h-4" /> {error}
        </p>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Results: {results.filter((r) => r.status === 'success').length} succeeded,{' '}
            {results.filter((r) => r.status === 'error').length} failed
          </p>
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {results.map((r, i) => (
              <div key={i} className={`flex items-start gap-2 text-xs rounded-lg p-2 ${
                r.status === 'success' ? 'bg-emerald-500/10' : 'bg-red-500/10'
              }`}>
                {r.status === 'success'
                  ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  : <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />}
                <div>
                  <p className="font-medium">{r.email}</p>
                  {r.status === 'success'
                    ? <p className="text-muted-foreground">Credits: {r.credits} · HD Times: {r.highQualityTimes}</p>
                    : <p className="text-red-400">{r.error}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
