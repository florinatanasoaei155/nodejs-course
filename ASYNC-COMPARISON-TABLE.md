# Node.js Async Operations - Complete Comparison

## Side-by-Side Comparison

| Feature | Sync Code | process.nextTick() | Promise/Microtask | setTimeout | setImmediate | I/O Callbacks |
|---------|-----------|-------------------|-------------------|------------|--------------|---------------|
| **Priority** | P1 (Highest) | P2.1 | P2 | P3 | P4 | P5 |
| **Phase** | Call Stack | nextTick Queue | Microtask Queue | Timers | Check | Poll |
| **Blocking?** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| **Runs When** | Immediately | Before event loop | After sync, before macrotasks | Timer phase | Check phase | Poll phase |
| **Can Starve?** | Blocks everything | ⚠️ Can starve I/O | ⚠️ Can delay macrotasks | ❌ No | ❌ No | ❌ No |
| **Guaranteed Order** | Always first | Before all async | After nextTick | After microtasks | After timers/I/O | Variable |
| **Min Delay** | 0ms | ~0ms | ~0ms | Specified | ~1ms | Depends on I/O |
| **Use For** | Calculations | Event emission | API calls | Delays | After I/O | File/Network |
| **Browser Support** | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes (different) |

## Execution Timeline Example

Given this code:
```javascript
console.log('1. Sync start');

setTimeout(() => console.log('2. setTimeout 0'), 0);
setTimeout(() => console.log('3. setTimeout 10'), 10);

setImmediate(() => console.log('4. setImmediate'));

process.nextTick(() => console.log('5. nextTick 1'));
process.nextTick(() => console.log('6. nextTick 2'));

Promise.resolve().then(() => console.log('7. Promise 1'));
Promise.resolve().then(() => console.log('8. Promise 2'));

console.log('9. Sync end');
```

### Actual Execution Order:

```
Time  Priority  Type         Output
────  ────────  ──────────   ──────────────────
0ms   P1        SYNC         1. Sync start
0ms   P1        SYNC         9. Sync end
───── SYNC COMPLETE ─────────────────────────
1ms   P2.1      NEXTTICK     5. nextTick 1
1ms   P2.1      NEXTTICK     6. nextTick 2
───── NEXTTICK QUEUE EMPTY ──────────────────
1ms   P2        MICROTASK    7. Promise 1
1ms   P2        MICROTASK    8. Promise 2
───── MICROTASK QUEUE EMPTY ─────────────────
1ms   P4        IMMEDIATE    4. setImmediate
1ms   P3        TIMER        2. setTimeout 0
10ms  P3        TIMER        3. setTimeout 10
```

## When to Use Each - Decision Matrix

### Scenario: Need to execute code

| Requirement | Best Choice | Why |
|-------------|-------------|-----|
| Calculate total from array | **Sync Code** | Immediate, simple operation |
| Validate user input | **Sync Code** | Must complete before proceeding |
| Fetch data from API | **Promise** | Standard async, need result |
| Read file from disk | **I/O (async)** | Non-blocking file operation |
| Wait 5 seconds | **setTimeout** | Specific time delay needed |
| Debounce search | **setTimeout** | Cancel/restart timer capability |
| Emit event after construction | **nextTick** | Ensure listeners attached |
| Process after I/O completes | **setImmediate** | Designed for this use case |
| Chain multiple API calls | **async/await** | Clean, readable code |
| Parallel API calls | **Promise.all** | Maximum performance |
| Race conditions/timeout | **Promise.race** | First result wins |
| Heavy computation | **Worker Thread** | Don't block event loop |

## Performance Characteristics

### Throughput Comparison (Operations/Second)

```
Synchronous:     ████████████████████████████ 10,000,000/s
process.nextTick: ███████████████████ 5,000,000/s
Promise:         ██████████████████ 4,500,000/s
setImmediate:    █████████ 2,000,000/s
setTimeout:      ████████ 1,500,000/s
```

