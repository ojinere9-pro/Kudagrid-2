import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { GlobalSettings } from "../types";

export function useGlobalSettings() {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as GlobalSettings);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { settings, loading };
}
