#!/usr/bin/env node

/**
 * Node.js Async Execution Order Demo
 * This script demonstrates how setTimeout, Promises, and async/await work
 * and shows their execution order in the event loop
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
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

function log(message, color = colors.reset) {
  counter++;
  console.log(
    `${color}[${getTimestamp()}] ${counter}. ${message}${colors.reset}`,
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
// DEMO 1: Basic Execution Order
// ============================================================================
function demo1_basicOrder() {
  separator('DEMO 1: Basic Execution Order');
  initTimer();

  log('Synchronous code starts', colors.green);

  setTimeout(() => {
    log('setTimeout with 0ms (macrotask)', colors.red);
  }, 0);

  setTimeout(() => {
    log('setTimeout with 10ms (macrotask)', colors.red);
  }, 10);

  Promise.resolve().then(() => {
    log('Promise.then() - microtask queue', colors.magenta);
  });

  Promise.resolve().then(() => {
    log('Another Promise.then() - microtask queue', colors.magenta);
  });

  log('Synchronous code ends', colors.green);

  console.log(
    `\n${colors.yellow}Expected order: Sync → Sync → Promise → Promise → setTimeout 0ms → setTimeout 10ms${colors.reset}\n`,
  );
}

// ============================================================================
// DEMO 2: Promise Chains
// ============================================================================
async function demo2_promiseChains() {
  await wait(100); // Wait for demo 1 to complete
  separator('DEMO 2: Promise Chains');
  initTimer();

  log('Starting promise chain', colors.green);

  Promise.resolve('Step 1')
    .then((result) => {
      log(`Promise resolved: ${result}`, colors.blue);
      return 'Step 2';
    })
    .then((result) => {
      log(`Promise resolved: ${result}`, colors.blue);
      return 'Step 3';
    })
    .then((result) => {
      log(`Promise resolved: ${result}`, colors.blue);
    })
    .catch((error) => {
      log(`Promise rejected: ${error}`, colors.red);
    });

  log('Promise chain registered (sync code)', colors.green);

  setTimeout(() => {
    log('setTimeout runs after all promise chains', colors.red);
  }, 0);
}

// ============================================================================
// DEMO 3: Async/Await
// ============================================================================
async function demo3_asyncAwait() {
  await wait(100);
  separator('DEMO 3: Async/Await');
  initTimer();

  log('Before async function call', colors.green);

  async function asyncExample() {
    log('Async function starts (synchronous part)', colors.yellow);

    await Promise.resolve();
    log('After first await (becomes microtask)', colors.yellow);

    await wait(50);
    log('After await with 50ms delay', colors.yellow);

    const result = await Promise.resolve('Async result');
    log(`Received: ${result}`, colors.yellow);

    return 'Done';
  }

  const promise = asyncExample();

  log('After async function call (sync code continues)', colors.green);

  Promise.resolve().then(() => {
    log('Regular Promise.then microtask', colors.magenta);
  });

  await promise;
  log('Async function completed', colors.green);
}

// ============================================================================
// DEMO 4: Mixed - Everything Together
// ============================================================================
async function demo4_mixed() {
  await wait(200);
  separator('DEMO 4: Mixed - Everything Together');
  initTimer();

  log('1. Synchronous start', colors.green);

  // Macrotask - setTimeout
  setTimeout(() => {
    log('setTimeout 0ms (macrotask queue)', colors.red);

    Promise.resolve().then(() => {
      log('Promise inside setTimeout (microtask)', colors.magenta);
    });
  }, 0);

  setTimeout(() => {
    log('setTimeout 30ms (macrotask queue)', colors.red);
  }, 30);

  // Microtask - Promise
  Promise.resolve().then(() => {
    log('Promise.then #1 (microtask queue)', colors.magenta);

    setTimeout(() => {
      log('setTimeout inside Promise (macrotask)', colors.red);
    }, 0);
  });

  // Async function
  async function complexAsync() {
    log('2. Async function start (runs synchronously)', colors.yellow);

    await Promise.resolve();
    log('After await (microtask queue)', colors.yellow);

    setTimeout(() => {
      log('setTimeout in async function (macrotask)', colors.red);
    }, 0);

    await wait(20);
    log('After 20ms delay in async', colors.yellow);
  }

  complexAsync();

  // More microtasks
  Promise.resolve().then(() => {
    log('Promise.then #2 (microtask queue)', colors.magenta);
  });

  queueMicrotask(() => {
    log('queueMicrotask() callback', colors.magenta);
  });

  log('3. Synchronous end', colors.green);
}

// ============================================================================
// DEMO 5: Real-world Example - API Simulation
// ============================================================================
async function demo5_realWorld() {
  await wait(200);
  separator('DEMO 5: Real-world Example - Simulated API Calls');
  initTimer();

  log('Starting API request simulation', colors.green);

  // Simulate fetching user data
  async function fetchUser(userId) {
    log(`Fetching user ${userId}...`, colors.cyan);

    await wait(30); // Simulate network delay

    log(`User ${userId} fetched`, colors.blue);
    return { id: userId, name: `User ${userId}` };
  }

  // Simulate fetching user posts
  async function fetchPosts(userId) {
    log(`Fetching posts for user ${userId}...`, colors.cyan);

    await wait(40); // Simulate network delay

    log(`Posts for user ${userId} fetched`, colors.blue);
    return [
      { id: 1, title: 'Post 1' },
      { id: 2, title: 'Post 2' },
    ];
  }

  // Sequential execution
  log('Sequential API calls:', colors.yellow);
  const user1 = await fetchUser(1);
  const posts1 = await fetchPosts(user1.id);
  log(`Got ${posts1.length} posts for ${user1.name}`, colors.green);

  // Parallel execution
  log('\nParallel API calls:', colors.yellow);
  const [user2, user3] = await Promise.all([fetchUser(2), fetchUser(3)]);
  log(`Got users: ${user2.name} and ${user3.name}`, colors.green);
}

// ============================================================================
// Main execution
// ============================================================================
async function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║       Node.js Async Execution Order Demonstration          ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  console.log(`${colors.yellow}Legend:`);
  console.log(
    `${colors.green}GREEN${colors.reset}    - Synchronous code (executes immediately)`,
  );
  console.log(
    `${colors.magenta}MAGENTA${colors.reset}  - Microtasks (Promises, queueMicrotask)`,
  );
  console.log(
    `${colors.red}RED${colors.reset}      - Macrotasks (setTimeout, setInterval)`,
  );
  console.log(
    `${colors.yellow}YELLOW${colors.reset}   - Async/await functions`,
  );
  console.log(`${colors.blue}BLUE${colors.reset}     - Promise resolutions`);
  console.log(
    `${colors.cyan}CYAN${colors.reset}     - In-progress operations\n`,
  );

  demo1_basicOrder();
  await demo2_promiseChains();
  await demo3_asyncAwait();
  await demo4_mixed();
  await demo5_realWorld();

  await wait(100);

  separator('Summary - Event Loop Execution Order');
  console.log(
    `${colors.bright}The Event Loop processes tasks in this order:${colors.reset}\n`,
  );
  console.log(
    `1. ${colors.green}Synchronous Code${colors.reset} - Runs immediately, top to bottom`,
  );
  console.log(
    `2. ${colors.magenta}Microtask Queue${colors.reset} - Promises, queueMicrotask()`,
  );
  console.log(`   - All microtasks complete before moving to macrotasks`);
  console.log(
    `3. ${colors.red}Macrotask Queue${colors.reset} - setTimeout, setInterval, setImmediate`,
  );
  console.log(`   - One macrotask per event loop tick\n`);

  console.log(`${colors.yellow}Key Takeaways:${colors.reset}`);
  console.log(`• Synchronous code always runs first`);
  console.log(`• Promises/microtasks run before setTimeout/macrotasks`);
  console.log(`• async/await is syntactic sugar over Promises`);
  console.log(`• Each await creates a microtask for the continuation`);
  console.log(`• setTimeout(fn, 0) doesn't mean "run immediately"\n`);
}

// Run the demo
main().catch(console.error);
