import { renderStatementList } from '../../utils/renderHelpers';
import { NodeBase } from './shared/Node';
export default class Program extends NodeBase {
    hasEffects(options) {
        for (const node of this.body) {
            if (node.hasEffects(options))
                return true;
        }
    }
    include() {
        this.included = true;
        for (const node of this.body) {
            if (node.shouldBeIncluded())
                node.include();
        }
    }
    render(code, options) {
        if (this.body.length) {
            renderStatementList(this.body, code, this.start, this.end, options);
        }
        else {
            super.render(code, options);
        }
    }
}
