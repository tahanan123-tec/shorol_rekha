# Ramadan Timings Feature ✨🌙

## Overview
Beautiful, real-time Sehri and Iftar timing display that appears only when the Ramadan theme is active. Features live countdown timers, elegant animations, and accurate prayer times for Dhaka, Bangladesh (IUT location).

## Features

### 1. Real-Time Display
- Shows current day's Sehri (pre-dawn meal) and Iftar (breaking fast) times
- Live countdown timer to next event (Sehri or Iftar)
- Updates every second with smooth animations
- Displays current time for reference

### 2. Beautiful Design
- Purple and pink gradient theme matching Ramadan aesthetics
- Animated twinkling stars decoration
- Glowing effects on active timing cards
- Pulsing countdown badges
- Smooth hover animations
- Glassmorphism design with backdrop blur

### 3. Smart Behavior
- Only visible when Ramadan theme is active
- Automatically hides in Light theme
- Highlights the next upcoming event (Sehri or Iftar)
- Shows Hijri date (Islamic calendar)
- Responsive design for all screen sizes

### 4. Accurate Timings
- Pre-configured with Ramadan 2026 timings (Feb 18 - Mar 19)
- Based on Dhaka, Bangladesh timezone
- Includes all 30 days of Ramadan
- Hijri dates: 1-30 Ramadan 1447

## Where It Appears

The Ramadan timings component is displayed on:
1. **Home Page** (`/`) - At the top, above the hero section
2. **Menu Page** (`/menu`) - At the top, above the menu header

## Component Structure

### RamadanTimings Component
Location: `client/src/components/RamadanTimings.tsx`

**Key Elements:**
- Decorative animated stars
- Ramadan Mubarak header with moon icons
- Two timing cards (Sehri and Iftar)
- Live countdown timer
- Current time display
- Islamic greeting footer

### Styling
Location: `client/src/styles/globals.css`

**Animations:**
- `twinkle-star` - Star twinkling effect
- `pulse-glow` - Glowing background pulse
- `pulse-border` - Active card border pulse
- `pulse-countdown` - Countdown badge pulse

## Ramadan 2026 Schedule

### Start Date: February 18, 2026
### End Date: March 19, 2026

Sample timings (Dhaka, Bangladesh):
- **Day 1**: Sehri 05:15 AM, Iftar 05:55 PM
- **Day 15**: Sehri 05:10 AM, Iftar 06:02 PM
- **Day 30**: Sehri 05:04 AM, Iftar 06:10 PM

## How It Works

### 1. Theme Detection
```typescript
// Only shows in Ramadan theme
:root:not([data-theme='ramadan']) .ramadan-timings-container {
  display: none;
}
```

### 2. Time Calculation
- Parses Sehri and Iftar times from the schedule
- Compares with current time
- Determines next event
- Calculates countdown in HH:MM:SS format

### 3. Real-Time Updates
- Updates every second using `setInterval`
- Recalculates countdown dynamically
- Highlights active timing card
- Shows pulsing countdown badge

## Visual Features

### Color Scheme
- Primary: Purple (#9333ea)
- Secondary: Pink (#ec4899)
- Background: Purple/Pink gradients
- Text: Purple shades for hierarchy

### Icons
- 🌙 Moon - Header decoration
- ⭐ Star - Decorative elements
- 🌅 Sunrise - Sehri icon
- 🌇 Sunset - Iftar icon
- ⏰ Clock - Countdown and current time

### Effects
- Glassmorphism cards with backdrop blur
- Gradient backgrounds
- Box shadows with purple glow
- Smooth scale transforms on hover
- Pulsing animations for active states

## Usage Instructions

### For Users:
1. Switch to Ramadan theme using the theme switcher
2. Navigate to Home or Menu page
3. See the beautiful Ramadan timings card at the top
4. Watch the live countdown to next prayer time
5. Plan your meals accordingly

### For Developers:
1. Component is automatically imported in pages
2. No props needed - fully self-contained
3. Timings are hardcoded in the component
4. To update timings, edit the `ramadanTimings2026` array

## Customization

### Update Timings for Different Location:
Edit `client/src/components/RamadanTimings.tsx`:
```typescript
const ramadanTimings2026: RamadanTiming[] = [
  { date: '2026-02-18', sehri: '05:15 AM', iftar: '05:55 PM', hijriDate: '1 Ramadan 1447' },
  // Add your location's timings...
];
```

### Change Colors:
Edit `client/src/styles/globals.css`:
```css
.ramadan-card {
  @apply bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100;
  /* Change gradient colors here */
}
```

### Add to More Pages:
```typescript
import { RamadanTimings } from '@/components/RamadanTimings';

// In your page component:
<RamadanTimings />
```

## Technical Details

### Dependencies
- React hooks (useState, useEffect)
- Lucide React icons
- Tailwind CSS
- TypeScript

### Performance
- Lightweight component (~5KB)
- Efficient re-renders (only updates countdown)
- No external API calls
- Minimal CPU usage

### Browser Support
- All modern browsers
- Mobile responsive
- Touch-friendly
- Accessible

## Testing

### Test Scenarios:
1. **Theme Switch**: Toggle between Light and Ramadan themes
2. **Time Accuracy**: Verify countdown matches actual time
3. **Next Event**: Check correct event is highlighted
4. **Midnight Transition**: Test date change at midnight
5. **Responsive**: Test on mobile, tablet, desktop

### Expected Behavior:
- Component appears only in Ramadan theme
- Countdown updates every second
- Active card has pulsing glow effect
- Stars twinkle smoothly
- No console errors

## Future Enhancements

Potential improvements:
1. Auto-detect user location for accurate timings
2. Integration with Islamic prayer time API
3. Notification alerts before Sehri/Iftar
4. Dua (prayer) display
5. Ramadan calendar view
6. Fasting tracker
7. Multi-language support (Arabic, Bengali, English)

## Files Modified

1. **client/src/components/RamadanTimings.tsx** - New component
2. **client/src/styles/globals.css** - Added Ramadan timing styles
3. **client/src/pages/index.tsx** - Added component to home page
4. **client/src/pages/menu.tsx** - Added component to menu page

## Islamic Significance

### Sehri (Suhoor)
- Pre-dawn meal before fasting begins
- Ends at Fajr (dawn) prayer time
- Important for sustaining energy throughout the day

### Iftar
- Breaking the fast at sunset
- Begins at Maghrib (sunset) prayer time
- Traditional to break fast with dates and water

### Ramadan
- 9th month of Islamic calendar
- Month of fasting, prayer, and reflection
- One of the Five Pillars of Islam

## Credits

- Timings based on Islamic Foundation Bangladesh
- Location: Dhaka, Bangladesh (23.8103°N, 90.4125°E)
- Calculation method: University of Islamic Sciences, Karachi
- Designed for Islamic University of Technology (IUT)

---

**May Allah accept your fasting and prayers during this blessed month of Ramadan! 🌙✨**

*Ramadan Mubarak!*
