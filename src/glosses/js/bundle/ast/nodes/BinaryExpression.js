import { UNKNOWN_VALUE } from "../values";
import { NodeBase } from "./shared/Node";
const operators = {
    "==": (left, right) => left == right,
    "!=": (left, right) => left != right,
    "===": (left, right) => left === right,
    "!==": (left, right) => left !== right,
    "<": (left, right) => left < right,
    "<=": (left, right) => left <= right,
    ">": (left, right) => left > right,
    ">=": (left, right) => left >= right,
    "<<": (left, right) => left << right,
    ">>": (left, right) => left >> right,
    ">>>": (left, right) => left >>> right,
    "+": (left, right) => left + right,
    "-": (left, right) => left - right,
    "*": (left, right) => left * right,
    "/": (left, right) => left / right,
    "%": (left, right) => left % right,
    "|": (left, right) => left | right,
    "^": (left, right) => left ^ right,
    "&": (left, right) => left & right,
    "**": (left, right) => Math.pow(left, right),
    in: (left, right) => left in right,
    instanceof: (left, right) => left instanceof right
};
export default class BinaryExpression extends NodeBase {
    getValue() {
        const leftValue = this.left.getValue();
        if (leftValue === UNKNOWN_VALUE) {
            return UNKNOWN_VALUE; 
        }
        const rightValue = this.right.getValue();
        if (rightValue === UNKNOWN_VALUE) {
            return UNKNOWN_VALUE;
        }
        const operatorFn = operators[this.operator];
        if (!operatorFn) {
            return UNKNOWN_VALUE; 
        }
        return operatorFn(leftValue, rightValue);
    }

    hasEffectsWhenAccessedAtPath(path, _options) {
        return path.length > 1;
    }
}
