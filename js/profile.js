// js/profile.js

document.addEventListener('DOMContentLoaded', () => {
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

  // Заполняем карточку
  renderUser(user);
  loadStats();

  // Аккаунт администратора удалять нельзя — прячем блок целиком
  if (user.role === 'admin') {
    const section = deleteBtn.closest('section');
    if (section) section.style.display = 'none';
  }

  // ============ СМЕНА ИМЕНИ ============

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const newName = nameInput.value.trim();

    if (newName.length < 2) {
      showError('edit-name', 'Введите имя и фамилию');
      return;
    }

    try {
      user = await API.updateName(newName);
      renderUser(user);
      showToast('Имя сохранено');
    } catch (err) {
      alert(err.message);
    }
  });

  // ============ УДАЛЕНИЕ АККАУНТА ============

  deleteBtn.addEventListener('click', async () => {
    const ok = confirm('Удалить аккаунт? Дневник, избранное, посты и комментарии будут удалены без возможности восстановления.');
    if (!ok) return;

    try {
      await API.deleteAccount();
      location.replace('index.html');
    } catch (err) {
      alert(err.message);
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

  async function loadStats() {
    try {
      const allMeals  = await API.getAllMeals();
      const favorites = await API.getFavorites();

      // Уникальные дни
      const days = new Set(allMeals.map(m => m.date));

      document.getElementById('stat-meals').textContent     = allMeals.length;
      document.getElementById('stat-favorites').textContent = favorites.length;
      document.getElementById('stat-days').textContent      = days.size;
    } catch (err) {
      console.error(err);
    }
  }

  // ============ ВСПОМОГАТЕЛЬНЫЕ ============

  function getInitials(name) {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('');
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

  let toastTimer = null;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('toast_visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('toast_visible'), 2500);
  }
});
