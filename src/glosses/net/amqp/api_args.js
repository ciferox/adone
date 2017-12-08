const { is } = adone;

// A number of AMQP methods have a table-typed field called
// `arguments`, that is intended to carry extension-specific
// values. RabbitMQ uses this in a number of places; e.g., to specify
// an 'alternate exchange'.
//
// Many of the methods in this API have an `options` argument, from
// which I take both values that have a default in AMQP (e.g.,
// autoDelete in QueueDeclare) *and* values that are specific to
// RabbitMQ (e.g., 'alternate-exchange'), which would normally be
// supplied in `arguments`. So that extensions I don't support yet can
// be used, I include `arguments` itself among the options.
//
// The upshot of this is that I often need to prepare an `arguments`
// value that has any values passed in `options.arguments` as well as
// any I've promoted to being options themselves. Since I don't want
// to mutate anything passed in, the general pattern is to create a
// fresh object with the `arguments` value given as its prototype; all
// fields in the supplied value will be serialised, as well as any I
// set on the fresh object. What I don't want to do, however, is set a
// field to undefined by copying possibly missing field values,
// because that will mask a value in the prototype.
//
// NB the `arguments` field already has a default value of `{}`, so
// there's no need to explicitly default it unless I'm setting values.
const setIfDefined = (obj, prop, value) => {
    if (!is.nil(value)) {
        obj[prop] = value;
    }
};

export const assertQueue = (queue, options) => {
    queue = queue || "";
    options = options || {};

    const argt = Object.create(options.arguments || null);
    setIfDefined(argt, "x-expires", options.expires);
    setIfDefined(argt, "x-message-ttl", options.messageTtl);
    setIfDefined(argt, "x-dead-letter-exchange",
        options.deadLetterExchange);
    setIfDefined(argt, "x-dead-letter-routing-key",
        options.deadLetterRoutingKey);
    setIfDefined(argt, "x-max-length", options.maxLength);
    setIfDefined(argt, "x-max-priority", options.maxPriority);

    return {
        queue,
        exclusive: Boolean(options.exclusive),
        durable: (is.undefined(options.durable)) ? true : options.durable,
        autoDelete: Boolean(options.autoDelete),
        arguments: argt,
        passive: false,
        // deprecated but we have to include it
        ticket: 0,
        nowait: false
    };
};

export const checkQueue = (queue) => {
    return {
        queue,
        passive: true, // switch to "completely different" mode
        nowait: false,
        durable: true, autoDelete: false, exclusive: false, // ignored
        ticket: 0
    };
};

export const deleteQueue = (queue, options) => {
    options = options || {};
    return {
        queue,
        ifUnused: Boolean(options.ifUnused),
        ifEmpty: Boolean(options.ifEmpty),
        ticket: 0, nowait: false
    };
};

export const purgeQueue = (queue) => {
    return {
        queue,
        ticket: 0, nowait: false
    };
};

export const bindQueue = (queue, source, pattern, argt) => {
    return {
        queue,
        exchange: source,
        routingKey: pattern,
        arguments: argt,
        ticket: 0, nowait: false
    };
};

export const unbindQueue = (queue, source, pattern, argt) => {
    return {
        queue,
        exchange: source,
        routingKey: pattern,
        arguments: argt,
        ticket: 0, nowait: false
    };
};

export const assertExchange = (exchange, type, options) => {
    options = options || {};
    const argt = Object.create(options.arguments || null);
    setIfDefined(argt, "alternate-exchange", options.alternateExchange);
    return {
        exchange,
        ticket: 0,
        type,
        passive: false,
        durable: (is.undefined(options.durable)) ? true : options.durable,
        autoDelete: Boolean(options.autoDelete),
        internal: Boolean(options.internal),
        nowait: false,
        arguments: argt
    };
};

export const checkExchange = (exchange) => {
    return {
        exchange,
        passive: true, // switch to 'may as well be another method' mode
        nowait: false,
        // ff are ignored
        durable: true, internal: false, type: "", autoDelete: false,
        ticket: 0
    };
};

