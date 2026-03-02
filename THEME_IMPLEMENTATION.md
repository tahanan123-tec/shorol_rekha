# Theme System Implementation

## Overview
Added three professional themes to the cafeteria management system:
1. **Light Theme** - Clean, modern light interface (default)
2. **Dark Theme** - Professional dark mode for reduced eye strain
3. **Ramadan Theme** - Special festive theme with purple/violet colors and decorative elements

## Features

### Theme Switcher
- Located in the header navigation
- Persists user preference in localStorage
- Smooth transitions between themes
- Icons for each theme (Sun, Moon, Star)

### Light Theme
- **Primary Color**: Blue (#3B82F6)
- **Background**: White
- **Text**: Dark gray
- **Use Case**: Default, daytime use, professional presentations

### Dark Theme
- **Primary Color**: Light blue (#60A5FA)
- **Background**: Dark gray (#111827)
- **Text**: Light gray
- **Use Case**: Night time, reduced eye strain, modern aesthetic

### Ramadan Theme
- **Primary Color**: Purple (#9333EA)
- **Background**: Light purple tint (#FAF5FF)
- **Text**: Deep purple
- **Special Effects**:
  - Decorative moon (🌙) and star (✨) animations
  - Gradient purple backgrounds
  - Floating and twinkling animations
  - Festive atmosphere

## Technical Implementation

### Files Created/Modified

1. **client/src/lib/theme.ts**
   - Zustand store for theme management
   - Persists theme preference
   - Type-safe theme selection

2. **client/src/components/ThemeSwitcher.tsx**
   - Theme toggle component
   - Three-button switcher with icons
   - Responsive design

3. **client/src/styles/globals.css**
   - CSS custom properties for each theme
   - Smooth transitions
   - Ramadan special effects
   - Dark mode adjustments

4. **client/src/components/Header.tsx**
   - Integrated ThemeSwitcher component
   - Positioned in navigation bar

## Usage

### For Users
1. Click on the theme switcher in the header
2. Choose between Light, Dark, or Ramadan theme
3. Theme preference is saved automatically

### For Developers
```typescript
import { useThemeStore } from '@/lib/theme';

// In your component
const { theme, setTheme } = useThemeStore();

// Change theme programmatically
setTheme('dark');
setTheme('light');
setTheme('ramadan');
```

## CSS Variables

Each theme defines these variables:
- `--color-primary`: Main brand color
- `--color-primary-dark`: Darker shade for hover states
- `--color-background`: Page background
- `--color-surface`: Card/surface background
- `--color-text`: Primary text color
- `--color-text-secondary`: Secondary text color
- `--color-border`: Border color
- `--color-success`: Success state color
- `--color-warning`: Warning state color
- `--color-error`: Error state color

## Browser Support

- Modern browsers with CSS custom properties support
- localStorage for persistence
- Graceful fallback to light theme

## Accessibility

- Maintains WCAG contrast ratios
- Smooth transitions don't trigger motion sickness
- Clear visual indicators for active theme
- Keyboard accessible theme switcher

## Future Enhancements

- System preference detection (prefers-color-scheme)
- More seasonal themes (Eid, Christmas, etc.)
- Custom theme builder
- Theme preview before applying
