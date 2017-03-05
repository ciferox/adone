import adone from "adone";
const { is, text: { ansi } } = adone;

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

    // Prepare things (indentation, key, descriptor, ... )

    const type = typeof (variable);
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
    } else if (type === "object" || type === "function") {
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

        if (!variable.constructor) {
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
            str += options.style.limit("[depth limit]") + options.style.nl;
        } else if (runtime.ancestors.indexOf(variable) !== -1) {
            str += options.style.limit("[circular]") + options.style.nl;
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

    // Finalizing	
    if (runtime.depth === 0) {
        if (options.style === "html") {
            str = adone.text.escape.html(str);
        }
    }

    return str;
};

// Inspect's styles
const inspectStyleNoop = (str) => str;
const defaultInspectStyle = {
    tab: "    ",
    nl: "\n",
    limit: inspectStyleNoop,
    type: (str) => (`<${str}>`),
    constant: inspectStyleNoop,
    funcName: inspectStyleNoop,
    constructorName: (str) => (`<${str}>`),
    length: inspectStyleNoop,
    key: inspectStyleNoop,
    index: inspectStyleNoop,
    number: inspectStyleNoop,
    inspect: inspectStyleNoop,
    string: inspectStyleNoop,
    errorType: inspectStyleNoop,
    errorMessage: inspectStyleNoop,
    errorStack: inspectStyleNoop,
    errorStackMethod: inspectStyleNoop,
    errorStackMethodAs: inspectStyleNoop,
    errorStackFile: inspectStyleNoop,
    errorStackLine: inspectStyleNoop,
    errorStackColumn: inspectStyleNoop
};

const inspectStyle = {
    none: defaultInspectStyle,
    color: adone.o(defaultInspectStyle, {
        limit: (str) => (ansi.color.bold + ansi.color.brightRed + str + ansi.color.reset),
        type: (str) => (ansi.color.italic + ansi.color.brightBlack + str + ansi.color.reset),
        constant: (str) => (ansi.color.cyan + str + ansi.color.reset),
        funcName: (str) => (ansi.color.italic + ansi.color.magenta + str + ansi.color.reset),
        constructorName: (str) => (ansi.color.magenta + str + ansi.color.reset),
        length: (str) => (ansi.color.italic + ansi.color.brightBlack + str + ansi.color.reset),
        key: (str) => (ansi.color.green + str + ansi.color.reset),
        index: (str) => (ansi.color.blue + str + ansi.color.reset),
        number: (str) => (ansi.color.cyan + str + ansi.color.reset),
        inspect: (str) => (ansi.color.cyan + str + ansi.color.reset),
        string: (str) => (ansi.color.blue + str + ansi.color.reset),
        errorType: (str) => (ansi.color.red + ansi.color.bold + str + ansi.color.reset),
        errorMessage: (str) => (ansi.color.red + ansi.color.italic + str + ansi.color.reset),
        errorStack: (str) => (ansi.color.brightBlack + str + ansi.color.reset),
        errorStackMethod: (str) => (ansi.color.brightYellow + str + ansi.color.reset),
        errorStackMethodAs: (str) => (ansi.color.yellow + str + ansi.color.reset),
        errorStackFile: (str) => (ansi.color.brightCyan + str + ansi.color.reset),
        errorStackLine: (str) => (ansi.color.blue + str + ansi.color.reset),
        errorStackColumn: (str) => (ansi.color.magenta + str + ansi.color.reset)
    }),
    html: adone.o(defaultInspectStyle, {
        tab: "&nbsp;&nbsp;&nbsp;&nbsp;",
        nl: "<br />",
        limit: (str) => (`<span style="color:red">${str}</span>`),
        type: (str) => (`<i style="color:gray">${str}</i>`),
        constant: (str) => (`<span style="color:cyan">${str}</span>`),
        funcName: (str) => (`<i style="color:magenta">${str}</i>`),
        constructorName: (str) => (`<span style="color:magenta">${str}</span>`),
        length: (str) => (`<i style="color:gray">${str}</i>`),
        key: (str) => (`<span style="color:green">${str}</span>`),
        index: (str) => (`<span style="color:blue">${str}</span>`),
        number: (str) => (`<span style="color:cyan">${str}</span>`),
        inspect: (str) => (`<span style="color:cyan">${str}</span>`),
        string: (str) => (`<span style="color:blue">${str}</span>`),
        errorType: (str) => (`<span style="color:red">${str}</span>`),
        errorMessage: (str) => (`<span style="color:red">${str}</span>`),
        errorStack: (str) => (`<span style="color:gray">${str}</span>`),
        errorStackMethod: (str) => (`<span style="color:yellow">${str}</span>`),
        errorStackMethodAs: (str) => (`<span style="color:yellow">${str}</span>`),
        errorStackFile: (str) => (`<span style="color:cyan">${str}</span>`),
        errorStackLine: (str) => (`<span style="color:blue">${str}</span>`),
        errorStackColumn: (str) => (`<span style="color:gray">${str}</span>`)
    })
};

/*
    Inspect a variable, return a string ready to be displayed with console.log(), or even as an HTML output.
    
    Options:
        * style:
            * 'none': (default) normal output suitable for console.log() or writing in a file
            * 'color': colorful output suitable for terminal
            * 'html': html output
        * depth: depth limit, default: 3
        * noFunc: do not display functions
        * noDescriptor: do not display descriptor information
        * noType: do not display type and constructor
        * enumOnly: only display enumerable properties
        * funcDetails: display function's details
        * proto: display object's prototype
        * sort: sort the keys
        * minimal: imply noFunc: true, noDescriptor: true, noType: true, enumOnly: true, proto: false and funcDetails: false.
        Display a minimal JSON-like output
        * useInspect? use .inspect() method when available on an object
*/
export const inspect = (obj, options = {}) => {
    const runtime = { depth: 0, ancestors: [] };

    if (!options.style) {
        options.style = inspectStyle.none;
    } else if (is.string(options.style)) {
        options.style = inspectStyle[options.style];
    }

    if (is.undefined(options.depth)) {
        options.depth = 3;
    }

    // /!\ nofunc is deprecated
    if (options.nofunc) {
        options.noFunc = true;
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
