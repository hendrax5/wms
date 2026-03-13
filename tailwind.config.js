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
                background: '#0B1121', // deep midnight blue
                surface: '#111827', // darker blue-gray (Tailwind gray-900 is close but very dark)
                'surface-2': '#1F2937',// Tailwind gray-800
                primary: '#10B981', // Emerald 500
                border: 'rgba(255, 255, 255, 0.08)',
            },
            animation: {
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
            },
            keyframes: {
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.4)' },
                    '50%': { boxShadow: '0 0 0 6px rgba(16, 185, 129, 0)' },
                },
            },
        },
    },
    plugins: [],
};
