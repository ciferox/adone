import BlockScope from "../scopes/BlockScope";
import { StatementBase } from "./shared/Node";
import { NO_SEMICOLON } from "../../module";

export const isForStatement = (node) => node.type === "ForStatement";

export default class ForStatement extends StatementBase {
    hasEffects(options) {
        return ((this.init && this.init.hasEffects(options)) ||
            (this.test && this.test.hasEffects(options)) ||
            (this.update && this.update.hasEffects(options)) ||
            this.body.hasEffects(options.setIgnoreBreakStatements()));
    }

    initialiseChildren() {
        if (this.init) {
            this.init.initialise(this.scope);
        }
        if (this.test) { 
            this.test.initialise(this.scope); 
        }
        if (this.update) {
            this.update.initialise(this.scope);
        }
        this.body.initialise(this.scope);
    }

    initialiseScope(parentScope) {
        this.scope = new BlockScope({ parent: parentScope });
    }

    render(code, options) {
        if (this.init) {
            this.init.render(code, options, NO_SEMICOLON);
        }
        if (this.test) {
            this.test.render(code, options, NO_SEMICOLON);
        }
        if (this.update) {
            this.update.render(code, options, NO_SEMICOLON); 
        }
        this.body.render(code, options);
    }
}
