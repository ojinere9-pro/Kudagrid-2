export interface UserProfile {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  referral: string | null;
  depositBalance: number;
  referralBalance: number;
  taskBalance: number;
  currentPlan: string;
  isAdmin?: boolean;
}

export enum AppScreen {
  AUTH = "AUTH",
  DASHBOARD = "DASHBOARD",
  UPGRADE = "UPGRADE",
  WITHDRAW = "WITHDRAW",
  TASKS = "TASKS",
  ADMIN = "ADMIN",
}

export interface ServiceItem {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface DepositRecord {
  id: string;
  amount: number;
  transactionId: string;
  txRef: string;
  paymentMethod: string;
  status: "successful" | "pending" | "failed";
  createdAt: string;
}

export interface GlobalSettings {
  minDeposit: number;
  minWithdrawalCommission: number;
  minWithdrawalReferral: number;
  minWithdrawalDeposit: number;
  portals: {
    registration: boolean;
    deposit: boolean;
    commissionWithdrawal: boolean;
    referralWithdrawal: boolean;
    planPurchase: boolean;
    dailyTasks: boolean;
    referralSystem: boolean;
  };
  taskBannerUrl?: string;
  taskCaption?: string;
}

export interface InvestmentPlan {
  id: string;
  name: string;
  price: number;
  dailyTasks: number;
  earningsPerTask: number;
  dailyEarnings: number;
  monthlyEarnings: number;
  status: "Active" | "Inactive";
  order: number;
}

export interface AdminUser {
  id: string;
  email: string;
  role: "Super Admin" | "Admin" | "Support";
  status: "Active" | "Inactive";
}

export interface BalanceAuditLog {
  id: string;
  adminId: string;
  userId: string;
  type: "commission" | "referral" | "deposit";
  amount: number;
  oldBalance: number;
  newBalance: number;
  reason: string;
  timestamp: string;
}
