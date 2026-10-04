// js/api.js
//
// Слой работы с данными.
// СЕЙЧАС: localStorage (mock).
// ПОТОМ:  те же методы через fetch('/api/...'). Страницы обращаются только к API,
//         поэтому при подключении бэкенда достаточно поставить USE_MOCK = false.
//
// Учётная запись администратора (mock): admin@fooddiary.ru / admin123

const USE_MOCK = true;

const ADMIN_SEED = {
  id: 1,
  name: 'Администратор',
  email: 'admin@fooddiary.ru',
  password: 'admin123',
  role: 'admin'
};

const PRODUCT_CATEGORIES = {
  grains: 'Крупы и макароны',
  meat: 'Мясо и рыба',
  dairy: 'Молочные продукты и яйца',
  vegetables: 'Овощи',
  fruits: 'Фрукты и ягоды',
  nuts: 'Орехи и семена',
  bread: 'Хлеб',
  oils: 'Масла и сладкое'
};

const RECIPE_CATEGORIES = {
  mass: 'Массонабор',
  loss: 'Похудение',
  balance: 'Баланс'
};

// ============ НАЧАЛЬНЫЕ ДАННЫЕ СПРАВОЧНИКОВ ============
// Продукты: КБЖУ на 100 г. Рецепты: КБЖУ на 1 порцию.

