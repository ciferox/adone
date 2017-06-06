const { is } = adone;
import { Position } from "../util/location";
import { types as ct } from "./context";
import { types as tt } from "./types";

export default class State {
    init(options, input) {
        this.strict = options.strictMode === false ? false : options.sourceType === "module";

        this.input = input;

        this.potentialArrowAt = -1;

        this.inMethod =
            this.inFunction =
            this.inGenerator =
            this.inAsync =
            this.inPropertyName =
            this.inType =
            this.inClassProperty =
            this.noAnonFunctionType =
            false;

        this.labels = [];

        this.decorators = [];

        this.tokens = [];

        this.comments = [];

        this.trailingComments = [];
        this.leadingComments = [];
        this.commentStack = [];

        this.pos = this.lineStart = 0;
        this.curLine = options.startLine;

        this.type = tt.eof;
        this.value = null;
        this.start = this.end = this.pos;
        this.startLoc = this.endLoc = this.curPosition();

        this.lastTokEndLoc = this.lastTokStartLoc = null;
        this.lastTokStart = this.lastTokEnd = this.pos;

        this.context = [ct.braceStatement];
        this.exprAllowed = true;

        this.containsEsc = this.containsOctal = false;
        this.octalPosition = null;

        this.invalidTemplateEscapePosition = null;

        this.exportedIdentifiers = [];

        return this;
    }

    curPosition() {
        return new Position(this.curLine, this.pos - this.lineStart);
    }

    clone(skipArrays) {
        const state = new State();
        for (const key in this) {
            let val = this[key];

            if ((!skipArrays || key === "context") && is.array(val)) {
                val = val.slice();
            }

            state[key] = val;
        }
        return state;
    }
}
