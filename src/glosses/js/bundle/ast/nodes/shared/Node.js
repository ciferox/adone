import { locate } from "locate-character";
import ExecutionPathOptions from "../../ExecutionPathOptions";
import { UNKNOWN_EXPRESSION, UNKNOWN_VALUE } from "../../values";

const {
    is
} = adone;

export class NodeBase {
    constructor() {
        this.keys = [];
    }

    bind() {
        this.bindChildren();
        this.bindNode();
    }

    /**
     * Override to control on which children "bind" is called.
     */
    bindChildren() {
        this.eachChild((child) => child.bind());
    }

    /**
     * Override this to bind assignments to variables and do any initialisations that
     * require the scopes to be populated with variables.
     */
    bindNode() { }

    eachChild(callback) {
        this.keys.forEach((key) => {
            const value = this[key];
            if (!value) {
                return;
            }
            if (is.array(value)) {
                value.forEach((child) => child && callback(child));
            } else {
                callback(value);
            }
        });
    }

    forEachReturnExpressionWhenCalledAtPath(_path, _callOptions, _callback, _options) { }

    getValue() {
        return UNKNOWN_VALUE;
    }

    hasEffects(options) {
        return this.someChild((child) => child.hasEffects(options));
    }

    hasEffectsWhenAccessedAtPath(path, _options) {
        return path.length > 0;
    }

    hasEffectsWhenAssignedAtPath(_path, _options) {
        return true;
    }

    hasEffectsWhenCalledAtPath(_path, _callOptions, _options) {
        return true;
    }

    hasIncludedChild() {
        return (this.included || this.someChild((child) => child.hasIncludedChild()));
    }

    includeInBundle() {
        let addedNewNodes = !this.included;
        this.included = true;
        this.eachChild((childNode) => {
            if (childNode.includeInBundle()) {
                addedNewNodes = true;
            }
        });
        return addedNewNodes;
    }

    includeWithAllDeclaredVariables() {
        return this.includeInBundle();
    }

    initialise(parentScope) {
        this.initialiseScope(parentScope);
        this.initialiseNode(parentScope);
        this.initialiseChildren(parentScope);
    }

    initialiseAndDeclare(_parentScope, _kind, _init) { }

    /**
     * Override to change how and with what scopes children are initialised
     */
    initialiseChildren(_parentScope) {
        this.eachChild((child) => child.initialise(this.scope));
    }

    /**
     * Override to perform special initialisation steps after the scope is initialised
     */
    initialiseNode(_parentScope) { }

    /**
     * Override if this scope should receive a different scope than the parent scope.
     */
    initialiseScope(parentScope) {
        this.scope = parentScope;
    }

    insertSemicolon(code) {
        if (code.original[this.end - 1] !== ";") {
            code.appendLeft(this.end, ";");
        }
    }

    locate() {
        // useful for debugging
        const location = locate(this.module.code, this.start, { offsetLine: 1 });
        location.file = this.module.id;
        location.toString = () => JSON.stringify(location);
        return location;
    }

    reassignPath(_path, _options) { }

    render(code, options) {
        this.eachChild((child) => child.render(code, options));
    }

    shouldBeIncluded() {
        return (this.hasIncludedChild() || this.hasEffects(ExecutionPathOptions.create()));
    }

    someChild(callback) {
        return this.keys.some((key) => {
            const value = this[key];
            if (!value) {
                return false;
            }
            if (is.array(value)) {
                return value.some((child) => child && callback(child));
            }
            return callback(value);
        });
    }

    someReturnExpressionWhenCalledAtPath(_path, _callOptions, predicateFunction, options) {
        return predicateFunction(options)(UNKNOWN_EXPRESSION);
    }

    toString() {
        return this.module.code.slice(this.start, this.end);
    }
}

export { NodeBase as StatementBase };
