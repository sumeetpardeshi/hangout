import React, { useState, useEffect } from "react";
import { Sparkles, Compass, ShieldCheck, MapPin, Zap, User, Star, Flame, Trophy, Play } from "lucide-react";
import { VibeAnalysisResult } from "../types";

interface VibeVisualizerProps {
  loading: boolean;
  error: string | null;
  result: VibeAnalysisResult | null;
  onStartGame: () => void;
  onRetry: () => void;
  streamProgress?: {
    step: "init" | "agent1" | "agent2" | "agent3" | "agent4" | "error" | "complete";
    extractionResult: any | null;
    backdropSvg: string | null;
    participantsWithAssets: any[] | null;
    constructorResult: any | null;
    finalPayload: VibeAnalysisResult | null;
  };
}

const SWARM_MESSAGES = [
  "Initializing Google AI Studio Code Workspace Swarm Cluster... 🤖",
  "Transmitting captured team selfie pixels up to workspace container... 👾",
  "Decoding raw visual matrix for facet/expression coordinates... 📐",
  "Agent 1 studying wardrobe colors and props catalog... 🎨",
  "Determining regional location contexts and spatial dimensions... 🗺️",
  "Agent 2 sketching high-fidelity widescreen graphics... 🖼️",
  "Designing adorable oversized bobblehead SVG figurines... 🎎",
  "Agent 3 tailoring retro mechanics formulas to visual elements... ⚙️",
  "Mapping relevant physical items into collectable scores and hazards... 🚀",
  "Calibrating obstacle velocities and physical engine scopes... 🏃",
  "Agent 4 synthesizing final configuration into compile ready templates... ⚡",
  "Polishing visual boundaries and active dialogue structures... 🏅",
  "Spawning custom HTML5 Canvas arcade sandbox environment... 🎪",
  "Validating and serving live team arcade instance... 🏁"
];

