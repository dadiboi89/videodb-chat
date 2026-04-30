<template>
  <div class="todo-advanced-container">
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>📋 Tasks</h2>
        <span class="badge">{{ stats.total }}</span>
      </div>

      <nav class="sidebar-nav">
        <button
          v-for="item in navItems"
          :key="item.id"
          @click="activeView = item.id"
          :class="['nav-item', { active: activeView === item.id }]"
        >
          <span class="icon">{{ item.icon }}</span>
          <span class="label">{{ item.label }}</span>
          <span v-if="item.count !== undefined" class="count">{{ item.count }}</span>
        </button>
      </nav>

      <div class="sidebar-section">
        <h3>Tags</h3>
        <div class="tags-list">
          <button
            v-for="tag in allTags"
            :key="tag"
            @click="selectedTag = selectedTag === tag ? null : tag"
            :class="['tag-item', { active: selectedTag === tag }]"
          >
            🏷️ {{ tag }}
          </button>
        </div>
      </div>

      <div class="sidebar-footer">
        <button @click="showStats = !showStats" class="btn-stats">
          📊 Statistics
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Header with Search -->
      <div class="header">
        <h1>{{ viewTitle }}</h1>
        <div class="header-controls">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 Search tasks..."
            class="search-input"
          />
          <button @click="toggleViewMode" class="btn-view-mode">
            {{ viewMode === 'list' ? '📊' : '📋' }}
          </button>
        </div>
      </div>

      <!-- Add Todo Form -->
      <div class="add-todo-form" v-if="activeView === 'all' || activeView === 'active'">
        <input
          v-model="newTodo"
          @keyup.enter="handleAddTodo"
          type="text"
          placeholder="What needs to be done?"
          class="input-field"
        />
        <select v-model="newPriority" class="select-priority">
          <option value="low">🟢 Low</option>
          <option value="medium">🟡 Medium</option>
          <option value="high">🔴 High</option>
        </select>
        <input
          v-model="newTag"
          @keyup.enter="handleAddTodo"
          type="text"
          placeholder="Add tag..."
          class="input-tag"
        />
        <button @click="handleAddTodo" class="btn-add-task">Add Task</button>
      </div>

      <!-- Stats Card (when showStats is true) -->
      <div v-if="showStats" class="stats-card">
        <div class="stat">
          <span class="stat-label">Total Tasks</span>
          <span class="stat-value">{{ stats.total }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Completed</span>
          <span class="stat-value">{{ stats.completed }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Active</span>
          <span class="stat-value">{{ stats.active }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Overdue</span>
          <span class="stat-value" :class="{ warning: stats.overdue > 0 }">
            {{ stats.overdue }}
          </span>
        </div>
        <div class="stat">
          <span class="stat-label">Upcoming</span>
          <span class="stat-value">{{ stats.upcoming }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: completionPercentage + '%' }"></div>
        </div>
        <span class="progress-text">{{ completionPercentage }}% Complete</span>
      </div>

      <!-- Filters -->
      <div v-if="activeView === 'all'" class="filter-buttons">
        <button
          v-for="filter in ['all', 'active', 'completed']"
          :key="filter"
          @click="todoFilter = filter"
          :class="['filter-btn', { active: todoFilter === filter }]"
        >
          {{ filter.charAt(0).toUpperCase() + filter.slice(1) }}
        </button>
      </div>

      <!-- Todo List / Grid -->
      <div :class="['todo-display', viewMode]">
        <transition-group name="todo" tag="div">
          <div
            v-for="todo in filteredTodos"
            :key="todo.id"
            :class="['todo-card', { completed: todo.completed, [todo.priority]: true }]"
          >
            <!-- Checkbox -->
            <input
              type="checkbox"
              v-model="todo.completed"
              @change="toggleTodo(todo.id)"
              class="checkbox"
            />

            <!-- Content -->
            <div class="todo-body" @click="selectTodo(todo)">
              <h3 class="todo-title">{{ todo.text }}</h3>
              <p v-if="todo.description" class="todo-desc">{{ todo.description }}</p>
              <div class="todo-meta">
                <span class="priority-badge" :class="todo.priority">
                  {{ todo.priority }}
                </span>
                <span v-if="todo.dueDate" class="due-date">
                  📅 {{ formatDate(todo.dueDate) }}
                </span>
                <span v-if="todo.dueDate && !todo.completed" class="time-remaining">
                  ⏱️ {{ getTimeRemaining(todo.dueDate) }}
                </span>
                <span v-for="tag in todo.tags" :key="tag" class="tag-badge">
                  {{ tag }}
                </span>
              </div>
            </div>

            <!-- Actions -->
            <div class="todo-actions">
              <button @click="deleteTodo(todo.id)" class="btn-action delete" title="Delete">
                🗑️
              </button>
            </div>
          </div>
        </transition-group>

        <!-- Empty State -->
        <div v-if="filteredTodos.length === 0" class="empty-state">
          <p class="empty-icon">📭</p>
          <p class="empty-text">No tasks here. Time to relax! 🎉</p>
        </div>
      </div>

      <!-- Detail Panel -->
      <div v-if="selectedTodoItem" class="detail-panel">
        <div class="panel-header">
          <h2>Task Details</h2>
          <button @click="selectedTodoItem = null" class="btn-close">✕</button>
        </div>
        <div class="panel-content">
          <div class="field">
            <label>Title</label>
            <input
              v-model="selectedTodoItem.text"
              @blur="updateTodo(selectedTodoItem.id, { text: selectedTodoItem.text })"
              type="text"
            />
          </div>
          <div class="field">
            <label>Description</label>
            <textarea
              v-model="selectedTodoItem.description"
              @blur="
                updateTodo(selectedTodoItem.id, {
                  description: selectedTodoItem.description,
                })
              "
              placeholder="Add notes..."
            ></textarea>
          </div>
          <div class="field">
            <label>Priority</label>
            <select
              v-model="selectedTodoItem.priority"
              @change="updateTodo(selectedTodoItem.id, { priority: selectedTodoItem.priority })"
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>
          </div>
          <div class="field">
            <label>Status</label>
            <select
              :value="selectedTodoItem.completed"
              @change="toggleTodo(selectedTodoItem.id)"
            >
              <option :value="false">⏳ Active</option>
              <option :value="true">✅ Completed</option>
            </select>
          </div>
          <div class="field">
            <label>Created</label>
            <span class="created-date">{{ formatDate(selectedTodoItem.createdAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Footer Controls -->
      <div class="footer-controls">
        <button
          v-if="stats.completed > 0"
          @click="clearCompleted"
          class="btn-footer clear"
        >
          🗑️ Clear Completed
        </button>
        <button @click="downloadTodos" class="btn-footer export">📥 Export</button>
        <button @click="clearAllTodos" class="btn-footer danger">⚠️ Clear All</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTodoStorage, type Todo } from '@/composables/useTodoStorage'

// Composable
const {
  todos,
  stats,
  completionPercentage,
  addTodo,
  updateTodo,
  deleteTodo,
  toggleTodo,
  clearCompleted,
  getTodosByStatus,
  getUpcomingTodos,
  getOverdueTodos,
  getAllTags,
  searchTodos,
  formatDate,
  getTimeRemaining,
  downloadTodos,
  loadTodos,
  clearAllTodos,
} = useTodoStorage()

// State
const activeView = ref('all')
const viewMode = ref<'list' | 'grid'>('list')
const searchQuery = ref('')
const todoFilter = ref('all')
const selectedTag = ref<string | null>(null)
const selectedTodoItem = ref<Todo | null>(null)
const newTodo = ref('')
const newPriority = ref<'low' | 'medium' | 'high'>('medium')
const newTag = ref('')
const showStats = ref(false)

// Navigation items
const navItems = computed(() => [
  { id: 'all', icon: '📋', label: 'All Tasks', count: stats.value.total },
  { id: 'active', icon: '⏳', label: 'Active', count: stats.value.active },
  { id: 'completed', icon: '✅', label: 'Completed', count: stats.value.completed },
  { id: 'overdue', icon: '⚠️', label: 'Overdue', count: stats.value.overdue },
  { id: 'upcoming', icon: '📅', label: 'Upcoming', count: stats.value.upcoming },
])

// All tags
const allTags = computed(() => getAllTags())

// View title
const viewTitle = computed(() => {
  const item = navItems.value.find(i => i.id === activeView.value)
  return item ? item.label : 'Tasks'
})

// Filtered todos
const filteredTodos = computed(() => {
  let filtered = todos.value

  // Apply view filter
  switch (activeView.value) {
    case 'active':
      filtered = getTodosByStatus(false)
      break
    case 'completed':
      filtered = getTodosByStatus(true)
      break
    case 'overdue':
      filtered = getOverdueTodos()
      break
    case 'upcoming':
      filtered = getUpcomingTodos()
      break
  }

  // Apply status filter (for 'all' view)
  if (activeView.value === 'all') {
    if (todoFilter.value === 'active') {
      filtered = filtered.filter(t => !t.completed)
    } else if (todoFilter.value === 'completed') {
      filtered = filtered.filter(t => t.completed)
    }
  }

  // Apply tag filter
  if (selectedTag.value) {
    filtered = filtered.filter(t => t.tags?.includes(selectedTag.value!) || false)
  }

  // Apply search filter
  if (searchQuery.value) {
    filtered = searchTodos(searchQuery.value)
  }

  return filtered.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    return b.createdAt - a.createdAt
  })
})

// Methods
const handleAddTodo = (): void => {
  if (newTodo.value.trim() === '') return

  const tags = newTag.value
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)

  addTodo(newTodo.value, newPriority.value, undefined, tags)

  newTodo.value = ''
  newTag.value = ''
  newPriority.value = 'medium'
}

const selectTodo = (todo: Todo): void => {
  selectedTodoItem.value = { ...todo }
}

const toggleViewMode = (): void => {
  viewMode.value = viewMode.value === 'list' ? 'grid' : 'list'
}

// Lifecycle
onMounted(() => {
  loadTodos()
})
</script>

<style scoped>
.todo-advanced-container {
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #333;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Sidebar */
.sidebar {
  width: 280px;
  background: white;
  padding: 20px;
  overflow-y: auto;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 20px;
  color: #667eea;
}

.badge {
  background: #667eea;
  color: white;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 30px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  transition: all 0.3s ease;
}

.nav-item:hover {
  background: #f5f5f5;
  border-color: #e0e0e0;
}

.nav-item.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.nav-item .icon {
  font-size: 16px;
}

.nav-item .label {
  flex: 1;
}

.nav-item .count {
  background: rgba(102, 126, 234, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.nav-item.active .count {
  background: rgba(255, 255, 255, 0.3);
  color: white;
}

.sidebar-section {
  margin-bottom: 20px;
}

.sidebar-section h3 {
  font-size: 12px;
  text-transform: uppercase;
  color: #999;
  margin: 0 0 10px 0;
  letter-spacing: 1px;
}

.tags-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tag-item {
  padding: 8px 12px;
  background: #f5f5f5;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  text-align: left;
  transition: all 0.3s ease;
}

.tag-item:hover {
  border-color: #667eea;
  background: #f0f3ff;
}

.tag-item.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.sidebar-footer {
  margin-top: auto;
}

.btn-stats {
  width: 100%;
  padding: 10px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
}

.btn-stats:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 30px;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  gap: 20px;
}

.header h1 {
  margin: 0;
  font-size: 28px;
  color: white;
}

.header-controls {
  display: flex;
  gap: 10px;
  flex: 1;
  max-width: 400px;
}

.search-input {
  flex: 1;
  padding: 12px 15px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: white;
  background: white;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
}

.btn-view-mode {
  padding: 10px 15px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
}

.btn-view-mode:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Add Todo Form */
.add-todo-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 15px;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.input-field,
.select-priority,
.input-tag {
  padding: 10px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 13px;
  transition: all 0.3s ease;
}

.input-field {
  flex: 2;
}

.select-priority {
  min-width: 100px;
}

.input-tag {
  flex: 1;
}

.input-field:focus,
.select-priority:focus,
.input-tag:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn-add-task {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.btn-add-task:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
}

/* Stats Card */
.stats-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 12px;
  color: #999;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #667eea;
}

.stat-value.warning {
  color: #ff6b6b;
}

.progress-bar {
  grid-column: 1 / -1;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transition: width 0.3s ease;
}

.progress-text {
  grid-column: 1 / -1;
  text-align: center;
  font-size: 12px;
  color: #999;
}

/* Filter Buttons */
.filter-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.filter-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.filter-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.filter-btn.active {
  background: white;
  color: #667eea;
  border-color: white;
}

/* Todo Display */
.todo-display {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 20px;
}

.todo-display.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.todo-display.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
}

.todo-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 15px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-left: 4px solid;
  transition: all 0.3s ease;
}

.todo-card.high {
  border-left-color: #ff6b6b;
}

.todo-card.medium {
  border-left-color: #ffd93d;
}

.todo-card.low {
  border-left-color: #6bcf7f;
}

.todo-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.todo-card.completed {
  opacity: 0.7;
}

.checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  margin-top: 2px;
  accent-color: #667eea;
  flex-shrink: 0;
}

