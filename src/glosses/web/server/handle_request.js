/**
 * eslint-disable func-style
 */
const {
    is
} = adone;

const validation = require("./validation");
const validateSchema = validation.validate;
const { hookRunner, hookIterator } = require("./hooks");
const wrapThenable = require("./wrap_thenable");

function handleRequest(err, request, reply) {
    if (reply.sent === true) {
        return; 
    }
    if (!is.nil(err)) {
        reply.send(err);
        return;
    }

    const method = request.raw.method;
    const headers = request.headers;

    if (method === "GET" || method === "HEAD") {
        handler(request, reply);
        return;
    }

    const contentType = headers["content-type"];

    if (method === "POST" || method === "PUT" || method === "PATCH") {
        if (is.undefined(contentType)) {
            if (
                is.undefined(headers["transfer-encoding"]) &&
        (headers["content-length"] === "0" || is.undefined(headers["content-length"]))
            ) { // Request has no body to parse
                handler(request, reply);
            } else {
                reply.context.contentTypeParser.run("", handler, request, reply);
            }
        } else {
            reply.context.contentTypeParser.run(contentType, handler, request, reply);
        }
        return;
    }

    if (method === "OPTIONS" || method === "DELETE") {
        if (
            !is.undefined(contentType) &&
      (
          !is.undefined(headers["transfer-encoding"]) ||
        !is.undefined(headers["content-length"])
      )
        ) {
            reply.context.contentTypeParser.run(contentType, handler, request, reply);
        } else {
            handler(request, reply);
        }
        return;
    }

    // Return 404 instead of 405 see https://github.com/fastify/fastify/pull/862 for discussion
    reply.code(404).send(new Error("Not Found"));
}

function handler(request, reply) {
    if (!is.null(reply.context.preValidation)) {
        hookRunner(
            reply.context.preValidation,
            hookIterator,
            request,
            reply,
            preValidationCallback
        );
    } else {
        preValidationCallback(null, request, reply);
    }
}

function preValidationCallback(err, request, reply) {
    if (reply.res.finished === true) {
        return; 
    }
    if (!is.nil(err)) {
        reply.send(err);
        return;
    }

    const result = validateSchema(reply.context, request);
    if (result) {
        if (reply.context.attachValidation === false) {
            reply.code(400).send(result);
            return;
        }

        reply.request.validationError = result;
    }

    // preHandler hook
    if (!is.null(reply.context.preHandler)) {
        hookRunner(
            reply.context.preHandler,
            hookIterator,
            request,
            reply,
            preHandlerCallback
        );
    } else {
        preHandlerCallback(null, request, reply);
    }
}

function preHandlerCallback(err, request, reply) {
    if (reply.res.finished === true) {
        return; 
    }
    if (!is.nil(err)) {
        reply.send(err);
        return;
    }

    const result = reply.context.handler(request, reply);
    if (result && is.function(result.then)) {
        wrapThenable(result, reply);
    }
}

module.exports = handleRequest;
module.exports[Symbol.for("internals")] = { handler };
