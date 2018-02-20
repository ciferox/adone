const {
    is,
    error,
    util,
    templating: { nunjucks }
} = adone;

export default function installCompat() {
    // This must be called like `nunjucks.installCompat` so that `this` references the nunjucks instance
    const { runtime, lexer, nodes } = nunjucks;

    const Compiler = nunjucks.compiler.Compiler;
    const Parser = nunjucks.parser.Parser;

    const origContextOrFrameLookup = runtime.contextOrFrameLookup;
    const origCompilerAssertType = Compiler.prototype.assertType;
    const origParserParseAggregate = Parser.prototype.parseAggregate;
    const origMemberLookup = runtime.memberLookup;

    const uninstall = () => {
        runtime.contextOrFrameLookup = origContextOrFrameLookup;
        Compiler.prototype.assertType = origCompilerAssertType;
        Parser.prototype.parseAggregate = origParserParseAggregate;
        runtime.memberLookup = origMemberLookup;
    };

    runtime.contextOrFrameLookup = function (context, frame, name) {
        const val = origContextOrFrameLookup.call(this, context, frame, name);
        if (is.undefined(val)) {
            switch (name) {
                case "True": {
                    return true;
                }
                case "False": {
                    return false;
                }
                case "None": {
                    return null;
                }
            }
        }

        return val;
    };

    class Slice extends nodes.Node {
        constructor(lineno, colno, start, stop, step) {
            super(
                lineno,
                colno,
                start || new nodes.Literal(lineno, colno, null),
                stop || new nodes.Literal(lineno, colno, null),
                step || new nodes.Literal(lineno, colno, 1)
            );
        }
    }
    Slice.prototype.typename = "Slice";
    Slice.prototype.fields = ["start", "stop", "step"];

    Compiler.prototype.assertType = function (...args) {
        if (args[0] instanceof Slice) {
            return;
        }
        return origCompilerAssertType.apply(this, args);
    };

    Compiler.prototype.compileSlice = function (node, frame) {
        this.emit("(");
        this._compileExpression(node.start, frame);
        this.emit("),(");
        this._compileExpression(node.stop, frame);
        this.emit("),(");
        this._compileExpression(node.step, frame);
        this.emit(")");
    };

    const getTokensState = (tokens) => ({
        index: tokens.index,
        lineno: tokens.lineno,
        colno: tokens.colno
    });

    Parser.prototype.parseAggregate = function () {
        const self = this;
        const origState = getTokensState(this.tokens);
        // Set back one accounting for opening bracket/parens
        origState.colno--;
        origState.index--;
        try {
            return origParserParseAggregate.apply(this);
        } catch (e) {
            const errState = getTokensState(this.tokens);
            const rethrow = function () {
                Object.assign(self.tokens, errState);
                return e;
            };

            // Reset to state before original parseAggregate called
            Object.assign(this.tokens, origState);
            this.peeked = false;

            const tok = this.peekToken();
            if (tok.type !== lexer.TOKEN_LEFT_BRACKET) {
                throw rethrow();
            } else {
                this.nextToken();
            }

            const node = new Slice(tok.lineno, tok.colno);

            // If we don't encounter a colon while parsing, this is not a slice,
            // so re-raise the original error.
            let isSlice = false;

            for (let i = 0; i <= node.fields.length; i++) {
                if (this.skip(lexer.TOKEN_RIGHT_BRACKET)) {
                    break;
                }
                if (i === node.fields.length) {
                    if (isSlice) {
                        this.fail("parseSlice: too many slice components", tok.lineno, tok.colno);
                    } else {
                        break;
                    }
                }
                if (this.skip(lexer.TOKEN_COLON)) {
                    isSlice = true;
                } else {
                    const field = node.fields[i];
                    node[field] = this.parseExpression();
                    isSlice = this.skip(lexer.TOKEN_COLON) || isSlice;
                }
            }
            if (!isSlice) {
                throw rethrow();
            }
            return new nodes.Array(tok.lineno, tok.colno, [node]);
        }
    };

    const sliceLookup = (obj, start, stop, step) => {
        obj = obj || [];
        if (is.null(start)) {
            start = (step < 0) ? (obj.length - 1) : 0;
        }
        if (is.null(stop)) {
            stop = (step < 0) ? -1 : obj.length;
        } else {
            if (stop < 0) {
                stop += obj.length;
            }
        }

        if (start < 0) {
            start += obj.length;
        }

        const results = [];

        for (let i = start; ; i += step) {
            if (i < 0 || i > obj.length) {
                break;
            }
            if (step > 0 && i >= stop) {
                break;
            }
            if (step < 0 && i <= stop) {
                break;
            }
            results.push(runtime.memberLookup(obj, i));
        }
        return results;
    };

    const ARRAY_MEMBERS = {
        pop(index) {
            if (is.undefined(index)) {
                return this.pop();
            }
            if (index >= this.length || index < 0) {
                throw new error.Exception("KeyError");
            }
            return this.splice(index, 1);
        },
        append(element) {
            return this.push(element);
        },
        remove(element) {
            for (let i = 0; i < this.length; i++) {
                if (this[i] === element) {
                    return this.splice(i, 1);
                }
            }
            throw new error.Exception("ValueError");
        },
        count(element) {
            let count = 0;
            for (let i = 0; i < this.length; i++) {
                if (this[i] === element) {
                    count++;
                }
            }
            return count;
        },
        index(element) {
            const i = this.indexOf(element);
            if (i === -1) {
                throw new error.Exception("ValueError");
            }
            return i;
        },
        find(element) {
            return this.indexOf(element);
        },
        insert(index, elem) {
            return this.splice(index, 0, elem);
        }
    };
    const OBJECT_MEMBERS = {
        items() {
            return util.entries(this, { followProto: true });
        },
        values() {
            return util.values(this, { followProto: true });
        },
        keys() {
            return util.keys(this, { followProto: true });
        },
        get(key, def) {
            let output = this[key];
            if (is.undefined(output)) {
                output = def;
            }
            return output;
        },
        has_key(key) { // eslint-disable-line camelcase
            return this.hasOwnProperty(key);
        },
        pop(key, def) {
            let output = this[key];
            if (is.undefined(output) && !is.undefined(def)) {
                output = def;
            } else if (is.undefined(output)) {
                throw new error.Exception("KeyError");
            } else {
                delete this[key];
            }
            return output;
        },
        popitem() {
            for (const k in this) {
                // Return the first object pair.
                const val = this[k];
                delete this[k];
                return [k, val];
            }
            throw new error.Exception("KeyError");
        },
        setdefault(key, def) {
            if (key in this) {
                return this[key];
            }
            if (is.undefined(def)) {
                def = null;
            }
            this[key] = def;
            return def;
        },
        update(kwargs) {
            for (const k in kwargs) {
                this[k] = kwargs[k];
            }
            return null; // Always returns None
        }
    };
    OBJECT_MEMBERS.iteritems = OBJECT_MEMBERS.items;
    OBJECT_MEMBERS.itervalues = OBJECT_MEMBERS.values;
    OBJECT_MEMBERS.iterkeys = OBJECT_MEMBERS.keys;

    runtime.memberLookup = function (...args) {
        if (args.length === 4) {
            return sliceLookup.apply(this, args);
        }
        const [obj = {}, val, autoescape] = args;
        // If the object is an object, return any of the methods that Python would otherwise provide.
        if (is.array(obj) && is.propertyOwned(ARRAY_MEMBERS, val)) {
            return (...args) => ARRAY_MEMBERS[val].apply(obj, args);
        }

        if (is.object(obj) && is.propertyOwned(OBJECT_MEMBERS, val)) {
            return (...args) => OBJECT_MEMBERS[val].apply(obj, args);
        }
        return origMemberLookup.call(this, obj, val, autoescape);
    };

    return uninstall;
}
