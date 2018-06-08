import { NodeBase } from './shared/Node';
export default class VariableDeclarator extends NodeBase {
    declareDeclarator(kind) {
        this.id.declare(kind, this.init);
    }
    reassignPath(path, options) {
        this.id.reassignPath(path, options);
    }
}
