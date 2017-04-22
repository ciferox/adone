const { is, identity, terminal: { styles } } = adone;

/*    
    * style:
        * 'none': (default) normal output suitable for console.log() or writing in a file
        * 'color': colorful output suitable for terminal
    * depth: depth limit, default: 3
    * noFunc: do not display functions
    * noNotices: do not display '[depth limit]'/'[circular]'
    * noDescriptor: do not display descriptor information
    * noType: do not display type and constructor
    * enumOnly: only display enumerable properties
    * funcDetails: display function's details
    * proto: display object's prototype
    * sort: sort the keys
    * minimal: imply noFunc: true, noDescriptor: true, noType: true, enumOnly: true, proto: false and funcDetails: false.
*/

// Styles
const defaultInspectStyle = {
    tab: "    ",
    nl: "\n",
    limit: identity,
    type: (str) => (`<${str}>`),
    constant: identity,
    funcName: identity,
    constructorName: (str) => (`<${str}>`),
    length: identity,
    key: identity,
    index: identity,
    number: identity,
    inspect: identity,
    string: identity,
    errorType: identity,
    errorMessage: identity,
    errorStack: identity,
    errorStackMethod: identity,
    errorStackMethodAs: identity,
    errorStackFile: identity,
    errorStackLine: identity,
    errorStackColumn: identity
};

const inspectStyle = {
    none: defaultInspectStyle,
    color: adone.o(defaultInspectStyle, {
        limit: (str) => (styles.bold.open + styles.brightRed.open + str + styles.reset.open),
        type: (str) => (styles.italic.open + styles.gray.open + str + styles.reset.open),
        constant: (str) => (styles.cyan.open + str + styles.reset.open),
        funcName: (str) => (styles.italic.open + styles.magenta.open + str + styles.reset.open),
        constructorName: (str) => (styles.magenta.open + str + styles.reset.open),
        length: (str) => (styles.italic.open + styles.gray.open + str + styles.reset.open),
        key: (str) => (styles.green.open + str + styles.reset.open),
        index: (str) => (styles.blue.open + str + styles.reset.open),
        number: (str) => (styles.cyan.open + str + styles.reset.open),
        inspect: (str) => (styles.cyan.open + str + styles.reset.open),
        string: (str) => (styles.blue.open + str + styles.reset.open),
        errorType: (str) => (styles.red.open + styles.bold.open + str + styles.reset.open),
        errorMessage: (str) => (styles.red.open + styles.italic.open + str + styles.reset.open),
        errorStack: (str) => (styles.gray.open + str + styles.reset.open),
        errorStackMethod: (str) => (styles.brightYellow.open + str + styles.reset.open),
        errorStackMethodAs: (str) => (styles.yellow.open + str + styles.reset.open),
        errorStackFile: (str) => (styles.brightCyan.open + str + styles.reset.open),
        errorStackLine: (str) => (styles.blue.open + str + styles.reset.open),
        errorStackColumn: (str) => (styles.magenta.open + str + styles.reset.open)
    })
};

const keyNeedingQuotes = (key) => {
    if (!key.length) {
        return true;
    }
    return false;
};

// Some special object are better written down when substituted by something else
const specialObjectSubstitution = (variable) => {
    if (is.undefined(variable.constructor)) {
        return;
    }
    switch (variable.constructor.name) {
        case "Date":
            if (variable instanceof Date) {
                return `${variable.toString()} [${variable.getTime()}]`;
            }
            break;
        case "Set":
            if (variable instanceof Set) {
                // This is an ES6 'Set' Object
                return Array.from(variable);
            }
            break;
        case "Map":
            if (variable instanceof Map) {
                // This is an ES6 'Map' Object
                return Array.from(variable);
            }
            break;
        case "ObjectID":
            if (variable._bsontype) {
                // This is a MongoDB ObjectID, rather boring to display in its original form
                // due to esoteric characters that confuse both the user and the terminal displaying it.
                // Substitute it to its string representation
                return variable.toString();
            }
            break;
    }
};

