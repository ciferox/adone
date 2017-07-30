const { is, terminal, text: { unicode: { approx, symbol } } } = adone;

const placeholder = "\uFFFC";
let rendering = false;
const instances = [];

const beginUpdate = () => rendering = true;
const endUpdate = () => rendering = false;
const isUpdating = () => rendering === true;

const newlineHandler = (count) => {
    if (isUpdating() || instances.length === 0) {
        return;
    }

    const row = terminal.y;
    const col = terminal.x;

    let minRow = 0;

    beginUpdate();

    instances.forEach((instance) => {
        if (instance.rendered && (!instance.completed || instance.tough)) {
            // clear the rendered bar
            instance.clear();
            instance.origin.row = Math.max(minRow, instance.origin.row - count);
            minRow += instance.rows;
        } else if (instance.rendered && instance.completed && !instance.tough && !instance.archived && !instance.clean) {
            instance.clear();
            instance.origin.row = -instance.rows;
            instance.print(instance.output);
            instance.archived = true;
        }
    });

    // append empty row for the new lines, the screen will scroll up, then we can move the bars to their's new position.
    terminal.moveTo(row, col).write("\n".repeat(count));

    instances.forEach((instance) => {
        if (instance.rendered && (!instance.completed || instance.tough)) {
            instance.print(instance.output);
        }
    });

    terminal.moveTo(row - count, col);

    endUpdate();
};

terminal.output.on("newlines:before", newlineHandler);
process.stderr.on("newlines:before", newlineHandler);

const toFixed = (value, precision) => {
    const power = Math.pow(10, precision);
    return (Math.round(value * power) / power).toFixed(precision);
};

const combine = (output, spinner, filled, blank, bare) => {
    let bar = filled + blank;

    if (!bare) {
        spinner = spinner || placeholder;
        bar = bar || placeholder;
        blank = blank || placeholder;
        filled = filled || placeholder;
    }

    return output
        .replace(/:filled/g, filled)
        .replace(/:blank/g, blank)
        .replace(/:bar/g, bar)
        .replace(/:spinner/g, spinner);
};

const bareLength = (output) => {
    const str = output
        .replace(/:filled/g, "")
        .replace(/:blank/g, "")
        .replace(/:bar/g, "")
        .replace(/:spinner/g, "");

    return str.length;
};

export default class ProgressBar {
    constructor({
        total = 100,
        current = 0,
        width = 60,
        tough = false,
        clean = false,
        spinner = {
            active: "dots",
            completeOk: `{green-fg}${approx(symbol.tick)}{/}`,
            completeBad: `{red-fg}${approx(symbol.cross)}{/}`
        },
        timeFormatter = adone.util.humanizeTime,
        blank = "—",
        filled = approx(symbol.square),
        callback,
        schema
    } = {}) {
        this.total = total;
        this.current = current;
        this.width = width;
        this.start = null;
        this.origin = null;
        this.customTokens = null;
        this.output = null;

        if (is.string(this.width)) {
            if (this.width.endsWith("%")) {
                this.width = parseFloat(this.width) / 100 % 1;
            } else {
                this.width = parseFloat(this.width);
            }
        }

        this.tough = Boolean(tough);
        this.clean = Boolean(clean);
        this.spinner = {
            active: adone.text.spinner[spinner.active] || adone.text.spinner.dots,
            ok: spinner.completeOk,
            bad: spinner.completeBad,
            frame: 0,
            timer: null
        };
        this.timeFormatter = timeFormatter;
        this.chars = {
            blank,
            filled
        };

        this.completed = this.current >= this.total;

        // callback on completed
        this.callback = callback;

        terminal.trackCursor();

        this.setSchema(schema);
        this.snoop();

        instances.push(this);
    }

    setSchema(schema = " [:bar] :current/:total :percent :elapsed :eta") {
        this.schema = schema;

        if (!is.null(this.spinner.timer)) {
            adone.clearInterval(this.spinner.timer);
            this.spinner.timer = null;
        }

        if (!this.completed && schema.indexOf(":spinner") >= 0) {
            this.spinner.timer = adone.setInterval(() => {
                this.spinner.frame++;
                this.compile();
            }, this.spinner.active.interval);
        }
    }

