const {
    is,
    identity,
    cli: { esc },
    text
} = adone;

const defaultStyle = {
    trim: false,
    tab: "    ",
    newline: "\n",
    comma: "",
    limit: identity,
    type: (str) => `<${str}>`,
    constant: identity,
    funcName: identity,
    constructorName: (str) => `<${str}>`,
    length: identity,
    key: identity,
    index: (str) => `[${str}] `,
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

const style = {
    none: defaultStyle,
    inline: Object.assign({}, defaultStyle, {
        trim: true,
        tab: "",
        newline: " ",
        comma: ", ",
        length: () => "",
        index: () => ""
        //type: () => '' ,
    }),
    color: Object.assign({}, defaultStyle, {
        limit: (str) => esc.bold.open + esc.redBright.open + str + esc.reset.open,
        type: (str) => esc.italic.open + esc.gray.open + str + esc.reset.open,
        constant: (str) => esc.cyan.open + str + esc.reset.open,
        funcName: (str) => esc.italic.open + esc.magenta.open + str + esc.reset.open,
        constructorName: (str) => esc.magenta.open + str + esc.reset.open,
        length: (str) => esc.italic.open + esc.gray.open + str + esc.reset.open,
        key: (str) => esc.green.open + str + esc.reset.open,
        index: (str) => `${esc.blue.open}[${str}]${esc.reset.open} `,
        number: (str) => esc.cyan.open + str + esc.reset.open,
        inspect: (str) => esc.cyan.open + str + esc.reset.open,
        string: (str) => esc.blue.open + str + esc.reset.open,
        errorType: (str) => esc.red.open + esc.bold.open + str + esc.reset.open,
        errorMessage: (str) => esc.red.open + esc.italic.open + str + esc.reset.open,
        errorStack: (str) => esc.gray.open + str + esc.reset.open,
        errorStackMethod: (str) => esc.yellowBright.open + str + esc.reset.open,
        errorStackMethodAs: (str) => esc.yellow.open + str + esc.reset.open,
        errorStackFile: (str) => esc.cyanBright.open + str + esc.reset.open,
        errorStackLine: (str) => esc.blue.open + str + esc.reset.open,
        errorStackColumn: (str) => esc.magenta.open + str + esc.reset.open
    }),
    html: Object.assign({}, defaultStyle, {
        tab: "&nbsp;&nbsp;&nbsp;&nbsp;",
        newline: "<br />",
        limit: (str) => `<span style="color:red">${str}</span>`,
        type: (str) => `<i style="color:gray">${str}</i>`,
        constant: (str) => `<span style="color:cyan">${str}</span>`,
        funcName: (str) => `<i style="color:magenta">${str}</i>`,
        constructorName: (str) => `<span style="color:magenta">${str}</span>`,
        length: (str) => `<i style="color:gray">${str}</i>`,
        key: (str) => `<span style="color:green">${str}</span>`,
        index: (str) => `<span style="color:blue">[${str}]</span> `,
        number: (str) => `<span style="color:cyan">${str}</span>`,
        inspect: (str) => `<span style="color:cyan">${str}</span>`,
        string: (str) => `<span style="color:blue">${str}</span>`,
        errorType: (str) => `<span style="color:red">${str}</span>`,
        errorMessage: (str) => `<span style="color:red">${str}</span>`,
        errorStack: (str) => `<span style="color:gray">${str}</span>`,
        errorStackMethod: (str) => `<span style="color:yellow">${str}</span>`,
        errorStackMethodAs: (str) => `<span style="color:yellow">${str}</span>`,
        errorStackFile: (str) => `<span style="color:cyan">${str}</span>`,
        errorStackLine: (str) => `<span style="color:blue">${str}</span>`,
        errorStackColumn: (str) => `<span style="color:gray">${str}</span>`
    })
};

const EMPTY = {};

const keyNeedingQuotes = (key) => {
    if (!key.length) {
        return true;
    }
    return false;
};

const promiseStates = ["pending", "fulfilled", "rejected"];

const excludedSelfInspectors = [adone, style.none, style.color, style.inline, style.html];

// Some special object are better written down when substituted by something else
const specialObjectSubstitution = (object, runtime, options) => {
    if (!is.function(object.constructor)) {
        // Some objects have no constructor, e.g.: Object.create(null)
        //console.error( object ) ;
        return;
    } else if (object instanceof String) {
        return object.toString();
    } else if (object instanceof RegExp) {
        return object.toString();
    } else if (object instanceof Date) {
        return `${object.toString()} [${object.getTime()}]`;
    } else if (object instanceof Set) {
        // This is an ES6 'Set' Object
        return Array.from(object);
    } else if (object instanceof Map) {
        // This is an ES6 'Map' Object
        return Array.from(object);
    } else if (object instanceof Promise) {
        if (process && process.binding && process.binding("util") && process.binding("util").getPromiseDetails) {
            const details = process.binding("util").getPromiseDetails(object);
            const state = promiseStates[details[0]];
            let str = `Promise <${state}>`;

            if (state === "fulfilled") {
                str += ` ${inspect_(
                    {
                        depth: runtime.depth,
                        ancestors: runtime.ancestors,
                        noPre: true
                    },
                    options,
                    details[1]
                )}`;
            } else if (state === "rejected") {
                if (details[1] instanceof Error) {
                    str += ` ${adone.inspect.error(
                        {
                            style: options.style,
                            noErrorStack: true
                        },
                        details[1]
                    )}`;
                } else {
                    str += ` ${inspect_(
                        {
                            depth: runtime.depth,
                            ancestors: runtime.ancestors,
                            noPre: true
                        },
                        options,
                        details[1]
                    )}`;
                }
            }

            return str;
        }
    }

    if (object._bsontype) {
        // This is a MongoDB ObjectID, rather boring to display in its original form
        // due to esoteric characters that confuse both the user and the terminal displaying it.
        // Substitute it to its string representation
        return object.toString();
    }

    if (options.useInspect && !excludedSelfInspectors.includes(object) && is.function(object.inspect)) {
        return object.inspect();
    }
};

const COMPLEX_TYPES = ["global", "adone", "Array", "Object", "object", "class", "function", "Error", "namespace", "process"];

/**
 * Inspect an object, return a string ready to be displayed with console.log(), or even as an HTML output.
 *
 * Options:
 * style:
 * 'none': (default) normal output suitable for console.log() or writing in a file
 * 'inline': like 'none', but without newlines
 * 'color': colorful output suitable for terminal
 * 'html': html output
 * any object: full controle, inheriting from 'none'
 * depth: depth limit, default: 3
 * maxLength: length limit for strings, default: 250
 * outputMaxLength: length limit for the inspect output string, default: 64000
 * noFunc: do not display functions
 * noDescriptor: do not display descriptor information
 * noArrayProperty: do not display array properties
 * noType: do not display type and constructor
 * enumOnly: only display enumerable properties
 * funcDetails: display function's details
 * proto: display object's prototype
 * sort: sort the keys
 * minimal: imply noFunc: true, noDescriptor: true, noType: true, enumOnly: true, proto: false and funcDetails: false.
 * Display a minimal JSON-like output
 * protoBlackList: `Set` of blacklisted object prototype (will not recurse inside it)
 * propertyBlackList: `Set` of blacklisted property names (will not even display it)
 * asObject: interpret as plain object
 * useInspect: use .inspect() method when available on an object (default to false)
 */
const inspect_ = (runtime, options, obj) => {
    let i;
    let funcName;
    let length;
    let proto;
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

    let type;
    if (options.native) {
        type = is.object(obj) && options.asObject ? "object" : typeof obj;
    } else if (options.asObject && !is.primitive(obj)) {
        type = "object";
    } else {
        type = adone.typeOf(obj);
    }

    const isNamespace = is.namespace(obj);
    if (!options.native && isNamespace) {
        type = "namespace";
    } else if (type === "function" && isNamespace) {
        type = "namespace";
    }

    const nativeType = typeof obj;

    const indent = options.style.tab.repeat(runtime.depth);

    if (type === "function" && options.noFunc) {
        return "";
    }

    if (!is.undefined(runtime.key)) {
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
            key = options.style.index(runtime.key);
        }

        if (descriptorStr) {
            descriptorStr = ` ${options.style.type(descriptorStr)}`;
        }
    }

    const pre = runtime.noPre ? "" : indent + key;

    if (is.undefined(obj)) {
        str += pre + options.style.constant("undefined") + descriptorStr + options.style.newline;
    } else if (obj === EMPTY) {
        str += pre + options.style.constant("[empty]") + descriptorStr + options.style.newline;
    } else if (is.null(obj)) {
        str += pre + options.style.constant("null") + descriptorStr + options.style.newline;
    } else if (obj === false) {
        str += pre + options.style.constant("false") + descriptorStr + options.style.newline;
    } else if (obj === true) {
        str += pre + options.style.constant("true") + descriptorStr + options.style.newline;
    } else if (type === "number") {
        str += pre + options.style.number(obj.toString()) +
            (options.noType ? "" : ` ${options.style.type("number")}`) +
            descriptorStr + options.style.newline;
    } else if (type === "string") {
        if (obj.length > options.maxLength) {
            str += `${pre}"${options.style.string(text.escape.control(obj.slice(0, options.maxLength - 1)))}…"${
                options.noType ? "" : ` ${options.style.type("string")}${options.style.length(`(${obj.length} - TRUNCATED)`)}`}${descriptorStr}${options.style.newline}`;
        } else {
            str += `${pre}"${options.style.string(text.escape.control(obj))}"${
                options.noType ? "" : ` ${options.style.type("string")}${options.style.length(`(${obj.length})`)}`}${descriptorStr}${options.style.newline}`;
        }
    } else if (is.buffer(obj)) {
        str += pre + options.style.inspect(obj.inspect()) +
            (options.noType ? "" : ` ${options.style.type("Buffer")}${options.style.length(`(${obj.length})`)}`) +
            descriptorStr + options.style.newline;
    } else if (COMPLEX_TYPES.includes(type)) {
        funcName = length = "";
        isFunc = false;

        if (type === "function") {
            isFunc = true;
            funcName = ` ${options.style.funcName((obj.name ? obj.name : "(anonymous)"))}`;
            length = options.style.length(`(${obj.length})`);
        }

        isArray = false;
        if (is.array(obj)) {
            isArray = true;
            length = options.style.length(`(${obj.length})`);
        }

        if (type === "namespace" || isNamespace) {
            constructor = "Namespace";
        } else if (type === "class") {
            constructor = `Class ${obj.name}`;
        } else if (!obj.constructor) {
            constructor = "(no constructor)";
        } else if (!obj.constructor.name) {
            constructor = "(anonymous)";
        } else {
            constructor = obj.constructor.name;
        }

        constructor = options.style.constructorName(constructor);
        proto = Object.getPrototypeOf(obj);

        str += pre;

        if (!options.noType) {
            if (runtime.forceType) {
                str += options.style.type(runtime.forceType);
            } else {
                if (type === "function" && !options.native) {
                    let result;
                    try {
                        result = adone.inspect.function(obj, {}, options.styleName);
                        str += result;
                    } catch (err) {
                        str += `${constructor + funcName + length} ${options.style.type(nativeType)}${descriptorStr}`;
                    }
                } else {
                    str += `${constructor + funcName + length} ${options.style.type(nativeType)}${descriptorStr}`;
                }
            }

            if (!isFunc || options.funcDetails) {
                str += " ";
            }	// if no funcDetails imply no space here
        }

        if (isArray && options.noArrayProperty) {
            propertyList = [...Array(obj.length).keys()];
        } else {
            if (isNamespace && is.propertyDefined(obj, "__proto__")) {
                propertyList = adone.util.keys(obj, { all: true });
            } else {
                propertyList = Object.getOwnPropertyNames(obj);
            }
        }

        if (options.sort) {
            propertyList.sort();
        }

        // Special Objects
        specialObject = specialObjectSubstitution(obj, runtime, options);

        if (options.protoBlackList && options.protoBlackList.has(proto)) {
            str += options.style.limit("[skip]") + options.style.newline;
        } else if (!is.undefined(specialObject)) {
            if (is.string(specialObject)) {
                str += `=> ${specialObject}${options.style.newline}`;
            } else {
                str += `=> ${inspect_(
                    {
                        depth: runtime.depth,
                        ancestors: runtime.ancestors,
                        noPre: true
                    },
                    options,
                    specialObject
                )}`;
            }
        } else if (isFunc && !options.funcDetails) {
            str += options.style.newline;
        } else if (!propertyList.length && !options.proto) {
            str += (isArray ? "[]" : "{}") + options.style.newline;
        } else if (runtime.depth >= options.depth) {
            if (options.native || type !== "class") {
                str += options.style.limit("[depth limit]") + options.style.newline;
            } else {
                str += options.style.newline;
            }
        } else if (runtime.ancestors.indexOf(obj) !== -1) {
            str += options.style.limit("[circular]") + options.style.newline;
        } else {
            str += (isArray && options.noType && options.noArrayProperty ? "[" : "{") + options.style.newline;

            // Do not use .concat() here, it doesn't works as expected with arrays...
            nextAncestors = runtime.ancestors.slice();
            nextAncestors.push(obj);

            for (i = 0; i < propertyList.length && str.length < options.outputMaxLength; i++) {
                if (!isArray && options.propertyBlackList && options.propertyBlackList.has(propertyList[i])) {
                    //str += options.style.limit( '[skip]' ) + options.style.newline ;
                    continue;
                }

                if (isArray && options.noArrayProperty && !(propertyList[i] in obj)) {
                    // Hole in the array (sparse array, item deleted, ...)
                    str += inspect_(
                        {
                            depth: runtime.depth + 1,
                            ancestors: nextAncestors,
                            key: propertyList[i],
                            keyIsProperty: false
                        },
                        options,
                        EMPTY
                    );
                } else {
                    try {
                        descriptor = Object.getOwnPropertyDescriptor(obj, propertyList[i]);
                        if (!descriptor.enumerable && options.enumOnly) {
                            continue;
                        }
                        keyIsProperty = !isArray || !descriptor.enumerable || isNaN(propertyList[i]);

                        if (!options.noDescriptor && descriptor && (descriptor.get || descriptor.set)) {
                            str += inspect_(
                                {
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
                            str += inspect_(
                                {
                                    depth: runtime.depth + 1,
                                    ancestors: nextAncestors,
                                    key: propertyList[i],
                                    keyIsProperty,
                                    descriptor: options.noDescriptor ? undefined : descriptor
                                },
                                options,
                                obj[propertyList[i]]
                            );
                        }
                    } catch (error) {
                        str += inspect_(
                            {
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

                if (i < propertyList.length - 1) {
                    str += options.style.comma;
                }
            }

            if (options.proto && !isNamespace) {
                str += inspect_(
                    {
                        depth: runtime.depth + 1,
                        ancestors: nextAncestors,
                        key: "__proto__",
                        keyIsProperty: true
                    },
                    options,
                    proto
                );
            }

            str += indent + (isArray && options.noType && options.noArrayProperty ? "]" : "}");
            str += options.style.newline;
        }
    }

    if (runtime.depth === 0) {
        if (options.style.trim) {
            str = str.trim();
        }
        if (options.style === "html") {
            str = text.escape.html(str);
        }
    }

    return str;
};


const inspect = (obj, options = {}) => {
    const runtime = { depth: 0, ancestors: [] };

    options.styleName = options.style;
    if (!options.style) {
        options.style = defaultStyle;
    } else if (is.string(options.style)) {
        options.style = style[options.style];
    } else {
        options.style = Object.assign({}, defaultStyle, options.style);
    }

    if (is.undefined(options.depth)) {
        options.depth = 3;
    }
    if (is.undefined(options.maxLength)) {
        options.maxLength = 250;
    }
    if (is.undefined(options.outputMaxLength)) {
        options.outputMaxLength = 64000;
    }

    // /!\ nofunc is deprecated
    if (options.nofunc) {
        options.noFunc = true;
    }

    if (options.minimal) {
        options.noFunc = true;
        options.noDescriptor = true;
        options.noType = true;
        options.noArrayProperty = true;
        options.enumOnly = true;
        options.funcDetails = false;
        options.proto = false;
    }

    let str = inspect_(runtime, options, obj);

    if (str.length > options.outputMaxLength) {
        str = `${str.slice(0, options.outputMaxLength - 1)}…`;
    }

    return str;
};

adone.lazify({
    style: () => style,
    defaultStyle: () => defaultStyle,
    error: "./error",
    stack: "./stack",
    function: "./function"
}, inspect, require);

export default inspect;
