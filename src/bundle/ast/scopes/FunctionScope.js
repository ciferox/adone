import { UNKNOWN_EXPRESSION, UNKNOWN_OBJECT_EXPRESSION } from '../values';
import ArgumentsVariable from '../variables/ArgumentsVariable';
import ThisVariable from '../variables/ThisVariable';
import ReturnValueScope from './ReturnValueScope';
export default class FunctionScope extends ReturnValueScope {
    constructor(options = {}) {
        super(options);
        this.variables.arguments = new ArgumentsVariable(super.getParameterVariables());
        this.variables.this = new ThisVariable();
    }
    findLexicalBoundary() {
        return this;
    }
    getOptionsWhenCalledWith({ args, withNew }, options) {
        return options
            .replaceVariableInit(this.variables.this, withNew ? UNKNOWN_OBJECT_EXPRESSION : UNKNOWN_EXPRESSION)
            .setArgumentsVariables(args.map((parameter, index) => super.getParameterVariables()[index] || parameter));
    }
}
