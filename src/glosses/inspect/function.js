const {
    identity,
    is,
    js,
    terminal: { chalk }
} = adone;

const STYLE = {
    none: {
        func: identity,
        funcName: identity,
        arg: identity,
        sym: identity,
        def: identity
    },
    color: {
        func: (str) => chalk.magenta(str),
        funcName: (str) => chalk.italic.magenta(str),
        arg: (str) => chalk.grey(str),
        sym: (str) => chalk.grey(str),
        def: (str) => chalk.cyan(str)
    }
};

const getArgs = function (func) {
    const res = func.toString().match(/\(([^)]*)\)/);
    if (!res) {
        return "";
    }

    return res[1].split(",").map((arg) => arg.replace(/\/\*.*\*\//, "").replace(/\s\s+/g, "").replace(/\n/, "")).filter(identity);
};

export default (code, options, styleName = "none") => {
    const meta = js.parseFunction(code, options);
    const style = STYLE[styleName];
    let result = "";

    if (meta.isAsync) {
        result += "Async ";
    }

    if (!meta.isArrow) {
        if (meta.isGenerator) {
            result += style.func("Function* ");
        } else {
            result += style.func("Function ");
        }
    }

    if (meta.isNamed) {
        result += `${style.funcName(meta.name)}`;
    } else if (is.function(code)) {
        result += `${style.funcName(code.name)}`;
    }
    result += style.sym("(");

    // check spread args
    let hasSpread = false;
    for (let i = 0; i < meta.args.length; i++) {
        const arg = meta.args[i];
        if (arg === false) {
            hasSpread = true;
            break;
        }
    }
    if (hasSpread) {
        result += style.arg(getArgs(meta.value));
    } else {
        for (let i = 0; i < meta.args.length; i++) {
            const arg = meta.args[i];
            result += style.arg(arg);
            const defVal = meta.defaults[arg];
            if (!is.undefined(defVal)) {
                result += ` ${style.sym("=")} ${style.def(defVal)}`;
            }
            if ((meta.args.length - 1) > i) {
                result += style.sym(", ");
            }
        }
    }

    result += style.sym(")");

    if (meta.isArrow) {
        result += style.sym(" => {...}");
    }

    return result;
};
