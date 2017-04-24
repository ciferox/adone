const { is, vendor: { lodash: _ }, terminal } = adone;
import runAsync from "./runasync";

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

class ScreenManager {
    constructor() {
        // These variables are keeping information to allow correct prompt re-rendering
        this.height = 0;
        this.extraLinesUnderPrompt = 0;

        this.rl = terminal.readline;
    }

    render(content, bottomContent) {
        this.rl.output.unmute();
        this.clean(this.extraLinesUnderPrompt);

        /**
         * Write message to screen and setPrompt to control backspace
         */

        const promptLine = lastLine(content);
        const rawPromptLine = adone.text.ansi.stripEscapeCodes(promptLine);

        // Remove the rl.line from our prompt. We can't rely on the content of
        // rl.line (mainly because of the password prompt), so just rely on it's
        // length.
        let prompt = promptLine;
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
        this.rl.output.write(fullContent);

        /**
         * Re-adjust the cursor at the correct position.
         */

        // We need to consider parts of the prompt under the cursor as part of the bottom
        // content in order to correctly cleanup and re-render.
        const promptLineUpDiff = Math.floor(rawPromptLine.length / width) - cursorPos.rows;
        const bottomContentHeight = promptLineUpDiff + (bottomContent ? height(bottomContent) : 0);
        if (bottomContentHeight > 0) {
            terminal.up(bottomContentHeight);
        }

        // Reset cursor at the beginning of the line
        terminal.left(adone.text.width(lastLine(fullContent)));

        // Adjust cursor on the right
        terminal.right(cursorPos.cols);

        /**
         * Set up state for next re-rendering
         */
        this.extraLinesUnderPrompt = bottomContentHeight;
        this.height = height(fullContent);

        this.rl.output.mute();
    }

    clean(extraLines) {
        if (extraLines > 0) {
            terminal.down(extraLines);
        }
        terminal.eraseLines(this.height);
    }

    done() {
        this.rl.setPrompt("");
        this.rl.output.unmute();
        this.rl.output.write("\n");
    }

    releaseCursor() {
        if (this.extraLinesUnderPrompt > 0) {
            terminal.down(this.extraLinesUnderPrompt);
        }
    }

    normalizedCliWidth() {
        const width = terminal.cols;
        if (process.platform === "win32") {
            return width - 1;
        }
        return width;
    }
}

export default class BasePrompt {
    constructor(question, rl, answers) {
        // Setup instance defaults property
        _.assign(this, {
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
            }
        });

        // Check to make sure prompt requirements are there
        if (!this.opt.message) {
            this.throwParamError("message");
        }
        if (!this.opt.name) {
            this.throwParamError("name");
        }

        // Normalize choices
        if (is.array(this.opt.choices)) {
            this.opt.choices = new terminal.Choices(this.opt.choices, answers);
        }

        this.screen = new ScreenManager();
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

    /**
     * Run the provided validation method each time a submit event occur.
     * @param  {Rx.Observable} submit - submit event flow
     * @return {Object}        Object containing two observables: `success` and `error`
     */
    handleSubmitEvents(submit) {
        const self = this;
        const validate = runAsync(this.opt.validate);
        const filter = runAsync(this.opt.filter);
        const validation = submit.flatMap((value) => {
            return filter(value).then((filteredValue) => {
                return validate(filteredValue, self.answers).then((isValid) => {
                    return { isValid, value: filteredValue };
                }, (err) => {
                    return { isValid: err };
                });
            }, (err) => {
                return { isValid: err };
            });
        }).share();

        const success = validation
            .filter((state) => {
                return state.isValid === true;
            })
            .take(1);

        const error = validation
            .filter((state) => {
                return state.isValid !== true;
            })
            .takeUntil(success);

        return {
            success,
            error
        };
    }

    /**
     * Generate the prompt question string
     * @return {String} prompt question string
     */
    getQuestion() {
        let message = `${terminal.green("?")} ${terminal.bold(this.opt.message)} `;

        // Append the default if available, and if question isn't answered
        if (this.opt.default != null && this.status !== "answered") {
            message += terminal.dim(`(${this.opt.default}) `);
        }

        return message;
    }
}
