// Слой запросов к FastAPI. В localStorage хранятся только токены входа.
const API_BASE_URL = 'http://127.0.0.1:8000';
const PRODUCT_CATEGORIES = {};
const RECIPE_CATEGORIES = { mass: 'Массонабор', loss: 'Похудение', balance: 'Баланс' };

// _qs(params) — собрать параметры адреса запроса
function _qs(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) query.set(key, value);
  });
  return query.size ? '?' + query.toString() : '';
}

let _refreshRequest = null;
let _currentUser = null;
let _profileRequest = null;

// _clearSession() — удалить токены и профиль из памяти страницы
function _clearSession() {
  _currentUser = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('currentUser');
}

function _requireLogin() {
  _clearSession();
  const page = location.pathname.split('/').pop();
  if (page && page !== 'index.html' && page !== 'register.html') {
    location.replace('index.html');
  }
}

async function _refreshAccessToken() {
  if (_refreshRequest) return _refreshRequest;

  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    _requireLogin();
    throw new Error('Войдите в аккаунт заново');
  }

  _refreshRequest = (async () => {
    const res = await fetch(API_BASE_URL + '/users/access-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (localStorage.getItem('refresh_token') !== refreshToken) {
      throw new Error('Состояние входа изменилось. Повторите действие');
    }

    if (res.status === 401) {
      _requireLogin();
      throw new Error('Срок входа истёк. Войдите в аккаунт заново');
    }
    if (!res.ok) throw new Error('Не удалось обновить токен. Повторите действие позже');

    const data = await res.json();
    if (typeof data.access_token !== 'string' || !data.access_token) {
      throw new Error('Сервер не вернул access-токен');
    }
    if (localStorage.getItem('refresh_token') !== refreshToken) {
      throw new Error('Состояние входа изменилось. Повторите действие');
    }

    localStorage.setItem('access_token', data.access_token);
    return data.access_token;
  })();

  try {
    return await _refreshRequest;
  } finally {
    _refreshRequest = null;
  }
}

async function _http(method, url, body, retry = true) {
  const headers = {};
  const token = localStorage.getItem('access_token');
  const isForm = body instanceof URLSearchParams;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined && !isForm) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(API_BASE_URL + url, {
    method,
    headers,
    body: body === undefined
      ? undefined
      : isForm
        ? body
        : JSON.stringify(body)
  });

  const isProtected = ![
    '/users/token', '/users/register', '/users/logout',
    '/users/access-token', '/users/refresh-token'
  ].includes(url);

  if (res.status === 401 && isProtected) {
    if (retry) {
      // Параллельный запрос мог уже получить новый токен.
      if (localStorage.getItem('access_token') === token) {
        await _refreshAccessToken();
      }
      return _http(method, url, body, false);
    }
    _requireLogin();
    throw new Error('Войдите в аккаунт заново');
  }

  if (!res.ok) {
    let message = `Ошибка запроса (${res.status})`;

    try {
      const data = await res.json();

      if (typeof data.detail === 'string') {
        message = data.detail;
      } else if (Array.isArray(data.detail)) {
        message = data.detail.map(error => error.msg).join('; ');
      }
    } catch {
      // Оставляем сообщение с кодом ошибки.
    }

    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) return null;

  return res.json();
}

let _categoryRequest = null;
let _categories = [];

// _nutrition(data) — привести названия и значения КБЖУ к формату страницы
function _nutrition(data) {
  return { calories: Number(data.calories), protein: Number(data.proteins), fats: Number(data.fats), carbs: Number(data.carbs) };
}

// _product(data) — подготовить продукт для отображения
function _product(data) {
  const category = _categories.find(item => item.id === data.category_id);
  return { id: data.id, name: data.product_name, category: category ? category.slug : '', categoryId: data.category_id,
    imagePath: data.image_path, isFavorite: data.is_favorite, ..._nutrition(data) };
}

// _recipe(data) — подготовить рецепт и его ингредиенты для страницы
function _recipe(data) {
  return { id: data.id, name: data.recipe_name, category: data.category, description: data.description || '',
    imagePath: data.image_path, isFavorite: data.is_favorite, ..._nutrition(data.macros || data),
    ingredientItems: data.ingredients || [],
    ingredients: (data.ingredients || []).map(item => item.product_name + ' — ' + item.amount_grams + ' г'),
    steps: [...(data.steps || [])].sort((a, b) => a.step_number - b.step_number).map(item => item.description) };
}

// _meal(data) — подготовить запись дневника для страницы
function _meal(data) {
  return { id: data.id, type: data.item_type, name: data.item_name, date: data.date,
    productId: data.product_id, recipeId: data.recipe_id, grams: Number(data.amount_grams), ..._nutrition(data) };
}

// _post(data) — подготовить пост и счётчики для стены
function _post(data) {
  return { id: data.id, authorId: data.user_id, authorName: data.author_name, text: data.content,
    createdAt: data.created_at, liked: data.liked, likesCount: data.likes_count, commentsCount: data.comments_count };
}

