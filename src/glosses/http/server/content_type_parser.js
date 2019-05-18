const {
    is
} = adone;

/**
 * eslint-disable func-style
 */
const lru = require("tiny-lru");
const secureJson = require("secure-json-parse");
const {
    kDefaultJsonParse,
    kContentTypeParser,
    kBodyLimit,
    kState
} = require("./symbols");
const {
    codes: {
        FST_ERR_CTP_INVALID_TYPE,
        FST_ERR_CTP_EMPTY_TYPE,
        FST_ERR_CTP_ALREADY_PRESENT,
        FST_ERR_CTP_INVALID_HANDLER,
        FST_ERR_CTP_INVALID_PARSE_TYPE,
        FST_ERR_CTP_BODY_TOO_LARGE,
        FST_ERR_CTP_INVALID_MEDIA_TYPE,
        FST_ERR_CTP_INVALID_CONTENT_LENGTH,
        FST_ERR_CTP_EMPTY_JSON_BODY
    }
} = require("./errors");

function ContentTypeParser(bodyLimit, onProtoPoisoning) {
    this[kDefaultJsonParse] = getDefaultJsonParser(onProtoPoisoning);
    this.customParsers = {};
    this.customParsers["application/json"] = new Parser(true, false, bodyLimit, this[kDefaultJsonParse]);
    this.customParsers["text/plain"] = new Parser(true, false, bodyLimit, defaultPlainTextParser);
    this.parserList = ["application/json", "text/plain"];
    this.cache = lru(100);
}

ContentTypeParser.prototype.add = function (contentType, opts, parserFn) {
    if (!is.string(contentType)) {
        throw new FST_ERR_CTP_INVALID_TYPE(); 
    }
    if (contentType.length === 0) {
        throw new FST_ERR_CTP_EMPTY_TYPE(); 
    }
    if (!is.function(parserFn)) {
        throw new FST_ERR_CTP_INVALID_HANDLER(); 
    }

    if (this.hasParser(contentType)) {
        throw new FST_ERR_CTP_ALREADY_PRESENT(contentType);
    }

    if (!is.undefined(opts.parseAs)) {
        if (opts.parseAs !== "string" && opts.parseAs !== "buffer") {
            throw new FST_ERR_CTP_INVALID_PARSE_TYPE(opts.parseAs);
        }
    }

    const parser = new Parser(
        opts.parseAs === "string",
        opts.parseAs === "buffer",
        opts.bodyLimit,
        parserFn
    );

    if (contentType === "*") {
        this.parserList.push("");
        this.customParsers[""] = parser;
    } else {
        if (contentType !== "application/json") {
            this.parserList.unshift(contentType);
        }
        this.customParsers[contentType] = parser;
    }
};

ContentTypeParser.prototype.hasParser = function (contentType) {
    if (contentType === "application/json") {
        return this.customParsers["application/json"].fn !== this[kDefaultJsonParse];
    }
    if (contentType === "text/plain") {
        return this.customParsers["text/plain"].fn !== defaultPlainTextParser;
    }
    return contentType in this.customParsers;
};

ContentTypeParser.prototype.getParser = function (contentType) {
    for (let i = 0; i < this.parserList.length; i++) {
        if (contentType.indexOf(this.parserList[i]) > -1) {
            const parser = this.customParsers[this.parserList[i]];
            this.cache.set(contentType, parser);
            return parser;
        }
    }

    return this.customParsers[""];
};

ContentTypeParser.prototype.run = function (contentType, handler, request, reply) {
    const parser = this.cache.get(contentType) || this.getParser(contentType);
    if (is.undefined(parser)) {
        reply.send(new FST_ERR_CTP_INVALID_MEDIA_TYPE(contentType));
    } else {
        if (parser.asString === true || parser.asBuffer === true) {
            rawBody(
                request,
                reply,
                reply.context._parserOptions,
                parser,
                done
            );
        } else {
            const result = parser.fn(request.raw, done);
            if (result && is.function(result.then)) {
                result.then((body) => done(null, body), done);
            }
        }
    }

    function done(error, body) {
        if (error) {
            reply.send(error);
        } else {
            request.body = body;
            handler(request, reply);
        }
    }
};

