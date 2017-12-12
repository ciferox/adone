const {
    is,
    event: { EventEmitter },
    net: { amqp }
} = adone;

const {
    defs,
    channel: {
        BaseChannel,
        acceptMessage
    },
    Args
} = adone.private(amqp);

class Channel extends BaseChannel {
    constructor(connection) {
        super(connection);
        this.on("delivery", this.handleDelivery.bind(this));
        this.on("cancel", this.handleCancel.bind(this));
    }

    // An RPC that returns a 'proper' promise, which resolves to just the
    // response's fields; this is intended to be suitable for implementing
    // API procedures.
    rpc(method, fields, expect) {
        return new Promise((resolve, reject) => {
            this._rpc(method, fields, expect, (err, f) => {
                err ? reject(err) : resolve(f.fields);
            });
        });
    }

    // Do the remarkably simple channel open handshake
    open() {
        const ch = this.allocate();
        return ch.rpc(defs.ChannelOpen, { outOfBand: "" }, defs.ChannelOpenOk);
    }

    close() {
        return new Promise((resolve, reject) => {
            this.closeBecause("Goodbye", defs.constants.REPLY_SUCCESS, (err) => {
                err ? reject(err) : resolve();
            });
        });
    }

    // === Public API, declaring queues and stuff ===

    assertQueue(queue, options) {
        return this.rpc(defs.QueueDeclare,
            Args.assertQueue(queue, options),
            defs.QueueDeclareOk);
    }

    checkQueue(queue) {
        return this.rpc(defs.QueueDeclare,
            Args.checkQueue(queue),
            defs.QueueDeclareOk);
    }

    deleteQueue(queue, options) {
        return this.rpc(defs.QueueDelete,
            Args.deleteQueue(queue, options),
            defs.QueueDeleteOk);
    }

    purgeQueue(queue) {
        return this.rpc(defs.QueuePurge,
            Args.purgeQueue(queue),
            defs.QueuePurgeOk);
    }

    bindQueue(queue, source, pattern, argt) {
        return this.rpc(defs.QueueBind,
            Args.bindQueue(queue, source, pattern, argt),
            defs.QueueBindOk);
    }

    unbindQueue(queue, source, pattern, argt) {
        return this.rpc(defs.QueueUnbind,
            Args.unbindQueue(queue, source, pattern, argt),
            defs.QueueUnbindOk);
    }

    assertExchange(exchange, type, options) {
        // The server reply is an empty set of fields, but it's convenient
        // to have the exchange name handed to the continuation.
        return this.rpc(defs.ExchangeDeclare,
            Args.assertExchange(exchange, type, options),
            defs.ExchangeDeclareOk)
            .then((_ok) => {
                return { exchange };
            });
    }

    checkExchange(exchange) {
        return this.rpc(defs.ExchangeDeclare,
            Args.checkExchange(exchange),
            defs.ExchangeDeclareOk);
    }

    deleteExchange(name, options) {
        return this.rpc(defs.ExchangeDelete,
            Args.deleteExchange(name, options),
            defs.ExchangeDeleteOk);
    }

    bindExchange(dest, source, pattern, argt) {
        return this.rpc(defs.ExchangeBind,
            Args.bindExchange(dest, source, pattern, argt),
            defs.ExchangeBindOk);
    }

    unbindExchange(dest, source, pattern, argt) {
        return this.rpc(defs.ExchangeUnbind,
            Args.unbindExchange(dest, source, pattern, argt),
            defs.ExchangeUnbindOk);
    }

    // Working with messages

    publish(exchange, routingKey, content, options) {
        const fieldsAndProps = Args.publish(exchange, routingKey, options);
        return this.sendMessage(fieldsAndProps, fieldsAndProps, content);
    }

    sendToQueue(queue, content, options) {
        return this.publish("", queue, content, options);
    }

    consume(queue, callback, options) {
        // NB we want the callback to be run synchronously, so that we've
        // registered the consumerTag before any messages can arrive.
        const fields = Args.consume(queue, options);

        return new Promise((resolve, reject) => {
            this._rpc(defs.BasicConsume, fields, defs.BasicConsumeOk, (err, ok) => {
                if (err) {
                    return reject(err);
                }
                this.registerConsumer(ok.fields.consumerTag, callback);
                resolve(ok.fields);
            });
        });
    }

