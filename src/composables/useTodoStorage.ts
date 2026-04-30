import { ref, computed, reactive } from 'vue'

export interface Todo {
  id: string
  text: string
  description?: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  createdAt: number
  dueDate?: number
  tags?: string[]
}

export interface TodoStats {
  total: number
  completed: number
  active: number
  overdue: number
  upcoming: number
}

export function useTodoStorage(storageKey = 'videodb-todos') {
  const todos = ref<Todo[]>([])

  // Computed properties
  const stats = computed<TodoStats>(() => {
    const now = Date.now()
    const completed = todos.value.filter(t => t.completed).length
    const overdue = todos.value.filter(
      t => !t.completed && t.dueDate && t.dueDate < now
    ).length
    const upcoming = todos.value.filter(
      t => !t.completed && t.dueDate && t.dueDate > now
    ).length

    return {
      total: todos.value.length,
      completed,
      active: todos.value.length - completed,
      overdue,
      upcoming,
    }
  })

  const completionPercentage = computed(() => {
    if (stats.value.total === 0) return 0
    return Math.round((stats.value.completed / stats.value.total) * 100)
  })

  // Core Methods
  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  const addTodo = (
    text: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    dueDate?: number,
    tags: string[] = []
  ): Todo => {
    const todo: Todo = {
      id: generateId(),
      text: text.trim(),
      completed: false,
      priority,
      createdAt: Date.now(),
      dueDate,
      tags,
    }
    todos.value.push(todo)
    saveTodos()
    return todo
  }

  const updateTodo = (id: string, updates: Partial<Todo>): void => {
    const todo = todos.value.find(t => t.id === id)
    if (todo) {
      Object.assign(todo, updates)
      saveTodos()
    }
  }

  const deleteTodo = (id: string): void => {
    todos.value = todos.value.filter(t => t.id !== id)
    saveTodos()
  }

  const toggleTodo = (id: string): void => {
    const todo = todos.value.find(t => t.id === id)
    if (todo) {
      todo.completed = !todo.completed
      saveTodos()
    }
  }

  const clearCompleted = (): void => {
    todos.value = todos.value.filter(t => !t.completed)
    saveTodos()
  }

  // Filtering Methods
  const getTodosByStatus = (completed: boolean): Todo[] => {
    return todos.value.filter(t => t.completed === completed)
  }

  const getTodosByPriority = (priority: 'low' | 'medium' | 'high'): Todo[] => {
    return todos.value.filter(t => t.priority === priority)
  }

  const getTodosByTag = (tag: string): Todo[] => {
    return todos.value.filter(t => t.tags?.includes(tag) || false)
  }

  const getUpcomingTodos = (): Todo[] => {
    const now = Date.now()
    return todos.value
      .filter(t => !t.completed && t.dueDate && t.dueDate > now)
      .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0))
  }

  const getOverdueTodos = (): Todo[] => {
    const now = Date.now()
    return todos.value
      .filter(t => !t.completed && t.dueDate && t.dueDate < now)
      .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0))
  }

  const getDueTodayTodos = (): Todo[] => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return todos.value.filter(
      t =>
        !t.completed &&
        t.dueDate &&
        t.dueDate >= today.getTime() &&
        t.dueDate < tomorrow.getTime()
    )
  }

  const getAllTags = (): string[] => {
    const tagSet = new Set<string>()
    todos.value.forEach(t => {
      t.tags?.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }

  // Search
  const searchTodos = (query: string): Todo[] => {
    const lowerQuery = query.toLowerCase()
    return todos.value.filter(
      t =>
        t.text.toLowerCase().includes(lowerQuery) ||
        t.description?.toLowerCase().includes(lowerQuery) ||
        t.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }

  // Date Formatting
  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return ''

    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    })
  }

  const getTimeRemaining = (dueDate?: number): string => {
    if (!dueDate) return ''

    const now = Date.now()
    const diff = dueDate - now

    if (diff < 0) {
      const days = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24))
      return days === 0 ? 'Overdue today' : `Overdue by ${days}d`
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)

    if (days > 0) return `${days}d left`
    if (hours > 0) return `${hours}h left`
    return 'Due soon'
  }

  // Import/Export
  const exportTodos = (): string => {
    return JSON.stringify(todos.value, null, 2)
  }

  const importTodos = (jsonData: string): void => {
    try {
      const imported = JSON.parse(jsonData)
      if (Array.isArray(imported)) {
        todos.value = imported
        saveTodos()
      }
    } catch (error) {
      console.error('Failed to import todos:', error)
    }
  }

  const downloadTodos = (): void => {
    const dataStr = exportTodos()
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `todos-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // LocalStorage
  const saveTodos = (): void => {
    localStorage.setItem(storageKey, JSON.stringify(todos.value))
  }

  const loadTodos = (): void => {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        todos.value = JSON.parse(stored)
      } catch (error) {
        console.error('Failed to load todos:', error)
        todos.value = []
      }
    }
  }

  const clearAllTodos = (): void => {
    todos.value = []
    localStorage.removeItem(storageKey)
  }

  return {
    todos,
    stats,
    completionPercentage,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    clearCompleted,
    getTodosByStatus,
    getTodosByPriority,
    getTodosByTag,
    getUpcomingTodos,
    getOverdueTodos,
    getDueTodayTodos,
    getAllTags,
    searchTodos,
    formatDate,
    getTimeRemaining,
    exportTodos,
    importTodos,
    downloadTodos,
    saveTodos,
    loadTodos,
    clearAllTodos,
  }
}
