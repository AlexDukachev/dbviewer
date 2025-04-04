/**** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./renderer/**/*.{js,jsx,ts,tsx,html}"],
    theme: {
        extend: {
            colors: {
                'dark': '#2B2B2B',
                'sidebar': '#313335',
                'editor-bg': '#2B2B2B',
                'editor-fg': '#F8F8F2',
            },
        },
    },
    darkMode: 'class',
    plugins: [],
};