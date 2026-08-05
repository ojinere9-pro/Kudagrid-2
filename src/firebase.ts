import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Config from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDrdKtlVO8lVjU0Psqtv9zddWJXivy4C74",
  authDomain: "charming-pipe-wds98.firebaseapp.com",
  projectId: "charming-pipe-wds98",
  storageBucket: "charming-pipe-wds98.firebasestorage.app",
  messagingSenderId: "74749991542",
  appId: "1:74749991542:web:feabb21ef8b4aea41ddd57"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-kudigrid-4fc0048c-a5c0-4f61-8746-f9cf4b7ad267");
export const auth = getAuth(app);

// Firestore operation types as defined in the skill instructions
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

// Error tracking interface conforming to FirestoreErrorInfo
export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
