"use client";

import { useRef, useState } from "react";

export default function HomePage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const handleUploadClick = () => {
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      // Debug: mark upload start
      // eslint-disable-next-line no-console
      console.log('[UI] Upload started');
      const text = await file.text();
      const payload = JSON.parse(text);
      // eslint-disable-next-line no-console
      console.log('[UI] Upload parsed JSON, posting to /api/poetic-brain');
      const res = await fetch('/api/poetic-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      // eslint-disable-next-line no-console
      console.log('[UI] Upload response status:', res.status, 'body:', json);
      if (!res.ok) {
        throw new Error(json?.error || 'Upload failed');
      }
      setResult(json);
      setUploaded(true);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[UI] Upload error:', err);
      setError(err?.message || 'Something went wrong');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ margin: 0 }}>Poetic Brain – Test Upload</h1>
      <p>Upload a combined Mirror + Symbolic Weather JSON to hit the API.</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={handleUploadClick} disabled={busy} aria-busy={busy}>
          {busy ? 'Uploading…' : 'Upload JSON'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          // Keep visually hidden but programmatically visible for WebKit
          style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <div data-testid="upload-error" role="alert" style={{ color: '#b91c1c' }}>{error}</div>
      )}

      {uploaded && (
        <div data-testid="upload-success" style={{ color: '#16a34a' }}>Upload complete.</div>
      )}

      <section data-testid="mirror-output" style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, minHeight: 80, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {result?.draft ? (
          <>
            <div>picture: {String(result.draft.picture || '')}</div>
            <div>feeling: {String(result.draft.feeling || '')}</div>
            <div>container: {String(result.draft.container || '')}</div>
            <div>option: {String(result.draft.option || '')}</div>
            <div>next_step: {String(result.draft.next_step || '')}</div>
          </>
        ) : result ? (
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(result, null, 2)}</pre>
        ) : (
          <span style={{ color: '#6b7280' }}>No result yet.</span>
        )}
      </section>
    </main>
  );
}
