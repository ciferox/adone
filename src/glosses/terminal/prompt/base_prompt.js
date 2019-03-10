const {
    is,
    lodash: _,
    terminal,
    event,
    text: { unicode: { approx, symbol } },
    cli: { kit }
} = adone;

const {
    chalk
} = terminal;

const height = (content) => content.split("\n").length;
const lastLine = (content) => _.last(content.split("\n"));
const breakLines = (lines, width) => {
    // Break lines who're longuer than the cli width so we can normalize the natural line returns behavior accross terminals.
    const regex = new RegExp(
        `(?:(?:\\033[[0-9;]*m)*.?){1,${width}}`,
        "g"
    );
    return lines.map((line) => {
        const chunk = line.match(regex);
        // last match is always empty
        chunk.pop();
        return chunk || "";
    });
};

const forceLineReturn = (content, width) => _.flatten(breakLines(content.split("\n"), width)).join("\n");

class Observer extends event.Emitter {
    constructor(term) {
        super();
        this.readline = term.readline;
        this.keypressHandler = (value, key = {}) => {
            // Ignore `enter` key. On the readline, we only care about the `line` event.
            if (key.name === "enter" || key.name === "return") {
                return;
            }
            const event = { value, key };

            this.emit("keypress", event);

            if (key.name === "up" || key.name === "k" || (key.name === "p" && key.ctrl)) {
                this.emit("normalizedUpKey", event);
            }
            if (key.name === "down" || key.name === "j" || (key.name === "n" && key.ctrl)) {
                this.emit("normalizedDownKey", event);
            }
            if (value && value.length === 1 && is.digits(value)) {
                this.emit("numberKey", Number(value));
            }
            if (key.name === "space") {
                this.emit("spaceKey", event);
            }
            if (key.name === "a") {
                this.emit("aKey", event);
            }
            if (key.name === "i") {
                this.emit("iKey", event);
            }
        };

        this.lineHandler = (input) => {
            this.emit("line", input);
        };

        this.readline.input.on("keypress", this.keypressHandler);
        this.readline.on("line", this.lineHandler);
    }

    destroy() {
        this.readline.input.removeListener("keypress", this.keypressHandler);
        this.readline.removeListener("line", this.lineHandler);
        this.removeAllListeners();
    }
}

class ScreenManager {
    constructor(term) {
        this.term = term;

        // These variables are keeping information to allow correct prompt re-rendering
        this.height = 0;
        this.extraLinesUnderPrompt = 0;

        this.rl = this.term.readline;
    }

    render(content, bottomContent) {
        this.rl.output.unmute();
        this.clean(this.extraLinesUnderPrompt);

        /**
         * Write message to screen and setPrompt to control backspace
         */

        const promptLine = lastLine(content);
        const rawPromptLine = adone.text.stripAnsi(promptLine);

        // Remove the rl.line from our prompt. We can't rely on the content of
        // rl.line (mainly because of the password prompt), so just rely on it's
        // length.
        let prompt = rawPromptLine;
        if (this.rl.line.length) {
            prompt = prompt.slice(0, -this.rl.line.length);
        }
        this.rl.setPrompt(prompt);

        // setPrompt will change cursor position, now we can get correct value
        const cursorPos = this.rl._getCursorPos();
        const width = this.normalizedCliWidth();

        content = forceLineReturn(content, width);
        if (bottomContent) {
            bottomContent = forceLineReturn(bottomContent, width);
        }
        // Manually insert an extra line if we're at the end of the line.
        // This prevent the cursor from appearing at the beginning of the
        // current line.
        if (rawPromptLine.length % width === 0) {
            content += "\n";
        }
        const fullContent = content + (bottomContent ? `\n${bottomContent}` : "");
        this.term.output.write(fullContent);

        /**
         * Re-adjust the cursor at the correct position.
         */

        // We need to consider parts of the prompt under the cursor as part of the bottom
        // content in order to correctly cleanup and re-render.
        const promptLineUpDiff = Math.floor(rawPromptLine.length / width) - cursorPos.rows;
        const bottomContentHeight = promptLineUpDiff + (bottomContent ? height(bottomContent) : 0);
        if (bottomContentHeight > 0) {
            this.term.up(bottomContentHeight);
        }

        // Reset cursor at the beginning of the line
        this.term.left(adone.text.width(lastLine(fullContent)));

        // Adjust cursor on the right
        if (cursorPos.cols > 0) {
            this.term.right(cursorPos.cols);
        }

        /**
         * Set up state for next re-rendering
         */
        this.extraLinesUnderPrompt = bottomContentHeight;
        this.height = height(fullContent);

        this.rl.output.mute();
    }

