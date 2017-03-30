const { data: { yaml }, is } = adone;

const YAML_FLOAT_PATTERN = new RegExp(
    // 2.5e4, 2.5 and integers
    "^(?:[-+]?(?:0|[1-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?" +
    // .2e4, .2
    // special case, seems not from spec
    "|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?" +
    // 20:59
    "|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*" +
    // .inf
    "|[-+]?\\.(?:inf|Inf|INF)" +
    // .nan
    "|\\.(?:nan|NaN|NAN))$");

const resolveYamlFloat = (data) => {
    if (is.null(data)) {
        return false;
    }

    if (!YAML_FLOAT_PATTERN.test(data)) {
        return false;
    }

    return true;
};

const constructYamlFloat = (data) => {
    let value = data.replace(/_/g, "").toLowerCase();
    const sign = value[0] === "-" ? -1 : 1;

    if ("+-".indexOf(value[0]) >= 0) {
        value = value.slice(1);
    }

    if (value === ".inf") {
        return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

    } else if (value === ".nan") {
        return NaN;
    }
    if (value.includes(":")) {
        const digits = [];
        for (const v of value.split(":")) {
            digits.unshift(parseFloat(v, 10));
        }
        value = 0.0;
        let base = 1;

        for (const d of digits) {
            value += d * base;
            base *= 60;
        }
        return sign * value;

    }
    return sign * parseFloat(value, 10);
};


const SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;

const representYamlFloat = (object, style) => {
    if (isNaN(object)) {
        switch (style) {
            case "lowercase": {
                return ".nan";
            }
            case "uppercase": {
                return ".NAN";
            }
            case "camelcase": {
                return ".NaN";
            }
        }
    } else if (Number.POSITIVE_INFINITY === object) {
        switch (style) {
            case "lowercase": {
                return ".inf";
            }
            case "uppercase": {
                return ".INF";
            }
            case "camelcase": {
                return ".Inf";
            }
        }
    } else if (Number.NEGATIVE_INFINITY === object) {
        switch (style) {
            case "lowercase": {
                return "-.inf";
            }
            case "uppercase": {
                return "-.INF";
            }
            case "camelcase": {
                return "-.Inf";
            }
        }
    } else if (is.negativeZero(object)) {
        return "-0.0";
    }

    const res = object.toString(10);

    // JS stringifier can build scientific format without dots: 5e-100,
    // while YAML requres dot: 5.e-100. Fix it with simple hack

    return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
};

export default new yaml.type.Type("tag:yaml.org,2002:float", {
    kind: "scalar",
    resolve: resolveYamlFloat,
    construct: constructYamlFloat,
    predicate: (object) => is.float(object) || is.negativeZero(object) || is.infinite(object),
    represent: representYamlFloat,
    defaultStyle: "lowercase"
});