const inspect_ = (runtime, options, variable) => {
    let i;
    let funcName;
    let length;
    let propertyList;
    let constructor;
    let keyIsProperty;
    let isArray;
    let isFunc;
    let specialObject;
    let str = "";
    let key = "";
    let descriptorStr = "";
    let descriptor;
    let nextAncestors;

    const type = adone.util.typeOf(variable);
    const indent = options.style.tab.repeat(runtime.depth);

    if (type === "function" && options.noFunc) {
        return "";
    }

    if (runtime.key !== undefined) {
        if (runtime.descriptor) {
            descriptorStr = [];

            if (!runtime.descriptor.configurable) {
                descriptorStr.push("-conf");
            }
            if (!runtime.descriptor.enumerable) {
                descriptorStr.push("-enum");
            }

            // Already displayed by runtime.forceType
            //if ( runtime.descriptor.get || runtime.descriptor.set ) { descriptorStr.push( 'getter/setter' ) ; } else
            if (!runtime.descriptor.writable) {
                descriptorStr.push("-w");
            }

            //if ( descriptorStr.length ) { descriptorStr = '(' + descriptorStr.join( ' ' ) + ')' ; }
            if (descriptorStr.length) {
                descriptorStr = descriptorStr.join(" ");
            } else {
                descriptorStr = "";
            }
        }

        if (runtime.keyIsProperty) {
            if (keyNeedingQuotes(runtime.key)) {
                key = `"${options.style.key(runtime.key)}": `;
            } else {
                key = `${options.style.key(runtime.key)}: `;
            }
        } else {
            key = `[${options.style.index(runtime.key)}] `;
        }

        if (descriptorStr) {
            descriptorStr = ` ${options.style.type(descriptorStr)}`;
        }
    }

    const pre = runtime.noPre ? "" : indent + key;

    // Describe the current variable

    if (variable === undefined) {
        str += pre + options.style.constant("undefined") + descriptorStr + options.style.nl;
    } else if (variable === null) {
        str += pre + options.style.constant("null") + descriptorStr + options.style.nl;
    } else if (variable === false) {
        str += pre + options.style.constant("false") + descriptorStr + options.style.nl;
    } else if (variable === true) {
        str += pre + options.style.constant("true") + descriptorStr + options.style.nl;
    } else if (type === "number") {
        str += pre + options.style.number(variable.toString()) + (options.noType ? "" : ` ${options.style.type("number")}`) + descriptorStr + options.style.nl;
    } else if (type === "string") {
        str += `${pre}"${options.style.string(adone.text.escape.control(variable))}" ${
            options.noType ? "" : options.style.type("string") + options.style.length(`(${variable.length})`)}${descriptorStr}${options.style.nl}`;
    } else if (Buffer.isBuffer(variable)) {
        str += `${pre + options.style.inspect(variable.inspect())} ${
            options.noType ? "" : options.style.type("Buffer") + options.style.length(`(${variable.length})`)
            }${descriptorStr}${options.style.nl}`;
    } else if (type === "global" || type === "Array" || type === "Object" || type === "class" || type === "function") {
        funcName = length = "";
        isFunc = false;
        if (type === "function") {
            isFunc = true;
            funcName = ` ${options.style.funcName((variable.name ? variable.name : "(anonymous)"))}`;
            length = options.style.length(`(${variable.length})`);
        }

        isArray = false;
        if (Array.isArray(variable)) {
            isArray = true;
            length = options.style.length(`(${variable.length})`);
        }

        if (type === "class") {
            constructor = "Class";
        } else if (!variable.constructor) {
            constructor = "(no constructor)";
        } else if (!variable.constructor.name) {
            constructor = "(anonymous)";
        } else {
            constructor = variable.constructor.name;
        }

        constructor = options.style.constructorName(constructor);

        str += pre;

        if (!options.noType) {
            if (runtime.forceType) {
                str += options.style.type(runtime.forceType);
            } else {
                str += `${constructor + funcName + length} ${options.style.type(type)}${descriptorStr}`;
            }

            if (!isFunc || options.funcDetails) {
                str += " ";
            }	// if no funcDetails imply no space here
        }

        propertyList = Object.getOwnPropertyNames(variable);

        if (options.sort) {
            propertyList.sort();
        }

        // Special Objects
        specialObject = specialObjectSubstitution(variable);

        if (specialObject !== undefined) {
            str += `=> ${inspect_({
                depth: runtime.depth,
                ancestors: runtime.ancestors,
                noPre: true
            },
                options,
                specialObject
            )}`;
        } else if (isFunc && !options.funcDetails) {
            str += options.style.nl;
        } else if (!propertyList.length && !options.proto) {
            str += `{}${options.style.nl}`;
        } else if (runtime.depth >= options.depth) {
            if (!options.noNotices) {
                str += options.style.limit("[depth limit]");
            }
            str += options.style.nl;
        } else if (runtime.ancestors.indexOf(variable) !== -1) {
            if (!options.noNotices) {
                str += options.style.limit("[circular]");
            }
            str += options.style.nl;
        } else {
            str += (isArray && options.noType ? "[" : "{") + options.style.nl;

            // Do not use .concat() here, it doesn't works as expected with arrays...
            nextAncestors = runtime.ancestors.slice();
            nextAncestors.push(variable);

            for (i = 0; i < propertyList.length; i++) {
                try {
                    descriptor = Object.getOwnPropertyDescriptor(variable, propertyList[i]);

                    if (!descriptor.enumerable && options.enumOnly) {
                        continue;
                    }

                    keyIsProperty = !isArray || !descriptor.enumerable || isNaN(propertyList[i]);

                    if (!options.noDescriptor && (descriptor.get || descriptor.set)) {
                        str += inspect_({
                            depth: runtime.depth + 1,
                            ancestors: nextAncestors,
                            key: propertyList[i],
                            keyIsProperty,
                            descriptor,
                            forceType: "getter/setter"
                        },
                            options,
                            { get: descriptor.get, set: descriptor.set }
                        );
                    } else {
                        str += inspect_({
                            depth: runtime.depth + 1,
                            ancestors: nextAncestors,
                            key: propertyList[i],
                            keyIsProperty,
                            descriptor: options.noDescriptor ? undefined : descriptor
                        },
                            options,
                            variable[propertyList[i]]
                        );
                    }
                } catch (error) {
                    str += inspect_({
                        depth: runtime.depth + 1,
                        ancestors: nextAncestors,
                        key: propertyList[i],
                        keyIsProperty,
                        descriptor: options.noDescriptor ? undefined : descriptor
                    },
                        options,
                        error
                    );
                }
            }

            if (options.proto) {
                str += inspect_({
                    depth: runtime.depth + 1,
                    ancestors: nextAncestors,
                    key: "__proto__",
                    keyIsProperty: true
                },
                    options,
                    variable.__proto__	// jshint ignore:line
                );
            }

            str += indent + (isArray && options.noType ? "]" : "}") + options.style.nl;
        }
    }

    return str;
};