// _comment(data) — подготовить комментарий для стены
function _comment(data) {
  return { id: data.id, authorId: data.user_id, authorName: data.author_name, text: data.content, createdAt: data.created_at };
}

// _productPayload(data) — собрать поля продукта для сервера
async function _productPayload(data) {
  await API.getCategories();
  const category = _categories.find(item => item.slug === data.category);
  if (!category) throw new Error('Выберите категорию продукта');
  return { product_name: data.name, category_id: category.id, calories: data.calories,
    proteins: data.protein, fats: data.fats, carbs: data.carbs };
}

// _recipePayload(data) — передать ингредиенты и шаги; КБЖУ рассчитает сервер
function _recipePayload(data) {
  return { recipe_name: data.name, category: data.category, description: data.description,
    ingredients: data.ingredients.map(item => ({ product_id: item.product_id, amount_grams: item.amount_grams })),
    steps: data.steps.map((description, index) => ({ step_number: index + 1, description })) };
}

const API = {

  PRODUCT_CATEGORIES,
  RECIPE_CATEGORIES,

  // ==================== ПОЛЬЗОВАТЕЛИ ====================

  async register({ name, email, password }) {
    await _http('POST', '/users/register', {
      name: name.trim(),
      email: email.trim(),
      password
    });

    return this.login({ email, password });
  },

  async login({ email, password }) {
    const form = new URLSearchParams();
    form.set('username', email.trim());
    form.set('password', password);

    const tokens = await _http('POST', '/users/token', form);

    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    _currentUser = null;

    try {
      return await this.getProfile();
    } catch (error) {
      _clearSession();
      throw error;
    }
  },

  async logout() {
    try {
      if (localStorage.getItem('access_token')) {
        await _http('POST', '/users/logout');
      }
    } catch (error) {
      // Выходим локально даже при истёкшем токене или недоступном сервере.
      console.warn('Не удалось подтвердить выход на сервере:', error.message);
    } finally {
      _clearSession();
    }
  },

  // getCurrentUser() — получить уже загруженный профиль из памяти страницы
  getCurrentUser() {
    return _currentUser;
  },

  // restoreUser() — проверить вход на сервере после открытия страницы
  async restoreUser() {
    if (_currentUser) return _currentUser;
    if (!localStorage.getItem('access_token') && !localStorage.getItem('refresh_token')) {
      return null;
    }
    if (_profileRequest) return _profileRequest;

    _profileRequest = (async () => {
      try {
        return await this.getProfile();
      } catch (error) {
        if (!localStorage.getItem('access_token') && !localStorage.getItem('refresh_token')) {
          return null;
        }
        throw error;
      }
    })();

    try {
      return await _profileRequest;
    } finally {
      _profileRequest = null;
    }
  },

  isAdmin() {
    const u = this.getCurrentUser();
    return !!u && u.role === 'admin';
  },

  // getProfile() — загрузить профиль с сервера и сохранить в памяти страницы
  async getProfile() {
    const sessionToken = localStorage.getItem('refresh_token');
    const profile = await _http('GET', '/profile');
    if (localStorage.getItem('refresh_token') !== sessionToken) {
      throw new Error('Состояние входа изменилось. Повторите действие');
    }
    const user = { ...profile, registeredAt: profile.created_at };
    this._setCurrentUser(user);
    return user;
  },

  async updateName(name) {
    name = String(name || '').trim();
    if (name.length < 2) throw new Error('Введите имя и фамилию');

    const profile = await _http('POST', '/profile', { name });
    const user = { ...profile, registeredAt: profile.created_at };
    this._setCurrentUser(user);
    return user;
  },

  // Удаляет аккаунт и все связанные данные: дневник, избранное, посты, комментарии, реакции.
  async deleteAccount() {
    await _http('DELETE', '/account');
    _clearSession();
  },

  // getCategories() — загрузить категории продуктов с сервера
  async getCategories() {
    if (!_categoryRequest) {
      _categoryRequest = _http('GET', '/categories').then(items => {
        _categories = items;
        Object.keys(PRODUCT_CATEGORIES).forEach(key => delete PRODUCT_CATEGORIES[key]);
        items.forEach(item => { PRODUCT_CATEGORIES[item.slug] = item.category_name; });
        return items;
      }).catch(error => { _categoryRequest = null; throw error; });
    }
    return _categoryRequest;
  },

  // getMeals(date) — получить дневник за выбранную дату
  async getMeals(date) {
    return (await _http('GET', '/meals' + _qs({ date }))).map(_meal);
  },

  // addMeal(meal) — добавить продукт с граммовкой или одну порцию рецепта
  async addMeal(meal) {
    const payload = { type: meal.type, date: meal.date };
    if (meal.type === 'product') {
      payload.product_id = meal.productId;
      payload.amount_grams = meal.grams;
    } else if (meal.type === 'recipe') {
      payload.recipe_id = meal.recipeId;
    } else {
      throw new Error('Неизвестный тип записи дневника');
    }
    return _meal(await _http('POST', '/meals', payload));
  },

  // deleteMeal(id) — удалить запись дневника на сервере
  async deleteMeal(id) { await _http('DELETE', '/meals/' + id); },

  // getProducts(filters) — загрузить продукты с поиском и фильтром
  async getProducts({ search = '', category = '' } = {}) {
    await this.getCategories();
    return (await _http('GET', '/products' + _qs({ search: search.trim(), category }))).map(_product);
  },

  // addProduct(data) — создать продукт в каталоге
  async addProduct(data) {
    return _product(await _http('POST', '/products', await _productPayload(data)));
  },

  // updateProduct(id, data) — изменить продукт в каталоге
  async updateProduct(id, data) {
    return _product(await _http('PATCH', '/products/' + id, await _productPayload(data)));
  },

  // deleteProduct(id) — удалить продукт; сервер проверит связи с рецептами
  async deleteProduct(id) { await _http('DELETE', '/products/' + id); },

  // getRecipes(filters) — загрузить рецепты с поиском и фильтром
  async getRecipes({ search = '', category = '' } = {}) {
    return (await _http('GET', '/recipes' + _qs({ search: search.trim(), category }))).map(_recipe);
  },

  // getRecipe(id) — загрузить полную карточку рецепта
  async getRecipe(id) { return _recipe(await _http('GET', '/recipes/' + id)); },

  // addRecipe(data) — создать рецепт с продуктами и шагами
  async addRecipe(data) { return _recipe(await _http('POST', '/recipes', _recipePayload(data))); },

  // updateRecipe(id, data) — изменить рецепт с заменой ингредиентов и шагов
  async updateRecipe(id, data) { return _recipe(await _http('PATCH', '/recipes/' + id, _recipePayload(data))); },

  // deleteRecipe(id) — удалить рецепт из каталога
  async deleteRecipe(id) { await _http('DELETE', '/recipes/' + id); },

  // getFavorites(type) — загрузить избранное и привести вложенные данные к карточкам
  async getFavorites(type) {
    const items = await _http('GET', '/favorites');
    if (items.some(item => item.product)) await this.getCategories();
    return items.map(item => {
      if (item.product) return { ..._product(item.product), type: 'product', itemId: item.product_id };
      if (item.recipe) return { ..._recipe(item.recipe), type: 'recipe', itemId: item.recipe_id };
      return null;
    }).filter(item => item && (!type || item.type === type));
  },

  // addFavorite(item) — сохранить продукт или рецепт в избранном
  async addFavorite(item) {
    if (!['product', 'recipe'].includes(item.type)) throw new Error('Неизвестный тип избранного');
    const payload = item.type === 'product' ? { product_id: item.itemId } : { recipe_id: item.itemId };
    await _http('POST', '/favorites', payload);
  },

  // removeFavorite(type, id) — убрать элемент из избранного
  async removeFavorite(type, id) {
    if (!['product', 'recipe'].includes(type)) throw new Error('Неизвестный тип избранного');
    await _http('DELETE', '/favorites/' + (type === 'product' ? 'products/' : 'recipes/') + id);
  },

  // isFavorite(type, id) — проверить наличие элемента в избранном
  async isFavorite(type, id) { return (await this.getFavorites(type)).some(item => item.itemId === id); },

  // getPosts(options) — загрузить страницу ленты
  async getPosts({ limit = 20, offset = 0 } = {}) {
    return (await _http('GET', '/posts' + _qs({ limit, offset }))).map(_post);
  },

  // createPost(text) — опубликовать пост
  async createPost(text) { return _post(await _http('POST', '/posts', { content: text.trim() })); },

  // deletePost(id) — удалить пост; права проверяет сервер
  async deletePost(id) { await _http('DELETE', '/posts/' + id); },

  // setLike(id, liked) — установить или снять лайк без переключения на сервере
  async setLike(id, liked) {
    const data = await _http(liked ? 'PUT' : 'DELETE', '/posts/' + id + '/like');
    return { liked: data.liked, likesCount: data.likes_count };
  },

  // getComments(postId) — загрузить комментарии при раскрытии поста
  async getComments(postId) {
    return (await _http('GET', '/posts/' + postId + '/comments')).map(_comment);
  },

  // addComment(postId, text) — отправить комментарий
  async addComment(postId, text) {
    return _comment(await _http('POST', '/posts/' + postId + '/comments', { content: text.trim() }));
  },

  // deleteComment(postId, id) — удалить комментарий
  async deleteComment(postId, id) { await _http('DELETE', '/posts/' + postId + '/comments/' + id); },

  // _setCurrentUser(user) — сохранить профиль только в памяти страницы
  _setCurrentUser(user) { _currentUser = user; }
};

window.API = API;
// Удалить устаревшую копию профиля; остальные старые данные не затрагиваем.
localStorage.removeItem('currentUser');
