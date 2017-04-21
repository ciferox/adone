const { cui } = adone;

/**
 * Creates a string with the same length as `numSpaces` parameter
 **/
const indent = function indent(numSpaces) {
    return new Array(numSpaces + 1).join(" ");
};

/**
 * Gets the string length of the longer index in a hash
 **/
const getMaxIndexLength = function (input) {
    let maxWidth = 0;

    Object.getOwnPropertyNames(input).forEach((key) => {
        // Skip undefined values.
        if (input[key] === undefined) {
            return;
        }

        maxWidth = Math.max(maxWidth, key.length);
    });
    return maxWidth;
};


// Helper function to detect if an object can be directly serializable
const isSerializable = function (input, onlyPrimitives, options) {
    if (
        typeof input === "boolean" ||
        typeof input === "number" ||
        typeof input === "function" ||
        input === null ||
        input instanceof Date
    ) {
        return true;
    }
    if (typeof input === "string" && input.indexOf("\n") === -1) {
        return true;
    }

    if (options.inlineArrays && !onlyPrimitives) {
        if (Array.isArray(input) && isSerializable(input[0], true, options)) {
            return true;
        }
    }

    return false;
};

const addColorToData = function (input, options) {
    if (options.noColor) {
        return input;
    }

    if (typeof input === "string") {
        // Print strings in regular terminal color
        return options.stringColor ? cui.style[options.stringColor](input) : input;
    }

    const sInput = String(input);

    if (input === true) {
        return cui.style.green(sInput);
    }
    if (input === false) {
        return cui.style.red(sInput);
    }
    if (input === null) {
        return cui.style.grey(sInput);
    }
    if (typeof input === "number") {
        return cui.style[options.numberColor](sInput);
    }
    if (typeof input === "function") {
        return "function() {}";
    }

    if (Array.isArray(input)) {
        return input.join(", ");
    }

    return sInput;
};

const indentLines = function (string, spaces) {
    let lines = string.split("\n");
    lines = lines.map((line) => {
        return indent(spaces) + line;
    });
    return lines.join("\n");
};

const renderToArray = function (data, options, indentation) {
    if (isSerializable(data, false, options)) {
        return [indent(indentation) + addColorToData(data, options)];
    }

    // Unserializable string means it's multiline
    if (typeof data === "string") {
        return [
            `${indent(indentation)}"""`,
            indentLines(data, indentation + options.defaultIndentation),
            `${indent(indentation)}"""`
        ];
    }


    if (Array.isArray(data)) {
        // If the array is empty, render the `emptyArrayMsg`
        if (data.length === 0) {
            return [indent(indentation) + options.emptyArrayMsg];
        }

        const outputArray = [];

        data.forEach((element) => {
            // Prepend the dash at the begining of each array's element line
            let line = "- ";
            if (!options.noColor) {
                line = cui.style[options.dashColor](line);
            }
            line = indent(indentation) + line;

            // If the element of the array is a string, bool, number, or null
            // render it in the same line
            if (isSerializable(element, false, options)) {
                line += renderToArray(element, options, 0)[0];
                outputArray.push(line);

                // If the element is an array or object, render it in next line
            } else {
                outputArray.push(line);
                outputArray.push.apply(
                    outputArray,
                    renderToArray(
                        element, options, indentation + options.defaultIndentation
                    )
                );
            }
        });

        return outputArray;
    }

    if (data instanceof Error) {
        return renderToArray(
            {
                message: data.message,
                stack: data.stack.split("\n")
            },
            options,
            indentation
        );
    }

    // If values alignment is enabled, get the size of the longest index
    // to align all the values
    const maxIndexLength = options.noAlign ? 0 : getMaxIndexLength(data);
    let key;
    const output = [];

    Object.getOwnPropertyNames(data).forEach((i) => {
        // Prepend the index at the beginning of the line
        key = (`${i}: `);
        if (!options.noColor) {
            key = cui.style[options.keysColor](key);
        }
        key = indent(indentation) + key;

        // Skip `undefined`, it's not a valid JSON value.
        if (data[i] === undefined) {
            return;
        }

        // If the value is serializable, render it in the same line
        if (isSerializable(data[i], false, options)) {
            const nextIndentation = options.noAlign ? 0 : maxIndexLength - i.length;
            key += renderToArray(data[i], options, nextIndentation)[0];
            output.push(key);

            // If the index is an array or object, render it in next line
        } else {
            output.push(key);
            output.push.apply(
                output,
                renderToArray(
                    data[i],
                    options,
                    indentation + options.defaultIndentation
                )
            );
        }
    });
    return output;
};

// ### Render function
// *Parameters:*
//
// * **`data`**: Data to render
// * **`options`**: Hash with different options to configure the parser
// * **`indentation`**: Base indentation of the parsed output
//
// *Example of options hash:*
//
//     {
//       emptyArrayMsg: '(empty)', // Rendered message on empty strings
//       keysColor: 'blue',        // Color for keys in hashes
//       dashColor: 'red',         // Color for the dashes in arrays
//       stringColor: 'grey',      // Color for strings
//       defaultIndentation: 2     // Indentation on nested objects
//     }
export default (data, options, indentation) => {
    // Default values
    indentation = indentation || 0;
    options = options || {};
    options.emptyArrayMsg = options.emptyArrayMsg || "(empty array)";
    options.keysColor = options.keysColor || "green";
    options.dashColor = options.dashColor || "green";
    options.numberColor = options.numberColor || "blue";
    options.defaultIndentation = options.defaultIndentation || 2;
    options.noColor = Boolean(options.noColor);
    options.noAlign = Boolean(options.noAlign);

    options.stringColor = options.stringColor || null;

    return renderToArray(data, options, indentation).join("\n");
};
