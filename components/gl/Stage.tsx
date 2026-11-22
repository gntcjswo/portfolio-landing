"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { detectTier, onTierChange, type TierInfo } from "@/lib/tier";

const StageCanvas = dynamic(() => import("./StageCanvas"), { ssr: false });

/**
 * Mount point for the one fixed WebGL canvas. three/R3F are only fetched on the client after
 * hydration and never for tier "none" (no WebGL / context lost twice).
 */
export function Stage() {
  const [tier, setTier] = useState<TierInfo | null>(null);
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    setTier(detectTier());
    setDebug(new URLSearchParams(location.search).has("debug"));
    const off = onTierChange(setTier);
    return () => {
      off();
    };
  }, []);

  if (!tier || tier.tier === "none") return null;
  return <StageCanvas tier={tier} debug={debug} />;
}