    clean(extraLines) {
        if (extraLines > 0) {
            this.term.down(extraLines);
        }
        this.term.eraseLines(this.height);
    }

    done() {
        this.rl.setPrompt("");
        this.rl.output.unmute();
        this.term.output.write("\n");
    }

    releaseCursor() {
        if (this.extraLinesUnderPrompt > 0) {
            this.term.down(this.extraLinesUnderPrompt);
        }
    }

    normalizedCliWidth() {
        const width = this.term.stats.cols;
        return width;
    }

    breakLines(lines, width) {
        // Break lines who're longer than the cli width so we can normalize the natural line
        // returns behavior across terminals.
        width = width || this.normalizedCliWidth();
        const regex = new RegExp(`(?:(?:\\033[[0-9;]*m)*.?){1,${width}}`, "g");
        return lines.map((line) => {
            const chunk = line.match(regex);
            // Last match is always empty
            chunk.pop();
            return chunk || "";
        });
    }

    forceLineReturn(content, width) {
        width = width || this.normalizedCliWidth();
        return _.flatten(this.breakLines(content.split("\n"), width)).join("\n");
    }
}

export default class BasePrompt {
    constructor(term, question, answers) {
        this.term = term;

        // Setup instance defaults property
        Object.assign(this, {
            answers,
            status: "pending"
        });

        // Set defaults prompt options
        this.opt = _.defaults(_.clone(question), {
            validate() {
                return true;
            },
            filter(val) {
                return val;
            },
            when() {
                return true;
            },
            suffix: "",
            prefix: {
                default: kit.theme.focus("?"),
                answered: kit.theme.primary(approx(symbol.tick))
            },
            spinner: "dots"
        });

        this.spinner = {
            instance: adone.text.spinner[this.opt.spinner || "dots"],
            frame: 0,
            timer: null
        };

        // Check to make sure prompt requirements are there
        if (!this.opt.message) {
            this.throwParamError("message");
        }
        if (!this.opt.name) {
            this.throwParamError("name");
        }

        this.screen = new ScreenManager(this.term);
    }

    /**
     * Start the Inquiry session and manage output value filtering
     * @return {Promise}
     */
    run() {
        return new Promise((resolve) => {
            this._run((value) => {
                resolve(value);
            });
        });
    }

    // default noop (this one should be overwritten in prompts)
    _run(cb) {
        cb();
    }

    /**
     * Throw an error telling a required parameter is missing
     * @param  {String} name Name of the missing param
     * @return {Throw Error}
     */
    throwParamError(name) {
        throw new Error(`You must provide a \`${name}\` parameter`);
    }

    /**
     * Called when the UI closes. Override to do any specific cleanup necessary
     */
    close() {
        this.screen.releaseCursor();
    }

    async validate(value) {
        const prevStatus = this.status;
        try {
            this.status = "validating";
            if (is.null(this.spinner.timer)) {
                this.spinner.timer = adone.setInterval(() => {
                    this.spinner.frame++;
                    this.render();
                }, this.spinner.instance.interval);
            }
            this.render(); // we need redraw message content to display valid status
            const filteredValue = await this.opt.filter(value, this.answers);
            const isValid = await this.opt.validate(filteredValue, this.answers);
            return { isValid, value: filteredValue };
        } catch (err) {
            return { isValid: err };
        } finally {
            this.status = prevStatus;
            if (!is.null(this.spinner.timer)) {
                adone.clearInterval(this.spinner.timer);
                this.spinner.timer = null;
            }
        }
    }

    observe() {
        return new Observer(this.term);
    }

    /**
     * Generate the prompt question string
     * @return {String} prompt question string
     */
    getQuestion() {
        let prefixCh;
        if (is.string(this.opt.prefix)) {
            prefixCh = this.opt.prefix;
        } else {
            if (this.status === "answered") {
                prefixCh = this.opt.prefix.answered;
            } else if (this.status === "validating") {
                prefixCh = this.spinner.instance.frames[this.spinner.frame % this.spinner.instance.frames.length];
            } else {
                prefixCh = this.opt.prefix.default;
            }
        }

        let message = `${prefixCh} ${chalk.bold(this.opt.message)}${this.opt.suffix}${chalk.reset(" ")}`;

        // Append the default if available, and if question isn't answered
        if (is.exist(this.opt.default) && this.status !== "answered") {
            message += this.term.theme.inactive(`(${this.opt.default}) `);
        }

        return message;
    }
}
