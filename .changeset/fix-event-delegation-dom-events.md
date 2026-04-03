---
"@geajs/vite-plugin": patch
---

Fix event delegation for mouseover, mouseout, mouseenter, mouseleave, contextmenu, pointer events, touch events, scroll, resize, keypress, and reset. These were missing from EVENT_TYPES so the compiler rendered them as plain HTML attributes instead of wiring event delegation. Also fix `toGeaEventType` to fully lowercase the `on`-prefix form (e.g. `onMouseOver` → `mouseover`) so it matches native DOM event names.
