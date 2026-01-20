# Node.js Event Loop - Quick Reference Card

## Execution Priority (Highest to Lowest)

| Priority | Type | Badge | Color | Phase | Use When |
|----------|------|-------|-------|-------|----------|
| **P1** | Synchronous | `[SYNC]` | 🟢 GREEN | Call Stack | Immediate calculations, validations |
| **P2.1** | process.nextTick | `[NEXTtick]` | 🔵 BLUE | nextTick Queue | Event emission, cleanup |
| **P2** | Microtasks | `[MICROTSK]` | 🟣 MAGENTA | Microtask Queue | Promises, API calls |
| **P3** | Timers | `[TIMER]` | 🔴 RED | Timers Phase | Delays, scheduling |
| **P4** | setImmediate | `[IMMEDIAT]` | 🟡 YELLOW | Check Phase | After I/O, batch processing |
| **P5** | I/O Callbacks | `[I/O]` | 🔵 CYAN | Poll Phase | File system, network |

## Event Loop Diagram

```
   ┌───────────────────────────┐
┌─>│         timers            │ ← setTimeout(), setInterval()
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │   pending callbacks       │ ← I/O callbacks deferred
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     idle, prepare         │ ← Internal use
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │         poll              │ ← Retrieve new I/O events
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │         check             │ ← setImmediate() callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──│    close callbacks        │ ← socket.on('close')
   └───────────────────────────┘

MICROTASKS run between EACH phase:
  • process.nextTick() queue (highest priority)
  • Promise callbacks
  • queueMicrotask()
```

## Quick Decision Tree

```
Need to execute code?
│
├─ Runs immediately? ──────────────────────────> Use Synchronous Code (P1)
│
├─ After current operation completes?
│  ├─ Before anything else? ────────────────────> process.nextTick() (P2.1)
│  └─ Normal async flow? ───────────────────────> Promise/async-await (P2)
│
├─ After a delay?
│  ├─ Specific time delay? ────────────────────> setTimeout() (P3)
│  └─ Repeated intervals? ─────────────────────> setInterval() (P3)
│
├─ After I/O operations?
│  ├─ Inside I/O callback? ────────────────────> setImmediate() (P4)
│  └─ General I/O? ────────────────────────────> async/await (P2)
│
└─ File/Network operation? ───────────────────> fs.*, http.*, db.* (P5)
```

## Common Patterns & Examples

### 1. Sequential vs Parallel Async Operations

```javascript
// ❌ SLOW - Sequential (200ms total)
const user = await fetchUser();      // Wait 100ms
const posts = await fetchPosts();    // Wait 100ms

// ✅ FAST - Parallel (100ms total)
const [user, posts] = await Promise.all([
  fetchUser(),                       // Both run
  fetchPosts()                       // simultaneously
]);
```

### 2. Error Handling

```javascript
// With async/await
try {
  const result = await fetchData();
  processResult(result);
} catch (error) {
  console.error('Failed:', error);
}

// With Promises
fetchData()
  .then(result => processResult(result))
  .catch(error => console.error('Failed:', error));
```

### 3. Timeout Pattern

```javascript
// Race between fetch and timeout
const result = await Promise.race([
  fetchData(),
  new Promise((_, reject) =>
    setTimeout(() => reject('Timeout'), 5000)
  )
]);
```

### 4. Batch Processing

```javascript
// Break up long operations to avoid blocking
async function processBatch(items) {
  for (const item of items) {
    await processItem(item);

    // Yield to event loop every 100 items
    if (items.indexOf(item) % 100 === 0) {
      await new Promise(resolve => setImmediate(resolve));
    }
  }
}
```

### 5. Debouncing User Input

```javascript
let timeoutId;
function debounce(callback, delay) {
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), delay);
  };
}

// Usage
const debouncedSearch = debounce(searchAPI, 300);
input.addEventListener('input', debouncedSearch);
```

## Real-World Use Cases

### Synchronous Code (P1)
```javascript
// ✅ Good
const total = calculateSum(numbers);
if (!isValid(data)) return error;
const result = transform(input);

// ❌ Bad - blocks event loop
for (let i = 0; i < 1000000; i++) {
  heavyComputation(i);  // Use Worker Threads instead
}
```

### process.nextTick() (P2.1)
```javascript
// ✅ Good - emit events after construction
class MyEmitter extends EventEmitter {
  constructor() {
    super();
    process.nextTick(() => {
      this.emit('ready');  // Guaranteed to happen after listeners attached
    });
  }
}

// ❌ Bad - regular async (use Promise instead)
process.nextTick(async () => {
  await fetchData();  // Wrong tool for this
});
```

### Promises/Microtasks (P2)
```javascript
// ✅ Good - API calls
const users = await fetch('/api/users').then(r => r.json());

// ✅ Good - database queries
const user = await db.users.findOne({ id: userId });

// ✅ Good - parallel operations
const [profile, posts, friends] = await Promise.all([
  fetchProfile(id),
  fetchPosts(id),
  fetchFriends(id)
]);
```

### setTimeout (P3)
```javascript
// ✅ Good - delays
setTimeout(() => showNotification(), 3000);

// ✅ Good - debouncing
const debouncedSave = debounce(saveData, 500);

// ✅ Good - polling
setInterval(async () => {
  const status = await checkStatus();
  updateUI(status);
}, 5000);

// ❌ Bad - use for precision timing
// Delays are minimum, not exact
```

