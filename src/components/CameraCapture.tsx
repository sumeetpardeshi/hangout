import React, { useRef, useState, useEffect } from "react";
import { Camera, MapPin, Trash2, CheckCircle, Upload, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { CapturedImage } from "../types";

interface CameraCaptureProps {
  onComplete: (photos: string[], location: { latitude: number; longitude: number } | null) => void;
}

const FUN_PROMPTS = [
  "Pose 1: Everyone show your absolute coolest power stance! ⚡",
  "Pose 2: Make faces as if you just saw a scary robot! 🤖",
  "Pose 3: Do a premium corporate team photo smile! 👔",
  "Pose 4: Point at each other like the Spider-man meme! 🕸️",
  "Pose 5: Act completely exhausted from coding! ☕",
  "Pose 6: Free style - show off your outfit! 💃"
];

export default function CameraCapture({ onComplete }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [photos, setPhotos] = useState<CapturedImage[]>([]);
  const [currentPromptIdx, setCurrentPromptIdx] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  
  // Geolocation handling
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locPermission, setLocPermission] = useState<"idle" | "getting" | "authorized" | "denied">("idle");
  const [locError, setLocError] = useState<string | null>(null);

  // Drag and drop / local file upload fallback
  const [dragActive, setDragActive] = useState(false);

  // Initialize camera stream
  async function startCamera() {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError(
        "Could not access camera. Make sure permissions are allowed, or drag-and-drop selfie files below!"
      );
      setCameraActive(false);
    }
  }

  // Stop camera helper
  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  // Capture photo from video feed
  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Extract base64
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        
        const newPhoto: CapturedImage = {
          id: Math.random().toString(36).substring(2, 9),
          base64: dataUrl,
          timestamp: new Date().toISOString(),
          label: FUN_PROMPTS[currentPromptIdx % FUN_PROMPTS.length]
        };

        setPhotos((prev) => [...prev, newPhoto]);
        setCurrentPromptIdx((prev) => prev + 1);
        
        // Trigger tiny flash style effect
        const overlay = document.getElementById("flash-overlay");
        if (overlay) {
          overlay.classList.add("opacity-100");
          setTimeout(() => overlay.classList.remove("opacity-100"), 150);
        }
      }
    } catch (err) {
      console.error("Capture err:", err);
    }
  };

  // Flip camera toggle
  const flipCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  // Request location
  const fetchLocation = () => {
    setLocPermission("getting");
    setLocError(null);
    if (!navigator.geolocation) {
      setLocError("Geolocation not supported by your browser.");
      setLocPermission("denied");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocPermission("authorized");
      },
      (error) => {
        console.warn("Location prompt dismissed:", error);
        setLocError("Location lookup was skipped or blocked.");
        setLocPermission("denied");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Delete snapshot
  const deletePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  // Drag and Drop File Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (filesList: File[]) => {
    filesList.forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === "string") {
          const newPhoto: CapturedImage = {
            id: Math.random().toString(36).substring(2, 9),
            base64: event.target.result,
            timestamp: new Date().toISOString(),
            label: "Imported Selfie File"
          };
          setPhotos(prev => [...prev, newPhoto]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Submit and launch game analysis
  const handleSubmit = () => {
    if (photos.length === 0) return;
    stopCamera();
    onComplete(photos.map(p => p.base64), location);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6" id="camera-capture-screen">
      {/* Dynamic Header */}
      <div className="text-center mb-6">
        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" /> Stage 1: Capturing Friends Vibe
        </span>
        <h1 className="text-3xl font-extrabold text-slate-800 mt-2 tracking-tight">
          Snap Your Crew Selfies
        </h1>
        <p className="text-slate-600 max-w-md mx-auto mt-1 text-sm">
          Snap 3 to 6 fun selfies or upload photos of your friends. Gemini will customize a high-energy dashboard & canvas arcade and location-guided play!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Camera & Preview Feed (8 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video shadow-xl border-4 border-slate-800 flex flex-col justify-center items-center">
            {/* Flash Effect Overlay */}
            <div
              id="flash-overlay"
              className="absolute inset-0 bg-white opacity-0 pointer-events-none transition-opacity duration-150 z-20"
            />

            {cameraActive && !cameraError ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover scale-x-[-1]"
                  playsInline
                  muted
                />
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium text-white z-10 border border-white/10 flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" /> Live Viewfinder
                </div>
              </>
            ) : (
              <div className="text-center p-6 space-y-3 text-slate-400">
                <Camera className="w-12 h-12 mx-auto stroke-slate-500 animate-bounce" />
                <p className="text-sm font-medium">Camera is offline</p>
                {cameraError && (
                  <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 max-w-sm">
                    {cameraError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={startCamera}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2 rounded-lg text-xs transition duration-200 shadow-sm inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-trigger Access
                </button>
              </div>
            )}

            {/* Prompt HUD overlay inside camera */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent p-4 flex flex-col justify-end">
              <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider font-mono">
                Active Group Photo Task:
              </p>
              <h3 className="text-white text-base md:text-lg font-bold">
                {FUN_PROMPTS[photos.length % FUN_PROMPTS.length]}
              </h3>
            </div>
          </div>

          {/* Action buttons under viewport */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex gap-2">
              <button
                type="button"
                id="camera-capture-trigger"
                disabled={!cameraActive}
                onClick={capturePhoto}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold px-5 py-3 rounded-lg text-sm transition-all duration-200 shadow-md inline-flex items-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Camera className="w-4 h-4" /> Snap Snapshot
              </button>
              <button
                type="button"
                onClick={flipCamera}
                disabled={!cameraActive}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-3 rounded-lg text-sm transition transition duration-200 flex items-center gap-1.5"
                title="Switch Camera Device"
              >
                <RefreshCw className="w-4 h-4" /> Flip Lens
              </button>
            </div>

            {/* Geolocation Hook HUD */}
            <div>
              {locPermission === "authorized" && location ? (
                <div className="bg-emerald-50 text-emerald-800 text-xs font-medium px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 animate-bounce" /> Location Integrated
                </div>
              ) : locPermission === "getting" ? (
                <div className="bg-amber-50 text-amber-800 text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Fetching GPS coordinates...
                </div>
              ) : (
                <button
                  type="button"
                  onClick={fetchLocation}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold px-3.5 py-2.5 rounded-lg border border-amber-300 flex items-center gap-1.5 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" /> Fetch Location HUD
                </button>
              )}
            </div>
          </div>

          {/* Drag and Drop Fallback zone conform usability specs */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
              dragActive ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
            }`}
          >
            <Upload className="w-6 h-6 mx-auto stroke-slate-400 mb-1" />
            <p className="text-xs font-medium text-slate-600">
              Drag & drop group photos here or{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-amber-600 hover:underline font-semibold"
              >
                browse computer files
              </button>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Captured Gallery Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[420px]">
            <h2 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Snapshots Gallery ({photos.length})</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-bold">
                Goal: 3-6
              </span>
            </h2>

            {photos.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-slate-400">
                <AlertCircle className="w-10 h-10 stroke-slate-300 mb-2" />
                <p className="text-xs leading-relaxed max-w-[200px]">
                  No snapshots snapped yet. Stand in front of your camera and click **Snap Snapshot**!
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 py-3 pr-1 space-y-3 scrollbar-thin">
                {photos.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 items-center justify-between relative group hover:border-amber-200 transition"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={item.base64}
                        alt="selfie slice"
                        className="w-12 h-12 object-cover rounded-lg shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-left">
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase">
                          Photo #{index + 1}
                        </span>
                        <p className="text-xs text-slate-700 font-semibold truncate max-w-[170px] mt-0.5">
                          {item.label || "Group snapshot"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deletePhoto(item.id)}
                      className="text-slate-400 hover:text-rose-600 transition p-1.5 hover:bg-rose-50 rounded-lg"
                      title="Delete snapshot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Launch Game Generator bar */}
            <div className="border-t border-slate-100 pt-4 mt-3">
              <button
                type="button"
                id="assemble-game-trigger"
                onClick={handleSubmit}
                disabled={photos.length < 1}
                className="w-full bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-slate-900 font-black py-4.5 rounded-xl text-md transition duration-200 shadow-md inline-flex items-center justify-center gap-2 transform hover:translate-y-[-1px] disabled:translate-y-0"
              >
                <CheckCircle className="w-5 h-5 text-slate-900" /> Let AI Generate Game!
              </button>
              {photos.length > 0 && photos.length < 3 && (
                <p className="text-center text-[10px] text-amber-600 font-semibold mt-1.5 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Tip: Snap at least 3 photos for richer game characters!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
