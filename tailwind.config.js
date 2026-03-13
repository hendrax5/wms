/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Plus Jakarta Sans', 'sans-serif'],
            },
            colors: {
                surface: '#0F172A',
                'surface-2': '#1E293B',
                primary: '#22C55E',
            },
            animation: {
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
            },
            keyframes: {
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.4)' },
                    '50%': { boxShadow: '0 0 0 6px rgba(34, 197, 94, 0)' },
                },
            },
        },
    },
    plugins: [],
};
