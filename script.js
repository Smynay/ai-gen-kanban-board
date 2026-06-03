const ARCHIVE = '__archived__';
const BACKLOG = '__backlog__';

const board = document.getElementById('board');
const confirmOverlay = document.getElementById('modal-overlay');
const confirmCancel = document.getElementById('modal-cancel');
const confirmConfirm = document.getElementById('modal-confirm');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const settingsList = document.getElementById('settings-list');
const settingsClose = document.getElementById('settings-close');
const settingsCloseBtn = document.getElementById('settings-close-btn');
const addColumnBtn = document.getElementById('add-column-btn');
const showArchiveToggle = document.getElementById('show-archive-toggle');
const restoreSelect = document.getElementById('restore-column-select');
const addBtn = document.getElementById('add-btn');
const addModal = document.getElementById('add-modal');
const addForm = document.getElementById('add-form');
const addInput = document.getElementById('add-input');
const addCancel = document.getElementById('add-cancel');
const columnSelector = document.getElementById('column-selector');
const archiveModal = document.getElementById('archive-modal');
const archiveList = document.getElementById('archive-list');
const archiveClose = document.getElementById('archive-close');
const backlogModal = document.getElementById('backlog-modal');
const backlogList = document.getElementById('backlog-list');
const backlogClose = document.getElementById('backlog-close');

let boardData = null;
let pendingDeleteId = null;
let dragData = null;

const modalStack = [];
let modalZIndex = 10000;

function pushModal(el) {
    if (modalStack.length > 0) {
        modalStack[modalStack.length - 1].classList.add('modal-hidden');
    }
    el.style.zIndex = modalZIndex++;
    el.classList.add('active');
    modalStack.push(el);
}

function popModal() {
    const el = modalStack.pop();
    if (el) {
        el.classList.remove('active');
        el.style.zIndex = '';
    }
    if (modalStack.length > 0) {
        modalStack[modalStack.length - 1].classList.remove('modal-hidden');
    }
}

function genId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function defaultColumns() {
    return [
        { id: genId(), name: 'Нужно сделать', isCompleted: false, canArchive: false, order: 0 },
        { id: genId(), name: 'В процессе', isCompleted: false, canArchive: false, order: 1 },
        { id: genId(), name: 'Готово', isCompleted: true, canArchive: true, order: 2 },
    ];
}

function initData() {
    boardData = {
        boardName: 'Kanban Board',
        columns: defaultColumns(),
        showArchive: true,
        restoreColumnId: null,
        showBacklog: true,
        restoreBacklogColumnId: null,
        fullWidth: false,
        todos: [],
    };
}

function loadData() {
    const raw = localStorage.getItem('boardData');
    if (!raw) {
        initData();
        return;
    }
    try {
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
            initData();
            boardData.todos = data.map(t => ({
                id: t.id,
                text: t.text,
                columnId: mapOldStatus(t.status || 'todo'),
            }));
            document.title = 'Kanban Board';
            return;
        }
        if (data.todos && data.todos.length > 0 && data.todos[0].status !== undefined) {
            const cols = defaultColumns();
            boardData = {
                boardName: data.boardName || 'Kanban Board',
                columns: cols,
                showArchive: data.showArchive !== undefined ? data.showArchive : true,
                restoreColumnId: cols[0].id,
                showBacklog: true,
                restoreBacklogColumnId: null,
                fullWidth: false,
                todos: data.todos.map(t => ({
                    id: t.id,
                    text: t.text,
                    columnId: mapOldStatus(t.status || 'todo'),
                })),
            };
            document.title = boardData.boardName;
            return;
        }
        boardData = data;
        if (!boardData.columns) boardData.columns = defaultColumns();
        if (boardData.showArchive === undefined) boardData.showArchive = true;
        if (boardData.showBacklog === undefined) boardData.showBacklog = true;
        if (boardData.restoreBacklogColumnId === undefined) boardData.restoreBacklogColumnId = null;
        if (boardData.fullWidth === undefined) boardData.fullWidth = false;
        if (!boardData.todos) boardData.todos = [];
        document.title = boardData.boardName || 'Kanban Board';
    } catch {
        initData();
    }
}

function mapOldStatus(status) {
    if (status === 'archived') return ARCHIVE;
    if (status === 'done') return boardData.columns[2] ? boardData.columns[2].id : boardData.columns[0].id;
    if (status === 'in-progress') return boardData.columns[1] ? boardData.columns[1].id : boardData.columns[0].id;
    return boardData.columns[0].id;
}

