import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import logger from "../../utils/logger";

interface Props {
  onScan: (code: string) => void;
  onError: (error: string) => void;
}

export const QRScanner: React.FC<Props> = ({ onScan, onError }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-scanner-container";

  // Initialize camera list on mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          const cameraList = devices.map((d) => ({ id: d.id, label: d.label || `Camera ${d.id}` }));
          setCameras(cameraList);
          // Prefer back camera for mobile
          const backCamera = cameraList.find((c) =>
            c.label.toLowerCase().includes("back") ||
            c.label.toLowerCase().includes("rear")
          );
          setSelectedCamera(backCamera?.id || cameraList[0].id);
        } else {
          setCameraError("No cameras found on this device");
        }
      })
      .catch((err) => {
        logger.error("Camera detection failed:", err);
        setCameraError("Camera access denied or not available");
      });

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    if (!selectedCamera) {
      setCameraError("Please select a camera");
      return;
    }

    try {
      setCameraError(null);
      
      // Create scanner instance if needed
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerContainerId);
      }

      // Check if already scanning
      if (scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
        await scannerRef.current.stop();
      }

      await scannerRef.current.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          logger.info("QR code scanned:", decodedText);
          onScan(decodedText);
          // Optionally stop scanning after successful scan
          // stopScanner();
        },
        (errorMessage) => {
          // Ignore continuous "no QR code" errors during scanning
          if (!errorMessage.includes("No QR code found")) {
            logger.warn("QR scan error:", errorMessage);
          }
        }
      );

      setIsScanning(true);
    } catch (err: unknown) {
      logger.error("Failed to start scanner:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to start camera";
      setCameraError(errorMsg);
      onError(errorMsg);
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      }
    } catch (err) {
      logger.warn("Error stopping scanner:", err);
    }
    setIsScanning(false);
  };

  const handleCameraChange = async (cameraId: string) => {
    setSelectedCamera(cameraId);
    if (isScanning) {
      await stopScanner();
      // Small delay to ensure cleanup
      setTimeout(() => startScanner(), 100);
    }
  };

  return (
    <div className="space-y-4">
      {/* Camera selector */}
      {cameras.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Camera
          </label>
          <select
            value={selectedCamera}
            onChange={(e) => handleCameraChange(e.target.value)}
            disabled={isScanning}
            className="flex-1 h-10 bg-black/20 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
          >
            {cameras.map((cam) => (
              <option key={cam.id} value={cam.id}>
                {cam.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Scanner viewport */}
      <div className="relative">
        <div
          id={scannerContainerId}
          className={`w-full aspect-square max-w-sm mx-auto rounded-xl overflow-hidden bg-black/40 ${
            !isScanning ? "flex items-center justify-center" : ""
          }`}
        >
          {!isScanning && !cameraError && (
            <div className="text-center text-slate-400 p-8">
              <span className="material-symbols-outlined text-5xl mb-3 block">
                qr_code_scanner
              </span>
              <p>Click "Start Scanner" to begin</p>
            </div>
          )}
        </div>

        {/* Scanning indicator overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-primary rounded-lg animate-pulse" />
          </div>
        )}
      </div>

      {/* Error display */}
      {cameraError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-red-500">error</span>
          <p className="text-red-400 text-sm">{cameraError}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center gap-4">
        {!isScanning ? (
          <button
            onClick={startScanner}
            disabled={!selectedCamera || cameras.length === 0}
            className="h-12 px-8 bg-primary hover:bg-primary-dark text-black font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <span className="material-symbols-outlined">videocam</span>
            Start Scanner
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="h-12 px-8 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 flex items-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined">stop</span>
            Stop Scanner
          </button>
        )}
      </div>

      {/* Mobile tips */}
      <p className="text-xs text-slate-500 text-center">
        Position the QR code within the frame. Works best with good lighting.
      </p>
    </div>
  );
};

export default QRScanner;
