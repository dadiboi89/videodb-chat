<template>
  <div class="todo-container">
    <!-- Header -->
    <div class="todo-header">
      <h2 class="todo-title">📝 My To-Do List</h2>
      <div class="todo-stats">
        <span class="stat">{{ completedCount }}/{{ todos.length }} Done</span>
        <button class="btn-clear" @click="clearCompleted" v-if="completedCount > 0">
          Clear Done
        </button>
      </div>
    </div>

    <!-- Input Section -->
    <div class="todo-input-section">
      <div class="input-wrapper">
        <input
          v-model="newTodo"
          @keyup.enter="addTodo"
          type="text"
          placeholder="Add a new task..."
          class="todo-input"
        />
        <select v-model="newPriority" class="priority-select">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button @click="addTodo" class="btn-add">
          <span class="icon">+</span> Add
        </button>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="filter-tabs">
      <button
        v-for="filter in filters"
        :key="filter"
        @click="activeFilter = filter"
        :class="['tab', { active: activeFilter === filter }]"
      >
        {{ filter.charAt(0).toUpperCase() + filter.slice(1) }}
      </button>
    </div>

    <!-- Todo List -->
    <div class="todo-list">
      <transition-group name="list" tag="div">
        <div
          v-for="todo in filteredTodos"
          :key="todo.id"
          :class="['todo-item', { completed: todo.completed, [todo.priority]: true }]"
        >
          <!-- Checkbox -->
          <input
            type="checkbox"
            v-model="todo.completed"
            @change="saveTodos"
            class="todo-checkbox"
          />

          <!-- Todo Content -->
          <div class="todo-content">
            <p class="todo-text">{{ todo.text }}</p>
            <span class="todo-date">{{ formatDate(todo.createdAt) }}</span>
          </div>

          <!-- Priority Badge -->
          <span :class="['priority-badge', todo.priority]">
            {{ todo.priority }}
          </span>

          <!-- Delete Button -->
          <button @click="deleteTodo(todo.id)" class="btn-delete">
            🗑️
          </button>
        </div>
      </transition-group>

      <!-- Empty State -->
      <div v-if="filteredTodos.length === 0" class="empty-state">
        <p class="empty-message">
          {{ activeFilter === 'all' ? '📭 No tasks yet!' : '✨ All tasks completed!' }}
        </p>
      </div>
    </div>

    <!-- Stats Footer -->
    <div class="todo-footer">
      <div class="footer-stats">
        <div class="stat-item">
          <span class="label">Total:</span>
          <span class="value">{{ todos.length }}</span>
        </div>
        <div class="stat-item">
          <span class="label">Completed:</span>
          <span class="value">{{ completedCount }}</span>
        </div>
        <div class="stat-item">
          <span class="label">Pending:</span>
          <span class="value">{{ todos.length - completedCount }}</span>
        </div>
      </div>
      <button @click="exportTodos" class="btn-export">📥 Export</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
}

// State
const todos = ref<Todo[]>([]);
const newTodo = ref('');
const newPriority = ref<'low' | 'medium' | 'high'>('medium');
const activeFilter = ref('all');
const filters = ['all', 'active', 'completed'];

// Local Storage Key
const STORAGE_KEY = 'videodb-todos';

// Computed
const filteredTodos = computed(() => {
  let filtered = todos.value;

  if (activeFilter.value === 'active') {
    filtered = filtered.filter(t => !t.completed);
  } else if (activeFilter.value === 'completed') {
    filtered = filtered.filter(t => t.completed);
  }

  return filtered.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.createdAt - a.createdAt;
  });
});

const completedCount = computed(() => todos.value.filter(t => t.completed).length);

// Methods
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const addTodo = (): void => {
  if (newTodo.value.trim() === '') return;

  const todo: Todo = {
    id: generateId(),
    text: newTodo.value.trim(),
    completed: false,
    priority: newPriority.value,
    createdAt: Date.now(),
  };

  todos.value.push(todo);
  newTodo.value = '';
  saveTodos();
};