function saveData() {
    localStorage.setItem('boardData', JSON.stringify(boardData));
}

function getFirstColumnId() {
    return boardData.columns.length > 0 ? boardData.columns[0].id : null;
}

function getRestoreColumnId() {
    if (boardData.restoreColumnId && boardData.columns.some(c => c.id === boardData.restoreColumnId)) {
        return boardData.restoreColumnId;
    }
    return getFirstColumnId();
}

function getBacklogRestoreColumnId() {
    if (boardData.restoreBacklogColumnId && boardData.columns.some(c => c.id === boardData.restoreBacklogColumnId)) {
        return boardData.restoreBacklogColumnId;
    }
    return getFirstColumnId();
}

function getRestoreColumnId() {
    if (boardData.restoreColumnId && boardData.columns.some(c => c.id === boardData.restoreColumnId)) {
        return boardData.restoreColumnId;
    }
    return getFirstColumnId();
}

function sortedColumns() {
    return [...boardData.columns].sort((a, b) => a.order - b.order);
}

function showConfirmModal() {
    pushModal(confirmOverlay);
    return new Promise((resolve) => {
        confirmConfirm.onclick = () => { popModal(); resolve(true); };
        confirmCancel.onclick = () => { popModal(); resolve(false); };
        confirmOverlay.onclick = (e) => {
            if (e.target === confirmOverlay) { popModal(); resolve(false); }
        };
    });
}

function renderBoard() {
    board.innerHTML = '';
    const cols = sortedColumns();

    if (boardData.showBacklog) {
        const backlogEl = document.createElement('div');
        backlogEl.className = 'column column-backlog';
        backlogEl.dataset.columnId = BACKLOG;
        const count = boardData.todos.filter(t => t.columnId === BACKLOG).length;
        backlogEl.innerHTML = `
            <div class="archive-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
                    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
                </svg>
                <span>Бэклог <span style="font-size:12px;color:#999;">${count}</span></span>
            </div>
        `;
        board.appendChild(backlogEl);
    }

    cols.forEach(col => {
        const el = document.createElement('div');
        el.className = 'column';
        el.dataset.columnId = col.id;

        const items = boardData.todos.filter(t => t.columnId === col.id);

        el.innerHTML = `
            <div class="column-header">
                <h2>${escapeHtml(col.name)}</h2>
                <span class="column-count">${items.length}</span>
            </div>
            <div class="card-list"></div>
        `;

        const list = el.querySelector('.card-list');
        items.forEach(todo => {
            const card = document.createElement('div');
            card.className = 'card' + (col.isCompleted ? ' card-completed' : '');
            card.draggable = true;
            card.dataset.id = todo.id;
            card.innerHTML = `
                <span class="card-text">${escapeHtml(todo.text)}</span>
                <button class="delete-btn" title="Удалить">&times;</button>
            `;
            list.appendChild(card);
        });

        board.appendChild(el);
    });

    if (boardData.showArchive) {
        const archivedEl = document.createElement('div');
        archivedEl.className = 'column column-archived';
        archivedEl.dataset.columnId = ARCHIVE;
        const count = boardData.todos.filter(t => t.columnId === ARCHIVE).length;
        archivedEl.innerHTML = `
            <div class="archive-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 8v13H3V8"/>
                    <path d="M1 3h22v5H1z"/>
                    <path d="M10 12h4"/>
                </svg>
                <span>Архив <span style="font-size:12px;color:#999;">${count}</span></span>
            </div>
        `;
        board.appendChild(archivedEl);
    }
}

function renderAddColumns() {
    columnSelector.innerHTML = '';
    const backlogLabel = document.createElement('label');
    backlogLabel.className = 'col-option';
    backlogLabel.innerHTML = `
        <input type="radio" name="add-col" value="${BACKLOG}" checked>
        <span>Бэклог</span>
    `;
    columnSelector.appendChild(backlogLabel);
    const cols = sortedColumns();
    cols.forEach(col => {
        const label = document.createElement('label');
        label.className = 'col-option';
        label.innerHTML = `
            <input type="radio" name="add-col" value="${col.id}">
            <span>${escapeHtml(col.name)}</span>
        `;
        columnSelector.appendChild(label);
    });
}

