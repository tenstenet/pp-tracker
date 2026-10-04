// js/login.js

document.addEventListener('DOMContentLoaded', () => {
  // Уже залогинен → в дневник
  if (API.getCurrentUser()) {
    location.replace('diary.html');
    return;
  }

  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-password').value;

    let hasError = false;

    if (!isValidEmail(email)) {
      showError('login-email', 'Некорректный email');
      hasError = true;
    }
    if (pass.length < 6) {
      showError('login-password', 'Пароль от 6 символов');
      hasError = true;
    }

    if (hasError) return;

    setLoading(form, true);

    try {
      await API.login({ email, password: pass });
      location.href = 'diary.html';
    } catch (err) {
      showError('login-password', err.message);
      setLoading(form, false);
    }
  });

  // ---------- Вспомогательные ----------

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function showError(id, message) {
    const input = document.getElementById(id);
    const error = document.querySelector(`[data-error-for="${id}"]`);
    if (input) input.classList.add('form__input_error');
    if (error) error.textContent = message;
  }

  function clearErrors() {
    document.querySelectorAll('.form__error').forEach(el => el.textContent = '');
    document.querySelectorAll('.form__input_error').forEach(el => el.classList.remove('form__input_error'));
  }

  function setLoading(form, isLoading) {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = isLoading;
    btn.textContent = isLoading ? 'Входим...' : 'Войти';
  }
});