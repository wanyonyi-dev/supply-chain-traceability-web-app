export const DEBUG = true;

export const log = (...args) => {
    if (DEBUG) {
        console.log('[Debug]', ...args);
    }
};

export const error = (...args) => {
    if (DEBUG) {
        console.error('[Debug Error]', ...args);
    }
}; 