#!/usr/bin/env node

/**
 * Node.js Async Execution Order Demo - ENHANCED VERSION
 * This script demonstrates how setTimeout, Promises, and async/await work
 * and shows their execution order in the event loop
 *
 * Based on Node.js Event Loop Phases:
 * https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
};

// Operation type definitions with priorities
const OP_TYPES = {
  SYNC: {
    name: 'SYNC CODE',
    badge: '  SYNC  ',
    color: colors.green,
    priority: 1,
    phase: 'Call Stack',
  },
  MICROTASK: {
    name: 'MICROTASK',
    badge: 'MICROTSK',
    color: colors.magenta,
    priority: 2,
    phase: 'Microtask Queue',
  },
  NEXTTICK: {
    name: 'NEXT TICK',
    badge: 'NEXTtick',
    color: colors.blue,
    priority: 2.1, // Actually runs before other microtasks
    phase: 'process.nextTick Queue',
  },
  TIMER: {
    name: 'TIMER',
    badge: ' TIMER ',
    color: colors.red,
    priority: 3,
    phase: 'Timers Phase',
  },
  IMMEDIATE: {
    name: 'IMMEDIATE',
    badge: 'IMMEDIAT',
    color: colors.yellow,
    priority: 4,
    phase: 'Check Phase',
  },
  IO: {
    name: 'I/O',
    badge: '  I/O  ',
    color: colors.cyan,
    priority: 5,
    phase: 'Poll Phase',
  },
};

let startTime;
let counter = 0;

function initTimer() {
  startTime = Date.now();
  counter = 0;
}

function getTimestamp() {
  return `${(Date.now() - startTime).toString().padStart(4, '0')}ms`;
}

/**
 * Enhanced logging function with operation type badge
 * @param {string} message - Log message
 * @param {object} opType - Operation type from OP_TYPES
 * @param {string} details - Additional details about the operation
 */
function log(message, opType = OP_TYPES.SYNC, details = '') {
  counter++;
  const timestamp = `${colors.dim}[${getTimestamp()}]${colors.reset}`;
  const badge = `${opType.color}${colors.bright}[${opType.badge}]${colors.reset}`;
  const priority = `${colors.dim}P${opType.priority}${colors.reset}`;
  const detailsStr = details ? `${colors.dim}(${details})${colors.reset}` : '';

  console.log(
    `${timestamp} ${badge} ${priority} ${opType.color}${counter}. ${message}${colors.reset} ${detailsStr}`,
  );
}