### Latency (Time to Execute)

```
Synchronous:      <1μs    ▮
process.nextTick: ~1μs    ▮▮
Promise:          ~2μs    ▮▮▮
setImmediate:     ~1ms    ▮▮▮▮▮▮▮
setTimeout(0):    ~1-4ms  ▮▮▮▮▮▮▮▮▮
I/O:              varies  ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮
```

## Common Patterns in Real Applications

### Pattern 1: Web Server Request Handling

```javascript
app.get('/user/:id', async (req, res) => {
  // P1 - Sync: Parse request
  const userId = parseInt(req.params.id);

  // P2 - Microtask: Database query (Promise)
  const user = await db.users.findById(userId);

  // P1 - Sync: Transform data
  const response = transformUser(user);

  // P1 - Sync: Send response
  res.json(response);
});
```

**Why this works:**
- Sync operations are fast (validation, transformation)
- Async only for I/O (database)
- Response sent synchronously after data ready

### Pattern 2: Batch Processing with Yielding

```javascript
async function processBatch(items) {
  for (let i = 0; i < items.length; i++) {
    // P1 - Sync: Process item
    processItem(items[i]);

    // Yield every 100 items to prevent blocking
    if (i % 100 === 0) {
      // P4 - setImmediate: Let event loop handle other work
      await new Promise(resolve => setImmediate(resolve));
    }
  }
}
```

**Why this works:**
- Processes items synchronously (fast)
- Yields periodically to event loop
- Server stays responsive during batch processing

### Pattern 3: Event Emitter Setup

```javascript
class DataLoader extends EventEmitter {
  constructor() {
    super();

    // P2.1 - nextTick: Ensure event listeners attached
    process.nextTick(() => {
      this.emit('initialized');
    });

    // P2 - Promise: Start loading
    this.loadData();
  }

  async loadData() {
    // P2 - Microtask: Fetch data
    const data = await fetch('/api/data');

    // P2.1 - nextTick: Emit before other async ops
    process.nextTick(() => {
      this.emit('loaded', data);
    });
  }
}
```

**Why this works:**
- nextTick ensures constructor completes first
- Listeners can be attached before events fire
- Promise for actual async work

### Pattern 4: Parallel + Sequential Combo

```javascript
async function loadUserDashboard(userId) {
  // P2 - Parallel: Independent requests
  const [user, settings] = await Promise.all([
    fetchUser(userId),
    fetchSettings(userId)
  ]);

  // P2 - Sequential: Depends on user data
  const [posts, friends] = await Promise.all([
    fetchPosts(user.id),      // Could be parallel
    fetchFriends(user.id)     // if independent
  ]);

  return { user, settings, posts, friends };
}
```

**Why this works:**
- First pair runs in parallel (independent)
- Second pair waits for user but runs parallel to each other
- Optimal performance with proper dependencies

### Pattern 5: Graceful Degradation with Timeout

```javascript
async function fetchWithTimeout(url, timeout = 5000) {
  return Promise.race([
    // P2 - Promise: Actual fetch
    fetch(url),

    // P3 - Timer: Timeout mechanism
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]);
}
```

**Why this works:**
- Race between fetch and timeout
- First to complete wins
- Prevents hanging requests

## Memory & Resource Considerations

| Operation Type | Memory Usage | Stack Depth | Can Overflow Stack? |
|----------------|--------------|-------------|---------------------|
| Synchronous | Low | Grows with recursion | ✅ Yes - watch recursion |
| process.nextTick | Low per call | Doesn't grow stack | ⚠️ Can exhaust queue |
| Promise | Medium (closure) | Doesn't grow stack | ❌ No |
| setTimeout | Medium (timer object) | Doesn't grow stack | ❌ No |
| setImmediate | Low | Doesn't grow stack | ❌ No |
| I/O Callbacks | Medium (buffer) | Doesn't grow stack | ❌ No |