const PRODUCTS_SEED = [
  { id: 1, name: 'Овсянка (сухая)', category: 'grains', calories: 350, protein: 12, fats: 6, carbs: 60 },
  { id: 2, name: 'Рис белый (сухой)', category: 'grains', calories: 344, protein: 7, fats: 1, carbs: 78 },
  { id: 3, name: 'Рис бурый (сухой)', category: 'grains', calories: 337, protein: 8, fats: 3, carbs: 72 },
  { id: 4, name: 'Гречка (сухая)', category: 'grains', calories: 343, protein: 13, fats: 3, carbs: 72 },
  { id: 5, name: 'Макароны (сухие)', category: 'grains', calories: 350, protein: 12, fats: 1, carbs: 72 },
  { id: 6, name: 'Булгур (сухой)', category: 'grains', calories: 342, protein: 12, fats: 1, carbs: 76 },
  { id: 7, name: 'Кускус (сухой)', category: 'grains', calories: 376, protein: 13, fats: 1, carbs: 77 },
  { id: 10, name: 'Куриная грудка', category: 'meat', calories: 165, protein: 31, fats: 4, carbs: 0 },
  { id: 11, name: 'Куриное бедро', category: 'meat', calories: 185, protein: 25, fats: 9, carbs: 0 },
  { id: 12, name: 'Индейка (грудка)', category: 'meat', calories: 104, protein: 19, fats: 2, carbs: 0 },
  { id: 13, name: 'Говядина', category: 'meat', calories: 187, protein: 26, fats: 9, carbs: 0 },
  { id: 14, name: 'Свинина (шейка)', category: 'meat', calories: 343, protein: 16, fats: 31, carbs: 0 },
  { id: 15, name: 'Лосось', category: 'meat', calories: 208, protein: 20, fats: 13, carbs: 0 },
  { id: 16, name: 'Треска', category: 'meat', calories: 82, protein: 18, fats: 1, carbs: 0 },
  { id: 17, name: 'Тунец (консервы)', category: 'meat', calories: 116, protein: 25, fats: 1, carbs: 0 },
  { id: 20, name: 'Яйцо куриное', category: 'dairy', calories: 143, protein: 13, fats: 10, carbs: 1 },
  { id: 21, name: 'Молоко 2.5%', category: 'dairy', calories: 52, protein: 3, fats: 3, carbs: 5 },
  { id: 22, name: 'Творог 5%', category: 'dairy', calories: 121, protein: 17, fats: 5, carbs: 3 },
  { id: 23, name: 'Творог обезжиренный', category: 'dairy', calories: 71, protein: 18, fats: 0, carbs: 1 },
  { id: 24, name: 'Кефир 1%', category: 'dairy', calories: 40, protein: 3, fats: 1, carbs: 4 },
  { id: 25, name: 'Сыр твердый', category: 'dairy', calories: 380, protein: 24, fats: 30, carbs: 0 },
  { id: 26, name: 'Йогурт натуральный', category: 'dairy', calories: 66, protein: 4, fats: 4, carbs: 4 },
  { id: 30, name: 'Огурец', category: 'vegetables', calories: 15, protein: 1, fats: 0, carbs: 3 },
  { id: 31, name: 'Помидор', category: 'vegetables', calories: 18, protein: 1, fats: 0, carbs: 4 },
  { id: 32, name: 'Брокколи', category: 'vegetables', calories: 34, protein: 3, fats: 0, carbs: 7 },
  { id: 33, name: 'Морковь', category: 'vegetables', calories: 41, protein: 1, fats: 0, carbs: 10 },
  { id: 34, name: 'Картофель', category: 'vegetables', calories: 77, protein: 2, fats: 0, carbs: 17 },
  { id: 35, name: 'Капуста белокочанная', category: 'vegetables', calories: 25, protein: 1, fats: 0, carbs: 6 },
  { id: 36, name: 'Перец болгарский', category: 'vegetables', calories: 27, protein: 1, fats: 0, carbs: 6 },
  { id: 37, name: 'Лук репчатый', category: 'vegetables', calories: 40, protein: 1, fats: 0, carbs: 9 },
  { id: 40, name: 'Яблоко', category: 'fruits', calories: 52, protein: 0, fats: 0, carbs: 14 },
  { id: 41, name: 'Банан', category: 'fruits', calories: 89, protein: 1, fats: 0, carbs: 23 },
  { id: 42, name: 'Апельсин', category: 'fruits', calories: 47, protein: 1, fats: 0, carbs: 12 },
  { id: 43, name: 'Груша', category: 'fruits', calories: 57, protein: 0, fats: 0, carbs: 15 },
  { id: 44, name: 'Виноград', category: 'fruits', calories: 69, protein: 1, fats: 0, carbs: 18 },
  { id: 45, name: 'Клубника', category: 'fruits', calories: 32, protein: 1, fats: 0, carbs: 8 },
  { id: 46, name: 'Черника', category: 'fruits', calories: 57, protein: 1, fats: 0, carbs: 14 },
  { id: 50, name: 'Миндаль', category: 'nuts', calories: 579, protein: 21, fats: 50, carbs: 22 },
  { id: 51, name: 'Грецкий орех', category: 'nuts', calories: 654, protein: 15, fats: 65, carbs: 14 },
  { id: 52, name: 'Семечки подсолнечника', category: 'nuts', calories: 584, protein: 21, fats: 51, carbs: 20 },
  { id: 60, name: 'Хлеб белый', category: 'bread', calories: 265, protein: 9, fats: 3, carbs: 49 },
  { id: 61, name: 'Хлеб ржаной', category: 'bread', calories: 250, protein: 7, fats: 3, carbs: 48 },
  { id: 62, name: 'Батон', category: 'bread', calories: 264, protein: 8, fats: 3, carbs: 50 },
  { id: 70, name: 'Масло оливковое', category: 'oils', calories: 884, protein: 0, fats: 100, carbs: 0 },
  { id: 71, name: 'Масло сливочное', category: 'oils', calories: 717, protein: 1, fats: 81, carbs: 0 },
  { id: 72, name: 'Сахар', category: 'oils', calories: 387, protein: 0, fats: 0, carbs: 100 },
  { id: 73, name: 'Мёд', category: 'oils', calories: 304, protein: 0, fats: 0, carbs: 82 },
  { id: 74, name: 'Шоколад темный', category: 'oils', calories: 546, protein: 5, fats: 31, carbs: 61 },
];

