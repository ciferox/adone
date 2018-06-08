import { EMPTY_PATH, UNKNOWN_VALUE } from '../values';
import { NodeBase } from './shared/Node';
const binaryOperators = {
    '==': (left, right) => left == right,
    '!=': (left, right) => left != right,
    '===': (left, right) => left === right,
    '!==': (left, right) => left !== right,
    '<': (left, right) => left < right,
    '<=': (left, right) => left <= right,
    '>': (left, right) => left > right,
    '>=': (left, right) => left >= right,
    '<<': (left, right) => left << right,
    '>>': (left, right) => left >> right,
    '>>>': (left, right) => left >>> right,
    '+': (left, right) => left + right,
    '-': (left, right) => left - right,
    '*': (left, right) => left * right,
    '/': (left, right) => left / right,
    '%': (left, right) => left % right,
    '|': (left, right) => left | right,
    '^': (left, right) => left ^ right,
    '&': (left, right) => left & right,
    '**': (left, right) => Math.pow(left, right),
    in: (left, right) => left in right,
    instanceof: (left, right) => left instanceof right
};
export default class BinaryExpression extends NodeBase {
    getLiteralValueAtPath(path, options) {
        if (path.length > 0)
            return UNKNOWN_VALUE;
        const leftValue = this.left.getLiteralValueAtPath(EMPTY_PATH, options);
        if (leftValue === UNKNOWN_VALUE)
            return UNKNOWN_VALUE;
        const rightValue = this.right.getLiteralValueAtPath(EMPTY_PATH, options);
        if (rightValue === UNKNOWN_VALUE)
            return UNKNOWN_VALUE;
        const operatorFn = binaryOperators[this.operator];
        if (!operatorFn)
            return UNKNOWN_VALUE;
        return operatorFn(leftValue, rightValue);
    }
    hasEffectsWhenAccessedAtPath(path, _options) {
        return path.length > 1;
    }
}
