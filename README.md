# Kanban Board

Минималистичное Kanban-приложение для учёта задач с поддержкой drag-and-drop и локальным хранилищем.

**Деплой:** https://smynay.github.io/ai-gen-kanban-board/

## Возможности

- Три колонки: **Нужно сделать** → **В процессе** → **Готово**
- **Архив** выполненных задач с возможностью восстановления или удаления
- Drag-and-drop мышкой и тач-жестами для перемещения задач
- Автоскролл при перетаскивании к краям экрана
- Модальное окно для добавления задач с выбором колонки
- Подтверждение удаления с кастомной модалкой
- Стек модальных окон (предыдущая скрывается при открытии новой)
- Данные сохраняются в `localStorage`
- Адаптивный дизайн (десктоп + мобильные)
- Динамические колонки: добавление, переименование, удаление в настройках
- Per-column настройки: зачёркивание (isCompleted) и разрешение архивации
- Бэклог — колонка слева для новых и отложенных задач
- Выбор колонки восстановления из архива и бэклога
- Режим «На всю ширину»
- Inline SVG favicon с поддержкой тёмной темы

## Технологии

- Чистый HTML/CSS/JS — никаких фреймворков
- HTML5 Drag and Drop API
- Touch-события для мобильных устройств
- CSS Flexbox, анимации, медиа-запросы
- GitHub Pages для хостинга
- OpenCode (агент разработки)
- DeepSeek V4 Flash Free (языковая модель)

## Структура проекта

```
├── .github/workflows/deploy.yml   # CI/CD — деплой на GitHub Pages
├── index.html                      # Разметка приложения
├── style.css                       # Стили
├── script.js                       # Логика приложения
└── README.md                       # Документация
```

## GitFlow

Ветвление по GitFlow:

| Ветка        | Назначение                    |
|-------------|-------------------------------|
| `main`      | Продакшн                      |
| `develop`   | Интеграция                    |
| `feature/*` | Новые фичи (от `develop`)     |
| `release/*` | Релизы (от `develop`)         |
| `hotfix/*`  | Хотфиксы (от `main`)          |

### Работа с ветками

```bash
# Новая фича
git checkout develop
git checkout -b feature/my-feature
# ... работа ...
git commit -m "feat: my feature"
git checkout develop
git merge feature/my-feature
git branch -d feature/my-feature

# Релиз
git checkout develop
git checkout -b release/1.0.0
# ... финальные правки ...
git checkout main
git merge release/1.0.0
git tag -a 1.0.0 -m "v1.0.0"
git checkout develop
git merge release/1.0.0
git branch -d release/1.0.0
```

## Разработка

Просто открой `index.html` в браузере — всё работает из коробки без сервера и сборки.

### CI/CD

При пуше в `main` GitHub Actions автоматически деплоит приложение на GitHub Pages.

## Генерация

Проект полностью сгенерирован с помощью **DeepSeek V4 Flash Free** и **OpenCode**.
Весь код, CI/CD, документация и GitFlow созданы через голосовые/текстовые команды
в интерактивном режиме.
