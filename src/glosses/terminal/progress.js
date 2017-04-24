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

    const current = terminal.getCursorPos();
    // did not reach the end, the screen need not scroll up
    if (current.row < terminal.rows) {
        return;
    }

    let minRow = 1;

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

    // append empty row for the new lines, the screen will scroll up,
    // then we can move the bars to their's new position.
    terminal.moveTo(current.row - 1, current.col - 1).write("\n".repeat(count));

    instances.forEach((instance) => {
        if (instance.rendered && (!instance.completed || instance.tough)) {
            instance.print(instance.output);
        }
    });

    terminal.moveTo(current.row - count - 1, current.col - 1);

    endUpdate();
};

adone.stream.newlineCounter.install(terminal.output);
terminal.output.on("newlines:before", newlineHandler);
adone.stream.newlineCounter.install(process.stderr);
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
    constructor({ total = 100, current = 0, width = 60, tough = false, clean = false, spinner = "dots", spinnerComplete = approx(symbol.tick), blank = "—", filled = approx(symbol.square), callback, schema } = {}) {
        this.total = total;
        this.current = current;
        this.width = width;
        this.start = null;
        this.origin = null;

        if (is.string(this.width)) {
            if (this.width.endsWith("%")) {
                this.width = parseFloat(this.width) / 100 % 1;
            } else {
                this.width = parseFloat(this.width);
            }
        }

        this.tough = Boolean(tough);
        this.clean = Boolean(clean);
        this.spinner = adone.text.spinner[spinner] || adone.text.spinner.dots;
        this.spinnerComplete = spinnerComplete;
        this.spinnerFrame = 0;
        this.spinnerTimer = null;
        this.chars = {
            blank,
            filled
        };

        this.completed = this.current >= this.total;

        // callback on completed
        this.callback = callback;

        this.setSchema(schema);
        this.snoop();

        instances.push(this);
    }

    setSchema(schema = " [:bar] :current/:total :percent :elapsed :eta", refresh = false) {
        this.schema = schema;

        if (!is.null(this.spinnerTimer)) {
            clearInterval(this.spinnerTimer);
            this.spinnerTimer = null;
        }

        if (!this.completed && schema.indexOf(":spinner") >= 0) {
            this.spinnerTimer = setInterval(() => {
                this.spinnerFrame++;
                this.update(this.current / this.total);
            }, this.spinner.interval);
        }

        if (refresh) {
            this.compile(refresh);
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
            delta = parseFloat(delta);
            if (isNaN(delta) || !isFinite(delta)) {
                delta = 1;
            }
        }

        if (this.completed && delta >= 0) {
            return;
        }

        if (is.null(this.start)) {
            this.start = new Date();
        }

        this.current += delta;
        this.completed = this.current >= this.total;
        this.compile(tokens);
        this.snoop();
    }

    update(ratio, tokens) {
        const completed = Math.floor(ratio * this.total);
        const delta = completed - this.current;

        this.tick(delta, tokens);
    }

    compile(tokens) {
        const ratio = Math.min(Math.max(this.current / this.total, 0), 1);
        const chars = this.chars;
        const percent = ratio * 100;
        const elapsed = new Date() - this.start;
        let eta;

        if (this.current <= 0) {
            eta = "-";
        } else {
            eta = adone.util.humanizeTime(percent === 100 ? 0 : elapsed * this.total / this.current);
        }

        let output = this.schema
            .replace(/:total/g, this.total)
            .replace(/:current/g, this.current)
            .replace(/:elapsed/g, adone.util.humanizeTime(elapsed))
            .replace(/:eta/g, eta)
            .replace(/:percent/g, `${toFixed(percent, 0)}%`);

        if (tokens && typeof tokens === "object") {
            for (const key in tokens) {
                if (tokens.hasOwnProperty(key)) {
                    output = output.replace(new RegExp(`:${key}`, "g"), (String(tokens[key])) || placeholder);
                }
            }
        }

        let raw = output; // !!! not raw here
        const cols = terminal.cols;
        let width = this.width;

        width = width < 1 ? cols * width : width;
        width = Math.min(width, Math.max(0, cols - bareLength(raw)));

        const length = Math.round(width * ratio);
        let spinner;
        if (!this.completed) {
            spinner = this.spinner.frames[this.spinnerFrame % this.spinner.frames.length];
        } else {
            spinner = this.spinnerComplete;
        }
        const filled = chars.filled.repeat(length);
        const blank = chars.blank.repeat(width - length);

        raw = combine(raw, spinner, filled, blank, true);
        output = combine(output, spinner, filled, blank, false);

        // without color and font styles
        this.raw = raw;
        // row count of the progress bar
        this.rows = raw.split("\n").length;

        this.render(output);
    }

    render(output) {
        if (this.output === output) {
            return;
        }

        const current = terminal.getCursorPos();
        if (is.undefined(current)) {
            return;
        }

        beginUpdate();

        this.savedPos = current;
        if (is.null(this.origin)) {
            this.origin = current;
        }

        if (this.origin.row === terminal.rows) {
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
            terminal.moveTo(current.row - 1, current.col - 1);
        }

        this.output = output;
        this.rendered = true;

        endUpdate();
    }

    print(output) {
        terminal.moveTo(this.origin.row - 1, this.origin.col - 1);
        const content = output.replace(new RegExp(placeholder, "g"), "");
        if (content !== "") {
            terminal.print(content);
        }
        terminal.write("\n");
    }

    clear() {
        if (this.output) {
            terminal.moveTo(this.origin.row - 1, this.origin.col - 1);
            for (let i = 0; i < this.rows; i++) {
                terminal.eraseLine().down();
            }
            terminal.moveTo(this.origin.row - 1, this.origin.col - 1);
        }
    }

    snoop() {
        if (this.completed) {
            if (!is.null(this.spinnerTimer)) {
                clearInterval(this.spinnerTimer);
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
        terminal.moveTo(this.savedPos.row - 1, this.savedPos.col - 1);
        const index = instances.indexOf(this);
        if (index >= 0) {
            instances.splice(index, 1);
        }
    }
}
