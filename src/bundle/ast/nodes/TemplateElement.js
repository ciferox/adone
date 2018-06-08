import { NodeBase } from './shared/Node';
export default class TemplateElement extends NodeBase {
    hasEffects(_options) {
        return false;
    }
}
