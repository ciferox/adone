import ParameterScope from "./ParameterScope";
export default class ReturnValueScope extends ParameterScope {
    constructor(options = {}) {
        super(options);
        this._returnExpressions = new Set();
    }

    addReturnExpression(expression) {
        this._returnExpressions.add(expression);
    }

    forEachReturnExpressionWhenCalled(_callOptions, callback, options) {
        this._returnExpressions.forEach(callback(options));
    }

    someReturnExpressionWhenCalled(_callOptions, predicateFunction, options) {
        return Array.from(this._returnExpressions).some(predicateFunction(options));
    }
}
