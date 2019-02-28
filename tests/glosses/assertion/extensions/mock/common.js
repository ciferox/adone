export const swallow = function (thrower) {
    try {
        thrower();
    } catch (e) {
        // Intentionally swallow
    }
};