.todo-body {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.todo-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.todo-card.completed .todo-title {
  text-decoration: line-through;
  color: #999;
}

.todo-desc {
  margin: 6px 0 0 0;
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

.todo-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.priority-badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  white-space: nowrap;
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

.due-date,
.time-remaining {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.tag-badge {
  padding: 3px 8px;
  background: #667eea;
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.todo-actions {
  display: flex;
  gap: 8px;
}

.btn-action {
  padding: 6px 10px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.btn-action.delete:hover {
  background: #ffebee;
  transform: scale(1.1);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin: 0;
}

.empty-text {
  margin: 15px 0 0 0;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
}

/* Detail Panel */
.detail-panel {
  position: fixed;
  right: 0;
  top: 0;
  width: 350px;
  height: 100vh;
  background: white;
  box-shadow: -4px 0 15px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  z-index: 100;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
}

.btn-close {
  padding: 6px 10px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 20px;
  color: #999;
  transition: all 0.3s ease;
}

.btn-close:hover {
  background: #f5f5f5;
  color: #333;
}

.panel-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.field {
  margin-bottom: 20px;
}

.field label {
  display: block;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  color: #999;
  margin-bottom: 8px;
}

.field input,
.field textarea,
.field select {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  transition: all 0.3s ease;
}

.field input:focus,
.field textarea:focus,
.field select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.field textarea {
  resize: vertical;
  min-height: 100px;
}

.created-date {
  display: block;
  font-size: 13px;
  color: #666;
}

/* Footer Controls */
.footer-controls {
  display: flex;
  gap: 10px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.btn-footer {
  flex: 1;
  padding: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 13px;
  transition: all 0.3s ease;
}

.btn-footer:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.btn-footer.danger {
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.btn-footer.danger:hover {
  background: rgba(255, 107, 107, 0.1);
}

/* Scrollbar */
.sidebar::-webkit-scrollbar,
.todo-display::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track,
.todo-display::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
}

.sidebar::-webkit-scrollbar-thumb,
.todo-display::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.sidebar::-webkit-scrollbar-thumb:hover,
.todo-display::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* Transitions */
.todo-enter-active,
.todo-leave-active {
  transition: all 0.3s ease;
}

.todo-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.todo-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* Responsive */
@media (max-width: 1024px) {
  .sidebar {
    width: 200px;
  }

  .detail-panel {
    width: 280px;
  }

  .todo-display.grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

@media (max-width: 768px) {
  .todo-advanced-container {
    flex-direction: column;
    height: auto;
  }

  .sidebar {
    width: 100%;
    order: 2;
  }

  .main-content {
    order: 1;
    padding: 15px;
  }

  .detail-panel {
    width: 100%;
    position: static;
    border-top: 1px solid #e0e0e0;
  }

  .header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-controls {
    max-width: 100%;
  }

  .add-todo-form {
    flex-wrap: wrap;
  }

  .todo-display.grid {
    grid-template-columns: 1fr;
  }
}
</style>