function separator(title) {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// DEMO 1: Basic Execution Order - Understanding Priorities
// ============================================================================
function demo1_basicOrder() {
  separator('DEMO 1: Basic Execution Order - Understanding Priorities');
  initTimer();

  log('Synchronous code starts', OP_TYPES.SYNC, 'Executes immediately');

  setTimeout(() => {
    log(
      'setTimeout with 0ms executed',
      OP_TYPES.TIMER,
      'Queued to Timers phase',
    );
  }, 0);

  setTimeout(() => {
    log('setTimeout with 10ms executed', OP_TYPES.TIMER, 'Delayed by 10ms');
  }, 10);

  Promise.resolve().then(() => {
    log(
      'Promise.then() executed',
      OP_TYPES.MICROTASK,
      'Queued to Microtask queue',
    );
  });

  Promise.resolve().then(() => {
    log(
      'Another Promise.then() executed',
      OP_TYPES.MICROTASK,
      'Second microtask',
    );
  });

  process.nextTick(() => {
    log(
      'process.nextTick() executed',
      OP_TYPES.NEXTTICK,
      'Runs before other microtasks',
    );
  });

  log('Synchronous code ends', OP_TYPES.SYNC, 'Still in call stack');

  console.log(
    `\n${colors.yellow}Expected order: Sync → Sync → nextTick → Promise → Promise → setTimeout 0ms → setTimeout 10ms${colors.reset}`,
  );
  console.log(
    `${colors.dim}Priority: P1 (Sync) → P2.1 (nextTick) → P2 (Microtask) → P3 (Timer)${colors.reset}\n`,
  );
}

// ============================================================================
// DEMO 2: Promise Chains & process.nextTick - Understanding Queue Timing
// ============================================================================
async function demo2_promiseChains() {
  await wait(150); // Wait for demo 1 to complete
  separator('DEMO 2: Promise Chains & process.nextTick - Understanding Queue Timing');
  initTimer();

  log('Starting demo', OP_TYPES.SYNC, 'Synchronous setup');

  // This Promise.resolve() immediately queues the first .then() during sync execution
  Promise.resolve('Step 1')
    .then((result) => {
      log(
        `Promise resolved: ${result}`,
        OP_TYPES.MICROTASK,
        'Queued during sync phase',
      );
      return 'Step 2';
    })
    .then((result) => {
      log(
        `Promise resolved: ${result}`,
        OP_TYPES.MICROTASK,
        'Queued by previous .then()',
      );
      return 'Step 3';
    })
    .then((result) => {
      log(`Promise resolved: ${result}`, OP_TYPES.MICROTASK, 'Final in chain');
    });

  // These are queued AFTER the first Promise .then() was already queued
  process.nextTick(() => {
    log(
      'nextTick callback #1',
      OP_TYPES.NEXTTICK,
      'Queued after Promise started',
    );
  });

  queueMicrotask(() => {
    log(
      'queueMicrotask callback',
      OP_TYPES.MICROTASK,
      'Same queue as Promise.then()',
    );
  });

  process.nextTick(() => {
    log('nextTick callback #2', OP_TYPES.NEXTTICK, 'Second nextTick');
  });

  log('Sync code ends', OP_TYPES.SYNC, 'All operations queued');

  setTimeout(() => {
    log(
      'setTimeout runs last',
      OP_TYPES.TIMER,
      'After all microtasks complete',
    );
  }, 0);

  console.log(
    `\n${colors.yellow}What happened?${colors.reset}`,
  );
  console.log(
    `${colors.dim}1. Promise.resolve() IMMEDIATELY queues first .then() during sync code${colors.reset}`,
  );
  console.log(
    `${colors.dim}2. Then nextTick and queueMicrotask are called${colors.reset}`,
  );
  console.log(
    `${colors.dim}3. But nextTick queue is processed BEFORE microtask queue? No!${colors.reset}`,
  );
  console.log(
    `${colors.dim}4. Actually: First .then() was queued first, so it runs first${colors.reset}`,
  );
  console.log(
    `${colors.dim}5. The order depends on WHEN each operation was queued, not just priority!${colors.reset}\n`,
  );
}

// ============================================================================
// DEMO 3: nextTick TRUE Priority - Proving It Runs First
// ============================================================================
async function demo3_nextTickPriority() {
  await wait(150);
  separator('DEMO 3: nextTick TRUE Priority - Proving It Runs First');
  initTimer();

  log('Starting priority test', OP_TYPES.SYNC, 'Registering in specific order');

  // Register nextTick AFTER Promise to prove priority
  Promise.resolve().then(() => {
    log('Promise #1', OP_TYPES.MICROTASK, 'Registered first');
  });

  queueMicrotask(() => {
    log('queueMicrotask', OP_TYPES.MICROTASK, 'Registered second');
  });

  // Register nextTick LAST but it should run FIRST
  process.nextTick(() => {
    log('nextTick', OP_TYPES.NEXTTICK, 'Registered last but runs FIRST!');
  });

  Promise.resolve().then(() => {
    log('Promise #2', OP_TYPES.MICROTASK, 'Registered fourth');
  });

  log('Sync ends', OP_TYPES.SYNC, 'Now microtasks will run');

  console.log(
    `\n${colors.yellow}Expected: nextTick → Promise #1 → queueMicrotask → Promise #2${colors.reset}`,
  );
  console.log(
    `${colors.dim}This proves: nextTick queue is drained BEFORE microtask queue${colors.reset}\n`,
  );
}

// ============================================================================
// DEMO 4: Async/Await - Understanding the Transformation
// ============================================================================
async function demo4_asyncAwait() {
  await wait(150);
  separator('DEMO 3: Async/Await - Understanding the Transformation');
  initTimer();

  log('Before async function call', OP_TYPES.SYNC, 'Main thread execution');

  async function asyncExample() {
    log('Async function starts', OP_TYPES.SYNC, 'Before await = synchronous');

    await Promise.resolve();
    log('After first await', OP_TYPES.MICROTASK, 'await transforms to .then()');

    await wait(50);
    log('After await with 50ms delay', OP_TYPES.TIMER, 'Delayed continuation');

    const result = await Promise.resolve('Async result');
    log(
      `Received: ${result}`,
      OP_TYPES.MICROTASK,
      'Another microtask continuation',
    );

    return 'Done';
  }

  const promise = asyncExample();

  log(
    'After async function call',
    OP_TYPES.SYNC,
    'Async function returns immediately',
  );

  Promise.resolve().then(() => {
    log(
      'Regular Promise.then',
      OP_TYPES.MICROTASK,
      'Queued alongside await continuations',
    );
  });

  await promise;
  log('Async function completed', OP_TYPES.MICROTASK, 'Awaiting result');

  console.log(
    `\n${colors.dim}Key Insight: async/await is syntactic sugar for Promises${colors.reset}`,
  );
  console.log(
    `${colors.dim}Each 'await' creates a microtask for the continuation code${colors.reset}\n`,
  );
}

// ============================================================================
// DEMO 5: setImmediate vs setTimeout vs process.nextTick
// ============================================================================
async function demo5_setImmediateComparison() {
  await wait(200);
  separator('DEMO 5: setImmediate vs setTimeout vs process.nextTick');
  initTimer();

  log('Synchronous start', OP_TYPES.SYNC, 'Call stack execution');

  setTimeout(() => {
    log('setTimeout 0ms', OP_TYPES.TIMER, 'Timers phase - macrotask');
  }, 0);

  setImmediate(() => {
    log(
      'setImmediate',
      OP_TYPES.IMMEDIATE,
      'Check phase - after I/O callbacks',
    );
  });

  process.nextTick(() => {
    log('process.nextTick', OP_TYPES.NEXTTICK, 'Highest priority microtask');
  });

  Promise.resolve().then(() => {
    log('Promise.then', OP_TYPES.MICROTASK, 'Standard microtask');
  });

  log('Synchronous end', OP_TYPES.SYNC, 'Call stack complete');

  console.log(
    `\n${colors.yellow}Expected order: Sync → nextTick → Promise → setTimeout/setImmediate${colors.reset}`,
  );
  console.log(
    `${colors.dim}Note: setTimeout vs setImmediate order can vary depending on context${colors.reset}\n`,
  );
}

// ============================================================================
// DEMO 6: Mixed - Everything Together
// ============================================================================
async function demo6_mixed() {
  await wait(200);
  separator('DEMO 6: Mixed - Everything Together');
  initTimer();

  log('1. Synchronous start', OP_TYPES.SYNC, 'Main execution begins');

  // Macrotask - setTimeout
  setTimeout(() => {
    log(
      'setTimeout 0ms executed',
      OP_TYPES.TIMER,
      'Macrotask from Timers phase',
    );

    Promise.resolve().then(() => {
      log(
        'Promise inside setTimeout',
        OP_TYPES.MICROTASK,
        'Microtasks run after each macrotask',
      );
    });
  }, 0);

  setTimeout(() => {
    log('setTimeout 30ms executed', OP_TYPES.TIMER, 'Delayed timer');
  }, 30);

  setImmediate(() => {
    log('setImmediate executed', OP_TYPES.IMMEDIATE, 'Check phase execution');
  });

  // Microtask - Promise
  Promise.resolve().then(() => {
    log('Promise.then #1', OP_TYPES.MICROTASK, 'First Promise microtask');

    setTimeout(() => {
      log(
        'setTimeout inside Promise',
        OP_TYPES.TIMER,
        'New macrotask queued from microtask',
      );
    }, 0);
  });

  // Async function
  async function complexAsync() {
    log('2. Async function start', OP_TYPES.SYNC, 'Synchronous entry');

    await Promise.resolve();
    log('After await', OP_TYPES.MICROTASK, 'Continuation as microtask');

    setTimeout(() => {
      log('setTimeout in async', OP_TYPES.TIMER, 'Timer scheduled from async');
    }, 0);

    await wait(20);
    log('After 20ms delay', OP_TYPES.TIMER, 'Timer-based continuation');
  }

  complexAsync();

  // More microtasks
  process.nextTick(() => {
    log('process.nextTick', OP_TYPES.NEXTTICK, 'Runs first among async ops');
  });

  Promise.resolve().then(() => {
    log('Promise.then #2', OP_TYPES.MICROTASK, 'Second Promise microtask');
  });

  queueMicrotask(() => {
    log('queueMicrotask', OP_TYPES.MICROTASK, 'Explicit microtask queuing');
  });

  log('3. Synchronous end', OP_TYPES.SYNC, 'Main execution complete');

  console.log(
    `\n${colors.yellow}Watch the priority order: Sync → nextTick → Microtasks → Timers → setImmediate${colors.reset}\n`,
  );
}

// ============================================================================
// DEMO 7: I/O Operations & File System
// ============================================================================
async function demo7_ioOperations() {
  await wait(200);
  separator('DEMO 7: I/O Operations & Event Loop Phases');
  initTimer();

  const fs = require('fs');

  log('Starting I/O demonstration', OP_TYPES.SYNC, 'Synchronous setup');

  // File system operation (I/O)
  fs.readFile(__filename, () => {
    log('fs.readFile callback', OP_TYPES.IO, 'I/O callback from Poll phase');

    process.nextTick(() => {
      log(
        'nextTick inside I/O callback',
        OP_TYPES.NEXTTICK,
        'Microtask after I/O',
      );
    });

    setImmediate(() => {
      log(
        'setImmediate after I/O',
        OP_TYPES.IMMEDIATE,
        'Check phase - guaranteed after I/O',
      );
    });
  });

  setTimeout(() => {
    log('setTimeout after I/O setup', OP_TYPES.TIMER, 'Timer phase');
  }, 0);

  setImmediate(() => {
    log(
      'setImmediate from main',
      OP_TYPES.IMMEDIATE,
      'May run before setTimeout',
    );
  });

  process.nextTick(() => {
    log(
      'nextTick from main',
      OP_TYPES.NEXTTICK,
      'Runs before event loop phases',
    );
  });

  log('I/O operations queued', OP_TYPES.SYNC, 'Main code complete');

  console.log(
    `\n${colors.dim}Note: I/O callbacks run in the Poll phase, between Timers and Check phases${colors.reset}\n`,
  );
}

// ============================================================================
// DEMO 8: Real-world Example - API Simulation with All Patterns
// ============================================================================
async function demo8_realWorld() {
  await wait(300);
  separator('DEMO 8: Real-world API Patterns - Sequential vs Parallel');
  initTimer();

  log('Starting API request simulation', OP_TYPES.SYNC, 'Application startup');

  // Simulate fetching user data
  async function fetchUser(userId) {
    log(`Fetching user ${userId}...`, OP_TYPES.SYNC, 'API call initiated');

    await wait(30); // Simulate network delay

    log(`User ${userId} fetched`, OP_TYPES.TIMER, 'Network response received');
    return { id: userId, name: `User ${userId}` };
  }

  // Simulate fetching user posts
  async function fetchPosts(userId) {
    log(
      `Fetching posts for user ${userId}...`,
      OP_TYPES.SYNC,
      'Database query',
    );

    await wait(40); // Simulate network delay

    log(`Posts for user ${userId} fetched`, OP_TYPES.TIMER, 'Query completed');
    return [
      { id: 1, title: 'Post 1' },
      { id: 2, title: 'Post 2' },
    ];
  }

  // Sequential execution (SLOW - 70ms total)
  log('PATTERN 1: Sequential API calls', OP_TYPES.SYNC, 'One after another');
  const seqStart = Date.now();
  const user1 = await fetchUser(1);
  const posts1 = await fetchPosts(user1.id);
  log(
    `Got ${posts1.length} posts for ${user1.name}`,
    OP_TYPES.MICROTASK,
    `Took ${Date.now() - seqStart}ms`,
  );

  // Parallel execution (FAST - 40ms total)
  log('\nPATTERN 2: Parallel API calls', OP_TYPES.SYNC, 'All at once');
  const parStart = Date.now();
  const [user2, user3] = await Promise.all([fetchUser(2), fetchUser(3)]);
  log(
    `Got users: ${user2.name} and ${user3.name}`,
    OP_TYPES.MICROTASK,
    `Took ${Date.now() - parStart}ms`,
  );

  // Race pattern (returns first result)
  log('\nPATTERN 3: Promise.race (first wins)', OP_TYPES.SYNC, 'Competition');
  const winner = await Promise.race([
    fetchUser(4),
    wait(100).then(() => ({ id: 0, name: 'Timeout' })),
  ]);
  log(`Winner: ${winner.name}`, OP_TYPES.MICROTASK, 'Fastest response');

  console.log(`\n${colors.yellow}Use Cases:${colors.reset}`);
  console.log(
    `  ${colors.green}Sequential${colors.reset}: When next request depends on previous result`,
  );
  console.log(
    `  ${colors.green}Parallel${colors.reset}: When requests are independent - much faster!`,
  );
  console.log(
    `  ${colors.green}Race${colors.reset}: Timeout handling, fastest mirror, redundancy\n`,
  );
}

// ============================================================================
// Main execution
// ============================================================================
async function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║   Node.js Event Loop - Complete Visual Demonstration       ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  printEventLoopDiagram();

  console.log(
    `${colors.bright}${colors.yellow}Operation Types & Badges:${colors.reset}`,
  );
  console.log(
    `  ${OP_TYPES.SYNC.color}${colors.bright}[${OP_TYPES.SYNC.badge}]${colors.reset} P${OP_TYPES.SYNC.priority} - Synchronous code (Call Stack)`,
  );
  console.log(
    `  ${OP_TYPES.NEXTTICK.color}${colors.bright}[${OP_TYPES.NEXTTICK.badge}]${colors.reset} P${OP_TYPES.NEXTTICK.priority} - process.nextTick() - Highest priority async`,
  );
  console.log(
    `  ${OP_TYPES.MICROTASK.color}${colors.bright}[${OP_TYPES.MICROTASK.badge}]${colors.reset} P${OP_TYPES.MICROTASK.priority} - Microtasks (Promises, queueMicrotask)`,
  );
  console.log(
    `  ${OP_TYPES.TIMER.color}${colors.bright}[${OP_TYPES.TIMER.badge}]${colors.reset} P${OP_TYPES.TIMER.priority} - Timers (setTimeout, setInterval)`,
  );
  console.log(
    `  ${OP_TYPES.IMMEDIATE.color}${colors.bright}[${OP_TYPES.IMMEDIATE.badge}]${colors.reset} P${OP_TYPES.IMMEDIATE.priority} - setImmediate (Check phase)`,
  );
  console.log(
    `  ${OP_TYPES.IO.color}${colors.bright}[${OP_TYPES.IO.badge}]${colors.reset} P${OP_TYPES.IO.priority} - I/O callbacks (Poll phase)\n`,
  );

  demo1_basicOrder();
  await demo2_promiseChains();
  await demo3_nextTickPriority();
  await demo4_asyncAwait();
  await demo5_setImmediateComparison();
  await demo6_mixed();
  await demo7_ioOperations();
  await demo8_realWorld();

  await wait(500);

  printDetailedSummary();
}

