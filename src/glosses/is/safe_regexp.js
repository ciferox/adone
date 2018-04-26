const {
    is,
    util
} = adone;

export default function safeRegex(re, opts = {}) {
    const replimit = is.undefined(opts.limit) ? 25 : opts.limit;

    if (is.regexp(re)) {
        re = re.source;
    } else if (!is.string(re)) {
        re = String(re);
    }

    try {
        re = util.tokenizeRegexp(re);
    } catch (err) {
        return false;
    }

    const types = util.tokenizeRegexp.types;

    let reps = 0;
    return (function walk(node, starHeight) {
        if (node.type === types.REPETITION) {
            starHeight ++;
            reps ++;
            if (starHeight > 1) {
                return false;
            }
            if (reps > replimit) {
                return false;
            }
        }

        if (node.options) {
            for (let i = 0, len = node.options.length; i < len; i++) {
                const ok = walk({ stack: node.options[i] }, starHeight);
                if (!ok) {
                    return false;
                }
            }
        }
        const stack = node.stack || (node.value && node.value.stack);
        if (!stack) {
            return true;
        }

        for (let i = 0; i < stack.length; i++) {
            const ok = walk(stack[i], starHeight);
            if (!ok) {
                return false;
            }
        }

        return true;
    })(re, 0);
}
