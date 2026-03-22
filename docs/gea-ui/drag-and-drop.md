# Drag and Drop

`@geajs/ui` provides a drag-and-drop system built on native pointer events. It moves real DOM elements rather than cloning them, works across multiple containers, and animates drops with placeholder transitions.

## Quick Start

There are two ways to use drag and drop: **data attributes** (simpler) or **wrapper components** (more structured).

### Approach 1: Data Attributes

Add `data-draggable-id` to draggable elements and `data-droppable-id` to containers. The `dndManager` singleton auto-discovers them.

```tsx
import { Component } from '@geajs/core'
import { dndManager } from '@geajs/ui'

export default class Board extends Component {
  created() {
    dndManager.onDragEnd = (result) => {
      store.moveItem(
        result.draggableId,
        result.destination.droppableId,
        result.destination.index
      )
    }
  }

  dispose() {
    dndManager.onDragEnd = null
    super.dispose()
  }

  template() {
    return (
      <div class="board">
        <div class="column" data-droppable-id="todo">
          {todoItems.map(item => (
            <div key={item.id} class="card" data-draggable-id={item.id}>
              {item.title}
            </div>
          ))}
        </div>
        <div class="column" data-droppable-id="done">
          {doneItems.map(item => (
            <div key={item.id} class="card" data-draggable-id={item.id}>
              {item.title}
            </div>
          ))}
        </div>
      </div>
    )
  }
}
```

### Approach 2: Wrapper Components

Use `DragDropContext`, `Droppable`, and `Draggable` for a more declarative API.

```tsx
import { Component } from '@geajs/core'
import { DragDropContext, Droppable, Draggable } from '@geajs/ui'

export default class Board extends Component {
  handleDragEnd(result) {
    store.moveItem(
      result.draggableId,
      result.destination.droppableId,
      result.destination.index
    )
  }

  template() {
    return (
      <DragDropContext onDragEnd={(r) => this.handleDragEnd(r)}>
        <Droppable droppableId="todo">
          {items.map(item => (
            <Draggable key={item.id} draggableId={item.id}>
              <div class="card">{item.title}</div>
            </Draggable>
          ))}
        </Droppable>
      </DragDropContext>
    )
  }
}
```

## Exports

```ts
import { dndManager, DragDropContext, Droppable, Draggable } from '@geajs/ui'
import type { DragResult } from '@geajs/ui'
```

## DragResult

The `onDragEnd` callback receives a `DragResult` object:

```ts
interface DragResult {
  draggableId: string
  source: { droppableId: string; index: number }
  destination: { droppableId: string; index: number }
}
```

| Field | Description |
| --- | --- |
| `draggableId` | The `data-draggable-id` of the element that was dragged |
| `source.droppableId` | The container it came from |
| `source.index` | Its original index in that container |
| `destination.droppableId` | The container it was dropped into |
| `destination.index` | The index where it was inserted |

## dndManager API

The `dndManager` is a singleton that manages all drag-and-drop interactions.

| Property / Method | Type | Description |
| --- | --- | --- |
| `onDragEnd` | `(result: DragResult) => void` | Callback when a drag completes. Set to `null` to disable. |
| `isDragging` | `boolean` | `true` while a drag is in progress |
| `registerDroppable(id, el)` | `void` | Manually register a droppable container |
| `unregisterDroppable(id)` | `void` | Unregister a droppable container |
| `destroy()` | `void` | Remove all listeners and clear state |

In most cases you only need to set `onDragEnd` — droppable containers are auto-discovered from `data-droppable-id` attributes when a drag starts.

## Wrapper Components

### DragDropContext

Wraps the drag-and-drop area. Calls `dndManager.destroy()` on dispose.

| Prop | Type | Description |
| --- | --- | --- |
| `onDragEnd` | `(result: DragResult) => void` | Called when a drag completes |
| `class` | `string` | CSS class for the wrapper div |

### Droppable

Marks a container as a drop target. Registers with `dndManager` automatically.

| Prop | Type | Description |
| --- | --- | --- |
| `droppableId` | `string` | Unique identifier for this drop zone |
| `class` | `string` | CSS class for the wrapper div |

### Draggable

Wraps a draggable item. Handles pointer events and delegates to `dndManager`.

| Prop | Type | Description |
| --- | --- | --- |
| `draggableId` | `string` | Unique identifier for this draggable |
| `index` | `number` | Position index within its container |
| `class` | `string` | CSS class for the wrapper div |

## Behavior

- **Drag threshold**: A 5px movement is required before a drag starts, so clicks still work normally.
- **Escape to cancel**: Press Escape during a drag to return the element to its original position.
- **Animated placeholders**: When an element is dragged between containers, an animated placeholder shows where it will land.
- **DOM transfer**: On drop, the actual DOM element is moved to its new position. The `dndManager` also updates Gea's internal component tree to keep the framework in sync.
- **Store updates**: Use `Store.silent()` when reordering items in response to `onDragEnd` if the DOM has already been updated by the manager and you don't want the framework to re-patch the list.

## Styling the Placeholder

The placeholder element has the class `gea-dnd-placeholder`. Style it to match your design:

```css
.gea-dnd-placeholder {
  background: #e2e8f0;
  border-radius: 4px;
  border: 2px dashed #94a3b8;
}
```

## Full Example: Kanban Board

See the [Jira clone example](https://github.com/dashersw/gea/tree/main/examples/jira_clone) for a complete kanban board with drag-and-drop across columns. The key files are:

- `Board.tsx` — sets up `dndManager.onDragEnd` and renders columns
- `BoardColumn.tsx` — uses `data-droppable-id` on the issue list container
- `IssueCard.tsx` — uses `data-draggable-id` on each card
