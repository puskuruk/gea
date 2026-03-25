---
'@geajs/core': patch
'@geajs/vite-plugin': patch
---

Fix compiler merging of `createdHooks` — generated store setup is now prepended into user-defined `createdHooks` instead of emitting a duplicate method that silently overwrote user code. Generate null-safe `__onPropChange` handlers by substituting `this.props.<name>` with the incoming `value` parameter, adding optional chaining from early-return binding roots, and tracking `earlyReturnBarrierIndex` so setup statements after a guard don't execute before it. Remove the runtime try-catch around `__onPropChange` dispatch since the compiler now produces safe code paths.
