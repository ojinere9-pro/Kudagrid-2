import React, { useEffect, useState } from "react";
import { 
  doc, collection, getDocs, query, where, updateDoc, 
  collectionGroup, getDoc 
} from "firebase/firestore";
import { db } from "../firebase";

interface RecoveryProps {
  username: string;
  onComplete: () => void;
}

export const AccountRecovery: React.FC<RecoveryProps> = ({ username, onComplete }) => {
  const [status, setStatus] = useState<string>("Initializing recovery...");

  useEffect(() => {
    const performRecovery = async () => {
      try {
        const userRef = doc(db, "users", username);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          setStatus("User not found.");
          return;
        }

        const userData = userSnap.data();
        if (userData.recoveryStatus === "completed") {
          console.log("[Recovery] Already completed for this user.");
          onComplete();
          return;
        }

        console.log(`[Recovery] Starting recovery for ${username}...`);

        // 1. Recalculate referralBalance
        setStatus("Recalculating referral balance...");
        const referralTxRef = collection(db, "users", username, "referralTransactions");
        const referralTxSnap = await getDocs(referralTxRef);
        let totalReferralBonus = 0;
        referralTxSnap.forEach(docSnap => {
          totalReferralBonus += (docSnap.data().bonusAmount || 0);
        });
        console.log(`[Recovery] Total Referral Bonus: ${totalReferralBonus}`);

        // 2. Recalculate taskBalance and Infer Plan
        setStatus("Recalculating task balance...");
        const completedTasksRef = collection(db, "users", username, "completedTasks");
        const completedTasksSnap = await getDocs(completedTasksRef);
        let totalTaskEarnings = 0;
        let inferredPlan = userData.currentPlan || "None";
        let maxReward = 0;
        
        completedTasksSnap.forEach(docSnap => {
          const reward = docSnap.data().rewardAmount || 0;
          totalTaskEarnings += reward;
          if (reward > maxReward) {
            maxReward = reward;
          }
        });
        console.log(`[Recovery] Total Task Earnings: ${totalTaskEarnings}, Max Reward: ${maxReward}`);

        // Map maxReward back to plan
        const rewardToPlan: Record<number, string> = {
          50: "Starter-750",
          100: "Basic-1500",
          200: "Bronze-3000",
          350: "Silver-5000",
          666: "Gold-10000",
          1000: "Platinum-15000",
          1400: "Diamond-20000",
          2000: "Elite-30000",
          2700: "Sapphire-40000",
          3300: "Obsidian-50000",
          7000: "Sovereign-100000"
        };
        
        if (rewardToPlan[maxReward]) {
          inferredPlan = rewardToPlan[maxReward];
          console.log(`[Recovery] Inferred Plan: ${inferredPlan}`);
        }

        // 3. Subtract Withdrawals
        setStatus("Subtracting withdrawals...");
        const payoutsRef = collection(db, "users", username, "payouts");
        const payoutsSnap = await getDocs(payoutsRef);
        
        let referralWithdrawals = 0;
        let taskWithdrawals = 0;
        
        payoutsSnap.forEach(docSnap => {
          const data = docSnap.data();
          const statusLower = (data.status || "").toLowerCase();
          // If it's not rejected, it was a valid deduction at some point
          if (statusLower === "success" || statusLower === "pending" || statusLower === "approved") {
            if (data.type === "Referral Balance") {
              referralWithdrawals += (data.amount || 0);
            } else if (data.type === "Task Balance") {
              taskWithdrawals += (data.amount || 0);
            }
          }
        });
        console.log(`[Recovery] Referral Withdrawals: ${referralWithdrawals}, Task Withdrawals: ${taskWithdrawals}`);

        // 4. Recalculate depositBalance
        setStatus("Recalculating deposit balance...");
        let totalDeposits = 0;
        try {
          // Attempting collection group query to find records of our deposits in referrers' logs
          const allReferralTxQuery = query(collectionGroup(db, "referralTransactions"), where("referredUser", "==", username));
          const allReferralTxSnap = await getDocs(allReferralTxQuery);
          allReferralTxSnap.forEach(docSnap => {
            totalDeposits += (docSnap.data().depositAmount || 0);
          });
        } catch (cgErr) {
          console.warn("[Recovery] Collection Group Query failed (likely missing index). Skipping deposit recalculation from logs.", cgErr);
        }
        console.log(`[Recovery] Total Deposits Found in Referral Logs: ${totalDeposits}`);

        // Final balances
        const finalReferralBalance = Math.max(0, totalReferralBonus - referralWithdrawals);
        const finalTaskBalance = Math.max(0, totalTaskEarnings - taskWithdrawals);
        
        setStatus("Updating Firestore...");
        await updateDoc(userRef, {
          referralBalance: finalReferralBalance,
          taskBalance: finalTaskBalance,
          depositBalance: totalDeposits > 0 ? totalDeposits : (userData.depositBalance || 0),
          currentPlan: inferredPlan === "None" ? (userData.currentPlan || "None") : inferredPlan,
          recoveryStatus: "completed",
          recoveryTimestamp: new Date().toISOString(),
          recoveredBy: "SystemRecovery"
        });

        setStatus("Recovery successful!");
        console.log(`[Recovery] Success for ${username}. Referral: ${finalReferralBalance}, Task: ${finalTaskBalance}, Plan: ${inferredPlan}`);
        setTimeout(() => onComplete(), 1500);
      } catch (err) {
        console.error("Recovery failed:", err);
        setStatus("Recovery failed. Check console.");
        setTimeout(() => onComplete(), 5000);
      }
    };

    performRecovery();
  }, [username, onComplete]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-6 text-white text-center">
      <div className="bg-[#1a0f08] border border-[#dfb04d]/30 p-8 rounded-3xl max-w-sm w-full shadow-2xl">
        <div className="w-16 h-16 bg-[#dfb04d]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#dfb04d]/20">
          <div className="w-10 h-10 border-4 border-[#dfb04d] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h2 className="text-xl font-bold text-[#dfb04d] mb-4">Account Recovery</h2>
        <p className="text-sm text-stone-300 mb-6 leading-relaxed">{status}</p>
        <div className="w-full bg-stone-800 h-1 rounded-full overflow-hidden">
          <div className="bg-[#dfb04d] h-full transition-all duration-500 w-full"></div>
        </div>
      </div>
    </div>
  );
};
