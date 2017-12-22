const { Port, parser } = adone.hardware.serial;

describe("hardware", "serial", "Port", () => {
    beforeEach(() => {
        // Create a port for fun and profit
        adone.hardware.serial.MockBinding.reset();
        adone.hardware.serial.MockBinding.createPort("/dev/exists", { echo: true, readyData: Buffer.allocUnsafe(0) });
    });

    describe("constructor", () => {
        it("provides auto construction", (done) => {
            new Port("/dev/exists", {
                binding: adone.hardware.serial.MockBinding
            }, done);
        });

        describe("autoOpen", () => {
            it("opens the port automatically", (done) => {
                new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBinding
                }, (err) => {
                    assert.null(err);
                    done();
                });
            });

            it("emits the open event", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBinding
                });
                port.on("open", done);
            });

            it("doesn't open if told not to", (done) => {
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBinding
                });
                port.on("open", () => {
                    throw new Error("this shouldn't be opening");
                });
                process.nextTick(done);
            });
        });

        // needs to be passes the callback to open
        it("passes the error to the callback when an bad port is provided", (done) => {
            new Port("/bad/port", {
                binding: adone.hardware.serial.MockBinding
            }, (err) => {
                assert.instanceOf(err, Error);
                done();
            });
        });

        // is this a test for open?
        it("emits an error when an bad port is provided", (done) => {
            const port = new Port("/bad/port", {
                binding: adone.hardware.serial.MockBinding
            });
            port.once("error", (err) => {
                assert.instanceOf(err, Error);
                done();
            });
        });

        it("throws an error when no port is provided", (done) => {
            try {
                new Port("", {
                    binding: adone.hardware.serial.MockBinding
                });
            } catch (err) {
                assert.instanceOf(err, Error);
                done();
            }
        });

        it("throws an error when given bad options even with a callback", (done) => {
            try {
                new Port("/dev/exists", {
                    baudRate: "whatever",
                    binding: adone.hardware.serial.MockBinding
                }, adone.noop);
            } catch (err) {
                assert.instanceOf(err, Error);
                done();
            }
        });

        it("errors with a non number baudRate", (done) => {
            try {
                new Port("/bad/port", {
                    baudRate: "whatever",
                    binding: adone.hardware.serial.MockBinding
                });
            } catch (err) {
                assert.instanceOf(err, Error);
                done();
            }
        });

        it("errors with invalid databits", (done) => {
            try {
                new Port("/dev/exists", {
                    dataBits: 19,
                    binding: adone.hardware.serial.MockBinding
                });
            } catch (err) {
                assert.instanceOf(err, Error);
                done();
            }
        });

        it("errors with invalid stopbits", (done) => {
            try {
                new Port("/dev/exists", {
                    stopBits: 19,
                    binding: adone.hardware.serial.MockBinding
                });
            } catch (err) {
                assert.instanceOf(err, Error);
                done();
            }
        });

        it("errors with invalid parity", (done) => {
            try {
                new Port("/dev/exists", {
                    parity: "pumpkins",
                    binding: adone.hardware.serial.MockBinding
                });
            } catch (err) {
                assert.instanceOf(err, Error);
                done();
            }
        });

        it("errors with invalid flow control", (done) => {
            try {
                new Port("/dev/exists", {
                    xon: "pumpkins",
                    binding: adone.hardware.serial.MockBinding
                });
            } catch (err) {
                assert.instanceOf(err, Error);
                done();
            }
        });

        it("sets valid flow control individually", (done) => {
            const options = {
                xon: true,
                xoff: true,
                xany: true,
                rtscts: true,
                autoOpen: false,
                binding: adone.hardware.serial.MockBinding
            };
            const port = new Port("/dev/exists", options);
            assert.true(port.settings.xon);
            assert.true(port.settings.xoff);
            assert.true(port.settings.xany);
            assert.true(port.settings.rtscts);
            done();
        });

        it("allows optional options", (done) => {
            new Port("/dev/exists", {
                binding: adone.hardware.serial.MockBinding
            }, done);
        });
    });

    describe("static methods", () => {
        it("calls to the bindings", async () => {
            const s = spy(adone.hardware.serial.MockBinding, "list");
            const ports = await adone.hardware.serial.MockBinding.list();
            assert.array(ports);
            assert(s.calledOnce);
        });
    });

    describe("property", () => {
        describe(".baudRate", () => {
            it("is a read only property set during construction", () => {
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    baudRate: 14400,
                    binding: adone.hardware.serial.MockBinding
                });
                assert.equal(port.baudRate, 14400);
                try {
                    port.baudRate = 9600;
                } catch (e) {
                    assert.instanceOf(e, TypeError);
                }
                assert.equal(port.baudRate, 14400);
            });
        });

        describe(".path", () => {
            it("is a read only property set during construction", () => {
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBinding
                });
                assert.equal(port.path, "/dev/exists");
                try {
                    port.path = "foo";
                } catch (e) {
                    assert.instanceOf(e, TypeError);
                }
                assert.equal(port.path, "/dev/exists");
            });
        });

        describe(".isOpen", () => {
            it("is a read only property", () => {
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBinding
                });
                assert.equal(port.isOpen, false);
                try {
                    port.isOpen = "foo";
                } catch (e) {
                    assert.instanceOf(e, TypeError);
                }
                assert.equal(port.isOpen, false);
            });

            it("returns false when the port is created", (done) => {
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBinding
                });
                assert.false(port.isOpen);
                done();
            });

            it("returns false when the port is opening", (done) => {
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBinding
                });
                stub(port.binding, "open").callsFake(() => {
                    assert.true(port.opening);
                    assert.false(port.isOpen);
                    done();
                });
                port.open();
            });

            it("returns true when the port is open", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBinding
                }, () => {
                    assert.true(port.isOpen);
                    done();
                });
            });

            it("returns false when the port is closing", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBinding
                }, function () {
                    stub(this.binding, "close").callsFake(() => {
                        assert.false(port.isOpen);
                        done();
                        return Promise.resolve();
                    });
                    port.close();
                });
            });

            it("returns false when the port is closed", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBinding
                }, () => {
                    port.close();
                });
                port.on("close", () => {
                    assert.false(port.isOpen);
                    done();
                });
            });
        });
    });

    describe("instance method", () => {
        describe("#open", () => {
            it("passes the port to the bindings", (done) => {
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBinding
                });
                const openSpy = spy(port.binding, "open");
                assert.false(port.isOpen);
                port.open((err) => {
                    assert.null(err);
                    assert.true(port.isOpen);
                    assert.true(openSpy.calledWith("/dev/exists"));
                    done();
                });
            });

            it("passes default options to the bindings", (done) => {
                const defaultOptions = {
                    baudRate: 9600,
                    parity: "none",
                    xon: false,
                    xoff: false,
                    xany: false,
                    rtscts: false,
                    hupcl: true,
                    dataBits: 8,
                    stopBits: 1
                };
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBinding
                });
                stub(port.binding, "open").callsFake((path, opt) => {
                    assert.equal(path, "/dev/exists");
                    assert.include(opt, defaultOptions);
                    done();
                });
                port.open();
            });

            it("calls back an error when opening an invalid port", (done) => {
                const port = new Port("/dev/unhappy", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBinding
                });
                port.open((err) => {
                    assert.instanceOf(err, Error);
                    done();
                });
            });

            it("emits data after being reopened", (done) => {
                const data = Buffer.from("Howdy!");
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBinding
                }, () => {
                    port.close(() => {
                        port.open(() => {
                            port.binding.write(data, () => {
                            });
                        });
                    });
                });
                port.once("data", (res) => {
                    assert.deepEqual(res, data);
                    done();
                });
            });

            it("cannot be opened again after open", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBinding
                }, () => {
                    port.open((err) => {
                        assert.instanceOf(err, Error);
                        done();
                    });
                });
            });

            it("cannot be opened while opening", (done) => {
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBinding
                });
                port.open((err) => {
                    assert.null(err);
                });
                port.open((err) => {
                    assert.instanceOf(err, Error);
                    done();
                });
            });

            it("allows opening after an open error", (done) => {
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBinding
                });
                const st = stub(port.binding, "open").callsFake(() => {
                    return Promise.reject(new Error("Haha no"));
                });
                port.open((err) => {
                    assert.instanceOf(err, Error);
                    st.restore();
                    port.open(done);
                });
            });
        });

        describe("#write", () => {
            it("writes to the bindings layer", (done) => {
                const data = Buffer.from("Crazy!");
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBinding
                });
                port.on("open", () => {
                    port.write(data, () => {
                        assert.deepEqual(data, port.binding.port.lastWrite);
                        done();
                    });
                });
            });

            it("converts strings to buffers", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBinding
                });
                port.on("open", () => {
                    const data = "Crazy!";
                    port.write(data, () => {
                        const lastWrite = port.binding.port.lastWrite;
                        assert.deepEqual(Buffer.from(data), lastWrite);
                        done();
                    });
                });
            });

            it("converts strings with encodings to buffers", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBinding
                });
                port.on("open", () => {
                    const data = "COFFEE";
                    port.write(data, "hex", () => {
                        const lastWrite = port.binding.port.lastWrite;
                        assert.deepEqual(Buffer.from(data, "hex"), lastWrite);
                        done();
                    });
                });
            });

            it("converts arrays to buffers", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBinding
                });
                port.on("open", () => {
                    const data = [0, 32, 44, 88];
                    port.write(data, () => {
                        const lastWrite = port.binding.port.lastWrite;
                        assert.deepEqual(Buffer.from(data), lastWrite);
                        done();
                    });
                });
            });

            it("queues writes when the port is closed", (done) => {
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBinding
                });
                port.write("data", done);
                port.open();
            });

            it("combines many writes into one", (done) => {
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBinding
                });
                const s = spy(port.binding, "write");
                port.open(() => {
                    port.cork();
                    port.write("abc");
                    port.write(Buffer.from("123"), () => {
                        assert.equal(s.callCount, 1);
                        assert.deepEqual(port.binding.port.lastWrite, Buffer.from("abc123"));
                        done();
                    });
                    port.uncork();
                });
            });
        });

        describe("#close", () => {
            it("emits a close event", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBinding
                }, () => {
                    port.on("close", () => {
                        assert.false(port.isOpen);
                        done();
                    });
                    port.close();
                });
            });

            it("has a close callback", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBinding
                }, () => {
                    port.close(() => {
                        assert.false(port.isOpen);
                        done();
                    });
                });
            });

            it("emits the close event and runs the callback", (done) => {
                let called = 0;
                const doneIfTwice = function () {
                    called++;
                    if (called === 2) {
                        return done();
                    }
                };
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBinding
                }, () => {
                    port.close(doneIfTwice);
                });
                port.on("close", doneIfTwice);
            });

            it("emits an error event or error callback but not both", (done) => {
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBinding
                });
                let called = 0;
                const doneIfTwice = function (err) {
                    assert.instanceOf(err, Error);
                    called++;
                    if (called === 2) {
                        return done();
                    }
                };
                port.on("error", doneIfTwice);
                port.close();
                port.close(doneIfTwice);
            });

            it("fires a close event after being reopened", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBinding
                }, () => {
                    const closeSpy = spy();
                    port.on("close", closeSpy);
                    port.close(() => {
                        port.open(() => {
                            port.close(() => {
                                assert.true(closeSpy.calledTwice);
                                done();
                            });
                        });
                    });
                });
            });

            it("errors when the port is not open", (done) => {
                const cb = function () { };
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBinding
                }, cb);
                port.close((err) => {
                    assert.instanceOf(err, Error);
                    done();
                });
            });

            it("handles errors in callback", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBinding
                });
                stub(port.binding, "close").callsFake(() => {
                    return Promise.reject(new Error("like tears in the rain"));
                });
                port.on("open", () => {
                    port.close((err) => {
                        assert.instanceOf(err, Error);
                        done();
                    });
                });
            });

            it("handles errors in event", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBinding
                });
                stub(port.binding, "close").callsFake(() => {
                    return Promise.reject(new Error("attack ships on fire off the shoulder of Orion"));
                });
                port.on("open", () => {
                    port.close();
                });
                port.on("error", (err) => {
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });

        describe("#update", () => {
            it("errors when the port is not open", (done) => {
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBinding
                });
                port.update({}, (err) => {
                    assert.instanceOf(err, Error);
                    done();
                });
            });

            it("errors when called without options", (done) => {
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBinding
                });
                let errors = 0;
                try {
                    port.update();
                } catch (e) {
                    errors += 1;
                    assert.instanceOf(e, TypeError);
                }

                try {
                    port.update(adone.noop);
                } catch (e) {
                    errors += 1;
                    assert.instanceOf(e, TypeError);
                }
                assert.equal(errors, 2);
                done();
            });

            it("sets the baudRate on the port", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBinding
                }, () => {
                    assert.equal(port.baudRate, 9600);
                    port.update({ baudRate: 14400 }, (err) => {
                        assert.equal(port.baudRate, 14400);
                        assert.null(err);
                        done();
                    });
                });
            });

            it.skip("handles errors in callback", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBindin
                });
                stub(port.binding, "update").callsFake(() => {
                    return Promise.reject(new Error("like tears in the rain"));
                });
                port.on("open", () => {
                    port.update({}, (err) => {
                        assert.instanceOf(err, Error);
                        done();
                    });
                });
            });

            it("handles errors in event", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBindin
                });
                stub(port.binding, "update").callsFake(() => {
                    return Promise.reject(new Error("attack ships on fire off the shoulder of Orion"));
                });
                port.on("open", () => {
                    port.update({});
                });
                port.on("error", (err) => {
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });

        describe("#set", () => {
            it("errors when serialport not open", (done) => {
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBindin
                });
                port.set({}, (err) => {
                    assert.instanceOf(err, Error);
                    done();
                });
            });

            it("errors without an options object", (done) => {
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBindin
                });
                try {
                    port.set();
                } catch (e) {
                    assert.instanceOf(e, TypeError);
                    done();
                }
            });

            it.skip("sets the flags on the ports bindings", (done) => {
                const settings = {
                    brk: true,
                    cts: true,
                    dtr: true,
                    dts: true,
                    rts: true
                };

                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBindin
                }, () => {
                    const s = spy(port.binding, "set");
                    port.set(settings, (err) => {
                        assert.null(err);
                        assert(s.calledWith(settings));
                        done();
                    });
                });
            });

            it.skip("sets missing options to default values", (done) => {
                const settings = {
                    cts: true,
                    dts: true,
                    rts: false
                };

                const filledWithMissing = {
                    brk: false,
                    cts: true,
                    dtr: true,
                    dts: true,
                    rts: false
                };

                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBindin
                }, () => {
                    const s = spy(port.binding, "set");
                    port.set(settings, (err) => {
                        assert.null(err);
                        assert(s.calledWith(filledWithMissing));
                        done();
                    });
                });
            });

            it.skip("resets all flags if none are provided", (done) => {
                const defaults = {
                    brk: false,
                    cts: false,
                    dtr: true,
                    dts: false,
                    rts: true
                };

                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBindin
                }, () => {
                    const s = spy(port.binding, "set");
                    port.set({}, (err) => {
                        assert.null(err);
                        assert(s.calledWith(defaults));
                        done();
                    });
                });
            });

            it.skip("handles errors in callback", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBindin
                });
                stub(port.binding, "set").callsFake(() => {
                    return Promise.reject(new Error("like tears in the rain"));
                });
                port.on("open", () => {
                    port.set({}, (err) => {
                        assert.instanceOf(err, Error);
                        done();
                    });
                });
            });

            it("handles errors in event", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBindin
                });
                stub(port.binding, "set").callsFake(() => {
                    return Promise.reject(new Error("attack ships on fire off the shoulder of Orion"));
                });
                port.on("open", () => {
                    port.set({});
                });
                port.on("error", (err) => {
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });

        describe("#flush", () => {
            it("errors when serialport not open", (done) => {
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBindin
                });
                port.flush((err) => {
                    assert.instanceOf(err, Error);
                    done();
                });
            });

            it.skip("calls flush on the bindings", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBindin
                });
                const s = spy(port.binding, "flush");
                port.on("open", () => {
                    port.flush((err) => {
                        assert.null(err);
                        assert(s.calledOnce);
                        done();
                    });
                });
            });

            it.skip("handles errors in callback", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBindin
                });
                stub(port.binding, "flush").callsFake(() => {
                    return Promise.reject(new Error("like tears in the rain"));
                });
                port.on("open", () => {
                    port.flush((err) => {
                        assert.instanceOf(err, Error);
                        done();
                    });
                });
            });

            it("handles errors in event", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBindin
                });
                stub(port.binding, "flush").callsFake(() => {
                    return Promise.reject(new Error("attack ships on fire off the shoulder of Orion"));
                });
                port.on("open", () => {
                    port.flush();
                });
                port.on("error", (err) => {
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });

        describe("#drain", () => {
            it("errors when port is not open", (done) => {
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBindin
                });
                port.drain((err) => {
                    assert.instanceOf(err, Error);
                    done();
                });
            });

            it.skip("calls drain on the bindings", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBindin
                });
                const s = spy(port.binding, "drain");
                port.on("open", () => {
                    port.drain((err) => {
                        assert.null(err);
                        assert(s.calledOnce);
                        done();
                    });
                });
            });

            it.skip("handles errors in callback", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBindin
                });
                stub(port.binding, "drain").callsFake(() => {
                    return Promise.reject(new Error("like tears in the rain"));
                });
                port.on("open", () => {
                    port.drain((err) => {
                        assert.instanceOf(err, Error);
                        done();
                    });
                });
            });

            it("handles errors in event", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBindin
                });
                stub(port.binding, "drain").callsFake(() => {
                    return Promise.reject(new Error("attack ships on fire off the shoulder of Orion"));
                });
                port.on("open", () => {
                    port.drain();
                });
                port.on("error", (err) => {
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });

        describe("#get", () => {
            it("errors when serialport not open", (done) => {
                const port = new Port("/dev/exists", {
                    autoOpen: false,
                    binding: adone.hardware.serial.MockBindin
                });
                port.get((err) => {
                    assert.instanceOf(err, Error);
                    done();
                });
            });

            it.skip("gets the status from the ports bindings", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBindin
                }, () => {
                    const s = spy(port.binding, "get");
                    port.get((err, status) => {
                        assert.null(err);
                        assert(s.calledOnce);
                        assert.deepEqual(status, {
                            cts: true,
                            dsr: false,
                            dcd: false
                        });
                        done();
                    });
                });
            });

            it.skip("handles errors in callback", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBindin
                });
                stub(port.binding, "get").callsFake(() => {
                    return Promise.reject(new Error("like tears in the rain"));
                });
                port.on("open", () => {
                    port.get((err) => {
                        assert.instanceOf(err, Error);
                        done();
                    });
                });
            });

            it("handles errors in event", (done) => {
                const port = new Port("/dev/exists", {
                    binding: adone.hardware.serial.MockBindin
                });
                stub(port.binding, "get").callsFake(() => {
                    return Promise.reject(new Error("attack ships on fire off the shoulder of Orion"));
                });
                port.on("open", () => {
                    port.get();
                });
                port.on("error", (err) => {
                    assert.instanceOf(err, Error);
                    done();
                });
            });
        });
    });

    describe("reading data", () => {
        it.skip("emits data events by default", (done) => {
            const testData = Buffer.from("I am a really short string");
            const port = new Port("/dev/exists", {
                binding: adone.hardware.serial.MockBindin
            }, () => {
                port.once("data", (recvData) => {
                    assert.deepEqual(recvData, testData);
                    done();
                });
                port.binding.write(testData, adone.noop);
            });
        });
    });

    describe("disconnections", () => {
        it.skip("emits a disconnect event and closes the port", (done) => {
            const port = new Port("/dev/exists", {
                binding: adone.hardware.serial.MockBindin
            }, () => {
                assert.true(port.isOpen);
                port.binding.disconnect();
            });
            const s = spy();
            port.on("disconnect", s);
            port.on("close", () => {
                assert.false(port.isOpen);
                assert.true(s.calledOnce);
                done();
            });
        });

        it("doesn't disconnect a closed port", (done) => {
            const port = new Port("/dev/exists", {
                autoOpen: false,
                binding: adone.hardware.serial.MockBindin
            });
            const s = spy();
            port.on("disconnect", s);
            port.on("close", s);
            port.binding.disconnect();
            assert.equal(s.callCount, 0);
            done();
        });
    });

    describe("byte-length parser", () => {
        it("works without new", () => {
            // eslint-disable-next-line new-cap
            const p = new parser.ByteLength({ length: 4 });
            assert.instanceOf(p, parser.ByteLength);
        });

        it("emits data events every 8 bytes", () => {
            const data = Buffer.from("Robots are so freaking cool!");
            const s = spy();
            const p = new parser.ByteLength({ length: 8 });
            p.on("data", s);
            p.write(data);
            assert.equal(s.callCount, 3);
            assert.deepEqual(s.getCall(0).args[0], Buffer.from("Robots a"));
            assert.deepEqual(s.getCall(1).args[0], Buffer.from("re so fr"));
            assert.deepEqual(s.getCall(2).args[0], Buffer.from("eaking c"));
        });

        it("throws when not provided with a length", () => {
            assert.throws(() => new parser.ByteLength({}));
        });

        it("throws when length is zero", () => {
            assert.throws(() => {
                new parser.ByteLength({
                    length: 0
                });
            });
        });

        it("throws when called with a non numeric length", () => {
            assert.throws(() => {
                new parser.ByteLength({
                    length: "foop"
                });
            });
        });

        it("continues looking for bytes in additional writes", () => {
            const p = new parser.ByteLength({ length: 4 });
            const s = spy();
            p.on("data", s);
            p.write(Buffer.from("ab"));
            p.write(Buffer.from("cd"));
            assert.equal(s.callCount, 1);
            assert.deepEqual(s.getCall(0).args[0], Buffer.from("abcd"));
        });

        it("flushes remaining data when the stream ends", () => {
            const p = new parser.ByteLength({ length: 4 });
            const s = spy();
            p.on("data", s);
            p.write(Buffer.from("12"));
            assert.equal(s.callCount, 0);
            p.end();
            assert.equal(s.callCount, 1);
            assert.deepEqual(s.getCall(0).args[0], Buffer.from("12"));
        });
    });

    describe("delimiter parser", () => {
        it("works without new", () => {
            // eslint-disable-next-line new-cap
            const p = new parser.Delimiter({ delimiter: Buffer.from([0]) });
            assert.instanceOf(p, parser.Delimiter);
        });

        it("transforms data to strings split on a delimiter", () => {
            const s = spy();
            const p = new parser.Delimiter({
                delimiter: Buffer.from("\n")
            });
            p.on("data", s);
            p.write(Buffer.from("I love robots\nEach "));
            p.write(Buffer.from("and Every One\n"));
            p.write(Buffer.from("even you!"));

            assert.deepEqual(s.getCall(0).args[0], Buffer.from("I love robots"));
            assert.deepEqual(s.getCall(1).args[0], Buffer.from("Each and Every One"));
            assert(s.calledTwice);
        });

        it("flushes remaining data when the stream ends", () => {
            const p = new parser.Delimiter({ delimiter: Buffer.from([0]) });
            const s = spy();
            p.on("data", s);
            p.write(Buffer.from([1]));
            assert.equal(s.callCount, 0);
            p.end();
            assert.equal(s.callCount, 1);
            assert.deepEqual(s.getCall(0).args[0], Buffer.from([1]));
        });

        it("throws when not provided with a delimiter", () => {
            assert.throws(() => {
                new parser.Delimiter({});
            });
        });

        it("throws when called with a 0 length delimiter", () => {
            assert.throws(() => {
                new parser.Delimiter({
                    delimiter: Buffer.allocUnsafe(0)
                });
            });

            assert.throws(() => {
                new parser.Delimiter({
                    delimiter: ""
                });
            });

            assert.throws(() => {
                new parser.Delimiter({
                    delimiter: []
                });
            });
        });

        it("allows setting of the delimiter with a string", () => {
            new parser.Delimiter({ delimiter: "string" });
        });

        it("allows setting of the delimiter with a buffer", () => {
            new parser.Delimiter({ delimiter: Buffer.from([1]) });
        });

        it("allows setting of the delimiter with an array of bytes", () => {
            new parser.Delimiter({ delimiter: [1] });
        });

        it("emits data events every time it meets 00x 00x", () => {
            const data = Buffer.from("This could be\0\0binary data\0\0sent from a Moteino\0\0");
            const p = new parser.Delimiter({ delimiter: [0, 0] });
            const s = spy();
            p.on("data", s);
            p.write(data);
            assert.equal(s.callCount, 3);
            assert.deepEqual(s.getCall(0).args[0], Buffer.from("This could be"));
            assert.deepEqual(s.getCall(1).args[0], Buffer.from("binary data"));
            assert.deepEqual(s.getCall(2).args[0], Buffer.from("sent from a Moteino"));
        });

        it("accepts single byte delimiter", () => {
            const data = Buffer.from("This could be\0binary data\0sent from a Moteino\0");
            const p = new parser.Delimiter({ delimiter: [0] });
            const s = spy();
            p.on("data", s);
            p.write(data);
            assert.equal(s.callCount, 3);
        });

        it("Works when buffer starts with delimiter", () => {
            const data = Buffer.from("\0Hello\0World\0");
            const p = new parser.Delimiter({ delimiter: Buffer.from([0]) });
            const s = spy();
            p.on("data", s);
            p.write(data);
            assert.equal(s.callCount, 2);
        });

        it("should only emit if delimiters are strictly in row", () => {
            const data = Buffer.from("\0Hello\u0001World\0\0\u0001");
            const p = new parser.Delimiter({ delimiter: [0, 1] });
            const s = spy();
            p.on("data", s);
            p.write(data);
            assert.equal(s.callCount, 1);
        });

        it("continues looking for delimiters in the next buffers", () => {
            const p = new parser.Delimiter({ delimiter: [0, 0] });
            const s = spy();
            p.on("data", s);
            p.write(Buffer.from("This could be\0\0binary "));
            p.write(Buffer.from("data\0\0sent from a Moteino\0\0"));
            assert.equal(s.callCount, 3);
            assert.deepEqual(s.getCall(0).args[0], Buffer.from("This could be"));
            assert.deepEqual(s.getCall(1).args[0], Buffer.from("binary data"));
            assert.deepEqual(s.getCall(2).args[0], Buffer.from("sent from a Moteino"));
        });
    });

    describe("readline parser", () => {
        it("works without new", () => {
            const p = new parser.Readline();
            assert.instanceOf(p, parser.Readline);
        });

        it("transforms data to strings split on a delimiter", () => {
            const s = spy();
            const p = new parser.Readline();
            p.on("data", s);
            p.write(Buffer.from("I love robots\nEach "));
            p.write(Buffer.from("and Every One\n"));
            p.write(Buffer.from("even you!"));
            assert(s.calledWith("I love robots"));
            assert(s.calledWith("Each and Every One"));
            assert(s.calledTwice);
            p.end();
            assert(s.calledWith("even you!"));
            assert(s.calledThrice);
        });

        it("allows setting of the delimiter with a string", () => {
            const s = spy();
            const p = new parser.Readline({ delimiter: "a" });
            p.on("data", s);
            p.write(Buffer.from("how are youa"));
            assert(s.calledWith("how "));
            assert(s.calledWith("re you"));
        });

        it("allows setting of the delimiter with a buffer", () => {
            const s = spy();
            const p = new parser.Readline({ delimiter: Buffer.from("a") });
            p.on("data", s);
            p.write(Buffer.from("how are youa"));
            assert(s.calledWith("how "));
            assert(s.calledWith("re you"));
        });

        it("allows setting of the delimiter with an array of bytes", () => {
            const s = spy();
            const p = new parser.Readline({ delimiter: [97] });
            p.on("data", s);
            p.write(Buffer.from("how are youa"));
            assert(s.calledWith("how "));
            assert(s.calledWith("re you"));
        });

        it("allows setting of encoding", () => {
            const s = spy();
            const p = new parser.Readline({
                encoding: "hex"
            });
            p.on("data", s);
            p.write(Buffer.from("a\nb\n"));
            assert.equal(s.getCall(0).args[0], "61");
            assert.equal(s.getCall(1).args[0], "62");
        });

        it("encoding should be reflected in a string delimiter", () => {
            const s = spy();
            const p = new parser.Readline({
                delimiter: "FF",
                encoding: "hex"
            });
            p.on("data", s);
            p.write(Buffer.from([0, 255, 1, 255]));
            assert.equal(s.getCall(0).args[0], "00");
            assert.equal(s.getCall(1).args[0], "01");
        });

        it("throws when called with a 0 length delimiter", () => {
            assert.throws(() => {
                new parser.Readline({
                    delimiter: Buffer.allocUnsafe(0)
                });
            });

            assert.throws(() => {
                new parser.Readline({
                    delimiter: ""
                });
            });

            assert.throws(() => {
                new parser.Readline({
                    delimiter: []
                });
            });
        });

        it("allows setting of the delimiter with a string", () => {
            new parser.Readline({ delimiter: "string" });
        });

        it("allows setting of the delimiter with a buffer", () => {
            new parser.Readline({ delimiter: Buffer.from([1]) });
        });

        it("allows setting of the delimiter with an array of bytes", () => {
            new parser.Readline({ delimiter: [1] });
        });

        it("doesn't emits empty data events", () => {
            const s = spy();
            const p = new parser.Readline({ delimiter: "a" });
            p.on("data", s);
            p.write(Buffer.from("aFa"));
            assert(s.calledOnce);
            assert(s.calledWith("F"));
        });
    });

    describe("regex parser", () => {
        it("works without new", () => {
            // eslint-disable-next-line new-cap
            const p = new parser.Regex({ delimiter: Buffer.from([0]) });
            assert.instanceOf(p, parser.Regex);
        });

        it("transforms data to strings split on either carriage return or new line", () => {
            const s = spy();
            const p = new parser.Regex({
                delimiter: new RegExp(/\r\n|\n\r|\n|\r/)
            });
            p.on("data", s);
            p.write(Buffer.from("I love robots\n\rEach "));
            p.write(Buffer.from("and Every One\r"));
            p.write(Buffer.from("even you!"));

            assert.deepEqual(s.getCall(0).args[0], "I love robots");
            assert.deepEqual(s.getCall(1).args[0], "Each and Every One");
            assert(s.calledTwice);
        });

        it("flushes remaining data when the stream ends", () => {
            const p = new parser.Regex({ delimiter: /\n/ });
            const s = spy();
            p.on("data", s);
            p.write(Buffer.from([1]));
            assert.equal(s.callCount, 0);
            p.end();
            assert.equal(s.callCount, 1);
            assert.deepEqual(s.getCall(0).args[0], Buffer.from([1]).toString());
        });

        it("throws when not provided with a delimiter", () => {
            assert.throws(() => {
                new parser.Regex({});
            });
        });

        it("throws when called with a 0 length delimiter", () => {
            assert.throws(() => {
                new parser.Regex({
                    delimiter: Buffer.allocUnsafe(0)
                });
            });

            assert.throws(() => {
                new parser.Regex({
                    delimiter: ""
                });
            });

            assert.throws(() => {
                new parser.Regex({
                    delimiter: []
                });
            });
        });

        it("allows setting of the delimiter with a regex string", () => {
            const s = spy();
            const p = new parser.Regex({ delimiter: "a|b" });
            p.on("data", s);
            p.write("bhow are youa");
            assert(s.calledWith("how "));
            assert(s.calledWith("re you"));
        });

        it("allows setting of the delimiter with a buffer", () => {
            const p = new parser.Regex({ delimiter: Buffer.from("a|b") });
            const s = spy();
            p.on("data", s);
            p.write("bhow are youa");
            assert(s.calledWith("how "));
            assert(s.calledWith("re you"));
        });

        it("allows setting of encoding", () => {
            const s = spy();
            const p = new parser.Regex({
                delimiter: /\r/,
                encoding: "hex"
            });
            p.on("data", s);
            p.write(Buffer.from("a\rb\r"));
            assert.equal(s.getCall(0).args[0], "61");
            assert.equal(s.getCall(1).args[0], "62");
        });

        it("Works when buffer starts with regex delimiter", () => {
            const data = Buffer.from("\rHello\rWorld\r");
            const p = new parser.Regex({ delimiter: /\r/ });
            const s = spy();
            p.on("data", s);
            p.write(data);
            assert.equal(s.callCount, 2);
        });

        it("should match unicode in buffer string", () => {
            const data = Buffer.from("\u000aHello\u000aWorld\u000d\u000a!");
            const p = new parser.Regex({ delimiter: /\r\n|\n/ });
            const s = spy();
            p.on("data", s);
            p.write(data);
            assert.equal(s.callCount, 2);
        });

        it("continues looking for delimiters in the next buffers", () => {
            const p = new parser.Regex({ delimiter: /\r\n|\n/ });
            const s = spy();
            p.on("data", s);
            p.write(Buffer.from("This could be\na poem "));
            p.write(Buffer.from("or prose\r\nsent from a robot\r\n"));
            assert.equal(s.callCount, 3);
            assert.deepEqual(s.getCall(0).args[0], "This could be");
            assert.deepEqual(s.getCall(1).args[0], "a poem or prose");
            assert.deepEqual(s.getCall(2).args[0], "sent from a robot");
        });

        it("doesn't emits empty data events", () => {
            const s = spy();
            const p = new parser.Regex({ delimiter: /a|b/ });
            p.on("data", s);
            p.write(Buffer.from("abaFab"));
            assert(s.calledOnce);
            assert(s.calledWith("F"));
        });
    });
});