    cancel(consumerTag) {
        return new Promise((resolve, reject) => {
            this._rpc(defs.BasicCancel, Args.cancel(consumerTag), defs.BasicCancelOk, (err, ok) => {
                if (err) {
                    return reject(err);
                }
                this.unregisterConsumer(consumerTag);
                resolve(ok.fields);
            });
        });
    }

    get(queue, options) {
        const self = this;
        const fields = Args.get(queue, options);
        return new Promise((resolve, reject) => {
            self.sendOrEnqueue(defs.BasicGet, fields, (err, f) => {
                if (err) {
                    return reject(err);
                }
                if (f.id === defs.BasicGetEmpty) {
                    resolve(false);
                } else if (f.id === defs.BasicGetOk) {
                    const fields = f.fields;
                    self.handleMessage = acceptMessage((m) => {
                        m.fields = fields;
                        resolve(m);
                    });
                } else {
                    reject(new Error(`Unexpected response to BasicGet: ${f}`));
                }
            });
        });
    }

    ack(message, allUpTo) {
        this.sendImmediately(defs.BasicAck, Args.ack(message.fields.deliveryTag, allUpTo));
    }

    ackAll() {
        this.sendImmediately(defs.BasicAck, Args.ack(0, true));
    }

    nack(message, allUpTo, requeue) {
        this.sendImmediately(defs.BasicNack, Args.nack(message.fields.deliveryTag, allUpTo, requeue));
    }

    nackAll(requeue) {
        this.sendImmediately(defs.BasicNack, Args.nack(0, true, requeue));
    }

    // `Basic.Nack` is not available in older RabbitMQ versions (or in the
    // AMQP specification), so you have to use the one-at-a-time
    // `Basic.Reject`. This is otherwise synonymous with
    // `#nack(message, false, requeue)`.
    reject(message, requeue) {
        this.sendImmediately(defs.BasicReject, Args.reject(message.fields.deliveryTag, requeue));
    }

    recover() {
        return this.rpc(defs.BasicRecover, Args.recover(), defs.BasicRecoverOk);
    }

    // There are more options in AMQP than exposed here; RabbitMQ only
    // implements prefetch based on message count, and only for individual
    // channels or consumers. RabbitMQ v3.3.0 and after treat prefetch
    // (without `global` set) as per-consumer (for consumers following),
    // and prefetch with `global` set as per-channel.
    prefetch(count, global) {
        return this.rpc(defs.BasicQos, Args.prefetch(count, global), defs.BasicQosOk);
    }
}

Channel.prototype.qos = Channel.prototype.prefetch;

// Confirm channel. This is a channel with confirms 'switched on',
// meaning sent messages will provoke a responding 'ack' or 'nack'
// from the server. The upshot of this is that `publish` and
// `sendToQueue` both take a callback, which will be called either
// with `null` as its argument to signify 'ack', or an exception as
// its argument to signify 'nack'.
class ConfirmChannel extends Channel {
    publish(exchange, routingKey, content, options, cb) {
        this.pushConfirmCallback(cb);
        return super.publish(exchange, routingKey, content, options);
    }

    sendToQueue(queue, content, options, cb) {
        return this.publish("", queue, content, options, cb);
    }

    waitForConfirms() {
        const awaiting = [];
        const unconfirmed = this.unconfirmed;
        unconfirmed.forEach((val, index) => {
            if (is.null(val)) {
                // already confirmed
            } else {
                const confirmed = new Promise(((resolve, reject) => {
                    unconfirmed[index] = function (err) {
                        if (val) {
                            val(err);
                        }
                        if (is.null(err)) {
                            resolve();
                        } else {
                            reject(err);
                        }
                    };
                }));
                awaiting.push(confirmed);
            }
        });
        return Promise.all(awaiting);
    }
}


export default class ChannelModel extends EventEmitter {
    constructor(connection) {
        super();
        this.connection = connection;
        const self = this;
        ["error", "close", "blocked", "unblocked"].forEach((ev) => {
            connection.on(ev, self.emit.bind(self, ev));
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.connection.close((err) => {
                err ? reject(err) : resolve();
            });
        });
    }

    createChannel() {
        const c = new Channel(this.connection);
        return c.open().then((openOk) => {
            return c;
        });
    }

    createConfirmChannel() {
        const c = new ConfirmChannel(this.connection);
        return c.open()
            .then((openOk) => {
                return c.rpc(defs.ConfirmSelect, { nowait: false },
                    defs.ConfirmSelectOk);
            })
            .then(() => {
                return c;
            });
    }
}