const deleteTodo = (id: string): void => {
  todos.value = todos.value.filter(t => t.id !== id);
  saveTodos();
};

const clearCompleted = (): void => {
  if (confirm('Are you sure you want to delete all completed tasks?')) {
    todos.value = todos.value.filter(t => !t.completed);
    saveTodos();
  }
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const saveTodos = (): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos.value));
};

const loadTodos = (): void => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      todos.value = JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load todos:', error);
      todos.value = [];
    }
  }
};

const exportTodos = (): void => {
  const dataStr = JSON.stringify(todos.value, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `todos-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

// Lifecycle
onMounted(() => {
  loadTodos();
});
</script>

<style scoped>
.todo-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  color: #333;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Header */
.todo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.todo-title {
  font-size: 24px;
  font-weight: bold;
  margin: 0;
  color: white;
}

.todo-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
  font-size: 14px;
}

.btn-clear {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s ease;
}

.btn-clear:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

/* Input Section */
.todo-input-section {
  margin-bottom: 20px;
}

.input-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.todo-input {
  flex: 1;
  padding: 12px 15px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.9);
  transition: all 0.3s ease;
}

.todo-input:focus {
  outline: none;
  border-color: white;
  background: white;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
}

.priority-select {
  padding: 10px 8px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.priority-select:focus {
  outline: none;
  border-color: white;
}

.btn-add {
  padding: 10px 20px;
  background: white;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  color: #667eea;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}

.btn-add:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.icon {
  font-size: 18px;
}

/* Filter Tabs */
.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.1);
  padding: 8px;
  border-radius: 8px;
}

.tab {
  flex: 1;
  padding: 8px 12px;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-weight: 500;
  font-size: 13px;
  transition: all 0.3s ease;
}

.tab:hover {
  background: rgba(255, 255, 255, 0.1);
}

.tab.active {
  background: white;
  color: #667eea;
  border-color: white;
}

/* Todo List */
.todo-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  background: white;
  border-radius: 8px;
  margin-bottom: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border-left: 4px solid;
}

.todo-item.high {
  border-left-color: #ff6b6b;
}

.todo-item.medium {
  border-left-color: #ffd93d;
}

.todo-item.low {
  border-left-color: #6bcf7f;
}

.todo-item.completed {
  opacity: 0.6;
  background: rgba(255, 255, 255, 0.8);
}

.todo-item:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.todo-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #667eea;
}

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-text {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  word-break: break-word;
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
  color: #999;
}

.todo-date {
  display: block;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.priority-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  min-width: 50px;
  text-align: center;
}

.priority-badge.high {
  background: #ffebee;
  color: #ff6b6b;
}

.priority-badge.medium {
  background: #fffaeb;
  color: #ffd93d;
}

.priority-badge.low {
  background: #ebf5ee;
  color: #6bcf7f;
}

.btn-delete {
  padding: 6px 10px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
}

.btn-delete:hover {
  background: #ffebee;
  transform: scale(1.15);
}

/* Empty State */
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-message {
  margin: 0;
  font-size: 18px;
  color: white;
  font-weight: 500;
}

/* Footer */
.todo-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 15px;
  border-top: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
}

.footer-stats {
  display: flex;
  gap: 20px;
  font-size: 14px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.label {
  font-size: 12px;
  opacity: 0.8;
}

.value {
  font-size: 18px;
  font-weight: bold;
  margin-top: 4px;
}

.btn-export {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-export:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

/* Transitions */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* Scrollbar */
.todo-list::-webkit-scrollbar {
  width: 6px;
}

.todo-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.todo-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 10px;
}

.todo-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* Responsive */
@media (max-width: 480px) {
  .todo-container {
    padding: 15px;
    border-radius: 8px;
  }

  .todo-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .input-wrapper {
    flex-wrap: wrap;
  }

  .priority-select {
    width: 80px;
  }

  .btn-add {
    flex: 1;
    justify-content: center;
  }

  .footer-stats {
    gap: 10px;
    font-size: 12px;
  }

  .stat-item {
    align-items: center;
  }

  .value {
    font-size: 16px;
  }
}
</style>
