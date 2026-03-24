import { Component } from '@geajs/core'
import store from './todo-store'
import TodoInput from './TodoInput'
import TodoItem from './TodoItem'

export default class TodoApp extends Component {
  constructor(...args) {
    super(...args)
    this._todoInput = this.__child(TodoInput, this.__todoInputProps())
    this._todosItems = (store.todos ?? []).map(todo => this.__child(TodoItem, this.__todoItemProps(todo), todo.id))
  }

  template() {
    return `<div id="${this.id}" class="todo-app">
      <h2>Todos</h2>
      ${this._todoInput}
      <ul id="${this.id}-list" class="todo-list">
        ${this._todosItems.join('')}
      </ul>
      <p id="${this.id}-count" class="count">
        ${store.activeCount} active, ${store.completedCount} completed
      </p>
    </div>`
  }

  __todoInputProps() {
    return {
      draft: store.draft,
      onInput: (...args) => store.setDraft(...args),
      onAdd: () => store.add(),
    }
  }

  __todoItemProps(todo) {
    return {
      todo,
      onToggle: () => store.toggle(todo.id),
      onRemove: () => store.remove(todo.id),
    }
  }

  createdHooks() {
    this.__observeList(store, ['todos'], {
      items: this._todosItems,
      container: () => this.__el('list'),
      Ctor: TodoItem,
      props: todo => this.__todoItemProps(todo),
      key: todo => todo.id,
      onchange: () => this.__updateText('count', `${store.__store.activeCount} active, ${store.__store.completedCount} completed`),
    })
    this.__observe(store, ['draft'], () => {
      this._todoInput.__geaUpdateProps(this.__todoInputProps())
    })
  }
}
