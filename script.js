const board = document.getElementById('board');
const modalOverlay = document.getElementById('modal-overlay');
const modalCancel = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');
const addBtn = document.getElementById('add-btn');
const addModal = document.getElementById('add-modal');
const addForm = document.getElementById('add-form');
const addInput = document.getElementById('add-input');
const addCancel = document.getElementById('add-cancel');
const archiveModal = document.getElementById('archive-modal');
const archiveList = document.getElementById('archive-list');
const archiveClose = document.getElementById('archive-close');

let todos = [];
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

function loadTodos() {
    const stored = localStorage.getItem('todos');
    if (stored) {
        const data = JSON.parse(stored);
        if (Array.isArray(data)) {
            todos = data;
            document.title = 'Kanban Board';
        } else {
            todos = data.todos || [];
            document.title = data.boardName || 'Kanban Board';
        }
        todos.forEach(t => {
            if (t.completed !== undefined) {
                t.status = t.completed ? 'done' : 'todo';
                delete t.completed;
            }
            if (!t.status) t.status = 'todo';
        });
    }
}

function saveTodos() {
    const data = { boardName: document.title, todos };
    localStorage.setItem('todos', JSON.stringify(data));
}

function showConfirmModal() {
    pushModal(modalOverlay);
    return new Promise((resolve) => {
        modalConfirm.onclick = () => { closeModal(); resolve(true); };
        modalCancel.onclick = () => { closeModal(); resolve(false); };
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) { closeModal(); resolve(false); }
        };
    });
}

function closeModal() {
    popModal();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderBoard() {
    const statuses = ['todo', 'in-progress', 'done'];
    statuses.forEach(status => {
        const list = document.getElementById(`list-${status}`);
        const countEl = document.getElementById(`count-${status}`);
        const items = todos.filter(t => t.status === status);
        countEl.textContent = items.length;

        list.innerHTML = '';
        items.forEach(todo => {
            const card = document.createElement('div');
            card.className = 'card';
            card.draggable = true;
            card.dataset.id = todo.id;

            card.innerHTML = `
                <span class="card-text">${escapeHtml(todo.text)}</span>
                <button class="delete-btn" title="Удалить">&times;</button>
            `;

            const deleteBtn = card.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleDelete(todo.id);
            });

            card.addEventListener('dragstart', (e) => onDragStart(e, todo.id));
            card.addEventListener('dragend', onDragEnd);

            list.appendChild(card);
        });
    });

    const archivedCount = todos.filter(t => t.status === 'archived').length;
    const archivedCountEl = document.querySelector('.column-archived .column-count');
    if (archivedCountEl) archivedCountEl.textContent = archivedCount;
}

function addTodo(text, status) {
    const todo = {
        id: Date.now() + Math.random(),
        text: text.trim(),
        status: status || 'todo',
    };
    todos.push(todo);
    saveTodos();
    renderBoard();
}

async function handleDelete(id) {
    pendingDeleteId = id;
    const confirmed = await showConfirmModal();
    if (confirmed) {
        todos = todos.filter(t => t.id !== id);
        saveTodos();
        renderBoard();
    }
    pendingDeleteId = null;
}

function moveTodo(id, newStatus) {
    const todo = todos.find(t => t.id === id);
    if (todo && todo.status !== newStatus) {
        todo.status = newStatus;
        saveTodos();
        renderBoard();
    }
}

addBtn.addEventListener('click', () => {
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
    const status = document.querySelector('input[name="col-status"]:checked').value;
    if (text) {
        addTodo(text, status);
        closeAddModal();
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
    const items = todos.filter(t => t.status === 'archived');
    archiveList.innerHTML = '';
    items.forEach(todo => {
        const div = document.createElement('div');
        div.className = 'archive-card';
        div.innerHTML = `
            <span class="archive-card-text">${escapeHtml(todo.text)}</span>
            <div class="archive-card-actions">
                <button class="archive-card-btn restore" data-id="${todo.id}">Вернуть</button>
                <button class="archive-card-btn delete" data-id="${todo.id}">Удалить</button>
            </div>
        `;
        archiveList.appendChild(div);
    });
}

archiveList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.archive-card-btn');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.classList.contains('restore')) {
        moveTodo(id, 'done');
        renderArchiveModal();
    } else if (btn.classList.contains('delete')) {
        const confirmed = await showConfirmModal();
        if (confirmed) {
            todos = todos.filter(t => t.id !== id);
            saveTodos();
            renderBoard();
            renderArchiveModal();
        }
    }
});

