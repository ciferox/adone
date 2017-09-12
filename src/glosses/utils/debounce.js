/**
 * Creates a function that delays invoking of the given function until after "timeout" ms
 * have elapsed since the last invoking
 *
 * @param {Function} fn function
 * @param {number} timeout timeout in milliseconds
 * @param {Object} [options={}] opts
 * @param {boolean} [options.leading=false] whether to invoke on the leading edge
 * @param {boolean} [options.trailing=true] whether to invoke on the trailing edge, if both are true the trailing call is performed only if the function is invoked more that once during the interval
 */
export default function debounce(fn, timeout, { leading = false, trailing = !leading } = {}) {
    let timer = null;
    let doubleCall = false;

    let ignored = 0;
    let lastCallResult = undefined;

    const f = function (...args) {
        const call = leading && !timer;

        if (timer) {
            doubleCall = true;
            ++ignored; // ignore only when the timer is set
        }

        clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            if (!leading || (trailing && doubleCall)) {
                lastCallResult = fn.apply(this, args);
                ignored = 0;
            }
            doubleCall = false;
        }, timeout);

        if (call) {
            lastCallResult = fn.apply(this, args);
            ignored = 0;
        }
        return lastCallResult;
    };

    Object.defineProperty(f, "ignored", {
        get() {
            return ignored;
        }
    });

    return f;
}
