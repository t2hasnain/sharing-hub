document.addEventListener('DOMContentLoaded', () => {
    // Get the toggle checkbox
    const themeToggle = document.getElementById('theme-toggle-checkbox');
    
    // Check for saved theme in localStorage
    const savedTheme = localStorage.getItem('zephyTheme');
    
    // Apply saved theme or default to light
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        // Update checkbox if theme is dark
        if (savedTheme === 'dark') {
            themeToggle.checked = true;
        }
    }
    
    // Listen for toggle changes
    themeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            // Change to dark theme
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('zephyTheme', 'dark');
        } else {
            // Change to light theme
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('zephyTheme', 'light');
        }
    });
}); 