import { NEW_EXECUTION_PATH } from '../ExecutionPathOptions';
import { UNKNOWN_EXPRESSION, UNKNOWN_PATH } from '../values';
import ParameterScope from './ParameterScope';
export default class ReturnValueScope extends ParameterScope {
    constructor() {
        super(...arguments);
        this.returnExpressions = [];
        this.returnExpression = null;
        this.bound = false;
    }
    addReturnExpression(expression) {
        this.returnExpressions.push(expression);
    }
    bind() {
        this.bound = true;
        if (this.returnExpressions.length === 1) {
            this.returnExpression = this.returnExpressions[0];
        }
        else {
            this.returnExpression = UNKNOWN_EXPRESSION;
            for (const expression of this.returnExpressions) {
                expression.reassignPath(UNKNOWN_PATH, NEW_EXECUTION_PATH);
            }
        }
    }
    forEachReturnExpressionWhenCalled(_callOptions, callback, options) {
        if (!this.bound)
            this.bind();
        callback(options, this.returnExpression);
    }
    someReturnExpressionWhenCalled(_callOptions, predicateFunction, options) {
        if (!this.bound)
            this.bind();
        return predicateFunction(options, this.returnExpression);
    }
}
