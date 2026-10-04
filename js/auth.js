// js/auth.js
// Страж для защищённых страниц + функция выхода.
// Подключать ПОСЛЕ api.js и ПЕРЕД скриптом страницы.

(function guard() {
  if (!API.getCurrentUser()) {
    location.replace('index.html');
  }
})();

async function logout() {
  await API.logout();
  location.replace('index.html');
}

window.logout = logout;