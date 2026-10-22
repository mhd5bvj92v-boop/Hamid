// All on-screen copy and (fictional, illustrative) data in one place.
export const COPY = {
  headline: ["It's kind of crazy", "how normal this feels."],
  headlineAccent: "normal",
  card: { name: "Everyday", type: "Debit · EUR", digits: "•••• 4821", valid: "08/29" },
  wallet: {
    title: "Wallet",
    tabs: ["Cards", "Passes"],
    balanceLabel: "Available balance",
    balance: 2184.6,
    today: "−€6.30 today",
    recent: "RECENT",
    seeAll: "See all",
    rows: [
      { icon: "bag", name: "Bakery Lune", sub: "Today · 08:12", amt: "−€3.40" },
      { icon: "tram", name: "Metro line 4", sub: "Yesterday · 18:40", amt: "−€2.90" },
    ],
  },
  phone: { time: "12:08", ready: "READY TO PAY", hint: "Hold near the reader", paying: "PAYING…", done: "DONE", defaultPill: "Default" },
  terminal: {
    merchant: "COFFEE HOUSE",
    order: "Order 0418",
    items: [
      { name: "Flat white", qty: "×2", amt: "€8.40" },
      { name: "Avocado toast", qty: "", amt: "€12.50" },
      { name: "Pastry", qty: "", amt: "€4.00" },
    ],
    totalLabel: "Total",
    total: 24.9,
    states: ["Ready", "Reading", "Approved"],
    tap: "Tap to pay",
  },
  rail: ["Detected", "Confirming", "Done"],
  confirm: {
    merchant: "Coffee House",
    when: "Today, 12:08",
    status: "Payment complete",
    rows: [
      ["Flat white ×2", "€8.40"],
      ["Avocado toast", "€12.50"],
      ["Pastry", "€4.00"],
    ] as [string, string][],
    paidWith: ["Paid with", "Everyday •••• 4821"] as [string, string],
    method: ["Method", "Contactless"] as [string, string],
  },
  methods: [
    { key: "cash", name: "Cash", meta: "Coins & notes · count the change", icon: "cash" },
    { key: "swipe", name: "Swipe", meta: "Card & signature · or PIN", icon: "swipe" },
    { key: "tap", name: "Contactless", meta: "Phone or card · hold near the reader", icon: "tap" },
  ],
  oneTap: { big: "1 TAP", sub: "€24.90 · Coffee House" },
  fragments: ["€24.90", "12:08", "Coffee House"],
  end: { title: "JUST A TAP", capsuleAmt: "€24.90", capsuleSub: "Coffee House · 12:08", paid: "Paid" },
};

export const VO = [
  [0, 150, "It's kind of crazy how normal this feels."],
  [150, 300, "You take out your phone..."],
  [300, 450, "Hold it near the reader..."],
  [450, 600, "And just like that..."],
  [600, 750, "The payment goes through."],
  [750, 900, "No cash. No card swipe."],
  [900, 1050, "Just one tiny movement."],
  [1050, 1200, "And you're done."],
] as const;
