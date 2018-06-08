import { findFirstOccurrenceOutsideComment, renderStatementList } from '../../utils/renderHelpers';
import { NodeBase } from './shared/Node';
export default class SwitchCase extends NodeBase {
    include() {
        this.included = true;
        if (this.test)
            this.test.include();
        for (const node of this.consequent) {
            if (node.shouldBeIncluded())
                node.include();
        }
    }
    render(code, options) {
        if (this.consequent.length) {
            this.test && this.test.render(code, options);
            const testEnd = this.test
                ? this.test.end
                : findFirstOccurrenceOutsideComment(code.original, 'default', this.start) + 7;
            const consequentStart = findFirstOccurrenceOutsideComment(code.original, ':', testEnd) + 1;
            renderStatementList(this.consequent, code, consequentStart, this.end, options);
        }
        else {
            super.render(code, options);
        }
    }
}
