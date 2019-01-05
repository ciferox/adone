export const get = function (belowFn) {
    const oldLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = Infinity;

    const dummyObject = {};

    const v8Handler = Error.prepareStackTrace;
    Error.prepareStackTrace = function (dummyObject, v8StackTrace) {
        return v8StackTrace;
    };
    Error.captureStackTrace(dummyObject, belowFn || exports.get);

    const v8StackTrace = dummyObject.stack;
    Error.prepareStackTrace = v8Handler;
    Error.stackTraceLimit = oldLimit;

    return v8StackTrace;
};

export const parse = function (err) {
    if (!err.stack) {
        return [];
    }

    const self = this;
    const lines = err.stack.split("\n").slice(1);

    return lines
        .map((line) => {
            if (line.match(/^\s*[-]{4,}$/)) {
                return self._createParsedCallSite({
                    fileName: line,
                    lineNumber: null,
                    functionName: null,
                    typeName: null,
                    methodName: null,
                    columnNumber: null,
                    native: null
                });
            }

            const lineMatch = line.match(/at (?:(.+)\s+\()?(?:(.+?):(\d+)(?::(\d+))?|([^)]+))\)?/);
            if (!lineMatch) {
                return;
            }

            let object = null;
            let method = null;
            let functionName = null;
            let typeName = null;
            let methodName = null;
            const isNative = (lineMatch[5] === "native");

            if (lineMatch[1]) {
                functionName = lineMatch[1];
                let methodStart = functionName.lastIndexOf(".");
                if (functionName[methodStart - 1] == ".") {
                    methodStart--; 
                }
                if (methodStart > 0) {
                    object = functionName.substr(0, methodStart);
                    method = functionName.substr(methodStart + 1);
                    const objectEnd = object.indexOf(".Module");
                    if (objectEnd > 0) {
                        functionName = functionName.substr(objectEnd + 1);
                        object = object.substr(0, objectEnd);
                    }
                }
                typeName = null;
            }

            if (method) {
                typeName = object;
                methodName = method;
            }

            if (method === "<anonymous>") {
                methodName = null;
                functionName = null;
            }

            const properties = {
                fileName: lineMatch[2] || null,
                lineNumber: parseInt(lineMatch[3], 10) || null,
                functionName,
                typeName,
                methodName,
                columnNumber: parseInt(lineMatch[4], 10) || null,
                native: isNative
            };

            return self._createParsedCallSite(properties);
        })
        .filter((callSite) => {
            return Boolean(callSite);
        });
};

export const capture = (reason) => {
    const e = new Error();
    const stack = e.stack.split("\n").slice(2).join("\n");
    if (reason) {
        return `Stack capture: ${reason}\n${stack}`;
    }
    return stack;
};


const CallSite = function (properties) {
    for (const property in properties) {
        this[property] = properties[property];
    }
};

const strProperties = [
    "this",
    "typeName",
    "functionName",
    "methodName",
    "fileName",
    "lineNumber",
    "columnNumber",
    "function",
    "evalOrigin"
];
const boolProperties = [
    "topLevel",
    "eval",
    "native",
    "constructor"
];
strProperties.forEach((property) => {
    CallSite.prototype[property] = null;
    CallSite.prototype[`get${property[0].toUpperCase()}${property.substr(1)}`] = function () {
        return this[property];
    };
});
boolProperties.forEach((property) => {
    CallSite.prototype[property] = false;
    CallSite.prototype[`is${property[0].toUpperCase()}${property.substr(1)}`] = function () {
        return this[property];
    };
});

exports._createParsedCallSite = function (properties) {
    return new CallSite(properties);
};
