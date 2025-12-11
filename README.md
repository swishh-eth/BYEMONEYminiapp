# $BYEMONEY Farcaster Mini App 💸

A professional Farcaster miniapp for the $BYEMONEY token on Base. Features a swipeable interface with price charts, token info, and social links.

## Features

- 📊 **Live Price Chart** - DexScreener integration showing real-time price action
- 💰 **Token Info** - Contract address, chain details, and quick copy
- 🔗 **Social Links** - Twitter, Telegram, DexScreener, and Basescan
- 📱 **Swipeable Pages** - Smooth gesture navigation between pages
- 🖥️ **Responsive Design** - Works as both a Farcaster miniapp and desktop website

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **SDK**: @farcaster/miniapp-sdk
- **Hosting**: Vercel (recommended)
- **Data**: DexScreener API/Embed

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd byemoney-miniapp
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_URL=https://your-app.vercel.app
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Test with Ngrok/Cloudflared

Since Farcaster tools require public URLs:

```bash
# Using cloudflared
cloudflared tunnel --url http://localhost:3000

# Or using ngrok
ngrok http 3000
```

Test your embed at: https://warpcast.com/~/developers/mini-apps/debug

## Deploying to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo>
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Add environment variable: `NEXT_PUBLIC_URL` = your Vercel domain
4. Deploy!

### 3. Generate Farcaster Manifest

1. Go to https://farcaster.xyz/~/developers/mini-apps/manifest
2. Enter your Vercel domain
3. Sign with your Farcaster account
4. Either:
   - **Option A**: Copy the full manifest to `public/.well-known/farcaster.json`
   - **Option B**: Use hosted manifest by uncommenting the redirect in `next.config.js`

## Project Structure

```
byemoney-miniapp/
├── app/
│   ├── globals.css      # Global styles + Tailwind
│   ├── layout.tsx       # Root layout + metadata
│   └── page.tsx         # Main app component
├── components/
│   ├── Header.tsx       # Top header bar
│   ├── BottomNav.tsx    # Navigation tabs
│   ├── SwipeContainer.tsx # Gesture navigation
│   ├── HomePage.tsx     # Price chart page
│   ├── InfoPage.tsx     # Token info page
│   └── LinksPage.tsx    # Social links page
├── lib/
│   └── constants.ts     # Token & config constants
├── public/
│   └── .well-known/
│       └── farcaster.json # Miniapp manifest
└── ...config files
```

## Customization

### Update Token Info

Edit `lib/constants.ts`:

```typescript
export const TOKEN = {
  name: 'BYEMONEY',
  symbol: 'BYEMONEY',
  address: '0xYOUR_TOKEN_ADDRESS',
  chain: 'base',
  chainId: 8453,
  decimals: 18,
};

export const SOCIALS = {
  twitter: 'https://twitter.com/your_handle',
  telegram: 'https://t.me/your_group',
  // ...
};
```

### Update Branding

- Replace colors in `tailwind.config.js`
- Update fonts in `app/globals.css`
- Add logo images to `public/` folder

### Add Supabase (Optional)

For features like leaderboards, user tracking, etc:

1. Create a Supabase project
2. Add env variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```
3. Install: `npm install @supabase/supabase-js`

## Assets Needed

Create and add these images to `/public`:

- `icon.png` - 512x512 app icon
- `splash.png` - 200x200 splash logo
- `og-image.png` - 1200x630 social preview

## Testing

### Test as Miniapp

1. Deploy to Vercel
2. Use the Farcaster embed debugger: https://warpcast.com/~/developers/mini-apps/debug
3. Cast the URL to see it render in feeds

### Test as Website

Simply visit your Vercel URL in any browser - the app works standalone too!

## License

MIT

---

Built with 💸 for the $BYEMONEY community
