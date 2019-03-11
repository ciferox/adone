const {
    is,
    std,
    cli: { chalk }
} = adone;

const nodePaths = [
    "_debugger.js",
    "_http_agent.js",
    "_http_client.js",
    "_http_common.js",
    "_http_incoming.js",
    "_http_outgoing.js",
    "_http_server.js",
    "_linklist.js",
    "_stream_duplex.js",
    "_stream_passthrough.js",
    "_stream_readable.js",
    "_stream_transform.js",
    "_stream_writable.js",
    "_tls_legacy.js",
    "_tls_wrap.js",
    "assert.js",
    "buffer.js",
    "child_process.js",
    "cluster.js",
    "console.js",
    "constants.js",
    "crypto.js",
    "dgram.js",
    "dns.js",
    "domain.js",
    "events.js",
    "freelist.js",
    "fs.js",
    "http.js",
    "https.js",
    "module.js",
    "net.js",
    "os.js",
    "path.js",
    "punycode.js",
    "querystring.js",
    "readline.js",
    "repl.js",
    "smalloc.js",
    "stream.js",
    "string_decoder.js",
    "sys.js",
    "timers.js",
    "tls.js",
    "tty.js",
    "url.js",
    "util.js",
    "vm.js",
    "zlib.js",
    "node.js"
];

class ParsedError {
    constructor(error) {
        this.error = error;
        (this._parse)();
    }

    _parse() {
        this._trace = [];
        this._kind = "Error";
        this._wrapper = "";

        if (!is.nil(this.error.wrapper)) {
            this._wrapper = String(this.error.wrapper);
        }

        if (typeof this.error !== "object") {
            this._message = String(this.error);
        } else {
            this._stack = this.error.stack;

            if (!is.nil(this.error.kind)) {
                this._kind = String(this.error.kind);
            } else if (is.string(this._stack)) {
                let m;
                if (m = this._stack.match(/^([a-zA-Z0-9\_\$]+):\ /)) {
                    this._kind = m[1];
                }
            }

            this._message = ((!is.nil(this.error.message)) && String(this.error.message)) || "";
            if (is.string(this._stack)) {
                this._parseStack();
            }
        }

    }

    _parseStack() {
        const messageLines = [];
        let reachedTrace = false;

        for (const line of Array.from(this._stack.split("\n"))) {
            if (line.trim() === "") {
                continue;
            }
            if (reachedTrace) {
                this._trace.push(this._parseTraceItem(line));
            } else {
                if (line.match(/^\s*at\s.+/)) {
                    reachedTrace = true;
                    this._trace.push(this._parseTraceItem(line));
                } else if (!this._message.split("\n".indexOf(line))) {
                    messageLines.push(line);
                }
            }
        }

        let message = messageLines.join("\n");
        if (message.substr(0, this._kind.length) === this._kind) {
            message =
                message
                    .substr(this._kind.length, message.length)
                    .replace(/^\:\s+/, "");
        }

        if (message.length) {
            this._message = this._message.length
                ? [
                    this._message,
                    message
                ].join("\n")
                :
                message;
        }

    }

    _parseTraceItem(text) {
        let m; let packages;
        text = text.trim();

        if (text === "") {
            return;
        }
        if (!text.match(/^at\ /)) {
            return text;
        }

        // remove the 'at ' part
        text = text.replace(/^at /, "");

        if (["Error (<anonymous>)", "Error (<anonymous>:null:null)"].includes(text)) {
            return;
        }

        const original = text;

        // the part that comes before the address
        let what = null;

        // address, including path to module and line/col
        let addr = null;

        // path to module
        let path = null;

        // module dir
        let dir = null;

        // module basename
        let file = null;

        // line number (if using a compiler, the line number of the module
        // in that compiler will be used)
        let line = null;

        // column, same as above
        let col = null;

        // if using a compiler, this will translate to the line number of
        // the js equivalent of that module
        let jsLine = null;

        // like above
        let jsCol = null;

        // path that doesn't include `node_module` dirs
        let shortenedPath = null;

        // like above
        let shortenedAddr = null;

        let packageName = "[current]";

        // pick out the address
        if (m = text.match(/\(([^\)]+)\)$/)) {
            addr = m[1].trim();
        }

        if (!is.nil(addr)) {
            what = text.substr(0, text.length - addr.length - 2);
            what = what.trim();
        }

        // might not have a 'what' clause
        if (is.nil(addr)) {
            addr = text.trim();
        }

        addr = this._fixPath(addr);
        let remaining = addr;

        // remove the <js> clause if the file is a compiled one
        if (m = remaining.match(/\,\ <js>:(\d+):(\d+)$/)) {
            jsLine = m[1];
            jsCol = m[2];
            remaining = remaining.substr(0, remaining.length - m[0].length);
        }

        // the line/col part
        if (m = remaining.match(/:(\d+):(\d+)$/)) {
            line = m[1];
            col = m[2];
            remaining = remaining.substr(0, remaining.length - m[0].length);
            path = remaining;
        }

