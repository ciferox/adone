import ParameterVariable from '../variables/ParameterVariable';
import Scope from './Scope';
export default class ParameterScope extends Scope {
    constructor() {
        super(...arguments);
        this.parameters = [];
    }
    /**
     * Adds a parameter to this scope. Parameters must be added in the correct
     * order, e.g. from left to right.
     * @param {Identifier} identifier
     * @returns {Variable}
     */
    addParameterDeclaration(identifier) {
        const variable = new ParameterVariable(identifier);
        this.variables[identifier.name] = variable;
        this.parameters.push(variable);
        return variable;
    }
    getParameterVariables() {
        return this.parameters;
    }
}
