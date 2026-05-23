import React, { useRef, useState, useEffect } from "react";
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Award,
  Shield,
  Trophy,
  User,
  ChevronDown,
  ChevronUp,
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
} from "lucide-react";
import { CustomGameConfig, Participant, SpawnItem } from "../types";
import { loadUiPrefs, saveUiPrefs } from "../lib/hangoutStorage";

interface CanvasGameProps {
  gameConfig: CustomGameConfig;
  participants: Participant[];
  onBack: () => void;
  onResetParty?: () => void;
  onScoresChange?: (participants: Participant[]) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
}

interface ActiveItem {
  id: string;
  x: number;
  y: number;
  vy: number;
  size: number;
  item: SpawnItem;
}

// Draw a beautiful procedural vector item capsule on 2D Canvas with outer glow, glossy gradients, and color-coded status badges
const drawProceduralItemToken = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number, // radius
  itemType: "collectable" | "hazard" | "powerup",
  emoji: string,
  itemPoints: number
) => {
  const prevShadowColor = ctx.shadowColor;
  const prevShadowBlur = ctx.shadowBlur;

  // Compute colors based on positive vs negative vs special powerups
  let accentColor = "#10b981";       // emerald-500
  let strokeColor = "#34d399";       // emerald-400
  let fillGradientStart = "#064e3b";   // emerald-900 (dark rich emerald)
  let fillGradientEnd = "#022c22";     // emerald-950 (rich near-black emerald)

  if (itemType === "hazard") {
    accentColor = "#f43f5e";         // rose-500 (attention negative crimson)
    strokeColor = "#fb7185";         // rose-400 (bright outline)
    fillGradientStart = "#881337";     // rose-900 (rich wine dark)
    fillGradientEnd = "#4c0519";       // rose-950 (deep pitch wine)
  } else if (itemType === "powerup") {
    accentColor = "#fbbf24";         // amber-400 (golden premium highlight)
    strokeColor = "#fcd34d";         // amber-300
    fillGradientStart = "#78350f";     // amber-900 (rich warm honey)
    fillGradientEnd = "#451a03";       // amber-950
  }

  // 1. Draw glowing outer ambient neon shadow so it's clearly visible against dynamic backdrops
  ctx.save();
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = size * 0.7;

  // 2. Draw outer bold decorative ring
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = size * 0.12;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.95, 0, Math.PI * 2);
  ctx.stroke();

  // Disable shadow effects for interior rendering and performance
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  // 3. Draw glassy radial gradient plate
  try {
    const radialGrad = ctx.createRadialGradient(x, y - size * 0.2, size * 0.1, x, y, size * 1.0);
    radialGrad.addColorStop(0, fillGradientStart);
    radialGrad.addColorStop(1, fillGradientEnd);
    ctx.fillStyle = radialGrad;
  } catch (err) {
    ctx.fillStyle = fillGradientEnd;
  }
  ctx.beginPath();
  ctx.arc(x, y, size * 0.86, 0, Math.PI * 2);
  ctx.fill();

  // 4. Draw glossy shiny reflection arc highlight 
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = size * 0.08;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.72, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();

  // 5. Draw a small level/status badge in the upper right
  const badgeRadius = size * 0.36;
  const badgeX = x + size * 0.65;
  const badgeY = y - size * 0.65;

  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = size * 0.06;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = `950 ${Math.max(7, Math.floor(size * 0.38))}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (itemType === "powerup") {
    ctx.fillText("★", badgeX, badgeY);
  } else {
    const symbolMark = itemPoints > 0 ? "+" : "−";
    ctx.fillText(symbolMark, badgeX, badgeY);
  }

  // 6. Draw central crisp emoji icon scaling perfectly
  ctx.font = `${Math.floor(size * 1.05)}px Arial`;
  ctx.fillText(emoji, x, y);

  ctx.restore();
};

// Generates a stunning vector inline SVG token matching the visual capsule game items
const renderCodexItemSvg = (item: SpawnItem) => {
  let accentColor = "#10b981";       // emerald-500
  let strokeColor = "#34d399";       // emerald-400
  let bgGradientStart = "#064e3b";   // emerald-900 (deep dark green)
  let bgGradientEnd = "#022c22";     // emerald-950
  let iconGlow = "rgba(16, 185, 129, 0.35)";
  let badgeChar = "+";
  let badgeColor = "#10b981";

  if (item.type === "hazard") {
    accentColor = "#f43f5e";         // rose-500
    strokeColor = "#fb7185";         // rose-400
    bgGradientStart = "#881337";     // rose-900
    bgGradientEnd = "#4c0519";       // rose-950
    iconGlow = "rgba(244, 63, 94, 0.4)";
    badgeChar = "−";
    badgeColor = "#f43f5e";
  } else if (item.type === "powerup") {
    accentColor = "#fbbf24";         // amber-400
    strokeColor = "#fcd34d";         // amber-300
    bgGradientStart = "#78350f";     // amber-900
    bgGradientEnd = "#451a03";       // amber-950
    iconGlow = "rgba(251, 191, 36, 0.45)";
    badgeChar = "★";
    badgeColor = "#d97706";          // amber-600
  }

  const gradId = `codex-grad-${item.name.replace(/[^a-zA-Z0-9]/g, '-')}`;

  return (
    <div className="w-13 h-13 shrink-0 relative transition group-hover:scale-110 duration-200">
      <svg viewBox="0 0 60 60" className="w-full h-full drop-shadow-sm select-none">
        <defs>
          <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={bgGradientStart} />
            <stop offset="100%" stopColor={bgGradientEnd} />
          </radialGradient>
        </defs>

        {/* Outer Ring Glow */}
        <circle cx="30" cy="30" r="23" fill="none" stroke={iconGlow} strokeWidth="6" opacity="0.45" />

        {/* Decorative Ring Outer Frame */}
        <circle cx="30" cy="30" r="21.5" fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth="2.5" />

        {/* Interior dash circular details */}
        <circle cx="30" cy="30" r="16" fill="none" stroke={strokeColor} strokeWidth="1.2" strokeDasharray="3, 2" opacity="0.6" />

        {/* Shiny Glass Highlight arc */}
        <path d="M 14 20 A 16 16 0 0 1 46 20" fill="none" stroke="#ffffff" strokeWidth="1.6" opacity="0.45" strokeLinecap="round" />

        {/* Level Badge in upper-right corner */}
        <circle cx="45" cy="15" r="7.5" fill={badgeColor} stroke="#ffffff" strokeWidth="1.5" />
        <text x="45" y="18" fill="#ffffff" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
          {badgeChar}
        </text>
      </svg>
      {/* Central Emoji placed absolutely on top of the glossy button vector */}
      <span className="absolute inset-0 flex items-center justify-center text-xl select-none mb-0.5">
        {item.emoji}
      </span>
    </div>
  );
};

export default function CanvasGame({
  gameConfig,
  participants,
  onBack,
  onResetParty,
  onScoresChange,
}: CanvasGameProps) {
  const initialUi = loadUiPrefs();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialUi.sidebarCollapsed);
  const [cabinetOpen, setCabinetOpen] = useState(initialUi.cabinetOpen);
  const [leaderboardOpen, setLeaderboardOpen] = useState(initialUi.leaderboardOpen);
  const [codexOpen, setCodexOpen] = useState(initialUi.codexOpen);
  const [playersBarCollapsed, setPlayersBarCollapsed] = useState(initialUi.playersBarCollapsed);

  function updateUiPrefs(prefs: Partial<typeof initialUi>) {
    saveUiPrefs(prefs);
  }
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sound configuration
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Turn management
  const [scoreList, setScoreList] = useState<Participant[]>(participants);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const currentPlayer = scoreList[currentPlayerIdx] || scoreList[0];

  const onScoresChangeRef = useRef(onScoresChange);
  onScoresChangeRef.current = onScoresChange;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onScoresChangeRef.current?.(scoreList);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [scoreList]);

  // Visual model preferences (AI Hand-drawn Vector Cartoon vs Webcam Crop)
  const [avatarStyle, setAvatarStyle] = useState<"cartoon" | "photo">("cartoon");

  // Dynamic canvas size state
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  // Game statuses
  const [gameState, setGameState] = useState<"ready" | "playing" | "gameover" | "victory">("ready");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45); // 45 seconds dynamic game loop
  const [powerUpActive, setPowerUpActive] = useState<"double" | "slow" | null>(null);
  const [powerUpTime, setPowerUpTime] = useState(0);

  // Dynamic Game Template Selector support! (Active Arcade Cabinet choice)
  const [activeTemplate, setActiveTemplate] = useState<string>(gameConfig.gameTemplate);

  // Reset game runs cleanly if the player toggles the Arcade Machine template
  useEffect(() => {
    setGameState("ready");
    setScore(0);
    scoreRef.current = 0;
    itemsRef.current = [];
    particlesRef.current = [];
    lasersRef.current = [];
    if (activeTemplate === "MemoryLaneTreasureHunt") {
      positionXRef.current = 80;
      playerYRef.current = dimensions.height - 50;
    } else {
      positionXRef.current = dimensions.width / 2;
      playerYRef.current = dimensions.height - 50;
    }
  }, [activeTemplate, dimensions.width, dimensions.height]);

  // Refs for inside game loop to avoid state closures
  const scoreRef = useRef(0);
  const timeLeftRef = useRef(45);
  const positionXRef = useRef(300);
  const playerYRef = useRef(300);
  const playerVelocityYRef = useRef(0);
  const itemsRef = useRef<ActiveItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerUpRef = useRef<"double" | "slow" | null>(null);

  // Shooter lasers
  const lasersRef = useRef<{ x: number; y: number; vy: number }[]>([]);

  // Maze state refs
  const mazeGridRef = useRef<number[][]>([]);
  const mazeItemsRef = useRef<{ row: number; col: number; emoji: string; points: number; type: string; name: string }[]>([]);
  const playerGridXRef = useRef(1);
  const playerGridYRef = useRef(1);
  const enemyGridXRef = useRef(11);
  const enemyGridYRef = useRef(7);
  const enemyTicksRef = useRef(0);

  // Helper: Laser fire trigger
  const fireLaser = () => {
    lasersRef.current.push({
      x: positionXRef.current,
      y: dimensions.height - 70,
      vy: -8.5
    });
    // Synthesize super clean sci-fi weapon discharge
    if (soundEnabled && audioCtxRef.current) {
      try {
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(850, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } catch (e) {}
    }
  };

  // Helper: check if a maze item is collected
  const checkMazeItemPickup = () => {
    const r = playerGridYRef.current;
    const c = playerGridXRef.current;
    const matchIdx = mazeItemsRef.current.findIndex(item => item.row === r && item.col === c);
    if (matchIdx !== -1) {
      const item = mazeItemsRef.current[matchIdx];
      let pts = item.points;
      if (item.type === "powerup") {
        setPowerUpActive("double");
        setPowerUpTime(8);
        playSynthesizedSound("powerup");
      } else if (item.type === "collectable") {
        if (powerUpActive === "double") pts *= 2;
        setScore(prev => prev + pts);
        playSynthesizedSound("collect");
      } else {
        // hazard
        setScore(prev => Math.max(0, prev + pts)); // pts is negative
        playSynthesizedSound("hazard");

        // Flash Canvas screen
        if (canvasRef.current) {
          canvasRef.current.classList.add("bg-rose-500/10");
          setTimeout(() => {
            canvasRef.current?.classList.remove("bg-rose-500/10");
          }, 120);
        }
      }

      // Spawn tidy tiny pickup particles
      const cellW = dimensions.width / 13;
      const cellH = dimensions.height / 9;
      const px = c * cellW + cellW / 2;
      const py = r * cellH + cellH / 2;
      for (let i = 0; i < 8; i++) {
        particlesRef.current.push({
          x: px,
          y: py,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          color: item.type === "hazard" ? "#ef4444" : "#10b981",
          size: 2 + Math.random() * 3,
          alpha: 1.0,
          life: 25
        });
      }

      mazeItemsRef.current.splice(matchIdx, 1);
    }
  };

  // Double buffer player avatars globally (Cartoon vectors and Raw cropped selfie photos)
  const cartoonImagesRef = useRef<{ [participantId: number]: HTMLImageElement }>({});
  const photoImagesRef = useRef<{ [participantId: number]: HTMLImageElement }>({});
  
  // Custom background landscape dynamic image ref
  const backdropImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (gameConfig.backdropSvg) {
      const img = new Image();
      const svgContent = gameConfig.backdropSvg.trim();
      const encodedSvg = encodeURIComponent(svgContent);
      img.src = `data:image/svg+xml;utf8,${encodedSvg}`;
      img.onload = () => {
        backdropImgRef.current = img;
      };
      img.onerror = (e) => {
        console.error("Error loading backdrop SVG asset:", e);
      };
    } else {
      backdropImgRef.current = null;
    }
  }, [gameConfig.backdropSvg]);

  useEffect(() => {
    participants.forEach((p) => {
      if (p.cartoonSvg) {
        const img = new Image();
        const svgContent = p.cartoonSvg.trim();
        const encodedSvg = encodeURIComponent(svgContent);
        img.src = `data:image/svg+xml;utf8,${encodedSvg}`;
        img.onload = () => {
          cartoonImagesRef.current[p.id] = img;
        };
      }
      if (p.croppedFaceUrl) {
        const img = new Image();
        img.src = p.croppedFaceUrl;
        img.onload = () => {
          photoImagesRef.current[p.id] = img;
        };
      }
    });
  }, [participants]);

  const getAvatarImage = (id: number) => {
    if (avatarStyle === "photo") {
      return photoImagesRef.current[id] || cartoonImagesRef.current[id];
    }
    return cartoonImagesRef.current[id] || photoImagesRef.current[id];
  };

  // Audio synthesis triggers
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSynthesizedSound = (type: "collect" | "hazard" | "powerup" | "gameover" | "victory") => {
    if (!soundEnabled) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === "suspended") return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === "collect") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === "hazard") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === "powerup") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(1600, now + 0.4);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === "victory") {
        // Play small retro arpeggio
        osc.type = "sine";
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C E G C
        freqs.forEach((freq, idx) => {
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        });
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.55);
      } else if (type === "gameover") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(30, now + 0.6);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      }
    } catch (e) {
      console.warn("Synth error:", e);
    }
  };

  // Sync state and refs
  useEffect(() => {
    scoreRef.current = score;
    timeLeftRef.current = timeLeft;
    powerUpRef.current = powerUpActive;
  }, [score, timeLeft, powerUpActive]);

  // Handle Resize using ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        // Keep a neat aspect ratio inside the card
        const finalWidth = width || 600;
        const finalHeight = Math.max(380, height || 400);

        setDimensions({ width: finalWidth, height: finalHeight });
        if (gameState === "ready" && positionXRef.current === 300) {
          positionXRef.current = finalWidth / 2;
        }
      }
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
    };
  }, [gameState]);

  // Launch countdown timer
  useEffect(() => {
    if (gameState !== "playing") return;

    const mainTimer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(mainTimer);
          finishGame();
          return 0;
        }
        return prev - 1;
      });

      // Update Power up duration timer
      setPowerUpTime((prev) => {
        if (prev <= 1) {
          setPowerUpActive(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(mainTimer);
  }, [gameState]);

  // Setup Keyboard / Click Listeners
  useEffect(() => {
    if (gameState !== "playing") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const speed = 25;
      if (activeTemplate === "MemoryLaneTreasureHunt") {
        if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
          e.preventDefault();
          const groundY = dimensions.height - 50;
          if (playerYRef.current >= groundY - 5) {
            playerVelocityYRef.current = -13; // powerful side-scroller jump
            playSynthesizedSound("collect");
          }
        }
      } else if (activeTemplate === "VibeMazeQuest") {
        let targetX = playerGridXRef.current;
        let targetY = playerGridYRef.current;

        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
          targetX--;
          e.preventDefault();
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
          targetX++;
          e.preventDefault();
        } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
          targetY--;
          e.preventDefault();
        } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
          targetY++;
          e.preventDefault();
        }

        const currentGrid = mazeGridRef.current;
        if (currentGrid && currentGrid[targetY] && currentGrid[targetY][targetX] !== 1) {
          playerGridXRef.current = targetX;
          playerGridYRef.current = targetY;
          checkMazeItemPickup();
        }
      } else if (activeTemplate === "LaserVibeProtector") {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
          positionXRef.current = Math.max(30, positionXRef.current - speed);
          e.preventDefault();
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
          positionXRef.current = Math.min(dimensions.width - 30, positionXRef.current + speed);
          e.preventDefault();
        } else if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
          e.preventDefault();
          fireLaser();
        }
      } else {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
          positionXRef.current = Math.max(30, positionXRef.current - speed);
        }
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
          positionXRef.current = Math.min(dimensions.width - 30, positionXRef.current + speed);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gameState, dimensions, activeTemplate]);

  // Touch & Mouse slide & click controllers
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing" || !canvasRef.current) return;
    if (activeTemplate === "MemoryLaneTreasureHunt" || activeTemplate === "VibeMazeQuest") {
      // maze is discrete and jumper is jump-only
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    positionXRef.current = Math.max(25, Math.min(dimensions.width - 25, relativeX));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    if (activeTemplate === "MemoryLaneTreasureHunt") {
      const groundY = dimensions.height - 50;
      if (playerYRef.current >= groundY - 5) {
        playerVelocityYRef.current = -13;
        playSynthesizedSound("collect");
      }
    } else if (activeTemplate === "LaserVibeProtector") {
      fireLaser();
    }
  };

  // Game startup triggers
  const startGame = () => {
    try {
      initAudio();
    } catch {}
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(45);
    timeLeftRef.current = 45;
    setPowerUpActive(null);
    setPowerUpTime(0);
    itemsRef.current = [];
    particlesRef.current = [];
    lasersRef.current = [];

    if (activeTemplate === "MemoryLaneTreasureHunt") {
      positionXRef.current = 80; // keep character on left side
      playerYRef.current = dimensions.height - 50;
      playerVelocityYRef.current = 0;
    } else if (activeTemplate === "VibeMazeQuest") {
      const staticMaze = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
        [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      ];
      mazeGridRef.current = staticMaze;
      playerGridXRef.current = 1;
      playerGridYRef.current = 1;
      enemyGridXRef.current = 11;
      enemyGridYRef.current = 7;
      enemyTicksRef.current = 0;

      // Distribute a set of item emojis across random safe maze corridors
      const itemsPool = gameConfig.spawnItems;
      const collectedItems: typeof mazeItemsRef.current = [];
      if (itemsPool && itemsPool.length > 0) {
        let placedCount = 0;
        for (let r = 1; r < 8; r++) {
          for (let c = 1; c < 12; c++) {
            if (staticMaze[r][c] === 0 && (r !== 1 || c !== 1) && (r !== 7 || c !== 11)) {
              if (Math.random() < 0.45 && placedCount < 14) {
                const spec = itemsPool[Math.floor(Math.random() * itemsPool.length)];
                collectedItems.push({
                  row: r,
                  col: c,
                  emoji: spec.emoji,
                  points: spec.points,
                  type: spec.type,
                  name: spec.name
                });
                placedCount++;
              }
            }
          }
        }
      }
      mazeItemsRef.current = collectedItems;

    } else {
      positionXRef.current = dimensions.width / 2;
      playerYRef.current = dimensions.height - 50;
      playerVelocityYRef.current = 0;
    }

    setGameState("playing");
    playSynthesizedSound("collect");
  };

  // End Game handling (either victory or time limit)
  const finishGame = () => {
    const finalScore = scoreRef.current;
    
    // Save/Update current player score list
    setScoreList((prev) =>
      prev.map((player, idx) =>
        idx === currentPlayerIdx ? { ...player, score: finalScore } : player
      )
    );

    // High score check
    if (finalScore > highScore) {
      setHighScore(finalScore);
    }

    if (finalScore >= gameConfig.targetScore) {
      setGameState("victory");
      playSynthesizedSound("victory");
    } else {
      setGameState("gameover");
      playSynthesizedSound("gameover");
    }
  };

  // Main Canvas Rendering & Tick Frame loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let spawnTimer = 0;

    // Background color pairings
    const outerPrimary = gameConfig.primaryColor || "#3b82f6";
    const outerSecondary = gameConfig.secondaryColor || "#ec4899";

    const renderLoop = () => {
      if (!ctx || !canvas) return;

      // Handle transparent clearing or responsive backdrops
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // 1. BACKDROP DRAW PROCEDURAL OR CUSTOM SVG
      if (backdropImgRef.current) {
        ctx.drawImage(backdropImgRef.current, 0, 0, dimensions.width, dimensions.height);
      } else if (gameConfig.backdropType === "neon" || gameConfig.backdropType === "cyberpunk") {
        // Deep purple matrix
        ctx.fillStyle = "#0c0a0f";
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);

        // Draw perspective lines fading upward
        ctx.strokeStyle = `${outerSecondary}22`;
        ctx.lineWidth = 1.5;
        const step = 40;
        for (let x = 0; x < dimensions.width; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, dimensions.height);
          ctx.lineTo(dimensions.width / 2 + (x - dimensions.width / 2) * 0.25, dimensions.height * 0.45);
          ctx.stroke();
        }
        
        // Horizontal scanlines
        for (let y = dimensions.height * 0.45; y < dimensions.height; y += 25) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(dimensions.width, y);
          ctx.stroke();
        }

        // Floating retro matrix text tags
        ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
        ctx.font = "bold 11px monospace";
        ctx.fillText("/** HANGOUT_ENGINE 2.0_IO_SWARM **/", 140, 45);
        ctx.fillText(`GPS_LOCK: ${gameConfig.locationContextName || "ONLINE"}`, dimensions.width - 150, 45);
        ctx.fillText("const friend = Group.vibe()", 100, 100);
        ctx.fillText("if (friendly) Play()", dimensions.width - 100, 120);

      } else if (gameConfig.backdropType === "sunset") {
        // Rich sunset gradient
        const grd = ctx.createLinearGradient(0, 0, 0, dimensions.height);
        grd.addColorStop(0, "#221230");
        grd.addColorStop(0.4, "#4c1032");
        grd.addColorStop(0.7, "#881337");
        grd.addColorStop(1, "#c2410c");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);

        // Warm Neon Sun
        ctx.fillStyle = "#fbbf24";
        ctx.shadowColor = "#f59e0b";
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(dimensions.width / 2, dimensions.height * 0.55, 65, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Draw cartoon mountain/hill silhouettes in the middle distances
        ctx.fillStyle = "rgba(40, 10, 30, 0.6)";
        ctx.beginPath();
        ctx.moveTo(0, dimensions.height - 40);
        ctx.lineTo(dimensions.width * 0.25, dimensions.height - 110);
        ctx.lineTo(dimensions.width * 0.55, dimensions.height - 50);
        ctx.lineTo(dimensions.width * 0.8, dimensions.height - 130);
        ctx.lineTo(dimensions.width, dimensions.height - 40);
        ctx.lineTo(dimensions.width, dimensions.height);
        ctx.lineTo(0, dimensions.height);
        ctx.closePath();
        ctx.fill();

        // High quality palms silhouette
        ctx.fillStyle = "#1e0b25";
        ctx.font = "40px Arial";
        ctx.fillText("🌴", 40, dimensions.height - 40);
        ctx.fillText("🌴", dimensions.width - 50, dimensions.height - 55);

      } else if (gameConfig.backdropType === "cozy") {
        // Cozy room aesthetics
        const grd = ctx.createLinearGradient(0, 0, 0, dimensions.height);
        grd.addColorStop(0, "#291612");
        grd.addColorStop(1, "#441a0d");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);

        // draw cute lamp bubbles lights
        ctx.fillStyle = "rgba(251, 191, 36, 0.08)";
        ctx.beginPath();
        ctx.arc(80, 80, 110, 0, Math.PI * 2);
        ctx.fill();

        // Draw a cute window silhouette
        ctx.fillStyle = "rgba(251, 146, 60, 0.15)";
        ctx.fillRect(dimensions.width - 150, 40, 80, 110);
        // Window frame lines
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 4;
        ctx.strokeRect(dimensions.width - 150, 40, 80, 110);
        ctx.beginPath();
        ctx.moveTo(dimensions.width - 110, 40);
        ctx.lineTo(dimensions.width - 110, 150);
        ctx.moveTo(dimensions.width - 150, 95);
        ctx.lineTo(dimensions.width - 70, 95);
        ctx.stroke();

        // draw cute cartoon plant pot silhouette
        ctx.fillStyle = "#1c0d0c";
        ctx.font = "35px Arial";
        ctx.fillText("🪴", dimensions.width - 110, dimensions.height - 60);

      } else if (gameConfig.backdropType === "nature") {
        // Nature green sky
        const grd = ctx.createLinearGradient(0, 0, 0, dimensions.height);
        grd.addColorStop(0, "#0284c7");
        grd.addColorStop(0.5, "#38bdf8");
        grd.addColorStop(1, "#bae6fd");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);

        // Draw rolling cartoon hills
        ctx.fillStyle = "rgba(16, 185, 129, 0.4)";
        ctx.beginPath();
        ctx.ellipse(150, dimensions.height - 10, 250, 100, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(5, 150, 105, 0.55)";
        ctx.beginPath();
        ctx.ellipse(dimensions.width - 150, dimensions.height - 10, 300, 120, 0, 0, Math.PI * 2);
        ctx.fill();

        // Floating sweet clouds
        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        ctx.font = "40px Arial";
        ctx.fillText("☁️", 90, 70);
        ctx.fillText("☁️", dimensions.width - 120, 100);

      } else {
        // Default warm vintage retro grid skies
        const grd = ctx.createLinearGradient(0, 0, 0, dimensions.height);
        grd.addColorStop(0, "#1e1b4b");
        grd.addColorStop(0.7, "#311042");
        grd.addColorStop(1, "#0f172a");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);

        // draw star fields procedurally
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        for (let i = 0; i < 15; i++) {
          const sx = (i * 38) % dimensions.width;
          const sy = (i * 57) % (dimensions.height * 0.6);
          ctx.fillRect(sx, sy, 2, 2);
        }
      }

      // STATE SPECIFIC LOGIC
      if (activeTemplate === "VibeMazeQuest") {
        // MAZE GAMEPLAY LOGIC AND RENDER
        if (gameState === "playing") {
          // If all items are eaten, respawn a fresh set so it's infinite!
          if (mazeItemsRef.current.length === 0) {
            const staticMaze = mazeGridRef.current;
            const itemsPool = gameConfig.spawnItems;
            const collectedItems: typeof mazeItemsRef.current = [];
            if (itemsPool && itemsPool.length > 0) {
              let placedCount = 0;
              for (let r = 1; r < 8; r++) {
                for (let c = 1; c < 12; c++) {
                  if (staticMaze[r] && staticMaze[r][c] === 0 && (r !== playerGridYRef.current || c !== playerGridXRef.current)) {
                    if (Math.random() < 0.45 && placedCount < 14) {
                      const spec = itemsPool[Math.floor(Math.random() * itemsPool.length)];
                      collectedItems.push({
                        row: r,
                        col: c,
                        emoji: spec.emoji,
                        points: spec.points,
                        type: spec.type,
                        name: spec.name
                      });
                      placedCount++;
                    }
                  }
                }
              }
              mazeItemsRef.current = collectedItems;
            }
          }

          // Move enemy hazard bot
          enemyTicksRef.current++;
          if (enemyTicksRef.current >= 32) { // speed of hazard bot (framerates) - slowed down for comfortable gameplay!
            enemyTicksRef.current = 0;
            const ex = enemyGridXRef.current;
            const ey = enemyGridYRef.current;
            const px = playerGridXRef.current;
            const py = playerGridYRef.current;

            const staticMaze = mazeGridRef.current;
            if (staticMaze && staticMaze.length > 0) {
              const dx = Math.sign(px - ex);
              const dy = Math.sign(py - ey);

              // Step towards closer axis
              if (dx !== 0 && staticMaze[ey] && staticMaze[ey][ex + dx] !== 1) {
                enemyGridXRef.current = ex + dx;
              } else if (dy !== 0 && staticMaze[ey + dy] && staticMaze[ey + dy][ex] !== 1) {
                enemyGridYRef.current = ey + dy;
              } else {
                // random safe direction
                const directions = [
                  { x: 1, y: 0 }, { x: -1, y: 0 },
                  { x: 0, y: 1 }, { x: 0, y: -1 }
                ];
                const matches = directions.filter(d => staticMaze[ey + d.y] && staticMaze[ey + d.y][ex + d.x] !== 1);
                if (matches.length > 0) {
                  const chosen = matches[Math.floor(Math.random() * matches.length)];
                  enemyGridXRef.current = ex + chosen.x;
                  enemyGridYRef.current = ey + chosen.y;
                }
              }

              // Hit-test check with player
              if (enemyGridXRef.current === px && enemyGridYRef.current === py) {
                // Hazard penalty
                setScore(prev => Math.max(0, prev - 15));
                playSynthesizedSound("hazard");

                // Spawn cool hazard explosion dust particles
                const cellW = dimensions.width / 13;
                const cellH = dimensions.height / 9;
                const pxCoords = px * cellW + cellW / 2;
                const pyCoords = py * cellH + cellH / 2;
                for (let i = 0; i < 15; i++) {
                  particlesRef.current.push({
                    x: pxCoords,
                    y: pyCoords,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    color: "#ef4444",
                    size: 2.5 + Math.random() * 3,
                    alpha: 1.0,
                    life: 30
                  });
                }

                // Shake screen
                if (canvasRef.current) {
                  canvasRef.current.classList.add("translate-y-1.5");
                  setTimeout(() => {
                    canvasRef.current?.classList.remove("translate-y-1.5");
                  }, 120);
                }

                // Reset enemy position to bottom-right corner
                enemyGridXRef.current = 11;
                enemyGridYRef.current = 7;
              }
            }
          }
        }

        // DRAW ALL GRID ELEMS
        const cellW = dimensions.width / 13;
        const cellH = dimensions.height / 9;
        const staticMaze = mazeGridRef.current;

        if (staticMaze && staticMaze.length > 0) {
          // Draw maze wall blocks
          for (let r = 0; r < staticMaze.length; r++) {
            for (let c = 0; c < staticMaze[r].length; c++) {
              if (staticMaze[r][c] === 1) {
                // Retro grid styling
                const baseColor = gameConfig.primaryColor || "#312e81";
                ctx.fillStyle = baseColor;
                ctx.strokeStyle = `${gameConfig.secondaryColor || "#ec4899"}44`;
                ctx.lineWidth = 1.5;
                ctx.fillRect(c * cellW + 2, r * cellH + 2, cellW - 4, cellH - 4);
                ctx.strokeRect(c * cellW + 2, r * cellH + 2, cellW - 4, cellH - 4);
              } else {
                // Cozy hallway dot markers
                ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
                ctx.beginPath();
                ctx.arc(c * cellW + cellW / 2, r * cellH + cellH / 2, 2, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }

          // Draw active maze collectable props
          mazeItemsRef.current.forEach((item) => {
            const itemX = item.col * cellW + cellW / 2;
            const itemY = item.row * cellH + cellH / 2;

            drawProceduralItemToken(
              ctx,
              itemX,
              itemY,
              14, // radius
              item.type,
              item.emoji,
              item.points
            );
          });

          // Draw hazard ghost/bot
          const enemyX = enemyGridXRef.current * cellW + cellW / 2;
          const enemyY = enemyGridYRef.current * cellH + cellH / 2;
          ctx.fillStyle = "rgba(239, 68, 68, 0.22)";
          ctx.beginPath();
          ctx.arc(enemyX, enemyY, 16, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = "20px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("👾", enemyX, enemyY);

          // Draw player inside maze
          const pX = playerGridXRef.current * cellW + cellW / 2;
          const pY = playerGridYRef.current * cellH + cellH / 2;

          ctx.fillStyle = gameConfig.secondaryColor || "#ec4899";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(pX, pY, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // 2x score glow halo inside maze
          if (powerUpActive === "double") {
            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(pX, pY, 22, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.save();
          const cachedImg = getAvatarImage(currentPlayer.id);
          if (cachedImg) {
            ctx.beginPath();
            ctx.arc(pX, pY, 16, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(cachedImg, pX - 16, pY - 16, 32, 32);
          } else {
            ctx.font = "16px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(currentPlayer.avatarEmoji || "😎", pX, pY);
          }
          ctx.restore();

          // Eyeglasses indicator frame on player inside maze
          if (currentPlayer.hasGlasses) {
            ctx.strokeStyle = "rgba(255,255,255,0.85)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pX - 9, pY - 2);
            ctx.lineTo(pX + 9, pY - 2);
            ctx.stroke();
          }

          // Human friendly label
          ctx.fillStyle = "white";
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(currentPlayer.detectedName || "Crew", pX, pY - 25);
        }

        // UPDATE EXPLOSION DUST PARTICLES inside maze
        particlesRef.current.forEach((p, index) => {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= 1.2 / p.life;

          if (p.alpha <= 0) {
            particlesRef.current.splice(index, 1);
          } else {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });

        animFrame = requestAnimationFrame(renderLoop);
        return;
      }

      // STATE SPECIFIC LOGIC
      if (gameState === "playing") {
        if (activeTemplate === "MemoryLaneTreasureHunt") {
          // Dynamic jumping run physics calculation
          playerVelocityYRef.current += 0.58; // custom gravity
          playerYRef.current += playerVelocityYRef.current;

          const groundY = dimensions.height - 50;
          if (playerYRef.current >= groundY) {
            playerYRef.current = groundY;
            playerVelocityYRef.current = 0;
          }
        }
      }

      if (activeTemplate === "MemoryLaneTreasureHunt") {
        // Draw neon horizontal tracks representing run lane
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, dimensions.height - 24);
        ctx.lineTo(dimensions.width, dimensions.height - 24);
        ctx.stroke();

        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(0, dimensions.height - 24, dimensions.width, 24);
      }

      if (gameState === "playing") {
        // 2. SPAWN NEW DROPPING SPONS
        spawnTimer++;
        const spawnInterval = Math.max(22, 40 - Math.floor(scoreRef.current / 40));
        
        if (spawnTimer >= spawnInterval) {
          spawnTimer = 0;
          // Choose item randomly from Gemini config items
          const itemsPool = gameConfig.spawnItems;
          if (itemsPool && itemsPool.length > 0) {
            const randomSpec = itemsPool[Math.floor(Math.random() * itemsPool.length)];
            
            const speedModifier = (gameConfig.gameSpeed || 1.2) * 0.65; // Dampened globally for smooth visual tracing!
            const finalSpeed = (1.5 + Math.random() * 1.5) * speedModifier * (powerUpRef.current === "slow" ? 0.45 : 1);

            if (activeTemplate === "MemoryLaneTreasureHunt") {
              // Side scroller horizontal layout: spawn off-right and scroll left!
              const isAir = Math.random() < 0.4 && randomSpec.type !== "hazard";
              const itemY = isAir ? (dimensions.height - 110 - Math.random() * 40) : (dimensions.height - 50);

              const newItem: ActiveItem = {
                id: Math.random().toString(36).substring(2, 9),
                x: dimensions.width + 45,
                y: itemY,
                vy: finalSpeed + 0.9, // reduced value for reaction comfort
                size: 24,
                item: randomSpec
              };
              itemsRef.current.push(newItem);
            } else {
              // Classic vertical catcher: spawn top and drop down!
              const newItem: ActiveItem = {
                id: Math.random().toString(36).substring(2, 9),
                x: 40 + Math.random() * (dimensions.width - 80),
                y: -40,
                vy: finalSpeed, // slowed down velocity
                size: 24,
                item: randomSpec
              };
              itemsRef.current.push(newItem);
            }
          }
        }

        // 3. UPDATE SPAWNED ITEMS & COLLISION MATHEMATICS
        itemsRef.current.forEach((active, index) => {
          if (activeTemplate === "MemoryLaneTreasureHunt") {
            active.x -= active.vy; // scroll left
          } else {
            active.y += active.vy; // drop down
          }

          // Draw beautiful premium vector item capsule procedurally on canvas
          drawProceduralItemToken(
            ctx,
            active.x,
            active.y,
            active.size,
            active.item.type,
            active.item.emoji,
            active.item.points
          );

          // COLLISION CHECK
          const targetY = activeTemplate === "MemoryLaneTreasureHunt"
            ? playerYRef.current
            : dimensions.height - 50;

          const distanceX = Math.abs(active.x - positionXRef.current);
          const distanceY = Math.abs(active.y - targetY);

          const hasCollided = activeTemplate === "MemoryLaneTreasureHunt"
            ? (Math.hypot(active.x - positionXRef.current, active.y - playerYRef.current) < 32)
            : (distanceX < 32 && distanceY < 25);

          if (hasCollided) {
            // Collision dust particles
            const particleCount = active.item.type === "hazard" ? 18 : 10;
            const pColor = active.item.type === "hazard" ? "#ef4444" : active.item.type === "powerup" ? "#fbbf24" : "#10b981";
            
            for (let i = 0; i < particleCount; i++) {
              particlesRef.current.push({
                x: active.x,
                y: active.y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                color: pColor,
                size: 2 + Math.random() * 4,
                alpha: 1.0,
                life: 30 + Math.random() * 20
              });
            }

            // SCORE UPDATES
            let pointAddition = active.item.points;
            if (active.item.type === "powerup") {
              setPowerUpActive("double");
              setPowerUpTime(10); // 10s power-up
              playSynthesizedSound("powerup");
            } else if (active.item.type === "collectable") {
              if (powerUpRef.current === "double") pointAddition *= 2;
              setScore(prev => Math.max(0, prev + pointAddition));
              playSynthesizedSound("collect");
            } else {
              // Hazard collided
              setScore(prev => Math.max(0, prev + pointAddition));
              playSynthesizedSound("hazard");

              // Screen camera shaking simulation
              canvas.classList.add("translate-y-1.5", "bg-rose-500/10");
              setTimeout(() => {
                canvas.classList.remove("translate-y-1.5", "bg-rose-500/10");
              }, 120);
            }

            // Remove item from registry
            itemsRef.current.splice(index, 1);
          }

          // Offscreen disposal filters
          if (activeTemplate === "MemoryLaneTreasureHunt") {
            if (active.x < -40) itemsRef.current.splice(index, 1);
          } else {
            if (active.y > dimensions.height + 40) itemsRef.current.splice(index, 1);
          }
        });
      }

      // 4. DRAW EXPLOSION DUST PARTICLES
      particlesRef.current.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 1.2 / p.life;

        if (p.alpha <= 0) {
          particlesRef.current.splice(index, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // 4b. RETRO LASER SHOOTER LASERS DRAWS & HIT TESTS
      if (activeTemplate === "LaserVibeProtector") {
        lasersRef.current.forEach((laser, lIdx) => {
          laser.y += laser.vy; // flying upwards

          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 3.5;
          ctx.shadowBlur = 6;
          ctx.shadowColor = "#ef4444";
          ctx.beginPath();
          ctx.moveTo(laser.x, laser.y);
          ctx.lineTo(laser.x, laser.y + 14);
          ctx.stroke();
          ctx.shadowBlur = 0; // reset

          // Hit test laser vs active falling items!
          itemsRef.current.forEach((active, iIdx) => {
            const dist = Math.hypot(active.x - laser.x, active.y - laser.y);
            if (dist < 32) {
              // Destroy item with elegant mini explosion particle storm!
              const hitColor = active.item.type === "hazard" ? "#ef4444" : "#10b981";
              for (let i = 0; i < 12; i++) {
                particlesRef.current.push({
                  x: active.x,
                  y: active.y,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6,
                  color: hitColor,
                  size: 2 + Math.random() * 3.5,
                  alpha: 1.0,
                  life: 25 + Math.random() * 15
                });
              }

              // Earn points!
              if (active.item.type === "hazard") {
                // Exceptional shot! Destroyed a hazard! Reward points!
                const pointsGained = Math.abs(active.item.points) || 12;
                setScore(prev => prev + pointsGained);
                playSynthesizedSound("collect");
              } else {
                // Accidental shot on a collectable item! Slight point penalty!
                setScore(prev => Math.max(0, prev - 5));
                playSynthesizedSound("hazard");
              }

              // Splice laser and item
              itemsRef.current.splice(iIdx, 1);
              lasersRef.current.splice(lIdx, 1);
            }
          });

          // Dispose laser when out of upper frame bound
          if (laser.y < -30) {
            lasersRef.current.splice(lIdx, 1);
          }
        });
      }

      // 5. DRAW PLAYABLE CREW CHARACTER AVATAR
      const pColor = currentPlayer.clothingColor || "#f59e0b";
      const characterY = activeTemplate === "MemoryLaneTreasureHunt"
        ? playerYRef.current
        : dimensions.height - 50;

      // Draw custom trail
      if (gameState === "playing") {
        ctx.strokeStyle = `${pColor}44`;
        ctx.lineWidth = 14;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(positionXRef.current - 5, characterY);
        ctx.lineTo(positionXRef.current + 5, characterY);
        ctx.stroke();
      }

      const cachedImg = getAvatarImage(currentPlayer.id);

      if (avatarStyle === "cartoon" && cachedImg) {
        // High fidelity full-body action cartoon character mode!
        const chHeight = 130;  // Increased for large bobblehead visibility
        const chWidth = 100;   // Increased for large bobblehead visibility
        const targetX = positionXRef.current;

        ctx.save();
        ctx.translate(targetX, characterY);

        let bobY = 0;
        let tilt = 0;
        let drawHeight = chHeight;
        let drawWidth = chWidth;

        if (gameState === "playing") {
          const isAirborne = activeTemplate === "MemoryLaneTreasureHunt" && characterY < (dimensions.height - 50);
          if (isAirborne) {
            // Jump stretching / rotational posture
            tilt = playerVelocityYRef.current < 0 ? -0.12 : 0.08;
            drawHeight = chHeight * 1.15;
            drawWidth = chWidth * 0.88;
          } else {
            // Sprint bobbing & tilt sway
            bobY = Math.sin(Date.now() / 100) * 5;
            tilt = Math.sin(Date.now() / 100) * 0.06;
            drawHeight = chHeight + Math.sin(Date.now() / 50) * 2;
          }
        }

        ctx.translate(0, bobY);
        ctx.rotate(tilt);

        // Power-up halo glow around the cartoon character
        if (powerUpRef.current === "double") {
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 4;
          ctx.shadowColor = "#f59e0b";
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.ellipse(0, -15, drawWidth / 2 + 6, drawHeight / 2 + 6, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0; 
        }

        // Draw transparent inline SVG cartoon sprite
        ctx.drawImage(
          cachedImg,
          -drawWidth / 2,
          -drawHeight / 2 - 12, // align torso center with collision center
          drawWidth,
          drawHeight
        );

        ctx.restore();

      } else {
        // Traditional circular photographic modes

        // Main spherical avatar frame
        ctx.fillStyle = pColor;
        ctx.strokeStyle = "white";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(positionXRef.current, characterY, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Double power up halo glow
        if (powerUpRef.current === "double") {
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(positionXRef.current, characterY, 32, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (cachedImg) {
          ctx.beginPath();
          ctx.arc(positionXRef.current, characterY, 24, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(
            cachedImg,
            positionXRef.current - 24,
            characterY - 24,
            48,
            48
          );
        } else {
          // Fallback: Face Emoji
          ctx.font = "24px Arial";
          ctx.fillText(currentPlayer.avatarEmoji || "😎", positionXRef.current, characterY);
        }
        ctx.restore();

        // Glasses indicator lines if they wear glasses (drawn on top of cropped face!)
        if (currentPlayer.hasGlasses) {
          ctx.strokeStyle = "rgba(255,255,255,0.85)";
          ctx.lineWidth = 2.5;
          // Short horizon bar representing cool frames
          ctx.beginPath();
          ctx.moveTo(positionXRef.current - 12, characterY - 3);
          ctx.lineTo(positionXRef.current + 12, characterY - 3);
          ctx.stroke();
        }
      }

      // Witty tag centered over character (shifted up higher if cartoon mode to avoid overlap)
      const tagOffset = (avatarStyle === "cartoon" && getAvatarImage(currentPlayer.id)) ? 86 : 38;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "white";
      ctx.font = "bold 10px monospace";
      ctx.fillText(currentPlayer.detectedName || "Crew", positionXRef.current, characterY - tagOffset);
      ctx.restore();

      animFrame = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [gameState, currentPlayerIdx, dimensions, gameConfig]);

  // Handle Turn switching
  const nextTurn = () => {
    setCurrentPlayerIdx((prev) => (prev + 1) % scoreList.length);
    setGameState("ready");
    setScore(0);
    setTimeLeft(45);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6" id="arcade-challenge-main">
      {/* Top HUD Controller */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition"
            title="Back to group readout"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-left">
            <span className="text-[10px] font-mono font-bold uppercase text-amber-600 block">Current Game Lounge</span>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 uppercase tracking-tight">{gameConfig.gameTitle}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !sidebarCollapsed;
              setSidebarCollapsed(next);
              updateUiPrefs({ sidebarCollapsed: next });
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition inline-flex items-center gap-1.5"
            title={sidebarCollapsed ? "Show arcade cabinet" : "Focus on game screen"}
          >
            {sidebarCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
            {sidebarCollapsed ? "Show Cabinet" : "Focus Mode"}
          </button>

          {onResetParty && (
            <button
              type="button"
              onClick={onResetParty}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset All
            </button>
          )}
        </div>
      </div>

      {/* Style + player index row */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-0.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setAvatarStyle("cartoon")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              avatarStyle === "cartoon"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            ✨ AI Cartoon
          </button>
          <button
            onClick={() => setAvatarStyle("photo")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              avatarStyle === "photo"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            📸 Real Camera Mode
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            const next = !playersBarCollapsed;
            setPlayersBarCollapsed(next);
            updateUiPrefs({ playersBarCollapsed: next });
          }}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition inline-flex items-center gap-1"
        >
          {playersBarCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          Players ({scoreList.length})
        </button>

        {!playersBarCollapsed && (
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {scoreList.map((player, idx) => (
              <button
                key={player.id}
                onClick={() => {
                  setCurrentPlayerIdx(idx);
                  setGameState("ready");
                  setScore(0);
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  idx === currentPlayerIdx
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{player.avatarEmoji}</span>
                <span className="max-w-[70px] truncate">{player.detectedName}</span>
                {player.score > 0 && (
                  <span className="ml-1 bg-amber-400 text-slate-950 px-1 py-0.5 rounded-md font-mono text-[9px]">
                    {player.score}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Core Canvas Play Screen */}
        <div className={`space-y-4 ${sidebarCollapsed ? "lg:col-span-12" : "lg:col-span-8"}`}>
          <div className="bg-slate-950 p-3 rounded-3xl border-4 border-slate-800 shadow-xl relative overflow-hidden flex flex-col items-center">
            
            {/* IN-GAME TOP BAR HUD */}
            <div className="w-full h-12 flex justify-between items-center px-4 bg-slate-900 border border-slate-800 rounded-2xl z-10 font-mono text-sm mb-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 block text-xs">Score</span>
                <span className="text-emerald-400 font-extrabold text-lg">{score}</span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-500 block text-xs">Target {gameConfig.targetScore}</span>
              </div>

              {/* PowerUp Alerts */}
              {powerUpActive && (
                <div className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-1 rounded-sm animate-pulse flex items-center gap-1">
                  <Shield className="w-3 h-3 fill-slate-950" /> 2X DOUBLE POINTS ({powerUpTime}s)
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-slate-500 block text-xs">Timer</span>
                  <span className={`font-extrabold ${timeLeft <= 10 ? "text-rose-500 animate-ping" : "text-slate-200"}`}>
                    {timeLeft}s
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(prev => !prev)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400"
                  title={soundEnabled ? "Disable synthesized sounds" : "Enable synthesized sounds"}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                </button>
              </div>
            </div>

            {/* THE RENDERING CANVAS FRAME CONTAINER */}
            <div
              ref={containerRef}
              className="w-full relative bg-slate-900 rounded-2xl overflow-hidden aspect-[4/3] min-h-[min(58vh,520px)] lg:min-h-[min(68vh,680px)]"
            >
              <canvas
                ref={canvasRef}
                width={dimensions.width}
                height={dimensions.height}
                onPointerMove={handlePointerMove}
                onPointerDown={handlePointerDown}
                className={`w-full h-full block select-none ${
                  activeTemplate === "MemoryLaneTreasureHunt" ? "cursor-pointer" : "cursor-ew-resize"
                }`}
              />

              {/* OVERLAYS BASED ON STATE */}
              {gameState === "ready" && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center text-white font-sans">
                  <span className="text-rose-400 text-[10px] font-mono font-bold uppercase tracking-widest bg-rose-500/10 px-3 py-1.5 border border-rose-500/20 rounded-md">
                    TURN SEATED: {currentPlayer.detectedName}
                  </span>
                  
                  <div className="text-6xl my-4 animate-bounce shrink-0">{currentPlayer.avatarEmoji}</div>
                  
                  <h3 className="text-2xl font-black uppercase text-amber-500 tracking-tight">
                    {activeTemplate === "MemoryLaneTreasureHunt" ? "Ready to Jump?" : "Are You Ready?"}
                  </h3>
                  <p className="text-slate-300 text-[11px] font-semibold max-w-sm mt-1 mb-4 leading-relaxed">
                    {activeTemplate === "MemoryLaneTreasureHunt"
                      ? `Tap anywhere on the window or press SPACEBAR to leap as **${currentPlayer.detectedName}**! Jump over hazardous red traps and grab flying bonus items!`
                      : activeTemplate === "VibeMazeQuest"
                      ? `Use the D-Pad or Arrow Keys/WASD to move **${currentPlayer.detectedName}** around the maze! Munch bonus items and outrun the red danger bot!`
                      : activeTemplate === "LaserVibeProtector"
                      ? `Slide left/right or use Arrow Keys to move! Press SPACEBAR or tap to fire lasers upwards. Vaporize hazardous red traps for points!`
                      : `Slide your finger or mouse horizontally to control **${currentPlayer.detectedName}** in Basket Catch! Capture good elements falling from the top and dodge bad stuff.`}
                  </p>

                  {/* Lobby Mini Machine Select Capsule Tray */}
                  <div className="mb-5 flex flex-wrap items-center justify-center gap-1 bg-slate-900/80 p-1 border border-slate-800 rounded-xl max-w-sm">
                    {[
                      { id: "GatheringCollectAdventure", label: "Catcher", emoji: "🧺" },
                      { id: "MemoryLaneTreasureHunt", label: "Jumper", emoji: "🏃" },
                      { id: "VibeMazeQuest", label: "Maze Hero", emoji: "👻" },
                      { id: "LaserVibeProtector", label: "Laser Shooter", emoji: "🛡️" }
                    ].map((m) => {
                      const isActive = activeTemplate === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setActiveTemplate(m.id);
                            playSynthesizedSound("collect");
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer ${
                            isActive
                              ? "bg-amber-400 text-slate-950 font-black shadow-xs"
                              : "text-slate-400 hover:text-white hover:bg-slate-800"
                          }`}
                        >
                          <span>{m.emoji}</span>
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={startGame}
                    className="bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black px-8 py-4 px-6.5 rounded-xl text-md transition duration-200 shadow-md inline-flex items-center gap-2"
                  >
                    <Play className="w-5 h-5 fill-white" /> Start My Run!
                  </button>
                </div>
              )}

              {gameState === "gameover" && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
                  <span className="text-slate-400 text-xs font-mono uppercase font-bold bg-slate-800 py-1 px-3 rounded-full">
                    Run Finished!
                  </span>

                  <h3 className="text-3xl font-black text-rose-500 tracking-tight uppercase">
                    Un-Vibe-Y Collision!
                  </h3>

                  <div className="text-xs bg-slate-900 p-4 border border-slate-800 rounded-2xl max-w-sm space-y-2 font-mono">
                    <p className="text-slate-400 font-bold">🎯 TARGET: {gameConfig.targetScore}</p>
                    <p className="text-emerald-400 text-xl font-extrabold">⭐️ SCORED: {score} pts</p>
                    <p className="text-indigo-400">High Score: {highScore} pts</p>
                  </div>

                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Don't sweat! Real party scientists always iterate on their score formulas. Let next player beat it!
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={startGame}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-3 rounded-xl text-xs transition inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-4 h-4" /> Try Run Again
                    </button>
                    {scoreList.length > 1 && (
                      <button
                        type="button"
                        onClick={nextTurn}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-5 py-3 rounded-xl text-xs transition inline-flex items-center gap-1 shadow-sm"
                      >
                        <User className="w-4 h-4 text-slate-950" /> Next Seat Turn
                      </button>
                    )}
                  </div>
                </div>
              )}

              {gameState === "victory" && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-25" />
                    <div className="w-16 h-16 bg-amber-400 rounded-2xl flex items-center justify-center rotate-6 shadow-lg border border-amber-300">
                      <Trophy className="w-9 h-9 text-slate-950" />
                    </div>
                  </div>

                  <h3 className="text-3xl font-black text-amber-400 uppercase tracking-tight">
                    Absolute Champ Vibe!
                  </h3>

                  <div className="text-xs bg-slate-900 p-4 border border-slate-800 rounded-2xl max-w-sm space-y-1.5 font-mono">
                    <p className="text-slate-400">🔥 WINNER: {currentPlayer.detectedName}</p>
                    <p className="text-emerald-400 text-xl font-extrabold">⭐️ SCORE: {score} pts</p>
                    <p className="text-amber-300 text-[10px] uppercase font-bold">Unlocks Secret I/O Dev Bonus!</p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={startGame}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-3 rounded-xl text-xs transition inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-4 h-4" /> Run Again
                    </button>
                    {scoreList.length > 1 && (
                      <button
                        type="button"
                        onClick={nextTurn}
                        className="bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black px-5 py-3 rounded-xl text-xs transition inline-flex items-center gap-1 shadow-md"
                      >
                        <User className="w-4 h-4 text-slate-950" /> Next Turn Co-Op
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DYNAMIC ON-SCREEN TOUCH ARCADE CONTROLLERS */}
          {activeTemplate === "VibeMazeQuest" && gameState === "playing" && (
            <div className="flex flex-col items-center justify-center p-3 bg-slate-100 rounded-2xl border border-slate-200 mt-3 max-w-xs mx-auto space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Tactile D-Pad Controls</span>
              
              {/* Up */}
              <button
                type="button"
                onClick={() => {
                  const currentGrid = mazeGridRef.current;
                  const targetX = playerGridXRef.current;
                  const targetY = playerGridYRef.current - 1;
                  if (currentGrid && currentGrid[targetY] && currentGrid[targetY][targetX] !== 1) {
                    playerGridYRef.current = targetY;
                    checkMazeItemPickup();
                  }
                }}
                className="w-11 h-11 bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-800 font-extrabold rounded-xl shadow-xs border border-slate-250 flex items-center justify-center transition-all cursor-pointer"
              >
                ▲
              </button>

              {/* Left / Right row */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const currentGrid = mazeGridRef.current;
                    const targetX = playerGridXRef.current - 1;
                    const targetY = playerGridYRef.current;
                    if (currentGrid && currentGrid[targetY] && currentGrid[targetY][targetX] !== 1) {
                      playerGridXRef.current = targetX;
                      checkMazeItemPickup();
                    }
                  }}
                  className="w-11 h-11 bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-800 font-extrabold rounded-xl shadow-xs border border-slate-250 flex items-center justify-center transition-all cursor-pointer"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currentGrid = mazeGridRef.current;
                    const targetX = playerGridXRef.current + 1;
                    const targetY = playerGridYRef.current;
                    if (currentGrid && currentGrid[targetY] && currentGrid[targetY][targetX] !== 1) {
                      playerGridXRef.current = targetX;
                      checkMazeItemPickup();
                    }
                  }}
                  className="w-11 h-11 bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-800 font-extrabold rounded-xl shadow-xs border border-slate-250 flex items-center justify-center transition-all cursor-pointer"
                >
                  ▶
                </button>
              </div>

              {/* Down */}
              <button
                type="button"
                onClick={() => {
                  const currentGrid = mazeGridRef.current;
                  const targetX = playerGridXRef.current;
                  const targetY = playerGridYRef.current + 1;
                  if (currentGrid && currentGrid[targetY] && currentGrid[targetY][targetX] !== 1) {
                    playerGridYRef.current = targetY;
                    checkMazeItemPickup();
                  }
                }}
                className="w-11 h-11 bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-800 font-extrabold rounded-xl shadow-xs border border-slate-250 flex items-center justify-center transition-all cursor-pointer"
              >
                ▼
              </button>
            </div>
          )}

          {activeTemplate === "LaserVibeProtector" && gameState === "playing" && (
            <div className="flex justify-center items-center gap-3 p-3 bg-slate-100 rounded-2xl border border-slate-200 mt-3 max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => {
                  positionXRef.current = Math.max(30, positionXRef.current - 40);
                }}
                className="px-3.5 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-700 font-bold rounded-xl shadow-xs border border-slate-250 transition-all text-xs cursor-pointer"
              >
                ◀ Left
              </button>

              <button
                type="button"
                onClick={fireLaser}
                className="px-5 py-3 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-extrabold rounded-xl shadow-md transition-all text-xs uppercase tracking-wider flex items-center gap-1 animate-pulse cursor-pointer"
              >
                🔥 LASER
              </button>

              <button
                type="button"
                onClick={() => {
                  positionXRef.current = Math.min(dimensions.width - 30, positionXRef.current + 40);
                }}
                className="px-3.5 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-200 text-slate-700 font-bold rounded-xl shadow-xs border border-slate-250 transition-all text-xs cursor-pointer"
              >
                Right ▶
              </button>
            </div>
          )}

          {activeTemplate === "MemoryLaneTreasureHunt" && gameState === "playing" && (
            <div className="p-3 mt-3 max-w-xs mx-auto">
              <button
                type="button"
                onClick={() => {
                  const groundY = dimensions.height - 50;
                  if (playerYRef.current >= groundY - 5) {
                    playerVelocityYRef.current = -13;
                    playSynthesizedSound("collect");
                  }
                }}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold rounded-xl shadow-md uppercase tracking-wider text-xs duration-150 cursor-pointer"
              >
                🚀 LEAP / JUMP!
              </button>
            </div>
          )}

          <p className="text-slate-500 text-xs text-center font-mono select-none mt-4">
            {activeTemplate === "MemoryLaneTreasureHunt"
              ? "Tap canvas or press SPACE/UP key to jump! 🏃‍♂️💨"
              : activeTemplate === "VibeMazeQuest"
              ? "Use your keyboard Arrow keys or the D-Pad above to find your way! 🗺️"
              : activeTemplate === "LaserVibeProtector"
              ? "Slide cursor to align, tap space/canvas/button to blast red hazards! 🚀"
              : "Slide mouse horizontally on computer 💻 or Slide on touchscreens 📱 to play! 🏄"}
          </p>
        </div>

        {/* Gathering Lounge Scoreboard & Custom Item Directory */}
        {!sidebarCollapsed && (
        <div className="lg:col-span-4 space-y-3">
          {/* Retro Arcade Machine Selection Panel */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-left overflow-hidden">
            <button
              type="button"
              onClick={() => {
                const next = !cabinetOpen;
                setCabinetOpen(next);
                updateUiPrefs({ cabinetOpen: next });
              }}
              className="w-full flex items-center justify-between gap-2 p-4 hover:bg-slate-50 transition text-left"
            >
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-indigo-600 block">Arcade Cabinet</span>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  🎮 Switch Game Engine
                </h3>
              </div>
              {cabinetOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
            </button>

            {cabinetOpen && (
            <div className="px-4 pb-4 space-y-2 border-t border-slate-50">
            <p className="text-[10px] text-slate-400 font-medium pt-2">Boot any playable retro console model instantly!</p>
            <div className="grid grid-cols-1 gap-2">
              {[
                {
                  id: "GatheringCollectAdventure",
                  label: "Basket Catcher",
                  emoji: "🧺",
                  desc: "Slide left or right to gather good vibes and dodge traps.",
                  color: "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold",
                  badge: "Folk Catch"
                },
                {
                  id: "MemoryLaneTreasureHunt",
                  label: "Obstacle Jumper",
                  emoji: "🏃",
                  desc: "Side-scrolling gravity runner. Leap over custom bad traps!",
                  color: "border-indigo-500 bg-indigo-50 text-indigo-950 font-bold",
                  badge: "Run/Jump"
                },
                {
                  id: "VibeMazeQuest",
                  label: "Neon Corridor",
                  emoji: "👻",
                  desc: "Infinite dot muncher grid. Outwit the smart red stalker!",
                  color: "border-amber-500 bg-amber-50 text-amber-950 font-bold",
                  badge: "Maze Hero"
                },
                {
                  id: "LaserVibeProtector",
                  label: "Laser Defender",
                  emoji: "🛡️",
                  desc: "Shoot laser streams upwards to blast apart negative elements!",
                  color: "border-rose-500 bg-rose-50 text-rose-950 font-bold",
                  badge: "Sci-Fi Fire"
                }
              ].map((cab) => {
                const isSelected = activeTemplate === cab.id;
                return (
                  <button
                    key={cab.id}
                    onClick={() => {
                      setActiveTemplate(cab.id);
                      try {
                        playSynthesizedSound("powerup");
                      } catch {}
                    }}
                    className={`text-left p-3 rounded-xl border transition duration-150 cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? `border-l-4 ${cab.color} shadow-xs ring-2 ring-indigo-500/20`
                        : "border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="text-2xl mt-0.5 shrink-0 select-none">{cab.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black truncate">{cab.label}</span>
                        <span className={`text-[8px] font-mono px-1 rounded-sm uppercase tracking-wider ${
                          isSelected ? "bg-white/95 shadow-2xs border" : "bg-slate-200 text-slate-600"
                        }`}>
                          {cab.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal font-medium mt-1">
                        {cab.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            </div>
            )}
          </div>

          {/* Party Leaderboard */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-left overflow-hidden">
            <button
              type="button"
              onClick={() => {
                const next = !leaderboardOpen;
                setLeaderboardOpen(next);
                updateUiPrefs({ leaderboardOpen: next });
              }}
              className="w-full flex items-center justify-between gap-2 p-4 hover:bg-slate-50 transition text-left"
            >
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" /> Gathering High Scores
              </h3>
              {leaderboardOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {leaderboardOpen && (
            <div className="px-4 pb-4 space-y-2 border-t border-slate-50">
              {[...scoreList].sort((a,b) => b.score - a.score).map((player, idx) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-2 rounded-xl border text-xs font-semibold ${
                    player.id === currentPlayer.id
                      ? "border-amber-400 bg-amber-500/10 font-bold text-amber-900"
                      : "border-slate-100 bg-slate-50/50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold font-mono">#{idx + 1}</span>
                    <span className="text-base">{player.avatarEmoji}</span>
                    <span className="font-bold truncate max-w-[120px]">{player.detectedName}</span>
                  </div>
                  <span className="font-mono bg-white border border-slate-100 rounded-md px-2 py-0.5 shadow-2xs">
                    {player.score || 0} pts
                  </span>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Fall Spawners Codex directory */}
          <div className="bg-slate-50 border border-slate-150 rounded-2xl text-left shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => {
                const next = !codexOpen;
                setCodexOpen(next);
                updateUiPrefs({ codexOpen: next });
              }}
              className="w-full flex items-center justify-between gap-2 p-4 hover:bg-slate-100/80 transition text-left"
            >
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-600 block uppercase tracking-wider">Item Dictionary</span>
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 pt-0.5">
                  💎 Active Item Codex ({gameConfig.spawnItems.length})
                </h4>
              </div>
              {codexOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {codexOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-200/80 max-h-[280px] overflow-y-auto">
              <p className="text-[10px] text-slate-400 font-medium pt-2">
                Identify premium capsule characteristics and values instantly!
              </p>
              {gameConfig.spawnItems.map((item, idx) => {
                const isHazard = item.type === "hazard";
                const isPowerUp = item.type === "powerup";
                
                // Color code the card container based on type
                const cardBorderClass = isHazard 
                  ? "border-rose-150 hover:border-rose-300 bg-rose-50/20" 
                  : isPowerUp 
                    ? "border-amber-150 hover:border-amber-300 bg-amber-50/20" 
                    : "border-emerald-150 hover:border-emerald-300 bg-emerald-50/20";
                
                const typeLabel = isHazard ? "Negative" : isPowerUp ? "Power-Up" : "Positive";
                const typeBadgeClass = isHazard 
                  ? "bg-rose-500 text-white font-black" 
                  : isPowerUp 
                    ? "bg-amber-500 text-slate-950 font-black shadow-3xs" 
                    : "bg-emerald-500 text-white font-black";

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-center gap-3.5 shadow-3xs transition duration-200 group ${cardBorderClass}`}
                  >
                    {/* Glowing Vector Badge Item preview SVG */}
                    {renderCodexItemSvg(item)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-black text-slate-800 truncate block">
                          {item.name}
                        </span>

                        <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded font-black uppercase tracking-wider shrink-0 shadow-3xs ${typeBadgeClass}`}>
                          {item.points !== 0 ? `${item.points > 0 ? "+" : ""}${item.points} p` : typeLabel}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-slate-500 leading-normal font-semibold mt-1">
                        {item.description}
                      </p>

                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isHazard ? "bg-rose-500" : isPowerUp ? "bg-amber-400" : "bg-emerald-500"}`} />
                        <span className="text-[8.5px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                          {typeLabel} Element
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>
        )}
      </div>

      {sidebarCollapsed && (
        <p className="text-center text-[10px] text-slate-400 font-mono mt-2 flex items-center justify-center gap-1">
          <Maximize2 className="w-3 h-3" /> Focus mode — game screen expanded. Tap Show Cabinet for engines & codex.
        </p>
      )}
    </div>
  );
}