function rawBody(request, reply, options, parser, done) {
    const asString = parser.asString;
    const limit = is.null(options.limit) ? parser.bodyLimit : options.limit;
    const contentLength = is.undefined(request.headers["content-length"])
        ? NaN
        : Number.parseInt(request.headers["content-length"], 10);

    if (contentLength > limit) {
        reply.send(new FST_ERR_CTP_BODY_TOO_LARGE());
        return;
    }

    let receivedLength = 0;
    let body = asString === true ? "" : [];
    const req = request.raw;

    if (asString === true) {
        req.setEncoding("utf8");
    }

    req.on("data", onData);
    req.on("end", onEnd);
    req.on("error", onEnd);

    function onData(chunk) {
        receivedLength += chunk.length;

        if (receivedLength > limit) {
            req.removeListener("data", onData);
            req.removeListener("end", onEnd);
            req.removeListener("error", onEnd);
            reply.send(new FST_ERR_CTP_BODY_TOO_LARGE());
            return;
        }

        if (asString === true) {
            body += chunk;
        } else {
            body.push(chunk);
        }
    }

    function onEnd(err) {
        req.removeListener("data", onData);
        req.removeListener("end", onEnd);
        req.removeListener("error", onEnd);

        if (!is.undefined(err)) {
            err.statusCode = 400;
            reply.code(err.statusCode).send(err);
            return;
        }

        if (asString === true) {
            receivedLength = Buffer.byteLength(body);
        }
        if (!is.nan(contentLength) && receivedLength !== contentLength) {
            reply.send(new FST_ERR_CTP_INVALID_CONTENT_LENGTH());
            return;
        }

        if (asString === false) {
            body = Buffer.concat(body);
        }

        const result = parser.fn(req, body, done);
        if (result && is.function(result.then)) {
            result.then((body) => done(null, body), done);
        }
    }
}

function getDefaultJsonParser(onProtoPoisoning) {
    return defaultJsonParser;

    function defaultJsonParser(req, body, done) {
        if (body === "" || is.nil(body)) {
            return done(new FST_ERR_CTP_EMPTY_JSON_BODY(), undefined);
        }

        try {
            var json = secureJson.parse(body, { protoAction: onProtoPoisoning });
        } catch (err) {
            err.statusCode = 400;
            return done(err, undefined);
        }
        done(null, json);
    }
}

function defaultPlainTextParser(req, body, done) {
    done(null, body);
}

function Parser(asString, asBuffer, bodyLimit, fn) {
    this.asString = asString;
    this.asBuffer = asBuffer;
    this.bodyLimit = bodyLimit;
    this.fn = fn;
}

function buildContentTypeParser(c) {
    const contentTypeParser = new ContentTypeParser();
    contentTypeParser[kDefaultJsonParse] = c[kDefaultJsonParse];
    Object.assign(contentTypeParser.customParsers, c.customParsers);
    contentTypeParser.parserList = c.parserList.slice();
    return contentTypeParser;
}

function addContentTypeParser(contentType, opts, parser) {
    if (this[kState].started) {
        throw new Error('Cannot call "addContentTypeParser" when fastify instance is already started!');
    }

    if (is.function(opts)) {
        parser = opts;
        opts = {};
    }

    if (!opts) {
        opts = {}; 
    }
    if (!opts.bodyLimit) {
        opts.bodyLimit = this[kBodyLimit]; 
    }

    if (is.array(contentType)) {
        contentType.forEach((type) => this[kContentTypeParser].add(type, opts, parser));
    } else {
        this[kContentTypeParser].add(contentType, opts, parser);
    }

    return this;
}

function hasContentTypeParser(contentType) {
    return this[kContentTypeParser].hasParser(contentType);
}

module.exports = ContentTypeParser;
module.exports.helpers = {
    buildContentTypeParser,
    addContentTypeParser,
    hasContentTypeParser
};
module.exports[Symbol.for("internals")] = { rawBody };
