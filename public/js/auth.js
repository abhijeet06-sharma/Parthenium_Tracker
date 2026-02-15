document.addEventListener('DOMContentLoaded', () => {
    // Auto-redirect if already logged in
    const token = localStorage.getItem('token');
    if (token) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'ADMIN') window.location.href = '/admin.html';
        else window.location.href = '/dashboard.html';
        return;
    }

    // Elements
    const tabUser = document.getElementById('tab-user');
    const tabAdmin = document.getElementById('tab-admin');
    const sectionUser = document.getElementById('section-user');
    const sectionAdmin = document.getElementById('section-admin');

    const btnUserLogin = document.getElementById('btn-user-login');
    const btnUserSignup = document.getElementById('btn-user-signup');
    const formUserLogin = document.getElementById('form-user-login');
    const formUserSignup = document.getElementById('form-user-signup');
    const formAdminLogin = document.getElementById('form-admin-login');

    // Tab Switching Logic
    tabUser.addEventListener('click', () => {
        // Activate User Tab
        sectionUser.classList.remove('hidden');
        sectionAdmin.classList.add('hidden');

        // Update Styles
        tabUser.className = 'flex-1 pb-4 text-center font-bold text-primary border-b-2 border-primary transition-colors focus:outline-none';
        tabAdmin.className = 'flex-1 pb-4 text-center font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors focus:outline-none';
    });

    tabAdmin.addEventListener('click', () => {
        // Activate Admin Tab
        sectionAdmin.classList.remove('hidden');
        sectionUser.classList.add('hidden');

        // Update Styles
        tabAdmin.className = 'flex-1 pb-4 text-center font-bold text-primary border-b-2 border-primary transition-colors focus:outline-none';
        tabUser.className = 'flex-1 pb-4 text-center font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors focus:outline-none';
    });

    // User Login/Signup Toggle Logic
    btnUserLogin.addEventListener('click', () => {
        formUserLogin.classList.remove('hidden');
        formUserSignup.classList.add('hidden');

        btnUserLogin.className = 'flex-1 py-2.5 text-sm font-bold rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm transition-all';
        btnUserSignup.className = 'flex-1 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all';
    });

    btnUserSignup.addEventListener('click', () => {
        formUserSignup.classList.remove('hidden');
        formUserLogin.classList.add('hidden');

        btnUserSignup.className = 'flex-1 py-2.5 text-sm font-bold rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm transition-all';
        btnUserLogin.className = 'flex-1 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all';
    });

    // Authentication Handler
    async function handleAuth(url, body) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                if (data.user.role === 'ADMIN') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/dashboard.html';
                }
            } else {
                alert(data.error || 'Authentication failed');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred. Please try again.');
        }
    }

    // Form Submissions

    // 1. User Login
    formUserLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = formUserLogin.email.value;
        const password = formUserLogin.password.value;
        handleAuth('/auth/login', { email, password });
    });

    // 2. User Signup
    formUserSignup.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = formUserSignup.name.value;
        const email = formUserSignup.email.value;
        const password = formUserSignup.password.value;
        const confirmPassword = formUserSignup.confirmPassword.value;

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        handleAuth('/auth/signup', { name, email, password });
    });

    // 3. Admin Login
    formAdminLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = formAdminLogin.email.value;
        const password = formAdminLogin.password.value;
        // Security code is visual-only/logging for now as per backend spec, but we send it if needed later.
        handleAuth('/auth/login', { email, password });
    });

});
