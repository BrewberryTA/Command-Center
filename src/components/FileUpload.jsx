// src/components/FileUpload.jsx
import { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase.js';

const ALLOWED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/msword', // doc
  'application/pdf',
];
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.docx', '.doc', '.pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const icons = { pdf: '📄', xlsx: '📊', xls: '📊', docx: '📝', doc: '📝' };
  return icons[ext] || '📎';
}

export function FileUpload({ uid, taskId, attachments = [], onAttachmentAdded }) {
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate type
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_TYPES.includes(file.type)) {
      setError('Only .xlsx, .xls, .docx, .doc, .pdf files are allowed.');
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setError('File exceeds 10MB limit.');
      return;
    }

    const storagePath = `users/${uid}/attachments/${taskId}/${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setProgress(pct);
      },
      (err) => {
        setError(`Upload failed: ${err.message}`);
        setProgress(null);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        const attachment = {
          name: file.name,
          url,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          path: storagePath,
        };
        await onAttachmentAdded(attachment);
        setProgress(null);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    );
  };

  return (
    <div style={{ marginTop: '12px' }}>
      {/* Upload Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.docx,.doc,.pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id={`file-upload-${taskId}`}
        />
        <label
          htmlFor={`file-upload-${taskId}`}
          className="btn btn-ghost"
          style={{ cursor: 'pointer' }}
        >
          📎 ATTACH FILE
        </label>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          .xlsx .xls .docx .doc .pdf · max 10MB
        </span>
      </div>

      {/* Upload Progress */}
      {progress !== null && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
              Uploading...
            </span>
            <span style={{ fontSize: '11px', color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
              {progress}%
            </span>
          </div>
          <div style={{ height: '2px', background: 'var(--border)', borderRadius: '1px' }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'var(--cyan)',
                boxShadow: 'var(--glow-cyan)',
                borderRadius: '1px',
                transition: 'width 200ms ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ color: 'var(--red)', fontSize: '11px', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
          ⚠ {error}
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {attachments.map((att, idx) => (
            <a
              key={idx}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                transition: 'all 200ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--cyan)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <span style={{ fontSize: '14px' }}>{getFileIcon(att.name)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {att.name}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {att.size ? formatBytes(att.size) : ''}{att.uploadedAt ? ` · ${formatDate(att.uploadedAt)}` : ''}
                </div>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
                ↓
              </span>
            </a>
          ))}
        </div>
      )}

      {attachments.length === 0 && progress === null && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          No attachments
        </div>
      )}
    </div>
  );
}
