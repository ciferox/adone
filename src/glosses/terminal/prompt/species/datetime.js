const {
    error,
    terminal
} = adone;


const yearTokens = new Set(["YY", "YYYY", "Y"]);
const monthTokens = new Set(["M", "Mo", "MM", "MMM", "MMMM"]);
const dayOfMonthTokens = new Set(["D", "Do", "DD", "DDD", "DDDo", "DDDD"]);
const hourTokens = new Set(["H", "HH", "h", "hh", "k", "kk"]);
const minuteTokens = new Set(["m", "mm"]);
const secondTokens = new Set(["s", "ss"]);
const formatTokens = new Set([
    ...yearTokens,
    ...monthTokens,
    ...dayOfMonthTokens,
    ...hourTokens,
    ...minuteTokens,
    ...secondTokens
]);

const isFormatToken = (s) => formatTokens.has(s);

const getSelector = (token) => {
    if (yearTokens.has(token)) {
        return "year";
    }
    if (monthTokens.has(token)) {
        return "month";
    }
    if (dayOfMonthTokens.has(token)) {
        return "date";
    }
    if (hourTokens.has(token)) {
        return "hour";
    }
    if (minuteTokens.has(token)) {
        return "minute";
    }
    if (secondTokens.has(token)) {
        return "second";
    }
    return null;
};

const mod = (a, q) => {
    let t = a % q;
    if (t < 0) {
        t += q;
    }
    return t;
};

const _getAddFunction = (token) => {
    const selector = getSelector(token);
    switch (selector) {
        case "year": {
            return (date, n) => date.year(date.year() + n);
        }
        case "month": {
            return (date, n) => date.month(mod(date.month() + n, 12));
        }
        case "date": {
            return (date, n) => date.date(1 + mod(date.date() - 1 + n, date.daysInMonth()));
        }
        case "hour": {
            return (date, n) => date.hour(mod(date.hour() + n, 24));
        }
        case "minute": {
            return (date, n) => date.minute(mod(date.minute() + n, 60));
        }
        case "second": {
            return (date, n) => date.second(mod(date.second() + n, 60));
        }
        default: {
            return adone.noop;
        }
    }
};

const maxLength = (maxNumberLength, f) => (date, n) => {
    const value = f(date, Number(n));
    return { hasNext: n.length < maxNumberLength, value };
};

const getSetFunction = (token) => {
    const selector = getSelector(token);
    switch (selector) {
        case "year": {
            switch (token) {
                case "YY": {
                    const setter = (date, n) => {
                        if (n >= 0) {
                            date.set("year", 2000 + n);
                        } else {
                            date.set("year", 1900 + n);
                        }
                        return date;
                    };
                    return maxLength(2, setter);
                }
                case "YYYY": {
                    const setter = (date, n) => date.set("year", n);
                    return maxLength(4, setter);
                }
            }
            break;
        }
        case "month": {
            const setter = (date, n) => date.set("month", Math.min(Math.max(1, n), 12) - 1);
            return maxLength(2, setter);
        }
        case "date": {
            const setter = (date, n) => {
                const k = date.daysInMonth();
                return date.set("date", Math.min(Math.max(n, 1), k));
            };
            return maxLength(2, setter);
        }
        case "hour": {
            if (token === "h" || token === "hh") {
                const setter = (date, n) => date.set("hour", Math.min(n, 11));
                return maxLength(2, setter);
            }
            const setter = (date, n) => date.set("hour", Math.min(n, 23));
            return maxLength(2, setter);
        }
        case "minute": {
            const setter = (date, n) => date.set("minute", Math.min(n, 59));
            return maxLength(2, setter);
        }
        case "second": {
            const setter = (date, n) => date.set("second", Math.min(n, 59));
            return maxLength(2, setter);
        }
        default: {
            return adone.noop;
        }
    }
};

class TokenState {
    constructor(token, intervals, range, values) {
        this.token = token;
        this.isFormat = isFormatToken(token);
        if (!this.isFormat) {
            return;
        }
        this.selector = getSelector(token);
        this.range = range;
        this.interval = intervals[this.selector] || 1;
        this.values = values[this.selector];

        if (this.values) {
            this.index = 0;
        } else {
            this._add = _getAddFunction(token);
        }
        this._set = getSetFunction(token);
    }

    add(date) {
        if (this.values) {
            ++this.index;
            if (this.index === this.values.length) {
                this.index = 0;
            }
            date = date.clone().set(this.selector, this.values[this.index]);
        } else {
            date = this._add(date.clone(), this.interval);
        }
        if (this.range.max) {
            date = adone.datetime.min(date, this.range.max);
        }
        if (this.range.min) {
            date = adone.datetime.max(date, this.range.min);
        }
        return date.clone();
    }