export const deleteExchange = (exchange, options) => {
    options = options || {};
    return {
        exchange,
        ifUnused: Boolean(options.ifUnused),
        ticket: 0, nowait: false
    };
};

export const bindExchange = (dest, source, pattern, argt) => {
    return {
        source,
        destination: dest,
        routingKey: pattern,
        arguments: argt,
        ticket: 0, nowait: false
    };
};

export const unbindExchange = (dest, source, pattern, argt) => {
    return {
        source,
        destination: dest,
        routingKey: pattern,
        arguments: argt,
        ticket: 0, nowait: false
    };
};

// It's convenient to construct the properties and the method fields
// at the same time, since in the APIs, values for both can appear in
// `options`. Since the property or mthod field names don't overlap, I
// just return one big object that can be used for both purposes, and
// the encoder will pick out what it wants.
export const publish = (exchange, routingKey, options) => {
    options = options || {};

    // The CC and BCC fields expect an array of "longstr", which would
    // normally be buffer values in JavaScript; however, since a field
    // array (or table) cannot have shortstr values, the codec will
    // encode all strings as longstrs anyway.
    const convertCC = (cc) => {
        if (is.undefined(cc)) {
            return undefined;
        } else if (is.array(cc)) {
            return cc.map(String);
        }
        return [String(cc)];
    };

    const headers = Object.create(options.headers || null);
    setIfDefined(headers, "CC", convertCC(options.CC));
    setIfDefined(headers, "BCC", convertCC(options.BCC));

    let deliveryMode; // undefined will default to 1 (non-persistent)

    // Previously I overloaded deliveryMode be a boolean meaning
    // 'persistent or not'; better is to name this option for what it
    // is, but I need to have backwards compatibility for applications
    // that either supply a numeric or boolean value.
    if (!is.undefined(options.persistent)) {
        deliveryMode = (options.persistent) ? 2 : 1;
    } else if (is.number(options.deliveryMode)) {
        deliveryMode = options.deliveryMode;
    } else if (options.deliveryMode) { // is supplied and truthy
        deliveryMode = 2;
    }

    let expiration = options.expiration;
    if (!is.undefined(expiration)) {
        expiration = expiration.toString();
    }

    return {
        // method fields
        exchange,
        routingKey,
        mandatory: Boolean(options.mandatory),
        immediate: false, // RabbitMQ doesn't implement this any more
        ticket: undefined,
        // properties
        contentType: options.contentType,
        contentEncoding: options.contentEncoding,
        headers,
        deliveryMode,
        priority: options.priority,
        correlationId: options.correlationId,
        replyTo: options.replyTo,
        expiration,
        messageId: options.messageId,
        timestamp: options.timestamp,
        type: options.type,
        userId: options.userId,
        appId: options.appId,
        clusterId: undefined
    };
};

export const consume = (queue, options) => {
    options = options || {};
    const argt = Object.create(options.arguments || null);
    setIfDefined(argt, "x-priority", options.priority);
    return {
        ticket: 0,
        queue,
        consumerTag: options.consumerTag || "",
        noLocal: Boolean(options.noLocal),
        noAck: Boolean(options.noAck),
        exclusive: Boolean(options.exclusive),
        nowait: false,
        arguments: argt
    };
};

export const cancel = (consumerTag) => {
    return {
        consumerTag,
        nowait: false
    };
};

export const get = (queue, options) => {
    options = options || {};
    return {
        ticket: 0,
        queue,
        noAck: Boolean(options.noAck)
    };
};

export const ack = (tag, allUpTo) => {
    return {
        deliveryTag: tag,
        multiple: Boolean(allUpTo)
    };
};

export const nack = (tag, allUpTo, requeue) => {
    return {
        deliveryTag: tag,
        multiple: Boolean(allUpTo),
        requeue: (is.undefined(requeue)) ? true : requeue
    };
};

export const reject = (tag, requeue) => {
    return {
        deliveryTag: tag,
        requeue: (is.undefined(requeue)) ? true : requeue
    };
};

export const prefetch = (count, global) => {
    return {
        prefetchCount: count || 0,
        prefetchSize: 0,
        global: Boolean(global)
    };
};

export const recover = () => {
    return { requeue: true };
};
