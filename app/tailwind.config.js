/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './app.vue'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#191919',
        paper: '#f2f2f0',
        signal: '#fffa00',
        state: '#00ffa2',
        muted: '#888888',
        panel: 'rgba(25, 25, 25, 0.84)'
      },
      fontFamily: {
        display: ['"Arial Narrow"', '"Roboto Condensed"', '"DIN Condensed"', 'sans-serif'],
        ui: ['"Space Grotesk"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"SFMono-Regular"', 'Consolas', 'monospace'],
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', 'serif']
      },
      borderRadius: {
        ark: '2px'
      },
      boxShadow: {
        readout: '1rem 1rem 0 rgba(255, 250, 0, 0.35)'
      }
    }
  },
  // Keep ark-ui.css base styles intact
  corePlugins: {
    preflight: false
  },
  plugins: []
}