// ============================================================================
// Event Loop Diagram (from Node.js docs)
// ============================================================================
function printEventLoopDiagram() {
  console.log(
    `${colors.bright}${colors.cyan}Node.js Event Loop Phases:${colors.reset}`,
  );
  console.log(`${colors.dim}
   ┌───────────────────────────┐
┌─>│           timers          │  setTimeout(), setInterval()
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │  I/O callbacks deferred
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │  Internal use only
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           poll            │  Retrieve new I/O events
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           check           │  setImmediate() callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──│      close callbacks      │  e.g. socket.on('close')
   └───────────────────────────┘

MICROTASKS run between EACH phase:
  • process.nextTick() queue  (highest priority)
  • Promise callbacks queue
  • queueMicrotask() queue
${colors.reset}\n`);
}

// ============================================================================
// Detailed Summary with Use Cases
// ============================================================================
function printDetailedSummary() {
  separator('Summary - Complete Event Loop Execution Priority');

  console.log(
    `${colors.bright}${colors.cyan}EXECUTION ORDER (Priority from highest to lowest):${colors.reset}\n`,
  );

  console.log(
    `${colors.bright}P1 - SYNCHRONOUS CODE${colors.reset} ${OP_TYPES.SYNC.color}[SYNC]${colors.reset}`,
  );
  console.log(`  • Executes immediately on the call stack`);
  console.log(`  • Blocks all other operations until complete`);
  console.log(
    `  • ${colors.yellow}Use for:${colors.reset} Variable declarations, function calls, calculations`,
  );
  console.log(
    `  • ${colors.red}Avoid for:${colors.reset} Heavy computations (blocks event loop)\n`,
  );

  console.log(
    `${colors.bright}P2.1 - PROCESS.NEXTTICK${colors.reset} ${OP_TYPES.NEXTTICK.color}[NEXTtick]${colors.reset}`,
  );
  console.log(`  • Runs BEFORE any other async operation`);
  console.log(`  • Runs BEFORE other microtasks (Promises)`);
  console.log(`  • Can cause starvation if used recursively`);
  console.log(
    `  • ${colors.yellow}Use for:${colors.reset} Cleanup, error handling, letting call stack unwind`,
  );
  console.log(
    `  • ${colors.green}Example:${colors.reset} process.nextTick(() => emitEvent())`,
  );
  console.log(
    `  • ${colors.red}Caution:${colors.reset} Can delay I/O if overused\n`,
  );

  console.log(
    `${colors.bright}P2 - MICROTASKS${colors.reset} ${OP_TYPES.MICROTASK.color}[MICROTSK]${colors.reset}`,
  );
  console.log(`  • Runs after nextTick queue is empty`);
  console.log(`  • ALL microtasks complete before moving to macrotasks`);
  console.log(`  • Includes: Promise.then/catch/finally, queueMicrotask()`);
  console.log(
    `  • ${colors.yellow}Use for:${colors.reset} Async operations, API calls, database queries`,
  );
  console.log(
    `  • ${colors.green}Example:${colors.reset} fetch(url).then(data => process(data))`,
  );
  console.log(
    `  • ${colors.green}Best Practice:${colors.reset} Prefer Promises over callbacks\n`,
  );

  console.log(
    `${colors.bright}P3 - TIMERS${colors.reset} ${OP_TYPES.TIMER.color}[TIMER]${colors.reset}`,
  );
  console.log(`  • Runs in the Timers phase of event loop`);
  console.log(`  • Delay is MINIMUM time, not guaranteed exact time`);
  console.log(`  • setTimeout(fn, 0) still waits for microtasks to complete`);
  console.log(
    `  • ${colors.yellow}Use for:${colors.reset} Delays, debouncing, throttling, scheduling`,
  );
  console.log(
    `  • ${colors.green}Example:${colors.reset} setTimeout(() => saveCache(), 5000)`,
  );
  console.log(
    `  • ${colors.red}Not for:${colors.reset} Precise timing (use hrtime for that)\n`,
  );

  console.log(
    `${colors.bright}P4 - SETIMMEDIATE${colors.reset} ${OP_TYPES.IMMEDIATE.color}[IMMEDIAT]${colors.reset}`,
  );
  console.log(`  • Runs in the Check phase (after Poll phase)`);
  console.log(`  • Designed to execute after I/O events`);
  console.log(`  • More predictable than setTimeout(fn, 0) in I/O contexts`);
  console.log(
    `  • ${colors.yellow}Use for:${colors.reset} Breaking up long operations, yielding to I/O`,
  );
  console.log(
    `  • ${colors.green}Example:${colors.reset} setImmediate(() => processNextBatch())`,
  );
  console.log(
    `  • ${colors.green}Best Practice:${colors.reset} Use in I/O callbacks for better performance\n`,
  );

  console.log(
    `${colors.bright}P5 - I/O CALLBACKS${colors.reset} ${OP_TYPES.IO.color}[I/O]${colors.reset}`,
  );
  console.log(`  • Runs in the Poll phase`);
  console.log(`  • Handles file system, network, database operations`);
  console.log(`  • Event loop waits here for events when idle`);
  console.log(
    `  • ${colors.yellow}Use for:${colors.reset} fs.readFile, http.request, database queries`,
  );
  console.log(
    `  • ${colors.green}Example:${colors.reset} fs.readFile('file.txt', callback)`,
  );
  console.log(
    `  • ${colors.green}Tip:${colors.reset} Use async/await for cleaner I/O code\n`,
  );

  separator('Real-World Use Cases by Operation Type');

  console.log(
    `${colors.bright}${colors.green}WHEN TO USE EACH:${colors.reset}\n`,
  );

  console.log(`${colors.cyan}Synchronous Code:${colors.reset}`);
  console.log(`  ✓ Simple calculations and transformations`);
  console.log(`  ✓ Validations and guards`);
  console.log(`  ✓ Setting up variables and initial state`);
  console.log(`  ✗ Heavy CPU work (use Worker Threads instead)\n`);

  console.log(`${colors.cyan}process.nextTick():${colors.reset}`);
  console.log(`  ✓ Emitting events after object construction`);
  console.log(`  ✓ Error handling before I/O operations`);
  console.log(`  ✓ Letting call stack unwind before continuing`);
  console.log(`  ✗ Regular async operations (use Promises instead)\n`);

  console.log(`${colors.cyan}Promises / Microtasks:${colors.reset}`);
  console.log(`  ✓ API calls and HTTP requests`);
  console.log(`  ✓ Database queries`);
  console.log(`  ✓ Any async operation that should complete ASAP`);
  console.log(`  ✓ Chaining dependent async operations\n`);

  console.log(`${colors.cyan}setTimeout / setInterval:${colors.reset}`);
  console.log(`  ✓ Delays and scheduled tasks`);
  console.log(`  ✓ Debouncing user input`);
  console.log(`  ✓ Polling with intervals`);
  console.log(`  ✓ Breaking up long-running sync code\n`);

  console.log(`${colors.cyan}setImmediate:${colors.reset}`);
  console.log(`  ✓ After I/O operations complete`);
  console.log(`  ✓ Breaking up batch processing`);
  console.log(`  ✓ Yielding to I/O in loops`);
  console.log(`  ✓ Server-side optimizations (Node.js specific)\n`);

  console.log(`${colors.cyan}async/await:${colors.reset}`);
  console.log(`  ✓ Sequential async operations (clean code)`);
  console.log(`  ✓ Error handling with try/catch`);
  console.log(`  ✓ Conditional async logic`);
  console.log(`  ✓ Use Promise.all() for parallel operations\n`);

  separator('Performance Tips');

  console.log(
    `${colors.bright}${colors.yellow}OPTIMIZATION STRATEGIES:${colors.reset}\n`,
  );

  console.log(`${colors.green}1. Parallel vs Sequential:${colors.reset}`);
  console.log(
    `   ${colors.dim}// SLOW (Sequential - 200ms total)${colors.reset}`,
  );
  console.log(`   const user = await fetchUser();`);
  console.log(`   const posts = await fetchPosts();  // Waits for user first`);
  console.log(
    `\n   ${colors.dim}// FAST (Parallel - 100ms total)${colors.reset}`,
  );
  console.log(`   const [user, posts] = await Promise.all([`);
  console.log(`     fetchUser(),`);
  console.log(`     fetchPosts()  // Runs simultaneously`);
  console.log(`   ]);\n`);

  console.log(`${colors.green}2. Don't Block the Event Loop:${colors.reset}`);
  console.log(`   ${colors.red}✗ Bad:${colors.reset} Long synchronous loops`);
  console.log(
    `   ${colors.green}✓ Good:${colors.reset} Break up work with setImmediate()\n`,
  );

  console.log(`${colors.green}3. Use the Right Tool:${colors.reset}`);
  console.log(`   ${colors.dim}// In I/O callback context:${colors.reset}`);
  console.log(`   fs.readFile('file.txt', () => {`);
  console.log(`     setImmediate(() => process());  // Better than setTimeout`);
  console.log(`   });\n`);

  console.log(`${colors.green}4. Avoid nextTick Recursion:${colors.reset}`);
  console.log(
    `   ${colors.red}✗ Bad:${colors.reset} Recursive nextTick starves I/O`,
  );
  console.log(
    `   ${colors.green}✓ Good:${colors.reset} Use setImmediate for recursion\n`,
  );

  console.log(`${colors.bright}${colors.cyan}KEY TAKEAWAYS:${colors.reset}`);
  console.log(`  • Lower priority number = executes first`);
  console.log(`  • Microtasks ALWAYS complete before next macrotask`);
  console.log(`  • One macrotask per event loop tick`);
  console.log(`  • async/await is syntactic sugar over Promises`);
  console.log(`  • Use Promise.all() for parallel operations`);
  console.log(`  • Don't block the event loop with sync code`);
  console.log(`  • Choose the right async primitive for your use case\n`);
}

// Run the demo
main().catch(console.error);
