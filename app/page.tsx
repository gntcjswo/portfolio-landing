import { Stage } from "@/components/gl/Stage";
import { ScrollRoot } from "@/components/chrome/ScrollRoot";
import { ChapterRail } from "@/components/chrome/ChapterRail";
import { MobileDock } from "@/components/chrome/MobileDock";
import { CommandPalette } from "@/components/chrome/CommandPalette";
import { Cursor } from "@/components/chrome/Cursor";
import { Boot } from "@/components/chrome/Boot";
import { DebugOverlay } from "@/components/chrome/DebugOverlay";
import { C01Question } from "@/components/chapters/C01Question";
import { C02Shift } from "@/components/chapters/C02Shift";
import { C03Layers } from "@/components/chapters/C03Layers";
import { C04Index } from "@/components/chapters/C04Index";
import { C05ScrollThrough } from "@/components/chapters/C05ScrollThrough";
import { C06Pipeline } from "@/components/chapters/C06Pipeline";
import { C07AiWorkflow } from "@/components/chapters/C07AiWorkflow";
import { C08Proof } from "@/components/chapters/C08Proof";
import { C09Start } from "@/components/chapters/C09Start";
import { C10Ask } from "@/components/chapters/C10Ask";
import { C11Contact } from "@/components/chapters/C11Contact";

export default function Page() {
  return (
    <>
      <a href="#shift" className="skip-link">
        본문으로 건너뛰기
      </a>
      <ScrollRoot />
      <Stage />
      <Boot />
      <header className="chrome">
        <ChapterRail />
      </header>
      <main id="main" className="main">
        <C01Question />
        <C02Shift />
        <C03Layers />
        <C04Index />
        <C05ScrollThrough />
        <C06Pipeline />
        <C07AiWorkflow />
        <C08Proof />
        <C09Start />
        <C10Ask />
        <C11Contact />
      </main>
      <MobileDock />
      <CommandPalette />
      <Cursor />
      <DebugOverlay />
    </>
  );
}