### setImmediate (P4)
```javascript
// ✅ Good - after I/O
fs.readFile('file.txt', (err, data) => {
  setImmediate(() => {
    // Guaranteed to run after this I/O completes
    processData(data);
  });
});

// ✅ Good - breaking up work
function processLargeArray(array) {
  const batch = array.splice(0, 100);
  processBatch(batch);

  if (array.length > 0) {
    setImmediate(() => processLargeArray(array));
  }
}
```

### I/O Operations (P5)
```javascript
// ✅ Good - with async/await
const content = await fs.promises.readFile('file.txt', 'utf8');

// ✅ Good - HTTP requests
const response = await fetch('https://api.example.com/data');

// ✅ Good - database operations
const users = await User.find({ active: true });
```

## Performance Optimization Cheat Sheet

### 1. Choose Parallel Over Sequential
```javascript
// Sequential: 300ms
const a = await task1();  // 100ms
const b = await task2();  // 100ms
const c = await task3();  // 100ms

// Parallel: 100ms
const [a, b, c] = await Promise.all([
  task1(),
  task2(),
  task3()
]);
```

### 2. Don't Block the Event Loop
```javascript
// ❌ Bad - blocks for 10ms
const result = heavySyncCalculation(data);

// ✅ Good - yields to event loop
const result = await new Promise(resolve => {
  setImmediate(() => {
    resolve(heavySyncCalculation(data));
  });
});

// ✅ Better - use Worker Threads for CPU-intensive
const { Worker } = require('worker_threads');
const worker = new Worker('./heavy-calc.js');
```

### 3. Avoid Microtask Starvation
```javascript
// ❌ Bad - infinite microtasks prevent macrotasks
function recursivePromise() {
  Promise.resolve().then(recursivePromise);
}

// ✅ Good - use setImmediate for recursion
function recursiveImmediate() {
  setImmediate(recursiveImmediate);
}
```

### 4. Batch API Calls
```javascript
// ❌ Bad - N requests
for (const id of userIds) {
  await fetchUser(id);  // 100 requests for 100 users
}

// ✅ Good - 1 request
const users = await fetchUsers(userIds);  // Bulk request
```

## Common Pitfalls

### Pitfall 1: setTimeout(fn, 0) is not immediate
```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');

// Output: 1, 4, 3, 2
// NOT: 1, 2, 3, 4
```

### Pitfall 2: process.nextTick can starve I/O
```javascript
// ❌ Bad - I/O never runs
function loop() {
  process.nextTick(loop);
}
loop();

// ✅ Good - I/O gets chances to run
function loop() {
  setImmediate(loop);
}
loop();
```

### Pitfall 3: Unhandled Promise Rejections
```javascript
// ❌ Bad - silently fails
fetch('/api/data').then(data => process(data));

// ✅ Good - handle errors
fetch('/api/data')
  .then(data => process(data))
  .catch(error => console.error('Failed:', error));

// ✅ Better - with async/await
try {
  const data = await fetch('/api/data');
  process(data);
} catch (error) {
  console.error('Failed:', error);
}
```

### Pitfall 4: Race Conditions
```javascript
// ❌ Bad - race condition
let counter = 0;
await Promise.all([
  async () => counter++,
  async () => counter++
]);
// counter might be 1 or 2!

// ✅ Good - sequential updates
for (const task of tasks) {
  await task();
  counter++;
}
```

## Testing Async Code

```javascript
// Using Jest
test('async function works', async () => {
  const result = await fetchData();
  expect(result).toBe('expected');
});

// Testing with timeout
test('should timeout', async () => {
  await expect(
    Promise.race([
      slowFunction(),
      new Promise((_, reject) =>
        setTimeout(() => reject('timeout'), 1000))
    ])
  ).rejects.toBe('timeout');
});

// Testing order
test('executes in correct order', async () => {
  const order = [];

  order.push('sync');

  process.nextTick(() => order.push('nextTick'));
  Promise.resolve().then(() => order.push('promise'));
  setTimeout(() => order.push('timeout'), 0);

  await new Promise(resolve => setTimeout(resolve, 10));

  expect(order).toEqual(['sync', 'nextTick', 'promise', 'timeout']);
});
```

## Debugging Tips

```javascript
// 1. Add timestamps to track execution
const start = Date.now();
await someOperation();
console.log(`Took ${Date.now() - start}ms`);

// 2. Use async_hooks to track async operations
const async_hooks = require('async_hooks');
async_hooks.createHook({
  init(asyncId, type, triggerAsyncId) {
    console.log(`New ${type} created`);
  }
}).enable();

// 3. Promise tracing
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason);
});

// 4. Event loop lag detection
const lag = require('event-loop-lag');
setInterval(() => {
  console.log('Event loop lag:', lag());
}, 1000);
```

## Resources

- **Node.js Docs**: https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/
- **JavaScript.info**: https://javascript.info/async
- **Event Loop Visualization**: http://latentflip.com/loupe/
- **Run the demos**: `node async-execution-demo.js`
- **Interactive demo**: Open `src/public/async-demo.html` in browser

---

**Remember**: Lower priority number = Executes first!
- P1 (Sync) → P2.1 (nextTick) → P2 (Microtasks) → P3 (Timers) → P4 (setImmediate) → P5 (I/O)
