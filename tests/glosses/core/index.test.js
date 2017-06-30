describe("core", () => {
    const { Transform, x, core, is } = adone;

    const transform = (options) => new Transform(options);

    describe("creation", () => {
        it("should have only one transform stream in a chain", () => {
            const c = core();
            expect(c._chain).to.be.an("array");
            expect(c._chain).to.have.lengthOf(1);
            expect(c._chain[0]).to.be.instanceOf(Transform);
        });

        it("should add a data listener to the stream", () => {
            const c = core();
            expect(c._chain[0].listeners("data")).to.have.lengthOf(1);
        });

        it("should add an end listener to the stream", () => {
            const c = core();
            expect(c._chain[0].listeners("end")).to.have.lengthOf(1);
        });

        it("should add en error listener to the stream", () => {
            const c = core();
            expect(c._chain[0].listeners("error")).to.have.lengthOf(1);
        });

        it("should setup a drain listener to the stream", () => {
            const c = core();
            expect(c._chain[0].listeners("drain")).to.have.lengthOf(1);
        });

        it("should setup the last stream", () => {
            const c = core();
            expect(c._lastStream).to.be.equal(c._chain[0]);
        });

        it("should setup a transform function", () => {
            const transform = adone.noop;
            const c = core(null, { transform });
            expect(c._chain[0]._transform).to.be.equal(transform);
        });

        it("should setup a flush function", () => {
            const flush = adone.noop;
            const c = core(null, { flush });
            expect(c._chain[0]._flush).to.be.equal(flush);
        });

        specify("the stream should be paused by default", () => {
            const c = core();
            expect(c._chain[0].paused).to.be.true;
        });

        describe("sources", () => {
            describe("array", () => {
                it("should write it into the steam element by element", () => {
                    const c = core([1, 2, 3, 4, 5]);
                    expect([...c._readableState.buffer]).to.be.deep.equal([1, 2, 3, 4, 5]);
                });
            });
        });
    });

    describe("predicates", () => {
        it("should be a readable stream", () => {
            expect(is.readableStream(core())).to.be.true;
        });

        it("should be a writable stream", () => {
            expect(is.writableStream(core())).to.be.true;
        });

        it("should be a transform stream", () => {
            expect(is.transformStream(core())).to.be.true;
        });

        it("should be a core stream", () => {
            expect(is.coreStream(core())).to.be.true;
        });
    });

    context("paused", () => {
        it("should return the stream state", () => {
            const c = core();
            expect(c.paused).to.be.equal(c._lastStream.paused);
            c.resume();
            expect(c.paused).to.be.equal(c._lastStream.paused);
        });
    });

    context("ended", () => {
        it("should return the stream state", () => {
            const c = core();
            expect(c.ended).to.be.equal(c._lastStream.ended);
            c._lastStream.end();
            expect(c.ended).to.be.equal(c._lastStream.ended);
        });
    });

    describe("ending", () => {
        it("should end the stream", () => {
            const c = core();
            const end = spy(c._lastStream, "end");
            c.end();
            expect(end.calledOnce).to.be.true;
        });

        it("should return itself", () => {
            const c = core();
            expect(c.end()).to.be.equal(c);
        });
    });

    describe("pushing", () => {
        it("should push a value into the stream", () => {
            const c = core();
            const push = spy();
            c._lastStream.push = push;
            c.push("hello");
            expect(push.calledOnce).to.be.true;
            expect(push.args[0]).to.be.deep.equal(["hello"]);
        });

        it("should return true if the readable buffer is not full", () => {
            const c = core();
            expect(c.push(1)).to.be.true;
        });

        it("should return false if the readable buffer is full", () => {
            const c = core();
            const hwm = c._lastStream._readableState.highWaterMark;
            for (let i = 0; i < hwm - 1; ++i) {
                expect(c.push(i)).to.be.true;
            }
            expect(c.push(0)).to.be.false;
        });
    });

    describe("writing", () => {
        it("should write a value into the stream", () => {
            const c = core();
            const write = spy();
            c._lastStream.write = write;
            c.write("hello");
            expect(write.calledOnce).to.be.true;
            expect(write.args[0]).to.be.deep.equal(["hello"]);
        });

        it("should throw if someone tries to write after the end", () => {
            const c = core();
            c.end();
            expect(() => {
                c.write("hello");
            }).to.throw(x.IllegalState, "end() was called");
        });

        it("should return true if the writable buffer is not full", () => {
            const c = core();
            expect(c.write(1)).to.be.true;
        });

        it("should return false if the writable buffer is full", () => {
            const c = core(null, { transform: () => new Promise(() => { /* to stop the stream */ }) });
            // it will be transforming the first element all the time
            const hwm = c._chain[0]._writableState.highWaterMark;
            for (let i = 0; i < hwm; ++i) {
                expect(c.write(i)).to.be.true;
            }
            expect(c.write(0)).to.be.false;
        });
    });

    describe("pausing", () => {
        it("should pause the stream", () => {
            const c = core();
            const pause = spy(c._lastStream, "pause");
            c.pause();
            expect(pause.calledOnce).to.be.true;
            expect(pause.args[0]).to.be.empty;
        });
    });

    describe("resuming", () => {
        it("should resume the stream", () => {
            const c = core();
            const resume = spy(c._lastStream, "resume");
            c.resume();
            expect(resume.calledOnce).to.be.true;
            expect(resume.args[0]).to.be.empty;
        });
    });

    describe("emitting", () => {
        it("should emit end when the stream ends", () => {
            const c = core();
            const end = spy();
            c.on("end", end);
            c.end();
            expect(end.calledOnce).to.be.true;
            expect(end.args[0]).to.be.empty;
        });

        it("should emit data when there is someting", () => {
            const c = core();
            const data = spy();
            c.on("data", data);
            c.write("hello");
            c.resume();
            expect(data.calledOnce).to.be.true;
            expect(data.args[0]).to.be.deep.equal(["hello"]);
            c.push("hello2");
            expect(data.calledTwice).to.be.true;
            expect(data.args[1]).to.be.deep.equal(["hello2"]);
        });

        it("should emit drain when the writable buffer is empty", () => {
            const c = core();
            for (; c.write(1);) {
                //
            }
            const drain = spy();
            c.on("drain", drain);
            c.resume();
            expect(drain.calledOnce).to.be.true;
        });

        it("should emit error", () => {
            const c = core(null, {
                transform() {
                    throw new Error("hello");
                }
            });
            const error = spy();
            c.on("error", error);
            c.write(1);
            c.resume();
            expect(error.calledOnce).to.be.true;
            expect(error.args[0]).to.have.lengthOf(2);
            expect(error.args[0][0]).to.be.instanceOf(Error);
            expect(error.args[0][0].message).to.be.equal("hello");
            expect(error.args[0][1]).to.be.equal(c._chain[0]);
        });
    });

    describe("states", () => {
        it("should expose the last stream's _readableState", () => {
            const c = core();
            expect(c._readableState).to.be.equal(c._lastStream._readableState);
        });

        it("should expose the first stream's _writableState", () => {
            const c = core();
            expect(c._writableState).to.be.equal(c._chain[0]._writableState);
        });

        it("should expose the first stream's _transformState", () => {
            const c = core();
            expect(c._transformState).to.be.equal(c._chain[0]._transformState);
        });
    });

    describe("piping", () => {
        context("transform stream", () => {
            it("should pipe the last stream to a new one", () => {
                const a = core();
                const b = transform();
                const pipe = spy(a._lastStream, "pipe");
                a.pipe(b);
                expect(pipe.calledOnce).to.be.true;
                expect(pipe.args[0]).to.be.deep.equal([b, { spreadErrors: true }]); // some defaults
            });

            it("should pipe the last stream to a new one with options", () => {
                const a = core();
                const b = transform();
                const options = {};
                const pipe = spy(a._lastStream, "pipe");
                a.pipe(b, options);
                expect(pipe.calledOnce).to.be.true;
                expect(pipe.args[0]).to.be.deep.equal([b, { spreadErrors: true, ...options }]); // some defaults
            });

            it("should add a stream into the chain", () => {
                const a = core();
                const b = transform();
                a.pipe(b);
                expect(a._chain).to.have.lengthOf(2);
                expect(a._chain[1]).to.be.equal(b);
            });

            it("should reassign _lastStream", () => {
                const a = core();
                const b = transform();
                a.pipe(b);
                expect(a._lastStream).to.be.equal(b);
            });

            it("should be paused after piping", () => {
                const a = core();
                const b = transform();
                a.pipe(b);
                expect(a._chain[0].paused).to.be.true;
                expect(a._chain[1].paused).to.be.true;
            });

            context("paused", () => {
                it("should return the stream state", () => {
                    const c = core();
                    const d = transform();
                    c.pipe(d);
                    expect(c.paused).to.be.equal(d.paused);
                    c.resume();
                    expect(d.paused).to.be.false;
                    expect(c.paused).to.be.equal(d.paused);
                });
            });

            context("ended", () => {
                it("should return the stream state", () => {
                    const c = core();
                    const d = transform();
                    c.pipe(d);
                    expect(c.ended).to.be.equal(d.ended);
                    c.end();
                    expect(d.ended).to.be.true;
                    expect(c.ended).to.be.equal(d.ended);
                });
            });

            describe("listeners", () => {
                it("should remove the data listener from the prev stream", () => {
                    const a = core();
                    const b = transform();
                    const remove = spy(a._lastStream, "removeListener");
                    a.pipe(b);
                    expect(remove.withArgs("data", a._dataListener).calledOnce).to.be.true;
                });

                it("should remove the end listener from the prev stream", () => {
                    const a = core();
                    const b = transform();
                    const remove = spy(a._lastStream, "removeListener");
                    a.pipe(b);
                    expect(remove.withArgs("end", a._endListener).calledOnce).to.be.true;
                });

                it("should add the data listener to a new stream", () => {
                    const a = core();
                    const b = transform();
                    const on = spy(b, "on");
                    a.pipe(b);
                    expect(on.withArgs("data", a._dataListener).calledOnce).to.be.true;
                });

                it("should add the end listener to a new stream", () => {
                    const a = core();
                    const b = transform();
                    const once = spy(b, "once");
                    a.pipe(b);
                    expect(once.withArgs("end", a._endListener).calledOnce).to.be.true;
                });

                it("should add en error listener to a new stream", () => {
                    const a = core();
                    const b = transform();
                    const on = spy(b, "on");
                    a.pipe(b);
                    expect(on.withArgs("error").calledOnce).to.be.true;
                });

                it("should not add an error listener to a new stream if spreadErrors = false", () => {
                    const a = core();
                    const b = transform();
                    const on = spy(b, "on");
                    a.pipe(b, { spreadErrors: false });
                    expect(on.withArgs("error").notCalled).to.be.true;
                });
            });

            describe("ending", () => {
                it("should end the first stream", () => {
                    const c = core();
                    const d = transform();
                    c.pipe(d, { end: false }); // to prevent from ending (pipe)
                    const end0 = spy(c._chain[0], "end");
                    const end1 = spy(c._chain[1], "end");
                    c.end();
                    expect(end0.calledOnce).to.be.true;
                    expect(end1.notCalled).to.be.true;
                });

                it("should end all streams if force = true", () => {
                    const c = core();
                    const d = transform();
                    c.pipe(d, { end: false }); // to prevent from ending (pipe)
                    const end0 = spy(c._chain[0], "end");
                    const end1 = spy(c._chain[1], "end");
                    c.end({ force: true });
                    expect(end0.calledOnce).to.be.true;
                    expect(end1.calledOnce).to.be.true;
                });

                it("should return itself", () => {
                    const c = core();
                    const d = transform();
                    c.pipe(d);
                    expect(c.end()).to.be.equal(c);
                });
            });

            describe("pushing", () => {
                it("should push to the last stream", () => {
                    const a = core();
                    const b = transform();
                    a.pipe(b);
                    const push0 = spy(a._chain[0], "push");
                    const push1 = spy(a._chain[1], "push");
                    a.push("hello");
                    expect(push0.notCalled).to.be.true;
                    expect(push1.calledOnce).to.be.true;
                    expect(push1.args[0]).to.be.deep.equal(["hello"]);
                });

                it("should return true if the readable buffer is not full", () => {
                    const c = core();
                    const d = transform();
                    c.pipe(d);
                    expect(c.push(1)).to.be.true;
                });

                it("should return false if the readable buffer is full", () => {
                    const c = core();
                    const d = transform();
                    c.pipe(d);
                    const hwm = c._lastStream._readableState.highWaterMark;
                    for (let i = 0; i < hwm - 1; ++i) {
                        expect(c.push(i)).to.be.true;
                    }
                    expect(c.push(0)).to.be.false;
                });
            });

            describe("writing", () => {
                it("should write to the first stream", () => {
                    const a = core({ transform: () => { /* doing nothing */ } });
                    const b = transform();
                    a.pipe(b);
                    const write0 = spy(a._chain[0], "write");
                    const write1 = spy(a._chain[1], "write");
                    a.write("hello");
                    expect(write0.calledOnce).to.be.true;
                    expect(write1.notCalled).to.be.true;
                    expect(write0.args[0]).to.be.deep.equal(["hello"]);
                });

                it("should throw if someone tries to write after the end", () => {
                    const c = core();
                    const d = transform();
                    c.pipe(d);
                    c.end();
                    expect(() => {
                        c.write("hello");
                    }).to.throw(x.IllegalState, "end() was called");
                });

                it("should return true if the writable buffer is not full", () => {
                    const c = core();
                    const d = transform();
                    c.pipe(d);
                    expect(c.write(1)).to.be.true;
                });

                it("should return false if the writable buffer is full", () => {
                    const c = core(null, { transform: () => new Promise(() => { /* to stop the stream */ }) });
                    // it will be transforming the first element all the time
                    const d = transform();
                    c.pipe(d); // should not affect anyway
                    const hwm = c._chain[0]._writableState.highWaterMark;
                    for (let i = 0; i < hwm; ++i) {
                        expect(c.write(i)).to.be.true;
                    }
                    expect(c.write(0)).to.be.false;
                });
            });

            describe("pausing", () => {
                it("should pause the last stream", () => {
                    const a = core();
                    const b = transform();
                    a.pipe(b);
                    const pause0 = spy(a._chain[0], "pause");
                    const pause1 = spy(a._chain[1], "pause");
                    a.pause();
                    expect(pause0.notCalled).to.be.true;
                    expect(pause1.calledOnce).to.be.true;
                    expect(pause1.args[0]).to.be.empty;
                });
            });

            describe("resuming", () => {
                it("should resume all the streams", () => {
                    const a = core();
                    const b = transform();
                    a.pipe(b);
                    const resume0 = spy(a._chain[0], "resume");
                    const resume1 = spy(a._chain[1], "resume");
                    a.resume();
                    expect(resume0.calledOnce).to.be.true;
                    expect(resume1.calledOnce).to.be.true;
                    expect(resume0.args[0]).to.be.empty;
                    expect(resume1.args[0]).to.be.empty;
                });
            });

            describe("emitting", () => {
                it("should emit end when the stream ends", () => {
                    const c = core();
                    const d = transform();
                    const dEnd = spy();
                    d.on("end", dEnd);
                    c.pipe(d);
                    const end = spy();
                    c.on("end", end);
                    c.end();
                    expect(end.calledOnce).to.be.true;
                    expect(end.args[0]).to.be.empty;
                    expect(end.calledAfter(dEnd)).to.be.true;
                });

                it("should emit data when there is someting", () => {
                    const c = core();
                    const d = transform({
                        transform(x) {
                            this.push({ wrapped: x });
                        }
                    });
                    c.pipe(d);
                    const cData = spy();
                    c._chain[0].on("data", cData);
                    const dData = spy();
                    c._chain[1].on("data", dData);
                    const data = spy();
                    c.on("data", data);

                    c.write("hello");
                    c.resume();

                    expect(data.calledOnce).to.be.true;
                    expect(data.args[0]).to.be.deep.equal([{ wrapped: "hello" }]);
                    expect(cData.calledOnce).to.be.true;
                    expect(cData.args[0]).to.be.deep.equal(["hello"]);
                    expect(dData.calledOnce).to.be.true;
                    expect(dData.args[0]).to.be.deep.equal([{ wrapped: "hello" }]);


                    c.push("hello2");

                    expect(data.calledTwice).to.be.true;
                    expect(data.args[1]).to.be.deep.equal(["hello2"]);
                    expect(cData.calledTwice).to.be.false; // it really should not be called, push into the last stream = d
                    expect(dData.calledTwice).to.be.true;
                    expect(dData.args[1]).to.be.deep.equal(["hello2"]); // it also means that the value will not be wrapped
                });

                it("should emit drain when the writable buffer is empty", () => {
                    const c = core();
                    const d = transform();
                    c.pipe(d);
                    c.resume();
                    d.pause(); // HA!
                    for (let i = 0; c.write(++i);) {
                        //
                    }
                    const drain = spy();
                    c.on("drain", drain);
                    expect(d._readableState.buffer.full).to.be.true;
                    expect(d._writableState.buffer.full).to.be.true;
                    d.resume();
                    expect(drain.calledOnce).to.be.true;
                });

                it("should emit error", () => {
                    const c = core(null, {
                        transform() {
                            throw new Error("hello");
                        }
                    });
                    const d = transform();
                    c.pipe(d);
                    const error = spy();
                    c.on("error", error);
                    c.write(1);
                    c.resume();
                    expect(error.calledOnce).to.be.true;
                    expect(error.args[0]).to.have.lengthOf(2);
                    expect(error.args[0][0]).to.be.instanceOf(Error);
                    expect(error.args[0][0].message).to.be.equal("hello");
                    expect(error.args[0][1]).to.be.equal(c._chain[0]);
                });

                it("should emit error from all the streams", () => {
                    const c = core();
                    const d = transform();
                    const e = transform();
                    c.pipe(d).pipe(e);
                    const error = spy();
                    c.on("error", error);
                    d.emit("error", new Error("1"));
                    e.emit("error", new Error("2"));
                    expect(error.calledTwice).to.be.true;
                });
            });

            describe("states", () => {
                it("should expose the last stream's _readableState", () => {
                    const c = core();
                    const d = transform();
                    c.pipe(d);
                    expect(c._readableState).to.be.equal(d._readableState);
                });

                it("should expose the first stream's _writableState", () => {
                    const c = core();
                    const d = transform();
                    c.pipe(d);
                    expect(c._writableState).to.be.equal(c._chain[0]._writableState);
                });

                it("should expose the first stream's _transformState", () => {
                    const c = core();
                    const d = transform();
                    c.pipe(d);
                    expect(c._transformState).to.be.equal(c._chain[0]._transformState);
                });
            });
        });

        context("core stream", () => {
            it("should pipe the last stream to a new one", () => {
                const a = core();
                const b = core();
                const pipe = spy(a._lastStream, "pipe");
                a.pipe(b);
                expect(pipe.calledOnce).to.be.true;
                expect(pipe.args[0]).to.be.deep.equal([b, { spreadErrors: true }]); // some defaults
            });

            it("should pipe the last stream to a new one with options", () => {
                const a = core();
                const b = core();
                const options = {};
                const pipe = spy(a._lastStream, "pipe");
                a.pipe(b, options);
                expect(pipe.calledOnce).to.be.true;
                expect(pipe.args[0]).to.be.deep.equal([b, { spreadErrors: true, ...options }]); // some defaults
            });

            it("should add a stream into the chain", () => {
                const a = core();
                const b = core();
                a.pipe(b);
                expect(a._chain).to.have.lengthOf(2);
                expect(a._chain[1]).to.be.equal(b);
            });

            it("should not add a new stream into the chain if the prev stream is a core stream", () => {
                {
                    const a = core();
                    const b = core();
                    const c = transform();
                    // c will be piped with b and b will take care of c
                    a.pipe(b).pipe(c);
                    expect(a._chain).to.have.lengthOf(2);
                    expect(a._chain[1]).to.be.equal(b);
                }
                {
                    const a = core();
                    const b = core();
                    const c = core();
                    a.pipe(b).pipe(c);
                    expect(a._chain).to.have.lengthOf(2);
                    expect(a._chain[1]).to.be.equal(b);
                }
            });

            it("should reassign _lastStream", () => {
                const a = core();
                const b = core();
                a.pipe(b);
                expect(a._lastStream).to.be.equal(b);
            });

            it("should not reassign _lastStream if the prev stream is a core stream", () => {
                {
                    const a = core();
                    const b = core();
                    const c = transform();
                    a.pipe(b).pipe(c);
                    expect(a._lastStream).to.be.equal(b);
                }
                {
                    const a = core();
                    const b = core();
                    const c = core();
                    a.pipe(b).pipe(c);
                    expect(a._lastStream).to.be.equal(b);
                }
            });

            it("should be paused after piping", () => {
                const a = core();
                const b = core();
                a.pipe(b);
                expect(a._chain[0].paused).to.be.true;
                expect(a._chain[1].paused).to.be.true;
            });

            context("paused", () => {
                it("should return the stream state", () => {
                    const c = core();
                    const d = core();
                    c.pipe(d);
                    expect(c.paused).to.be.equal(d.paused);
                    c.resume();
                    expect(d.paused).to.be.false;
                    expect(c.paused).to.be.equal(d.paused);
                });
            });

            context("ended", () => {
                it("should return the stream state", () => {
                    const c = core();
                    const d = core();
                    c.pipe(d);
                    expect(c.ended).to.be.equal(d.ended);
                    c.end();
                    expect(d.ended).to.be.true;
                    expect(c.ended).to.be.equal(d.ended);
                });
            });

            describe("listeners", () => {
                it("should remove the data listener from the prev stream", () => {
                    const a = core();
                    const b = core();
                    const remove = spy(a._lastStream, "removeListener");
                    a.pipe(b);
                    expect(remove.withArgs("data", a._dataListener).calledOnce).to.be.true;
                });

                it("should remove the end listener from the prev stream", () => {
                    const a = core();
                    const b = core();
                    const remove = spy(a._lastStream, "removeListener");
                    a.pipe(b);
                    expect(remove.withArgs("end", a._endListener).calledOnce).to.be.true;
                });

                it("should add the data listener to a new stream", () => {
                    const a = core();
                    const b = core();
                    const on = spy(b, "on");
                    a.pipe(b);
                    expect(on.withArgs("data", a._dataListener).calledOnce).to.be.true;
                });

                it("should add the end listener to a new stream", () => {
                    const a = core();
                    const b = core();
                    const once = spy(b, "once");
                    a.pipe(b);
                    expect(once.withArgs("end", a._endListener).calledOnce).to.be.true;
                });

                it("should add en error listener to a new stream", () => {
                    const a = core();
                    const b = core();
                    const on = spy(b, "on");
                    a.pipe(b);
                    expect(on.withArgs("error").calledOnce).to.be.true;
                });

                it("should not add an error listener to a new stream if spreadErrors = false", () => {
                    const a = core();
                    const b = core();
                    const on = spy(b, "on");
                    a.pipe(b, { spreadErrors: false });
                    expect(on.withArgs("error").notCalled).to.be.true;
                });

                it("should not change listeners if the prev stream is a core stream", () => {
                    const a = core();
                    const b = core();
                    const c = core();
                    const remove = spy(b, "removeListener");
                    a.pipe(b).pipe(c);
                    expect(remove.notCalled).to.be.true;
                });
            });

            describe("ending", () => {
                it("should end the first stream", () => {
                    const c = core();
                    const d = core();
                    c.pipe(d, { end: false }); // to prevent from ending (pipe)
                    const end0 = spy(c._chain[0], "end");
                    const end1 = spy(c._chain[1], "end");
                    c.end();
                    expect(end0.calledOnce).to.be.true;
                    expect(end1.notCalled).to.be.true;
                });

                it("should end all stream if force = true", () => {
                    const c = core();
                    const d = core();
                    c.pipe(d, { end: false }); // to prevent from ending (pipe)
                    const end0 = spy(c._chain[0], "end");
                    const end1 = spy(c._chain[1], "end");
                    c.end({ force: true });
                    expect(end0.calledOnce).to.be.true;
                    expect(end1.calledOnce).to.be.true;
                });

                it("should return itself", () => {
                    const c = core();
                    const d = core();
                    c.pipe(d);
                    expect(c.end()).to.be.equal(c);
                });
            });

            describe("pushing", () => {
                it("should push to the last stream", () => {
                    const a = core();
                    const b = core();
                    a.pipe(b);
                    const push0 = spy(a._chain[0], "push");
                    const push1 = spy(a._chain[1], "push");
                    a.push("hello");
                    expect(push0.notCalled).to.be.true;
                    expect(push1.calledOnce).to.be.true;
                    expect(push1.args[0]).to.be.deep.equal(["hello"]);
                });

                it("should return true if the readable buffer is not full", () => {
                    const c = core();
                    const d = core();
                    c.pipe(d);
                    expect(c.push(1)).to.be.true;
                });

                it("should return false if the readable buffer is full", () => {
                    const c = core();
                    const d = core();
                    c.pipe(d);
                    const hwm = c._lastStream._readableState.highWaterMark;
                    for (let i = 0; i < hwm - 1; ++i) {
                        expect(c.push(i)).to.be.true;
                    }
                    expect(c.push(0)).to.be.false;
                });
            });

            describe("writing", () => {
                it("should write to the first stream", () => {
                    const a = core({ transform: () => { /* doing nothing */ } });
                    const b = core();
                    a.pipe(b);
                    const write0 = spy(a._chain[0], "write");
                    const write1 = spy(a._chain[1], "write");
                    a.write("hello");
                    expect(write0.calledOnce).to.be.true;
                    expect(write1.notCalled).to.be.true;
                    expect(write0.args[0]).to.be.deep.equal(["hello"]);
                });

                it("should throw if someone tries to write after the end", () => {
                    const c = core();
                    const d = core();
                    c.pipe(d);
                    c.end();
                    expect(() => {
                        c.write("hello");
                    }).to.throw(x.IllegalState, "end() was called");
                });

                it("should return true if the writable buffer is not full", () => {
                    const c = core();
                    const d = core();
                    c.pipe(d);
                    expect(c.write(1)).to.be.true;
                });

                it("should return false if the writable buffer is full", () => {
                    const c = core(null, { transform: () => new Promise(() => { /* to stop the stream */ }) });
                    // it will be transforming the first element all the time
                    const d = core();
                    c.pipe(d); // should not affect anyway
                    const hwm = c._chain[0]._writableState.highWaterMark;
                    for (let i = 0; i < hwm; ++i) {
                        expect(c.write(i)).to.be.true;
                    }
                    expect(c.write(0)).to.be.false;
                });
            });

            describe("pausing", () => {
                it("should pause the last stream", () => {
                    const a = core();
                    const b = core();
                    a.pipe(b);
                    const pause0 = spy(a._chain[0], "pause");
                    const pause1 = spy(a._chain[1], "pause");
                    a.pause();
                    expect(pause0.notCalled).to.be.true;
                    expect(pause1.calledOnce).to.be.true;
                    expect(pause1.args[0]).to.be.empty;
                });
            });

            describe("resuming", () => {
                it("should resume all the streams", () => {
                    const a = core();
                    const b = core();
                    a.pipe(b);
                    const resume0 = spy(a._chain[0], "resume");
                    const resume1 = spy(a._chain[1], "resume");
                    a.resume();
                    expect(resume0.calledOnce).to.be.true;
                    expect(resume1.calledOnce).to.be.true;
                    expect(resume0.args[0]).to.be.empty;
                    expect(resume1.args[0]).to.be.empty;
                });
            });

            describe("emitting", () => {
                it("should emit end when the stream ends", () => {
                    const c = core();
                    const d = core();
                    const dEnd = spy();
                    d.on("end", dEnd);
                    c.pipe(d);
                    const end = spy();
                    c.on("end", end);
                    c.end();
                    expect(end.calledOnce).to.be.true;
                    expect(end.args[0]).to.be.empty;
                    expect(end.calledAfter(dEnd)).to.be.true;
                });

                it("should emit data when there is someting", () => {
                    const c = core();
                    const d = core(null, {
                        transform(x) {
                            this.push({ wrapped: x });
                        }
                    });
                    c.pipe(d);
                    const cData = spy();
                    c._chain[0].on("data", cData);
                    const dData = spy();
                    c._chain[1].on("data", dData);
                    const data = spy();
                    c.on("data", data);

                    c.write("hello");
                    c.resume();

                    expect(data.calledOnce).to.be.true;
                    expect(data.args[0]).to.be.deep.equal([{ wrapped: "hello" }]);
                    expect(cData.calledOnce).to.be.true;
                    expect(cData.args[0]).to.be.deep.equal(["hello"]);
                    expect(dData.calledOnce).to.be.true;
                    expect(dData.args[0]).to.be.deep.equal([{ wrapped: "hello" }]);


                    c.push("hello2");

                    expect(data.calledTwice).to.be.true;
                    expect(data.args[1]).to.be.deep.equal(["hello2"]);
                    expect(cData.calledTwice).to.be.false; // it really should not be called, push into the last stream = d
                    expect(dData.calledTwice).to.be.true;
                    expect(dData.args[1]).to.be.deep.equal(["hello2"]); // it also means that the value will not be wrapped
                });

                it("should emit drain when the writable buffer is empty", () => {
                    const c = core();
                    const d = core();
                    c.pipe(d);
                    c.resume();
                    d.pause(); // HA!
                    for (let i = 0; c.write(++i);) {
                        //
                    }
                    const drain = spy();
                    c.on("drain", drain);
                    expect(d._readableState.buffer.full).to.be.true;
                    expect(d._writableState.buffer.full).to.be.true;
                    d.resume();
                    expect(drain.calledOnce).to.be.true;
                });

                it("should emit error", () => {
                    const c = core(null, {
                        transform() {
                            throw new Error("hello");
                        }
                    });
                    const d = core();
                    c.pipe(d);
                    const error = spy();
                    c.on("error", error);
                    c.write(1);
                    c.resume();
                    expect(error.calledOnce).to.be.true;
                    expect(error.args[0]).to.have.lengthOf(2);
                    expect(error.args[0][0]).to.be.instanceOf(Error);
                    expect(error.args[0][0].message).to.be.equal("hello");
                    expect(error.args[0][1]).to.be.equal(c._chain[0]);
                });

                it("should emit error from all the streams", () => {
                    const c = core();
                    const d = core();
                    const e = transform();
                    const f = core();
                    c.pipe(d).pipe(e).pipe(f);
                    const error = spy();
                    c.on("error", error);
                    d.emit("error", new Error("1"));
                    e.emit("error", new Error("2"));
                    f.emit("error", new Error("3"));
                    expect(error.calledThrice).to.be.true;
                });
            });

            describe("states", () => {
                it("should expose the last stream's _readableState", () => {
                    const c = core();
                    const d = core();
                    c.pipe(d);
                    expect(c._readableState).to.be.equal(d._readableState);
                });

                it("should expose the first stream's _writableState", () => {
                    const c = core();
                    const d = core();
                    c.pipe(d);
                    expect(c._writableState).to.be.equal(c._chain[0]._writableState);
                });

                it("should expose the first stream's _transformState", () => {
                    const c = core();
                    const d = core();
                    c.pipe(d);
                    expect(c._transformState).to.be.equal(c._chain[0]._transformState);
                });
            });
        });

        context("function", () => {
            it("should call it passing self as the argument", () => {
                const c = core();
                const pipe = spy();
                c.pipe(pipe);
                expect(pipe.calledOnce).to.be.true;
                expect(pipe.args[0]).to.be.deep.equal([c]);
            });
        });

        context("node streams", () => {
            context("object mode", () => {
                context("transform stream", () => {
                    it("should pipe a core stream and a node transform stream", async () => {
                        const a = core([1, 2, 3, 4, 5]);
                        const b = new adone.std.stream.Transform({
                            transform: (chunk, encoding, callback) => {
                                callback(null, chunk);
                            },
                            objectMode: true
                        });
                        a.pipe(b);
                        expect(a._chain[1]).to.be.equal(b);
                        const result = [];
                        await new Promise((resolve) => {
                            b
                                .on("data", (x) => {
                                    result.push(x);
                                })
                                .on("end", resolve);
                            a.resume();
                        });
                        expect(result).to.be.deep.equal([1, 2, 3, 4, 5]);
                    });

                    it("should pipe a node transform stream and a core stream", async () => {
                        const a = new adone.std.stream.Transform({
                            objectMode: true
                        });
                        const b = core();
                        a.pipe(b);
                        a.push(1);
                        a.push(2);
                        a.push(3);
                        a.push(4);
                        a.push(5);
                        a.end();
                        expect(await b).to.be.deep.equal([1, 2, 3, 4, 5]);
                    });
                });
            });
        });
    });

    describe("api", () => {
        describe("each", () => {
            it("should be the same as on(\"data\", callback)", (done) => {
                const c = core([1, 2, 3, 4, 5]);
                const res = [];
                c.on("end", () => {
                    expect(res).to.be.deep.equal([1, 2, 3, 4, 5]);
                    done();
                });
                c.each((x) => res.push(x)).resume();
            });

            it("should return itself", () => {
                const c = core();
                expect(c.each(adone.noop)).to.be.equal(c);
            });

            it("should throw if the callback is not a function", () => {
                expect(() => {
                    core().each();
                }).to.throw(x.InvalidArgument, "\"callback\" must be a function");
            });

            it("should automatically resume the stream", (done) => {
                const c = core([1, 2, 3, 4, 5]);
                const res = [];
                c.on("end", () => {
                    expect(res).to.be.deep.equal([1, 2, 3, 4, 5]);
                    done();
                });
                c.each((x) => res.push(x)).resume();
            });

            it("should resume on the next tick", (done) => {
                const c = core([1, 2, 3, 4, 5]);
                const res = [];
                c.each((x) => res.push(x));
                expect(c.paused).to.be.true;
                c.on("end", () => {
                    expect(res).to.be.deep.equal([1, 2, 3, 4, 5]);
                    done();
                });
            });
        });

        describe("toArray", () => {
            it("should gather all the values into an array and call the callback", (done) => {
                const c = core([1, 2, 3, 4, 5]);
                c.toArray((values) => {
                    expect(values).to.be.deep.equal([1, 2, 3, 4, 5]);
                    done();
                });
            });

            it("should return itself", () => {
                const c = core();
                expect(c.toArray(adone.noop)).to.be.equal(c);
            });

            it("should throw if the callback is not a function", () => {
                expect(() => {
                    core().toArray();
                }).to.throw(x.InvalidArgument, "\"callback\" must be a function");
            });

            it("should call the callback with an empty array if the stream has ended", (done) => {
                const c = core().end();
                c.toArray((x) => {
                    expect(x).to.be.empty;
                    done();
                });
            });

            it("should call the callback on the next tick", async () => {
                const c = core().end();
                const h = spy();
                c.toArray(h);
                expect(h.called).to.be.false;
                await adone.promise.delay(2);
                expect(h.calledOnce).to.be.true;
            });
        });

        describe("promise", () => {
            describe("then", () => {
                it("should return Promise", () => {
                    const c = core();
                    expect(c.then(adone.noop, adone.noop)).to.be.instanceOf(Promise);
                });

                it("should resolve a promise using the toArray result", async () => {
                    const c = core([1, 2, 3, 4, 5]);
                    const res = await c;
                    expect(res).to.be.deep.equal([1, 2, 3, 4, 5]);
                });

                it("should reject a promise if the stream receives an error event", async () => {
                    const c = core();
                    let res = c.then(() => null, (e) => e);
                    c.emit("error", "hello");
                    res = await res;
                    expect(res).to.be.equal("hello");
                });
            });

            describe("catch", () => {
                it("should be the same as then where onResolve is null", async () => {
                    const c = core();
                    const then = spy(c, "then");
                    const cb = adone.noop;
                    c.catch(cb);
                    expect(then.calledOnce).to.be.true;
                    expect(then.args[0]).to.be.deep.equal([null, cb]);
                });
            });
        });

        describe("through", () => {
            it("should pipe a transform", () => {
                const a = core();
                const transform = adone.noop;
                const flush = adone.noop;
                a.through(transform, flush);
                expect(a._chain).to.have.lengthOf(2);
                expect(a._chain[1]).to.be.instanceOf(Transform);
                expect(a._chain[1]._transform).to.be.equal(transform);
                expect(a._chain[1]._flush).to.be.equal(flush);
            });

            it("should return itself", () => {
                const a = core();
                expect(a.through()).to.be.equal(a);
            });
        });

        describe("map", () => {
            it("should map values", async () => {
                const res = await core([1, 2, 3, 4, 5]).map((x) => x * x);
                expect(res).to.be.deep.equal([1, 4, 9, 16, 25]);
            });

            it("should support promises", async () => {
                const res = await core([1, 2, 3, 4, 5]).map(async (x) => x * x);
                expect(res).to.be.deep.equal([1, 4, 9, 16, 25]);
            });

            it("should emit an error if someting goes wrong inside a callback", async () => {
                const res = await core([1, 2, 3, 4, 5]).map((x) => {
                    if (x === 3) {
                        throw new Error("hello");
                    }
                    return x;
                }).then(() => null, (e) => e);
                expect(res).to.be.instanceOf(Error);
                expect(res.message).to.be.equal("hello");

            });

            it("should emit an error if someting goes wrong inside an async callback", async () => {
                const res = await core([1, 2, 3, 4, 5]).map(async (x) => {
                    if (x === 3) {
                        throw new Error("hello");
                    }
                    return x;
                }).then(() => null, (e) => e);
                expect(res).to.be.instanceOf(Error);
                expect(res.message).to.be.equal("hello");
            });

            it("should emit an error if the callback is not a function", () => {
                expect(() => {
                    core().map();
                }).to.throw(x.InvalidArgument, "\"callback\" must be a function");
            });
        });

        describe("filter", () => {
            it("should filter values using the callback", async () => {
                const res = await core([1, 2, 3, 4, 5]).filter((x) => x % 2);
                expect(res).to.be.deep.equal([1, 3, 5]);
            });

            it("should support promises", async () => {
                const res = await core([1, 2, 3, 4, 5]).filter(async (x) => x % 2);
                expect(res).to.be.deep.equal([1, 3, 5]);
            });

            it("should throw if something goes wrong inside a callback", async () => {
                const res = await core([1, 2, 3, 4, 5]).filter((x) => {
                    if (x === 3) {
                        throw new Error("hello");
                    }
                    return x % 2;
                }).then(() => null, (e) => e);
                expect(res).to.be.instanceOf(Error);
                expect(res.message).to.be.equal("hello");
            });

            it("should throw if something goes wrong inside an async callback", async () => {
                const res = await core([1, 2, 3, 4, 5]).filter((x) => {
                    if (x === 3) {
                        throw new Error("hello");
                    }
                    return x % 2;
                }).then(() => null, (e) => e);
                expect(res).to.be.instanceOf(Error);
                expect(res.message).to.be.equal("hello");
            });

            it("should throw if the callback is not a function", () => {
                expect(() => {
                    core().filter();
                }).to.throw(x.InvalidArgument, "\"callback\" must be a function");
            });
        });

        describe("done", () => {
            it("should be the same as once(\"end\", callback) if current = false", () => {
                const a = core();
                const once = spy(a, "once");
                a.done(adone.noop);
                expect(once.withArgs("end").calledOnce).to.be.true;
            });

            it("should call the last stream end, not this.once if current = true", () => {
                const a = core();
                const lastOnce = spy(a._lastStream, "once");
                const once = spy(a, "once");
                a.done(adone.noop, { current: true });
                expect(once.withArgs("end").called).to.be.false;
                expect(lastOnce.withArgs("end").calledOnce).to.be.true;
            });

            it("should return itself", () => {
                const a = core();
                expect(a.done(adone.noop)).to.be.equal(a);
                expect(a.done(adone.noop)).to.be.equal(a);
            });

            it("should throw if the callback is not a function", () => {
                expect(() => {
                    core().done();
                }).to.throw(adone.x.InvalidArgument, "\"callback\" must be a function");
            });
        });

        describe("unique", () => {
            it("should pass one element two times", async () => {
                const a = core([1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
                a.unique();
                expect(await a).to.be.deep.equal([1, 2, 3, 4, 5]);
            });

            it("should filter values using a property function", async () => {
                const a = core([
                    { a: 1, b: 1 },
                    { a: 1, b: 2 },
                    { a: 2, b: 1 },
                    { a: 2, b: 2 },
                    { a: 3, b: 1 },
                    { a: 3, b: 2 }
                ]);
                a.unique((x) => x.a);
                expect(await a).to.be.deep.equal([
                    { a: 1, b: 1 },
                    { a: 2, b: 1 },
                    { a: 3, b: 1 }
                ]);
            });

            it("should throw if the argument is not a function", () => {
                expect(() => {
                    core().unique(123);
                }).to.throw(adone.x.InvalidArgument, "\"prop\" must be a function or null");
            });

            it("should not throw if the argument is null", () => {
                core().unique(null);
            });

            it("should clear the cache after the end", async () => {
                const obj = adone.o();
                const a = core([obj]);
                const orig = Set.prototype.clear;
                let called = false;
                Set.prototype.clear = function (...args) {
                    if (this.size === 1 && [...this.keys()][0] === obj) {
                        called = true;
                    }
                    return orig.apply(this, args);
                };
                try {
                    a.unique();
                    await a;
                } finally {
                    Set.prototype.clear = orig;
                }
                expect(called).to.be.true;
            });
        });

        describe("if", () => {
            it("should pass true values", async () => {
                const _truev = [];
                const _falsev = [];
                const _true = core().map((x) => {
                    _truev.push(x);
                    return x;
                });
                const _false = core().map((x) => {
                    _falsev.push(x);
                    return x;
                });
                const s = core().if((x) => x % 2 === 0, _true, _false);
                for (let i = 0; i < 10; i += 2) {
                    s.write(i);
                }
                s.end();
                const values = await s;
                expect(values).to.be.deep.equal([0, 2, 4, 6, 8]);
                expect(_truev).to.be.deep.equal([0, 2, 4, 6, 8]);
                expect(_falsev).to.be.empty;
            });

            it("should pass false values", async () => {
                const _truev = [];
                const _falsev = [];
                const _true = core().map((x) => {
                    _truev.push(x);
                    return x;
                });
                const _false = core().map((x) => {
                    _falsev.push(x);
                    return x;
                });
                const s = core().if((x) => x % 2 !== 0, _true, _false);
                for (let i = 0; i < 10; i += 2) {
                    s.write(i);
                }
                s.end();
                const values = await s;
                expect(values).to.be.deep.equal([0, 2, 4, 6, 8]);
                expect(_falsev).to.be.deep.equal([0, 2, 4, 6, 8]);
                expect(_truev).to.be.empty;
            });

            it("should correctly handle true and false values", async () => {
                const _truev = [];
                const _falsev = [];
                const _true = core().map(async (x) => {
                    _truev.push(x);
                    return x;
                });
                const _false = core().map(async (x) => {
                    _falsev.push(x);
                    return x;
                });
                const s = core().if((x) => x % 2 === 0, _true, _false);
                for (let i = 0; i < 10; ++i) {
                    s.write(i);
                }
                s.end();
                const values = await s;
                expect(values).to.be.deep.equal([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
                expect(_truev).to.be.deep.equal([0, 2, 4, 6, 8]);
                expect(_falsev).to.be.deep.equal([1, 3, 5, 7, 9]);
            });

            it("should support async functions", async () => {
                const _truev = [];
                const _falsev = [];
                const _true = core().map((x) => {
                    _truev.push(x);
                    return x;
                });
                const _false = core().map((x) => {
                    _falsev.push(x);
                    return x;
                });
                const s = core().if(async (x) => x % 2 !== 0, _true, _false);
                for (let i = 0; i < 10; i += 2) {
                    s.write(i);
                }
                s.end();
                const values = await s;
                expect(values).to.be.deep.equal([0, 2, 4, 6, 8]);
                expect(_falsev).to.be.deep.equal([0, 2, 4, 6, 8]);
                expect(_truev).to.be.empty;
            });

            it("should handle backpressure", async () => {
                let _truev = [];
                let _falsev = [];
                const _true = core().map((x) => {
                    _truev.push(x);
                    return x;
                });
                const _false = core().map((x) => {
                    _falsev.push(x);
                    return x;
                });
                const s = core().if((x) => x % 2 !== 0, _true, _false);
                let i = 1;
                let values = [];
                s.on("data", (x) => values.push(x));
                while (s.write(i += 2)) {
                    //
                }
                s.resume();
                await adone.promise.delay(1);
                s.pause();
                expect(values).not.to.be.empty;
                expect(_truev).not.to.be.empty;
                expect(_falsev).to.be.empty;

                i = 0;
                values = [];
                _truev = [];
                _falsev = [];
                while (s.write(i += 2)) {
                    //

                }
                s.resume();
                await adone.promise.delay(1);
                s.pause();
                expect(values).not.to.be.empty;
                expect(_truev).to.be.empty;
                expect(_falsev).not.to.be.empty;

                i = 0;
                values = [];
                _truev = [];
                _falsev = [];
                while (s.write(++i)) {
                    //
                }
                s.resume();
                await adone.promise.delay(1);
                s.pause();
                expect(values).not.to.be.empty;
                expect(_truev).not.to.be.empty;
                expect(_falsev).not.to.be.empty;
                expect(values).to.have.lengthOf(_truev.length + _falsev.length);
            });

            it("should write to the output if the false stream is a false value", async () => {
                const _true = core().map((x) => `true ${x}`);
                const s = core().if((x) => x % 2 === 0, _true);
                s.write(1);
                s.write(2);
                s.write(3);
                s.end();
                const values = await s;
                expect(values.sort()).to.be.deep.equal([1, 3, "true 2"]);
            });

            it("should write to the output if the true stream is a false value", async () => {
                const _false = core().map((x) => `false ${x}`);
                const s = core().if((x) => x % 2 === 0, null, _false);
                s.write(1);
                s.write(2);
                s.write(3);
                s.end();
                const values = await s;
                expect(values.sort()).to.be.deep.equal([2, "false 1", "false 3"]);
            });

            it("should throw if no stream is provided", () => {
                expect(() => {
                    core().if((x) => x % 2 === 0);
                }).to.throw(x.InvalidArgument, "You must provide at least one stream");
            });
        });

        describe("stash/unstash", () => {
            const { Filter } = core;

            const write = (stream, iterable) => {
                for (const i of iterable) {
                    stream.write(i);
                }
                stream.end();
            };

            const fetch = async (stream) => {
                const p = Promise.resolve(core(stream));
                stream.end();
                return p;
            };

            it("should stash elements", async () => {
                const filter = new Filter();
                const ss = filter.stash((x) => x % 2);
                write(ss, [0, 1, 2, 3, 4, 5]);
                expect(await core(ss)).to.be.deep.equal([0, 2, 4]);
            });

            it("should unstash elements", async () => {
                const filter = new Filter();
                const ss = filter.stash((x) => x % 2);
                const us = filter.unstash();
                write(ss, [0, 1, 2, 3, 4, 5]);
                adone.promise.delay(100).then(() => us.end());
                expect(await core(us)).to.be.deep.equal([1, 3, 5]);
            });

            it("should use named stream", async () => {
                const filter = new Filter();
                const ess = filter.stash("even", (x) => !(x % 2));
                const oss = filter.stash("odd", (x) => x % 2);
                write(ess, [0, 1, 2, 3, 4, 5]);
                write(oss, [0, 1, 2, 3, 4, 5]);
                expect(await fetch(ess)).to.be.deep.equal([1, 3, 5]);
                expect(await fetch(oss)).to.be.deep.equal([0, 2, 4]);
                const esu = filter.unstash("even");
                const osu = filter.unstash("odd");
                expect(await fetch(esu)).to.be.deep.equal([0, 2, 4]);
                expect(await fetch(osu)).to.be.deep.equal([1, 3, 5]);
            });

            it("should support back pressure", async () => {
                const filter = new Filter();
                const ss = filter.stash((x) => x % 2);
                let i;
                for (i = 0; ss.write(i); i += 2) {
                    //
                }
                const us = filter.unstash();
                expect(i >> 1).to.be.equal(us._readableState.highWaterMark);
                us.resume();
                await adone.promise.delay(1);
                us.pause();
                expect(ss.write(100)).to.be.true;
            });

            it("should unstash all the streams", async () => {
                const filter = new Filter();
                const named1 = filter.stash("hello", (x) => x === "hello");
                const named2 = filter.stash("world", (x) => x === "world");
                const unnamed1 = filter.stash((x) => x % 2);
                const unnamed2 = filter.stash((x) => !(x % 2));
                write(named1, ["hello", "world"]);
                write(named2, ["hello", "world"]);
                write(unnamed1, [0, 1, 2, 3, 4, 5]);
                write(unnamed2, [0, 1, 2, 3, 4, 5]);
                const us = filter.unstash();
                await adone.promise.delay(100).then(() => {
                    named1.end();
                    named2.end();
                    unnamed1.end();
                    unnamed2.end();
                    us.end();
                });
                const result = await us;
                expect(result.sort()).to.be.deep.equal([0, 1, 2, 3, 4, 5, "hello", "world"]);
            });

            it("should return null stream if there is no streams", async () => {
                const filter = new Filter();
                expect(filter.unstash()).to.be.null;
                expect(filter.unstash("hello")).to.be.null;
            });

            describe("integration", () => {
                it("should stash even numbers", async () => {
                    const numbers = await core([1, 2, 3, 4, 5]).stash("even", (x) => x % 2 === 0);
                    expect(numbers).to.be.deep.equal([1, 3, 5]);
                });

                it("should unstash even numbers", async () => {
                    const numbers = await core([1, 2, 3, 4, 5])
                        .stash("even", (x) => x % 2 === 0)
                        .map((x) => {
                            expect(x % 2).to.be.equal(1);
                            return x;
                        })
                        .unstash("even");
                    expect(numbers).to.be.deep.equal([1, 2, 3, 4, 5]);
                });

                it("should unstash everything", async () => {
                    let hadSomething = false;
                    const values = await core(["string", 1, 2, 3, 4, 5, 6, 7, 8, 9])
                        .stash("even", (x) => is.number(x) && x % 2 === 0)
                        .stash("odd", (x) => is.number(x) && x % 2 === 1)
                        .map((x) => {
                            hadSomething = true;
                            expect(x).to.be.equal("string");
                            return x;
                        })
                        .stash(() => true)
                        .unstash();
                    expect(hadSomething).to.be.true;
                    expect(values).to.be.deep.equal(["string", 1, 2, 3, 4, 5, 6, 7, 8, 9]);
                });

                it("should correctly handle multiple stashes", async () => {
                    let hadNumbers = false;

                    const values = await core([1, 2, 3, 4, 5, "a", "b", "c", ["key"], ["value"]])
                        .stash("numbers", (x) => is.number(x))
                        .stash("strings", (x) => is.string(x))
                        .map((x) => {
                            expect(x).to.be.an("array");
                            return x;
                        })
                        .stash("arrays", (x) => is.array(x))
                        .unstash("numbers")
                        .map((x) => {
                            hadNumbers = true;
                            expect(x).to.be.a("number");
                            return x;
                        })
                        .unstash();

                    expect(hadNumbers).to.be.true;
                    expect(values).to.be.deep.equal([1, 2, 3, 4, 5, "a", "b", "c", ["key"], ["value"]]);
                });
            });
        });

        describe("static", () => {
            describe("merge", () => {
                it("should merge multiple streams", async () => {
                    const res = await core.merge([
                        core([1, 2, 3]),
                        core([4, 5, 6]),
                        core([7, 8, 9])
                    ]);
                    res.sort((a, b) => a - b);
                    expect(res).to.be.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                });

                it("should not end the stream if end = false", async () => {
                    const stream = core.merge([
                        core([1, 2, 3]),
                        core([4, 5, 6]),
                        core([7, 8, 9])
                    ], { end: false });
                    let i = 0;
                    stream.on("data", () => {
                        ++i;
                        if (i === 9) {
                            setTimeout(() => {
                                for (let i = 0; i < 10; ++i) {
                                    setTimeout(() => {
                                        stream.write(i);
                                    }, 5 * (i + 1));
                                }
                            }, 50);
                        } else if (i === 19) {
                            stream.end();
                        }
                    });
                    await stream;
                });

                it("should emit an error if merged stream emits an error", () => {
                    const a = core();
                    const b = core();
                    const error = spy();
                    const c = core.merge([a, b]);
                    c.on("error", error);
                    a.emit("error", "hello a");
                    expect(error.calledOnce).to.be.true;
                    expect(error.args[0]).to.be.deep.equal(["hello a", a]);
                    b.emit("error", "hello b");
                    expect(error.calledTwice).to.be.true;
                    expect(error.args[1]).to.be.deep.equal(["hello b", b]);
                });

                it("should call functions in the arguments", async () => {
                    const a = () => core([1, 2, 3]);
                    const b = () => core([4, 5]);
                    const c = core.merge([a, b]);
                    expect((await c).sort()).to.be.deep.equal([1, 2, 3, 4, 5]);
                });

                it("should ignore falsy streams", async () => {
                    const c = core.merge([
                        core([1, 2, 3]),
                        core([4, 5, 6]),
                        null
                    ]);
                    expect((await c).sort()).to.be.deep.equal([1, 2, 3, 4, 5, 6]);
                });

                it("should ignore ended streams", async () => {
                    const c = core.merge([
                        core().end(),
                        core([4, 5, 6])
                    ]);
                    expect(await c).to.be.deep.equal([4, 5, 6]);
                });

                it("should not ignore ending streams", async () => { // a strange one
                    const c = core.merge([
                        core([1, 2, 3], { flush: () => adone.promise.delay(100) }),
                        core([4, 5, 6])
                    ]);
                    expect((await c).sort()).to.be.deep.equal([1, 2, 3, 4, 5, 6]);
                });

                it("should resume input streams on the next tick", async () => {
                    const a = core([4, 5, 6]);
                    const b = core([7, 8, 9]);
                    core.merge([a, b]);
                    expect(a.paused).to.be.true;
                    expect(b.paused).to.be.true;
                    await adone.promise.delay(2);
                    expect(a.paused).to.be.false;
                    expect(b.paused).to.be.false;
                });

                it("should handle back pressure", async () => {
                    const a = core();
                    const b = core();
                    const c = core.merge([a, b]);
                    await adone.promise.delay(2);
                    // resumed

                    for (; a.write(1);) {
                        //
                    }

                    expect(a.paused).to.be.true;

                    expect(c._writableState.buffer.full).to.be.true;
                    expect(c._readableState.buffer.full).to.be.true;

                    expect(a._readableState.buffer.full).to.be.true;
                    expect(a._writableState.buffer.full).to.be.true;

                    expect(b._readableState.buffer.empty).to.be.true;
                    expect(b._writableState.buffer.empty).to.be.true;

                    expect(b.paused).to.be.false;
                    expect(b.write(1)).to.be.true; // b's streams are empty
                    expect(b.paused).to.be.true; // but the stream should pause b

                    c.resume();

                    // now it should resume all the streams
                    expect(a.paused).to.be.false;
                    expect(b.paused).to.be.false;

                    c.pause();

                    for (; a.push(1);) {
                        //
                    }

                    // it should not touch ended streams
                    a.end();

                    expect(a._readableState.buffer.full).to.be.true;
                    expect(a._writableState.buffer.empty).to.be.true;
                    expect(a.paused).to.be.true;

                    c.resume();

                    expect(a.paused).to.be.true;

                    b.write(1);
                    expect(a._readableState.buffer.empty).to.be.true;
                    expect(a._writableState.buffer.empty).to.be.true;
                });

                it("should work with transforms", async () => {
                    const a = transform();
                    const b = core([4, 5, 6]);

                    a.write(1);
                    a.write(2);
                    a.write(3);
                    a.end();

                    const c = core.merge([a, b]);
                    expect((await c).sort()).to.be.deep.equal([1, 2, 3, 4, 5, 6]);
                });

                it("should correclty handle the case of 1 input core stream", async () => {
                    const a = core([1, 2, 3]);
                    const c = core.merge([a]);
                    expect(await c).to.be.deep.equal([1, 2, 3]);
                });

                it("should correcly handle the case of 1 input transform stream", async () => {
                    const a = transform();
                    a.write(1);
                    a.write(2);
                    a.write(3);
                    process.nextTick(() => a.end());
                    const c = core.merge([a]);
                    expect(await c).to.be.deep.equal([1, 2, 3]);
                });

                it("should correcly work using inheritance", async () => {
                    class ExCore extends adone.core.Core {
                        somethingUseful() {
                            return this.map((x) => x + 1);
                        }
                    }

                    const a = ExCore.merge([
                        core([1, 2, 3]),
                        core([4, 5, 6])
                    ]).somethingUseful();
                    expect((await a).sort()).to.be.deep.equal([2, 3, 4, 5, 6, 7]);
                });

                it("should pass options to the source stream", async () => {
                    const a = core([1, 2, 3]);
                    const b = core([4, 5, 6]);
                    const c = core.merge([a, b], {
                        transform(x) {
                            this.push(x + 1);
                        },
                        flush() {
                            this.push(8);
                        }
                    });
                    expect((await c).sort()).to.be.deep.equal([2, 3, 4, 5, 6, 7, 8]);
                });
            });
        });
    });
});
