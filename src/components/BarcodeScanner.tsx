import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Zap, AlertCircle, Package, Plus, Minus, Camera, Loader2, Search } from 'lucide-react';
import { cn, formatINR } from '../lib/formatters';
import type { Product } from '../types/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onProductFound: (product: Product) => void;
  onProductNotFound?: (barcode: string) => void;
}

type ScanStatus = 'scanning' | 'found' | 'not-found' | 'error' | 'ai-loading' | 'ai-result' | 'ai-not-found';

export default function BarcodeScanner({ isOpen, onClose, products, onProductFound, onProductNotFound }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const [status, setStatus] = useState<ScanStatus>('scanning');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);

  // AI state
  const [aiResult, setAiResult] = useState<{ productName: string; brand: string; variant: string; category: string; confidence: number } | null>(null);
  const [aiMatches, setAiMatches] = useState<Product[]>([]);

  // ── Start camera ──────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        startBarcodeDetection();
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found. Use search bar to find products.');
      } else {
        setCameraError('Could not access camera. ' + (err.message || ''));
      }
      setStatus('error');
    }
  }, []);

  // ── Barcode detection ─────────────────────────────────────
  const startBarcodeDetection = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    if ('BarcodeDetector' in window) {
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code']
      });
      scanIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState !== 4) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) handleBarcodeFound(barcodes[0].rawValue);
        } catch { /* ignore */ }
      }, 200);
    } else {
      // Fallback: @zxing/browser
      import('@zxing/browser').then(({ BrowserMultiFormatReader }) => {
        const reader = new BrowserMultiFormatReader();
        scanIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState !== 4) return;
          try {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0);
            const imageData = canvas.toDataURL('image/png');
            const img = new Image();
            img.src = imageData;
            await new Promise(resolve => { img.onload = resolve; });
            const result = await reader.decodeFromImageElement(img);
            if (result) handleBarcodeFound(result.getText());
          } catch { /* no barcode */ }
        }, 500);
      }).catch(() => {});
    }
  }, []);

  // ── Handle barcode found ──────────────────────────────────
  const handleBarcodeFound = useCallback((barcode: string) => {
    if (status !== 'scanning') return;
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    setScannedBarcode(barcode);
    const product = products.find(p => p.barcode === barcode || p.sku === barcode);
    if (product) {
      setFoundProduct(product);
      setStatus('found');
      setQuantity(1);
      playBeep(800, 150);
    } else {
      setStatus('not-found');
      onProductNotFound?.(barcode);
      playBeep(300, 300);
    }
  }, [products, status, onProductNotFound]);

  // ── AI Photo Identification ───────────────────────────────
  const captureAndIdentify = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }

    setStatus('ai-loading');
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Capture frame
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

    try {
      const functions = getFunctions(undefined, 'us-central1');
      const identifyProductFn = httpsCallable<{ imageBase64: string }, { productName: string; brand: string; variant: string; category: string; confidence: number }>(functions, 'identifyProduct');

      const result = await identifyProductFn({ imageBase64 });
      const data = result.data;
      setAiResult(data);

      if (data.productName === 'Unknown' || data.confidence < 0.3) {
        setStatus('ai-not-found');
        return;
      }

      // Fuzzy search inventory
      const searchTerms = [data.productName, data.brand, data.variant].filter(Boolean).join(' ').toLowerCase();
      const matches = products.filter(p => {
        const pName = (p.name + ' ' + (p.nameHindi || '') + ' ' + (p.categoryName || '')).toLowerCase();
        const words = searchTerms.split(/\s+/).filter(w => w.length > 2);
        const matchCount = words.filter(w => pName.includes(w)).length;
        return matchCount >= Math.max(1, Math.floor(words.length * 0.3));
      }).slice(0, 5);

      setAiMatches(matches);

      if (matches.length === 1) {
        // Single confident match — show directly
        setFoundProduct(matches[0]);
        setStatus('found');
        setQuantity(1);
        playBeep(800, 150);
      } else if (matches.length > 1) {
        setStatus('ai-result');
      } else {
        setStatus('ai-not-found');
      }
    } catch (err: any) {
      console.error('AI identification error:', err);
      // If Cloud Function not deployed yet, do local fuzzy search
      const canvas2 = canvasRef.current;
      if (canvas2) {
        // Fallback: just show AI not found with option to search manually
        setAiResult({ productName: 'Unknown', brand: '', variant: '', category: '', confidence: 0 });
        setStatus('ai-not-found');
      }
    }
  };

  // ── Select AI match ───────────────────────────────────────
  const selectAiMatch = (product: Product) => {
    setFoundProduct(product);
    setStatus('found');
    setQuantity(1);
    playBeep(800, 150);
  };

  // ── Beep sound ────────────────────────────────────────────
  const playBeep = (freq: number, duration: number) => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; gain.gain.value = 0.3;
      osc.start();
      setTimeout(() => { osc.stop(); ctx.close(); }, duration);
    } catch { /* audio unavailable */ }
  };

  // ── Stop camera ───────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setScanning(false);
  }, []);

  // ── Add to bill ───────────────────────────────────────────
  const handleAddToBill = () => {
    if (foundProduct) {
      onProductFound(foundProduct);
      setStatus('scanning'); setFoundProduct(null); setQuantity(1);
      startBarcodeDetection();
    }
  };

  // ── Lifecycle ─────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setStatus('scanning'); setFoundProduct(null); setCameraError('');
      setQuantity(1); setAiResult(null); setAiMatches([]);
      startCamera();
    } else { stopCamera(); }
    return () => stopCamera();
  }, [isOpen]);

  // ── Retry ─────────────────────────────────────────────────
  const retryScan = () => {
    setStatus('scanning'); setFoundProduct(null); setScannedBarcode('');
    setQuantity(1); setAiResult(null); setAiMatches([]);
    startBarcodeDetection();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <canvas ref={canvasRef} className="hidden" />

      {/* Close */}
      <button onClick={() => { stopCamera(); onClose(); }}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-all">
        <X size={20} />
      </button>

      {/* Camera */}
      <video ref={videoRef} playsInline muted
        className={cn('w-full h-full object-cover', (status === 'found' || status === 'ai-loading') && 'opacity-30')} />

      {/* ── Scanning overlay ────────────────────────────── */}
      {status === 'scanning' && scanning && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="relative w-[280px] h-[180px]">
            <div className="absolute top-0 left-0 w-8 h-8" style={{ borderWidth: '3px 0 0 3px', borderStyle: 'solid', borderColor: 'white', borderRadius: '8px 0 0 0' }} />
            <div className="absolute top-0 right-0 w-8 h-8" style={{ borderWidth: '3px 3px 0 0', borderStyle: 'solid', borderColor: 'white', borderRadius: '0 8px 0 0' }} />
            <div className="absolute bottom-0 left-0 w-8 h-8" style={{ borderWidth: '0 0 3px 3px', borderStyle: 'solid', borderColor: 'white', borderRadius: '0 0 0 8px' }} />
            <div className="absolute bottom-0 right-0 w-8 h-8" style={{ borderWidth: '0 3px 3px 0', borderStyle: 'solid', borderColor: 'white', borderRadius: '0 0 8px 0' }} />
            <div className="absolute left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-scan-line" />
          </div>

          <div className="mt-8 text-center pointer-events-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm mb-3">
              <Zap size={14} className="text-yellow-400 animate-pulse" /> Point at barcode
            </div>
            <div>
              <button onClick={captureAndIdentify}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-600/90 backdrop-blur-sm text-white text-sm font-medium hover:bg-purple-700 active:scale-95 transition-all">
                <Camera size={16} /> No barcode? Take Photo to Identify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Loading ──────────────────────────────────── */}
      {status === 'ai-loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-8">
            <Loader2 size={48} className="text-purple-400 animate-spin mx-auto mb-4" />
            <p className="text-white text-lg font-heading font-semibold">Identifying product...</p>
            <p className="text-gray-400 text-sm mt-1">AI is analyzing the photo</p>
          </div>
        </div>
      )}

      {/* ── Camera error ────────────────────────────────── */}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center px-8 max-w-sm">
            <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
            <p className="text-white text-sm mb-4">{cameraError}</p>
            <button onClick={() => { stopCamera(); onClose(); }}
              className="px-6 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium">
              Use Manual Search
            </button>
          </div>
        </div>
      )}

      {/* ── Product Found ───────────────────────────────── */}
      {status === 'found' && foundProduct && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 safe-area-bottom animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
              <Package size={24} className="text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-heading font-bold text-gray-900 truncate">{foundProduct.name}</h3>
              <p className="text-xs text-gray-500">
                {foundProduct.categoryName || 'Product'} &middot; Stock: {foundProduct.currentStock} {foundProduct.unit}
              </p>
            </div>
          </div>

          {scannedBarcode && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-xs text-green-700 mb-4">
              <Zap size={10} /> Barcode: {scannedBarcode}
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 mb-4">
            <span className="text-sm text-gray-600">Price per unit</span>
            <span className="text-lg font-bold font-stat text-purple-700">{formatINR(foundProduct.sellingPrice)}</span>
          </div>

          <div className="flex items-center justify-center gap-4 mb-5">
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-all active:scale-95">
              <Minus size={18} />
            </button>
            <input type="number" value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 h-11 text-center text-xl font-bold font-stat text-gray-900 rounded-xl border border-gray-200 outline-none focus:border-purple-500" />
            <button onClick={() => setQuantity(q => Math.min(q + 1, foundProduct.currentStock))}
              className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-all active:scale-95">
              <Plus size={18} />
            </button>
          </div>

          {quantity >= foundProduct.currentStock && (
            <p className="text-xs text-amber-600 text-center mb-3">Max stock: {foundProduct.currentStock}</p>
          )}

          <button onClick={handleAddToBill}
            className="w-full py-3.5 rounded-2xl bg-green-600 text-white font-semibold font-heading text-base hover:bg-green-700 transition-all active:scale-[0.98] shadow-lg shadow-green-600/30">
            Add to Bill — {formatINR(foundProduct.sellingPrice * quantity)}
          </button>

          <button onClick={retryScan}
            className="w-full mt-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Scan Another Product
          </button>
        </div>
      )}

      {/* ── Barcode Not Found ───────────────────────────── */}
      {status === 'not-found' && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 safe-area-bottom animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
              <AlertCircle size={24} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-base font-heading font-bold text-gray-900">Barcode Not in Inventory</h3>
              <p className="text-xs text-gray-500">Barcode {scannedBarcode}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={captureAndIdentify}
              className="w-full py-3 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-all flex items-center justify-center gap-2">
              <Camera size={16} /> Try AI Photo Identification
            </button>
            <div className="flex gap-2">
              <button onClick={retryScan}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all">
                Scan Again
              </button>
              <button onClick={() => { stopCamera(); onClose(); }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all">
                Search Manually
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Results — Multiple Matches ───────────────── */}
      {status === 'ai-result' && aiResult && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 safe-area-bottom animate-slide-up max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Search size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-base font-heading font-bold text-gray-900">AI Identified: {aiResult.productName}</h3>
              <p className="text-xs text-gray-500">{aiResult.brand} &middot; {aiResult.category} &middot; {Math.round(aiResult.confidence * 100)}% confident</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-3">Select the matching product from your inventory:</p>

          <div className="space-y-2 mb-4">
            {aiMatches.map(p => (
              <button key={p.id} onClick={() => selectAiMatch(p)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-left">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.categoryName} &middot; Stock: {p.currentStock}</div>
                </div>
                <div className="text-sm font-bold font-stat text-purple-700 ml-3">{formatINR(p.sellingPrice)}</div>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={retryScan}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all">
              Scan Again
            </button>
            <button onClick={() => { stopCamera(); onClose(); }}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all">
              Search Manually
            </button>
          </div>
        </div>
      )}

      {/* ── AI Not Found ────────────────────────────────── */}
      {status === 'ai-not-found' && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 safe-area-bottom animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
              <AlertCircle size={24} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-heading font-bold text-gray-900">Could Not Identify Product</h3>
              <p className="text-xs text-gray-500">
                {aiResult && aiResult.productName !== 'Unknown'
                  ? `AI detected "${aiResult.productName}" but no match in inventory`
                  : 'Try taking a clearer photo or search manually'
                }
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={retryScan}
              className="w-full py-3 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-all">
              Try Again
            </button>
            <button onClick={() => { stopCamera(); onClose(); }}
              className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all">
              Search Manually
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scanLine { 0%, 100% { top: 10%; } 50% { top: 85%; } }
        .animate-scan-line { animation: scanLine 2s ease-in-out infinite; position: absolute; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.3s ease-out; }
        .safe-area-bottom { padding-bottom: max(24px, env(safe-area-inset-bottom)); }
      `}</style>
    </div>
  );
}
