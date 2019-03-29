const {
    is,
    util
} = adone;

class Cloner {
    clone(obj, {
        deep = true,
        nonPlainObjects = false,
        enumOnly = true
    } = {}) {
        if (!is.object(obj)) {
            return obj;
        }
        if (is.array(obj)) {
            if (deep) {
                return obj.map((x) => this.clone(x, { deep, nonPlainObjects, enumOnly }));
            }
            return obj.slice(0);
        }
        if (is.function(obj)) {
            return obj;
        }
        if (is.regexp(obj)) {
            return new RegExp(obj.source, obj.flags);
        }
        if (is.buffer(obj)) {
            return Buffer.from(obj);
        }
        if (is.date(obj)) {
            return new Date(obj.getTime());
        }
        if (!nonPlainObjects && !is.plainObject(obj)) {
            return obj;
        }
        const res = {};
        for (const key of util.keys(obj, { enumOnly })) {
            res[key] = deep ? this.clone(obj[key], { deep, nonPlainObjects, enumOnly }) : obj[key];
        }
        return res;
    }

    binding() {
        return this.clone.bind(this);
    }
}

const clone = new Cloner().binding();
clone.Cloner = Cloner;

export default clone;
