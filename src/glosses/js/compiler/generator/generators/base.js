export const File = function (node) {
    if (node.program) {
        // Print this here to ensure that Program node 'leadingComments' still
        // get printed after the hashbang.
        this.print(node.program.interpreter, node);
    }

    this.print(node.program, node);
};

export const Program = function (node) {
    this.printInnerComments(node, false);

    this.printSequence(node.directives, node);
    if (node.directives && node.directives.length) {
        this.newline();
    }

    this.printSequence(node.body, node);
};

export const BlockStatement = function (node) {
    this.token("{");
    this.printInnerComments(node);

    const hasDirectives = node.directives && node.directives.length;

    if (node.body.length || hasDirectives) {
        this.newline();

        this.printSequence(node.directives, node, { indent: true });
        if (hasDirectives) {
            this.newline();
        }

        this.printSequence(node.body, node, { indent: true });
        this.removeTrailingNewline();

        this.source("end", node.loc);

        if (!this.endsWith("\n")) {
            this.newline();
        }

        this.rightBrace();
    } else {
        this.source("end", node.loc);
        this.token("}");
    }
};

export const Noop = function () { };

export const Directive = function (node) {
    this.print(node.value, node);
    this.semicolon();
};

export const InterpreterDirective = function (node) {
    this.token(`#!${node.value}\n`);
};

export { StringLiteral as DirectiveLiteral } from "./types";
