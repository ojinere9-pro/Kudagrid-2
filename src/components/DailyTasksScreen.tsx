import React, { useState, useEffect } from "react";
import { doc, collection, onSnapshot, runTransaction, increment } from "firebase/firestore";
import { db } from "../firebase";
import { 
  ArrowLeft, Download, Upload, Check, Loader2, Sparkles, AlertCircle, 
  Facebook, CheckCircle2, ChevronRight, Image as ImageIcon, Copy,
  Coins as CoinsIcon, Landmark, Send, Instagram, UserPlus, X
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
  const [showWarning, setShowWarning] = useState(true);

  const PLATFORMS = ["Telegram", "Facebook", "WhatsApp", "DM"] as const;
  type Platform = (typeof PLATFORMS)[number];
  
  const [activePlatform, setActivePlatform] = useState<Platform | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("Telegram");
  const [view, setView] = useState<"list" | "details">("list");

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

  // Check if today's sponsored post task is already completed for a specific platform
  const isTaskCompleted = (platform: Platform) => {
    // Use local date for YYYY-MM-DD to respect local midnight reset
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayKey = `${year}-${month}-${day}`;
    
    return completedTasks.some(
      (task) => task.taskId === `sponsored_post_${platform}_${todayKey}`
    );
  };

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

  // Handle start task
  const handleStartTask = (platform: Platform) => {
    if (platform === "Telegram") {
      window.open("https://t.me/share/url?url=" + encodeURIComponent(currentDomain), "_blank");
    } else if (platform === "WhatsApp") {
      window.open("https://wa.me/?text=" + encodeURIComponent("Check this out!"), "_blank");
    } else if (platform === "Facebook") {
      window.open("https://facebook.com/groups", "_blank");
    } else if (platform === "DM") {
      // DM task should NOT automatically open any social media
      setSuccess("Please share the banner and message through private chats.");
      setTimeout(() => setSuccess(null), 3000);
    }
    setTaskStarted(true);
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

    if (!screenshotFile || !activePlatform) {
      setError("Please select or upload a screenshot as proof of task.");
      return;
    }

    if (isTaskCompleted(activePlatform)) {
      setError(`You have already completed today's ${activePlatform} task.`);
      return;
    }

    setLoading(true);

    try {
      const userRef = doc(db, "users", username);
      const todayKey = new Date().toISOString().split("T")[0];
      const taskId = `sponsored_post_${activePlatform}_${todayKey}`;

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

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayKey = `${year}-${month}-${day}`;
        const taskId = `sponsored_post_${activePlatform}_${todayKey}`;

        console.log(`[Task] Crediting ${calculatedReward} NGN to taskBalance for ${username}. Plan: ${livePlan}`);

        // 1. Atomically increment the taskBalance in Firestore
        transaction.update(userRef, {
          taskBalance: increment(calculatedReward),
        });
        
        console.log(`[Task] Successfully incremented taskBalance for ${username}`);

        // 2. Register the completed task in the completedTasks sub-collection
        const completedTaskRef = doc(db, "users", username, "completedTasks", taskId);
        transaction.set(completedTaskRef, {
          taskId: taskId,
          username: username,
          taskTitle: `Sponsored Post (${activePlatform})`,
          membershipPlan: livePlan,
          rewardAmount: calculatedReward,
          platform: activePlatform,
          timestamp: new Date().toISOString(),
          status: "Success",
          screenshotName: screenshotFile.name,
          screenshot: screenshotPreview, // Save the actual screenshot data URL
        });
      });

      setSuccess(`Completed successfully! ${formatNaira(dailyReward)} added to task balance!`);
      setScreenshotFile(null);
      setScreenshotPreview(null);
      setTaskStarted(false);
      setView("list");
      setActivePlatform(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to submit task proof.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 pb-24 bg-white overflow-y-auto relative h-full">
      {/* Warning Popup */}
      <AnimatePresence>
        {showWarning && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWarning(false)}
              className="absolute inset-0 bg-[#2b180d]/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              className="relative w-full max-w-[360px] bg-white rounded-[32px] overflow-hidden shadow-2xl border border-[#d4a017]/20"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto border border-amber-100">
                  <AlertCircle className="w-8 h-8 text-amber-600 animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-[#3d2314] uppercase tracking-wider">
                    ⚠️ Important Notice
                  </h3>
                  <p className="text-xs text-[#8c6239] font-medium leading-relaxed">
                    Please complete each task only on the platform instructed.
                    <br /><br />
                    Uploading fake screenshots, edited screenshots, duplicate screenshots, or screenshots from the wrong platform may cause your account to be <span className="text-red-600 font-bold">PERMANENTLY BANNED</span>.
                  </p>
                </div>

                <div className="p-4 bg-[#fdfaf6] rounded-2xl border border-[#8c6239]/10 text-left space-y-3 max-h-[300px] overflow-y-auto">
                  <div className="space-y-2">
                    <p className="text-[10px] text-[#3d2314] font-bold uppercase tracking-tight">Telegram Task:</p>
                    <p className="text-[10px] text-[#8c6239] font-medium leading-tight">Only share on Telegram (Story, Group, Channel, or Chat).</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] text-[#3d2314] font-bold uppercase tracking-tight">Facebook Task:</p>
                    <p className="text-[10px] text-[#8c6239] font-medium leading-tight">Post only inside Facebook Groups. The group name must be visible in your screenshot.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] text-[#3d2314] font-bold uppercase tracking-tight">WhatsApp Task:</p>
                    <p className="text-[10px] text-[#8c6239] font-medium leading-tight">Share only on WhatsApp Status, Groups, or Channels.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] text-[#3d2314] font-bold uppercase tracking-tight">DM Task:</p>
                    <p className="text-[10px] text-[#8c6239] font-medium leading-tight">Share only through private chats on any platform.</p>
                  </div>
                  <div className="pt-2 border-t border-[#8c6239]/5">
                    <p className="text-[10px] text-[#3d2314] font-bold leading-normal">
                      Uploading fake screenshots, edited screenshots, duplicate screenshots, or screenshots from the wrong platform may cause your withdrawal request to be delayed, placed on hold, or rejected.
                    </p>
                    <p className="text-[10px] text-[#3d2314] font-medium leading-normal italic mt-2 opacity-80">
                      Task rewards are credited immediately, but every submission will be reviewed before withdrawal approval.
                    </p>
                  </div>
                </div>

                <p className="text-[10px] font-black text-[#d4a017] uppercase tracking-widest">
                  Follow instructions for fast withdrawals.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowWarning(false)}
                    className="flex-1 py-4 bg-[#3d2314] text-white rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-premium-3d"
                  >
                    I Understand
                  </button>
                  <button
                    onClick={() => setShowWarning(false)}
                    className="p-4 bg-neutral-100 text-[#3d2314] rounded-2xl active:scale-95 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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

      <div className="flex items-center px-6 pt-6 pb-4 border-b border-[#8c6239]/10 bg-white sticky top-0 z-50">
        <button 
          onClick={view === "details" ? () => { setView("list"); setTaskStarted(false); setActivePlatform(null); } : onBack}
          className="p-2.5 rounded-xl bg-[#f4eee1] hover:bg-[#ebdcb9] border border-[#8c6239]/10 text-[#3d2314] transition-all cursor-pointer flex items-center justify-center active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-[#8c6239]" />
        </button>
        <div className="ml-4">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-[#8c6239]/80 font-display">
            {view === "details" ? `${activePlatform} Task Details` : "Daily missions"}
          </p>
          <h2 className="text-sm font-bold text-[#3d2314]">
            {view === "details" ? "Follow instructions carefully" : "Complete small tasks to earn passive income"}
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {view === "list" ? (
          <div className="p-5 space-y-6">
            {/* Available Tasks Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#3d2314]">
                  Available tasks
                </span>
                <span className="px-2 py-0.5 bg-[#dfb04d]/20 border border-[#dfb04d]/30 text-[#b4860f] text-[9px] font-bold rounded-full uppercase tracking-wider">
                  {PLATFORMS.filter(p => !isTaskCompleted(p)).length} Remainder
                </span>
              </div>
              <div className="text-[10px] font-bold text-[#8c6239]">
                Plan: <span className="text-[#3d2314] font-extrabold">{currentPlan || "None"}</span>
              </div>
            </div>

            {/* Task Cards */}
            <div className="space-y-4">
              {PLATFORMS.map((platform) => {
                const completed = isTaskCompleted(platform);
                return (
                  <button
                    key={platform}
                    onClick={() => {
                      if (!completed) {
                        setActivePlatform(platform);
                        setView("details");
                      }
                    }}
                    disabled={completed}
                    className={`w-full text-left bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col ${
                      completed 
                        ? "border-emerald-100 opacity-80" 
                        : "border-[#8c6239]/15 shadow-sm hover:border-[#d4a017]/30 active:scale-98"
                    }`}
                  >
                    <div className="p-5 flex items-start justify-between w-full">
                      <div className="flex gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
                          completed ? "bg-emerald-50 text-emerald-600" : "bg-[#fdfaf6] text-[#3d2314]"
                        }`}>
                          {platform === "Telegram" && <Send className="w-6 h-6" />}
                          {platform === "Facebook" && <Facebook className="w-6 h-6" />}
                          {platform === "WhatsApp" && <CheckCircle2 className="w-6 h-6" />}
                          {platform === "DM" && <UserPlus className="w-6 h-6" />}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-[#3d2314] flex items-center gap-2">
                            {platform} Task
                            {completed && <Check className="w-3 h-3 text-emerald-500" />}
                          </h3>
                          <p className="text-[11px] text-[#8c6239] font-medium mt-0.5">
                            Daily Sponsored Advert
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-[#d4a017] block uppercase">Reward</span>
                        <span className="text-sm font-black text-[#3d2314]">
                          {formatNaira(dailyReward)}
                        </span>
                      </div>
                    </div>
                    {completed && (
                      <div className="px-5 py-2.5 bg-emerald-50/50 border-t border-emerald-100/50">
                        <div className="flex items-center gap-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mission Accomplished
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* History Panel (Restored and Improved) */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#3d2314]">
                  Recently Verified
                </h3>
                <span className="text-[10px] font-bold text-[#8c6239]/80">
                  Total: {completedTasks.length}
                </span>
              </div>

              {loadingHistory ? (
                <div className="py-10 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-[#d4a017]" />
                  <p className="text-[10px] font-bold text-[#8c6239] uppercase tracking-widest">Syncing ledger...</p>
                </div>
              ) : completedTasks.length === 0 ? (
                <div className="p-10 rounded-2xl border border-dashed border-[#8c6239]/15 text-center">
                  <p className="text-xs font-medium text-[#8c6239]/60 italic">No tasks completed today.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedTasks.slice(0, 5).map((record) => (
                    <div
                      key={record.id}
                      className="p-4 bg-[#fdfaf6] border border-[#8c6239]/10 rounded-2xl flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-[#3d2314] truncate max-w-[140px]">
                            {record.taskTitle}
                          </h4>
                          <p className="text-[9px] text-emerald-700 font-extrabold">
                            +{formatNaira(record.rewardAmount)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] text-neutral-400 font-bold uppercase">
                          {formatDate(record.timestamp).split(',')[0]}
                        </p>
                        <span className="text-[8px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 uppercase mt-1 inline-block">
                          Success
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Task Details View (Restored with Banner and write-up) */
          <div className="p-5 space-y-8 pb-24">
            {/* Banner Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-[#d4a017] uppercase tracking-widest">
                  1. Promotional Banner
                </span>
                <button
                  onClick={handleDownloadBanner}
                  className="flex items-center gap-1.5 text-[10px] font-black text-[#3d2314] uppercase bg-amber-100/50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer border-none"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
              <div 
                className="w-full aspect-[1/1.25] shadow-2xl rounded-2xl overflow-hidden bg-[#011b26] border border-neutral-800/80 flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: generateSvgBanner(username) }}
              />
            </div>

            {/* Write-up Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-[#d4a017] uppercase tracking-widest">
                  2. Promotional Write-up
                </span>
                <button
                  onClick={handleCopyCaption}
                  className="flex items-center gap-1.5 text-[10px] font-black text-[#3d2314] uppercase bg-amber-100/50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer border-none"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy Message"}
                </button>
              </div>
              <div className="p-5 bg-[#fdfaf6] border border-[#8c6239]/10 rounded-2xl text-xs text-[#3d2314] font-medium leading-relaxed whitespace-pre-wrap select-all shadow-inner">
                {`Another week to keep earning Big from KudiGrid while you are still observing 🤔
As you keep observing, people are being credited. 🥳🥳
With just N750, N1,500 and many more plans. 
Join the train and make everyday count for you too 🔥
Don't observe take action now!!!!!!!
Registration Link: ${currentDomain.replace(/^https?:\/\//, "")}?ref=${username}`}
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-4">
              <span className="text-[10px] font-black text-[#d4a017] uppercase tracking-widest">
                3. Step-by-Step Instructions
              </span>
              <div className="bg-[#3d2314] rounded-3xl p-6 text-white space-y-6 shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#dfb04d] text-[#3d2314] flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                  <p className="text-xs font-medium leading-normal opacity-90">
                    Download the banner and copy the promotional write-up message above.
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#dfb04d] text-[#3d2314] flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                  <div className="text-xs font-medium leading-normal opacity-90">
                    {activePlatform === "Telegram" && (
                      <div className="space-y-2">
                        <p>Share the banner and message to your Telegram:</p>
                        <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#dfb04d]/90">
                          <li>Telegram Story</li>
                          <li>Telegram Group</li>
                          <li>Telegram Channel</li>
                          <li>Telegram Chat</li>
                        </ul>
                      </div>
                    )}
                    {activePlatform === "Facebook" && (
                      <div className="space-y-2">
                        <p>Share the banner and message inside Facebook Groups:</p>
                        <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#dfb04d]/90">
                          <li>Do NOT use the same group every day.</li>
                          <li>The Group Name MUST be clearly visible in your screenshot.</li>
                        </ul>
                      </div>
                    )}
                    {activePlatform === "WhatsApp" && (
                      <div className="space-y-2">
                        <p>Post to your WhatsApp Status, Groups, or Channels.</p>
                      </div>
                    )}
                    {activePlatform === "DM" && (
                      <div className="space-y-2">
                        <p>Share through private chats on ANY platform (Telegram DM, FB Messenger, IG DM, etc).</p>
                        <p className="text-[10px] italic opacity-70">The choice of platform is yours.</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#dfb04d] text-[#3d2314] flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                  <p className="text-xs font-medium leading-normal opacity-90">
                    Take a clear screenshot of your shared post and return here to upload your proof.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {!taskStarted ? (
              <button
                onClick={() => handleStartTask(activePlatform!)}
                className="w-full py-5 bg-[#d4a017] text-[#3d2314] rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg border-none cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Start {activePlatform} Task
              </button>
            ) : (
              <form onSubmit={handleSubmitProof} className="space-y-5">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-[10px] text-emerald-800 font-bold text-center">
                  Task started! Please upload your screenshot proof below.
                </div>
                
                <div className="p-8 bg-white rounded-2xl border-2 border-dashed border-[#8c6239]/20 flex flex-col items-center justify-center space-y-4 relative overflow-hidden">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                    required
                  />
                  {screenshotPreview ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-sm z-10">
                      <img src={screenshotPreview} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-white font-black uppercase tracking-widest">Change Image</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center">
                        <Upload className="w-7 h-7 text-[#8c6239]" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black text-[#3d2314] uppercase tracking-wider">Click to upload screenshot</p>
                        <p className="text-[10px] text-[#8c6239] mt-1 font-medium italic">PNG or JPG (Max 5MB)</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => { setTaskStarted(false); setScreenshotFile(null); setScreenshotPreview(null); }}
                    className="flex-1 py-4.5 bg-neutral-100 text-[#3d2314] rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all border-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !screenshotFile}
                    className="flex-[2] py-4.5 bg-[#3d2314] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 border-none cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {loading ? "Submitting..." : "Submit Screenshot"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* FIXED FLOATING NAVIGATION BAR */}
      <div className="absolute bottom-5 inset-x-5 h-16 bg-white border border-[#8c6239]/15 rounded-2xl flex items-center justify-around px-4 shadow-[0_12px_24px_rgba(43,24,13,0.12)] z-30">
        <button onClick={onNavigateToVault} className="flex flex-col items-center gap-1 transition-all text-[#8c6239]/60 hover:text-[#8c6239] border-none bg-transparent cursor-pointer">
          <ImageIcon className="w-5 h-5 opacity-70" />
          <span className="text-[9px] font-bold tracking-wider">Vault</span>
        </button>
        <button onClick={onNavigateToReferral} className="flex flex-col items-center gap-1 transition-all text-[#8c6239]/60 hover:text-[#8c6239] border-none bg-transparent cursor-pointer">
          <UserPlus className="w-5 h-5 opacity-70" />
          <span className="text-[9px] font-bold tracking-wider">Referral</span>
        </button>
        <button className="flex flex-col items-center gap-1 transition-all text-[#3d2314] border-none bg-transparent cursor-pointer scale-110">
          <Sparkles className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-wider">Tasks</span>
          <div className="absolute -bottom-1 w-5 h-0.75 bg-[#3d2314] rounded-full" />
        </button>
        <button onClick={onNavigateToIdentity} className="flex flex-col items-center gap-1 transition-all text-[#8c6239]/60 hover:text-[#8c6239] border-none bg-transparent cursor-pointer">
          <CheckCircle2 className="w-5 h-5 opacity-70" />
          <span className="text-[9px] font-bold tracking-wider">Identity</span>
        </button>
      </div>

    </div>
  );
}
