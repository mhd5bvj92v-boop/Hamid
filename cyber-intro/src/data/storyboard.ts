// Single source of truth for timing and copy. 60 fps, 1500 frames.
export const TOTAL = 1500;

/** Frames each scene keeps rendering past its nominal end so the outgoing
 * anchor overlaps the incoming scene. */
export const OVERLAP = 12;

export const SCENES = {
  s1: { start: 0, end: 210, name: "The ordinary click" },
  s2: { start: 210, end: 420, name: "Auto-pilot" },
  s3: { start: 420, end: 690, name: "The reveal" },
  s4: { start: 690, end: 990, name: "The invisible layer" },
  s5: { start: 990, end: 1260, name: "A different habit" },
  s6: { start: 1260, end: 1500, name: "The thesis" },
} as const;

export type SceneKey = keyof typeof SCENES;

export const VO = [
  { from: 0, to: 210, text: "I used to browse the internet without thinking twice." },
  { from: 210, to: 420, text: "Open a link. Accept the cookies. Move on." },
  { from: 420, to: 690, text: "Then I started learning cybersecurity." },
  { from: 690, to: 990, text: "And suddenly, I started noticing everything behind the screen." },
  { from: 990, to: 1260, text: "The permissions. The trackers. The little things I'd always ignored." },
  { from: 1260, to: 1500, text: "The internet didn't change. The way I see it did." },
];

export const COPY = {
  url: "example.com",
  cookieTitle: "We value your privacy",
  cookieBody: "This site uses cookies to personalise content.",
  cookieManage: "Manage",
  cookieAccept: "Accept all",
  revealLabel: "What's happening behind this page?",
  privacyTitle: "Site settings",
  privacySub: "example.com · illustrative",
  rows: ["Location access", "Camera access", "Cross-site tracking"],
  rowState: ["Allowed", "Allowed", "On"],
  orbit: ["cookies", "redirects", "permissions"],
  habitsTitle: "Before I click",
  habits: [
    { title: "Review permissions", detail: "Camera", from: "Allowed", to: "Ask first", done: "Reviewed" },
    { title: "Question the link", detail: "examp1e.test/verify", from: "Open", to: "Checked", done: "Checked first" },
    { title: "Limit tracking", detail: "Block trackers", from: "Off", to: "On", done: "Blocked" },
  ],
  thesis1: ["The", "internet", "didn't", "change."],
  thesis2: ["The", "way", "I", "see", "it", "did."],
  thesisAccent: "see",
};
