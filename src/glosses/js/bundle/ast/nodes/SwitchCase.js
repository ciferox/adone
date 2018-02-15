import { NodeBase } from "./shared/Node";
import { findFirstOccurrenceOutsideComment, renderStatementList } from "../../utils/renderHelpers";
export default class SwitchCase extends NodeBase {
    includeInBundle() {
        let addedNewNodes = !this.included;
        this.included = true;
        if (this.test && this.test.includeInBundle()) {
            addedNewNodes = true;
        }
        this.consequent.forEach((node) => {
            if (node.shouldBeIncluded()) {
                if (node.includeInBundle()) {
                    addedNewNodes = true;
                }
            }
        });
        return addedNewNodes;
    }

    render(code, options) {
        if (this.consequent.length) {
            const testEnd = this.test
                ? this.test.end
                : findFirstOccurrenceOutsideComment(code.original, "default", this.start) + 7;
            const consequentStart = findFirstOccurrenceOutsideComment(code.original, ":", testEnd) + 1;
            renderStatementList(this.consequent, code, consequentStart, this.end, options);
        } else {
            super.render(code, options);
        }
    }
}
