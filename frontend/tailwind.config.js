export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#f0f4ff', 100: '#dde6ff', 200: '#c3d0ff', 300: '#9db0ff', 400: '#7086ff', 500: '#4f5eff', 600: '#3a3ef5', 700: '#2d2ed8', 800: '#2628af', 900: '#252889', 950: '#161772' },
        surface: { DEFAULT: '#0f1117', 1: '#161820', 2: '#1c1e2a', 3: '#222535', card: '#1a1d28', border: '#2a2d3e' }
      },
      fontFamily: { sans: ['DM Sans', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
      boxShadow: { 'glow': '0 0 20px rgba(79, 94, 255, 0.15)', 'card': '0 4px 24px rgba(0,0,0,0.3)' }
    }
  },
  plugins: []
};
