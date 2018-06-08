import { NodeBase } from './shared/Node';
export default class ThisExpression extends NodeBase {
    bind() {
        super.bind();
        this.variable = this.scope.findVariable('this');
    }
    hasEffectsWhenAccessedAtPath(path, options) {
        return path.length > 0 && this.variable.hasEffectsWhenAccessedAtPath(path, options);
    }
    hasEffectsWhenAssignedAtPath(path, options) {
        return this.variable.hasEffectsWhenAssignedAtPath(path, options);
    }
    initialise() {
        this.included = false;
        this.variable = null;
        this.alias = this.scope.findLexicalBoundary().isModuleScope ? this.context.moduleContext : null;
        if (this.alias === 'undefined') {
            this.context.warn({
                code: 'THIS_IS_UNDEFINED',
                message: `The 'this' keyword is equivalent to 'undefined' at the top level of an ES module, and has been rewritten`,
                url: `https://github.com/rollup/rollup/wiki/Troubleshooting#this-is-undefined`
            }, this.start);
        }
    }
    render(code, _options) {
        if (this.alias !== null) {
            code.overwrite(this.start, this.end, this.alias, {
                storeName: true,
                contentOnly: false
            });
        }
    }
}
