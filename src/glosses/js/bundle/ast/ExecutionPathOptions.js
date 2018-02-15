import Immutable from "immutable";
export var OptionTypes;
(function (OptionTypes) {
    OptionTypes[OptionTypes.IGNORED_LABELS = 0] = "IGNORED_LABELS";
    OptionTypes[OptionTypes.ACCESSED_NODES = 1] = "ACCESSED_NODES";
    OptionTypes[OptionTypes.ARGUMENTS_VARIABLES = 2] = "ARGUMENTS_VARIABLES";
    OptionTypes[OptionTypes.ASSIGNED_NODES = 3] = "ASSIGNED_NODES";
    OptionTypes[OptionTypes.IGNORE_BREAK_STATEMENTS = 4] = "IGNORE_BREAK_STATEMENTS";
    OptionTypes[OptionTypes.IGNORE_RETURN_AWAIT_YIELD = 5] = "IGNORE_RETURN_AWAIT_YIELD";
    OptionTypes[OptionTypes.NODES_CALLED_AT_PATH_WITH_OPTIONS = 6] = "NODES_CALLED_AT_PATH_WITH_OPTIONS";
    OptionTypes[OptionTypes.REPLACED_VARIABLE_INITS = 7] = "REPLACED_VARIABLE_INITS";
    OptionTypes[OptionTypes.RETURN_EXPRESSIONS_ACCESSED_AT_PATH = 8] = "RETURN_EXPRESSIONS_ACCESSED_AT_PATH";
    OptionTypes[OptionTypes.RETURN_EXPRESSIONS_ASSIGNED_AT_PATH = 9] = "RETURN_EXPRESSIONS_ASSIGNED_AT_PATH";
    OptionTypes[OptionTypes.RETURN_EXPRESSIONS_CALLED_AT_PATH = 10] = "RETURN_EXPRESSIONS_CALLED_AT_PATH";
})(OptionTypes || (OptionTypes = {}));
export const RESULT_KEY = {};
export default class ExecutionPathOptions {
    static create() {
        return new this(Immutable.Map());
    }

    constructor(optionValues) {
        this.optionValues = optionValues;
    }

    get(option) {
        return this.optionValues.get(option);
    }

    remove(option) {
        return new ExecutionPathOptions(this.optionValues.remove(option));
    }

    set(option, value) {
        return new ExecutionPathOptions(this.optionValues.set(option, value));
    }

    setIn(optionPath, value) {
        return new ExecutionPathOptions(this.optionValues.setIn(optionPath, value));
    }

    addAccessedNodeAtPath(path, node) {
        return this.setIn([OptionTypes.ACCESSED_NODES, node, ...path, RESULT_KEY], true);
    }

    addAccessedReturnExpressionAtPath(path, callExpression) {
        return this.setIn([
            OptionTypes.RETURN_EXPRESSIONS_ACCESSED_AT_PATH,
            callExpression,
            ...path,
            RESULT_KEY
        ], true);
    }

    addAssignedNodeAtPath(path, node) {
        return this.setIn([OptionTypes.ASSIGNED_NODES, node, ...path, RESULT_KEY], true);
    }

    addAssignedReturnExpressionAtPath(path, callExpression) {
        return this.setIn([
            OptionTypes.RETURN_EXPRESSIONS_ASSIGNED_AT_PATH,
            callExpression,
            ...path,
            RESULT_KEY
        ], true);
    }

    addCalledNodeAtPathWithOptions(path, node, callOptions) {
        return this.setIn([
            OptionTypes.NODES_CALLED_AT_PATH_WITH_OPTIONS,
            node,
            ...path,
            RESULT_KEY,
            callOptions
        ], true);
    }

    addCalledReturnExpressionAtPath(path, callExpression) {
        return this.setIn([
            OptionTypes.RETURN_EXPRESSIONS_CALLED_AT_PATH,
            callExpression,
            ...path,
            RESULT_KEY
        ], true);
    }

    getArgumentsVariables() {
        return (this.get(OptionTypes.ARGUMENTS_VARIABLES) || []);
    }

    getHasEffectsWhenCalledOptions() {
        return this.setIgnoreReturnAwaitYield()
            .setIgnoreBreakStatements(false)
            .setIgnoreNoLabels();
    }

    getReplacedVariableInit(variable) {
        return this.optionValues.getIn([OptionTypes.REPLACED_VARIABLE_INITS, variable]);
    }

    hasNodeBeenAccessedAtPath(path, node) {
        return this.optionValues.getIn([
            OptionTypes.ACCESSED_NODES,
            node,
            ...path,
            RESULT_KEY
        ]);
    }

    hasNodeBeenAssignedAtPath(path, node) {
        return this.optionValues.getIn([
            OptionTypes.ASSIGNED_NODES,
            node,
            ...path,
            RESULT_KEY
        ]);
    }

    hasNodeBeenCalledAtPathWithOptions(path, node, callOptions) {
        const previousCallOptions = this.optionValues.getIn([
            OptionTypes.NODES_CALLED_AT_PATH_WITH_OPTIONS,
            node,
            ...path,
            RESULT_KEY
        ]);
        return (previousCallOptions &&
            previousCallOptions.find((_, otherCallOptions) => otherCallOptions.equals(callOptions)));
    }

    hasReturnExpressionBeenAccessedAtPath(path, callExpression) {
        return this.optionValues.getIn([
            OptionTypes.RETURN_EXPRESSIONS_ACCESSED_AT_PATH,
            callExpression,
            ...path,
            RESULT_KEY
        ]);
    }

    hasReturnExpressionBeenAssignedAtPath(path, callExpression) {
        return this.optionValues.getIn([
            OptionTypes.RETURN_EXPRESSIONS_ASSIGNED_AT_PATH,
            callExpression,
            ...path,
            RESULT_KEY
        ]);
    }

    hasReturnExpressionBeenCalledAtPath(path, callExpression) {
        return this.optionValues.getIn([
            OptionTypes.RETURN_EXPRESSIONS_CALLED_AT_PATH,
            callExpression,
            ...path,
            RESULT_KEY
        ]);
    }

    ignoreBreakStatements() {
        return this.get(OptionTypes.IGNORE_BREAK_STATEMENTS);
    }

    ignoreLabel(labelName) {
        return this.optionValues.getIn([OptionTypes.IGNORED_LABELS, labelName]);
    }

    ignoreReturnAwaitYield() {
        return this.get(OptionTypes.IGNORE_RETURN_AWAIT_YIELD);
    }

    replaceVariableInit(variable, init) {
        return this.setIn([OptionTypes.REPLACED_VARIABLE_INITS, variable], init);
    }

    setArgumentsVariables(variables) {
        return this.set(OptionTypes.ARGUMENTS_VARIABLES, variables);
    }

    setIgnoreBreakStatements(value = true) {
        return this.set(OptionTypes.IGNORE_BREAK_STATEMENTS, value);
    }

    setIgnoreLabel(labelName) {
        return this.setIn([OptionTypes.IGNORED_LABELS, labelName], true);
    }

    setIgnoreNoLabels() {
        return this.remove(OptionTypes.IGNORED_LABELS);
    }

    setIgnoreReturnAwaitYield(value = true) {
        return this.set(OptionTypes.IGNORE_RETURN_AWAIT_YIELD, value);
    }
}
