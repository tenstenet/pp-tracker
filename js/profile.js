// js/profile.js

document.addEventListener('DOMContentLoaded', async () => {
  if (!await window.authReady) return;
  let user = API.getCurrentUser();
  if (!user) return; // auth.js уже выкинет

  // Элементы
  const avatarEl     = document.getElementById('profile-avatar');
  const nameEl       = document.getElementById('profile-name');
  const emailEl      = document.getElementById('profile-email');
  const sinceEl      = document.getElementById('profile-since');
  const roleEl       = document.getElementById('profile-role');
  const form         = document.getElementById('profile-form');
  const nameInput    = document.getElementById('edit-name');
  const deleteBtn    = document.getElementById('delete-account');
  const toast        = document.getElementById('toast');
  const saveBtn      = form.querySelector('button[type="submit"]');

  // Показываем профиль, проверенный сервером при открытии страницы.
  renderUser(user);
  saveBtn.disabled = true;
  nameInput.disabled = true;
  deleteBtn.disabled = true;
  loadProfile();

  // ============ СМЕНА ИМЕНИ ============

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const newName = nameInput.value.trim();

    if (newName.length < 2) {
      showError('edit-name', 'Введите имя и фамилию');
      return;
    }

    saveBtn.disabled = true;
    try {
      user = await API.updateName(newName);
      renderUser(user);
      renderStats(user.stats);
      showToast('Имя сохранено');
    } catch (err) {
      showError('edit-name', err.message);
    } finally {
      saveBtn.disabled = false;
    }
  });

  // ============ УДАЛЕНИЕ АККАУНТА ============

  deleteBtn.addEventListener('click', async () => {
    const ok = confirm('Удалить аккаунт? Дневник, избранное, посты и комментарии будут удалены без возможности восстановления.');
    if (!ok) return;

    deleteBtn.disabled = true;
    try {
      await API.deleteAccount();
      location.replace('index.html');
    } catch (err) {
      alert(err.message);
    } finally {
      deleteBtn.disabled = false;
    }
  });

  // ============ РЕНДЕР ============

  function renderUser(u) {
    const displayName = u.name || u.email.split('@')[0];
    nameEl.textContent  = displayName;
    emailEl.textContent = u.email;
    avatarEl.textContent = getInitials(displayName);
    nameInput.value = displayName;

    if (u.registeredAt) {
      const d = new Date(u.registeredAt);
      sinceEl.textContent = `Аккаунт создан: ${d.toLocaleDateString('ru-RU')}`;
    } else {
      sinceEl.textContent = '';
    }

    if (u.role === 'admin') {
      roleEl.textContent = 'Роль: администратор';
      roleEl.style.display = '';
    } else {
      roleEl.style.display = 'none';
    }
  }

  async function loadProfile() {
    ['stat-meals', 'stat-favorites', 'stat-days'].forEach(id => {
      document.getElementById(id).textContent = '…';
    });
    try {
      user = await API.restoreUser();
      renderUser(user);
      renderStats(user.stats);
      saveBtn.disabled = false;
      nameInput.disabled = false;
      deleteBtn.disabled = false;
    } catch (err) {
      ['stat-meals', 'stat-favorites', 'stat-days'].forEach(id => {
        document.getElementById(id).textContent = '—';
      });
      showToast('Не удалось загрузить профиль: ' + err.message);
    }
  }

  function renderStats(stats) {
    document.getElementById('stat-meals').textContent = stats.diary_entries_count;
    document.getElementById('stat-favorites').textContent = stats.favorites_count;
    document.getElementById('stat-days').textContent = stats.diary_days_count;
  }

  // ============ ВСПОМОГАТЕЛЬНЫЕ ============
  
  //получить инициалы
  function getInitials(name) {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('');
  }

  //показать ошибку возле поля
  function showError(id, message) {
    const input = document.getElementById(id);
    const error = document.querySelector(`[data-error-for="${id}"]`);
    if (input) input.classList.add('form__input_error');
    if (error) error.textContent = message;
  }

  //убрать предыдущие ошибки
  function clearErrors() {
    document.querySelectorAll('.form__error').forEach(el => el.textContent = '');
    document.querySelectorAll('.form__input_error').forEach(el => el.classList.remove('form__input_error'));
  }

  //показать временное уведомление
  let toastTimer = null;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('toast_visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('toast_visible'), 2500);
  }
});