const RECIPES_SEED = [
  {
    id: 1, name: "Овсяноблин с творогом", category: "balance",
    description: "Овсянка, яйцо, творог, зелень",
    calories: 320, protein: 25, fats: 10, carbs: 30,
    ingredients: ["Овсяные хлопья — 40 г", "Яйцо — 1 шт.", "Творог 5% — 100 г", "Зелень — 10 г", "Соль — по вкусу"],
    steps: ["Смешать хлопья с яйцом и двумя столовыми ложками воды, оставить на 5 минут.", "Вылить массу на разогретую сковороду и обжарить с двух сторон по 2–3 минуты.", "Творог смешать с мелко нарезанной зеленью.", "Выложить начинку на овсяноблин и свернуть."]
  },
  {
    id: 2, name: "Греческий салат", category: "loss",
    description: "Огурец, помидор, сыр фета, оливки, масло",
    calories: 280, protein: 8, fats: 22, carbs: 10,
    ingredients: ["Огурец — 100 г", "Помидор — 120 г", "Сыр фета — 40 г", "Оливки — 30 г", "Оливковое масло — 1 ч. л."],
    steps: ["Нарезать огурец и помидор крупными кубиками.", "Добавить оливки и нарезанную фету.", "Заправить маслом и аккуратно перемешать."]
  },
  {
    id: 3, name: "Куриное филе с овощами", category: "loss",
    description: "Курица, брокколи, перец, лук",
    calories: 340, protein: 42, fats: 10, carbs: 15,
    ingredients: ["Куриная грудка — 150 г", "Брокколи — 100 г", "Перец болгарский — 80 г", "Лук репчатый — 40 г", "Оливковое масло — 1 ч. л."],
    steps: ["Курицу нарезать кубиками, овощи — крупными кусочками.", "Обжарить курицу на масле 6–7 минут до золотистой корочки.", "Добавить лук и перец, готовить 3 минуты.", "Положить брокколи, накрыть крышкой и тушить 5 минут."]
  },
  {
    id: 4, name: "Творожная запеканка", category: "balance",
    description: "Творог, яйцо, мёд, изюм",
    calories: 260, protein: 22, fats: 8, carbs: 25,
    ingredients: ["Творог 5% — 200 г", "Яйцо — 1 шт.", "Мёд — 1 ст. л.", "Изюм — 20 г", "Манная крупа — 1 ст. л."],
    steps: ["Смешать творог, яйцо, мёд и манную крупу.", "Добавить промытый изюм.", "Выложить в форму и выпекать при 180 °C 30–35 минут.", "Перед подачей остудить 10 минут."]
  },
  {
    id: 5, name: "Смузи с бананом и клубникой", category: "balance",
    description: "Банан, клубника, йогурт, мёд",
    calories: 210, protein: 6, fats: 3, carbs: 40,
    ingredients: ["Банан — 1 шт. (120 г)", "Клубника — 100 г", "Йогурт натуральный — 100 г", "Мёд — 1 ч. л."],
    steps: ["Банан нарезать, клубнику промыть.", "Сложить все ингредиенты в блендер.", "Взбить около минуты до однородности."]
  },
  {
    id: 6, name: "Лосось с рисом", category: "mass",
    description: "Лосось, рис, лимон, зелень",
    calories: 480, protein: 32, fats: 18, carbs: 45,
    ingredients: ["Лосось — 150 г", "Рис белый (сухой) — 60 г", "Лимон — 1/4 шт.", "Зелень — 10 г"],
    steps: ["Рис промыть и сварить до готовности (около 15 минут).", "Лосось посолить и сбрызнуть лимонным соком.", "Запекать при 200 °C 12–15 минут.", "Подать с рисом и зеленью."]
  },
  {
    id: 7, name: "Омлет с овощами", category: "balance",
    description: "Яйца, помидор, перец, зелень",
    calories: 240, protein: 18, fats: 16, carbs: 6,
    ingredients: ["Яйцо — 3 шт.", "Помидор — 80 г", "Перец болгарский — 60 г", "Зелень — 10 г"],
    steps: ["Взбить яйца с щепоткой соли.", "Помидор и перец нарезать и обжарить 2 минуты.", "Залить яйцами, накрыть крышкой и готовить на слабом огне 5–6 минут.", "Посыпать зеленью."]
  },
  {
    id: 8, name: "Киноа с овощами", category: "balance",
    description: "Киноа, брокколи, морковь, масло",
    calories: 350, protein: 12, fats: 12, carbs: 50,
    ingredients: ["Киноа (сухая) — 70 г", "Брокколи — 100 г", "Морковь — 60 г", "Оливковое масло — 1 ч. л."],
    steps: ["Киноа промыть и варить 15 минут в двойном объёме воды.", "Морковь натереть, брокколи разобрать на соцветия.", "Обжарить овощи на масле 5–7 минут.", "Смешать овощи с киноа."]
  },
  {
    id: 9, name: "Индейка с гречкой", category: "mass",
    description: "Индейка, гречка, лук, морковь",
    calories: 420, protein: 38, fats: 8, carbs: 48,
    ingredients: ["Индейка (грудка) — 150 г", "Гречка (сухая) — 70 г", "Лук репчатый — 40 г", "Морковь — 50 г"],
    steps: ["Гречку промыть и сварить (около 15 минут).", "Индейку нарезать кусочками, лук и морковь — соломкой.", "Тушить индейку с овощами 15 минут под крышкой.", "Подать с гречкой."]
  },
  {
    id: 10, name: "Салат с тунцом", category: "loss",
    description: "Тунец, яйцо, огурец, листья салата",
    calories: 230, protein: 28, fats: 10, carbs: 5,
    ingredients: ["Тунец (консервы) — 100 г", "Яйцо — 1 шт.", "Огурец — 100 г", "Листья салата — 50 г"],
    steps: ["Яйцо сварить вкрутую (8–10 минут) и остудить.", "Огурец и яйцо нарезать, листья салата порвать руками.", "Добавить тунец и перемешать; по желанию заправить лимонным соком."]
  },
  {
    id: 11, name: "Протеиновые панкейки", category: "mass",
    description: "Овсянка, яйцо, банан, протеин",
    calories: 380, protein: 30, fats: 8, carbs: 45,
    ingredients: ["Овсяные хлопья — 40 г", "Яйцо — 1 шт.", "Банан — 1 шт. (100 г)", "Протеин — 20 г"],
    steps: ["Измельчить хлопья в муку.", "Банан размять, добавить яйцо, протеин и муку, перемешать.", "Жарить на сухой сковороде по 2 минуты с каждой стороны."]
  },
  {
    id: 12, name: "Тыквенный суп-пюре", category: "loss",
    description: "Тыква, морковь, лук, сливки",
    calories: 190, protein: 4, fats: 8, carbs: 26,
    ingredients: ["Тыква — 250 г", "Морковь — 60 г", "Лук репчатый — 40 г", "Сливки 10% — 50 мл"],
    steps: ["Овощи нарезать кубиками.", "Варить в воде около 20 минут до мягкости.", "Пробить блендером и добавить сливки.", "Прогреть 2 минуты, не доводя до кипения."]
  },
  {
    id: 13, name: "Котлеты из индейки на пару", category: "loss",
    description: "Фарш индейки, лук, яйцо",
    calories: 250, protein: 30, fats: 10, carbs: 5,
    ingredients: ["Фарш индейки — 150 г", "Лук репчатый — 30 г", "Яйцо — 1/2 шт."],
    steps: ["Лук мелко нарезать или натереть, смешать с фаршем и яйцом.", "Посолить и сформировать котлеты.", "Готовить на пару 20–25 минут."]
  },
  {
    id: 14, name: "Шоколадный смузи с овсянкой", category: "mass",
    description: "Какао, банан, овсянка, молоко",
    calories: 320, protein: 10, fats: 8, carbs: 52,
    ingredients: ["Какао — 1 ст. л.", "Банан — 1 шт. (100 г)", "Овсяные хлопья — 30 г", "Молоко 2.5% — 200 мл"],
    steps: ["Залить хлопья молоком на 10 минут.", "Добавить банан и какао.", "Взбить блендером до однородности."]
  },
  {
    id: 15, name: "Запечённые овощи с сыром", category: "balance",
    description: "Кабачок, баклажан, перец, сыр",
    calories: 270, protein: 12, fats: 16, carbs: 20,
    ingredients: ["Кабачок — 120 г", "Баклажан — 100 г", "Перец болгарский — 80 г", "Сыр твёрдый — 40 г"],
    steps: ["Овощи нарезать кружками и полосками.", "Выложить на противень и посолить.", "Запекать при 200 °C 20 минут.", "Посыпать тёртым сыром и вернуть в духовку на 5 минут."]
  },
];

// ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============

function _uid() {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

function _load(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value === null || value === undefined ? fallback : value;
  } catch (e) {
    return fallback;
  }
}

function _save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function _qs(params) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v); });
  const s = p.toString();
  return s ? '?' + s : '';
}

async function _http(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    let msg = '';
    try { msg = (await res.json()).error; } catch (e) { /* тело не JSON */ }
    throw new Error(msg || `Ошибка запроса (${res.status})`);
  }
  if (res.status === 204) return null;
  try { return await res.json(); } catch (e) { return null; }
}

function _num(value) {
  if (value === '' || value === null || value === undefined) throw new Error('Введите число');
  const n = Number(value);
  if (!isFinite(n) || n < 0) throw new Error('Некорректное число');
  return Math.round(n * 10) / 10;
}

function _cleanProduct(p) {
  const name = String(p.name || '').trim();
  if (!name) throw new Error('Введите название');
  if (!PRODUCT_CATEGORIES[p.category]) throw new Error('Выберите категорию');
  return {
    name,
    category: p.category,
    calories: _num(p.calories),
    protein: _num(p.protein),
    fats: _num(p.fats),
    carbs: _num(p.carbs)
  };
}

function _cleanRecipe(r) {
  const name = String(r.name || '').trim();
  if (!name) throw new Error('Введите название');
  if (!RECIPE_CATEGORIES[r.category]) throw new Error('Выберите категорию');
  const lines = (arr) => (Array.isArray(arr) ? arr : []).map(s => String(s).trim()).filter(Boolean);
  const ingredients = lines(r.ingredients);
  const steps = lines(r.steps);
  if (ingredients.length === 0) throw new Error('Добавьте хотя бы один ингредиент');
  if (steps.length === 0) throw new Error('Добавьте хотя бы один шаг');
  return {
    name,
    category: r.category,
    description: String(r.description || '').trim(),
    calories: _num(r.calories),
    protein: _num(r.protein),
    fats: _num(r.fats),
    carbs: _num(r.carbs),
    ingredients,
    steps
  };
}