export default function VibeVisualizer({
  loading,
  error,
  result,
  onStartGame,
  onRetry,
  streamProgress
}: VibeVisualizerProps) {
  const [swarmMsgIdx, setSwarmMsgIdx] = useState(0);
  const [dots, setDots] = useState<Array<{ x: number; y: number; vx: number; vy: number; color: string }>>([]);

  // Swarm text ticker
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setSwarmMsgIdx((prev) => (prev + 1) % SWARM_MESSAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [loading]);

  // Swarm dots particle animation inside loading screen (fallback)
  useEffect(() => {
    if (!loading) return;
    const tempDots = Array.from({ length: 25 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      color: ["#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6"][Math.floor(Math.random() * 5)]
    }));
    setDots(tempDots);

    let animationId: number;
    const updateParticles = () => {
      setDots((prev) =>
        prev.map((dot) => {
          let nx = dot.x + dot.vx;
          let ny = dot.y + dot.vy;
          let nvx = dot.vx;
          let nvy = dot.vy;

          if (nx < 2 || nx > 98) nvx = -nvx;
          if (ny < 2 || ny > 98) nvy = -nvy;

          return { ...dot, x: nx, y: ny, vx: nvx, vy: nvy };
        })
      );
      animationId = requestAnimationFrame(updateParticles);
    };

    animationId = requestAnimationFrame(updateParticles);
    return () => cancelAnimationFrame(animationId);
  }, [loading]);

  // 1. DYNAMIC LOADING SCREEN (STREAM CHUNKS OR GENERIC LOADER)
  if (loading) {
    const p = streamProgress || {
      step: "init" as const,
      extractionResult: null,
      backdropSvg: null,
      participantsWithAssets: null,
      constructorResult: null,
      finalPayload: null
    };

    // Calculate overall model compilation percentage
    let progressPercent = 15;
    if (p.step === "agent1") progressPercent = 35;
    if (p.step === "agent2") progressPercent = 65;
    if (p.step === "agent3") progressPercent = 85;
    if (p.step === "complete") progressPercent = 100;

    return (
      <div className="w-full max-w-6xl mx-auto p-6 bg-slate-950 rounded-3xl border-4 border-slate-800 shadow-2xl relative overflow-hidden my-4 min-h-[580px] flex flex-col justify-between items-stretch text-slate-100">
        
        {/* Real-time paint of Backdrop Landscape SVG if ready from Agent 2! */}
        {p.backdropSvg ? (
          <div 
            className="absolute inset-x-0 bottom-0 h-[48%] pointer-events-none opacity-30 z-0 overflow-hidden select-none transition-all duration-[1200ms] flex items-end justify-center filter saturate-150 scale-105"
            dangerouslySetInnerHTML={{ __html: p.backdropSvg }}
          />
        ) : (
          /* Fallback Particles */
          <div className="absolute inset-0 pointer-events-none opacity-30 z-0 select-none">
            {dots.map((dot, idx) => (
              <div
                key={idx}
                className="absolute w-2 h-2 rounded-full transition-transform duration-75 blur-[1px]"
                style={{
                  left: `${dot.x}%`,
                  top: `${dot.y}%`,
                  backgroundColor: dot.color,
                  boxShadow: `0 0 8px ${dot.color}`
                }}
              />
            ))}
          </div>
        )}
        
        {/* Subtle grid lines over background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-10" />

        <div className="relative z-20 space-y-6 flex-1 flex flex-col justify-between">
          
          {/* Main Top Header Section */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-white/5">
            <div className="flex items-center gap-4 text-left">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-25" />
                <div className="w-16 h-16 bg-linear-to-tr from-amber-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg transform rotate-6 scale-95 transition">
                  <Compass className="w-8 h-8 text-white animate-spin" style={{ animationDuration: "14s" }} />
                </div>
              </div>
              <div>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest font-mono select-none">
                  AI SWARM COLLABORATION
                </span>
                <h2 className="text-2xl font-black text-white tracking-tight uppercase font-mono mt-1">
                  Synthesizing Custom Arcade<span className="text-amber-500">...</span>
                </h2>
              </div>
            </div>

            {/* Overall status ticker & speedbar */}
            <div className="w-full sm:w-64 space-y-2 text-left sm:text-right shrink-0">
              <div className="flex justify-between items-center text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">
                <span>Swarm Wave Output</span>
                <span className="text-amber-400">{progressPercent}%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div 
                  className="h-full bg-linear-to-r from-amber-500 via-rose-500 to-amber-400 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-emerald-400 font-mono animate-pulse uppercase tracking-wider block">
                ⚡ ACTIVE CONTEXT: {p.step === "init" ? "Agent 1 (Fact Extraction)" : p.step === "agent1" ? "Agent 2 (Asset Modeler)" : p.step === "agent2" ? "Agent 3 (Game Rules)" : p.step === "agent3" ? "Agent 4 (Synthesis)" : "Readying reveal..."}
              </p>
            </div>
          </div>

          {/* Core Live Workspace Agent Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-4 flex-1">
            
            {/* Card 1: Agent 1 (Fact Extraction) */}
            <div className={`p-4.5 rounded-2xl border transition-all flex flex-col justify-between relative group ${
              p.extractionResult 
                ? "bg-slate-900/75 border-emerald-500/30 text-slate-100 shadow-md ring-1 ring-emerald-500/10" 
                : p.step === "init" 
                  ? "bg-slate-900/90 border-amber-500/40 text-white shadow-xl ring-2 ring-amber-500/25 animate-pulse" 
                  : "bg-slate-950/40 border-slate-900/60 text-slate-500 opacity-60"
            }`}>
              <div className="space-y-3.5 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Compass className={`w-4 h-4 ${p.step === "init" ? "animate-spin text-amber-500" : p.extractionResult ? "text-emerald-400 font-bold" : "text-slate-500"}`} />
                    <span className="font-mono text-[10px] font-extrabold tracking-wider uppercase">Agent 1: Fact Miner</span>
                  </div>
                  {p.extractionResult ? (
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-black uppercase font-mono border border-emerald-500/30">AUDITED</span>
                  ) : p.step === "init" ? (
                    <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-black uppercase font-mono border border-amber-500/30 animate-pulse">ACTIVE</span>
                  ) : (
                    <span className="text-[8px] text-slate-600 font-bold font-mono">DORMANT</span>
                  )}
                </div>

                <div className="space-y-2 border-t border-white/5 pt-2.5">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Multimodal Audit</h4>
                  {p.extractionResult ? (
                    <div className="space-y-2.5 text-xs leading-snug">
                      <div>
                        <span className="text-slate-400 font-mono text-[9px] block uppercase">🏠 VISUAL SETTING:</span>
                        <p className="text-slate-200 mt-0.5 text-[11px] font-semibold line-clamp-3 italic">"{p.extractionResult.detectedBackground}"</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-mono text-[9px] block uppercase">🎒 SPOTTED PROPS:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.extractionResult.detectedObjects?.slice(0, 5).map((obj: string, i: number) => (
                            <span key={i} className="text-[8px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-sans font-semibold text-slate-300">{obj}</span>
                          ))}
                        </div>
                      </div>
                      <div className="pt-1.5 border-t border-white/5">
                        <span className="text-slate-400 font-mono text-[9px] block uppercase">👥 CREW IDENTIFIED:</span>
                        <p className="text-emerald-400 font-extrabold text-[10px]">{p.extractionResult.participantsRaw?.length || 0} participants found</p>
                      </div>
                    </div>
                  ) : p.step === "init" ? (
                    <p className="text-xs text-amber-300 font-mono italic">Deconstructing captured selfie pixels to list wardrobes, locations, features and accessories...</p>
                  ) : (
                    <p className="text-xs text-slate-700 italic">Holding for raw selfies upload...</p>
                  )}
                </div>
              </div>
              <div className="text-[9px] font-mono text-slate-500 select-none border-t border-white/5 pt-2 mt-2">
                #gemini-miner-model-io
              </div>
            </div>

            {/* Card 2: Agent 2 (Asset Generation & Custom Bobbleheads) */}
            <div className={`p-4.5 rounded-2xl border transition-all flex flex-col justify-between relative group ${
              p.participantsWithAssets 
                ? "bg-slate-900/75 border-emerald-500/30 text-slate-100 shadow-md ring-1 ring-emerald-500/10" 
                : p.step === "agent1" 
                  ? "bg-slate-900/90 border-amber-500/40 text-white shadow-xl ring-2 ring-amber-500/25 animate-pulse" 
                  : "bg-slate-950/40 border-slate-900/60 text-slate-500 opacity-60"
            }`}>
              <div className="space-y-3.5 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className={`w-4 h-4 ${p.step === "agent1" ? "animate-pulse text-amber-500" : p.participantsWithAssets ? "text-emerald-400" : "text-slate-500"}`} />
                    <span className="font-mono text-[10px] font-extrabold tracking-wider uppercase">Agent 2: Asset Designer</span>
                  </div>
                  {p.participantsWithAssets ? (
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-black uppercase font-mono border border-emerald-500/30">SKETCHED</span>
                  ) : p.step === "agent1" ? (
                    <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-black uppercase font-mono border border-amber-500/30 animate-pulse">ACTIVE</span>
                  ) : (
                    <span className="text-[8px] text-slate-600 font-bold font-mono">WAITING</span>
                  )}
                </div>

                <div className="space-y-2 border-t border-white/5 pt-2.5">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Graphics & Vectors</h4>
                  {p.participantsWithAssets ? (
                    <div className="space-y-2.5 text-xs leading-snug">
                      <div>
                        <span className="text-slate-400 font-mono text-[9px] block uppercase">🏞️ BACKGROUND LANDSCAPE:</span>
                        <p className="text-emerald-400 text-[10px] font-extrabold mt-0.5">🎨 Vector Backdrop Rendered!</p>
                        {p.backdropSvg && (
                          <div 
                            className="h-8 w-full rounded-md border border-emerald-500/20 bg-slate-950 overflow-hidden relative opacity-75 hover:opacity-100 transition mt-1 flex items-end justify-center filter saturate-150"
                            dangerouslySetInnerHTML={{ __html: p.backdropSvg.replace(/<svg/, '<svg style="height: 100%; width: auto;"') }}
                          />
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 font-mono text-[9px] block uppercase mb-1">🎭 OVERSIZED BOBBLEHEADS:</span>
                        <div className="flex flex-wrap gap-1.5 py-1">
                          {p.participantsWithAssets.map((pWithAsset: any, i: number) => (
                            <div 
                              key={i} 
                              className="w-[45px] h-[55px] rounded-lg bg-slate-950 border border-white/10 hover:border-amber-400/60 p-0.5 hover:-translate-y-1 hover:scale-110 transition shrink-0 flex items-center justify-center relative cursor-help"
                              title={`${pWithAsset.detectedName}'s Custom bobblehead SVG`}
                            >
                              <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: pWithAsset.cartoonSvg }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : p.step === "agent1" ? (
                    <p className="text-xs text-amber-300 font-mono italic">Designing widescreen parallax landscape backdrop and modeling funny, oversized head collectible characters...</p>
                  ) : (
                    <p className="text-xs text-slate-700 italic">Waiting on Agent 1 visual setting facts...</p>
                  )}
                </div>
              </div>
              <div className="text-[9px] font-mono text-slate-500 select-none border-t border-white/5 pt-2 mt-2">
                #gemini-vectorizer-io
              </div>
            </div>

            {/* Card 3: Agent 3 (Game Rules Constructor) */}
            <div className={`p-4.5 rounded-2xl border transition-all flex flex-col justify-between relative group ${
              p.constructorResult 
                ? "bg-slate-900/75 border-emerald-500/30 text-slate-100 shadow-md ring-1 ring-emerald-500/10" 
                : p.step === "agent2" 
                  ? "bg-slate-900/90 border-amber-500/40 text-white shadow-xl ring-2 ring-amber-500/25 animate-pulse" 
                  : "bg-slate-950/40 border-slate-900/60 text-slate-500 opacity-60"
            }`}>
              <div className="space-y-3.5 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Zap className={`w-4 h-4 ${p.step === "agent2" ? "animate-pulse text-amber-500" : p.constructorResult ? "text-emerald-400" : "text-slate-500"}`} />
                    <span className="font-mono text-[10px] font-extrabold tracking-wider uppercase">Agent 3: Constructor</span>
                  </div>
                  {p.constructorResult ? (
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-black uppercase font-mono border border-emerald-500/30">MAPPED</span>
                  ) : p.step === "agent2" ? (
                    <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-black uppercase font-mono border border-amber-500/30 animate-pulse">ACTIVE</span>
                  ) : (
                    <span className="text-[8px] text-slate-600 font-bold font-mono">WAITING</span>
                  )}
                </div>

                <div className="space-y-2 border-t border-white/5 pt-2.5">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Strategy & Variables</h4>
                  {p.constructorResult ? (
                    <div className="space-y-2 text-xs leading-snug">
                      <div>
                        <span className="text-slate-400 font-mono text-[9px] block uppercase">🎮 CHOSEN MECHANICS:</span>
                        <p className="text-amber-400 font-extrabold mt-0.5 text-[11px] font-mono tracking-tight">{p.constructorResult.gameTemplate}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-mono text-[9px] block uppercase">📣 RATIONALE:</span>
                        <p className="text-slate-300 text-[10px] leading-snug italic line-clamp-2 mt-0.5">"{p.constructorResult.rationale}"</p>
                      </div>
                      <div className="pt-1 select-none">
                        <span className="text-slate-400 font-mono text-[9px] block uppercase mb-1">💎 GENERATED ASSETS ({p.constructorResult.mappedCollectibles?.length || 0} items):</span>
                        <div className="flex flex-wrap gap-1 mt-1 max-h-[58px] overflow-y-auto pr-0.5 animate-fadeIn">
                          {p.constructorResult.mappedCollectibles?.slice(0, 4).map((item: any, i: number) => (
                            <span 
                              key={`coll-${i}`} 
                              className="inline-flex items-center gap-0.5 text-[8.5px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded-md"
                              title={`${item.name}: +${item.points}`}
                            >
                              <span>{item.emoji}</span>
                              <span className="truncate max-w-[42px]">{item.name}</span>
                            </span>
                          ))}
                          {p.constructorResult.mappedHazards?.slice(0, 4).map((item: any, i: number) => (
                            <span 
                              key={`haz-${i}`} 
                              className="inline-flex items-center gap-0.5 text-[8.5px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300 px-1.5 py-0.5 rounded-md"
                              title={`${item.name}: ${item.points}`}
                            >
                              <span>{item.emoji}</span>
                              <span className="truncate max-w-[42px]">{item.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : p.step === "agent2" ? (
                    <p className="text-xs text-amber-300 font-mono italic">Formulating interactive mechanics templates, target thresholds, items, and speed values tailored to the group vibe...</p>
                  ) : (
                    <p className="text-xs text-slate-700 italic">Waiting on custom generated vectors...</p>
                  )}
                </div>
              </div>
              <div className="text-[9px] font-mono text-slate-500 select-none border-t border-white/5 pt-2 mt-2">
                #gemini-designer-model-io
              </div>
            </div>

            {/* Card 4: Agent 4 (Synthesis & Compiler) */}
            <div className={`p-4.5 rounded-2xl border transition-all flex flex-col justify-between relative group ${
              p.step === "complete" 
                ? "bg-slate-900/75 border-emerald-500/30 text-slate-100 shadow-md ring-1 ring-emerald-500/10" 
                : p.step === "agent3" 
                  ? "bg-slate-900/90 border-amber-500/40 text-white shadow-xl ring-2 ring-amber-500/25 animate-pulse" 
                  : "bg-slate-950/40 border-slate-900/60 text-slate-500 opacity-60"
            }`}>
              <div className="space-y-3.5 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Play className={`w-4 h-4 ${p.step === "agent3" ? "animate-pulse text-amber-500" : p.step === "complete" ? "text-emerald-400 font-bold" : "text-slate-500"}`} />
                    <span className="font-mono text-[10px] font-extrabold tracking-wider uppercase">Agent 4: Assembler</span>
                  </div>
                  {p.step === "complete" ? (
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-black uppercase font-mono border border-emerald-500/30">LINKED</span>
                  ) : p.step === "agent3" ? (
                    <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-black uppercase font-mono border border-amber-500/30 animate-pulse">ACTIVE</span>
                  ) : (
                    <span className="text-[8px] text-slate-600 font-bold font-mono">WAITING</span>
                  )}
                </div>

                <div className="space-y-2 border-t border-white/5 pt-2.5">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Compilation & Build</h4>
                  {p.step === "complete" && p.finalPayload ? (
                    <div className="space-y-2.5 text-xs leading-snug">
                      <div>
                        <span className="text-slate-400 font-mono text-[9px] block uppercase">🏆 SYNTHESIZED TITLE:</span>
                        <p className="text-amber-400 font-black text-[12px] truncate uppercase mt-0.5">{p.finalPayload.vibeTitle}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-mono text-[9px] block uppercase">🎯 SCORES & SETTINGS:</span>
                        <p className="text-slate-300 text-[10px] mt-0.5">Title: "{p.finalPayload.gameConfig.gameTitle}" with a threshold of {p.finalPayload.gameConfig.targetScore} points for the crown trophy.</p>
                      </div>
                      <div className="pt-2 border-t border-white/5">
                        <span className="text-emerald-400 font-black text-[10px] block uppercase animate-pulse">✓ Sandbox ready for runtime!</span>
                      </div>
                    </div>
                  ) : p.step === "agent3" ? (
                    <p className="text-xs text-amber-300 font-mono italic">Merging facts, vectors, mechanics and coordinates into a single unified JSON config artifact...</p>
                  ) : (
                    <p className="text-xs text-slate-700 italic">Waiting on rules parameters schema...</p>
                  )}
                </div>
              </div>
              <div className="text-[9px] font-mono text-slate-500 select-none border-t border-white/5 pt-2 mt-2">
                #gemini-compiler-io
              </div>
            </div>

          </div>

          {/* Low Ticker Log Bar */}
          <div className="bg-slate-900/40 backdrop-blur-md p-4 rounded-xl border border-white/5 text-left flex items-center justify-start gap-4 min-h-[54px]">
            <span className="font-mono text-[9px] text-slate-500 select-none tracking-widest shrink-0 uppercase border border-slate-800 rounded px-2.5 py-1 font-extrabold">SWARM_TICKER_FEED</span>
            <p className="text-xs font-semibold text-emerald-400 font-mono animate-pulse flex-1 leading-normal">
              🚀 {SWARM_MESSAGES[swarmMsgIdx]}
            </p>
          </div>

        </div>
      </div>
    );
  }

  // 2. ERROR STATE
  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 text-center space-y-6 bg-white rounded-3xl border border-slate-100 shadow-xl my-6">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-rose-100">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Generation Hiccup
          </h2>
          <p className="text-slate-600 font-medium max-w-md mx-auto text-sm">
            {error}
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-6 py-3 rounded-xl transition duration-200 shadow-md inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" /> Try Snapping Again
        </button>
      </div>
    );
  }

  // 3. SHOW REVEAL RESULT DIAGNOSTIC (If loaded successfully)
  if (!result) return null;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6" id="vibe-reveal-screen">
      {/* Vibe Diagnostic banner */}
      <div
        className="rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl border-4"
        style={{
          background: `linear-gradient(135deg, ${result.gameConfig.primaryColor || "#334155"} 0%, ${result.gameConfig.secondaryColor || "#1e293b"} 100%)`,
          borderColor: result.gameConfig.secondaryColor || "#475569"
        }}
      >
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 text-left">
            <span className="bg-white/20 backdrop-blur-md text-white border border-white/20 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" /> Crew Diagnosis Locked!
            </span>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none uppercase">
              {result.vibeTitle}
            </h1>
            <p className="text-white/90 text-sm md:text-base font-semibold max-w-2xl leading-relaxed">
              {result.vibeDescription}
            </p>
          </div>

          <div className="bg-black/25 backdrop-blur-lg p-4 rounded-2xl border border-white/10 flex flex-col text-left gap-1 min-w-[200px]">
            <span className="text-white/60 text-[10px] uppercase font-bold tracking-widest font-mono">
              Location Context
            </span>
            <div className="flex items-center gap-1.5 text-amber-300 font-black text-sm">
              <MapPin className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{result.gameConfig.locationContextName || "The Secret Outpost"}</span>
            </div>
            <p className="text-white/75 text-xs font-medium italic mt-1 font-mono leading-tight">
              Coordinates verified in gaming matrix.
            </p>
          </div>
        </div>
      </div>

      {/* Grid Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
        {/* Left Col: Participants Roast Details (7 cols) */}
        <div className="md:col-span-8 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col text-left">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-1.5 border-b border-rose-50 pb-3 mb-4">
              <User className="w-5 h-5 text-amber-500" /> 
              Meet Your Custom Arcade Cast!
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.participants.map((player) => (
                <div
                  key={player.id}
                  className="bg-slate-50 rounded-xl p-3 border border-slate-100 relative overflow-hidden flex flex-col justify-between hover:border-amber-200 transition"
                >
                  {/* Subtle color wavelength block */}
                  <div
                    className="absolute top-0 right-0 w-20 h-20 opacity-10 rounded-full blur-xl"
                    style={{ backgroundColor: player.clothingColor || "#f59e0b" }}
                  />

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shadow-md relative shrink-0 border-2 border-white"
                        style={{ backgroundColor: `${player.clothingColor}33` || "#f8fafc" }}
                      >
                        {player.croppedFaceUrl ? (
                          <img
                            src={player.croppedFaceUrl}
                            alt={player.detectedName}
                            className="w-full h-full object-cover scale-[1.05]"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-2xl">{player.avatarEmoji}</span>
                        )}
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-extrabold text-slate-800 leading-tight">{player.detectedName}</h4>
                        <p className="text-[9px] font-bold uppercase text-amber-600 mt-0.5 tracking-wider font-mono">
                          Vibe: {player.emotion || "Chill"}
                        </p>
                      </div>
                    </div>

                    {player.cartoonSvg && (
                      <div
                        className="w-14 h-16 shrink-0 flex items-center justify-center border border-slate-200/60 bg-white rounded-xl p-1 shadow-xs hover:scale-110 transition cursor-help relative group"
                        title="AI Bobblehead"
                      >
                        <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: player.cartoonSvg }} />
                        <span className="absolute -bottom-1 right-2 text-[7px] font-bold bg-slate-900 text-white rounded px-1 scale-0 group-hover:scale-100 transition origin-bottom-right">
                          Bobblehead
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 mt-2.5 font-medium leading-relaxed italic border-t border-slate-100/50 pt-2 flex-1">
                    "{player.apparelDescription}"
                  </p>
                </div>
              ))}
            </div>

            {/* Witty observation block */}
            <div className="mt-4 bg-amber-50 rounded-xl p-3 border border-amber-100 flex items-start gap-2.5 text-left">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-amber-900 uppercase">Observer Insight:</h5>
                <p className="text-xs text-amber-800 font-medium leading-relaxed mt-0.5">
                  {result.funFact}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Custom Game Parameters (4 cols) */}
        <div className="md:col-span-4 space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-2xl border-2 border-slate-800 shadow-sm text-left flex flex-col justify-between h-full">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-amber-400 tracking-widest">
                Generated Arcade
              </span>
              <h3 className="text-xl font-black mt-1 uppercase text-white truncate max-w-xs">
                {result.gameConfig.gameTitle}
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5 italic">
                {result.gameConfig.subtitle}
              </p>

              <p className="text-xs text-slate-300 font-medium leading-relaxed mt-3 border-t border-slate-800 pt-3">
                {result.gameConfig.dialogueIntro}
              </p>

              {/* Dynamic properties */}
              <div className="grid grid-cols-2 gap-3 mt-4 border-t border-slate-800 pt-3 text-xs font-mono">
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[9px] uppercase">Base Speed</span>
                  <span className="text-amber-400 font-bold">{result.gameConfig.gameSpeed}x</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[9px] uppercase">Target Score</span>
                  <span className="text-amber-400 font-bold">{result.gameConfig.targetScore} pts</span>
                </div>
              </div>

              {/* Spawn item preview lists */}
              <div className="mt-5.5">
                <span className="text-[10px] uppercase font-extrabold text-slate-400 block mb-2 px-0.5 tracking-wider font-mono">
                  🎮 Party Item Spawners Dynamic Directory:
                </span>
                <div className="flex flex-wrap gap-2">
                  {result.gameConfig.spawnItems.map((item, idx) => {
                    const isHazard = item.type === "hazard";
                    const isPowerUp = item.type === "powerup";
                    
                    const badgeColorClass = isHazard 
                      ? "bg-rose-950/90 border-rose-500/50 text-rose-300 hover:border-rose-400" 
                      : isPowerUp 
                        ? "bg-amber-950/90 border-amber-500/50 text-amber-300 hover:border-amber-400" 
                        : "bg-emerald-950/90 border-emerald-500/50 text-emerald-300 hover:border-emerald-400";
                    
                    const markerColorClass = isHazard 
                      ? "bg-rose-500" 
                      : isPowerUp 
                        ? "bg-amber-400" 
                        : "bg-emerald-500";

                    return (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition text-[10px] font-black pointer-events-auto cursor-help ${badgeColorClass}`}
                        title={`${item.description} (Points: ${item.points})`}
                      >
                        <span className="text-sm select-none shrink-0">{item.emoji}</span>
                        <span className="truncate max-w-[100px]">{item.name}</span>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${markerColorClass}`} />
                        <span className="text-[9px] font-mono font-bold text-white/90">
                          {item.points !== 0 ? `${item.points > 0 ? "+" : ""}${item.points}p` : "UP"}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Launch Game button */}
            <div className="mt-6 border-t border-slate-800/80 pt-4">
              <button
                type="button"
                id="launch-arcade-trigger"
                onClick={onStartGame}
                className="w-full bg-linear-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-slate-950 font-black py-4.5 rounded-xl text-md transition duration-200 shadow-md inline-flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-5 h-5 text-slate-950 fill-slate-950" /> Start Custom Arcade!
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
