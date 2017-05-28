const { is } = adone;

export const hasProperty = (obj, name) => {
    if (is.nil(obj)) {
        return false;
    }

    // The `in` operator does not work with primitives.
    return name in Object(obj);
};

const parsePath = (path) => {
    const str = path.replace(/([^\\])\[/g, "$1.[");
    const parts = str.match(/(\\\.|[^.]+?)+/g);
    return parts.map(function mapMatches(value) {
        const regexp = /^\[(\d+)\]$/;
        const mArr = regexp.exec(value);
        let parsed = null;
        if (mArr) {
            parsed = { i: parseFloat(mArr[1]) };
        } else {
            parsed = { p: value.replace(/\\([.\[\]])/g, "$1") };
        }

        return parsed;
    });
};

const internalGetPathValue = (obj, parsed, pathDepth) => {
    let temporaryValue = obj;
    let res = null;
    pathDepth = (is.undefined(pathDepth) ? parsed.length : pathDepth);

    for (let i = 0; i < pathDepth; i++) {
        const part = parsed[i];
        if (temporaryValue) {
            if (is.undefined(part.p)) {
                temporaryValue = temporaryValue[part.i];
            } else {
                temporaryValue = temporaryValue[part.p];
            }

            if (i === (pathDepth - 1)) {
                res = temporaryValue;
            }
        }
    }

    return res;
};

const internalSetPathValue = (obj, val, parsed) => {
    let tempObj = obj;
    const pathDepth = parsed.length;
    let part = null;
    // Here we iterate through every part of the path
    for (let i = 0; i < pathDepth; i++) {
        let propName = null;
        let propVal = null;
        part = parsed[i];

        // If it's the last part of the path, we set the 'propName' value with the property name
        if (i === (pathDepth - 1)) {
            propName = is.undefined(part.p) ? part.i : part.p;
            // Now we set the property with the name held by 'propName' on object with the desired val
            tempObj[propName] = val;
        } else if (!is.undefined(part.p) && tempObj[part.p]) {
            tempObj = tempObj[part.p];
        } else if (!is.undefined(part.i) && tempObj[part.i]) {
            tempObj = tempObj[part.i];
        } else {
            // If the obj doesn't have the property we create one with that name to define it
            const next = parsed[i + 1];
            // Here we set the name of the property which will be defined
            propName = is.undefined(part.p) ? part.i : part.p;
            // Here we decide if this property will be an array or a new object
            propVal = is.undefined(next.p) ? [] : {};
            tempObj[propName] = propVal;
            tempObj = tempObj[propName];
        }
    }
};

export const getPathInfo = (obj, path) => {
    const parsed = parsePath(path);
    const last = parsed[parsed.length - 1];
    const info = {
        parent: parsed.length > 1 ? internalGetPathValue(obj, parsed, parsed.length - 1) : obj,
        name: last.p || last.i,
        value: internalGetPathValue(obj, parsed)
    };
    info.exists = hasProperty(info.parent, info.name);

    return info;
};

export const getPathValue = (obj, path) => getPathInfo(obj, path).value;

export const setPathValue = (obj, path, val) => {
    const parsed = parsePath(path);
    internalSetPathValue(obj, val, parsed);
    return obj;
};
