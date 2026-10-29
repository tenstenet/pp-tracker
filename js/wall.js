// Стена: посты с сервера, страницы ленты и отдельная загрузка комментариев.
document.addEventListener('DOMContentLoaded', async () => {
  if (!await window.authReady) return;
  const currentUser = API.getCurrentUser();
  const feed = document.getElementById('posts-feed');
  const emptyFeed = document.getElementById('empty-feed');
  const form = document.getElementById('post-form');
  const text = document.getElementById('post-text');
  const counter = document.getElementById('post-counter');
  const more = document.getElementById('load-more-posts');
  const status = document.getElementById('wall-status');
  const toast = document.getElementById('toast');
  const pageSize = 20;
  let posts = [];
  let loading = false;
  let hasMore = true;
  let toastTimer = null;
  const comments = new Map();
  const opened = new Set();
  const drafts = new Map();
  document.getElementById('new-post-avatar').textContent = initials(currentUser.name || currentUser.email);
  text.addEventListener('input', () => { counter.textContent = text.value.length; });
  more.addEventListener('click', () => loadPosts(false));

  // loadPosts(reset) — загрузить первую или следующую страницу ленты
  async function loadPosts(reset = true) {
    if (loading) return;
    loading = true;
    more.disabled = true;
    form.querySelector('button[type="submit"]').disabled = true;
    status.textContent = 'Загрузка…';
    try {
      const items = await API.getPosts({ limit: pageSize, offset: reset ? 0 : posts.length });
      posts = reset ? items : [...posts, ...items.filter(item => !posts.some(post => post.id === item.id))];
      hasMore = items.length === pageSize;
      status.textContent = '';
      renderFeed();
    } catch (error) {
      status.textContent = 'Не удалось загрузить ленту: ' + error.message;
      // Кнопка позволяет повторить первый запрос и запрос следующей страницы.
      more.hidden = false;
      more.textContent = 'Повторить загрузку';
    } finally {
      loading = false;
      more.disabled = false;
      form.querySelector('button[type="submit"]').disabled = false;
    }
  }

  // renderFeed() — показать посты, сохранив открытые комментарии и черновики
  function renderFeed() {
    feed.querySelectorAll('.post').forEach(element => {
      drafts.set(Number(element.dataset.postId), element.querySelector('.post__comment-input').value);
    });
    emptyFeed.style.display = posts.length ? 'none' : 'block';
    more.hidden = !hasMore;
    more.textContent = 'Показать ещё';
    feed.innerHTML = posts.map(post => {
      const canDelete = post.authorId === currentUser.id || currentUser.role === 'admin';
      return '<article class="post" data-post-id="' + post.id + '">' +
        '<header class="post__head"><div class="post__avatar">' + escapeHtml(initials(post.authorName)) + '</div>' +
        '<div class="post__author"><div class="post__author-name">' + escapeHtml(post.authorName) + '</div>' +
        '<div class="post__date">' + escapeHtml(formatDate(post.createdAt)) + '</div></div>' +
        (canDelete ? '<button type="button" class="post__delete" data-action="delete" aria-label="Удалить пост">×</button>' : '') + '</header>' +
        '<div class="post__text">' + escapeHtml(post.text).replace(/\n/g, '<br>') + '</div>' +
        '<footer class="post__actions"><button type="button" class="post__action ' + (post.liked ? 'post__action_active' : '') + '" data-action="like">👍 <span>' + post.likesCount + '</span></button>' +
        '<button type="button" class="post__action" data-action="comments">💬 <span>' + post.commentsCount + '</span></button></footer>' +
        '<div class="post__comments" style="display:' + (opened.has(post.id) ? 'block' : 'none') + '">' +
        '<div class="post__comments-list">' + (comments.get(post.id) || []).map(renderComment).join('') + '</div>' +
        '<form class="post__comment-form"><input type="text" class="form__input post__comment-input" placeholder="Написать комментарий..." aria-label="Текст комментария" maxlength="300" required>' +
        '<button type="submit" class="button button_theme_green post__comment-submit">Отправить</button></form></div></article>';
    }).join('');
    feed.querySelectorAll('.post').forEach(element => {
      element.querySelector('.post__comment-input').value = drafts.get(Number(element.dataset.postId)) || '';
    });
  }

  // renderComment(item) — подготовить разметку комментария с проверкой кнопки удаления
  function renderComment(item) {
    const canDelete = item.authorId === currentUser.id || currentUser.role === 'admin';
    return '<div class="comment" data-comment-id="' + item.id + '"><div class="comment__avatar">' + escapeHtml(initials(item.authorName)) + '</div>' +
      '<div class="comment__body"><div class="comment__head"><span class="comment__author">' + escapeHtml(item.authorName) + '</span>' +
      '<span class="comment__date">' + escapeHtml(formatDate(item.createdAt)) + '</span>' +
      (canDelete ? '<button type="button" class="comment__delete" data-action="delete-comment" aria-label="Удалить комментарий">×</button>' : '') +
      '</div><div class="comment__text">' + escapeHtml(item.text) + '</div></div></div>';
  }

  // Загрузка комментариев выполняется только при раскрытии поста.
  feed.addEventListener('click', async event => {
    const button = event.target.closest('button[data-action]');
    if (!button || button.disabled) return;
    const element = button.closest('.post');
    const id = Number(element.dataset.postId);
    const post = posts.find(item => item.id === id);
    if (!post) return;
    button.disabled = true;
    try {
      switch (button.dataset.action) {
        case 'like':
          Object.assign(post, await API.setLike(id, !post.liked));
          break;
        case 'comments':
          if (opened.has(id)) opened.delete(id);
          else {
            const items = await API.getComments(id);
            comments.set(id, items);
            post.commentsCount = items.length;
            opened.add(id);
          }
          break;
        case 'delete':
          if (!confirm('Удалить пост и все его комментарии?')) return;
          await API.deletePost(id);
          posts = posts.filter(item => item.id !== id);
          comments.delete(id);
          opened.delete(id);
          drafts.delete(id);
          break;
        case 'delete-comment': {
          if (!confirm('Удалить комментарий?')) return;
          const commentId = Number(button.closest('.comment').dataset.commentId);
          await API.deleteComment(id, commentId);
          comments.set(id, (comments.get(id) || []).filter(item => item.id !== commentId));
          post.commentsCount = Math.max(0, post.commentsCount - 1);
          break;
        }
      }
      renderFeed();
    } catch (error) {
      showToast(error.message);
    } finally {
      button.disabled = false;
    }
  });

  feed.addEventListener('submit', async event => {
    const commentForm = event.target.closest('.post__comment-form');
    if (!commentForm) return;
    event.preventDefault();
    const input = commentForm.querySelector('input');
    const content = input.value.trim();
    if (!content) return;
    const button = commentForm.querySelector('button');
    if (button.disabled) return;
    const id = Number(commentForm.closest('.post').dataset.postId);
    button.disabled = true;
    try {
      const comment = await API.addComment(id, content);
      comments.set(id, [...(comments.get(id) || []), comment]);
      const post = posts.find(item => item.id === id);
      if (post) post.commentsCount++;
      input.value = '';
      drafts.delete(id);
      renderFeed();
    } catch (error) { showToast(error.message); }
    finally { button.disabled = false; }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const content = text.value.trim();
    const button = form.querySelector('button[type="submit"]');
    if (!content || button.disabled) return;
    button.disabled = true;
    try {
      await API.createPost(content);
      text.value = '';
      counter.textContent = '0';
      await loadPosts();
    } catch (error) { showToast(error.message); }
    finally { button.disabled = false; }
  });

  // initials(name) — получить инициалы автора
  function initials(name) { return String(name).split(' ').filter(Boolean).slice(0, 2).map(word => word[0].toUpperCase()).join(''); }

  // formatDate(value) — показать время публикации
  function formatDate(value) { return new Date(value).toLocaleString('ru-RU'); }

  // escapeHtml(value) — вывести пользовательский текст без выполнения HTML
  function escapeHtml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // showToast(message) — показать временное уведомление
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('toast_visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('toast_visible'), 3000);
  }
  loadPosts();
});
