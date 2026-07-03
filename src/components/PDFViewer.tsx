import React, { useState, useEffect, useRef } from 'react';
import { X, Maximize2, Minimize2, ExternalLink, FileText, AlertTriangle, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './PDFViewer.css';
// Vite bundles the worker as a separate asset — no CDN dependency
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  fileSize?: string;
  onClose: () => void;
  isOpen: boolean;
  isDarkMode?: boolean;
}

const getFileType = (name: string, url: string) => {
  const n = name.toLowerCase();
  const u = url.toLowerCase();
  if (n.match(/\.(jpg|jpeg|png|gif|webp|svg)$/) || u.includes('image/')) return 'image';
  if (n.endsWith('.pdf') || u.includes('.pdf')) return 'pdf';
  if (n.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/)) return 'office';
  return 'other';
};

const isMobileUA = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

const PDFViewer: React.FC<PDFViewerProps> = ({
  fileUrl,
  fileName,
  fileSize,
  onClose,
  isOpen,
  isDarkMode = false,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewerKey, setViewerKey] = useState(0);
  // react-pdf state (mobile)
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageWidth, setPageWidth] = useState(320);
  const bodyRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const fileType = getFileType(fileName, fileUrl);
  const isMobile = isMobileUA();
  const usePdfJs = fileType === 'pdf' && isMobile;

  let finalUrl = fileUrl;
  if (fileType === 'office') {
    finalUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
  }

  // Measure body width for react-pdf Page
  useEffect(() => {
    if (!usePdfJs || !isOpen) return;
    const measure = () => {
      if (bodyRef.current) setPageWidth(bodyRef.current.clientWidth - 16);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (bodyRef.current) ro.observe(bodyRef.current);
    return () => ro.disconnect();
  }, [usePdfJs, isOpen]);

  // Reset page when new file opens
  useEffect(() => {
    if (isOpen) {
      setPageNumber(1);
      setNumPages(0);
      setIsLoading(true);
      setError(false);
      if (!usePdfJs) setViewerKey(k => k + 1);
    }
  }, [fileUrl, isOpen, usePdfJs]);

  useEffect(() => { if (!isOpen) setIsFullscreen(false); }, [isOpen]);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const y = window.scrollY, x = window.scrollX;
    const prev = { overflow: document.body.style.overflow, position: document.body.style.position, top: document.body.style.top };
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${y}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    return () => {
      Object.assign(document.body.style, prev);
      window.scrollTo({ top: y, left: x, behavior: 'instant' });
    };
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (isFullscreen) setIsFullscreen(false); else onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isFullscreen, onClose]);

  const handleRetry = () => { setError(false); setIsLoading(true); setViewerKey(k => k + 1); };
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (!isFullscreen && e.target === overlayRef.current) onClose();
  };

  if (!isOpen) return null;
  const dk = isDarkMode;

  return (
    <div ref={overlayRef} onClick={handleBackdropClick}
      className={`pdf-overlay ${isFullscreen ? 'pdf-overlay--fullscreen' : ''}`}>
      <div className={`pdf-modal ${isFullscreen ? 'pdf-modal--fullscreen' : ''} pdf-modal--enter ${dk ? 'pdf-modal--dark' : 'pdf-modal--light'}`}>
        {/* Accent stripe */}
        <div className="pdf-accent" />

        {/* Header */}
        <header className={`pdf-header ${dk ? 'pdf-header--dark' : 'pdf-header--light'}`}>
          <div className="pdf-header__meta">
            <div className={`pdf-header__icon ${dk ? 'pdf-header__icon--dark' : ''}`}>
              <FileText size={18} strokeWidth={2} />
            </div>
            <div className="pdf-header__text">
              <span className={`pdf-header__name ${dk ? 'text-white' : 'text-slate-900'}`}>{fileName}</span>
              {fileSize && <span className={`pdf-header__size ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{fileSize}</span>}
            </div>
          </div>
          <div className="pdf-header__controls">
            <button onClick={() => window.open(fileUrl, '_blank')} title="Open in browser tab"
              className={`pdf-btn pdf-btn--primary ${dk ? 'pdf-btn--primary-dark' : ''}`}>
              <ExternalLink size={15} strokeWidth={2.2} />
              <span className="pdf-btn__label">Open</span>
            </button>
            <button onClick={() => setIsFullscreen(f => !f)} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              className={`pdf-btn pdf-btn--icon ${dk ? 'pdf-btn--icon-dark' : 'pdf-btn--icon-light'}`}>
              {isFullscreen ? <Minimize2 size={16} strokeWidth={2.2} /> : <Maximize2 size={16} strokeWidth={2.2} />}
            </button>
            <button onClick={onClose} title="Close"
              className={`pdf-btn pdf-btn--close ${dk ? 'pdf-btn--close-dark' : 'pdf-btn--close-light'}`}>
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        {/* Body */}
        <div ref={bodyRef} className={`pdf-body ${dk ? 'pdf-body--dark' : 'pdf-body--light'}`}>
          {/* Loading */}
          {isLoading && !error && (
            <div className={`pdf-loading ${dk ? 'pdf-loading--dark' : 'pdf-loading--light'}`}>
              <div className="pdf-loading__spinner">
                <div className={`pdf-loading__ring ${dk ? 'pdf-loading__ring--dark' : 'pdf-loading__ring--light'}`} />
              </div>
              <p className={`pdf-loading__text ${dk ? 'text-slate-400' : 'text-slate-500'}`}>Loading document…</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className={`pdf-error ${dk ? 'pdf-error--dark' : 'pdf-error--light'}`}>
              <div className={`pdf-error__icon-wrap ${dk ? 'pdf-error__icon-wrap--dark' : 'pdf-error__icon-wrap--light'}`}>
                <AlertTriangle size={28} strokeWidth={1.8} className={dk ? 'text-amber-400' : 'text-amber-500'} />
              </div>
              <h3 className={`pdf-error__title ${dk ? 'text-white' : 'text-slate-900'}`}>Unable to load document</h3>
              <p className={`pdf-error__desc ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                The file couldn't be displayed. Try opening it in a new tab.
              </p>
              <div className="pdf-error__actions">
                <button onClick={() => window.open(fileUrl, '_blank')} className="pdf-btn pdf-btn--primary">
                  <ExternalLink size={15} strokeWidth={2.2} /> Open in browser
                </button>
                {!usePdfJs && (
                  <button onClick={handleRetry}
                    className={`pdf-btn pdf-btn--icon ${dk ? 'pdf-btn--icon-dark' : 'pdf-btn--icon-light'} gap-1.5`}>
                    <RotateCcw size={14} strokeWidth={2.2} />
                    <span className="text-sm font-medium">Retry</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Image */}
          {fileType === 'image' && (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <img src={fileUrl} alt={fileName}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                onLoad={() => setIsLoading(false)}
                onError={() => { setIsLoading(false); setError(true); }} />
            </div>
          )}

          {/* Mobile PDF — rendered via react-pdf (canvas, no iframe) */}
          {usePdfJs && !error && (
            <div className="w-full h-full overflow-y-auto flex flex-col items-center py-2 gap-1">
              <Document
                file={fileUrl}
                onLoadSuccess={({ numPages: n }) => { setNumPages(n); setIsLoading(false); }}
                onLoadError={() => { setIsLoading(false); setError(true); }}
                loading={null}
              >
                <Page
                  key={pageNumber}
                  pageNumber={pageNumber}
                  width={pageWidth}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  onRenderSuccess={() => setIsLoading(false)}
                />
              </Document>
            </div>
          )}

          {/* Desktop PDF / Office / Other — iframe */}
          {!usePdfJs && fileType !== 'image' && (
            <iframe key={viewerKey} src={finalUrl} title={fileName}
              className="pdf-iframe" allow="fullscreen" loading="eager"
              referrerPolicy="no-referrer-when-downgrade"
              onLoad={() => setIsLoading(false)}
              onError={() => { setIsLoading(false); setError(true); }} />
          )}
        </div>

        {/* Footer — page nav on mobile PDF, filename + open otherwise */}
        <footer className={`pdf-footer ${dk ? 'pdf-footer--dark' : 'pdf-footer--light'}`}>
          {usePdfJs && numPages > 0 ? (
            <div className="flex items-center justify-between w-full">
              <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}
                className={`pdf-btn pdf-btn--icon ${dk ? 'pdf-btn--icon-dark' : 'pdf-btn--icon-light'} disabled:opacity-40`}>
                <ChevronLeft size={16} />
              </button>
              <span className={`text-xs font-semibold ${dk ? 'text-[#8b98a5]' : 'text-slate-600'}`}>
                {pageNumber} / {numPages}
              </span>
              <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}
                className={`pdf-btn pdf-btn--icon ${dk ? 'pdf-btn--icon-dark' : 'pdf-btn--icon-light'} disabled:opacity-40`}>
                <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <>
              <span className={`pdf-footer__name ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                {fileName}
                {fileSize && <><span className="pdf-footer__sep">·</span><span>{fileSize}</span></>}
              </span>
              <button onClick={() => window.open(fileUrl, '_blank')}
                className={`pdf-footer__open ${dk ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                <ExternalLink size={12} strokeWidth={2.2} /> Open in browser
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
};

export default PDFViewer;
