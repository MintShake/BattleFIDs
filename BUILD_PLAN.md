# Battle FIDs Build Plan

## Project Summary
Battle FIDs is a Farcaster mini app that turns social profile data into collectible battle cards. It blends Top Trumps-style stat comparison with Pokémon collectible aesthetics, using Farcaster FIDs, Neynar scores, follower/friend counts, cast activity, and engagement metrics.

## Goals
- Build an attractive collectible card experience for Farcaster users
- Provide stat-based comparison and ranking mechanics
- Use live Farcaster/Neynar data where possible
- Keep the app lightweight and visually polished for a mini app rollout

## Target Users
- Farcaster users who want new ways to compare and display identity metrics
- Collectible card fans who like stat-driven matchups
- Builders and investors interested in crypto-social gamification

## MVP Scope
- Card generation for Farcaster profiles using available stats
- Stat categories: FID Strength, Neynar Force, Followers, Friends, Casts, Activity
- Card detail view with rarity and collectible styling
- Simple matchup view or Top Trumps-style comparison
- Data integration with Farcaster profile APIs / Neynar score endpoint

## Proposed Tech Stack
- Frontend: React or SolidJS mini app shell
- CSS: Tailwind CSS or custom component styling for neon/finance aesthetic
- Data: Farcaster SDK (`@farcaster/js` or equivalent) plus Neynar analytics API
- Hosting: Static app deployed as a Farcaster mini app or frontend served via a lightweight web host

## Architecture
1. Data layer
   - Fetch Farcaster profile details by FID
   - Fetch Neynar score and analytics
   - Normalize stats into Battle FID card model
2. Card model
   - Map raw data to collectible card fields
   - Derive computed scores and rarity tiers
3. UI layer
   - Card gallery / deck
   - Matchup/comparison screen
   - Profile detail card view
4. Integration
   - Connect to Farcaster auth or profile lookup if required
   - Optional fast refresh for activity and cast counts

## Key Features
- Profile card creation from Farcaster handle or FID
- Dark tech/finance collectible design theme
- Stat comparison interface for quick battles
- Rarity tiers and score-based matching
- Shareable cards or profile links

## Development Milestones
1. Research & setup
   - Confirm Farcaster SDK and Neynar API availability
   - Establish sample data model
2. Core card engine
   - Build card schema and stat translation
3. UI prototype
   - Create card face and back UI
   - Build gallery and detail screen
4. Data integration
   - Connect to live Farcaster/Neynar endpoints
5. Matchup flow
   - Implement card comparison and win logic
6. Polish
   - Add animations, visual effects, rarity badges
   - Accessibility and mobile layout

## Tasks
- [ ] Define card schema and stat categories
- [ ] Create mock data for Farcaster/Neynar profiles
- [ ] Build card UI component
- [ ] Implement data fetching services
- [ ] Add matchup logic and win conditions
- [ ] Create landing / intro page
- [ ] Test app with sample Farcaster users
- [ ] Document API integration points

## Risks and Unknowns
- Exact Neynar score API or field names may require API discovery
- Farcaster auth or rate limits may affect real-time lookups
- Some users may not have public cast/follower metrics if privacy restrictions apply

## Next Steps
1. Confirm Farcaster/Neynar SDKs and endpoints.
2. Wire a simple data fetch example.
3. Build the first card UI and validate the collectible theme.