// ============ ИНИЦИАЛИЗАЦИЯ MOCK-ДАННЫХ ============

// Переносит данные старого формата (без userId, с email вместо id) в новый.
function _migrate() {
  const users = _load('users', []).map(u => ({
    ...u,
    email: String(u.email || '').toLowerCase(),
    role: u.role || 'user',
    registeredAt: u.registeredAt || u.id
  }));
  _save('users', users);

  const byEmail = (e) => users.find(u => u.email === String(e || '').toLowerCase());
  const owner = users.find(u => u.role !== 'admin');

  const cur = _load('currentUser', null);
  if (cur) {
    const u = byEmail(cur.email);
    if (u) {
      const { password, ...safe } = u;
      _save('currentUser', safe);
    } else {
      localStorage.removeItem('currentUser');
    }
  }

  _save('meals', _load('meals', [])
    .map(m => (m.userId ? m : (owner ? { ...m, userId: owner.id } : null)))
    .filter(Boolean));

  _save('favorites', _load('favorites', [])
    .map(f => ({ userId: f.userId || (owner && owner.id), type: f.type, itemId: f.itemId }))
    .filter(f => f.userId));

  _save('posts', _load('posts', []).map(p => {
    if (p.authorId) return p;
    const author = byEmail(p.authorEmail);
    if (!author) return null;
    return {
      id: p.id,
      authorId: author.id,
      text: p.text,
      createdAt: p.createdAt,
      likes: (p.likes || []).map(byEmail).filter(Boolean).map(u => u.id),
      comments: (p.comments || []).map(c => {
        const a = byEmail(c.authorEmail);
        return a ? { id: c.id, authorId: a.id, text: c.text, createdAt: c.createdAt } : null;
      }).filter(Boolean)
    };
  }).filter(Boolean));
}

function _initMock() {
  if (_load('schema', 0) < 3) {
    _migrate();
    _save('schema', 3);
  }
  if (!_load('catalog_products', null)) _save('catalog_products', PRODUCTS_SEED);
  if (!_load('catalog_recipes', null)) _save('catalog_recipes', RECIPES_SEED);

  const users = _load('users', []);
  if (!users.some(u => u.role === 'admin')) {
    users.push({ ...ADMIN_SEED, registeredAt: Date.now() });
    _save('users', users);
  }
}

function _authorName(users, id) {
  const u = users.find(x => x.id === id);
  return u ? (u.name || u.email.split('@')[0]) : 'Удалённый пользователь';
}

function _enrichPost(post, users) {
  return {
    ...post,
    authorName: _authorName(users, post.authorId),
    comments: (post.comments || []).map(c => ({ ...c, authorName: _authorName(users, c.authorId) }))
  };
}

// ============ API ============