function renderSettings() {
    settingsList.innerHTML = '';
    const cols = sortedColumns();

    cols.forEach(col => {
        const card = document.createElement('div');
        card.className = 'settings-column-card';
        card.dataset.columnId = col.id;

        card.innerHTML = `
            <div class="settings-col-header">
                <input class="settings-col-name" value="${escapeHtml(col.name)}">
                <button class="settings-col-delete" title="Удалить колонку">&times;</button>
            </div>
            <div class="settings-col-toggles">
                <label class="toggle">
                    <input type="checkbox" class="toggle-completed" ${col.isCompleted ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                    <span class="toggle-label">Зачёркивать</span>
                </label>
                <label class="toggle">
                    <input type="checkbox" class="toggle-archive" ${col.canArchive ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                    <span class="toggle-label">В архив</span>
                </label>
            </div>
        `;

        const nameInput = card.querySelector('.settings-col-name');
        nameInput.addEventListener('change', () => {
            const val = nameInput.value.trim();
            if (val) {
                col.name = val;
                saveData();
                renderBoard();
            } else {
                nameInput.value = col.name;
            }
        });

        const completedToggle = card.querySelector('.toggle-completed');
        completedToggle.addEventListener('change', () => {
            col.isCompleted = completedToggle.checked;
            saveData();
            renderBoard();
        });

        const archiveToggle = card.querySelector('.toggle-archive');
        archiveToggle.addEventListener('change', () => {
            col.canArchive = archiveToggle.checked;
            saveData();
            renderBoard();
        });

        const deleteBtn = card.querySelector('.settings-col-delete');
        deleteBtn.addEventListener('click', async () => {
            if (boardData.columns.length <= 1) return;
            const confirmed = await showConfirmModal();
            if (confirmed) {
                const firstId = getFirstColumnId();
                boardData.todos.forEach(t => {
                    if (t.columnId === col.id) t.columnId = firstId;
                });
                boardData.columns = boardData.columns.filter(c => c.id !== col.id);
                boardData.columns.forEach((c, i) => c.order = i);
                if (boardData.restoreColumnId === col.id) {
                    boardData.restoreColumnId = firstId;
                }
                saveData();
                renderBoard();
                renderSettings();
    renderRestoreSelect();
    renderBacklogRestoreSelect();
            }
        });

        settingsList.appendChild(card);
    });

    renderRestoreSelect();
    renderBacklogRestoreSelect();

    const oldDisplay = document.querySelector('[data-section="display"]');
    if (oldDisplay) oldDisplay.remove();

    const toggleDiv = document.createElement('div');
    toggleDiv.className = 'settings-section';
    toggleDiv.dataset.section = 'display';
    toggleDiv.innerHTML = `
        <div class="settings-section-title">Отображение</div>
        <label class="toggle settings-row">
            <input type="checkbox" id="fullwidth-toggle" ${boardData.fullWidth ? 'checked' : ''}>
            <span class="toggle-slider"></span>
            <span class="toggle-label">На всю ширину</span>
        </label>
    `;
    const divider = document.querySelector('.settings-divider');
    divider.parentNode.insertBefore(toggleDiv, divider.nextSibling);

    const fullwidthToggle = document.getElementById('fullwidth-toggle');
    fullwidthToggle.addEventListener('change', () => {
        boardData.fullWidth = fullwidthToggle.checked;
        saveData();
        applyFullWidth();
    });
}

function renderBacklogRestoreSelect() {
    const select = document.getElementById('backlog-restore-select');
    const currentVal = select.value;
    select.innerHTML = '';
    const cols = sortedColumns();
    cols.forEach(col => {
        const opt = document.createElement('option');
        opt.value = col.id;
        opt.textContent = col.name;
        select.appendChild(opt);
    });
    if (currentVal && boardData.columns.some(c => c.id === currentVal)) {
        select.value = currentVal;
    } else if (boardData.restoreBacklogColumnId && boardData.columns.some(c => c.id === boardData.restoreBacklogColumnId)) {
        select.value = boardData.restoreBacklogColumnId;
    }
}

function applyFullWidth() {
    document.querySelector('.container').classList.toggle('container-fullwidth', boardData.fullWidth);
}

