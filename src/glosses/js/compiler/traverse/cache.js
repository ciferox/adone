export let path = new WeakMap();
export let scope = new WeakMap();

export const clearPath = function () {
    path = new WeakMap();
};

export const clearScope = function () {
    scope = new WeakMap();
};

export const clear = function () {
    clearPath();
    clearScope();
};
