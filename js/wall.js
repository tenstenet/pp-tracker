// js/wall.js

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = API.getCurrentUser();
  if (!currentUser) return; // auth.js выкинет

  const isAdmin = currentUser.role === 'admin';

  // Элементы
  const feed          = document.getElementById('posts-feed');
  const emptyFeed     = document.getElementById('empty-feed');
  const postForm      = document.getElementById('post-form');
  const postText      = document.getElementById('post-text');
  const postCounter   = document.getElementById('post-counter');
  const newPostAvatar = document.getElementById('new-post-avatar');
  const toast         = document.getElementById('toast');

  // Аватар в форме
  newPostAvatar.textContent = getInitials(currentUser.name || currentUser.email);

  // Счётчик символов
  postText.addEventListener('input', () => {
    postCounter.textContent = postText.value.length;
  });

  // Первый рендер
  loadPosts();

  // Сабмит поста
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const text = postText.value.trim();
    if (text.length < 1) return;

    try {
      await API.createPost(text);
      postText.value = '';
      postCounter.textContent = '0';
      showToast('Пост опубликован');
      loadPosts();
    } catch (err) {
      alert(err.message);
    }
  });

  // ============ ЗАГРУЗКА И РЕНДЕР ============

  async function loadPosts() {
    try {
      const posts = await API.getPosts();

      // Запоминаем, какие комментарии раскрыты и что не отправлено,
      // чтобы лайк или новый комментарий не сбрасывали это при перерисовке
      const openIds = new Set();
      const drafts = {};
      feed.querySelectorAll('.post').forEach(postEl => {
        const id = postEl.dataset.postId;
        const box = postEl.querySelector('.post__comments');
        if (box && box.style.display === 'block') openIds.add(id);
        const input = postEl.querySelector('.post__comment-input');
        if (input && input.value) drafts[id] = input.value;
      });

      if (posts.length === 0) {
        feed.innerHTML = '';
        emptyFeed.style.display = 'block';
        return;
      }

      emptyFeed.style.display = 'none';
      feed.innerHTML = posts.map(p => renderPost(p)).join('');

      feed.querySelectorAll('.post').forEach(postEl => {
        const id = postEl.dataset.postId;
        if (openIds.has(id)) postEl.querySelector('.post__comments').style.display = 'block';
        if (drafts[id]) postEl.querySelector('.post__comment-input').value = drafts[id];
      });

      bindPostEvents();
    } catch (err) {
      console.error(err);
    }
  }

  function renderPost(post) {
    const canDelete  = post.authorId === currentUser.id || isAdmin;
    const isLiked    = (post.likes || []).includes(currentUser.id);
    const likesCount = (post.likes || []).length;
    const comments   = post.comments || [];

    return `
      <article class="post" data-post-id="${post.id}">
        <header class="post__head">
          <div class="post__avatar">${getInitials(post.authorName)}</div>
          <div class="post__author">
            <div class="post__author-name">${escapeHtml(post.authorName)}</div>
            <div class="post__date">${formatDate(post.createdAt)}</div>
          </div>
          ${canDelete ? `<button type="button" class="post__delete" data-action="delete" title="Удалить">×</button>` : ''}
        </header>

        <div class="post__text">${escapeHtml(post.text).replace(/\n/g, '<br>')}</div>

        <footer class="post__actions">
          <button type="button" class="post__action ${isLiked ? 'post__action_active' : ''}"
                  data-action="like">
            👍 <span>${likesCount}</span>
          </button>
          <button type="button" class="post__action" data-action="toggle-comments">
            💬 <span>${comments.length}</span>
          </button>
        </footer>

        <div class="post__comments" style="display:none;">
          <div class="post__comments-list">
            ${comments.map(c => renderComment(c)).join('')}
          </div>
          <form class="post__comment-form" data-action="comment-form">
            <input type="text" class="form__input post__comment-input"
                   placeholder="Написать комментарий..." maxlength="300" required>
            <button type="submit" class="button button_theme_green post__comment-submit">
              Отправить
            </button>
          </form>
        </div>
      </article>
    `;
  }

  function renderComment(c) {
    const canDelete = c.authorId === currentUser.id || isAdmin;
    return `
      <div class="comment" data-comment-id="${c.id}">
        <div class="comment__avatar">${getInitials(c.authorName)}</div>
        <div class="comment__body">
          <div class="comment__head">
            <span class="comment__author">${escapeHtml(c.authorName)}</span>
            <span class="comment__date">${formatDate(c.createdAt)}</span>
            ${canDelete ? `<button type="button" class="comment__delete" data-action="delete-comment"
                                   title="Удалить комментарий" aria-label="Удалить комментарий">×</button>` : ''}
          </div>
          <div class="comment__text">${escapeHtml(c.text)}</div>
        </div>
      </div>
    `;
  }

  // ============ ОБРАБОТЧИКИ ============

  function bindPostEvents() {
    feed.querySelectorAll('.post').forEach(postEl => {
      const postId = Number(postEl.dataset.postId);

      // Лайк
      const likeBtn = postEl.querySelector('[data-action="like"]');
      likeBtn?.addEventListener('click', () => handleLike(postId));

      // Раскрыть комментарии
      const commentsBtn = postEl.querySelector('[data-action="toggle-comments"]');
      const commentsBox = postEl.querySelector('.post__comments');
      commentsBtn?.addEventListener('click', () => {
        const visible = commentsBox.style.display === 'block';
        commentsBox.style.display = visible ? 'none' : 'block';
      });

      // Удалить пост
      const deleteBtn = postEl.querySelector('[data-action="delete"]');
      deleteBtn?.addEventListener('click', () => handleDelete(postId));

      // Удалить комментарий
      postEl.querySelectorAll('[data-action="delete-comment"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const commentId = Number(btn.closest('.comment').dataset.commentId);
          handleDeleteComment(postId, commentId);
        });
      });

      // Форма комментария
      const commentForm = postEl.querySelector('[data-action="comment-form"]');
      commentForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = commentForm.querySelector('.post__comment-input');
        handleComment(postId, input.value.trim(), input);
      });
    });
  }

  async function handleLike(postId) {
    try {
      await API.toggleLike(postId);
      loadPosts();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(postId) {
    if (!confirm('Удалить пост?')) return;
    try {
      await API.deletePost(postId);
      showToast('Пост удалён');
      loadPosts();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleComment(postId, text, inputEl) {
    if (!text) return;
    try {
      await API.addComment(postId, text);
      inputEl.value = '';
      showToast('Комментарий добавлен');
      loadPosts();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteComment(postId, commentId) {
    if (!confirm('Удалить комментарий?')) return;
    try {
      await API.deleteComment(postId, commentId);
      showToast('Комментарий удалён');
      loadPosts();
    } catch (err) {
      alert(err.message);
    }
  }

  // ============ УТИЛИТЫ ============

  function getInitials(name) {
    return String(name)
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('');
  }

  function formatDate(timestamp) {
    const d = new Date(timestamp);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1)    return 'только что';
    if (diffMin < 60)   return `${diffMin} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7)   return `${diffDays} дн назад`;

    return d.toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  let toastTimer = null;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('toast_visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('toast_visible'), 2500);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
