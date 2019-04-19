const {
    is
} = adone;
const { isIdContinueChar, isIdStartChar } = require("./util");

export default (value, { replacer, space } = {}) => {
    const stack = [];
    let indent = "";
    let propertyList;
    let replacerFunc;
    let gap = "";
    let quote;

    if (
        !is.nil(replacer) &&
        typeof replacer === "object" &&
        !is.array(replacer)
    ) {
        space = replacer.space;
        quote = replacer.quote;
        replacer = replacer.replacer;
    }

    if (is.function(replacer)) {
        replacerFunc = replacer;
    } else if (is.array(replacer)) {
        propertyList = [];
        for (const v of replacer) {
            let item;

            if (is.string(v)) {
                item = v;
            } else if (
                is.number(v) ||
                v instanceof String ||
                v instanceof Number
            ) {
                item = String(v);
            }

            if (!is.undefined(item) && !propertyList.includes(item)) {
                propertyList.push(item);
            }
        }
    }

    if (space instanceof Number) {
        space = Number(space);
    } else if (space instanceof String) {
        space = String(space);
    }

    if (is.number(space)) {
        if (space > 0) {
            space = Math.min(10, Math.floor(space));
            gap = "          ".substr(0, space);
        }
    } else if (is.string(space)) {
        gap = space.substr(0, 10);
    }

    const quoteString = (value) => {
        const quotes = {
            "'": 0.1,
            '"': 0.2
        };

        const replacements = {
            "'": "\\'",
            '"': '\\"',
            "\\": "\\\\",
            "\b": "\\b",
            "\f": "\\f",
            "\n": "\\n",
            "\r": "\\r",
            "\t": "\\t",
            "\v": "\\v",
            "\0": "\\0",
            "\u2028": "\\u2028",
            "\u2029": "\\u2029"
        };

        let product = "";

        for (const c of value) {
            switch (c) {
                case "'":
                case '"':
                    quotes[c]++;
                    product += c;
                    continue;
            }

            if (replacements[c]) {
                product += replacements[c];
                continue;
            }

            if (c < " ") {
                const hexString = c.charCodeAt(0).toString(16);
                product += `\\x${(`00${hexString}`).substring(hexString.length)}`;
                continue;
            }

            product += c;
        }

        const quoteChar = quote || Object.keys(quotes).reduce((a, b) => (quotes[a] < quotes[b]) ? a : b);

        product = product.replace(new RegExp(quoteChar, "g"), replacements[quoteChar]);

        return quoteChar + product + quoteChar;
    };

    const serializeProperty = (key, holder) => {
        let value = holder[key];
        if (!is.nil(value)) {
            if (is.function(value.toJSON5)) {
                value = value.toJSON5(key);
            } else if (is.function(value.toJSON)) {
                value = value.toJSON(key);
            }
        }

        if (replacerFunc) {
            value = replacerFunc.call(holder, key, value);
        }

        if (value instanceof Number) {
            value = Number(value);
        } else if (value instanceof String) {
            value = String(value);
        } else if (value instanceof Boolean) {
            value = value.valueOf();
        }

        switch (value) {
            case null: return "null";
            case true: return "true";
            case false: return "false";
        }

        if (is.string(value)) {
            return quoteString(value, false);
        }

        if (is.number(value)) {
            return String(value);
        }

        if (typeof value === "object") {
            return is.array(value) ? serializeArray(value) : serializeObject(value);
        }

        return undefined;
    };

    const serializeKey = function (key) {
        if (key.length === 0) {
            return quoteString(key, true);
        }

        const firstChar = String.fromCodePoint(key.codePointAt(0));
        if (!isIdStartChar(firstChar)) {
            return quoteString(key, true);
        }

        for (let i = firstChar.length; i < key.length; i++) {
            if (!isIdContinueChar(String.fromCodePoint(key.codePointAt(i)))) {
                return quoteString(key, true);
            }
        }

        return key;
    };

    const serializeObject = (value) => {
        if (stack.includes(value)) {
            throw new TypeError("Converting circular structure to JSON5");
        }

        stack.push(value);

        const stepback = indent;
        indent = indent + gap;

        const keys = propertyList || Object.keys(value);
        const partial = [];
        for (const key of keys) {
            const propertyString = serializeProperty(key, value);
            if (!is.undefined(propertyString)) {
                let member = `${serializeKey(key)}:`;
                if (gap !== "") {
                    member += " ";
                }
                member += propertyString;
                partial.push(member);
            }
        }

        let final;
        if (partial.length === 0) {
            final = "{}";
        } else {
            let properties;
            if (gap === "") {
                properties = partial.join(",");
                final = `{${properties}}`;
            } else {
                const separator = `,\n${indent}`;
                properties = partial.join(separator);
                final = `{\n${indent}${properties},\n${stepback}}`;
            }
        }

        stack.pop();
        indent = stepback;
        return final;
    };

    const serializeArray = function (value) {
        if (stack.includes(value)) {
            throw new TypeError("Converting circular structure to JSON5");
        }

        stack.push(value);

        const stepback = indent;
        indent = indent + gap;

        const partial = [];
        for (let i = 0; i < value.length; i++) {
            const propertyString = serializeProperty(String(i), value);
            partial.push((!is.undefined(propertyString)) ? propertyString : "null");
        }

        let final;
        if (partial.length === 0) {
            final = "[]";
        } else {
            if (gap === "") {
                const properties = partial.join(",");
                final = `[${properties}]`;
            } else {
                const separator = `,\n${indent}`;
                const properties = partial.join(separator);
                final = `[\n${indent}${properties},\n${stepback}]`;
            }
        }

        stack.pop();
        indent = stepback;
        return final;
    };

    return serializeProperty("", { "": value });
};
