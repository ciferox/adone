import CatchScope from '../scopes/CatchScope';
import { NodeBase } from './shared/Node';
export default class CatchClause extends NodeBase {
    createScope(parentScope) {
        this.scope = new CatchScope({ parent: parentScope });
    }
    initialise() {
        this.included = false;
        this.param.declare('parameter', null);
    }
    parseNode(esTreeNode) {
        this.body = new this.context.nodeConstructors.BlockStatement(esTreeNode.body, this, this.scope);
        super.parseNode(esTreeNode);
    }
}
CatchClause.prototype.preventChildBlockScope = true;
