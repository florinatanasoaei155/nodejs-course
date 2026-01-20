# Root Cause Analysis: Why DEMO 2/3/5 Show Incorrect Execution Order

## The Problem

**DEMO 1** (Correct):
```
Sync → Sync → nextTick → Promise → Promise → setTimeout
```

**DEMO 2/3/5** (Incorrect):
```
Sync → Sync → Promise → Promise → nextTick → nextTick
```

## The Root Cause: `await` Changes Microtask Processing Context

### Code Structure Comparison

**DEMO 1 (Works Correctly):**
```javascript
function demo1_basicOrder() {  // ← Regular function, NO await
  initTimer();

  Promise.resolve().then(() => log('Promise'));
  process.nextTick(() => log('nextTick'));

  // Output: nextTick → Promise ✅ CORRECT
}
```

**DEMO 2/3/5 (Show Wrong Order):**
```javascript
async function demo2_promiseChains() {
  await wait(150);  // ← THIS IS THE PROBLEM!
  initTimer();

  Promise.resolve().then(() => log('Promise'));
  process.nextTick(() => log('nextTick'));

  // Output: Promise → nextTick ❌ WRONG
}
```

## Why `await` Changes The Order

From the Node.js documentation:

> "in ES Modules, e.g. mjs files, the execution order will be different... This is because **the ES Module being loaded is wrapped as an asynchronous operation**"

The same wrapping effect happens when code runs **after an `await`** statement!

### What Happens Step-by-Step

#### Without `await` (DEMO 1 - Correct):

1. **Synchronous Phase:**
   ```javascript
   Promise.resolve().then(() => ...);  // → Queued to Microtask Queue
   process.nextTick(() => ...);         // → Queued to NextTick Queue
   ```

2. **Event Loop Processing:**
   ```
   Call Stack Empty
     ↓
   Process NextTick Queue FIRST ← nextTick runs
     ↓
   Process Microtask Queue       ← Promise runs
   ```

3. **Output:** `nextTick` → `Promise` ✅

#### With `await` (DEMO 2/3/5 - Wrong):

1. **Before await:**
   ```javascript
   async function demo() {
     await wait(150);  // ← Creates microtask boundary
     // Everything below runs in a .then() callback!
   ```

2. **After await (code transformed):**
   ```javascript
   // Conceptually becomes:
   wait(150).then(() => {
     // This entire block is now a Promise callback!
     Promise.resolve().then(() => ...);  // Nested microtask
     process.nextTick(() => ...);         // Called from within microtask
   });
   ```

3. **Event Loop Processing:**
   ```
   Microtask Queue: [The entire demo function continuation]
     ↓
   Execute continuation (which registers new microtasks)
     ↓
   Already in microtask context!
     ↓
   Promise callbacks registered during microtask execution
   run before nextTick queue is checked again
   ```

4. **Output:** `Promise` → `nextTick` ❌

## Experimental Verification

### Test 1: Regular Function (Correct)
```bash
$ node -e "
Promise.resolve().then(() => console.log('Promise'));
process.nextTick(() => console.log('nextTick'));
"

# Output:
nextTick  ✅
Promise
```

### Test 2: After `await` (Wrong)
```bash
$ node -e "
(async () => {
  await Promise.resolve();
  Promise.resolve().then(() => console.log('Promise'));
  process.nextTick(() => console.log('nextTick'));
})();
"

# Output:
Promise   ❌
nextTick
```

### Test 3: Async Function Without `await` (Correct)
```bash
$ node -e "
(async () => {
  // No await before these lines!
  Promise.resolve().then(() => console.log('Promise'));
  process.nextTick(() => console.log('nextTick'));
})();
"

# Output:
nextTick  ✅
Promise
```

## The Fix

**Option 1: Remove `await wait()` and use callbacks**
```javascript
function demo2_promiseChains() {  // Not async!
  separator('DEMO 2...');
  initTimer();

  Promise.resolve().then(() => log('Promise'));
  process.nextTick(() => log('nextTick'));
  // Now shows correct order! ✅
}

// Chain demos with setTimeout instead
setTimeout(() => demo2_promiseChains(), 150);
```

**Option 2: Keep async but don't await before the demo code**
```javascript
async function demo2_promiseChains() {
  separator('DEMO 2...');
  initTimer();

  // NO await before these lines!
  Promise.resolve().then(() => log('Promise'));
  process.nextTick(() => log('nextTick'));

  // Await can be used after, if needed
  await someOtherAsyncOperation();
}
```

## Why This Matters

This demonstrates a **critical difference** between:

1. **Top-level code** (or code in regular functions)
2. **Code after `await`** (microtask continuations)

When teaching Node.js event loop behavior, it's essential to show the **correct** execution order without the confounding effect of async wrapping.

## Reference: Node.js Documentation

From: https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/

> **What is process.nextTick()?**
>
> You may have noticed that process.nextTick() was not displayed in the diagram, even though it's a part of the asynchronous API. This is because process.nextTick() is not technically part of the event loop. Instead, the nextTickQueue will be processed after the current operation is completed, regardless of the current phase of the event loop.
>
> **Execution Order:**
> ```javascript
> Promise.resolve().then(() => console.log('promise1 resolved'));
> Promise.resolve().then(() => console.log('promise2 resolved'));
> Promise.resolve().then(() => {
>   console.log('promise3 resolved');
>   process.nextTick(() => console.log('next tick inside promise resolve handler'));
> });
> Promise.resolve().then(() => console.log('promise4 resolved'));
> Promise.resolve().then(() => console.log('promise5 resolved'));
> process.nextTick(() => console.log('next tick1'));
> process.nextTick(() => console.log('next tick2'));
> process.nextTick(() => console.log('next tick3'));
>
> // Output:
> next tick1
> next tick2
> next tick3
> promise1 resolved
> promise2 resolved
> promise3 resolved
> promise4 resolved
> promise5 resolved
> next tick inside promise resolve handler
> ```

Note: The nextTick inside the promise handler runs AFTER all other promises because it's registered **during** microtask execution, not before.

## Conclusion

The demos were **technically correct** in showing actual behavior, but **pedagogically misleading** because the `await wait(150)` synchronization mechanism changed the execution context in a way that reversed the expected priority order.

**The fix:** Remove `await wait()` and use `setTimeout()` or sequential function calls for demo synchronization.
