export default function (fn) {
    let active = false;
    let called = 0;
    return function () {
        called = true;
        if (!active) {
            active = true;
            while (called) {
                called = false;
                fn();
            }
            active = false;
        }
    };
};
