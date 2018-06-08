import { UNKNOWN_EXPRESSION } from '../values';
import LocalVariable from './LocalVariable';
const getParameterVariable = (path, options) => {
    const firstArgNum = parseInt(path[0], 10);
    return ((firstArgNum < options.getArgumentsVariables().length &&
        options.getArgumentsVariables()[firstArgNum]) ||
        UNKNOWN_EXPRESSION);
};
export default class ArgumentsVariable extends LocalVariable {
    constructor(parameters) {
        super('arguments', null, UNKNOWN_EXPRESSION);
        this.parameters = parameters;
    }
    hasEffectsWhenAccessedAtPath(path, options) {
        return (path.length > 1 &&
            getParameterVariable(path, options).hasEffectsWhenAccessedAtPath(path.slice(1), options));
    }
    hasEffectsWhenAssignedAtPath(path, options) {
        return (path.length === 0 ||
            this.included ||
            getParameterVariable(path, options).hasEffectsWhenAssignedAtPath(path.slice(1), options));
    }
    hasEffectsWhenCalledAtPath(path, callOptions, options) {
        if (path.length === 0) {
            return true;
        }
        return getParameterVariable(path, options).hasEffectsWhenCalledAtPath(path.slice(1), callOptions, options);
    }
    reassignPath(path, options) {
        const firstArgNum = parseInt(path[0], 10);
        if (path.length > 0) {
            if (firstArgNum >= 0 && this.parameters[firstArgNum]) {
                this.parameters[firstArgNum].reassignPath(path.slice(1), options);
            }
        }
    }
    someReturnExpressionWhenCalledAtPath(path, callOptions, predicateFunction, options) {
        if (path.length === 0) {
            return true;
        }
        return getParameterVariable(path, options).someReturnExpressionWhenCalledAtPath(path.slice(1), callOptions, predicateFunction, options);
    }
}