export const inspect = (obj, options = {}) => {
    const runtime = { depth: 0, ancestors: [] };

    if (is.string(options.style) && is.propertyOwned(inspectStyle, options.style)) {
        options.style = inspectStyle[options.style];
    } else {
        options.style = inspectStyle.none;
    }

    if (is.undefined(options.depth)) {
        options.depth = 3;
    }

    if (options.minimal) {
        options.noFunc = true;
        options.noDescriptor = true;
        options.noType = true;
        options.enumOnly = true;
        options.funcDetails = false;
        options.proto = false;
    }

    let str = inspect_(runtime, options, obj);
    if (str.endsWith("\n")) {
        str = str.slice(0, -1);
    }
    return str;
};

export const inspectStack = (stack, options = {}) => {
    if (!options.style) {
        options.style = inspectStyle.none;
    } else if (is.string(options.style)) {
        options.style = inspectStyle[options.style];
    }

    if (!stack) {
        return;
    }

    if ((options.browser || process.browser) && stack.indexOf("@") !== -1) {
        // Assume a Firefox-compatible stack-trace here...
        stack = stack
            .replace(/[<\/]*(?=@)/g, "")	// Firefox output some WTF </</</</< stuff in its stack trace -- removing that
            .replace(/^\s*([^@]*)\s*@\s*([^\n]*)(?::([0-9]+):([0-9]+))?$/mg,
            (matches, method, file, line, column) => {	// jshint ignore:line
                return options.style.errorStack("    at ") +
                    (method ? `${options.style.errorStackMethod(method)} ` : "") +
                    options.style.errorStack("(") +
                    (file ? options.style.errorStackFile(file) : options.style.errorStack("unknown")) +
                    (line ? options.style.errorStack(":") + options.style.errorStackLine(line) : "") +
                    (column ? options.style.errorStack(":") + options.style.errorStackColumn(column) : "") +
                    options.style.errorStack(")");
            }
            );
    } else {
        stack = stack.replace(/^[^\n]*\n/, "");
        stack = stack.replace(
            /^\s*(at)\s+(?:([^\s:\(\)\[\]\n]+(?:\([^\)]+\))?)\s)?(?:\[as ([^\s:\(\)\[\]\n]+)\]\s)?(?:\(?([^:\(\)\[\]\n]+):([0-9]+):([0-9]+)\)?)?$/mg,
            (matches, at, method, as, file, line, column) => {	// jshint ignore:line
                return options.style.errorStack("    at ") +
                    (method ? `${options.style.errorStackMethod(method)} ` : "") +
                    (as ? options.style.errorStack("[as ") + options.style.errorStackMethodAs(as) + options.style.errorStack("] ") : "") +
                    options.style.errorStack("(") +
                    (file ? options.style.errorStackFile(file) : options.style.errorStack("unknown")) +
                    (line ? options.style.errorStack(":") + options.style.errorStackLine(line) : "") +
                    (column ? options.style.errorStack(":") + options.style.errorStackColumn(column) : "") +
                    options.style.errorStack(")");
            }
        );
    }

    if (stack.endsWith("\n")) {
        stack = stack.slice(0, -1);
    }

    return stack;
};

export const inspectError = (error, options = {}) => {
    let str = "";
    let stack;

    if (!(error instanceof Error)) {
        return;
    }

    if (!options.style) {
        options.style = inspectStyle.none;
    } else if (is.string(options.style)) {
        options.style = inspectStyle[options.style];
    }

    if (error.stack) {
        stack = inspectStack(error.stack, options);
    }

    const type = error.type || error.constructor.name;
    const code = error.code || error.name || error.errno || error.number;

    str += `${options.style.errorType(type) + (code ? ` [${options.style.errorType(code)}]` : "")}: `;
    str += `${options.style.errorMessage(error.message)}\n`;

    if (stack) {
        str += `${options.style.errorStack(stack)}\n`;
    }

    if (str.endsWith("\n")) {
        str = str.slice(0, -1);
    }

    return str;
};
