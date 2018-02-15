import { StatementBase } from "./shared/Node";
export default class EmptyStatement extends StatementBase {
    render(code, _options) {
        if (this.parent.type === "BlockStatement" /* BlockStatement */ ||
            this.parent.type === "Program" /* Program */) {
            code.remove(this.start, this.end);
        }
    }
}
