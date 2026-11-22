import type { ComponentType } from "react";
import type { SceneId } from "@/content/chapters";
import type { TierInfo } from "@/lib/tier";
import { Hall } from "./scenes/Hall";
import { Layers } from "./scenes/Layers";
import { Index } from "./scenes/Index";
import { Showcase } from "./scenes/Showcase";
import { Generator } from "./scenes/Generator";

export type SceneProps = { id: SceneId; debug: boolean; tier: TierInfo };

/**
 * Scene registry — one entry per GL scene id used in `content/chapters.ts`.
 * Every scene stays mounted inside the single Canvas; `useSceneFrame(id, …)` only runs while the
 * scene is visible (its `registerWindow` predicate, or the active chapter's scene by default).
 */
export const sceneRegistry: Record<SceneId, ComponentType<SceneProps>> = {
  hall: Hall,
  layers: Layers,
  index: Index,
  showcase: Showcase,
  generator: Generator,
};
