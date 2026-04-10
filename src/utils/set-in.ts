// ============================================================
// Immutable Field Path Setter
// Sets a value at a nested path without mutating the original.
// Usage: setIn(state, 'chapters[2].title', 'New Title')
// ============================================================

export function setIn<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown
): T {
  if (!path) return obj;

  const keys = path.replace(/\[(\d+)]/g, '.$1').split('.');
  const cloned = { ...obj };

  let current: Record<string, unknown> = cloned;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === null || current[key] === undefined) {
      const nextKey = keys[i + 1];
      current[key] = /^\d+$/.test(nextKey) ? [] : {};
    }
    if (Array.isArray(current[key])) {
      current[key] = [...(current[key] as unknown[])];
    } else {
      current[key] = { ...(current[key] as Record<string, unknown>) };
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];
  if (Array.isArray(current)) {
    const idx = parseInt(lastKey, 10);
    const arr = [...current];
    arr[idx] = value;
    // Replace parent reference
    let parent: Record<string, unknown> | unknown[] = cloned;
    for (let i = 0; i < keys.length - 2; i++) {
      const key = keys[i];
      if (Array.isArray(parent[key])) {
        parent = [...(parent[key] as unknown[])];
      } else {
        parent = { ...(parent[key] as Record<string, unknown>) };
      }
    }
    if (keys.length >= 2) {
      const parentKey = keys[keys.length - 2];
      if (Array.isArray((parent as Record<string, unknown>)[parentKey])) {
        const parentArr = [...((parent as Record<string, unknown>)[parentKey] as unknown[])];
        parentArr[idx] = value;
        (parent as Record<string, unknown>)[parentKey] = parentArr;
      }
    }
  } else {
    current[lastKey] = value;
  }

  return cloned;
}
