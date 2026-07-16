import React, { useState, useEffect } from "react";
import { doc, collection, onSnapshot, runTransaction, increment } from "firebase/firestore";
import { db } from "../firebase";
import { 
  ArrowLeft, Download, Upload, Check, Loader2, Sparkles, AlertCircle, 
  Facebook, CheckCircle2, ChevronRight, Image as ImageIcon, Copy,
  Coins as CoinsIcon, Landmark, Send, Instagram, UserPlus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DailyTasksScreenProps {
  username: string;
  taskBalance: number;
  currentPlan: string;
  onBack: () => void;
  onNavigateToVault?: () => void;
  onNavigateToReferral?: () => void;
  onNavigateToIdentity?: () => void;
}

interface CompletedTaskRecord {
  id: string;
  taskId: string;
  taskTitle: string;
  rewardAmount: number;
  timestamp: string;
  status: string;
  screenshotName: string;
}

export default function DailyTasksScreen({
  username,
  taskBalance,
  currentPlan,
  onBack,
  onNavigateToVault,
  onNavigateToReferral,
  onNavigateToIdentity,
}: DailyTasksScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [taskStarted, setTaskStarted] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [completedTasks, setCompletedTasks] = useState<CompletedTaskRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [copied, setCopied] = useState(false);
  const [currentDomain, setCurrentDomain] = useState("https://kudigrid.com");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentDomain(window.location.origin + window.location.pathname);
    }
  }, []);

  // Dynamic reward calculation based on user's active plan
  const getDailyRewardValue = (plan: string): number => {
    if (!plan || plan === "None") return 0;
    const planLower = plan.toLowerCase();
    if (planLower.includes("750")) return 50.00;
    if (planLower.includes("1500") || planLower.includes("1,500")) return 100.00;
    if (planLower.includes("3000") || planLower.includes("3,000")) return 200.00;
    if (planLower.includes("5000") || planLower.includes("5,000")) return 350.00;
    if (planLower.includes("10000") || planLower.includes("10,000")) return 666.00;
    if (planLower.includes("15000") || planLower.includes("15,000")) return 1000.00;
    if (planLower.includes("20000") || planLower.includes("20,000")) return 1400.00;
    if (planLower.includes("30000") || planLower.includes("3,0000") || planLower.includes("30,000")) return 2000.00;
    if (planLower.includes("40000") || planLower.includes("40,000")) return 2700.00;
    if (planLower.includes("50000") || planLower.includes("50,000")) return 3300.00;
    if (planLower.includes("100000") || planLower.includes("100,000")) return 7000.00;
    return 0;
  };

  const dailyReward = getDailyRewardValue(currentPlan);

  const formatNaira = (val: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Synchronise completed tasks subcollection from Firestore in real-time
  useEffect(() => {
    if (!username) return;

    setLoadingHistory(true);
    const completedRef = collection(db, "users", username, "completedTasks");
    
    const unsubscribe = onSnapshot(
      completedRef,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<CompletedTaskRecord, "id">),
        }));
        
        // Sort by timestamp desc locally
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        setCompletedTasks(list);
        setLoadingHistory(false);
      },
      (err) => {
        console.error("Failed to sync completed tasks history:", err);
        setLoadingHistory(false);
      }
    );

    return () => unsubscribe();
  }, [username]);

  // Check if today's sponsored post task is already completed
  const todayKey = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
  const isTaskCompletedToday = completedTasks.some(
    (task) => task.taskId === `sponsored_post_${todayKey}`
  );

  // File screenshot upload handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  // Mock sharing to Facebook
  const handleStartTask = () => {
    setTaskStarted(true);
    setSuccess("Task started! Please copy description and upload screenshot once posted.");
    setTimeout(() => setSuccess(null), 4000);
    
    // Smooth mock redirection
    window.open("https://facebook.com", "_blank", "noopener,noreferrer");
  };

  // Generate beautiful high-contrast SVG campaign banner in the exact LeadsAfrica format (Vertical 1000x1250)
  const generateSvgBanner = (refUsername: string) => {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1250" width="100%" height="100%">
      <defs>
        <!-- Deep space-teal grid background pattern -->
        <pattern id="gridPattern" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#00e5ff" stroke-width="1.5" opacity="0.07" />
        </pattern>
        <!-- Gold Coin Gradient -->
        <linearGradient id="goldCoins" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fff59d" />
          <stop offset="30%" stop-color="#fbc02d" />
          <stop offset="70%" stop-color="#f57f17" />
          <stop offset="100%" stop-color="#e65100" />
        </linearGradient>
        <!-- Silver Coin Gradient -->
        <linearGradient id="silverCoins" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="40%" stop-color="#cfd8dc" />
          <stop offset="80%" stop-color="#78909c" />
          <stop offset="100%" stop-color="#455a64" />
        </linearGradient>
        <!-- Button Gradient -->
        <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#00a8e8" />
          <stop offset="100%" stop-color="#00e5ff" />
        </linearGradient>
        <!-- Radial background sphere glow behind the ATM and user -->
        <radialGradient id="bgSphereGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#009bf0" stop-opacity="0.8" />
          <stop offset="50%" stop-color="#0077c0" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#011b26" stop-opacity="0" />
        </radialGradient>
        <!-- Button Capsule Border Glow -->
        <filter id="buttonGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComponentTransfer in="blur" result="glow">
            <feFuncA type="linear" slope="0.7" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <!-- Capsule Social Glow -->
        <filter id="capsuleGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComponentTransfer in="blur" result="glow">
            <feFuncA type="linear" slope="0.45" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <!-- Drop Shadow -->
        <filter id="dropShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="3" dy="8" stdDeviation="5" flood-color="#000000" flood-opacity="0.55" />
        </filter>
      </defs>

      <!-- Main Background Dark Slate Teal -->
      <rect width="1000" height="1250" fill="#011b26" />

      <!-- Glowing Cyan Orb (Light sphere behind ATM & lady) -->
      <circle cx="720" cy="880" r="460" fill="url(#bgSphereGlow)" />

      <!-- Tech Grid Matrix overlay -->
      <rect width="1000" height="1250" fill="url(#gridPattern)" />

      <!-- TOP ROW: Elegant Wing Logo & Domain -->
      <!-- Logo Group -->
      <g transform="translate(80, 100)">
        <!-- Beautiful stylized wing logo (LeadsAfrica format check-wing shape) -->
        <path d="M 0,22 C 12,6 32,5 42,16 C 30,32 16,36 0,22 Z" fill="#00e5ff" />
        <path d="M 14,9 C 24,-2 37,2 47,11 C 36,24 25,27 14,9 Z" fill="#ffffff" />
        <circle cx="5" cy="5" r="4.5" fill="#00e5ff" />
        <!-- App Title Text -->
        <text x="65" y="24" fill="#ffffff" font-family="'Inter', system-ui, -sans-serif" font-weight="900" font-size="36" letter-spacing="0.5">KudiGrid</text>
      </g>

      <!-- Web link (Top Right) -->
      <g transform="translate(640, 100)">
        <circle cx="20" cy="12" r="10" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.8" />
        <ellipse cx="20" cy="12" rx="4" ry="10" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.8" />
        <line x1="10" y1="12" x2="30" y2="12" stroke="#ffffff" stroke-width="1.5" opacity="0.8" />
        <text x="42" y="21" fill="#ffffff" font-family="'Inter', system-ui, sans-serif" font-weight="700" font-size="24" letter-spacing="0.5" opacity="0.95">kudigrid.com</text>
      </g>

      <!-- COIN WIRE ORBITS & FLOATING SILVER COINS -->
      <g opacity="0.85">
        <!-- Curved wire 1 -->
        <path d="M -50,550 Q 320,700 750,500" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.25" />
        <!-- Curved wire 2 -->
        <path d="M 150,920 Q 450,750 920,840" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.2" />
        <!-- Curved wire 3 -->
        <path d="M -20,1100 Q 500,850 1050,1120" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.15" />

        <!-- Silver Coin on Wire 1 -->
        <g transform="translate(380, 610) rotate(-10)" filter="url(#dropShadow)">
          <ellipse cx="0" cy="0" rx="22" ry="14" fill="url(#silverCoins)" />
          <ellipse cx="0" cy="0" rx="17" ry="10" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.7" />
          <text x="0" y="5" text-anchor="middle" fill="#37474f" font-family="'Inter', sans-serif" font-weight="900" font-size="14">₦</text>
        </g>
        
        <!-- Silver Coin on Wire 2 -->
        <g transform="translate(680, 785) rotate(15)" filter="url(#dropShadow)">
          <ellipse cx="0" cy="0" rx="24" ry="15" fill="url(#silverCoins)" />
          <ellipse cx="0" cy="0" rx="19" ry="11" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.8" />
          <text x="0" y="5" text-anchor="middle" fill="#37474f" font-family="'Inter', sans-serif" font-weight="900" font-size="15">₦</text>
        </g>

        <!-- Silver Coin on Wire 3 -->
        <g transform="translate(930, 560) rotate(-25)" filter="url(#dropShadow)">
          <ellipse cx="0" cy="0" rx="26" ry="17" fill="url(#silverCoins)" />
          <ellipse cx="0" cy="0" rx="20" ry="12" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.8" />
          <text x="0" y="6" text-anchor="middle" fill="#37474f" font-family="'Inter', sans-serif" font-weight="900" font-size="16">₦</text>
        </g>
      </g>

      <!-- GRAPHICS: ATM Machine Group (Right Side) -->
      <g transform="translate(640, 740)" filter="url(#dropShadow)">
        <!-- Outer structure base shadows -->
        <path d="M 0,-250 L 250,-280 L 250,450 L 0,450 Z" fill="#15212c" />
        <path d="M -60,-220 L 0,-250 L 0,450 L -60,450 Z" fill="#243442" />

        <!-- Front panel face (metallic light-grey) -->
        <rect x="25" y="-190" width="180" height="300" fill="#cfd8dc" rx="10" />
        
        <!-- CRT Screen bezel (dark slate) -->
        <rect x="35" y="-160" width="160" height="110" fill="#37474f" rx="8" />
        <!-- Screen interface (glowing teal/cyan) -->
        <rect x="45" y="-150" width="140" height="90" fill="#003d33" rx="4" />
        <rect x="45" y="-150" width="140" height="90" fill="none" stroke="#00e5ff" stroke-width="2" opacity="0.7" />
        <text x="115" y="-115" text-anchor="middle" fill="#00e5ff" font-family="'Courier New', monospace" font-weight="bold" font-size="16" letter-spacing="1">KUDIGRID</text>
        <text x="115" y="-95" text-anchor="middle" fill="#ffffff" font-family="'Courier New', monospace" font-size="12" font-weight="bold" opacity="0.9">READY TO PAY</text>
        <text x="115" y="-75" text-anchor="middle" fill="#81c784" font-family="'Courier New', monospace" font-size="11" font-weight="bold">● TRANSACTIONS LIVE</text>

        <!-- Cash slot unit -->
        <rect x="45" y="-30" width="140" height="24" fill="#1c2d37" rx="3" />
        <rect x="50" y="-24" width="130" height="8" fill="#cfd8dc" rx="1" />
        <!-- Cash bills flowing out! -->
        <g transform="translate(80, -22)" opacity="0.95">
          <rect x="0" y="4" width="76" height="32" fill="#2e7d32" rx="3" transform="rotate(8)" />
          <rect x="3" y="1" width="76" height="32" fill="#4caf50" rx="3" transform="rotate(8)" />
          <text x="41" y="23" text-anchor="middle" fill="#ffffff" font-family="'Inter', sans-serif" font-weight="900" font-size="11" transform="rotate(8)">₦10,000</text>
        </g>

        <!-- Card slot with glowing strip -->
        <rect x="155" y="15" width="30" height="42" fill="#37474f" rx="4" />
        <rect x="160" y="22" width="20" height="5" fill="#00e5ff" filter="url(#buttonGlow)" />

        <!-- Receipt slot -->
        <rect x="45" y="15" width="55" height="12" fill="#37474f" rx="2" />
        <!-- Floating printed receipt slip -->
        <path d="M 50,22 L 50,45 L 90,45 L 90,22 Z" fill="#ffffff" opacity="0.9" />
        <line x1="55" y1="28" x2="85" y2="28" stroke="#78909c" stroke-width="1.5" />
        <line x1="55" y1="34" x2="80" y2="34" stroke="#78909c" stroke-width="1.5" />
        <line x1="55" y1="40" x2="75" y2="40" stroke="#78909c" stroke-width="1.5" />

        <!-- Keypad shelf (3D angle representation) -->
        <polygon points="50,85 170,85 185,125 35,125" fill="#90a4ae" />
        <!-- Small metal buttons -->
        <circle cx="70" cy="95" r="4.5" fill="#37474f" />
        <circle cx="90" cy="95" r="4.5" fill="#37474f" />
        <circle cx="110" cy="95" r="4.5" fill="#37474f" />
        <circle cx="70" cy="110" r="4.5" fill="#37474f" />
        <circle cx="90" cy="110" r="4.5" fill="#37474f" />
        <circle cx="110" cy="110" r="4.5" fill="#37474f" />
      </g>

      <!-- GRAPHICS: Elegant Woman Silhouette standing at ATM -->
      <g transform="translate(530, 520)">
        <!-- Floor drop shadow under feet -->
        <ellipse cx="60" cy="530" rx="90" ry="15" fill="#000000" opacity="0.5" />

        <!-- Left leg trouser -->
        <path d="M 40,320 L 52,510 L 15,510 L 22,320 Z" fill="#2d373c" />
        <!-- Right leg trouser -->
        <path d="M 60,320 L 85,510 L 50,510 L 45,320 Z" fill="#2d373c" />

        <!-- White modern sneakers -->
        <path d="M 15,502 C 15,502 0,510 0,522 L 52,522 L 52,502 Z" fill="#ffffff" stroke="#e0e0e0" stroke-width="1" />
        <path d="M 50,502 C 50,502 35,510 35,522 L 85,522 L 85,502 Z" fill="#ffffff" stroke="#e0e0e0" stroke-width="1" />

        <!-- Torso & Belt -->
        <rect x="30,235" width="55" height="12" fill="#111111" rx="2" /> <!-- Belt -->
        <path d="M 25,120 L 85,120 L 85,240 L 30,240 Z" fill="#3f4d54" />

        <!-- Shoulder joints -->
        <circle cx="28" cy="130" r="12" fill="#3f4d54" />
        <circle cx="82" cy="130" r="12" fill="#3f4d54" />

        <!-- White shoulder strap & designer bag -->
        <g transform="translate(15, 210)" filter="url(#dropShadow)">
          <!-- Strap loop -->
          <path d="M -5,-80 Q 20,-30 40,-80" fill="none" stroke="#ffffff" stroke-width="4.5" />
          <!-- Bag body (LeadsAfrica white purse style) -->
          <path d="M -5,-5 L 45,-5 L 40,42 L 0,42 Z" fill="#ffffff" />
          <path d="M -5,-5 L 45,-5 L 36,12 L 4,12 Z" fill="#f5f5f5" />
          <circle cx="20" cy="12" r="5" fill="#ffb300" />
        </g>

        <!-- Neck -->
        <rect x="50" y="95" width="16" height="28" fill="#8d5524" />

        <!-- Head / Afro hair puff -->
        <!-- Natural hair volume background -->
        <circle cx="45" cy="58" r="28" fill="#111111" />
        <circle cx="62" cy="52" r="24" fill="#111111" />
        <circle cx="70" cy="66" r="22" fill="#111111" />
        <circle cx="58" cy="74" r="20" fill="#8d5524" /> <!-- Face structure base -->
        <circle cx="64" cy="82" r="4.5" fill="#8d5524" /> <!-- Ear -->
        <circle cx="64" cy="85" r="7" fill="none" stroke="#ffd54f" stroke-width="2" /> <!-- Golden earring -->

        <!-- Left arm resting on side -->
        <path d="M 28,135 Q 12,190 30,250" fill="none" stroke="#8d5524" stroke-width="15" stroke-linecap="round" />

        <!-- Right arm extended to ATM, cash in hand -->
        <path d="M 82,135 Q 125,140 145,115" fill="none" stroke="#8d5524" stroke-width="15" stroke-linecap="round" />
        <!-- Cash bills in fingers -->
        <g transform="translate(144, 102) rotate(-10)">
          <rect x="0" y="0" width="30" height="15" fill="#2e7d32" rx="1.5" />
          <rect x="4" y="-4" width="30" height="15" fill="#4caf50" rx="1.5" />
          <circle cx="15" cy="7" r="3" fill="#ffffff" opacity="0.5" />
        </g>
      </g>

      <!-- TYPOGRAPHY: Headline Copy & Bullet (Left Side) -->
      <g transform="translate(80, 270)">
        <!-- Stacked Title -->
        <text x="0" y="50" fill="#ffffff" font-family="'Inter', 'Space Grotesk', system-ui, sans-serif" font-weight="900" font-size="70" letter-spacing="1.5" filter="url(#dropShadow)">ENJOY STEADY</text>
        <text x="0" y="125" fill="#ffffff" font-family="'Inter', 'Space Grotesk', system-ui, sans-serif" font-weight="900" font-size="70" letter-spacing="1.5" filter="url(#dropShadow)">WITHDRAWAL ON</text>
        <text x="0" y="200" fill="#00e5ff" font-family="'Inter', 'Space Grotesk', system-ui, sans-serif" font-weight="900" font-size="72" letter-spacing="2.5" filter="url(#dropShadow)">KUDIGRID</text>

        <!-- Subtitle -->
        <text x="0" y="275" fill="#ffffff" font-family="'Inter', system-ui, sans-serif" font-weight="500" font-size="25" opacity="0.95" line-height="1.5">
          <tspan x="0" dy="0">Earn comfortable this week and make every day a</tspan>
          <tspan x="0" dy="38">payday for you. KudiGrid is just everything you</tspan>
          <tspan x="0" dy="38">need</tspan>
        </text>

        <!-- Button Pill (Glowing) -->
        <g transform="translate(0, 420)" filter="url(#buttonGlow)">
          <rect x="0" y="0" width="320" height="78" fill="url(#btnGrad)" rx="39" stroke="#ffffff" stroke-width="2.5" />
          <text x="160" y="48" text-anchor="middle" fill="#ffffff" font-family="'Inter', 'Space Grotesk', system-ui, sans-serif" font-weight="900" font-size="25" letter-spacing="2">JOIN US NOW!</text>
        </g>
      </g>

      <!-- 3D FLOATING GOLDEN COINS WITH NAIRA SYMBOLS -->
      <!-- Large Golden Coin (Top-Right) -->
      <g transform="translate(850, 390) rotate(22)" filter="url(#dropShadow)">
        <ellipse cx="0" cy="5" rx="76" ry="50" fill="#c62828" opacity="0.1" /> <!-- Ambient shadow -->
        <!-- Coin edge thickness depth -->
        <ellipse cx="0" cy="8" rx="76" ry="48" fill="#d84315" />
        <ellipse cx="0" cy="6" rx="76" ry="48" fill="#ef6c00" />
        <!-- Front Face -->
        <ellipse cx="0" cy="0" rx="76" ry="48" fill="url(#goldCoins)" />
        <!-- Inner ring border -->
        <ellipse cx="0" cy="0" rx="64" ry="39" fill="none" stroke="#ffe082" stroke-width="2.5" opacity="0.75" />
        <!-- Currency symbol -->
        <text x="0" y="15" text-anchor="middle" fill="#ffeb3b" font-family="'Inter', sans-serif" font-weight="900" font-size="52" filter="url(#dropShadow)">₦</text>
        <!-- Ridges along depth cylinder -->
        <line x1="-70" y1="5" x2="-70" y2="13" stroke="#e65100" stroke-width="2" />
        <line x1="-55" y1="20" x2="-55" y2="28" stroke="#e65100" stroke-width="2" />
        <line x1="-30" y1="31" x2="-30" y2="39" stroke="#e65100" stroke-width="2" />
        <line x1="0" y1="36" x2="0" y2="44" stroke="#e65100" stroke-width="2" />
        <line x1="30" y1="31" x2="30" y2="39" stroke="#e65100" stroke-width="2" />
        <line x1="55" y1="20" x2="55" y2="28" stroke="#e65100" stroke-width="2" />
        <line x1="70" y1="5" x2="70" y2="13" stroke="#e65100" stroke-width="2" />
      </g>

      <!-- Smaller Golden Coin (Middle-Left) -->
      <g transform="translate(85, 430) rotate(-18)" filter="url(#dropShadow)">
        <ellipse cx="0" cy="4" rx="42" ry="26" fill="#d84315" />
        <ellipse cx="0" cy="3" rx="42" ry="26" fill="#ef6c00" />
        <ellipse cx="0" cy="0" rx="42" ry="26" fill="url(#goldCoins)" />
        <ellipse cx="0" cy="0" rx="34" ry="20" fill="none" stroke="#ffe082" stroke-width="1.5" opacity="0.75" />
        <text x="0" y="8" text-anchor="middle" fill="#ffeb3b" font-family="'Inter', sans-serif" font-weight="900" font-size="26">₦</text>
      </g>

      <!-- FLOATING SOCIAL MEDIA FOOTER CAPSULE PILL -->
      <g transform="translate(80, 1070)" filter="url(#capsuleGlow)">
        <!-- Shiny neon background bar -->
        <rect x="0" y="0" width="400" height="70" fill="#012b3c" rx="35" stroke="#00e5ff" stroke-width="2.5" opacity="0.9" />
        
        <!-- Social Icons (Instagram, Telegram, TikTok) -->
        <g transform="translate(35, 21)">
          <!-- Instagram -->
          <g transform="translate(0, 0)">
            <rect x="0" y="0" width="26" height="26" fill="none" stroke="#ffffff" stroke-width="2.5" rx="7" />
            <circle cx="13" cy="13" r="5.5" fill="none" stroke="#ffffff" stroke-width="2.5" />
            <circle cx="19.5" cy="6.5" r="1.8" fill="#ffffff" />
          </g>
          <!-- Telegram -->
          <g transform="translate(42, 0)">
            <path d="M 2,12 L 24,2 L 19,23 L 12,15 L 8,19 L 9,13 Z" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" />
            <path d="M 24,2 L 12,15" fill="none" stroke="#ffffff" stroke-width="2.5" />
          </g>
          <!-- TikTok -->
          <g transform="translate(84, 0)">
            <path d="M 10,2 L 10,18 A 4.5,4.5 0 1,1 5.5,13.5 A 4.5,4.5 0 0,1 10,18 L 10,8 A 5.5,5.5 0 0,0 15.5,13.5" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
          </g>
        </g>

        <!-- Social Username Text -->
        <text x="160" y="44" fill="#ffffff" font-family="'Inter', system-ui, sans-serif" font-weight="800" font-size="25" letter-spacing="1">KudiGridhq</text>
      </g>
    </svg>`;
  };

  const handleDownloadBanner = () => {
    try {
      const svgString = generateSvgBanner(username);
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kudigrid_sponsored_banner_${username}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccess("KudiGrid cyan campaign banner downloaded successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to download campaign banner.");
    }
  };

  // Copy caption content to clipboard
  const handleCopyCaption = () => {
    const cleanDomain = currentDomain.replace(/^https?:\/\//, "");
    const textToCopy = `Another week to keep earning Big from KudiGrid while you are still observing 🤔
As you keep observing, people are being credited. 🥳🥳
With just N750, N1,500 and many more plans. 
Join the train and make everyday count for you too 🔥
Don't observe take action now!!!!!!!
Registration Link: ${cleanDomain}?ref=${username}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setSuccess("Caption copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => setSuccess(null), 3000);
    }).catch((err) => {
      console.error("Failed to copy text", err);
      setError("Copy failed, please highlight and copy manually.");
    });
  };

  // Submit Proof Logic - Directly atomic via transactions (no localStorage caching used)
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (dailyReward <= 0) {
      setError("You must have an active membership plan to earn daily task rewards.");
      return;
    }

    if (!screenshotFile) {
      setError("Please select or upload a screenshot as proof of task.");
      return;
    }

    if (isTaskCompletedToday) {
      setError("You have already completed today's Sponsored Post task.");
      return;
    }

    setLoading(true);

    try {
      const userRef = doc(db, "users", username);
      const taskId = `sponsored_post_${todayKey}`;

      // Run Transaction to read live data and apply atomic updates
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error("User account was not found.");
        }

        const data = userDoc.data();
        const livePlan = data.currentPlan ?? "None";
        const calculatedReward = getDailyRewardValue(livePlan);

        if (calculatedReward <= 0) {
          throw new Error("You must have an active membership plan to earn daily task rewards.");
        }

        // 1. Atomically increment the taskBalance in Firestore
        transaction.update(userRef, {
          taskBalance: increment(calculatedReward),
        });

        // 2. Register the completed task in the completedTasks sub-collection
        const completedTaskRef = doc(db, "users", username, "completedTasks", taskId);
        transaction.set(completedTaskRef, {
          taskId: taskId,
          taskTitle: "Daily Sponsored Post",
          rewardAmount: calculatedReward,
          timestamp: new Date().toISOString(),
          status: "Success",
          screenshotName: screenshotFile.name,
        });
      });

      setSuccess(`Completed successfully! ${formatNaira(dailyReward)} added to task balance!`);
      setScreenshotFile(null);
      setScreenshotPreview(null);
      setTaskStarted(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to submit task proof.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 pb-24 bg-white overflow-y-auto relative h-full">
      {/* Toast Notification */}
      <AnimatePresence>
        {(error || success) && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-12 left-1/2 -translate-x-1/2 z-100 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 w-[90%] max-w-[340px] ${
              success
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {success ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="text-xs font-semibold leading-tight">{success || error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="px-6 pt-6 pb-4 flex items-center gap-4 bg-white border-b border-[#8c6239]/10 shrink-0">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-[#f4eee1] hover:bg-[#ebdcb9] border border-[#8c6239]/10 text-[#3d2314] transition-all cursor-pointer flex items-center justify-center active:scale-95"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-4 h-4 text-[#8c6239]" />
        </button>
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-[#8c6239]/80 font-display">
            Daily tasks
          </p>
          <h2 className="text-sm font-bold text-[#3d2314]">
            Complete small tasks to earn passive income
          </h2>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-5 flex-1 pb-10">
        
        {/* Available Tasks Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#3d2314]">
              Available tasks
            </span>
            <span className="px-2 py-0.5 bg-[#dfb04d]/20 border border-[#dfb04d]/30 text-[#b4860f] text-[9px] font-bold rounded-full uppercase tracking-wider">
              {isTaskCompletedToday ? "0 Live" : "1 Live"}
            </span>
          </div>
          
          <div className="text-[10px] font-bold text-[#8c6239]">
            Active Plan: <span className="text-[#3d2314] underline font-extrabold">{currentPlan || "None"}</span>
          </div>
        </div>

        {/* Task Detail Card */}
        {isTaskCompletedToday ? (
          <div className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200/50 flex flex-col items-center justify-center text-center space-y-3.5 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-emerald-950">Daily Post Completed</h4>
              <p className="text-xs text-emerald-800 font-medium">
                Awesome! You have completed today's sponsored task. Come back tomorrow for new campaigns.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#8c6239]/10 overflow-hidden bg-[#fdfaf6] shadow-sm flex flex-col">
            
            {/* RE-DESIGNED PREMIUM SPONSORED POST BANNER COMPONENT */}
            <div className="p-4 bg-neutral-950 flex flex-col items-center">
              <div 
                className="w-full max-w-[360px] aspect-[1/1.25] shadow-2xl rounded-2xl overflow-hidden bg-[#011b26] border border-neutral-800/80 flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: generateSvgBanner(username) }}
              />

              {/* Download Action Bar */}
              <div className="mt-4.5 w-full max-w-[360px] flex items-center justify-between">
                <span className="text-[9px] text-[#00e5ff] font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#00e5ff] animate-pulse" />
                  KudaGrid Sponsored Banner
                </span>
                <button
                  onClick={handleDownloadBanner}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 border-none shadow-[0_4px_12px_rgba(245,127,23,0.3)]"
                  title="Download vector SVG banner"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  Download Banner
                </button>
              </div>
            </div>

            {/* Task Reward Info Bar */}
            <div className="px-4 py-3 bg-[#3d2314] text-white flex items-center justify-between border-b border-[#8c6239]/10">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#dfb04d]">
                Campaign Payout
              </span>
              <span className="text-sm font-extrabold font-mono text-[#fdfaf6]">
                {formatNaira(dailyReward)} / day
              </span>
            </div>

            {/* Task Content Details */}
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#3d2314] uppercase tracking-wider">
                    Copy Post Caption
                  </h3>
                  <button
                    onClick={handleCopyCaption}
                    className="text-[10px] font-bold text-[#3d2314] hover:text-[#b4860f] flex items-center gap-1 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#8c6239]" />
                        <span>Copy Caption</span>
                      </>
                    )}
                  </button>
                </div>
                
                {/* Click-to-Copy Caption Layout */}
                <div 
                  onClick={handleCopyCaption}
                  className="p-3 bg-white border border-[#8c6239]/15 rounded-xl relative cursor-pointer hover:bg-neutral-50/50 transition-colors group select-all"
                  title="Click to copy caption"
                >
                  <p className="text-[10.5px] font-medium text-[#3d2314] leading-relaxed whitespace-pre-wrap">
                    Another week to keep earning Big from KudiGrid while you are still observing 🤔
As you keep observing, people are being credited. 🥳🥳
With just N750, N1,500 and many more plans. 
Join the train and make everyday count for you too 🔥
Don't observe take action now!!!!!!!
Registration Link: <span className="text-[#b4860f] font-bold">{`${currentDomain.replace(/^https?:\/\//, "")}?ref=${username}`}</span>
                  </p>
                  
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#fdfaf6] border border-[#8c6239]/20 rounded-md p-1">
                    <Copy className="w-3.5 h-3.5 text-[#3d2314]" />
                  </div>
                </div>
              </div>

              {/* Step 1: Click start task / Share to Facebook */}
              {!taskStarted ? (
                <div className="space-y-2">
                  <p className="text-[10px] text-[#8c6239] font-medium italic">
                    * Step 1: Tap below to copy caption and open Facebook to post.
                  </p>
                  <button
                    onClick={handleStartTask}
                    className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#3d2314] text-white hover:bg-[#2b180d] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 border-none"
                  >
                    <Facebook className="w-4 h-4 text-[#dfb04d]" />
                    Share to Facebook
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitProof} className="space-y-3.5">
                  <div className="p-3 bg-amber-50/50 border border-amber-200/50 rounded-xl flex items-center gap-2 text-[10px] text-amber-900 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Upload your shared Facebook post proof screenshot below.</span>
                  </div>

                  {/* Step 2: Upload Zone */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#3d2314]">
                      Upload Proof Screenshot
                    </label>
                    <div className="relative border-2 border-dashed border-[#8c6239]/20 hover:border-[#8c6239]/40 rounded-xl overflow-hidden bg-white transition-all cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        required
                      />
                      {screenshotPreview ? (
                        <div className="p-2 flex items-center gap-3">
                          <img
                            src={screenshotPreview}
                            alt="Screenshot Proof Preview"
                            className="w-12 h-12 object-cover rounded-lg border border-[#8c6239]/10"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-[#3d2314] truncate">
                              {screenshotFile?.name}
                            </p>
                            <p className="text-[8px] text-neutral-400 font-medium">
                              File ready for verification
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setScreenshotFile(null);
                              setScreenshotPreview(null);
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg mr-2 shrink-0 relative z-20 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="py-6 flex flex-col items-center justify-center text-center px-4 space-y-1.5">
                          <Upload className="w-6 h-6 text-[#8c6239]/50" />
                          <p className="text-[11px] font-bold text-[#3d2314]">
                            Upload Screenshot Proof
                          </p>
                          <p className="text-[9px] text-[#8c6239]/60">
                            JPG, PNG up to 5MB
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3D Submit Button */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTaskStarted(false)}
                      className="px-4 py-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold uppercase transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !screenshotFile}
                      className="flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-[#d4a017] to-[#b4860f] hover:brightness-110 text-[#2b180d] transition-all transform active:scale-95 shadow-[0_4px_12px_rgba(212,160,23,0.25)] border-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#2b180d]" />
                          Verifying Proof...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-[#2b180d]" />
                          Submit Task Proof
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* COMPLETED TASKS PANEL */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#3d2314]">
              Completed tasks
            </h3>
            <span className="text-[10px] font-bold text-[#8c6239]/80 bg-[#f4eee1] px-2 py-0.5 rounded-full">
              Total: {completedTasks.length}
            </span>
          </div>

          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-6 text-[#8c6239]/60">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-[10px] font-semibold mt-1">Checking completion ledger...</p>
            </div>
          ) : completedTasks.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-[#8c6239]/15 text-center text-[#8c6239]/60">
              <p className="text-xs font-medium">No tasks completed yet</p>
              <p className="text-[10px]">Your daily verified task payouts will reflect here in real-time.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {completedTasks.map((record) => (
                <div
                  key={record.id}
                  className="p-3.5 bg-[#fdfaf6] border border-[#8c6239]/10 rounded-2xl flex items-center justify-between transition-all hover:bg-[#fcf8f1]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                      <Check className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-[#3d2314]">
                        {record.taskTitle}
                      </h4>
                      <p className="text-[9px] text-emerald-700 font-extrabold font-mono">
                        +{formatNaira(record.rewardAmount)}
                      </p>
                      <p className="text-[8px] text-neutral-400 font-medium">
                        {formatDate(record.timestamp)} • Proof: {record.screenshotName || "image.png"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 uppercase tracking-wide">
                      Success
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* FIXED FLOATING NAVIGATION BAR ON DAILY TASKS SCREEN */}
      <div className="absolute bottom-5 inset-x-5 h-16 bg-white border border-[#8c6239]/15 rounded-2xl flex items-center justify-around px-4 shadow-[0_12px_24px_rgba(43,24,13,0.12)] z-30">
        {/* Home Button */}
        <button
          onClick={onNavigateToVault}
          className="flex flex-col items-center gap-1 transition-all duration-300 relative py-1 cursor-pointer text-[#8c6239]/60 hover:text-[#8c6239]"
        >
          <ImageIcon className="w-5 h-5 text-[#8c6239]/70" />
          <span className="text-[9px] font-bold tracking-wider font-display">Vault</span>
        </button>

        {/* Referral Button */}
        <button
          onClick={onNavigateToReferral}
          className="flex flex-col items-center gap-1 transition-all duration-300 relative py-1 cursor-pointer text-[#8c6239]/60 hover:text-[#8c6239]"
        >
          <UserPlus className="w-5 h-5 text-[#8c6239]/70" />
          <span className="text-[9px] font-bold tracking-wider font-display">Referral</span>
        </button>

        {/* Tasks Button */}
        <button
          className="flex flex-col items-center gap-1 transition-all duration-300 relative py-1 cursor-pointer text-[#3d2314] scale-105"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-wider font-display">Tasks</span>
          <motion.div
            layoutId="nav-indicator-tasks"
            className="absolute -bottom-1 w-5 h-0.75 bg-[#3d2314] rounded-full"
          />
        </button>

        {/* Profile Button */}
        <button
          onClick={onNavigateToIdentity}
          className="flex flex-col items-center gap-1 transition-all duration-300 relative py-1 cursor-pointer text-[#8c6239]/60 hover:text-[#8c6239]"
        >
          <CheckCircle2 className="w-5 h-5 text-[#8c6239]/70" />
          <span className="text-[9px] font-bold tracking-wider font-display">Identity</span>
        </button>
      </div>

    </div>
  );
}
