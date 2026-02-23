type TestFn = () => void | Promise<void>;

interface TestCase {
  name: string;
  fn: TestFn;
}

const tests: TestCase[] = [];

export function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

export function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

export function equal<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected: ${String(expected)}, got: ${String(actual)}`);
  }
}

export function includes<T>(arr: T[], value: T, message: string) {
  if (!arr.includes(value)) {
    throw new Error(`${message}. Missing: ${String(value)}`);
  }
}

export function notIncludes<T>(arr: T[], value: T, message: string) {
  if (arr.includes(value)) {
    throw new Error(`${message}. Unexpected: ${String(value)}`);
  }
}

export async function run() {
  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      await t.fn();
      passed += 1;
      console.log(`PASS ${t.name}`);
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`FAIL ${t.name}`);
      console.error(`  ${msg}`);
    }
  }

  console.log(`\nTests: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`);

  if (failed > 0) {
    throw new Error('Test suite failed');
  }
}

export function withMockedRandom(values: number[], fn: () => void) {
  const original = Math.random;
  let idx = 0;
  Math.random = () => {
    if (idx < values.length) {
      return values[idx++];
    }
    return values.length > 0 ? values[values.length - 1] : 0.5;
  };

  try {
    fn();
  } finally {
    Math.random = original;
  }
}
