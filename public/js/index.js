document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');

    if (btn && menu) {
        btn.addEventListener('click', () => {
            menu.classList.toggle('hidden');
            const icon = btn.querySelector('.material-icons');
            if (menu.classList.contains('hidden')) {
                icon.textContent = 'menu';
            } else {
                icon.textContent = 'close';
            }
        });
    }

    // Dynamic Stats (Mock Fetch)
    // The fetch logic was already in index.html, but if we move it here we need to make sure we don't duplicate.
    // The existing index.html had inline script. I will leave the inline script for now or move it if I see it's cleaner.
    // The tool call `list_dir` showed `js/index.js` missing previously.
    // I'll keep this file simple for just UI interactions if the data fetching is already working in the HTML's script tag.
});
