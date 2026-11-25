import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  Trash2,
  Eye,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { documentService } from '../services/documentService';
import { useToast } from '../context/ToastContext';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await documentService.list();
      setDocuments(list);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast({
        type: 'error',
        title: 'Invalid file type',
        message: 'Only PDF (.pdf) documents are supported.',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast({
        type: 'error',
        title: 'File too large',
        message: 'Maximum PDF upload size is 10 MB.',
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const created = await documentService.upload(file, setProgress);
      setDocuments((prev) => [created, ...prev]);
      showToast({
        type: 'success',
        title: 'PDF uploaded & extracted',
        message: `"${created.filename}" (${created.fileMetadata?.pageCount || 1} pages) is ready for research.`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Upload failed',
        message: err.friendlyMessage,
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handlePreview = async (docId) => {
    try {
      const fullDoc = await documentService.getById(docId);
      setPreviewDoc(fullDoc);
    } catch (err) {
      showToast({ type: 'error', title: 'Preview failed', message: err.friendlyMessage });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await documentService.remove(deleteTarget._id);
      setDocuments((prev) => prev.filter((d) => d._id !== deleteTarget._id));
      showToast({
        type: 'success',
        title: 'Document deleted',
        message: `"${deleteTarget.filename}" has been removed.`,
      });
      setDeleteTarget(null);
    } catch (err) {
      showToast({ type: 'error', title: 'Delete failed', message: err.friendlyMessage });
    } finally {
      setDeleting(false);
    }
  };

  const formatSize = (bytes = 0) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Document Knowledge Vault</h1>
            <p className="text-sm text-slate-400 mt-1">
              Upload private PDF papers, reports, or briefs. RESEARCHX AI extracts and inspects them safely during research.
            </p>
          </div>

          <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-violet-600/20 transition-all shrink-0">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{uploading ? `Uploading ${progress}%` : 'Upload PDF'}</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              disabled={uploading}
              onChange={handleFileChange}
            />
          </label>
        </div>

        {uploading && (
          <div className="rounded-xl border border-violet-500/30 bg-[#0D1326] p-4">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
              <span>Uploading & extracting PDF text...</span>
              <span className="font-mono text-violet-300">{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && <ErrorState message={error} onRetry={loadDocuments} />}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <LoadingSkeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No PDF documents uploaded"
            description="Upload research papers, financial reports, or technical specifications (.pdf, max 10 MB) so the agent can read and cite them."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc._id}
                className="rounded-2xl border border-slate-800 bg-[#0D1326] p-5 flex flex-col justify-between gap-4 hover:border-violet-500/35 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-300 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">{doc.filename}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          {doc.fileMetadata?.pageCount || 1} pages •{' '}
                          {doc.fileMetadata?.wordCount || 0} words •{' '}
                          {formatSize(doc.fileMetadata?.sizeBytes)}
                        </p>
                      </div>
                    </div>
                  </div>
                  {doc.summary && (
                    <p className="text-xs text-slate-400 mt-3 line-clamp-3 leading-relaxed">
                      {doc.summary}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePreview(doc._id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Inspect Text
                    </button>
                    <button
                      onClick={() => navigate(`/workspace?docId=${doc._id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/35 text-xs font-medium text-violet-200 border border-violet-500/30 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Research with PDF
                    </button>
                  </div>
                  <button
                    onClick={() => setDeleteTarget(doc)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Text Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#0D1326] p-6 max-h-[82vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-white">{previewDoc.filename}</h3>
                <p className="text-xs text-slate-400">
                  Extracted plain text ({previewDoc.fileMetadata?.wordCount || 0} words)
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <pre className="mt-4 flex-1 overflow-y-auto text-xs text-slate-300 whitespace-pre-wrap font-mono bg-[#080C1A] p-4 rounded-xl border border-slate-800">
              {previewDoc.extractedText}
            </pre>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete PDF Document"
        message={`Are you sure you want to delete "${deleteTarget?.filename}"? This action cannot be undone.`}
        confirmLabel="Delete PDF"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}
