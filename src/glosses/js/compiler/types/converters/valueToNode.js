import isValidIdentifier from "../validators/isValidIdentifier";
import {
    identifier,
    booleanLiteral,
    nullLiteral,
    stringLiteral,
    numericLiteral,
    regExpLiteral,
    arrayExpression,
    objectProperty,
    objectExpression,
    unaryExpression,
    binaryExpression
} from "../builders/generated";

const {
    is,
    lodash: { isPlainObject, isRegExp }
} = adone;

export default function valueToNode(value) {
    // undefined
    if (is.undefined(value)) {
        return identifier("undefined");
    }

    // boolean
    if (value === true || value === false) {
        return booleanLiteral(value);
    }

    // null
    if (is.null(value)) {
        return nullLiteral();
    }

    // strings
    if (is.string(value)) {
        return stringLiteral(value);
    }

    // numbers
    if (is.number(value)) {
        let result;
        if (is.finite(value)) {
            result = numericLiteral(Math.abs(value));
        } else {
            let numerator;
            if (is.nan(value)) {
                // NaN
                numerator = numericLiteral(0);
            } else {
                // Infinity / -Infinity
                numerator = numericLiteral(1);
            }

            result = binaryExpression("/", numerator, numericLiteral(0));
        }

        if (value < 0 || Object.is(value, -0)) {
            result = unaryExpression("-", result);
        }

        return result;
    }

    // regexes
    if (isRegExp(value)) {
        const pattern = value.source;
        const flags = value.toString().match(/\/([a-z]+|)$/)[1];
        return regExpLiteral(pattern, flags);
    }

    // array
    if (is.array(value)) {
        return arrayExpression(value.map(valueToNode));
    }

    // object
    if (isPlainObject(value)) {
        const props = [];
        for (const key in value) {
            let nodeKey;
            if (isValidIdentifier(key)) {
                nodeKey = identifier(key);
            } else {
                nodeKey = stringLiteral(key);
            }
            props.push(objectProperty(nodeKey, valueToNode(value[key])));
        }
        return objectExpression(props);
    }

    throw new Error("don't know how to turn this value into a node");
}
