import {
    succeed,
    fail,
    schedule,
    randomString
} from "./support";

const { is, std: { assert } } = adone;

const api = adone.net.amqp;
const rabbitMQHost = process.env.RABBITMQ_HOST || "localhost";

const URL = `amqp://${rabbitMQHost}`;

const connect = () => {
    return api.connect(URL);
};

// Expect this promise to fail, and flip the results accordingly.
const expectFail = (promise) => {
    return new Promise(((resolve, reject) => {
        return promise.then(reject).catch(resolve);
    }));
};

// I'll rely on operations being rejected, rather than the channel
// close error, to detect failure.
const ignore = () => { };
const ignoreErrors = (c) => {
    c.on("error", ignore); return c;
};
const logErrors = (c) => {
    c.on("error", console.warn); return c;
};

// Run a test with `name`, given a function that takes an open
// channel, and returns a promise that is resolved on test success or
// rejected on test failure.
const channelTest = (chmethod, name, chfun) => {
    it(name, async () => {
        const c = await connect(URL);
        try {
            logErrors(c);
            const c1 = await c[chmethod]();
            ignoreErrors(c1);
            await chfun(c1);
        } finally {
            await c.close();
        }
    });
};

const chtest = channelTest.bind(null, "createChannel");

describe("net", "amqp", () => {

    describe("connect", () => {

        it("at all", (done) => {
            connect(URL).then((c) => {
                return c.close()
                ;
            }).then(succeed(done), fail(done));
        });

        chtest("create channel", ignore); // i.e., just don't bork
    });

    const QUEUE_OPTS = { durable: false };
    const EX_OPTS = { durable: false };

    describe("assert, check, delete", () => {

        chtest("assert and check queue", (ch) => {
            return ch.assertQueue("test.check-queue", QUEUE_OPTS)
                .then((qok) => {
                    return ch.checkQueue("test.check-queue");
                });
        });

        chtest("assert and check exchange", (ch) => {
            return ch.assertExchange("test.check-exchange", "direct", EX_OPTS)
                .then((eok) => {
                    assert.equal("test.check-exchange", eok.exchange);
                    return ch.checkExchange("test.check-exchange");
                });
        });

        chtest("fail on reasserting queue with different options",
            (ch) => {
                const q = "test.reassert-queue";
                return ch.assertQueue(
                    q, { durable: false, autoDelete: true })
                    .then(() => {
                        return expectFail(
                            ch.assertQueue(q, {
                                durable: false,
                                autoDelete: false
                            }));
                    });
            });

        chtest("fail on checking a queue that's not there", (ch) => {
            return expectFail(ch.checkQueue(`test.random-${randomString()}`));
        });

        chtest("fail on checking an exchange that's not there", (ch) => {
            return expectFail(ch.checkExchange(`test.random-${randomString()}`));
        });

        chtest("fail on reasserting exchange with different type",
            (ch) => {
                const ex = "test.reassert-ex";
                return ch.assertExchange(ex, "fanout", EX_OPTS)
                    .then(() => {
                        return expectFail(
                            ch.assertExchange(ex, "direct", EX_OPTS));
                    });
            });

        chtest("channel break on publishing to non-exchange", (ch) => {
            return new Promise(((resolve) => {
                ch.on("error", resolve);
                ch.publish(randomString(), "", Buffer.from("foobar"));
            }));
        });

        chtest("delete queue", async (ch) => {
            const q = "test.delete-queue";
            await Promise.all([
                ch.assertQueue(q, QUEUE_OPTS),
                ch.checkQueue(q)
            ]);
            await ch.deleteQueue(q);
            await expectFail(ch.checkQueue(q));
        });

        chtest("delete exchange", async (ch) => {
            const ex = "test.delete-exchange";
            await Promise.all([
                ch.assertExchange(ex, "fanout", EX_OPTS),
                ch.checkExchange(ex)
            ]);
            await ch.deleteExchange(ex);
            await expectFail(ch.checkExchange(ex));
        });
    });

    // Wait for the queue to meet the condition; useful for waiting for
    // messages to arrive, for example.
    const waitForQueue = (q, condition) => {
        return connect(URL).then((c) => {
            return c.createChannel()
                .then((ch) => {
                    return ch.checkQueue(q).then((qok) => {
                        const check = () => {
                            return ch.checkQueue(q).then((qok) => {
                                if (condition(qok)) {
                                    c.close();
                                    return qok;
                                }
                                schedule(check);
                            });
                        };
                        return check();
                    });
                });
        });
    };

    // Return a promise that resolves when the queue has at least `num`
    // messages. If num is not supplied its assumed to be 1.
    const waitForMessages = (q, num) => {
        const min = (is.undefined(num)) ? 1 : num;
        return waitForQueue(q, (qok) => {
            return qok.messageCount >= min;
        });
    };

    describe("sendMessage", () => {

        // publish different size messages
        chtest("send to queue and get from queue", async (ch) => {
            const q = "test.send-to-q";
            const msg = randomString();
            await Promise.all([
                ch.assertQueue(q, QUEUE_OPTS),
                ch.purgeQueue(q)
            ]);
            ch.sendToQueue(q, Buffer.from(msg));
            await waitForMessages(q);
            const m = await ch.get(q, { noAck: true });
            assert(m);
            assert.equal(msg, m.content.toString());
        });

        chtest("send (and get) zero content to queue", async (ch) => {
            const q = "test.send-to-q";
            const msg = Buffer.alloc(0);
            await Promise.all([
                ch.assertQueue(q, QUEUE_OPTS),
                ch.purgeQueue(q)
            ]);
            ch.sendToQueue(q, msg);
            await waitForMessages(q);
            const m = await ch.get(q, { noAck: true });
            assert(m);
            assert.deepEqual(msg, m.content);
        });
    });

    describe("binding, consuming", () => {

        // bind, publish, get
        chtest("route message", async (ch) => {
            const ex = "test.route-message";
            const q = "test.route-message-q";
            const msg = randomString();

            await Promise.all([
                ch.assertExchange(ex, "fanout", EX_OPTS),
                ch.assertQueue(q, QUEUE_OPTS),
                ch.purgeQueue(q),
                ch.bindQueue(q, ex, "", {})
            ]);
            ch.publish(ex, "", Buffer.from(msg));
            await waitForMessages(q);
            const m = await ch.get(q, { noAck: true });
            assert(m);
            assert.equal(msg, m.content.toString());
        });

        // send to queue, purge, get-empty
        chtest("purge queue", async (ch) => {
            const q = "test.purge-queue";
            await ch.assertQueue(q, { durable: false });
            ch.sendToQueue(q, Buffer.from("foobar"));
            await waitForMessages(q);
            ch.purgeQueue(q);
            const m = await ch.get(q, { noAck: true });
            assert(!m); // get-empty
        });

        // bind again, unbind, publish, get-empty
        chtest("unbind queue", async (ch) => {
            const ex = "test.unbind-queue-ex";
            const q = "test.unbind-queue";
            const viabinding = randomString();
            const direct = randomString();

            await Promise.all([
                ch.assertExchange(ex, "fanout", EX_OPTS),
                ch.assertQueue(q, QUEUE_OPTS),
                ch.purgeQueue(q),
                ch.bindQueue(q, ex, "", {})
            ]);
            ch.publish(ex, "", Buffer.from("foobar"));
            await waitForMessages(q);
            let m = await ch.get(q, { noAck: true });
            assert(m);
            await ch.unbindQueue(q, ex, "", {});
            // via the no-longer-existing binding
            ch.publish(ex, "", Buffer.from(viabinding));
            // direct to the queue
            ch.sendToQueue(q, Buffer.from(direct));
            await waitForMessages(q);
            m = await ch.get(q);
            // the direct to queue message got through, the via-binding
            // message (sent first) did not
            assert.equal(direct, m.content.toString());
        });

        // To some extent this is now just testing semantics of the server,
        // but we can at least try out a few settings, and consume.
        chtest("consume via exchange-exchange binding", async (ch) => {
            const ex1 = "test.ex-ex-binding1";
            const ex2 = "test.ex-ex-binding2";
            const q = "test.ex-ex-binding-q";
            const rk = "test.routing.key";
            const msg = randomString();
            await Promise.all([
                ch.assertExchange(ex1, "direct", EX_OPTS),
                ch.assertExchange(ex2, "fanout", { durable: false, internal: true }),
                ch.assertQueue(q, QUEUE_OPTS),
                ch.purgeQueue(q),
                ch.bindExchange(ex2, ex1, rk, {}),
                ch.bindQueue(q, ex2, "", {})
            ]);
            await new Promise(((resolve, reject) => {
                const delivery = (m) => {
                    if (m.content.toString() === msg) {
                        resolve();
                    } else {
                        reject(new Error("Wrong message"));
                    }
                };
                ch.consume(q, delivery, { noAck: true })
                    .then(() => {
                        ch.publish(ex1, rk, Buffer.from(msg));
                    });
            }));
        });

        // bind again, unbind, publish, get-empty
        chtest("unbind exchange", async (ch) => {
            const source = "test.unbind-ex-source";
            const dest = "test.unbind-ex-dest";
            const q = "test.unbind-ex-queue";
            const viabinding = randomString();
            const direct = randomString();

            await Promise.all([
                ch.assertExchange(source, "fanout", EX_OPTS),
                ch.assertExchange(dest, "fanout", EX_OPTS),
                ch.assertQueue(q, QUEUE_OPTS),
                ch.purgeQueue(q),
                ch.bindExchange(dest, source, "", {}),
                ch.bindQueue(q, dest, "", {})
            ]);
            ch.publish(source, "", Buffer.from("foobar"));
            await waitForMessages(q);
            await ch.get(q, { noAck: true }).then((m) => assert(m));
            await ch.unbindExchange(dest, source, "", {});
            // via the no-longer-existing binding
            ch.publish(source, "", Buffer.from(viabinding));
            // direct to the queue
            ch.sendToQueue(q, Buffer.from(direct));
            await waitForMessages(q);
            const m = await ch.get(q);
            // the direct to queue message got through, the via-binding
            // message (sent first) did not
            assert.equal(direct, m.content.toString());
        });

        // This is a bit convoluted. Sorry.
        chtest("cancel consumer", (ch) => {
            const q = "test.consumer-cancel";
            let ctag;
            const recv1 = new Promise(((resolve, reject) => {
                Promise.all([
                    ch.assertQueue(q, QUEUE_OPTS),
                    ch.purgeQueue(q),
                    // My callback is 'resolve the promise in `arrived`'
                    ch.consume(q, resolve, { noAck: true })
                        .then((ok) => {
                            ctag = ok.consumerTag;
                            ch.sendToQueue(q, Buffer.from("foo"));
                        })
                ]);
            }));

            // A message should arrive because of the consume
            return recv1.then(() => {
                const recv2 = Promise.all([
                    ch.cancel(ctag).then(() => {
                        return ch.sendToQueue(q, Buffer.from("bar"));
                    }),
                    // but check a message did arrive in the queue
                    waitForMessages(q)
                ])
                    .then(() => {
                        return ch.get(q, { noAck: true });
                    })
                    .then((m) => {
                        // I'm going to reject it, because I flip succeed/fail
                        // just below
                        if (m.content.toString() === "bar") {
                            throw new Error();
                        }
                    });

                return expectFail(recv2);
            });
        });

        chtest("cancelled consumer", (ch) => {
            const q = "test.cancelled-consumer";
            return new Promise(((resolve, reject) => {
                return Promise.all([
                    ch.assertQueue(q),
                    ch.purgeQueue(q),
                    ch.consume(q, (msg) => {
                        if (is.null(msg)) {
                            resolve();
                        } else {
                            reject(new Error("Message not expected"));
                        }
                    })
                ])
                    .then(() => {
                        return ch.deleteQueue(q);
                    });
            }));
        });

        // ack, by default, removes a single message from the queue
        chtest("ack", (ch) => {
            const q = "test.ack";
            const msg1 = randomString();
            const msg2 = randomString();

            return Promise.all([
                ch.assertQueue(q, QUEUE_OPTS),
                ch.purgeQueue(q)
            ])
                .then(() => {
                    ch.sendToQueue(q, Buffer.from(msg1));
                    ch.sendToQueue(q, Buffer.from(msg2));
                    return waitForMessages(q, 2);
                })
                .then(() => {
                    return ch.get(q, { noAck: false });
                })
                .then((m) => {
                    assert.equal(msg1, m.content.toString());
                    ch.ack(m);
                    // %%% is there a race here? may depend on
                    // rabbitmq-sepcific semantics
                    return ch.get(q);
                })
                .then((m) => {
                    assert(m);
                    assert.equal(msg2, m.content.toString());
                });
        });

        // Nack, by default, puts a message back on the queue (where in the
        // queue is up to the server)
        chtest("nack", (ch) => {
            const q = "test.nack";
            const msg1 = randomString();

            return Promise.all([
                ch.assertQueue(q, QUEUE_OPTS),
                ch.purgeQueue(q)
            ])
                .then(() => {
                    ch.sendToQueue(q, Buffer.from(msg1));
                    return waitForMessages(q);
                })
                .then(() => {
                    return ch.get(q, { noAck: false });
                })
                .then((m) => {
                    assert.equal(msg1, m.content.toString());
                    ch.nack(m);
                    return waitForMessages(q);
                })
                .then(() => {
                    return ch.get(q);
                })
                .then((m) => {
                    assert(m);
                    assert.equal(msg1, m.content.toString());
                });
        });

        // reject is a near-synonym for nack, the latter of which is not
        // available in earlier RabbitMQ (or in AMQP proper).
        chtest("reject", (ch) => {
            const q = "test.reject";
            const msg1 = randomString();

            return Promise.all([
                ch.assertQueue(q, QUEUE_OPTS),
                ch.purgeQueue(q)
            ])
                .then(() => {
                    ch.sendToQueue(q, Buffer.from(msg1));
                    return waitForMessages(q);
                })
                .then(() => {
                    return ch.get(q, { noAck: false })
                    ;
                })
                .then((m) => {
                    assert.equal(msg1, m.content.toString());
                    ch.reject(m);
                    return waitForMessages(q);
                })
                .then(() => {
                    return ch.get(q);
                })
                .then((m) => {
                    assert(m);
                    assert.equal(msg1, m.content.toString());
                });
        });

        chtest("prefetch", async (ch) => {
            const q = "test.prefetch";
            await Promise.all([
                ch.assertQueue(q, QUEUE_OPTS),
                ch.purgeQueue(q),
                ch.prefetch(1)
            ]);
            ch.sendToQueue(q, Buffer.from("foobar"));
            ch.sendToQueue(q, Buffer.from("foobar"));
            await waitForMessages(q, 2);
            const c = await new Promise(((resolve) => {
                let messageCount = 0;
                const receive = (msg) => {
                    ch.ack(msg);
                    if (++messageCount > 1) {
                        resolve(messageCount);
                    }
                };
                ch.consume(q, receive, { noAck: false });
            }));
            assert.equal(2, c);
        });

        chtest("close", (ch) => {
            // Resolving promise guarantees
            // channel is closed
            return ch.close();
        });

    });

    const confirmtest = channelTest.bind(null, "createConfirmChannel");

    describe("confirms", () => {

        confirmtest("message is confirmed", (ch) => {
            const q = "test.confirm-message";
            return Promise.all([
                ch.assertQueue(q, QUEUE_OPTS),
                ch.purgeQueue(q)
            ])
                .then(() => {
                    return ch.sendToQueue(q, Buffer.from("bleep"));
                });
        });

        // Usually one can provoke the server into confirming more than one
        // message in an ack by simply sending a few messages in quick
        // succession; a bit unscientific I know. Luckily we can eavesdrop on
        // the acknowledgements coming through to see if we really did get a
        // multi-ack.
        confirmtest("multiple confirms", (ch) => {
            const q = "test.multiple-confirms";
            return Promise.all([
                ch.assertQueue(q, QUEUE_OPTS),
                ch.purgeQueue(q)
            ])
                .then(() => {
                    let multipleRainbows = false;
                    ch.on("ack", (a) => {
                        if (a.multiple) {
                            multipleRainbows = true;
                        }
                    });

                    function prod(num) {
                        const cs = [];

                        function sendAndPushPromise() {
                            const conf = new Promise((resolve, reject) => {
                                ch.sendToQueue(q, Buffer.from("bleep"), {}, (err, res) => {
                                    err ? reject(err) : resolve(res);
                                });
                            });
                            cs.push(conf);
                        }

                        for (let i = 0; i < num; i++) {
                            sendAndPushPromise();
                        }

                        return Promise.all(cs).then(() => {
                            if (multipleRainbows) {
                                return true;
                            } else if (num > 500) {
                                throw new Error(
                                    `${"Couldn't provoke the server" +
                                    " into multi-acking with "}${num
                                    } messages; giving up`);
                            } else {
                                //console.warn("Failed with " + num + "; trying " + num * 2);
                                return prod(num * 2);
                            }
                        });
                    }
                    return prod(5);
                });
        });

        confirmtest("wait for confirms", (ch) => {
            for (let i = 0; i < 1000; i++) {
                ch.publish("", "", Buffer.from("foobar"), {});
            }
            return ch.waitForConfirms();
        });

    });
});
