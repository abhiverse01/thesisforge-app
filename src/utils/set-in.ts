// ============================================================
// Immutable Field Path Setter
// Sets a value at a nested path without mutating the original.
// Usage: setIn(state, 'chapters[2].title', 'New Title')
//
// Uses a recursive approach that correctly chains shallow copies
// through both objects and arrays at every nesting level.
// ============================================================

export function setIn<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown
): T {
  if (!path) return obj;

  const keys = path.replace(/\[(\d+)]/g, '.$1').split('.');
  if (keys.length === 0) return obj;

  return setRecursive(obj, keys, value) as T;
}

/**
 * Recursively creates a new object/array tree with the value set at the target path.
 * At each level, a shallow copy is made so the original is never mutated.
 */
function setRecursive(
  current: unknown,
  keys: string[],
  value: unknown
): unknown {
  if (keys.length === 0) return value;

  const [first, ...rest] = keys;
  const idx = parseInt(first, 10);
  const isNumericKey = !isNaN(idx) && String(idx) === first;

  if (keys.length === 1) {
    // ── Leaf: set the final value ──────────────────────────────
    if (Array.isArray(current)) {
      const arr = [...current];
      arr[idx] = value;
      return arr;
    }
    if (current !== null && current !== undefined && typeof current === 'object') {
      return { ...(current as Record<string, unknown>), [first]: value };
    }
    // current is primitive or null — create new object
    return { [first]: value };
  }

  // ── Intermediate: recurse into child ────────────────────────
  let child: unknown;
  if (current !== null && current !== undefined && typeof current === 'object') {
    if (Array.isArray(current)) {
      child = current[idx];
    } else {
      child = (current as Record<string, unknown>)[first];
    }
  }

  // Auto-create missing intermediate nodes
  if (child === null || child === undefined) {
    const nextIsNumeric = !isNaN(parseInt(rest[0], 10)) && String(parseInt(rest[0], 10)) === rest[0];
    child = nextIsNumeric ? [] : {};
  }

  const newChild = setRecursive(child, rest, value);

  // Shallow-copy the current level with the new child
  if (Array.isArray(current)) {
    const arr = [...current];
    arr[idx] = newChild;
    return arr;
  }
  if (current !== null && current !== undefined && typeof current === 'object') {
    return { ...(current as Record<string, unknown>), [first]: newChild };
  }
  // current is primitive — wrap in new object
  return { [first]: newChild };
}
