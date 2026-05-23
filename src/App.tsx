import React, { useState } from "react";
import { Sparkles, Play, Compass, MapPin, Smile, Camera, Users, Award, ShieldAlert, Laptop, Radio } from "lucide-react";
import CameraCapture from "./components/CameraCapture";
import VibeVisualizer from "./components/VibeVisualizer";
import CanvasGame from "./components/CanvasGame";
import { VibeAnalysisResult } from "./types";
import { cropFaceFromImage } from "./lib/cropHelper";

type AppStage = "landing" | "capture" | "analysing" | "reveal" | "gameplay";

export default function App() {
  const [stage, setStage] = useState<AppStage>("landing");
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  
  const [analysisResult, setAnalysisResult] = useState<VibeAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [streamProgress, setStreamProgress] = useState<{
    step: "init" | "agent1" | "agent2" | "agent3" | "agent4" | "error" | "complete";
    extractionResult: any | null;
    backdropSvg: string | null;
    participantsWithAssets: any[] | null;
    constructorResult: any | null;
    finalPayload: VibeAnalysisResult | null;
  }>({
    step: "init",
    extractionResult: null,
    backdropSvg: null,
    participantsWithAssets: null,
    constructorResult: null,
    finalPayload: null,
  });

  // Transition: Start Hangout
  const handleStartHangout = () => {
    setStage("capture");
  };

  // Transition: Camera Capture Complete -> Call server-side Gemini Multi-Photo Analyzer with streaming NDJSON
  const handleCaptureComplete = async (
    capturedPhotos: string[],
    gpsLocation: { latitude: number; longitude: number } | null
  ) => {
    setPhotos(capturedPhotos);
    setLocation(gpsLocation);
    setStage("analysing");
    setLoading(true);
    setError(null);
    setStreamProgress({
      step: "init",
      extractionResult: null,
      backdropSvg: null,
      participantsWithAssets: null,
      constructorResult: null,
      finalPayload: null,
    });

    try {
      const response = await fetch("/api/analyze-photos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          images: capturedPhotos,
          location: gpsLocation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "The server failed to analyze the gathering photos.");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Local intelligence engine failed to start streaming payload channels. Please retry.");
      }

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          let chunk;
          try {
            chunk = JSON.parse(line);
          } catch (pe) {
            console.warn("Failed to parse chunk line:", line, pe);
            continue;
          }

          if (chunk.step === "error") {
            throw new Error(chunk.message || "An error occurred inside Agent workspace collaboration.");
          }

          if (chunk.step === "agent1") {
            setStreamProgress((prev) => ({
              ...prev,
              step: "agent1",
              extractionResult: chunk.data,
            }));
          } else if (chunk.step === "agent2") {
            setStreamProgress((prev) => ({
              ...prev,
              step: "agent2",
              backdropSvg: chunk.data.backdropSvg,
              participantsWithAssets: chunk.data.participantsWithAssets,
            }));
          } else if (chunk.step === "agent3") {
            setStreamProgress((prev) => ({
              ...prev,
              step: "agent3",
              constructorResult: chunk.data,
            }));
          } else if (chunk.step === "agent4") {
            const vibeData: VibeAnalysisResult = chunk.data;

            // Perform client-side face cropping for each recognized participant
            if (vibeData && Array.isArray(vibeData.participants)) {
              const croppedParticipants = await Promise.all(
                vibeData.participants.map(async (player) => {
                  const photoIdx = player.photoIndex ?? 0;
                  const targetBase64 = capturedPhotos[photoIdx] || capturedPhotos[0];

                  if (targetBase64 && player.faceBox) {
                    try {
                      const croppedUrl = await cropFaceFromImage(targetBase64, player.faceBox);
                      return { ...player, croppedFaceUrl: croppedUrl };
                    } catch (cropErr) {
                      console.warn("Could not crop face for player:", player.detectedName, cropErr);
                      return player;
                    }
                  }
                  return player;
                })
              );
              vibeData.participants = croppedParticipants;
            }

            setAnalysisResult(vibeData);
            setStreamProgress((prev) => ({
              ...prev,
              step: "complete",
              finalPayload: vibeData,
            }));

            // Let the completed compilation state display momentarily before visualizer transition
            setTimeout(() => {
              setStage("reveal");
            }, 800);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to contact local intelligence agents. Check your API configuration.");
      setStage("reveal"); // VibeVisualizer handles error states
    } finally {
      setLoading(false);
    }
  };

  // Switch to the Canvas gameplay screen
  const handleLaunchGame = () => {
    if (analysisResult) {
      setStage("gameplay");
    }
  };

  const handleReset = () => {
    setPhotos([]);
    setLocation(null);
    setAnalysisResult(null);
    setError(null);
    setStage("landing");
  };

  return (
    <div className="min-h-screen bg-[#fafafc] text-slate-800 flex flex-col justify-between" id="hangout-main-frame">
      {/* 1. TOP UTILITY HEADER RAIL */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-linear-to-tr from-amber-500 to-rose-500 rounded-xl flex items-center justify-center font-black text-white text-base shadow-md">
              H
            </div>
            <span className="font-black text-xl tracking-tight text-slate-900 font-mono">
              Hangout<span className="text-amber-500 font-sans">.</span>
            </span>
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full select-none uppercase tracking-wide">
              Gemini 3.5 Flash
            </span>
          </div>

          <div className="flex items-center gap-3">
            {stage !== "landing" && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100/80 px-3 py-1.5 rounded-lg border border-rose-100/50 transition"
              >
                Reset Party
              </button>
            )}
            <div className="text-[10px] text-slate-400 font-mono font-bold hidden sm:block">
              SERVER IP: PROXY 3000
            </div>
          </div>
        </div>
      </header>

      {/* 2. CORE STAGE DISPLAY ENGINE COMPONENTS */}
      <main className="flex-1 flex flex-col justify-center py-6 px-4">
        {/* LANDING PAGE ROUTESTAGE */}
        {stage === "landing" && (
          <div className="max-w-3xl mx-auto text-center space-y-8 my-8" id="landing-stage">
            <div className="space-y-4">
              <span className="bg-amber-100 text-amber-800 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-600 fill-amber-600" /> Instant Friends Gathering AI Generator
              </span>
              
              <h1 className="text-5xl md:text-7xl font-sans tracking-tight font-black leading-tight text-slate-900">
                Turn your <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500">Selfies</span> into a live <span className="underline decoration-amber-400 underline-offset-8">Custom Game</span>
              </h1>

              <p className="text-slate-600 text-base md:text-lg max-w-xl mx-auto font-medium leading-relaxed">
                No setup, no downloads! Snap real-time selfies of your friends, permission your neighborhood location, and let Gemini cook up a custom-made HTML5 Canvas multiplayer arcade game tailored to your crew's aesthetics!
              </p>
            </div>

            {/* Social Visual Cards Collage */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="bg-white p-4.5 rounded-2xl border border-slate-100 text-left shadow-2xs">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 mb-3 font-bold">
                  <Camera className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">1. Snap Selfies</h4>
                <p className="text-xs text-slate-500 mt-1">Take 3-6 quick snapshots of your gatherers directly via camera lens.</p>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-100 text-left shadow-2xs">
                <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-600 mb-3 font-bold">
                  <Compass className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">2. Geo-Context Vibe</h4>
                <p className="text-xs text-slate-500 mt-1">Combine physical coordinates with visual wardrobe hues for custom theme roasts.</p>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-slate-100 text-left shadow-2xs">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 mb-3 font-bold">
                  <Smile className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">3. Play Customized</h4>
                <p className="text-xs text-slate-500 mt-1">Control your custom face emoji on a dynamic Canvas field! Set target high scores.</p>
              </div>
            </div>

            {/* Trigger Button */}
            <div className="pt-4">
              <button
                type="button"
                id="start-hangout-landing-trigger"
                onClick={handleStartHangout}
                className="bg-linear-to-r from-amber-500 via-rose-500 to-indigo-500 hover:from-amber-600 hover:via-rose-600 hover:to-indigo-600 text-white font-black px-10 py-5 rounded-2xl text-lg transition duration-200 shadow-lg inline-flex items-center gap-2 transform hover:scale-[1.03] active:scale-[0.97]"
              >
                <Play className="w-5 h-5 fill-white" /> Start a Hangout!
              </button>
            </div>
          </div>
        )}

        {/* STAGE: CAMERA CAPTURING */}
        {stage === "capture" && (
          <CameraCapture onComplete={handleCaptureComplete} />
        )}

        {/* STAGE: MULTIMODAL LOADING & SWARM SCREEN */}
        {stage === "analysing" && (
          <VibeVisualizer
            loading={true}
            error={null}
            result={null}
            onStartGame={handleLaunchGame}
            onRetry={handleReset}
            streamProgress={streamProgress}
          />
        )}

        {/* STAGE: DIAGNOSISLocked REVEAL PAGE */}
        {stage === "reveal" && (
          <VibeVisualizer
            loading={loading}
            error={error}
            result={analysisResult}
            onStartGame={handleLaunchGame}
            onRetry={handleReset}
          />
        )}

        {/* STAGE: CANVAS PLAYGROUND SCENE */}
        {stage === "gameplay" && analysisResult && (
          <CanvasGame
            gameConfig={analysisResult.gameConfig}
            participants={analysisResult.participants}
            onBack={() => setStage("reveal")}
          />
        )}
      </main>

      {/* 3. COHESIVE FOOTER STATEMENT */}
      <footer className="border-t border-slate-100 bg-white py-4 text-center text-xs text-slate-400 font-medium">
        <p>
          Hangout — Google I/O Hackathon Demo App powered by Gemini-3.5-Flash
        </p>
      </footer>
    </div>
  );
}
