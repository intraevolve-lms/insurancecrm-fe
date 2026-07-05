/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        hs: {
          orange:    '#FF7A59',
          'orange-d':'#E8634A',
          'orange-l':'#FFF3F0',
          navy:      '#33475B',
          'navy-d':  '#2D3E50',
          'navy-l':  '#425B76',
          bg:        '#F5F8FA',
          border:    '#DFE3EB',
          text:      '#33475B',
          muted:     '#516F90',
          teal:      '#0091AE',
          'teal-l':  '#E5F5F8',
          success:   '#00BDA5',
          warning:   '#F5C26B',
          danger:    '#F2545B',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.10)',
        dialog: '0 20px 60px -10px rgba(0,0,0,0.20)',
      },
      keyframes: {
        'slide-up': { from: { opacity: '0', transform: 'translate(-50%,-46%) scale(.97)' }, to: { opacity: '1', transform: 'translate(-50%,-50%) scale(1)' } },
        'fade-in':  { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        'slide-up': 'slide-up 0.18s cubic-bezier(.16,1,.3,1)',
        'fade-in':  'fade-in 0.15s ease',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
