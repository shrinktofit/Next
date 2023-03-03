import { DEBUG } from "cc/env";

export function assertIsTrue (expr: unknown, message?: string): asserts expr {
    if (DEBUG && !expr) {
        // eslint-disable-next-line no-debugger
        // debugger;
        throw new Error(`Assertion failed: ${message ?? '<no-message>'}`);
    }
}