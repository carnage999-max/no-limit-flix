# No Limit Flix — Mobile (Expo)

This is the Expo-based mobile application for No Limit Flix. It mirrors the design, tone, and UX philosophy of the web version: a premium discovery experience for films.

## Tech Stack
- **Framework**: Expo (React Native) + TypeScript
- **Navigation**: React Navigation (Bottom Tabs + Native Stack)
- **Styling**: StyleSheet + Expo Linear Gradient
- **Animation**: React Native Animated API

## Features
- **Premium Dark UI**: Implements the locked design tokens (#0B0B0D background, Silver accents, Gold Coin gradient).
- **Mood-First Discovery**: Primary onboarding via mood chips and vibe text.
- **Snap/Paged Scrolling**: One section per viewport for focused decision-making.
- **Non-Streaming**: Direct links to trailers and external "where to watch" providers.
- **Permanence focus**: UI elements highlight the long-term nature of the library.

## Getting Started

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npx expo start
   ```

## Project Structure
- `src/theme/`: Visual design tokens and constants.
- `src/components/`: Reusable premium UI components.
- `src/navigation/`: App routing configuration.
- `src/screens/`: Feature pages (Home, Collections, Search, etc.).
- `src/lib/`: API client and mock data.

## Note on Media
The app uses remote placeholder images for posters and backdrops. In a production environment, these should be assets or optimized CDN URLs.
