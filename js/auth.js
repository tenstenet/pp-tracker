// js/auth.js
// Проверка входа на сервере + функция выхода.
// Подключать ПОСЛЕ api.js и ПЕРЕД скриптом страницы.

// guard() — загрузить профиль перед запуском защищённой страницы
window.authReady = (async function guard() {
  try {
    const user = await API.restoreUser();
    if (!user) location.replace('index.html');
    return user;
  } catch (error) {
    const notice = document.createElement('p');
    notice.className = 'container';
    notice.setAttribute('role', 'alert');
    notice.textContent = 'Не удалось проверить вход. Обновите страницу, чтобы повторить: ' + error.message;
    document.body.prepend(notice);
    return null;
  }
})();

// logout() — завершить вход и открыть страницу авторизации
async function logout() {
  await API.logout();
  location.replace('index.html');
}

window.logout = logout;