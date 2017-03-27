const { x } = adone;

export class TemplateError extends x.Exception {
    constructor(message, lineno, colno) {
        if (message instanceof Error) {
            message = `${message.name}: ${message.message}`;
        }
        super(message);
        this.lineno = lineno;
        this.colno = colno;
        this.firstUpdate = true;
    }

    update(path) {
        let message = `(${path || "unknown path"})`;

        if (this.firstUpdate) {
            if (this.lineno && this.colno) {
                message += ` [Line ${this.lineno}, Column ${this.colno}]`;
            } else if (this.lineno) {
                message += ` [Line ${this.lineno}]`;
            }
        }

        message += "\n ";
        if (this.firstUpdate) {
            message += " ";
        }

        this.message = message + (this.message || "");
        this.firstUpdate = false;
        return this;
    }
}
TemplateError.prototype.name = "Template render error";

export const prettifyError = (path, withInternals, err) => {
    if (!err.update) {
        err = new TemplateError(err);
    }
    err.update(path);  // eslint-disable-line

    if (!withInternals) {
        const old = err;
        err = new Error(old.message);
        err.name = old.name;
    }

    return err;
};