function renderRestoreSelect() {
    const currentVal = restoreSelect.value;
    restoreSelect.innerHTML = '';
    const cols = sortedColumns();
    cols.forEach(col => {
        const opt = document.createElement('option');
        opt.value = col.id;
        opt.textContent = col.name;
        restoreSelect.appendChild(opt);
    });
    if (currentVal && boardData.columns.some(c => c.id === currentVal)) {
        restoreSelect.value = currentVal;
    } else if (boardData.restoreColumnId && boardData.columns.some(c => c.id === boardData.restoreColumnId)) {
        restoreSelect.value = boardData.restoreColumnId;
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalStack.length > 0) {
        const top = modalStack[modalStack.length - 1];
        if (top === confirmOverlay) {
            confirmConfirm.onclick = null;
            confirmCancel.onclick = null;
            confirmOverlay.onclick = null;
        }
        popModal();
    }
});

addBtn.addEventListener('click', () => {
    renderAddColumns();
    addInput.value = '';
    pushModal(addModal);
    addInput.focus();
});

function closeAddModal() {
    popModal();
}

addCancel.addEventListener('click', closeAddModal);

addModal.addEventListener('click', (e) => {
    if (e.target === addModal) closeAddModal();
});

addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = addInput.value.trim();
    const selected = document.querySelector('input[name="add-col"]:checked');
    if (text && selected) {
        const todo = { id: genId(), text, columnId: selected.value };
        boardData.todos.push(todo);
        saveData();
        renderBoard();
        closeAddModal();
        renderBacklogModal();
    }
});

settingsBtn.addEventListener('click', () => {
    renderSettings();
    showArchiveToggle.checked = boardData.showArchive;
    document.getElementById('show-backlog-toggle').checked = boardData.showBacklog;
    pushModal(settingsModal);
});

function closeSettingsModal() {
    boardData.showArchive = showArchiveToggle.checked;
    boardData.showBacklog = document.getElementById('show-backlog-toggle').checked;
    boardData.fullWidth = document.getElementById('fullwidth-toggle')?.checked ?? boardData.fullWidth;
    const restoreVal = restoreSelect.value;
    if (restoreVal && boardData.columns.some(c => c.id === restoreVal)) {
        boardData.restoreColumnId = restoreVal;
    }
    const backlogRestoreVal = document.getElementById('backlog-restore-select').value;
    if (backlogRestoreVal && boardData.columns.some(c => c.id === backlogRestoreVal)) {
        boardData.restoreBacklogColumnId = backlogRestoreVal;
    }
    saveData();
    renderBoard();
    popModal();
}

settingsClose.addEventListener('click', closeSettingsModal);
settingsCloseBtn.addEventListener('click', closeSettingsModal);

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
});

showArchiveToggle.addEventListener('change', () => {
    boardData.showArchive = showArchiveToggle.checked;
    saveData();
    renderBoard();
});

restoreSelect.addEventListener('change', () => {
    boardData.restoreColumnId = restoreSelect.value;
    saveData();
});

document.getElementById('show-backlog-toggle').addEventListener('change', () => {
    boardData.showBacklog = document.getElementById('show-backlog-toggle').checked;
    saveData();
    renderBoard();
});

document.getElementById('backlog-restore-select').addEventListener('change', () => {
    boardData.restoreBacklogColumnId = document.getElementById('backlog-restore-select').value;
    saveData();
});

addColumnBtn.addEventListener('click', () => {
    const col = { id: genId(), name: 'Новая колонка', isCompleted: false, canArchive: false, order: boardData.columns.length };
    boardData.columns.push(col);
    saveData();
    renderBoard();
    renderSettings();
    renderRestoreSelect();
    renderBacklogRestoreSelect();
    const cards = settingsList.querySelectorAll('.settings-column-card');
    if (cards.length > 0) {
        const last = cards[cards.length - 1];
        last.querySelector('.settings-col-name').focus();
        last.querySelector('.settings-col-name').select();
    }
});

function openArchiveModal() {
    renderArchiveModal();
    pushModal(archiveModal);
}

function closeArchiveModal() {
    popModal();
}

function renderArchiveModal() {
    const items = boardData.todos.filter(t => t.columnId === ARCHIVE);
    archiveList.innerHTML = '';
    const restoreColId = getRestoreColumnId();
    const restoreCol = boardData.columns.find(c => c.id === restoreColId);
    const restoreName = restoreCol ? restoreCol.name : 'колонку';

    items.forEach(todo => {
        const div = document.createElement('div');
        div.className = 'archive-card';
        div.innerHTML = `
            <span class="archive-card-text">${escapeHtml(todo.text)}</span>
            <div class="archive-card-actions">
                <button class="archive-card-btn restore" data-id="${todo.id}">Вернуть в «${escapeHtml(restoreName)}»</button>
                <button class="archive-card-btn delete" data-id="${todo.id}">Удалить</button>
            </div>
        `;
        archiveList.appendChild(div);
    });
}

