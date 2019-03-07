const {
    is
} = adone;

export default (obj, props) => {
    if (!is.object(obj)) {
        return {};
    }

    let isShouldOmit;
    if (is.function(props)) {
        isShouldOmit = props;
    } else if (is.array(props)) {
        isShouldOmit = (name) => props.includes(name);
    } else if (is.string(props)) {
        isShouldOmit = (val) => val === props;
    } else if (props === true) {
        return {};
    } else if (!props) {
        isShouldOmit = adone.falsely;
    } else {
        throw new adone.error.InvalidArgumentException(`Unsupported type of 'props': ${adone.typeOf(props)}`);
    }

    const keys = adone.util.keys(obj, {
        enumOnly: false
    });

    const result = {};

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const val = obj[key];

        if (!isShouldOmit(key, val, obj)) {
            const descr = Object.getOwnPropertyDescriptor(obj, key);
            Object.defineProperty(result, key, descr);
        }
    }
    return result;
};