    sub(date) {
        if (this.values) {
            --this.index;
            if (this.index === -1) {
                this.index = this.values.length - 1;
            }
            date = date.clone().set(this.selector, this.values[this.index]);
        } else {
            date = this._add(date.clone(), -this.interval);
        }
        if (this.range.max) {
            date = adone.datetime.min(date, this.range.max);
        }
        if (this.range.min) {
            date = adone.datetime.max(date, this.range.min);
        }
        return date.clone();
    }

    set(date, n) {
        const data = this._set(date.clone(), n);
        if (this.range.max) {
            data.value = adone.datetime.min(data.value, this.range.max);
        }
        if (this.range.min) {
            data.value = adone.datetime.max(data.value, this.range.min);
        }
        data.value = data.value.clone();
        return data;
    }
}

const defaultFormat = ["DD", ".", "MM", ".", "YYYY", " ", "HH", ":", "mm", ":", "ss"];

export default class DatetimePrompt extends terminal.BasePrompt {
    constructor(term, question, answers) {
        const { default: defaultValue } = question;
        delete question.default;
        super(term, question, answers);
        this.selection = {
            index: -1,
            hasDefault: Boolean(defaultValue),
            date: defaultValue || adone.datetime()
        };

        const { intervals = {}, max, min, values = {} } = question;
        const range = { max, min };

        if (range.max && adone.datetime.max(this.selection.date, range.max) === this.selection.date) {
            throw new error.IllegalState("Default value is out of range");
        }

        if (range.min && adone.datetime.min(this.selection.date, range.min) === this.selection.date) {
            throw new error.IllegalState("Default value is out of range");
        }

        this.format = (question.format || defaultFormat).map((token) => {
            return new TokenState(token, intervals, range, values);
        });

        this.transitions = {
            left: new Array(this.format.length),
            right: new Array(this.format.length)
        };
        for (let i = 0; i < this.format.length; ++i) {
            if (!this.format[i].isFormat || i === this.format.length - 1) {
                this.transitions.right[i] = -1;
                continue;
            }
            for (let j = i + 1; j < this.format.length; ++j) {
                if (this.format[j].isFormat) {
                    this.transitions.right[i] = j;
                    break;
                }
            }
        }
        for (let i = this.format.length - 1; i >= 0; --i) {
            if (!this.format[i].isFormat || i === 0) {
                this.transitions.left[i] = -1;
                continue;
            }
            for (let j = i - 1; j >= 0; --j) {
                if (this.format[j].isFormat) {
                    this.transitions.left[i] = j;
                    break;
                }
            }
        }
        for (let i = 0; i < this.format.length; ++i) {
            if (this.format[i].isFormat) {
                this.selection.index = i;
                break;
            }
        }
        this.numericValue = "";
    }

    _run(cb) {
        this.done = cb;

        // Once user confirm (enter key)
        const events = this.observe();

        events.on("keypress", (event) => {
            this.onKeypress(event);
        }).on("line", () => {
            events.destroy();
            this.onEnd();
        });

        // Init
        this.term.hideCursor();
        this.render();

        return this;
    }

    render() {
        let message = this.getQuestion();
        const selection = this.selection;

        for (const [i, { token, isFormat }] of adone.util.enumerate(this.format)) {
            if (!isFormat) {
                message += token;
            } else {
                if (i === selection.index) {
                    message += terminal.chalk.inverse(selection.date.format(token));
                } else {
                    message += selection.date.format(token);
                }
            }
        }
        this.screen.render(message);
        return this;
    }

    onEnd() {
        this.status = "answered";
        this.selection.index = -1;
        this.render();
        this.screen.done();
        this.term.showCursor();
        this.done(this.selection.date);
    }

    onKeypress(event) {
        if (this.selection.index === -1) {
            return;
        }
        if (event.key.name === "left" || (event.key.shift && event.key.name === "tab")) {
            this.numericValue = "";
            const t = this.transitions.left[this.selection.index];
            if (t !== -1) {
                this.selection.index = t;
            }
        } else if (event.key.name === "right" || event.key.name === "tab") {
            this.numericValue = "";
            const t = this.transitions.right[this.selection.index];
            if (t !== -1) {
                this.selection.index = t;
            }
        } else if (event.key.name === "up") {
            this.selection.date = this.format[this.selection.index].add(this.selection.date);
        } else if (event.key.name === "down") {
            this.selection.date = this.format[this.selection.index].sub(this.selection.date);
        } else if (/^\d$/.test(event.key.name)) {
            this.numericValue += event.key.name;
            const { hasNext, value } = this.format[this.selection.index].set(this.selection.date, this.numericValue);
            this.selection.date = value;
            if (!hasNext) {
                this.numericValue = "";
            }
        } else if (event.key.name === "escape") {
            this.numericValue = "";
        }
        this.render();
    }
}
