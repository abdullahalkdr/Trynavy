// auth.js — مشترك لكل الصفحات

const NAVY_USER_KEY = 'navyUser';
const NAVY_AUTH_KEY = 'navyIsLoggedIn';

function setLoggedInUser(user) {
  localStorage.setItem(NAVY_USER_KEY, JSON.stringify(user || {}));
  localStorage.setItem(NAVY_AUTH_KEY, 'true');
}

function getLoggedInUser() {
  try {
    return JSON.parse(localStorage.getItem(NAVY_USER_KEY) || 'null');
  } catch {
    return null;
  }
}

function isLoggedIn() {
  return localStorage.getItem(NAVY_AUTH_KEY) === 'true' && !!getLoggedInUser();
}

function logout() {
  localStorage.removeItem(NAVY_USER_KEY);
  localStorage.removeItem(NAVY_AUTH_KEY);
  renderAuthUI();
}

// يحدث الواجهة في كل صفحة فيها هيدر
function renderAuthUI() {
  const loginLink   = document.querySelector('[data-login-link]');
  const userBtn     = document.querySelector('[data-user-button]');
  const userNameEls = document.querySelectorAll('[data-user-name]');
  const accountTitle= document.querySelector('[data-account-title]');

  const user = getLoggedInUser() || {};

  // NEW: اقرأ الاسم من الجذر أو من profile
  const first =
    (user.firstName && user.firstName.trim()) ||
    (user.profile && user.profile.firstName && user.profile.firstName.trim()) ||
    '';
  const last =
    (user.lastName && user.lastName.trim()) ||
    (user.profile && user.profile.lastName && user.profile.lastName.trim()) ||
    '';

  const fullName =
    [first, last].filter(Boolean).join(' ') ||
    user.displayName ||
    user.name ||
    user.email ||
    'My Account';

  if (isLoggedIn() && user) {
    if (loginLink) loginLink.style.display = 'none';
    if (userBtn) userBtn.style.display = '';
    userNameEls.forEach(el => (el.textContent = fullName));
    if (accountTitle) accountTitle.textContent = fullName;
  } else {
    if (loginLink) loginLink.style.display = '';
    if (userBtn) userBtn.style.display = 'none';
    userNameEls.forEach(el => (el.textContent = ''));
    if (accountTitle) accountTitle.textContent = 'Your Account';
  }
}


// إتاحة الدوال عالمياً
window.NAVY_AUTH = { setLoggedInUser, getLoggedInUser, isLoggedIn, logout, renderAuthUI };

// تشغيل تلقائي بعد تحميل الصفحة
document.addEventListener('DOMContentLoaded', renderAuthUI);
