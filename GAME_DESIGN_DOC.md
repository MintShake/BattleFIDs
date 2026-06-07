# Battle FIDs Game Design Document

## Vision
Battle FIDs is a collectible battle card experience built for Farcaster users. Each card represents a Farcaster identity, combining social metrics and on-chain flair with a premium collectible presentation.

## Theme
- Tech + finance + collectibles
- Cyberpunk trading card style with circuitry, neon gradients, token badges, and digital prestige
- Cards feel like rare crypto assets, not just social media stats

## Core Gameplay
Players collect and compare Battle FID cards in stat-based matchups.
- Each card has multiple categories
- Players choose a category to compare
- The stronger stat wins the round
- Cards are rated by rarity and overall Battle Score

## Card Data Model
Each Battle FID card includes:
- `FID` — Farcaster ID, lower is stronger
- `Handle` — Farcaster username or display name
- `Avatar` — profile image or generated icon
- `Neynar Score` — analytics-driven strength score (high is strong)
- `Followers` — follower count
- `Friends` — following / friend count
- `Casts` — total cast count or recent cast volume
- `Activity` — recent activity metric, e.g. active days or cast velocity
- `Battle Score` — composite ranking for matchmaking
- `Rarity` — tier based on relative strength and network influence

## Stat Categories
1. FID Strength
   - Inverse of FID value: lower is better
2. Neynar Force
   - Neynar score; high values imply strong reputation/analytics
3. Network Presence
   - Follower count
4. Social Graph
   - Friend count / following count
5. Cast Volume
   - Total casts or recent casting frequency
6. Activity Pulse
   - Recent active days, engagement trend, or reaction velocity

## Rarity Tiers
- `Alpha` — top-tier Farcaster cards, rare and elite
- `Legendary` — high Neynar & strong network
- `Elite` — powerful profiles with strong activity
- `Rare` — solid profiles with balanced metrics
- `Common` — newer or lower-volume profiles

## Gameplay Flow
1. User opens Battle FIDs mini app
2. They search by Farcaster handle or FID
3. App fetches stats and creates the card
4. User views the card gallery / collection
5. User enters a battle screen and selects a stat category
6. The app compares cards and shows the winner
7. Optional: players can collect, share, or rank cards

## User Journeys
### Profile Card Creation
- Enter handle or FID
- Display card preview with trait values
- Show rarity and battle score

### Stat Battle
- Choose two or more cards
- Select the category to compete in
- Compare values side by side
- Show result and overall winner

### Collection View
- Browsable list of created cards
- Filtering by rarity, strength, or activity
- Card detail view with analytics breakdown

## UI / UX
- Card front: avatar, handle, stats, rarity badge
- Card back: deeper analytics and commentary
- Use bold, futuristic typography and metallic gradients
- Add microanimations for stat bars and battle results
- Keep layout mobile-first and responsive

## Data Integration Points
- Farcaster profile endpoint for handle/FID resolution
- Neynar score endpoint for reputation analytics
- Followers/following counts from Farcaster profile data
- Cast history/activity from Farcaster cast metrics
- Optional: reaction totals, reply counts, verified status

## Battle Rules
- The chosen category with the highest numeric value wins
- For FID Strength, lower wins
- Use the Battle Score for overall card ranking
- Tie resolution: compare secondary category or use rarity

## Metrics and Progression
- Card power is both raw stat and computed Battle Score
- Power-up logic can include activity streaks or Neynar boosts
- Use rarity gaps to encourage collecting profiles across tiers

## Visual Identity
- Brand: `Battle FIDs`
- Logo concept: digital shield or circuit-marked card with a Farcaster-style ID token
- Colors: dark navy, electric blue, neon purple, gold accent
- Typography: strong sans-serif with futuristic italics for stat labels

## Success Criteria
- Users can create a card successfully from a Farcaster identity
- Card design feels collectible and high-quality
- Stat comparison is intuitive and clearly balanced
- App demonstrates a compelling Farcaster/Neynar theme

## Notes
- Because the repo is currently empty, first implementation should start with mock data and card UI.
- Exact Neynar API fields should be verified before final integration.
- If Farcaster/Neynar SDKs are not available, use server-side proxy or static mock endpoints for development.
