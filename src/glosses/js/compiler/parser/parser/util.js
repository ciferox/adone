import { types as tt } from "../tokenizer/types";
import Tokenizer from "../tokenizer";
import { lineBreak } from "../util/whitespace";

const {
    is
} = adone;

// ## Parser utilities

export default class UtilParser extends Tokenizer {
    // TODO

    addExtra(node, key, val) {
        if (!node) {
            return;
        }

        const extra = (node.extra = node.extra || {});
        extra[key] = val;
    }

    // TODO

    isRelational(op) {
        return this.match(tt.relational) && this.state.value === op;
    }

    isLookaheadRelational(op) {
        const l = this.lookahead();
        return l.type == tt.relational && l.value == op;
    }

    // TODO

    expectRelational(op) {
        if (this.isRelational(op)) {
            this.next();
        } else {
            this.unexpected(null, tt.relational);
        }
    }

    // eat() for relational operators.

    eatRelational(op) {
        if (this.isRelational(op)) {
            this.next();
            return true;
        }
        return false;
    }

    // Tests whether parsed token is a contextual keyword.

    isContextual(name) {
        return (
            this.match(tt.name) &&
            this.state.value === name &&
            !this.state.containsEsc
        );
    }

    isLookaheadContextual(name) {
        const l = this.lookahead();
        return l.type === tt.name && l.value === name;
    }

    // Consumes contextual keyword if possible.

    eatContextual(name) {
        return this.isContextual(name) && this.eat(tt.name);
    }

    // Asserts that following token is given contextual keyword.

    expectContextual(name, message) {
        if (!this.eatContextual(name)) {
            this.unexpected(null, message);
        }
    }

    // Test whether a semicolon can be inserted at the current position.

    canInsertSemicolon() {
        return (
            this.match(tt.eof) ||
            this.match(tt.braceR) ||
            this.hasPrecedingLineBreak()
        );
    }

    hasPrecedingLineBreak() {
        return lineBreak.test(
            this.input.slice(this.state.lastTokEnd, this.state.start),
        );
    }

    // TODO

    isLineTerminator() {
        return this.eat(tt.semi) || this.canInsertSemicolon();
    }

    // Consume a semicolon, or, failing that, see if we are allowed to
    // pretend that there is a semicolon at this position.

    semicolon() {
        if (!this.isLineTerminator()) {
            this.unexpected(null, tt.semi);
        }
    }

    // Expect a token of a given type. If found, consume it, otherwise,
    // raise an unexpected token error at given pos.

    expect(type, pos) {
        this.eat(type) || this.unexpected(pos, type);
    }

    // Raise an unexpected token error. Can take the expected token type
    // instead of a message string.

    unexpected(
        pos,
        messageOrType = "Unexpected token",
    ) {
        if (!is.string(messageOrType)) {
            messageOrType = `Unexpected token, expected "${messageOrType.label}"`;
        }
        throw this.raise(!is.nil(pos) ? pos : this.state.start, messageOrType);
    }

    expectPlugin(name, pos) {
        if (!this.hasPlugin(name)) {
            throw this.raise(
                !is.nil(pos) ? pos : this.state.start,
                `This experimental syntax requires enabling the parser plugin: '${name}'`,
                { missingPluginNames: [name] },
            );
        }

        return true;
    }

    expectOnePlugin(names, pos) {
        if (!names.some((n) => this.hasPlugin(n))) {
            throw this.raise(
                !is.nil(pos) ? pos : this.state.start,
                `This experimental syntax requires enabling one of the following parser plugin(s): '${names.join(
                    ", ",
                )}'`,
                { missingPluginNames: names },
            );
        }
    }
}