archiveList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.archive-card-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.classList.contains('restore')) {
        const restoreColId = getRestoreColumnId();
        const todo = boardData.todos.find(t => t.id === id);
        if (todo) {
            todo.columnId = restoreColId;
            saveData();
            renderBoard();
            renderArchiveModal();
        }
    } else if (btn.classList.contains('delete')) {
        const confirmed = await showConfirmModal();
        if (confirmed) {
            boardData.todos = boardData.todos.filter(t => t.id !== id);
            saveData();
            renderBoard();
            renderArchiveModal();
        }
    }
});

board.addEventListener('click', (e) => {
    const archiveCol = e.target.closest('.column-archived');
    if (archiveCol) {
        openArchiveModal();
        return;
    }
    const backlogCol = e.target.closest('.column-backlog');
    if (backlogCol) {
        openBacklogModal();
        return;
    }
    const deleteBtn = e.target.closest('.delete-btn');
    if (!deleteBtn) return;
    const card = deleteBtn.closest('.card');
    if (!card) return;
    handleDelete(card.dataset.id);
});

async function handleDelete(id) {
    const confirmed = await showConfirmModal();
    if (confirmed) {
        boardData.todos = boardData.todos.filter(t => t.id !== id);
        saveData();
        renderBoard();
    }
}

archiveClose.addEventListener('click', closeArchiveModal);

archiveModal.addEventListener('click', (e) => {
    if (e.target === archiveModal) closeArchiveModal();
});

function openBacklogModal() {
    renderBacklogModal();
    pushModal(backlogModal);
}

function closeBacklogModal() {
    popModal();
}

function renderBacklogModal() {
    const items = boardData.todos.filter(t => t.columnId === BACKLOG);
    backlogList.innerHTML = '';
    const restoreColId = getBacklogRestoreColumnId();
    const restoreCol = boardData.columns.find(c => c.id === restoreColId);
    const restoreName = restoreCol ? restoreCol.name : 'колонку';

    items.forEach(todo => {
        const div = document.createElement('div');
        div.className = 'archive-card';
        div.innerHTML = `
            <span class="archive-card-text">${escapeHtml(todo.text)}</span>
            <div class="archive-card-actions">
                <button class="archive-card-btn restore" data-id="${todo.id}">Вернуть в «${escapeHtml(restoreName)}»</button>
                <button class="archive-card-btn delete" data-id="${todo.id}">Удалить</button>
            </div>
        `;
        backlogList.appendChild(div);
    });
}

backlogList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.archive-card-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.classList.contains('restore')) {
        const restoreColId = getBacklogRestoreColumnId();
        const todo = boardData.todos.find(t => t.id === id);
        if (todo) {
            todo.columnId = restoreColId;
            saveData();
            renderBoard();
            renderBacklogModal();
        }
    } else if (btn.classList.contains('delete')) {
        const confirmed = await showConfirmModal();
        if (confirmed) {
            boardData.todos = boardData.todos.filter(t => t.id !== id);
            saveData();
            renderBoard();
            renderBacklogModal();
        }
    }
});

backlogClose.addEventListener('click', closeBacklogModal);

backlogModal.addEventListener('click', (e) => {
    if (e.target === backlogModal) closeBacklogModal();
});

document.getElementById('backlog-add-btn').addEventListener('click', () => addBtn.click());

const SCROLL_THRESHOLD = 60;
const SCROLL_SPEED = 15;
let scrollInterval = null;

board.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const id = card.dataset.id;
    const todo = boardData.todos.find(t => t.id === id);
    if (!todo) return;
    dragData = { id, sourceColumnId: todo.columnId };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setTimeout(() => card.classList.add('dragging'), 0);
});

board.addEventListener('dragend', (e) => {
    const card = e.target.closest('.card');
    if (card) card.classList.remove('dragging');
    board.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
    dragData = null;
    stopAutoScroll();
});

