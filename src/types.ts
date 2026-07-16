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