    tick(delta, tokens) {
        const type = typeof (delta);

        if (type === "object") {
            tokens = delta;
            delta = 1;
        } else if (type === "undefined") {
            delta = 1;
        } else {
            const parsed = Number.parseFloat(delta);
            if (is.nan(parsed) || !is.finite(parsed)) {
                delta = 1;
            }
        }

        // if (this.completed && delta >= 0) {
        //     return;
        // }

        if (is.null(this.start)) {
            this.start = new adone.Date();
        }

        this.current += delta;
        this.completed = this.current >= this.total;
        if (is.plainObject(tokens)) {
            this.customTokens = Object.assign({ }, this.customTokens, tokens);
        }
        this.compile();
        this.snoop();
    }

    update(ratio, tokens) {
        const completed = Math.floor(ratio * this.total);
        const delta = completed - this.current;

        this.tick(delta, tokens);
    }

    complete(spinnerComplete = true, tokens) {
        if (is.string(spinnerComplete)) {
            this.spinner.complete = spinnerComplete;
        } else {
            this.spinner.complete = Boolean(spinnerComplete) === true ? this.spinner.ok : this.spinner.bad;
        }
        this.update(1, tokens);
    }

    compile() {
        const ratio = Math.min(Math.max(this.current / this.total, 0), 1);
        const chars = this.chars;
        const percent = ratio * 100;
        const elapsed = new adone.Date() - this.start;
        let eta;

        if (this.current <= 0) {
            eta = "-";
        } else {
            eta = this.timeFormatter(percent === 100 ? 0 : elapsed * this.total / this.current);
        }

        let output = this.schema;

        const tokens = this.customTokens;
        if (is.plainObject(tokens)) {
            for (const key in tokens) {
                if (tokens.hasOwnProperty(key)) {
                    output = output.replace(new RegExp(`:${key}`, "g"), (String(tokens[key])) || placeholder);
                }
            }
        }

        output = output
            .replace(/:total/g, this.total)
            .replace(/:current/g, this.current)
            .replace(/:elapsed/g, this.timeFormatter(elapsed))
            .replace(/:eta/g, eta)
            .replace(/:percent/g, `${toFixed(percent, 0)}%`);

        let result = output;
        const cols = terminal.cols;
        let width = this.width;

        width = width < 1 ? cols * width : width;
        width = Math.min(width, Math.max(0, cols - bareLength(result)));

        const length = Math.round(width * ratio);
        let spinner;
        if (!this.completed) {
            spinner = this.spinner.active.frames[this.spinner.frame % this.spinner.active.frames.length];
        } else {
            spinner = this.spinner.complete;
        }
        const filled = chars.filled.repeat(length);
        const blank = chars.blank.repeat(width - length);

        result = combine(result, spinner, filled, blank, true);
        output = combine(output, spinner, filled, blank, false);

        this.rows = result.split("\n").length;

        this.render(output);
    }

    render(output) {
        if (this.output === output) {
            return;
        }

        const current = {
            row: terminal.y,
            col: terminal.x
        };
        beginUpdate();

        if (is.null(this.origin)) {
            this.origin = current;
        }

        if (this.origin.row === (terminal.rows - 1)) {
            terminal.write("\n".repeat(this.rows));

            instances.forEach((instance) => {
                if (instance.origin) {
                    instance.origin.row -= this.rows;
                }
            });
        }

        this.clear();
        this.print(output);

        // move the cursor to the current position.
        if (this.rendered) {
            terminal.moveTo(current.row, current.col);
        }

        this.output = output;
        this.rendered = true;

        endUpdate();
    }

    print(output) {
        terminal.moveTo(this.origin.row, this.origin.col);
        const content = output.replace(new RegExp(placeholder, "g"), "");
        if (content !== "") {
            terminal.print(content);
        }
        terminal.write("\n");
    }

    clear() {
        if (!is.null(this.output)) {
            terminal.moveTo(this.origin.row, this.origin.col);
            for (let i = 0; i < this.rows; i++) {
                terminal.eraseLine().down();
            }
            terminal.moveTo(this.origin.row, this.origin.col);
        }
    }

    snoop() {
        if (this.completed) {
            if (!is.null(this.spinner.timer)) {
                adone.clearInterval(this.spinner.timer);
            }
            this.destroy();
        }

        return this.completed;
    }

    destroy() {
        if (this.clean && this.rendered) {
            this.clear();
        }

        this.callback && this.callback(this);
        const index = instances.indexOf(this);
        if (index >= 0) {
            instances.splice(index, 1);
        }
    }
}
