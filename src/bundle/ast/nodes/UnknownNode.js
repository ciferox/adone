import { NodeBase } from './shared/Node';
export default class UnknownNode extends NodeBase {
    hasEffects(_options) {
        return true;
    }
}
