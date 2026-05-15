// Реєстрація, вхід, вихід, UI-стан
const authUI = {
    setLoggedIn(user) {
        document.getElementById('btnLogin')?.classList.add('hidden');
        document.getElementById('btnReg')?.classList.add('hidden');
        document.getElementById('btnLogout')?.classList.remove('hidden');

        const navUser = document.getElementById('navUser');
        if (navUser) {
            navUser.textContent = `${user.firstName} ${user.lastName}`;
            navUser.classList.add('visible');
        }
        const greet = document.getElementById('greetName');
        if (greet) greet.textContent = user.firstName;

        closeMobileMenu();
    },

    setLoggedOut() {
        document.getElementById('btnLogin')?.classList.remove('hidden');
        document.getElementById('btnReg')?.classList.remove('hidden');
        document.getElementById('btnLogout')?.classList.add('hidden');
        document.getElementById('navUser')?.classList.remove('visible');

        closeMobileMenu();
    }
};

function setAuthState(token, user) {
    state.auth.token = token;
    state.auth.user = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    authUI.setLoggedIn(user);
}

function clearAuthState() {
    state.auth.token = null;
    state.auth.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authUI.setLoggedOut();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setLoading(btn, loading, text) {
    if (!btn) return;
    btn.disabled = loading;
    btn.innerHTML = loading ? '<div class="spinner"></div>' : text;
}

function showError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
}

// Вхід
async function doLogin() {
    const email = document.getElementById('loginEmail')?.value.trim();
    const pass = document.getElementById('loginPass')?.value;
    const errEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn2');

    if (errEl) errEl.style.display = 'none';
    if (!email || !pass) return showError(errEl, 'Заповніть всі поля');
    if (!isValidEmail(email)) return showError(errEl, 'Некоректна електронна пошта');

    setLoading(btn, true);
    try {
        const d = await api('POST', '/auth/login', { email, password: pass });
        setAuthState(d.token, { firstName: d.firstName, lastName: d.lastName, userId: d.userId });
        closeModal('mLogin');
        toast(`Вітаємо, ${d.firstName}!`, 'ok');
        navigate('dashboard');
    } catch (e) {
        showError(errEl, e.message);
    } finally {
        setLoading(btn, false, 'Увійти');
    }
}

// Реєстрація
async function doRegister() {
    const first = document.getElementById('regFirst')?.value.trim();
    const last = document.getElementById('regLast')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim();
    const pass = document.getElementById('regPass')?.value;
    const errEl = document.getElementById('regError');
    const btn = document.getElementById('regBtn2');

    if (errEl) errEl.style.display = 'none';
    if (!first || !email || !pass) return showError(errEl, "Заповніть обов'язкові поля");
    if (!isValidEmail(email)) return showError(errEl, 'Некоректна електронна пошта');
    if (pass.length < 8) return showError(errEl, 'Пароль мінімум 8 символів');

    setLoading(btn, true);
    try {
        const d = await api('POST', '/auth/register', { email, password: pass, firstName: first, lastName: last });
        setAuthState(d.token, { firstName: d.firstName, lastName: d.lastName, userId: d.userId });
        closeModal('mRegister');
        toast(`Акаунт створено! Вітаємо, ${d.firstName} 🎉`, 'ok');
        navigate('dashboard');
    } catch (e) {
        showError(errEl, e.message);
    } finally {
        setLoading(btn, false, 'Зареєструватись');
    }
}

// Вихід
function logout() {
    clearAuthState();
    navigate('landing');
    toast('Ви вийшли з акаунту');
}