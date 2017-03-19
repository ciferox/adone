const { std: { fs, path }, is } = adone;

export default function createInstance(ErrorConstructor = Error) {
    let errorFormatterInstalled = false;
    let uncaughtShimInstalled = false;
    let emptyCacheBetweenOperations = false;
    let fileContentsCache = new Map();
    let sourceMapCache = new Map();

    const reSourceMap = /^data:application\/json[^,]+base64,/;

    const retrieveFileHandlers = [];
    const retrieveMapHandlers = [];

    const handlerExec = (list) => {
        return (arg) => {
            for (const f of list) {
                const ret = f(arg);
                if (ret) {
                    return ret;
                }
            }
            return null;
        };
    };

    const retrieveFile = handlerExec(retrieveFileHandlers);

    retrieveFileHandlers.push((path) => {
        // Trim the path to make sure there is no extra whitespace.
        path = path.trim();
        if (fileContentsCache.has(path)) {
            return fileContentsCache.het(path);
        }

        let contents;
        try {
            contents = fs.readFileSync(path, "utf8");
        } catch (e) {
            contents = null;
        }

        fileContentsCache.set(path, contents);
        return contents;
    });

    const supportRelativeURL = (file, url) => {
        if (!file) {
            return url;
        }
        const dir = path.dirname(file);
        const match = /^\w+:\/\/[^\/]*/.exec(dir);
        const protocol = match ? match[0] : "";
        return protocol + path.resolve(dir.slice(protocol.length), url);
    };

    const retrieveSourceMapURL = (source) => {
        const fileData = retrieveFile(source);
        const re = /(?:\/\/[@#][ \t]+sourceMappingURL=([^\s'"]+?)[ \t]*$)|(?:\/\*[@#][ \t]+sourceMappingURL=([^\*]+?)[ \t]*(?:\*\/)[ \t]*$)/mg;
        let lastMatch;
        let match;
        while ((match = re.exec(fileData))) {
            lastMatch = match;
        }
        if (!lastMatch) {
            return null;
        }
        return lastMatch[1];
    };

    const retrieveSourceMap = handlerExec(retrieveMapHandlers);
    retrieveMapHandlers.push((source) => {
        let sourceMappingURL = retrieveSourceMapURL(source);
        if (!sourceMappingURL) {
            return null;
        }

        let sourceMapData;
        if (reSourceMap.test(sourceMappingURL)) {
            const rawData = sourceMappingURL.slice(sourceMappingURL.indexOf(",") + 1);
            sourceMapData = Buffer.from(rawData, "base64").toString();
            sourceMappingURL = source;
        } else {
            sourceMappingURL = supportRelativeURL(source, sourceMappingURL);
            sourceMapData = retrieveFile(sourceMappingURL);
        }

        if (!sourceMapData) {
            return null;
        }

        return {
            url: sourceMappingURL,
            map: sourceMapData
        };
    });

    const mapSourcePosition = (position) => {
        let sourceMap = sourceMapCache.get(position.source);
        if (!sourceMap) {
            const urlAndMap = retrieveSourceMap(position.source);
            if (urlAndMap) {
                sourceMap = {
                    url: urlAndMap.url,
                    map: adone.sourcemap.createConsumer(urlAndMap.map)
                };
                sourceMapCache.set(position.source, sourceMap);

                if (sourceMap.map.sourcesContent) {
                    sourceMap.map.sources.forEach((source, i) => {
                        const contents = sourceMap.map.sourcesContent[i];
                        if (contents) {
                            const url = supportRelativeURL(sourceMap.url, source);
                            fileContentsCache.set(url, contents);
                        }
                    });
                }
            } else {
                sourceMap = {
                    url: null,
                    map: null
                };
                sourceMapCache.set(position.source, sourceMap);
            }
        }

        if (sourceMap && sourceMap.map) {
            const originalPosition = sourceMap.map.originalPositionFor(position);
            if (!is.null(originalPosition.source)) {
                originalPosition.source = supportRelativeURL(
                    sourceMap.url, originalPosition.source);
                return originalPosition;
            }
        }

        return position;
    };

    // Parses code generated by FormatEvalOrigin(), a function inside V8:
    // https://code.google.com/p/v8/source/browse/trunk/src/messages.js
    const mapEvalOrigin = (origin) => {
        // Most eval() calls are in this format
        let match = /^eval at ([^(]+) \((.+):(\d+):(\d+)\)$/.exec(origin);
        if (match) {
            const position = object.mapSourcePosition({  // eslint-disable-line
                source: match[2],
                line: match[3],
                column: match[4] - 1
            });
            return `eval at ${match[1]} (${position.source}:${position.line}:${position.column + 1})`;
        }

        // Parse nested eval() calls using recursion
        match = /^eval at ([^(]+) \((.+)\)$/.exec(origin);
        if (match) {
            return `eval at ${match[1]} (${mapEvalOrigin(match[2])})`;
        }

        return origin;
    };

    // This is copied almost verbatim from the V8 source code at
    // https://code.google.com/p/v8/source/browse/trunk/src/messages.js. The
    // implementation of wrapCallSite() used to just forward to the actual source
    // code of CallSite.prototype.toString but unfortunately a new release of V8
    // did something to the prototype chain and broke the shim. The only fix I
    // could find was copy/paste.
    const CallSiteToString = function () {
        let fileName;
        let fileLocation = "";
        if (this.isNative()) {
            fileLocation = "native";
        } else {
            fileName = this.getScriptNameOrSourceURL();
            if (!fileName && this.isEval()) {
                fileLocation = this.getEvalOrigin();
                fileLocation += ", ";  // Expecting source position to follow.
            }

            if (fileName) {
                fileLocation += fileName;
            } else {
                fileLocation += "<anonymous>";
            }
            const lineNumber = this.getLineNumber();
            if (lineNumber !== null) {
                fileLocation += `:${lineNumber}`;
                const columnNumber = this.getColumnNumber();
                if (columnNumber) {
                    fileLocation += `:${columnNumber}`;
                }
            }
        }

        let line = "";
        const functionName = this.getFunctionName();
        let addSuffix = true;
        const isConstructor = this.isConstructor();
        const isMethodCall = !(this.isToplevel() || isConstructor);
        if (isMethodCall) {
            const typeName = this.getTypeName();
            const methodName = this.getMethodName();
            if (functionName) {
                if (typeName && functionName.indexOf(typeName) !== 0) {
                    line += `${typeName}.`;
                }
                line += functionName;
                if (methodName && functionName.indexOf(`.${methodName}`) !== functionName.length - methodName.length - 1) {
                    line += ` [as ${methodName}]`;
                }
            } else {
                line += `${typeName}.${methodName || "<anonymous>"}`;
            }
        } else if (isConstructor) {
            line += `new ${functionName || "<anonymous>"}`;
        } else if (functionName) {
            line += functionName;
        } else {
            line += fileLocation;
            addSuffix = false;
        }
        if (addSuffix) {
            line += ` (${fileLocation})`;
        }
        return line;
    };

    const cloneCallSite = (frame) => {
        const object = {};
        Object.getOwnPropertyNames(Object.getPrototypeOf(frame)).forEach((name) => {
            object[name] = /^(?:is|get)/.test(name) ? () => frame[name].call(frame) : frame[name];
        });
        object.toString = CallSiteToString;
        return object;
    };

    const wrapCallSite = (frame) => {
        if (frame.isNative()) {
            return frame;
        }

        // Most call sites will return the source file from getFileName(), but code
        // passed to eval() ending in "//# sourceURL=..." will return the source file
        // from getScriptNameOrSourceURL() instead
        const source = frame.getFileName() || frame.getScriptNameOrSourceURL();
        if (source) {
            const line = frame.getLineNumber();
            let column = frame.getColumnNumber() - 1;
            // Fix position in Node where some (internal) code is prepended.
            // See https://github.com/evanw/node-source-map-support/issues/36
            if (line === 1 && !frame.isEval()) {
                column -= 62;
            }
            const position = object.mapSourcePosition({ source, line, column });  // eslint-disable-line
            frame = cloneCallSite(frame);
            frame.getFileName = () => position.source;
            frame.getLineNumber = () => position.line;
            frame.getColumnNumber = () => position.column + 1;
            frame.getScriptNameOrSourceURL = () => position.source;
            return frame;
        }

        // Code called using eval() needs special handling
        let origin = frame.isEval() && frame.getEvalOrigin();
        if (origin) {
            origin = mapEvalOrigin(origin);
            frame = cloneCallSite(frame);
            frame.getEvalOrigin = () => origin;
            return frame;
        }

        return frame;
    };

    // This function is part of the V8 stack trace API, for more info see:
    // http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
    const prepareStackTrace = (error, stack) => {
        if (emptyCacheBetweenOperations) {
            fileContentsCache = new Map();
            sourceMapCache = new Map();
        }
        return error + stack.map((frame) => {
            return `\n    at ${wrapCallSite(frame)}`;
        }).join("");
    };

    // Generate position and snippet of original source with pointer
    const getErrorSource = (error) => {
        const match = /\n {4}at [^(]+ \((.*):(\d+):(\d+)\)/.exec(error.stack);
        if (match) {
            const source = match[1];
            const line = Number(match[2]);
            const column = Number(match[3]);
            // Support the inline sourceContents inside the source map
            let contents = fileContentsCache.get(source);

            // Support files on disk
            if (!contents && fs.existsSync(source)) {
                contents = fs.readFileSync(source, "utf8");
            }
            // Format the line from the original source code like node does
            if (contents) {
                const code = contents.split(/(?:\r\n|\r|\n)/)[line - 1];
                if (code) {
                    return `${source}:${line}\n${code}\n${new Array(column).join(" ")}^`;
                }
            }
        }
        return null;
    };

    const printErrorAndExit = (error) => {
        const source = getErrorSource(error);

        if (source) {
            console.error();
            console.error(source);
        }

        console.error(error.stack);
        process.exit(1);
    };

    const shimEmitUncaughtException = () => {
        const origEmit = process.emit;

        process.emit = function (...args) {
            const [type] = args;
            if (type === "uncaughtException") {
                const hasStack = (args[1] && args[1].stack);
                const hasListeners = this.listeners(type).length > 0;

                if (hasStack && !hasListeners) {
                    return printErrorAndExit(args[1]);
                }
            }

            return origEmit.apply(this, args);
        };
    };

    const install = (options = {}) => {
        if (options.retrieveFile) {
            if (options.overrideRetrieveFile) {
                retrieveFileHandlers.length = 0;
            }

            retrieveFileHandlers.unshift(options.retrieveFile);
        }

        if (options.retrieveSourceMap) {
            if (options.overrideRetrieveSourceMap) {
                retrieveMapHandlers.length = 0;
            }

            retrieveMapHandlers.unshift(options.retrieveSourceMap);
        }

        if (!emptyCacheBetweenOperations) {
            emptyCacheBetweenOperations = "emptyCacheBetweenOperations" in options ?
                options.emptyCacheBetweenOperations : false;
        }

        if (!errorFormatterInstalled) {
            errorFormatterInstalled = true;
            ErrorConstructor.prepareStackTrace = prepareStackTrace;
        }

        if (!uncaughtShimInstalled) {
            const installHandler = "handleUncaughtExceptions" in options ?
                options.handleUncaughtExceptions : true;

            if (installHandler) {
                uncaughtShimInstalled = true;
                shimEmitUncaughtException();
            }
        }
    };

    const reflect = (err, map = new Map()) => {
        const prepare = ErrorConstructor.prepareStackTrace;
        const oldCache = sourceMapCache;

        sourceMapCache = map;

        ErrorConstructor.prepareStackTrace = function (error, stack) {
            return error + stack.map((frame) => {
                return `\n    at ${wrapCallSite(frame)}`;
            }).join("");
        };

        err.stack;

        ErrorConstructor.prepareStackTrace = prepare;
        sourceMapCache = oldCache;

        return err;
    };

    const object = {
        reflect,
        retrieveSourceMap,
        supportRelativeURL,
        retrieveSourceMapURL,
        mapSourcePosition,
        wrapCallSite,
        getErrorSource,
        install,
        retrieveFileHandlers,
        retrieveMapHandlers
    };

    ErrorConstructor[Symbol.for("sourceMaps")] = object;

    return object;
}