## Error Handling Comparison

### Synchronous
```javascript
try {
  const result = dangerousOperation();
  return result;
} catch (error) {
  console.error('Sync error:', error);
}
```

### process.nextTick
```javascript
process.nextTick(() => {
  try {
    dangerousOperation();
  } catch (error) {
    console.error('nextTick error:', error);
  }
});
```

### Promise
```javascript
dangerousOperation()
  .then(result => handleResult(result))
  .catch(error => console.error('Promise error:', error));
```

### async/await
```javascript
try {
  const result = await dangerousOperation();
  return result;
} catch (error) {
  console.error('Async error:', error);
}
```

### setTimeout
```javascript
setTimeout(() => {
  try {
    dangerousOperation();
  } catch (error) {
    console.error('Timer error:', error);
  }
}, 1000);
```

## Browser vs Node.js Differences

| Feature | Node.js | Browser |
|---------|---------|---------|
| **process.nextTick()** | ✅ Available | ❌ Not available |
| **setImmediate()** | ✅ Available | ❌ Not available (except IE) |
| **queueMicrotask()** | ✅ Available | ✅ Available |
| **setTimeout minimum** | ~1ms | ~4ms (nested) |
| **Promise behavior** | Same | Same |
| **Event loop** | libuv based | Browser specific |
| **I/O operations** | fs, net, etc. | fetch, XHR |

## Best Practices Summary

### ✅ DO

1. **Use async/await for async operations** - Clean, readable code
2. **Use Promise.all() for parallel operations** - Maximum performance
3. **Use setTimeout for delays** - That's what it's for
4. **Use setImmediate in I/O callbacks** - Designed for this
5. **Handle all Promise rejections** - Prevent silent failures
6. **Break up long sync operations** - Don't block event loop
7. **Use try/catch with async/await** - Proper error handling

### ❌ DON'T

1. **Don't use nextTick for regular async** - Use Promises instead
2. **Don't recurse with nextTick** - Can starve I/O
3. **Don't block event loop** - Move heavy work to Worker Threads
4. **Don't ignore Promise errors** - Always .catch() or try/catch
5. **Don't rely on setTimeout(0) timing** - It's a minimum, not exact
6. **Don't mix callbacks and Promises** - Pick one style
7. **Don't forget to await** - Or your async code runs "detached"

## Measuring Event Loop Performance

```javascript
// Method 1: Simple lag measurement
const start = process.hrtime.bigint();
setImmediate(() => {
  const end = process.hrtime.bigint();
  const lag = Number(end - start) / 1_000_000; // Convert to ms
  console.log(`Event loop lag: ${lag}ms`);
});

// Method 2: Using performance hooks
const { PerformanceObserver, performance } = require('perf_hooks');

const obs = new PerformanceObserver((items) => {
  console.log(items.getEntries()[0].duration);
});
obs.observe({ entryTypes: ['measure'] });

performance.mark('start');
await doAsyncWork();
performance.mark('end');
performance.measure('work', 'start', 'end');

// Method 3: Track active handles
console.log('Active handles:', process._getActiveHandles().length);
console.log('Active requests:', process._getActiveRequests().length);
```

## Quick Reference Commands

```bash
# Run the visual demo
node async-execution-demo.js

# Test event loop behavior
node -e "console.log('sync'); setTimeout(() => console.log('timer'), 0); Promise.resolve().then(() => console.log('promise'))"

# Check for unhandled rejections
node --unhandled-rejections=strict app.js

# Enable async stack traces
node --async-stack-traces app.js

# Monitor event loop
node --inspect app.js
# Then open chrome://inspect
```

---

**Key Insight**: Understanding priorities is crucial for writing performant Node.js applications!

**Remember the order**:
- **Sync (P1)** → **nextTick (P2.1)** → **Microtasks (P2)** → **Timers (P3)** → **setImmediate (P4)** → **I/O (P5)**