const API = {

  PRODUCT_CATEGORIES,
  RECIPE_CATEGORIES,

  // ==================== ПОЛЬЗОВАТЕЛИ ====================

  async register({ name, email, password }) {
    if (USE_MOCK) {
      email = email.trim().toLowerCase();
      const users = _load('users', []);
      if (users.some(u => u.email === email)) {
        throw new Error('Пользователь с таким email уже существует');
      }
      const user = { id: _uid(), name: name.trim(), email, password, role: 'user', registeredAt: Date.now() };
      users.push(user);
      _save('users', users);
      this._setSession(user);
      return this._safe(user);
    }

    const user = await _http('POST', '/api/register', { name, email, password });
    this._setSession(user);
    return user;
  },

  async login({ email, password }) {
    if (USE_MOCK) {
      email = email.trim().toLowerCase();
      const user = _load('users', []).find(u => u.email === email && u.password === password);
      if (!user) throw new Error('Неверный email или пароль');
      this._setSession(user);
      return this._safe(user);
    }

    const user = await _http('POST', '/api/login', { email, password });
    this._setSession(user);
    return user;
  },

  async logout() {
    if (!USE_MOCK) {
      try { await _http('POST', '/api/logout'); } catch (e) { /* чистим локально в любом случае */ }
    }
    localStorage.removeItem('currentUser');
  },

  getCurrentUser() {
    return _load('currentUser', null);
  },

  isAdmin() {
    const u = this.getCurrentUser();
    return !!u && u.role === 'admin';
  },

  async getProfile() {
    if (USE_MOCK) {
      const me = this._requireUser();
      const user = _load('users', []).find(u => u.id === me.id);
      if (!user) throw new Error('Пользователь не найден');
      return this._safe(user);
    }
    return _http('GET', '/api/profile');
  },

  async updateName(name) {
    name = String(name || '').trim();
    if (name.length < 2) throw new Error('Введите имя и фамилию');

    if (USE_MOCK) {
      const me = this._requireUser();
      const users = _load('users', []);
      const user = users.find(u => u.id === me.id);
      if (!user) throw new Error('Пользователь не найден');
      user.name = name;
      _save('users', users);
      this._setSession(user);
      return this._safe(user);
    }

    const user = await _http('POST', '/api/profile', { name });
    this._setSession(user);
    return user;
  },

  // Удаляет аккаунт и все связанные данные: дневник, избранное, посты, комментарии, реакции.
  async deleteAccount() {
    if (USE_MOCK) {
      const me = this._requireUser();
      if (me.role === 'admin') throw new Error('Аккаунт администратора нельзя удалить');

      _save('users', _load('users', []).filter(u => u.id !== me.id));
      _save('meals', _load('meals', []).filter(m => m.userId !== me.id));
      _save('favorites', _load('favorites', []).filter(f => f.userId !== me.id));
      _save('posts', _load('posts', [])
        .filter(p => p.authorId !== me.id)
        .map(p => ({
          ...p,
          likes: (p.likes || []).filter(id => id !== me.id),
          comments: (p.comments || []).filter(c => c.authorId !== me.id)
        })));
      localStorage.removeItem('currentUser');
      return;
    }

    await _http('DELETE', '/api/account');
    localStorage.removeItem('currentUser');
  },

  // ==================== ДНЕВНИК ====================

  async getAllMeals() {
    if (USE_MOCK) {
      const me = this.getCurrentUser();
      if (!me) return [];
      return _load('meals', []).filter(m => m.userId === me.id);
    }
    return _http('GET', '/api/meals');
  },

  async getMeals(date) {
    if (USE_MOCK) {
      return (await this.getAllMeals()).filter(m => m.date === date);
    }
    return _http('GET', '/api/meals' + _qs({ date }));
  },

  async addMeal(meal) {
    if (USE_MOCK) {
      const me = this._requireUser();
      const all = _load('meals', []);
      const newMeal = { ...meal, id: _uid(), userId: me.id };
      all.push(newMeal);
      _save('meals', all);
      return newMeal;
    }
    return _http('POST', '/api/meals', meal);
  },

  async deleteMeal(id) {
    if (USE_MOCK) {
      const me = this._requireUser();
      _save('meals', _load('meals', []).filter(m => !(m.id === id && m.userId === me.id)));
      return;
    }
    await _http('DELETE', `/api/meals/${id}`);
  },

  // ==================== ПРОДУКТЫ ====================
  // product = { id, name, category, calories, protein, fats, carbs }  (на 100 г)

  async getProducts({ search = '', category = '' } = {}) {
    if (USE_MOCK) {
      const q = search.trim().toLowerCase();
      return _load('catalog_products', []).filter(p =>
        (!category || p.category === category) &&
        (!q || p.name.toLowerCase().includes(q)));
    }
    return _http('GET', '/api/products' + _qs({ search: search.trim(), category }));
  },

  async addProduct(data) {
    if (USE_MOCK) {
      this._requireAdmin();
      const all = _load('catalog_products', []);
      const product = { id: all.reduce((m, p) => Math.max(m, p.id), 0) + 1, ..._cleanProduct(data) };
      all.push(product);
      _save('catalog_products', all);
      return product;
    }
    return _http('POST', '/api/products', data);
  },

  async updateProduct(id, data) {
    if (USE_MOCK) {
      this._requireAdmin();
      const all = _load('catalog_products', []);
      const idx = all.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Продукт не найден');
      all[idx] = { id, ..._cleanProduct(data) };
      _save('catalog_products', all);
      return all[idx];
    }
    return _http('PUT', `/api/products/${id}`, data);
  },

  async deleteProduct(id) {
    if (USE_MOCK) {
      this._requireAdmin();
      _save('catalog_products', _load('catalog_products', []).filter(p => p.id !== id));
      _save('favorites', _load('favorites', []).filter(f => !(f.type === 'product' && f.itemId === id)));
      return;
    }
    await _http('DELETE', `/api/products/${id}`);
  },

  // ==================== РЕЦЕПТЫ ====================
  // recipe = { id, name, category, description, calories, protein, fats, carbs, ingredients[], steps[] }  (на порцию)

  async getRecipes({ search = '', category = '' } = {}) {
    if (USE_MOCK) {
      const q = search.trim().toLowerCase();
      return _load('catalog_recipes', []).filter(r =>
        (!category || r.category === category) &&
        (!q || r.name.toLowerCase().includes(q)));
    }
    return _http('GET', '/api/recipes' + _qs({ search: search.trim(), category }));
  },

  async getRecipe(id) {
    if (USE_MOCK) {
      return _load('catalog_recipes', []).find(r => r.id === id) || null;
    }
    try { return await _http('GET', `/api/recipes/${id}`); } catch (e) { return null; }
  },

  async addRecipe(data) {
    if (USE_MOCK) {
      this._requireAdmin();
      const all = _load('catalog_recipes', []);
      const recipe = { id: all.reduce((m, r) => Math.max(m, r.id), 0) + 1, ..._cleanRecipe(data) };
      all.push(recipe);
      _save('catalog_recipes', all);
      return recipe;
    }
    return _http('POST', '/api/recipes', data);
  },

  async updateRecipe(id, data) {
    if (USE_MOCK) {
      this._requireAdmin();
      const all = _load('catalog_recipes', []);
      const idx = all.findIndex(r => r.id === id);
      if (idx === -1) throw new Error('Рецепт не найден');
      all[idx] = { id, ..._cleanRecipe(data) };
      _save('catalog_recipes', all);
      return all[idx];
    }
    return _http('PUT', `/api/recipes/${id}`, data);
  },

  async deleteRecipe(id) {
    if (USE_MOCK) {
      this._requireAdmin();
      _save('catalog_recipes', _load('catalog_recipes', []).filter(r => r.id !== id));
      _save('favorites', _load('favorites', []).filter(f => !(f.type === 'recipe' && f.itemId === id)));
      return;
    }
    await _http('DELETE', `/api/recipes/${id}`);
  },

  // ==================== ИЗБРАННОЕ ====================
  // В хранилище лежит только {userId, type, itemId}; данные берутся из справочников,
  // поэтому правки администратора сразу видны в избранном.
  // type: 'product' | 'recipe' | undefined (undefined = все)

  async getFavorites(type) {
    if (USE_MOCK) {
      const me = this.getCurrentUser();
      if (!me) return [];
      const products = _load('catalog_products', []);
      const recipes = _load('catalog_recipes', []);
      const result = [];

      _load('favorites', [])
        .filter(f => f.userId === me.id && (!type || f.type === type))
        .forEach(f => {
          const src = (f.type === 'product' ? products : recipes).find(x => x.id === f.itemId);
          if (!src) return;
          result.push({
            type: f.type,
            itemId: f.itemId,
            name: src.name,
            category: src.category,
            calories: src.calories,
            protein: src.protein,
            fats: src.fats,
            carbs: src.carbs,
            description: f.type === 'recipe' ? src.description : undefined
          });
        });
      return result;
    }
    return _http('GET', '/api/favorites' + _qs({ type }));
  },

  async addFavorite(item) {
    if (USE_MOCK) {
      const me = this._requireUser();
      const favs = _load('favorites', []);
      const exists = favs.some(f => f.userId === me.id && f.type === item.type && f.itemId === item.itemId);
      if (exists) return;
      favs.push({ userId: me.id, type: item.type, itemId: item.itemId });
      _save('favorites', favs);
      return;
    }
    await _http('POST', '/api/favorites', { type: item.type, itemId: item.itemId });
  },

  async removeFavorite(type, itemId) {
    if (USE_MOCK) {
      const me = this._requireUser();
      _save('favorites', _load('favorites', [])
        .filter(f => !(f.userId === me.id && f.type === type && f.itemId === itemId)));
      return;
    }
    await _http('DELETE', `/api/favorites/${type}/${itemId}`);
  },

  async isFavorite(type, itemId) {
    const favs = await this.getFavorites(type);
    return favs.some(f => f.itemId === itemId);
  },

  // ==================== СТЕНА ====================
  // post    = { id, authorId, authorName, text, createdAt, likes: [userId], comments: [] }
  // comment = { id, authorId, authorName, text, createdAt }

  async getPosts() {
    if (USE_MOCK) {
      const users = _load('users', []);
      return _load('posts', [])
        .map(p => _enrichPost(p, users))
        .sort((a, b) => b.createdAt - a.createdAt);
    }
    return _http('GET', '/api/posts');
  },

  async createPost(text) {
    text = String(text || '').trim();
    if (text.length < 1) throw new Error('Введите текст');
    if (text.length > 500) throw new Error('Не больше 500 символов');

    if (USE_MOCK) {
      const me = this._requireUser();
      const post = { id: _uid(), authorId: me.id, text, createdAt: Date.now(), likes: [], comments: [] };
      const all = _load('posts', []);
      all.push(post);
      _save('posts', all);
      return _enrichPost(post, _load('users', []));
    }
    return _http('POST', '/api/posts', { text });
  },

  async deletePost(postId) {
    if (USE_MOCK) {
      const me = this._requireUser();
      const all = _load('posts', []);
      const post = all.find(p => p.id === postId);
      if (!post) throw new Error('Пост не найден');
      if (post.authorId !== me.id && me.role !== 'admin') throw new Error('Нет прав на удаление');
      _save('posts', all.filter(p => p.id !== postId));
      return;
    }
    await _http('DELETE', `/api/posts/${postId}`);
  },

  async toggleLike(postId) {
    if (USE_MOCK) {
      const me = this._requireUser();
      const all = _load('posts', []);
      const post = all.find(p => p.id === postId);
      if (!post) throw new Error('Пост не найден');

      post.likes = post.likes || [];
      const idx = post.likes.indexOf(me.id);
      if (idx === -1) post.likes.push(me.id); else post.likes.splice(idx, 1);

      _save('posts', all);
      return _enrichPost(post, _load('users', []));
    }
    return _http('POST', `/api/posts/${postId}/like`);
  },

  async addComment(postId, text) {
    text = String(text || '').trim();
    if (text.length < 1) throw new Error('Введите текст');
    if (text.length > 300) throw new Error('Не больше 300 символов');

    if (USE_MOCK) {
      const me = this._requireUser();
      const all = _load('posts', []);
      const post = all.find(p => p.id === postId);
      if (!post) throw new Error('Пост не найден');

      const comment = { id: _uid(), authorId: me.id, text, createdAt: Date.now() };
      post.comments = post.comments || [];
      post.comments.push(comment);
      _save('posts', all);
      return { ...comment, authorName: _authorName(_load('users', []), me.id) };
    }
    return _http('POST', `/api/posts/${postId}/comments`, { text });
  },

  async deleteComment(postId, commentId) {
    if (USE_MOCK) {
      const me = this._requireUser();
      const all = _load('posts', []);
      const post = all.find(p => p.id === postId);
      if (!post) throw new Error('Пост не найден');

      const comment = (post.comments || []).find(c => c.id === commentId);
      if (!comment) throw new Error('Комментарий не найден');
      if (comment.authorId !== me.id && me.role !== 'admin') throw new Error('Нет прав на удаление');

      post.comments = post.comments.filter(c => c.id !== commentId);
      _save('posts', all);
      return;
    }
    await _http('DELETE', `/api/posts/${postId}/comments/${commentId}`);
  },

  // ==================== СЛУЖЕБНОЕ ====================

  _requireUser() {
    const user = this.getCurrentUser();
    if (!user) throw new Error('Нужно войти');
    return user;
  },

  _requireAdmin() {
    const user = this._requireUser();
    if (user.role !== 'admin') throw new Error('Недостаточно прав');
    return user;
  },

  _setSession(user) {
    const { password, ...safe } = user;
    _save('currentUser', safe);
  },

  _safe(user) {
    const { password, ...safe } = user;
    return safe;
  }
};

window.API = API;

if (USE_MOCK) _initMock();
