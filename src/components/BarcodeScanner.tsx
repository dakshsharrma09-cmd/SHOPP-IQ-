import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Zap, AlertCircle, Package, Plus, Minus } from 'lucide-react';
import { cn } from '../lib/formatters';
import type { Product } from '../types/firestore';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onProductFound: (product: Product) => void;
  onProductNotFound?: (barcode: string) => void;
}

export default function BarcodeScanner({ isOpen, onClose, products, onProductFound, onProductNotFound }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const [status, setStatus] = useState<'scanning' | 'found' | 'not-found' | 'error' | 'photo'>('scanning');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);

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
        setCameraError('No camera found on this device. Use the search bar to find products.');
      } else {
        setCameraError('Could not access camera. ' + (err.message || ''));
      }
      setStatus('error');
    }
  }, []);

  // ── Barcode detection using BarcodeDetector API or canvas scanning ──
  const startBarcodeDetection = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    // Use native BarcodeDetector if available (Chrome/Android)
    if ('BarcodeDetector' in window) {
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code']
      });

      scanIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState !== 4) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const barcode = barcodes[0].rawValue;
            handleBarcodeFound(barcode);
          }
        } catch { /* ignore detection errors */ }
      }, 200);
    } else {
      // Fallback: use @zxing/browser via dynamic import
      import('@zxing/browser').then(({ BrowserMultiFormatReader }) => {
        const reader = new BrowserMultiFormatReader();
        
        scanIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState !== 4) return;
          try {
            // Draw video frame to canvas and decode
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
            if (result) {
              handleBarcodeFound(result.getText());
            }
          } catch { /* no barcode found in this frame */ }
        }, 500);
      }).catch(() => {
        // If @zxing fails to load, just use manual scanning
        console.warn('Barcode reader library not available');
      });
    }
  }, []);

  // ── Handle barcode found ──────────────────────────────────
  const handleBarcodeFound = useCallback((barcode: string) => {
    if (status !== 'scanning') return;
    
    // Stop scanning
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScannedBarcode(barcode);

    // Search products by barcode
    const product = products.find(p =>
      p.barcode === barcode || p.sku === barcode
    );

    if (product) {
      setFoundProduct(product);
      setStatus('found');
      setQuantity(1);
      // Play success beep
      playBeep(800, 150);
    } else {
      setStatus('not-found');
      onProductNotFound?.(barcode);
      // Play error beep
      playBeep(300, 300);
    }
  }, [products, status, onProductNotFound]);

  // ── Play beep sound ───────────────────────────────────────
  const playBeep = (freq: number, duration: number) => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.value = 0.3;
      osc.start();
      setTimeout(() => { osc.stop(); ctx.close(); }, duration);
    } catch { /* audio not available */ }
  };

  // ── Stop camera ───────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  // ── Handle add to bill ────────────────────────────────────
  const handleAddToBill = () => {
    if (foundProduct) {
      // Add product multiple times for quantity
      onProductFound(foundProduct);
      // Reset for next scan
      setStatus('scanning');
      setFoundProduct(null);
      setQuantity(1);
      startBarcodeDetection();
    }
  };

  // ── Lifecycle ─────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setStatus('scanning');
      setFoundProduct(null);
      setCameraError('');
      setQuantity(1);
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  // ── Retry scan ────────────────────────────────────────────
  const retryScan = () => {
    setStatus('scanning');
    setFoundProduct(null);
    setScannedBarcode('');
    setQuantity(1);
    startBarcodeDetection();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Close button */}
      <button onClick={() => { stopCamera(); onClose(); }}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-all">
        <X size={20} />
      </button>

      {/* Camera view */}
      <video ref={videoRef} playsInline muted
        className={cn('w-full h-full object-cover', status === 'found' && 'opacity-30')} />

      {/* Scanning overlay */}
      {status === 'scanning' && scanning && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Scanner frame */}
          <div className="relative w-[280px] h-[180px]">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-white rounded-tl-lg" style={{ borderWidth: '3px 0 0 3px' }} />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-white rounded-tr-lg" style={{ borderWidth: '3px 3px 0 0' }} />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-white rounded-bl-lg" style={{ borderWidth: '0 0 3px 3px' }} />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-white rounded-br-lg" style={{ borderWidth: '0 3px 3px 0' }} />

            {/* Scanning line */}
            <div className="absolute left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-scan-line" />
          </div>

          {/* Label */}
          <div className="absolute bottom-32 left-0 right-0 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm">
              <Zap size={14} className="text-yellow-400 animate-pulse" />
              Point at barcode to scan
            </div>
          </div>
        </div>
      )}

      {/* Camera error */}
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

      {/* ── Product Found Sheet ────────────────────────────── */}
      {status === 'found' && foundProduct && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slide-up p-6 safe-area-bottom">
          {/* Success indicator */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
              <Package size={24} className="text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-heading font-bold text-gray-900">{foundProduct.name}</h3>
              <p className="text-xs text-gray-500">
                {foundProduct.categoryName || 'Product'} • Stock: {foundProduct.currentStock} {foundProduct.unit}
              </p>
            </div>
          </div>

          {/* Barcode badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-xs text-green-700 mb-4">
            <Zap size={10} /> Barcode: {scannedBarcode}
          </div>

          {/* Price */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 mb-4">
            <span className="text-sm text-gray-600">Price per unit</span>
            <span className="text-lg font-bold font-stat text-purple-700">
              {'\u20B9'}{foundProduct.sellingPrice}
            </span>
          </div>

          {/* Quantity stepper */}
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

          {/* Stock warning */}
          {quantity >= foundProduct.currentStock && (
            <p className="text-xs text-amber-600 text-center mb-3">Max stock: {foundProduct.currentStock}</p>
          )}

          {/* Add to bill button */}
          <button onClick={handleAddToBill}
            className="w-full py-3.5 rounded-2xl bg-green-600 text-white font-semibold font-heading text-base hover:bg-green-700 transition-all active:scale-[0.98] shadow-lg shadow-green-600/30">
            Add to Bill — {'\u20B9'}{(foundProduct.sellingPrice * quantity).toLocaleString('en-IN')}
          </button>

          {/* Scan next */}
          <button onClick={retryScan}
            className="w-full mt-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Scan Another Product
          </button>
        </div>
      )}

      {/* ── Not Found Sheet ───────────────────────────────── */}
      {status === 'not-found' && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slide-up p-6 safe-area-bottom">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
              <AlertCircle size={24} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-base font-heading font-bold text-gray-900">Product Not Found</h3>
              <p className="text-xs text-gray-500">Barcode {scannedBarcode} is not in your inventory</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={retryScan}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all">
              Scan Again
            </button>
            <button onClick={() => { stopCamera(); onClose(); }}
              className="flex-1 py-3 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-all">
              Search Manually
            </button>
          </div>
        </div>
      )}

      {/* Scan line animation styles */}
      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 10%; }
          50% { top: 85%; }
        }
        .animate-scan-line {
          animation: scanLine 2s ease-in-out infinite;
          position: absolute;
        }
        .safe-area-bottom {
          padding-bottom: max(24px, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}
