"use client";

import React, { useRef, useState, useEffect } from "react";
import { Camera, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

interface CameraCaptureProps {
  onPhotoCaptured: (photoUrl: string) => void;
  photoUrl?: string | null;
}

export default function CameraCapture({ onPhotoCaptured, photoUrl }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(photoUrl || null);
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false);

  const startCamera = async () => {
    setIsStartingCamera(true);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Direct camera access is not supported on this browser.");
      }

      // Try environment (rear) camera first, fallback to any video camera
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to access device camera";
      setCameraError(msg);
      setIsCameraActive(false);
    } finally {
      setIsStartingCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    setCapturedImage(dataUrl);
    onPhotoCaptured(dataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    onPhotoCaptured("");
    startCamera();
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-800">
          Photo Evidence of Returned Equipment
        </label>
        {capturedImage && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Photo Attached
          </span>
        )}
      </div>

      {/* Captured Image Preview */}
      {capturedImage ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={capturedImage}
            alt="Equipment return photograph"
            className="w-full h-56 object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-between p-3">
            <span className="text-xs text-white/90 font-medium">
              Photo captured in return area
            </span>
            <button
              type="button"
              onClick={retakePhoto}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-semibold shadow transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retake Photo
            </button>
          </div>
        </div>
      ) : isCameraActive ? (
        /* Live Camera Feed */
        <div className="relative rounded-xl overflow-hidden bg-black border border-slate-300">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="w-full h-56 object-cover"
          />
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3 px-4">
            <button
              type="button"
              onClick={capturePhoto}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-semibold shadow-lg transition active:scale-95"
            >
              <Camera className="w-4 h-4" /> Capture Photo
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-800 text-white rounded-full text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Camera Activation / Upload Fallback Card */
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center bg-white hover:bg-slate-50/50 transition">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-50 text-red-700 flex items-center justify-center mb-3">
            <Camera className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800">
            Take a Photo of the Equipment in the Return Area
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Place the item on the sports equipment return counter or designated rack and take a clear photo.
          </p>

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={startCamera}
              disabled={isStartingCamera}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0B2545] hover:bg-[#133966] text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              <Camera className="w-4 h-4 text-red-400" />
              {isStartingCamera ? "Starting Camera..." : "Open Device Camera"}
            </button>
          </div>

          {cameraError && (
            <div className="mt-3 flex items-start gap-2 text-left bg-amber-50 text-amber-900 border border-amber-200 rounded-lg p-2.5 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Camera notice</p>
                <p className="text-amber-800 text-[11px]">{cameraError}. Please enable camera access in your browser to take return photo evidence.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
