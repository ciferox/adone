const {
    is
} = adone;

const has = Object.prototype.hasOwnProperty;

const arrayToObject = (source, options) => {
    const obj = options && options.plainObjects ? Object.create(null) : {};
    for (let i = 0; i < source.length; ++i) {
        if (!is.undefined(source[i])) {
            obj[i] = source[i];
        }
    }

    return obj;
};

export default function merge(target, source, options) {
    if (!source) {
        return target;
    }

    if (!is.object(source)) {
        if (is.array(target)) {
            target.push(source);
        } else if (is.object(target)) {
            if (options.plainObjects || options.allowPrototypes || !has.call(Object.prototype, source)) {
                target[source] = true;
            }
        } else {
            return [target, source];
        }

        return target;
    }

    if (!is.object(target)) {
        return [target].concat(source);
    }

    let mergeTarget = target;
    if (is.array(target) && !is.array(source)) {
        mergeTarget = arrayToObject(target, options);
    }

    if (is.array(target) && is.array(source)) {
        source.forEach((item, i) => {
            if (has.call(target, i)) {
                if (target[i] && is.object(target[i])) {
                    target[i] = merge(target[i], item, options);
                } else {
                    target.push(item);
                }
            } else {
                target[i] = item;
            }
        });
        return target;
    }

    return Object.keys(source).reduce((acc, key) => {
        const value = source[key];

        if (has.call(acc, key)) {
            acc[key] = merge(acc[key], value, options);
        } else {
            acc[key] = value;
        }
        return acc;
    }, mergeTarget);
}