document.querySelector('.column-archived').addEventListener('click', (e) => {
    if (e.target.closest('.card')) return;
    openArchiveModal();
});

archiveClose.addEventListener('click', closeArchiveModal);

archiveModal.addEventListener('click', (e) => {
    if (e.target === archiveModal) closeArchiveModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalStack.length > 0) {
        const top = modalStack[modalStack.length - 1];
        if (top === modalOverlay) {
            modalConfirm.onclick = null;
            modalCancel.onclick = null;
            modalOverlay.onclick = null;
        }
        popModal();
    }
});

const SCROLL_THRESHOLD = 60;
const SCROLL_SPEED = 15;
let scrollInterval = null;

function onDragStart(e, id) {
    dragData = { id, sourceStatus: todos.find(t => t.id === id).status };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setTimeout(() => e.target.classList.add('dragging'), 0);
}

function onDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
    dragData = null;
    stopAutoScroll();
}

document.querySelectorAll('.column').forEach(column => {
    column.addEventListener('dragover', (e) => {
        if (!dragData) return;
        const newStatus = column.dataset.status;
        if (newStatus === 'archived' && dragData.sourceStatus !== 'done' && dragData.sourceStatus !== 'archived') return;

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

    column.addEventListener('dragleave', (e) => {
        if (!column.contains(e.relatedTarget)) {
            column.classList.remove('drag-over');
        }
    });

    column.addEventListener('drop', (e) => {
        e.preventDefault();
        column.classList.remove('drag-over');
        stopAutoScroll();
        const newStatus = column.dataset.status;
        if (newStatus === 'archived' && dragData.sourceStatus !== 'done' && dragData.sourceStatus !== 'archived') return;
        if (dragData && dragData.id) {
            moveTodo(dragData.id, newStatus);
        }
    });
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
let touchTargetList = null;

board.addEventListener('touchstart', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    if (e.target.closest('.delete-btn')) return;

    const touch = e.touches[0];
    const id = Number(card.dataset.id);
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    touchDragData = { id, status: todo.status, offsetX: touch.clientX - card.getBoundingClientRect().left, offsetY: touch.clientY - card.getBoundingClientRect().top };

    touchClone = card.cloneNode(true);
    touchClone.className = 'card drag-clone';
    touchClone.style.left = (touch.clientX - touchDragData.offsetX) + 'px';
    touchClone.style.top = (touch.clientY - touchDragData.offsetY) + 'px';
    document.body.appendChild(touchClone);

    card.classList.add('dragging');
    touchTargetList = card.parentElement;
    e.preventDefault();
}, { passive: false });

board.addEventListener('touchmove', (e) => {
    if (!touchDragData || !touchClone) return;
    const touch = e.touches[0];
    touchClone.style.left = (touch.clientX - touchDragData.offsetX) + 'px';
    touchClone.style.top = (touch.clientY - touchDragData.offsetY) + 'px';

    document.querySelectorAll('.column').forEach(col => {
        const rect = col.getBoundingClientRect();
        col.classList.toggle('drag-over',
            touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom
        );
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
    document.querySelectorAll('.column').forEach(col => {
        const rect = col.getBoundingClientRect();
        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
            targetColumn = col;
        }
    });

    if (targetColumn) {
        const newStatus = targetColumn.dataset.status;
        if (newStatus === 'archived' && touchDragData.status !== 'done' && touchDragData.status !== 'archived') {
            touchClone.remove();
            touchClone = null;
            document.querySelectorAll('.card.dragging').forEach(c => c.classList.remove('dragging'));
            document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
            touchDragData = null;
            touchTargetList = null;
            stopAutoScroll();
            return;
        }
        moveTodo(touchDragData.id, newStatus);
    }

    touchClone.remove();
    touchClone = null;
    document.querySelectorAll('.card.dragging').forEach(c => c.classList.remove('dragging'));
    document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
    touchDragData = null;
    touchTargetList = null;
    stopAutoScroll();
}, { passive: false });

loadTodos();
renderBoard();