board.addEventListener('dragover', (e) => {
    const column = e.target.closest('.column');
    if (!column || !dragData) return;
    const targetId = column.dataset.columnId;

    if (targetId === ARCHIVE) {
        const srcCol = boardData.columns.find(c => c.id === dragData.sourceColumnId);
        if (!srcCol || !srcCol.canArchive) return;
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    column.classList.add('drag-over');

    const rect = board.getBoundingClientRect();
    if (e.clientX < rect.left + SCROLL_THRESHOLD) {
        startAutoScroll(-1);
    } else if (e.clientX > rect.right - SCROLL_THRESHOLD) {
        startAutoScroll(1);
    } else {
        stopAutoScroll();
    }
});

board.addEventListener('dragleave', (e) => {
    const column = e.target.closest('.column');
    if (!column) return;
    if (!column.contains(e.relatedTarget)) {
        column.classList.remove('drag-over');
    }
});

board.addEventListener('drop', (e) => {
    const column = e.target.closest('.column');
    if (!column || !dragData) return;
    column.classList.remove('drag-over');
    stopAutoScroll();
    const targetId = column.dataset.columnId;

    if (targetId === ARCHIVE) {
        const srcCol = boardData.columns.find(c => c.id === dragData.sourceColumnId);
        if (!srcCol || !srcCol.canArchive) return;
    }

    const todo = boardData.todos.find(t => t.id === dragData.id);
    if (todo && todo.columnId !== targetId) {
        todo.columnId = targetId;
        saveData();
        renderBoard();
    }
});

function startAutoScroll(direction) {
    if (scrollInterval) return;
    scrollInterval = setInterval(() => {
        board.scrollLeft += direction * SCROLL_SPEED;
    }, 16);
}

function stopAutoScroll() {
    if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
    }
}

let touchDragData = null;
let touchClone = null;

board.addEventListener('touchstart', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    if (e.target.closest('.delete-btn')) return;

    const touch = e.touches[0];
    const id = card.dataset.id;
    const todo = boardData.todos.find(t => t.id === id);
    if (!todo) return;

    const rect = card.getBoundingClientRect();
    touchDragData = { id, sourceColumnId: todo.columnId, offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top };

    touchClone = card.cloneNode(true);
    touchClone.className = 'card drag-clone';
    touchClone.style.left = (touch.clientX - touchDragData.offsetX) + 'px';
    touchClone.style.top = (touch.clientY - touchDragData.offsetY) + 'px';
    document.body.appendChild(touchClone);

    card.classList.add('dragging');
    e.preventDefault();
}, { passive: false });

board.addEventListener('touchmove', (e) => {
    if (!touchDragData || !touchClone) return;
    const touch = e.touches[0];
    touchClone.style.left = (touch.clientX - touchDragData.offsetX) + 'px';
    touchClone.style.top = (touch.clientY - touchDragData.offsetY) + 'px';

    board.querySelectorAll('.column').forEach(col => {
        const rect = col.getBoundingClientRect();
        const isOver = touch.clientX >= rect.left && touch.clientX <= rect.right &&
                       touch.clientY >= rect.top && touch.clientY <= rect.bottom;
        if (isOver && col.dataset.columnId === ARCHIVE) {
            const srcCol = boardData.columns.find(c => c.id === touchDragData.sourceColumnId);
            col.classList.toggle('drag-over', srcCol && srcCol.canArchive);
        } else {
            col.classList.toggle('drag-over', isOver);
        }
    });

    if (touch.clientX < window.scrollX + SCROLL_THRESHOLD) {
        startAutoScroll(-1);
    } else if (touch.clientX > window.innerWidth - SCROLL_THRESHOLD) {
        startAutoScroll(1);
    } else {
        stopAutoScroll();
    }

    e.preventDefault();
}, { passive: false });

board.addEventListener('touchend', (e) => {
    if (!touchDragData || !touchClone) return;

    let targetColumn = null;
    const touch = e.changedTouches[0];
    board.querySelectorAll('.column').forEach(col => {
        const rect = col.getBoundingClientRect();
        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
            targetColumn = col;
        }
    });

    if (targetColumn) {
        const targetId = targetColumn.dataset.columnId;
        let canDrop = true;
        if (targetId === ARCHIVE) {
            const srcCol = boardData.columns.find(c => c.id === touchDragData.sourceColumnId);
            canDrop = srcCol && srcCol.canArchive;
        }
        if (canDrop) {
            const todo = boardData.todos.find(t => t.id === touchDragData.id);
            if (todo && todo.columnId !== targetId) {
                todo.columnId = targetId;
                saveData();
                renderBoard();
            }
        }
    }

    touchClone.remove();
    touchClone = null;
    board.querySelectorAll('.card.dragging').forEach(c => c.classList.remove('dragging'));
    board.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
    touchDragData = null;
    stopAutoScroll();
}, { passive: false });

loadData();
applyFullWidth();
renderBoard();
