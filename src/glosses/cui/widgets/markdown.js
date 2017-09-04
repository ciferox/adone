const {
    terminal
} = adone;
const marked = require("marked");
const TerminalRenderer = require("marked-terminal");

export default class Markdown extends terminal.widget.Element {
    constructor(options = {}) {
        if (options.style) {
            for (const st in options.style) {
                if (typeof (options.style[st]) !== "string") {
                    continue;
                }

                const tokens = options.style[st].split(".");
                options.style[st] = terminal.style;
                for (let j = 1; j < tokens.length; j++) {
                    options.style[st] = options.style[st][tokens[j]];
                }
            }
        }
        super(options);
        this.setOptions(options.style);
        if (options.markdown) {
            this.setMarkdown(options.markdown);
        }
    }

    setOptions(style) {
        marked.setOptions({
            renderer: new TerminalRenderer(style)
        });
    }

    setMarkdown(str) {
        this.setContent(marked(str));
    }

    getOptionsPrototype() {
        return {
            markdown: "string"
        };
    }
}
Markdown.prototype.type = "markdown";
