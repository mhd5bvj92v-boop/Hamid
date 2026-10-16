// Demonstration fixtures for the motion recipes (brief §20), kept apart from any real project.
// Demo-Card is the brief's exact 4-second, 60 fps example (240 frames, intervals end-exclusive):
//   [0,36) card enters from beyond the right edge, translation leads, 0.97->1, scrim fades in with it
//   [36,84) settles and holds; [84,114) one state change; [114,210) result holds; [210,240) continues left,
//   card + shadow + glow + scrim cleared by frame 239.
import React from "react";
import { AbsoluteFill, Composition, Sequence } from "remotion";
import { Backdrop } from "../kit/backgrounds";
import { DirectionalCard } from "../kit/beats/DirectionalCard";
import { KineticText } from "../kit/beats/KineticText";
import { Popover } from "../kit/beats/Popover";
import { DesignCanvas, EditStyleProvider } from "../kit/style";

const dark = { color60: "#05070D", color30: "#101B3D", accentColor: "#487EC7" };

const CardDemo: React.FC = () => (
  <EditStyleProvider constants={dark}>
    <DesignCanvas>
      <AbsoluteFill>
        <Backdrop preset="midnight-blue" />
        <DirectionalCard
          label="Invoice #212"
          title="Payment from Nova Studio"
          status={{ from: "Pending", to: "Paid" }}
          icon="check"
          travel="offscreen"
          enterFrom="right"
          scrim
          inAt={0}
          enterDur={36 / 60}
          changeAt={84 / 60}
          outAt={210 / 60}
          exitDur={29 / 60}
        />
      </AbsoluteFill>
    </DesignCanvas>
  </EditStyleProvider>
);

const PopoverDemo: React.FC = () => (
  <EditStyleProvider constants={{ color60: "#F4F6FA", color30: "#1C2333", accentColor: "#2F6BFF" }}>
    <DesignCanvas>
      <AbsoluteFill>
        <Backdrop preset="porcelain-blue" />
        <Sequence durationInFrames={150}>
          <Popover trigger={{ label: "Share report" }} title="Share with your team" icon="users" rows={[{ text: "Copy link", icon: "link" }, { text: "Invite by email", icon: "mail" }]} openAt={0.6} outAt={2.1} />
        </Sequence>
        <Sequence from={150} durationInFrames={150}>
          <Popover variant="notification" title="Export finished" icon="check" rows={[{ text: "first-three-seconds.mp4 · 25 s · 1080p" }]} openAt={0.15} outAt={1.9} />
        </Sequence>
      </AbsoluteFill>
    </DesignCanvas>
  </EditStyleProvider>
);

const GRADIENTS = ["midnight-blue", "indigo-violet", "deep-teal", "warm-graphite", "porcelain-blue", "soft-lavender", "dot-field", "near-black-light"];
/** Each background family for 2 s with a crisp foreground line (focus on the foreground, field stays subordinate). */
const GradientsDemo: React.FC = () => (
  <DesignCanvas>
    {GRADIENTS.map((g, i) => (
      <Sequence key={g} from={i * 60} durationInFrames={60}>
        <EditStyleProvider constants={g === "porcelain-blue" || g === "soft-lavender" ? { color60: "#F4F6FA", color30: "#1C2333", accentColor: "#2F6BFF" } : dark}>
          <KineticText text={g.replace("-", " ")} style="blur-in" placement="fullscreen" background={g} size="l" outAt={1.6} />
        </EditStyleProvider>
      </Sequence>
    ))}
  </DesignCanvas>
);

export const Demos: React.FC = () => (
  <>
    <Composition id="Demo-Card" component={CardDemo} durationInFrames={240} fps={60} width={1080} height={1920} />
    <Composition id="Demo-Popover" component={PopoverDemo} durationInFrames={300} fps={30} width={1920} height={1080} />
    <Composition id="Demo-Gradients" component={GradientsDemo} durationInFrames={GRADIENTS.length * 60} fps={30} width={1920} height={1080} />
  </>
);
