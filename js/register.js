// js/register.js

document.addEventListener('DOMContentLoaded', () => {
  // Уже залогинен → в дневник
  if (API.getCurrentUser()) {
    location.replace('diary.html');
    return;
  }

  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const name  = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass  = document.getElementById('reg-password').value;
    const pass2 = document.getElementById('reg-password2').value;

    let hasError = false;

    if (name.length < 2) {
      showError('reg-name', 'Введите имя и фамилию');
      hasError = true;
    }
    if (!isValidEmail(email)) {
      showError('reg-email', 'Некорректный email');
      hasError = true;
    }
    if (pass.length < 6) {
      showError('reg-password', 'Пароль от 6 символов');
      hasError = true;
    }
    if (pass !== pass2) {
      showError('reg-password2', 'Пароли не совпадают');
      hasError = true;
    }

    if (hasError) return;

    setLoading(form, true);

    try {
      await API.register({ name, email, password: pass });
      location.href = 'diary.html';
    } catch (err) {
      showError('reg-email', err.message);
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
    btn.textContent = isLoading ? 'Создаём...' : 'Создать аккаунт';
  }
});