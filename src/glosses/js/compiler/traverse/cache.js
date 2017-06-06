export let path = new WeakMap();
export let scope = new WeakMap();

export const clearPath = () => {
    path = new WeakMap();
};

export const clearScope = () => {
    scope = new WeakMap();
};

export const clear = () => {
    clearPath();
    clearScope();
};
