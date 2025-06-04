/**
 * Browser polyfills for Node.js modules
 */

import { Buffer } from 'buffer';

// Make Buffer available globally
(globalThis as any).Buffer = Buffer;

// Export for explicit imports
export { Buffer };
