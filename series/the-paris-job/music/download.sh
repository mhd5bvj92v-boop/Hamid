#!/bin/bash
# Downloads the licensed music used by the series (Kevin MacLeod, incompetech.com, CC BY 4.0).
cd "$(dirname "$0")"
for t in "Sneaky Snitch" "Investigations" "Volatile Reaction" "Hitman" "Movement Proposition" "Mistake the Getaway" "Spy Glass" "Scheming Weasel faster" "Crypto" "The Descent" "Unseen Horrors" "Long Note Four" "Impact Prelude" "Clash Defiant" "Smoking Gun" "Rynos Theme" "Five Armies" "Anxiety" "Dark Times" "Hiding Your Reality"; do
  f="$(echo "$t" | tr ' ' '_').mp3"; [ -f "$f" ] && continue
  curl -sSf -o "$f" "https://incompetech.com/music/royalty-free/mp3-royaltyfree/$(echo "$t" | sed 's/ /%20/g').mp3" && echo "got $t"
done
