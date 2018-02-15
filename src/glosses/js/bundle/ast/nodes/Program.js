import { NodeBase } from "./shared/Node";
import { renderStatementList } from "../../utils/renderHelpers";

export default class Program extends NodeBase {
    render(code, options) {
        if (this.body.length) {
            renderStatementList(this.body, code, this.start, this.end, options);
        } else {
            super.render(code, options);
        }
    }
}
