import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Zap, AlertCircle, Package, Plus, Pencil } from 'lucide-react';
import { cn, formatINR } from '../lib/formatters';
import type { Product } from '../types/firestore';

interface InventoryScannerProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onNewProduct: (barcode: string) => void;
  onEditProduct: (product: Product) => void;
}

type ScanStatus = 'scanning' | 'found' | 'not-found' | 'error';

export default function InventoryScanner({ isOpen, onClose, products, onNewProduct, onEditProduct }: InventoryScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const processingRef = useRef(false);

  const [status, setStatus] = useState<ScanStatus>('scanning');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanCount, setScanCount] = useState(0);

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
        setCameraError('Camera permission denied. Please allow camera access in browser settings.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not access camera. ' + (err.message || ''));
      }
      setStatus('error');
    }
  }, []);

  const startBarcodeDetection = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    processingRef.current = false;

    if ('BarcodeDetector' in window) {
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code']
      });
      scanIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState !== 4 || processingRef.current) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) handleBarcodeFound(barcodes[0].rawValue);
        } catch { /* ignore */ }
      }, 200);
    } else {
      import('@zxing/browser').then(({ BrowserMultiFormatReader }) => {
        const reader = new BrowserMultiFormatReader();
        scanIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState !== 4 || processingRef.current) return;
          try {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0);
            const img = new Image();
            img.src = canvas.toDataURL('image/png');
            await new Promise(resolve => { img.onload = resolve; });
            const result = await reader.decodeFromImageElement(img);
            if (result) handleBarcodeFound(result.getText());
          } catch { /* no barcode */ }
        }, 500);
      }).catch(() => {});
    }
  }, []);

  const handleBarcodeFound = useCallback((barcode: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    setScannedBarcode(barcode);
    setScanCount(c => c + 1);

    const product = products.find(p => p.barcode === barcode || p.sku === barcode);
    if (product) {
      setFoundProduct(product);
      setStatus('found');
      playBeep(800, 150);
    } else {
      setStatus('not-found');
      playBeep(400, 200);
    }
  }, [products]);

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

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setScanning(false);
    processingRef.current = false;
  }, []);

  const resetForNextScan = () => {
    setStatus('scanning'); setFoundProduct(null); setScannedBarcode('');
    processingRef.current = false;
    startBarcodeDetection();
  };

  const handleAddNew = () => {
    stopCamera();
    onClose();
    onNewProduct(scannedBarcode);
  };

  const handleEdit = () => {
    if (foundProduct) {
      stopCamera();
      onClose();
      onEditProduct(foundProduct);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStatus('scanning'); setFoundProduct(null); setCameraError('');
      setScannedBarcode(''); setScanCount(0);
      processingRef.current = false;
      startCamera();
    } else { stopCamera(); }
    return () => stopCamera();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-black/60">
        <div className="text-white">
          <div className="text-sm font-semibold">Inventory Scanner</div>
          <div className="text-[11px] text-gray-300">{scanCount} scanned</div>
        </div>
        <button onClick={() => { stopCamera(); onClose(); }}
          className="w-9 h-9 rounded-md bg-white/10 flex items-center justify-center text-white">
          <X size={18} />
        </button>
      </div>

      {/* Camera */}
      <video ref={videoRef} playsInline muted
        className={cn('w-full h-full object-cover', status !== 'scanning' && 'opacity-30')} />

      {/* Scanning overlay */}
      {status === 'scanning' && scanning && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="relative w-[280px] h-[180px]">
            <div className="absolute top-0 left-0 w-8 h-8" style={{ borderWidth: '3px 0 0 3px', borderStyle: 'solid', borderColor: 'white', borderRadius: '8px 0 0 0' }} />
            <div className="absolute top-0 right-0 w-8 h-8" style={{ borderWidth: '3px 3px 0 0', borderStyle: 'solid', borderColor: 'white', borderRadius: '0 8px 0 0' }} />
            <div className="absolute bottom-0 left-0 w-8 h-8" style={{ borderWidth: '0 0 3px 3px', borderStyle: 'solid', borderColor: 'white', borderRadius: '0 0 0 8px' }} />
            <div className="absolute bottom-0 right-0 w-8 h-8" style={{ borderWidth: '0 3px 3px 0', borderStyle: 'solid', borderColor: 'white', borderRadius: '0 0 8px 0' }} />
            <div className="absolute left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-scan-line" />
          </div>
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-black/60 text-white text-sm">
              <Zap size={14} className="text-yellow-400 animate-pulse" /> Scan barcode to add to inventory
            </div>
          </div>
        </div>
      )}

      {/* Camera error */}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center px-8 max-w-sm">
            <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
            <p className="text-white text-sm mb-4">{cameraError}</p>
            <button onClick={() => { stopCamera(); onClose(); }}
              className="px-6 py-2.5 rounded-md bg-purple-700 text-white text-sm font-medium">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Product Found */}
      {status === 'found' && foundProduct && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-2xl p-5 safe-area-bottom animate-slide-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-md bg-green-100 flex items-center justify-center">
              <Package size={20} className="text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">{foundProduct.name}</h3>
              <p className="text-xs text-gray-500">
                {foundProduct.categoryName || 'Product'} · Stock: {foundProduct.currentStock} {foundProduct.unit}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="p-2 bg-gray-50 rounded-md text-center">
              <div className="text-[10px] text-gray-500">Purchase</div>
              <div className="text-sm font-semibold text-gray-900">{formatINR(foundProduct.purchasePrice)}</div>
            </div>
            <div className="p-2 bg-gray-50 rounded-md text-center">
              <div className="text-[10px] text-gray-500">Selling</div>
              <div className="text-sm font-semibold text-gray-900">{formatINR(foundProduct.sellingPrice)}</div>
            </div>
            <div className="p-2 bg-gray-50 rounded-md text-center">
              <div className="text-[10px] text-gray-500">Stock</div>
              <div className="text-sm font-semibold text-gray-900">{foundProduct.currentStock}</div>
            </div>
          </div>

          <div className="text-xs text-green-600 font-medium mb-3 text-center">Already in your inventory</div>

          <div className="flex gap-2">
            <button onClick={handleEdit}
              className="flex-1 py-2.5 rounded-md border border-gray-200 text-gray-700 text-sm font-medium flex items-center justify-center gap-1.5">
              <Pencil size={14} /> Edit
            </button>
            <button onClick={resetForNextScan}
              className="flex-1 py-2.5 rounded-md bg-purple-700 text-white text-sm font-medium">
              Scan Next
            </button>
          </div>
        </div>
      )}

      {/* Not Found — Add New Product */}
      {status === 'not-found' && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-2xl p-5 safe-area-bottom animate-slide-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-md bg-amber-100 flex items-center justify-center">
              <AlertCircle size={20} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">New Product</h3>
              <p className="text-xs text-gray-500">
                Barcode <span className="font-mono font-medium text-gray-700">{scannedBarcode}</span> not in inventory
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={handleAddNew}
              className="w-full py-2.5 rounded-md bg-purple-700 text-white text-sm font-medium flex items-center justify-center gap-1.5">
              <Plus size={16} /> Add to Inventory
            </button>
            <button onClick={resetForNextScan}
              className="w-full py-2 rounded-md border border-gray-200 text-gray-600 text-sm">
              Scan Again
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scanLine { 0%, 100% { top: 10%; } 50% { top: 85%; } }
        .animate-scan-line { animation: scanLine 2s ease-in-out infinite; position: absolute; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.3s ease-out; }
        .safe-area-bottom { padding-bottom: max(20px, env(safe-area-inset-bottom)); }
      `}</style>
    </div>
  );
}
