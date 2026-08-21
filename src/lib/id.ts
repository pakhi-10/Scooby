// src/lib/utils/id.ts

let counter = 0;

/** Simple unique id generator, good enough for client-side list keys. */
export function generateId(prefix: string): string {
	counter += 1;
	return `${prefix}-${counter}-${Date.now()}`;
}