        // file and dir
        if (!is.nil(path)) {
            file = std.path.basename(path);
            dir = std.path.dirname(path);

            if (dir === ".") {
                dir = "";
            }

            path = this._fixPath(path);
            file = this._fixPath(file);
            dir = this._fixPath(dir);
        }

        if (!is.nil(dir)) {
            const d = dir.replace(/[\\]{1,2}/g, "/");
            if (m = d.match(new RegExp("\
node_modules/([^/]+)(?!.*node_modules.*)\
")
            )) {

                packageName = m[1];
            }
        }

        if (is.nil(jsLine)) {
            jsLine = line;
            jsCol = col;
        }

        if (!is.nil(path)) {
            const r = this._rectifyPath(path);
            shortenedPath = r.path;
            shortenedAddr = shortenedPath + addr.substr(path.length, addr.length);
            ({ packages } = r);
        }

        return {
            original,
            what,
            addr,
            path,
            dir,
            file,
            line: parseInt(line),
            col: parseInt(col),
            jsLine: parseInt(jsLine),
            jsCol: parseInt(jsCol),
            packageName,
            shortenedPath,
            shortenedAddr,
            packages: packages || []
        };
    }

    _getMessage() {
        return this._message;
    }

    _getKind() {
        return this._kind;
    }

    _getWrapper() {
        return this._wrapper;
    }

    _getStack() {
        return this._stack;
    }

    _getArguments() {
        return this.error.arguments;
    }

    _getType() {
        return this.error.type;
    }

    _getTrace() {
        return this._trace;
    }

    _fixPath(path) {
        return path.replace(new RegExp("[\\\\]{1,2}", "g"), "/");
    }

    _rectifyPath(path, nameForCurrentPackage) {
        let m;
        path = String(path);
        const remaining = path;

        if (!(m = path.match(/^(.+?)\/node_modules\/(.+)$/))) {
            return { path, packages: [] };
        }

        const parts = [];
        const packages = [];

        if (is.string(nameForCurrentPackage)) {
            parts.push(`[${nameForCurrentPackage}]`);
            packages.push(`[${nameForCurrentPackage}]`);
        } else {
            parts.push(`[${m[1].match(/([^\/]+)$/)[1]}]`);
            packages.push(m[1].match(/([^\/]+)$/)[1]);
        }

        let rest = m[2];

        while ((m = rest.match(/([^\/]+)\/node_modules\/(.+)$/))) {
            parts.push(`[${m[1]}]`);
            packages.push(m[1]);
            rest = m[2];
        }

        if (m = rest.match(/([^\/]+)\/(.+)$/)) {
            parts.push(`[${m[1]}]`);
            packages.push(m[1]);
            rest = m[2];
        }

        parts.push(rest);

        return {
            path: parts.join("/"),
            packages
        };
    }
}

for (const prop of ["message", "kind", "arguments", "type", "stack", "trace", "wrapper"]) {
    const methodName = `_get${prop[0].toUpperCase()}${prop.substr(1, prop.length)}`;

    Object.defineProperty(ParsedError.prototype, prop,
        {
            get() {
                return this[methodName]();
            }
        });
}

const fn = (e, { maxItems = 16, skipNodeFiles = false } = {}) => {
    if (!(e instanceof ParsedError)) {
        e = new ParsedError(e);
    }

    const header = {
        title: (function () {
            const ret = {};

            // some errors are thrown to display other errors.
            // we call them wrappers here.
            if (e.wrapper !== "") {
                ret.wrapper = `${e.wrapper}`;
            }

            ret.kind = e.kind;
            return ret;
        })(),

        colon: ":",

        message: String(e.message).trim()
    };

    let result = `${chalk.bgRed.white(header.title.kind)}${chalk.grey(header.colon)} ${chalk.white.bold(header.message)}\n\n`;

    const traceItems = [];
    let count = -1;

    for (let i = 0; i < e.trace.length; i++) {
        const trace = e.trace[i];
        if (is.nil(trace)) {
            continue;
        }

        if (skipNodeFiles && typeof trace === "object") {
            if (nodePaths.includes(trace.path)) {
                return true;
            }
        }

        count++;

        if (count > maxItems) {
            break;
        }

        if (is.string(trace)) {
            traceItems.push({ custom: trace });
        } else {
            let what = "";
            if ((is.string(trace.what)) && (trace.what.trim().length > 0)) {
                what = trace.what;
            }
            
            result += `${chalk.grey("-")}`;
            if (!is.nil(trace.file)) {
                result += ` ${chalk.yellow.bold(trace.file)}`;
                if (is.number(trace.line)) {
                    result += `${chalk.grey(":")}${chalk.yellow.bold(trace.line.toString())}`;
                }
            }
            result += ` ${chalk.white(what)}\n  ${chalk.grey.italic(trace.shortenedAddr)}`;

            if (!is.nil(trace.extra)) {
                result += `\n  ${trace.extra}`;
            }
        }

        if (e.trace.length - 1 > i) {
            result += "\n\n";
        }
    }

    return result;
};

fn.ParsedError = ParsedError;
export default fn;
