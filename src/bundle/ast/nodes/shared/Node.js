import { locate } from 'locate-character';
import { NEW_EXECUTION_PATH } from '../../ExecutionPathOptions';
import { getAndCreateKeys, keys } from '../../keys';
import { UNKNOWN_EXPRESSION, UNKNOWN_VALUE } from '../../values';
export class NodeBase {
    constructor(esTreeNode, 
    // we need to pass down the node constructors to avoid a circular dependency
    parent, parentScope) {
        this.keys = keys[esTreeNode.type] || getAndCreateKeys(esTreeNode);
        this.parent = parent;
        this.context = parent.context;
        this.createScope(parentScope);
        this.parseNode(esTreeNode);
        this.initialise();
        this.context.magicString.addSourcemapLocation(this.start);
        this.context.magicString.addSourcemapLocation(this.end);
    }
    /**
     * Override this to bind assignments to variables and do any initialisations that
     * require the scopes to be populated with variables.
     */
    bind() {
        for (const key of this.keys) {
            const value = this[key];
            if (value === null)
                continue;
            if (Array.isArray(value)) {
                for (const child of value) {
                    if (child !== null)
                        child.bind();
                }
            }
            else {
                value.bind();
            }
        }
    }
    /**
     * Override if this node should receive a different scope than the parent scope.
     */
    createScope(parentScope) {
        this.scope = parentScope;
    }
    declare(_kind, _init) { }
    forEachReturnExpressionWhenCalledAtPath(_path, _callOptions, _callback, _options) { }
    getLiteralValueAtPath(_path, _options) {
        return UNKNOWN_VALUE;
    }
    hasEffects(options) {
        for (const key of this.keys) {
            const value = this[key];
            if (value === null)
                continue;
            if (Array.isArray(value)) {
                for (const child of value) {
                    if (child !== null && child.hasEffects(options))
                        return true;
                }
            }
            else if (value.hasEffects(options))
                return true;
        }
        return false;
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
    include() {
        this.included = true;
        for (const key of this.keys) {
            const value = this[key];
            if (value === null)
                continue;
            if (Array.isArray(value)) {
                for (const child of value) {
                    if (child !== null)
                        child.include();
                }
            }
            else {
                value.include();
            }
        }
    }
    includeWithAllDeclaredVariables() {
        this.include();
    }
    /**
     * Override to perform special initialisation steps after the scope is initialised
     */
    initialise() {
        this.included = false;
    }
    insertSemicolon(code) {
        if (code.original[this.end - 1] !== ';') {
            code.appendLeft(this.end, ';');
        }
    }
    locate() {
        // useful for debugging
        const location = locate(this.context.code, this.start, { offsetLine: 1 });
        location.file = this.context.fileName;
        location.toString = () => JSON.stringify(location);
        return location;
    }
    parseNode(esTreeNode) {
        for (const key of Object.keys(esTreeNode)) {
            // That way, we can override this function to add custom initialisation and then call super.parseNode
            if (this.hasOwnProperty(key))
                continue;
            const value = esTreeNode[key];
            if (typeof value !== 'object' || value === null) {
                this[key] = value;
            }
            else if (Array.isArray(value)) {
                this[key] = [];
                for (const child of value) {
                    this[key].push(child === null
                        ? null
                        : new (this.context.nodeConstructors[child.type] ||
                            this.context.nodeConstructors.UnknownNode)(child, this, this.scope));
                }
            }
            else {
                this[key] = new (this.context.nodeConstructors[value.type] ||
                    this.context.nodeConstructors.UnknownNode)(value, this, this.scope);
            }
        }
    }
    reassignPath(_path, _options) { }
    render(code, options) {
        for (const key of this.keys) {
            const value = this[key];
            if (value === null)
                continue;
            if (Array.isArray(value)) {
                for (const child of value) {
                    if (child !== null)
                        child.render(code, options);
                }
            }
            else {
                value.render(code, options);
            }
        }
    }
    shouldBeIncluded() {
        return this.included || this.hasEffects(NEW_EXECUTION_PATH);
    }
    someReturnExpressionWhenCalledAtPath(_path, _callOptions, predicateFunction, options) {
        return predicateFunction(options, UNKNOWN_EXPRESSION);
    }
    toString() {
        return this.context.code.slice(this.start, this.end);
    }
}
export { NodeBase as StatementBase };
