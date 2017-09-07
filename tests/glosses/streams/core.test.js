describe("core", () => {
    const { x, stream, is, promise, noop } = adone;
    const { core } = stream;

    const { SyncTransform, AsyncTransform } = adone.private(core);

    const nextTick = () => new Promise((resolve) => process.nextTick(resolve));

    const passthrough = function (x) {
        this.push(x);
    };

    describe("SyncTransform", () => {
        it("should be paused by default", () => {
            const stream = new SyncTransform(() => { });
            expect(stream.isPaused()).to.be.true;
        });

        it("should not emit elements when paused", async () => {
            const stream = new SyncTransform(passthrough);
            const next = spy();
            stream.onNext(next);
            stream.write(1);
            stream.write(2);
            stream.write(3);
            stream.push(4);
            stream.push(5);
            stream.push(6);
            expect(next).to.have.not.been.called;
            await promise.delay(50);
            expect(next).to.have.not.been.called;
        });

        it("should emit elements after resume, but on the next tick", async () => {
            const stream = new SyncTransform(passthrough);
            const next = spy();
            stream.onNext(next);
            stream.write(1);
            stream.write(2);
            stream.write(3);
            stream.push(4);
            stream.push(5);
            stream.push(6);
            stream.resume();
            expect(next).to.have.not.been.called;
            await nextTick();
            expect(next).to.have.callCount(6);
            stream.write(7);
            expect(next).to.have.callCount(7);
            stream.push(8);
            expect(next).to.have.callCount(8);
        });

        it("should process values synchronously/immediately", async () => {
            const stream = new SyncTransform(function (x) {
                this.push(-x);
            });
            const next = spy();
            stream.onNext(next);
            stream.resume();
            await nextTick();
            stream.write(1);
            stream.write(2);
            stream.write(3);
            stream.push(4);
            stream.push(5);
            stream.push(6);
            expect(next).to.have.callCount(6);
            expect(next.getCall(0)).to.have.been.calledWithExactly(-1);
            expect(next.getCall(1)).to.have.been.calledWithExactly(-2);
            expect(next.getCall(2)).to.have.been.calledWithExactly(-3);
            expect(next.getCall(3)).to.have.been.calledWithExactly(4);
            expect(next.getCall(4)).to.have.been.calledWithExactly(5);
            expect(next.getCall(5)).to.have.been.calledWithExactly(6);
        });

        it("should call onError when transform function throws", async () => {
            const stream = new SyncTransform(((x) => {
                throw new Error(`cannot process ${x}`);
            }));
            const error = spy();
            stream.onError(error);
            stream.resume();
            await nextTick();
            stream.write(1);
            expect(error).to.have.been.calledOnce;
            const [err] = error.args[0];
            expect(err.message).to.be.equal("cannot process 1");
        });

        it("should emit onNext, not onError if push", async () => {
            const stream = new SyncTransform(((x) => {
                throw new Error(`cannot process ${x}`);
            }));
            const error = spy();
            const next = spy();
            stream.onError(error);
            stream.onNext(next);
            stream.resume();
            await nextTick();
            stream.push(1);
            expect(error).to.have.not.been.called;
            expect(next).to.have.been.calledOnce;
            expect(next).to.have.been.calledWithExactly(1);
        });

        it("should call onEnd on the next tick if stream ends immediately", async () => {
            const stream = new SyncTransform(passthrough);
            const end = spy();
            stream.onEnd(end);
            stream.end();
            expect(end).to.have.not.been.called;
            await nextTick();
            expect(end).to.have.been.calledOnce;
        });

        it("should not end stream if it has elements to emit", () => {
            const stream = new SyncTransform(passthrough);
            const end = spy();
            stream.push(1);
            stream.end();
            expect(end).to.have.not.been.called;
        });

        it("should schedule flush after resume and run them asynchronously", async () => {
            const flush = spy();
            const stream = new SyncTransform(passthrough, flush);
            stream.push(1);
            const [next, end] = [spy(), spy()];
            stream.onNext(next).onEnd(end).end().resume();
            expect(end).to.have.not.been.called;
            expect(flush).to.have.not.been.called;
            expect(next).to.have.not.been.called;
            await nextTick();
            expect(next).to.have.been.calledOnce;
            expect(next).to.have.been.calledWithExactly(1);
            expect(end).to.have.been.calledOnce;
            expect(flush).to.have.been.calledOnce;
            // next -> flush -> end
            expect(next).to.have.been.calledBefore(flush);
            expect(flush).to.have.been.calledBefore(end);
        });

        it("should correctly end resumed stream", async () => {
            const flush = spy();
            const stream = new SyncTransform(passthrough, flush);
            stream.write(1);
            const [next, end] = [spy(), spy()];
            stream.onNext(next).onEnd(end).resume();
            expect(next).to.have.not.been.called;
            expect(end).to.have.not.been.called;
            await nextTick();
            expect(next).to.have.been.calledOnce;
            expect(next.getCall(0)).to.have.been.calledWithExactly(1);
            expect(end).to.have.not.been.called;
            stream.write(2);
            expect(next).to.have.been.calledTwice;
            expect(next.getCall(1)).to.have.been.calledWithExactly(2);
            stream.end();
            expect(flush).to.have.not.been.called;
            expect(end).to.have.not.been.called; // flush is async
            await nextTick();
            expect(flush).to.have.been.calledOnce;
            expect(end).to.have.been.calledOnce;
            expect(flush).to.have.been.calledBefore(end);
        });

        it("should call flush function before onEnd", async () => {
            const flush = spy();
            const stream = new SyncTransform(passthrough, flush);
            const end = spy();
            stream.onEnd(end);
            stream.end();
            expect(end).to.have.not.been.called; // flush is always async
            await nextTick();
            expect(end).to.have.been.calledOnce;
            expect(flush).to.have.been.calledOnce;
            expect(flush).to.have.been.calledBefore(end);
        });

        it("should support async flush functions", async () => {
            const flush = spy();
            const _flush = async () => {
                await promise.delay(10);
                flush();
            };
            const stream = new SyncTransform(passthrough, _flush);
            const end = spy();
            stream.onEnd(end);
            stream.end();
            expect(end).to.have.not.been.called; // flush is async
            await end.waitForCall();
            expect(flush).to.have.been.calledOnce;
            expect(flush).to.have.been.calledBefore(end);
        });

        it("should support push while flushing", async () => {
            const flush = function () {
                this.push(123);
            };
            const stream = new SyncTransform(passthrough, flush);
            const end = spy();
            const next = spy();
            stream.onEnd(end).onNext(next);
            stream.resume();
            stream.end();
            expect(end).to.have.not.been.called;
            await end.waitForCall();
            expect(next).to.have.been.calledOnce;
            expect(next).to.have.been.calledWithExactly(123);
            expect(next).to.have.been.calledBefore(end);
        });

        it("should support push while async flushing", async () => {
            const flush = async function () {
                await promise.delay(10);
                this.push(123);
            };
            const stream = new SyncTransform(passthrough, flush);
            const end = spy();
            const next = spy();
            stream.onEnd(end).onNext(next);
            stream.resume();
            stream.end();
            expect(end).to.have.not.been.called;
            await end.waitForCall();
            expect(next).to.have.been.calledOnce;
            expect(next).to.have.been.calledWithExactly(123);
            expect(next).to.have.been.calledBefore(end);
        });

        it("should emit onError if flushing fails", async () => {
            const flush = function () {
                throw new Error("hello");
            };
            const stream = new SyncTransform(passthrough, flush);
            const error = spy();
            stream.onError(error);
            stream.end();
            expect(error).not.have.not.been.called; // flush is always async
            await nextTick();
            expect(error).to.have.been.calledOnce;
            const [err] = error.args[0];
            expect(err.message).to.be.equal("hello");
        });

        it("should emit onError if async flushing fails", async () => {
            const flush = async function () {
                await promise.delay(10);
                throw new Error("hello");
            };
            const stream = new SyncTransform(passthrough, flush);
            const error = spy();
            stream.onError(error);
            stream.end();
            expect(error).to.have.not.been.called; // async flushing
            await error.waitForCall();
            const [err] = error.args[0];
            expect(err.message).to.be.equal("hello");
        });

        it("should emit onEnd after onError if flushing fails", async () => {
            const flush = function () {
                throw new Error("hello");
            };
            const stream = new SyncTransform(passthrough, flush);
            const error = spy();
            const end = spy();
            stream.onEnd(end).onError(error);
            stream.end();
            expect(end).to.have.not.been.called; // flush always async
            expect(error).to.have.not.been.called; // flush always async
            await nextTick();
            expect(end).to.have.been.calledOnce;
            expect(error).to.have.been.calledOnce;
            // error -> end
            expect(end).to.have.been.calledAfter(error);
        });

        it("should emit onEnd after onError if async flushing fails", async () => {
            const flush = async function () {
                await promise.delay(10);
                throw new Error("hello");
            };
            const stream = new SyncTransform(passthrough, flush);
            const error = spy();
            const end = spy();
            stream.onEnd(end).onError(error);
            stream.end();
            expect(end).to.have.not.been.called; // async
            expect(error).to.have.not.been.called; // async
            await end.waitForCall();
            expect(error).to.have.been.calledOnce;
            expect(end).to.have.been.calledAfter(error);
        });

        it("should support push if flushing fails", async () => {
            const flush = function () {
                this.push(123);
                throw new Error("hello");
            };
            const stream = new SyncTransform(passthrough, flush);
            const error = spy();
            const next = spy();
            stream.onError(error).onNext(next).resume().end();
            expect(next).to.have.not.been.called; // nextTick resume, next must have not been called
            await nextTick();
            expect(error).to.have.been.calledOnce; // flush always async
            expect(next).to.have.been.calledOnce;
            expect(next).to.have.been.calledWithExactly(123);
            expect(error.args[0][0].message).to.be.equal("hello");
        });

        it("should support push if async flushing fails", async () => {
            const flush = async function () {
                await promise.delay(10);
                this.push(123);
                throw new Error("hello");
            };
            const stream = new SyncTransform(passthrough, flush);
            const error = spy();
            const next = spy();
            stream.onError(error).onNext(next).resume().end();
            expect(error).to.have.not.been.called; // async fail
            expect(next).to.have.not.been.called; // nextTick resume, next must have not been called
            await next.waitForCall();
            expect(next).to.have.been.calledWithExactly(123);
            expect(error).to.have.been.calledOnce;
            /**
             * at this moment stream is resumed,
             * the next element will be emitted immediately and only then the error
             */
            expect(next).to.have.been.calledBefore(error);
            const [err] = error.args[0];
            expect(err.message).to.be.equal("hello");
        });

        it("should emit onEnd after onNext when flushing fails", async () => {
            const flush = function () {
                this.push(123);
                throw new Error("hello");
            };
            const stream = new SyncTransform(passthrough, flush);
            const [end, next, error] = [spy(), spy(), spy()];
            stream.onEnd(end).onNext(next).onError(error).resume().end();
            expect(error).to.have.not.been.called; // flush always async
            expect(end).to.have.not.been.called; // has some elements to emit
            expect(next).to.have.not.been.called; // async resume
            await nextTick();
            expect(error).to.have.been.calledOnce;
            expect(error.args[0][0].message).to.be.equal("hello");
            expect(next).to.have.been.calledOnce;
            expect(end).to.have.been.calledOnce;
            // next -> error -> end
            expect(next).to.have.been.calledBefore(error);
            expect(error).to.have.been.calledBefore(end);
        });

        it("should emit onEnd after onNext when async flushing fails", async () => {
            const flush = async function () {
                await promise.delay(10);
                this.push(123);
                throw new Error("hello");
            };
            const stream = new SyncTransform(passthrough, flush);
            const [end, next, error] = [spy(), spy(), spy()];
            stream.onEnd(end).onNext(next).onError(error).resume().end();
            expect(error).to.have.not.been.called; // async fail
            expect(end).to.have.not.been.called; // has some elements to emit
            expect(next).to.have.not.been.called; // async resume
            await end.waitForCall();
            expect(error).to.have.been.calledOnce;
            expect(error.args[0][0].message).to.be.equal("hello");
            expect(next).to.have.been.calledOnce;
            // next -> error -> end
            expect(next).to.have.been.calledBefore(error);
            expect(error).to.have.been.calledBefore(end);
        });

        it("should emit onEnd after resume if flushing pushes values", async () => {
            const flush = function () {
                this.push(123);
            };
            const stream = new SyncTransform(passthrough, flush);
            const [next, end] = [spy(), spy()];
            stream.onNext(next).onEnd(end).end();
            expect(next).to.have.not.been.called; // paused
            expect(end).to.have.not.been.called;
            stream.resume();
            expect(next).to.have.not.been.called; // async resume
            expect(end).to.have.not.been.called;
            await nextTick();
            expect(next).to.have.been.calledOnce;
            expect(next).to.have.been.calledWithExactly(123);
            expect(end).to.have.been.calledOnce;
            expect(next).to.have.been.calledBefore(end);
        });

        it("should emit onEnd after resume if async flushing pushes values", async () => {
            const flush = async function () {
                await promise.delay(10);
                this.push(123);
            };
            const stream = new SyncTransform(passthrough, flush);
            const [next, end] = [spy(), spy()];
            stream.onNext(next).onEnd(end).end();
            expect(next).to.have.not.been.called; // paused
            expect(end).to.have.not.been.called;
            stream.resume();
            expect(next).to.have.not.been.called; // async resume
            expect(end).to.have.not.been.called;
            await end.waitForCall();
            expect(next).to.have.been.calledOnce;
            expect(next).to.have.been.calledWithExactly(123);
            expect(next).to.have.been.calledBefore(end);
        });

        it("should emit onEnd after resume if flushing pushes values and fails", async () => {
            const flush = function () {
                this.push(123);
                throw new Error("hello");
            };
            const stream = new SyncTransform(passthrough, flush);
            const [next, end, error] = [spy(), spy(), spy()];
            stream.onNext(next).onEnd(end).onError(error).end();
            expect(next).to.have.not.been.called; // paused
            expect(end).to.have.not.been.called;
            expect(error).to.have.not.been.called; // flush is called on the next tick
            stream.resume();
            expect(error).to.have.not.been.called;
            expect(next).to.have.not.been.called; // async resume
            expect(end).to.have.not.been.called;
            await nextTick();
            expect(error).to.have.been.calledOnce;
            expect(next).to.have.been.calledOnce;
            expect(next).to.have.been.calledWithExactly(123);
            expect(end).to.have.been.calledOnce;
            // next -> error -> end; flush is always scheduled after resume
            expect(next).to.have.been.calledBefore(error);
            expect(error).to.have.been.calledBefore(end);
        });

        it("should emit onEnd after resume if async flushing pushes values and fails", async () => {
            const flush = async function () {
                await promise.delay(10);
                this.push(123);
                throw new Error("hello");
            };
            const stream = new SyncTransform(passthrough, flush);
            const [next, end, error] = [spy(), spy(), spy()];
            stream.onNext(next).onEnd(end).onError(error).end();
            expect(next).to.have.not.been.called; // paused
            expect(end).to.have.not.been.called;
            expect(error).to.have.not.been.called; // async fail
            stream.resume();
            expect(error).to.have.not.been.called;
            expect(next).to.have.not.been.called; // async resume
            expect(end).to.have.not.been.called;
            await end.waitForCall();
            expect(error).to.have.been.calledOnce;
            expect(error.args[0][0].message).to.be.equal("hello");
            expect(next).to.have.been.calledOnce;
            expect(next).to.have.been.calledWithExactly(123);
            expect(end).to.have.been.calledOnce;
            // next -> error -> end
            expect(next).to.have.been.calledBefore(error);
            expect(error).to.have.been.calledBefore(end);
        });

        it("should correcly handle sequence of synchronous pause/resume", async () => {
            const stream = new SyncTransform(passthrough);
            const next = spy();
            stream.onNext(next);
            stream.push(1);
            stream.push(2);
            expect(next).to.have.not.been.called;
            stream.resume().pause();
            await promise.delay(10);
            expect(next).to.have.not.been.called;
            stream.resume().pause().resume().pause();
            await promise.delay(10);
            expect(next).to.have.not.been.called;
            stream.resume().pause().resume();
            await promise.delay(10);
            expect(next).to.have.been.calledTwice;
            expect(next.getCall(0)).to.have.been.calledWithExactly(1);
            expect(next.getCall(1)).to.have.been.calledWithExactly(2);
        });

        describe("destroy", () => {
            it("should disable onNext and initiate end for paused stream", async () => {
                const flush = spy();
                const stream = new SyncTransform(passthrough, flush);
                const end = spy();
                const next = spy();
                stream.onNext(next).onEnd(end);
                stream.push(1);
                stream.push(2);
                stream.destroy();
                expect(flush).to.have.not.been.called; // async flush
                expect(end).to.have.not.been.called;
                await nextTick();
                expect(flush).to.have.been.calledOnce;
                expect(end).to.have.been.calledOnce;
                expect(flush).to.have.been.calledBefore(end);
                expect(next).to.have.not.been.called;
            });

            it("should disable onNext and initiate end for resumed stream", async () => {
                const flush = spy();
                const stream = new SyncTransform(passthrough, flush);
                const end = spy();
                const next = spy();
                stream.onNext(next).onEnd(end).resume();
                await nextTick();
                stream.push(1);
                stream.push(2);
                stream.destroy();
                expect(flush).to.have.not.been.called; // async flush
                expect(end).to.have.not.been.called;
                await nextTick();
                expect(flush).to.have.been.calledOnce;
                expect(end).to.have.been.calledOnce;
                expect(flush).to.have.been.calledBefore(end);
                expect(next).to.have.been.calledTwice; // 2 pushes
            });

            it("should not emit elements and stop for ended stream if destoryed while flushing", async () => {
                const flush = spy();
                const _flush = async function () {
                    flush();
                    await promise.delay(100);
                    this.push(10);
                };
                const stream = new SyncTransform(passthrough, _flush);
                const [next, end] = [spy(), spy()];
                stream.onNext(next).onEnd(end).end();
                await flush.waitForCall();
                stream.destroy();
                await end.waitForCall();
                expect(next).to.have.not.been.called;
            });

            it("should not emit elements and stop for resumed stream if destoryed while flushing", async () => {
                const flush = spy();
                const _flush = async function () {
                    flush();
                    await promise.delay(100);
                    this.push(10);
                };
                const stream = new SyncTransform(passthrough, _flush);
                const [next, end] = [spy(), spy()];
                stream.onNext(next).onEnd(end).resume();
                await nextTick();
                stream.push(1);
                expect(next).to.have.been.calledOnce;
                stream.end();
                await flush.waitForCall();
                stream.destroy();
                await end.waitForCall();
                expect(next).to.have.been.calledOnce;
            });
        });

        describe("pipe", () => {
            it("should write output of the first stream to the next", async () => {
                const s1 = new SyncTransform(function (x) {
                    this.push(x + 1);
                });
                const s2 = new SyncTransform(function (x) {
                    this.push(x + 1);
                });
                s1.pipe(s2);
                s1.resume();
                s2.resume();
                s1.write(1);
                const next = spy();
                s2.onNext(next);
                await next.waitForCall();
                expect(next).to.have.been.calledWithExactly(3);
            });

            it("should end the second stream when the first ends", async () => {
                const flush1 = spy();
                const s1 = new SyncTransform(function (x) {
                    this.push(x + 1);
                }, flush1);
                const flush2 = spy();
                const s2 = new SyncTransform(function (x) {
                    this.push(x + 1);
                }, flush2);
                s1.pipe(s2);
                s1.resume();
                s2.resume();
                s1.write(1);
                const next = spy();
                s2.onNext(next);
                await next.waitForCall();
                expect(next).to.have.been.calledWithExactly(3);
                const end2 = spy();
                s2.onEnd(end2);
                s1.end();
                await end2.waitForCall();
                expect(flush1).to.have.been.calledOnce;
                expect(flush2).to.have.been.calledOnce;
                expect(flush2).to.have.been.calledAfter(flush1).and.calledBefore(end2);
            });
        });
    });

    describe("AsyncTransform", () => {
        // test everything that we have tested for sync streams, to be sure it works well

        it("should be paused by default", () => {
            const stream = new AsyncTransform(() => { });
            expect(stream.isPaused()).to.be.true;
        });

        it("should not emit elements when paused", async () => {
            const stream = new AsyncTransform(passthrough);
            const next = spy();
            stream.onNext(next);
            stream.write(1);
            stream.write(2);
            stream.write(3);
            stream.push(4);
            stream.push(5);
            stream.push(6);
            expect(next).to.have.not.been.called;
            await promise.delay(50);
            expect(next).to.have.not.been.called;
        });

        it("should emit elements after resume, but on the next tick and only after processing", async () => {
            const stream = new AsyncTransform(passthrough);
            const next = spy();
            stream.onNext(next);
            stream.write(1);
            stream.write(2);
            stream.write(3);
            stream.push(4);
            stream.push(5);
            stream.push(6);
            stream.resume();
            expect(next).to.have.not.been.called;
            await next.waitForNCalls(6);
            stream.write(7);
            await next.waitForCall();
            stream.push(8); // pushed element immediately goes to onNext
            expect(next).to.have.callCount(8);
        });

        it("should process values asynchronously", async () => {
            const stream = new AsyncTransform(function (x) {
                this.push(-x);
            });
            const next = spy();
            stream.onNext(next);
            stream.resume();
            await nextTick();
            stream.write(1);
            stream.write(2);
            stream.write(3);
            stream.push(4);
            stream.push(5);
            stream.push(6);
            expect(next).to.have.been.calledThrice; // pushes
            await next.waitForNCalls(3); // writes
            expect(next.getCall(0)).to.have.been.calledWithExactly(4);
            expect(next.getCall(1)).to.have.been.calledWithExactly(5);
            expect(next.getCall(2)).to.have.been.calledWithExactly(6);
            expect(next.getCall(3)).to.have.been.calledWithExactly(-1);
            expect(next.getCall(4)).to.have.been.calledWithExactly(-2);
            expect(next.getCall(5)).to.have.been.calledWithExactly(-3);
        });

        it("should call onError when transform function throws", async () => {
            const stream = new AsyncTransform(((x) => {
                throw new Error(`cannot process ${x}`);
            }));
            const error = spy();
            stream.onError(error);
            stream.resume();
            await nextTick();
            stream.write(1);
            expect(error).to.have.not.been.called; // async processing
            await error.waitForCall();
            const [err] = error.args[0];
            expect(err.message).to.be.equal("cannot process 1");
        });

        it("should emit onNext, not onError if push", async () => {
            const stream = new AsyncTransform(((x) => {
                throw new Error(`cannot process ${x}`);
            }));
            const error = spy();
            const next = spy();
            stream.onError(error);
            stream.onNext(next);
            stream.resume();
            await nextTick();
            stream.push(1);
            expect(error).to.have.not.been.called;
            expect(next).to.have.been.calledOnce;
            expect(next).to.have.been.calledWithExactly(1);
        });

        it("should call onEnd on the next tick if stream ends immediately", async () => {
            const stream = new AsyncTransform(passthrough);
            const end = spy();
            stream.onEnd(end);
            stream.end();
            expect(end).to.have.not.been.called;
            await nextTick();
            expect(end).to.have.been.calledOnce;
        });

        it("should not end stream if it has elements to emit", () => {
            const stream = new AsyncTransform(passthrough);
            const end = spy();
            stream.push(1);
            stream.end();
            expect(end).to.have.not.been.called;
        });

        it("should schedule flush after resume and run them asynchronously", async () => {
            const flush = spy();
            const stream = new AsyncTransform(passthrough, flush);
            stream.push(1);
            const [next, end] = [spy(), spy()];
            stream.onNext(next).onEnd(end).end().resume();
            expect(end).to.have.not.been.called;
            expect(flush).to.have.not.been.called;
            expect(next).to.have.not.been.called;
            await nextTick();
            expect(next).to.have.been.calledOnce;
            expect(next).to.have.been.calledWithExactly(1);
            expect(end).to.have.been.calledOnce;
            expect(flush).to.have.been.calledOnce;
            // next -> flush -> end
            expect(next).to.have.been.calledBefore(flush);
            expect(flush).to.have.been.calledBefore(end);
        });

        it("should correctly end resumed stream", async () => {
            const flush = spy();
            const stream = new AsyncTransform(passthrough, flush);
            stream.write(1);
            const [next, end] = [spy(), spy()];
            stream.onNext(next).onEnd(end).resume();
            expect(next).to.have.not.been.called;
            expect(end).to.have.not.been.called;
            await next.waitForCall();
            expect(next.getCall(0)).to.have.been.calledWithExactly(1);
            expect(end).to.have.not.been.called;
            stream.write(2);
            await next.waitForCall();
            expect(next.getCall(1)).to.have.been.calledWithExactly(2);
            stream.end();
            expect(flush).to.have.not.been.called;
            expect(end).to.have.not.been.called; // flush is async
            await nextTick();
            expect(flush).to.have.been.calledOnce;
            expect(end).to.have.been.calledOnce;
            expect(flush).to.have.been.calledBefore(end);
        });

        it("should call flush function before onEnd", async () => {
            const flush = spy();
            const stream = new AsyncTransform(passthrough, flush);
            const end = spy();
            stream.onEnd(end);
            stream.end();
            expect(end).to.have.not.been.called; // flush is always async
            await nextTick();
            expect(end).to.have.been.calledOnce;
            expect(flush).to.have.been.calledOnce;
            expect(flush).to.have.been.calledBefore(end);
        });

        it("should support async flush functions", async () => {
            const flush = spy();
            const _flush = async () => {
                await promise.delay(10);
                flush();
            };
            const stream = new AsyncTransform(passthrough, _flush);
            const end = spy();
            stream.onEnd(end);
            stream.end();
            expect(end).to.have.not.been.called; // flush is async
            await end.waitForCall();
            expect(flush).to.have.been.calledOnce;
            expect(flush).to.have.been.calledBefore(end);
        });

        it("should support push while flushing", async () => {
            const flush = function () {
                this.push(123);
            };
            const stream = new AsyncTransform(passthrough, flush);
            const end = spy();
            const next = spy();
            stream.onEnd(end).onNext(next);
            stream.resume();
            stream.end();
            expect(end).to.have.not.been.called;
            await end.waitForCall();
            expect(next).to.have.been.calledOnce;
            expect(next).to.have.been.calledWithExactly(123);
            expect(next).to.have.been.calledBefore(end);
        });

        it("should support push while async flushing", async () => {
            const flush = async function () {
                await promise.delay(10);
                this.push(123);
            };
            const stream = new AsyncTransform(passthrough, flush);
            const end = spy();
            const next = spy();
            stream.onEnd(end).onNext(next);
            stream.resume();
            stream.end();
            expect(end).to.have.not.been.called;
            await end.waitForCall();
            expect(next).to.have.been.calledOnce;
            expect(next).to.have.been.calledWithExactly(123);
            expect(next).to.have.been.calledBefore(end);
        });

        it("should emit onError if flushing fails", async () => {
            const flush = function () {
                throw new Error("hello");
            };
            const stream = new AsyncTransform(passthrough, flush);
            const error = spy();
            stream.onError(error);
            stream.end();
            expect(error).not.have.not.been.called; // flush is always async
            await nextTick();
            expect(error).to.have.been.calledOnce;
            const [err] = error.args[0];
            expect(err.message).to.be.equal("hello");
        });

        it("should emit onError if async flushing fails", async () => {
            const flush = async function () {
                await promise.delay(10);
                throw new Error("hello");
            };
            const stream = new AsyncTransform(passthrough, flush);
            const error = spy();
            stream.onError(error);
            stream.end();
            expect(error).to.have.not.been.called; // async flushing
            await error.waitForCall();
            const [err] = error.args[0];
            expect(err.message).to.be.equal("hello");
        });

        it("should emit onEnd after onError if flushing fails", async () => {
            const flush = function () {
                throw new Error("hello");
            };
            const stream = new AsyncTransform(passthrough, flush);
            const error = spy();
            const end = spy();
            stream.onEnd(end).onError(error);
            stream.end();
            expect(end).to.have.not.been.called; // flush always async
            expect(error).to.have.not.been.called; // flush always async
            await nextTick();
            expect(end).to.have.been.calledOnce;
            expect(error).to.have.been.calledOnce;
            // error -> end
            expect(end).to.have.been.calledAfter(error);
        });

        it("should emit onEnd after onError if async flushing fails", async () => {
            const flush = async function () {
                await promise.delay(10);
                throw new Error("hello");
            };
            const stream = new AsyncTransform(passthrough, flush);
            const error = spy();
            const end = spy();
            stream.onEnd(end).onError(error);
            stream.end();
            expect(end).to.have.not.been.called; // async
            expect(error).to.have.not.been.called; // async
            await end.waitForCall();
            expect(error).to.have.been.calledOnce;
            expect(end).to.have.been.calledAfter(error);
        });

        it("should support push if flushing fails", async () => {
            const flush = function () {
                this.push(123);
                throw new Error("hello");
            };
            const stream = new AsyncTransform(passthrough, flush);
            const error = spy();
            const next = spy();
            stream.onError(error).onNext(next).resume().end();
            expect(next).to.have.not.been.called; // nextTick resume, next must have not been called
            await nextTick();
            expect(error).to.have.been.calledOnce; // flush always async
            expect(next).to.have.been.calledOnce;
            expect(next).to.have.been.calledWithExactly(123);
            expect(error.args[0][0].message).to.be.equal("hello");
        });

        it("should support push if async flushing fails", async () => {
            const flush = async function () {
                await promise.delay(10);
                this.push(123);
                throw new Error("hello");
            };
            const stream = new AsyncTransform(passthrough, flush);
            const error = spy();
            const next = spy();
            stream.onError(error).onNext(next).resume().end();
            expect(error).to.have.not.been.called; // async fail
            expect(next).to.have.not.been.called; // nextTick resume, next must have not been called
            await next.waitForCall();
            expect(next).to.have.been.calledWithExactly(123);
            expect(error).to.have.been.calledOnce;
            /**
             * at this moment stream is resumed,
             * the next element will be emitted immediately and only then the error
             */
            expect(next).to.have.been.calledBefore(error);
            const [err] = error.args[0];
            expect(err.message).to.be.equal("hello");
        });

        it("should emit onEnd after onNext when flushing fails", async () => {
            const flush = function () {
                this.push(123);
                throw new Error("hello");
            };
            const stream = new AsyncTransform(passthrough, flush);
            const [end, next, error] = [spy(), spy(), spy()];
            stream.onEnd(end).onNext(next).onError(error).resume().end();
            expect(error).to.have.not.been.called; // flush always async
            expect(end).to.have.not.been.called; // has some elements to emit
            expect(next).to.have.not.been.called; // async resume
            await nextTick();
            expect(error).to.have.been.calledOnce;
            expect(error.args[0][0].message).to.be.equal("hello");
            expect(next).to.have.been.calledOnce;
            expect(end).to.have.been.calledOnce;
            // next -> error -> end
            expect(next).to.have.been.calledBefore(error);
            expect(error).to.have.been.calledBefore(end);
        });

        it("should emit onEnd after onNext when async flushing fails", async () => {
            const flush = async function () {
                await promise.delay(10);
                this.push(123);
                throw new Error("hello");
            };
            const stream = new AsyncTransform(passthrough, flush);
            const [end, next, error] = [spy(), spy(), spy()];
            stream.onEnd(end).onNext(next).onError(error).resume().end();
            expect(error).to.have.not.been.called; // async fail
            expect(end).to.have.not.been.called; // has some elements to emit
            expect(next).to.have.not.been.called; // async resume
            await end.waitForCall();
            expect(error).to.have.been.calledOnce;
            expect(error.args[0][0].message).to.be.equal("hello");
            expect(next).to.have.been.calledOnce;
            // next -> error -> end
            expect(next).to.have.been.calledBefore(error);
            expect(error).to.have.been.calledBefore(end);
        });

        it("should emit onEnd after resume if flushing pushes values", async () => {
            const flush = function () {
                this.push(123);
            };
            const stream = new AsyncTransform(passthrough, flush);
            const [next, end] = [spy(), spy()];
            stream.onNext(next).onEnd(end).end();
            expect(next).to.have.not.been.called; // paused
            expect(end).to.have.not.been.called;
            stream.resume();
            expect(next).to.have.not.been.called; // async resume
            expect(end).to.have.not.been.called;
            await nextTick();
            expect(next).to.have.been.calledOnce;
            expect(next).to.have.been.calledWithExactly(123);
            expect(end).to.have.been.calledOnce;
            expect(next).to.have.been.calledBefore(end);
        });

        it("should emit onEnd after resume if async flushing pushes values", async () => {
            const flush = async function () {
                await promise.delay(10);
                this.push(123);
            };
            const stream = new AsyncTransform(passthrough, flush);
            const [next, end] = [spy(), spy()];
            stream.onNext(next).onEnd(end).end();
            expect(next).to.have.not.been.called; // paused
            expect(end).to.have.not.been.called;
            stream.resume();
            expect(next).to.have.not.been.called; // async resume
            expect(end).to.have.not.been.called;
            await end.waitForCall();
            expect(next).to.have.been.calledOnce;
            expect(next).to.have.been.calledWithExactly(123);
            expect(next).to.have.been.calledBefore(end);
        });

        it("should emit onEnd after resume if flushing pushes values and fails", async () => {
            const flush = function () {
                this.push(123);
                throw new Error("hello");
            };
            const stream = new AsyncTransform(passthrough, flush);
            const [next, end, error] = [spy(), spy(), spy()];
            stream.onNext(next).onEnd(end).onError(error).end();
            expect(next).to.have.not.been.called; // paused
            expect(end).to.have.not.been.called;
            expect(error).to.have.not.been.called; // flush is called on the next tick
            stream.resume();
            expect(error).to.have.not.been.called;
            expect(next).to.have.not.been.called; // async resume
            expect(end).to.have.not.been.called;
            await nextTick();
            expect(error).to.have.been.calledOnce;
            expect(next).to.have.been.calledOnce;
            expect(next).to.have.been.calledWithExactly(123);
            expect(end).to.have.been.calledOnce;
            // next -> error -> end; flush is always scheduled after resume
            expect(next).to.have.been.calledBefore(error);
            expect(error).to.have.been.calledBefore(end);
        });

        it("should emit onEnd after resume if async flushing pushes values and fails", async () => {
            const flush = async function () {
                await promise.delay(10);
                this.push(123);
                throw new Error("hello");
            };
            const stream = new AsyncTransform(passthrough, flush);
            const [next, end, error] = [spy(), spy(), spy()];
            stream.onNext(next).onEnd(end).onError(error).end();
            expect(next).to.have.not.been.called; // paused
            expect(end).to.have.not.been.called;
            expect(error).to.have.not.been.called; // async fail
            stream.resume();
            expect(error).to.have.not.been.called;
            expect(next).to.have.not.been.called; // async resume
            expect(end).to.have.not.been.called;
            await end.waitForCall();
            expect(error).to.have.been.calledOnce;
            expect(error.args[0][0].message).to.be.equal("hello");
            expect(next).to.have.been.calledOnce;
            expect(next).to.have.been.calledWithExactly(123);
            expect(end).to.have.been.calledOnce;
            // next -> error -> end
            expect(next).to.have.been.calledBefore(error);
            expect(error).to.have.been.calledBefore(end);
        });

        it("should correcly handle sequence of synchronous pause/resume", async () => {
            const stream = new AsyncTransform(passthrough);
            const next = spy();
            stream.onNext(next);
            stream.push(1);
            stream.push(2);
            expect(next).to.have.not.been.called;
            stream.resume().pause();
            await promise.delay(10);
            expect(next).to.have.not.been.called;
            stream.resume().pause().resume().pause();
            await promise.delay(10);
            expect(next).to.have.not.been.called;
            stream.resume().pause().resume();
            await promise.delay(10);
            expect(next).to.have.been.calledTwice;
            expect(next.getCall(0)).to.have.been.calledWithExactly(1);
            expect(next.getCall(1)).to.have.been.calledWithExactly(2);
        });

        describe("destroy", () => {
            it("should disable onNext and initiate end for paused stream", async () => {
                const flush = spy();
                const stream = new AsyncTransform(passthrough, flush);
                const end = spy();
                const next = spy();
                stream.onNext(next).onEnd(end);
                stream.push(1);
                stream.push(2);
                stream.destroy();
                expect(flush).to.have.not.been.called; // async flush
                expect(end).to.have.not.been.called;
                await nextTick();
                expect(flush).to.have.been.calledOnce;
                expect(end).to.have.been.calledOnce;
                expect(flush).to.have.been.calledBefore(end);
                expect(next).to.have.not.been.called;
            });

            it("should disable onNext and initiate end for resumed stream", async () => {
                const flush = spy();
                const stream = new AsyncTransform(passthrough, flush);
                const end = spy();
                const next = spy();
                stream.onNext(next).onEnd(end).resume();
                await nextTick();
                stream.push(1);
                stream.push(2);
                stream.destroy();
                expect(flush).to.have.not.been.called; // async flush
                expect(end).to.have.not.been.called;
                await nextTick();
                expect(flush).to.have.been.calledOnce;
                expect(end).to.have.been.calledOnce;
                expect(flush).to.have.been.calledBefore(end);
                expect(next).to.have.been.calledTwice; // 2 pushes
            });

            it("should stop processing if destoryed, not emit processed element but wait", async () => {
                const flush = spy();
                const processed = spy();
                const afterLastPush = spy();
                const stream = new AsyncTransform(async function (x) {
                    processed(x);
                    await promise.delay(100);
                    this.push(-x);
                    if (x === 2) {
                        afterLastPush();
                    }
                }, flush);
                const end = spy();
                const next = spy();
                stream.onNext(next).onEnd(end).resume();
                await nextTick();
                stream.write(1);
                stream.write(2);
                stream.write(3);
                await next.waitForCall(); // -1
                await promise.delay(10);
                stream.destroy(); // destroy while processing, 2 must not be emitted, 3 must not be processed at all
                expect(flush).to.have.not.been.called; // async flush
                expect(end).to.have.not.been.called;
                await end.waitForCall();
                expect(flush).to.have.been.calledOnce;
                expect(end).to.have.been.calledOnce;
                expect(flush).to.have.been.calledBefore(end);
                expect(next).to.have.been.calledOnce;
                expect(next).to.have.been.calledWithExactly(-1);
                expect(afterLastPush).to.have.been.calledOnce;
                expect(afterLastPush).to.have.been.calledBefore(flush);
                expect(processed).to.have.been.calledTwice;
                expect(processed.getCall(0)).to.have.been.calledWithExactly(1);
                expect(processed.getCall(1)).to.have.been.calledWithExactly(2);
            });

            it("should not emit elements and stop for ended stream if destoryed while flushing", async () => {
                const flush = spy();
                const _flush = async function () {
                    flush();
                    await promise.delay(100);
                    this.push(10);
                };
                const stream = new AsyncTransform(passthrough, _flush);
                const [next, end] = [spy(), spy()];
                stream.onNext(next).onEnd(end).end();
                await flush.waitForCall();
                stream.destroy();
                await end.waitForCall();
                expect(next).to.have.not.been.called;
            });

            it("should not emit elements and stop for resumed stream if destoryed while flushing", async () => {
                const flush = spy();
                const _flush = async function () {
                    flush();
                    await promise.delay(100);
                    this.push(10);
                };
                const stream = new AsyncTransform(passthrough, _flush);
                const [next, end] = [spy(), spy()];
                stream.onNext(next).onEnd(end).resume();
                await nextTick();
                stream.push(1);
                expect(next).to.have.been.calledOnce;
                stream.end();
                await flush.waitForCall();
                stream.destroy();
                await end.waitForCall();
                expect(next).to.have.been.calledOnce;
            });
        });

        describe("pipe", () => {
            it("should write output of the first stream to the next", async () => {
                const s1 = new SyncTransform(function (x) {
                    this.push(x + 1);
                });
                const s2 = new SyncTransform(function (x) {
                    this.push(x + 1);
                });
                s1.pipe(s2);
                s1.resume();
                s2.resume();
                s1.write(1);
                const next = spy();
                s2.onNext(next);
                await next.waitForCall();
                expect(next).to.have.been.calledWithExactly(3);
            });

            it("should end the second stream when the first ends", async () => {
                const flush1 = spy();
                const s1 = new SyncTransform(function (x) {
                    this.push(x + 1);
                }, flush1);
                const flush2 = spy();
                const s2 = new SyncTransform(function (x) {
                    this.push(x + 1);
                }, flush2);
                s1.pipe(s2);
                s1.resume();
                s2.resume();
                s1.write(1);
                const next = spy();
                s2.onNext(next);
                await next.waitForCall();
                expect(next).to.have.been.calledWithExactly(3);
                const end2 = spy();
                s2.onEnd(end2);
                s1.end();
                await end2.waitForCall();
                expect(flush1).to.have.been.calledOnce;
                expect(flush2).to.have.been.calledOnce;
                expect(flush2).to.have.been.calledAfter(flush1).and.calledBefore(end2);
            });
        });
    });

    describe("CoreStream", () => {
        it("should create a passthrough stream", async () => {
            const stream = core();
            const data = spy();
            const end = spy();
            stream.on("data", data).once("end", end);
            stream.write(1);
            expect(data).to.have.not.been.called; // paused by default
            stream.resume();
            await nextTick();
            expect(data).to.have.been.calledOnce;
            expect(data).to.have.been.calledWithExactly(1);
            stream.end();
            expect(end).to.have.not.been.called; // async
            await nextTick();
            expect(end).to.have.been.called;
        });

        it("should create a passthrough stream with flush function", async () => {
            const flush = spy();
            const stream = core(null, { flush });
            const data = spy();
            const end = spy();
            stream.on("data", data).once("end", end);
            stream.write(1);
            expect(data).to.have.not.been.called; // paused by default
            stream.resume();
            await nextTick();
            expect(data).to.have.been.calledOnce;
            expect(data).to.have.been.calledWithExactly(1);
            stream.end();
            expect(end).to.have.not.been.called; // async
            await nextTick();
            expect(end).to.have.been.calledOnce;
            expect(flush).to.have.been.calledOnce;
            expect(flush).to.have.been.calledBefore(end);
        });

        it("should create a synchronous transform", async () => {
            const flush = spy();
            const stream = core(null, {
                transform(x) {
                    this.push(-x);
                },
                flush
            });
            stream.push(1);
            stream.write(-2);
            const [data, end] = [spy(), spy()];
            stream.on("data", data).once("end", end).resume();
            await nextTick();
            expect(data).to.have.been.calledTwice;
            expect(data.getCall(0)).to.have.been.calledWithExactly(1);
            expect(data.getCall(1)).to.have.been.calledWithExactly(2);
            expect(end).to.have.not.been.called;
            stream.write(3);
            expect(data).to.have.been.calledThrice;
            expect(data.getCall(2)).to.have.been.calledWithExactly(-3);
            stream.end();
            await end.waitForCall();
            expect(flush).to.have.been.calledOnce;
            expect(flush).to.have.been.calledBefore(end);
        });

        it("should create an asynchronous transform", async () => {
            const flush = spy();
            const stream = core(null, {
                async transform(x) {
                    await promise.delay(10);
                    this.push(-x);
                },
                flush
            });
            stream.push(1);
            stream.write(-2);
            const [data, end] = [spy(), spy()];
            stream.on("data", data).once("end", end).resume();
            await data.waitForNCalls(2);
            expect(data.getCall(0)).to.have.been.calledWithExactly(1);
            expect(data.getCall(1)).to.have.been.calledWithExactly(2);
            expect(end).to.have.not.been.called;
            stream.write(3);
            expect(data).to.have.been.calledTwice;
            await data.waitForCall();
            expect(data.getCall(2)).to.have.been.calledWithExactly(-3);
            stream.end();
            await end.waitForCall();
            expect(flush).to.have.been.calledOnce;
            expect(flush).to.have.been.calledBefore(end);
        });

        it("should not emit data events while paused", async () => {
            const stream = core();
            const data = spy();
            stream.on("data", data);
            stream.write(1);
            stream.write(2);
            stream.write(3);
            stream.push(4);
            stream.push(5);
            stream.push(6);
            expect(data).to.have.not.been.called;
            await promise.delay(100);
            expect(data).to.have.not.been.called;
        });

        it("should emit data after resume, but on the next tick", async () => {
            const stream = core();
            const data = spy();
            stream.on("data", data);
            stream.write(1);
            stream.write(2);
            stream.write(3);
            stream.push(4);
            stream.push(5);
            stream.push(6);
            stream.resume();
            expect(data).to.have.not.been.called;
            await nextTick();
            expect(data).to.have.callCount(6);
        });

        it("should pause stream", async () => {
            const stream = core();
            const data = spy();
            stream.on("data", data);
            stream.resume();
            stream.push(1);
            expect(data).to.have.not.been.called;
            await nextTick();
            expect(data).to.have.been.calledOnce;
            stream.pause();
            stream.push(1);
            expect(data).to.have.been.calledOnce;
            await promise.delay(10);
            expect(data).to.have.been.calledOnce;
            stream.resume();
            expect(data).to.have.been.calledOnce;
            await nextTick();
            expect(data).to.have.been.calledTwice;
        });

        it("should create stream from array", async () => {
            const stream = core([1, 2, 3, 4, 5]);
            const [data, end] = [spy(), spy()];
            stream.on("data", data).once("end", end);
            expect(data).to.have.not.been.called;
            await promise.delay(100);
            expect(data).to.have.not.been.called;
            stream.resume();
            await nextTick();
            expect(data).to.have.callCount(5);
            for (let i = 0; i < 5; ++i) {
                expect(data.getCall(i)).to.have.been.calledWithExactly(i + 1);
            }
            expect(end).to.have.been.calledOnce;
        });

        describe("api", () => {
            describe("throughSync", () => {
                it("should add a synchronous transform", async () => {
                    const a = core();
                    a.throughSync(function (x) {
                        this.push(x + 1);
                    });
                    const data = spy();
                    a.on("data", data);
                    a.resume();
                    await nextTick();
                    a.write(1);
                    expect(data).to.have.been.calledOnce;
                    expect(data).to.have.been.calledWithExactly(2);
                });

                it("should call flush function before end", async () => {
                    const a = core();
                    const flush = spy();
                    a.throughSync(function (x) {
                        this.push(x + 1);
                    }, flush);
                    const end = spy();
                    a.on("end", end);
                    a.end();
                    expect(flush).to.have.not.been.called;
                    expect(end).to.have.not.been.called;
                    await end.waitForCall();
                    expect(flush).to.have.been.calledOnce;
                    expect(flush).to.have.been.calledBefore(end);
                });

                it("should catch errors and not end the stream", async () => {
                    const a = core();
                    a.throughSync(function (x) {
                        if (x === 1) {
                            throw new Error("hello");
                        } else {
                            this.push(x);
                        }
                    });
                    a.resume();
                    await nextTick();
                    const [data, error, end] = [spy(), spy(), spy()];
                    a.on("data", data).on("error", error).on("end", end);
                    a.write(1);
                    expect(error).to.have.been.calledOnce;
                    expect(end).to.have.not.been.called;
                    expect(data).to.have.not.been.called;
                    a.write(2);
                    expect(error).to.have.been.calledOnce;
                    expect(end).to.have.not.been.called;
                    expect(data).to.have.been.calledOnce;
                    a.write(1);
                    expect(error).to.have.been.calledTwice;
                    expect(end).to.have.not.been.called;
                    expect(data).to.have.been.calledOnce;
                    a.end();
                    await end.waitForCall();
                });

                it("should catch error inside flush function", async () => {
                    const a = core();
                    a.throughSync(passthrough, () => {
                        throw new Error("hello");
                    });
                    a.resume();
                    await nextTick();
                    const [error, end] = [spy(), spy()];
                    a.on("error", error).on("end", end);
                    a.end();
                    await end.waitForCall();
                    expect(error).to.have.been.calledOnce;
                    expect(error).to.have.been.calledBefore(end);
                });

                it("should catch transform errors in multiple consequent transforms", async () => {
                    const a = core();
                    const [f1, f2, f3] = [spy(), spy(), spy()];
                    const t1 = stub().callsFake(function (x) {
                        if (x === 1) {
                            throw new Error();
                        }
                        this.push(x + 1);
                    });
                    const t2 = stub().callsFake(function (x) {
                        if (x === 1) {
                            throw new Error();
                        }
                        this.push(x + 1);
                    });
                    const t3 = stub().callsFake(function (x) {
                        if (x === 1) {
                            throw new Error();
                        }
                        this.push(x + 1);
                    });
                    a
                        .throughSync(t1, f1)
                        .throughSync(t2, f2)
                        .throughSync(t3, f3)
                        .resume();
                    await nextTick();
                    const [data, error, end] = [spy(), spy(), spy()];
                    a.on("data", data).on("error", error).on("end", end);
                    a.write(1);
                    a.write(2);
                    a.write(0);
                    a.write(3);
                    a.write(-1);
                    a.write(4);
                    a.end();
                    await end.waitForCall();
                    expect(error).to.have.been.calledThrice;

                    expect(data).to.have.been.calledThrice;
                    expect(data.getCall(0)).to.have.been.calledWithExactly(5);
                    expect(data.getCall(1)).to.have.been.calledWithExactly(6);
                    expect(data.getCall(2)).to.have.been.calledWithExactly(7);

                    expect(f1).to.have.been.calledBefore(f2);
                    expect(f2).to.have.been.calledBefore(f3);
                    expect(f3).to.have.been.calledBefore(end);
                });

                it("should catch flush errors in multiple consequent transforms", async () => {
                    const a = core();
                    const flush1 = stub().throws(new Error("hello"));
                    const flush2 = stub().throws(new Error("hello"));
                    a
                        .throughSync(passthrough, flush1)
                        .throughSync(passthrough)
                        .throughSync(passthrough, flush2)
                        .resume();
                    await nextTick();
                    const [error, end] = [spy(), spy()];
                    a.on("error", error).on("end", end);
                    a.end();
                    await end.waitForCall();
                    expect(error).to.have.been.calledTwice;
                    expect(flush1).to.have.been.calledBefore(flush2);
                    expect(flush2).to.have.been.calledBefore(end);
                });

                it("should return self", () => {
                    const a = core();
                    expect(a.throughSync(passthrough)).to.be.equal(a);
                });

                it("should chain multiple transforms", async () => {
                    const [f1, f2, f3] = [spy(), spy(), spy()];
                    const a = core().throughSync(function (x) {
                        this.push(x + 1);
                    }, f1).throughSync(function (x) {
                        this.push(x + 2);
                    }, f2).throughSync(function (x) {
                        this.push(x * 2);
                    }, f3);
                    a.resume();
                    await nextTick();
                    const [data, end] = [spy(), spy()];
                    a.on("data", data).once("end", end);
                    a.write(1);
                    expect(data).to.have.been.calledOnce;
                    expect(data).to.have.been.calledWithExactly(8);
                    expect(f1).to.have.not.been.called;
                    expect(f2).to.have.not.been.called;
                    expect(f3).to.have.not.been.called;
                    a.end();
                    await end.waitForCall();
                    // f1 -> f2 -> f3 -> end
                    expect(f1).to.have.been.calledBefore(f2);
                    expect(f2).to.have.been.calledBefore(f3);
                    expect(f3).to.have.been.calledBefore(end);
                });
            });

            describe("throughAsync", () => {
                it("should add an asynchronous transform", async () => {
                    const a = core();
                    a.throughAsync(async function (x) {
                        this.push(x + 1);
                    });
                    const data = spy();
                    a.on("data", data);
                    a.resume();
                    await nextTick();
                    a.write(1);
                    expect(data).to.have.not.been.called;
                    await data.waitForCall();
                    expect(data).to.have.been.calledWithExactly(2);
                });

                it("should call flush function before end", async () => {
                    const a = core();
                    const flush = spy();
                    a.throughAsync(async function (x) {
                        this.push(x + 1);
                    }, flush);
                    const end = spy();
                    a.on("end", end);
                    a.end();
                    expect(flush).to.have.not.been.called;
                    expect(end).to.have.not.been.called;
                    await end.waitForCall();
                    expect(flush).to.have.been.calledOnce;
                    expect(flush).to.have.been.calledBefore(end);
                });

                it("should catch errors and not end the stream", async () => {
                    const a = core();
                    a.throughAsync(async function (x) {
                        if (x === 1) {
                            throw new Error("hello");
                        } else {
                            this.push(x);
                        }
                    });
                    a.resume();
                    await nextTick();
                    const [data, error, end] = [spy(), spy(), spy()];
                    a.on("data", data).on("error", error).on("end", end);
                    a.write(1);
                    expect(error).to.have.not.been.called;
                    await error.waitForCall();
                    expect(end).to.have.not.been.called;
                    expect(data).to.have.not.been.called;
                    a.write(2);
                    await data.waitForCall();
                    expect(error).to.have.been.calledOnce;
                    expect(end).to.have.not.been.called;
                    a.write(1);
                    await error.waitForCall();
                    expect(end).to.have.not.been.called;
                    expect(data).to.have.been.calledOnce;
                    a.end();
                    await end.waitForCall();
                });

                it("should catch error inside flush function", async () => {
                    const a = core();
                    a.throughAsync(passthrough, () => {
                        throw new Error("hello");
                    });
                    a.resume();
                    await nextTick();
                    const [error, end] = [spy(), spy()];
                    a.on("error", error).on("end", end);
                    a.end();
                    await end.waitForCall();
                    expect(error).to.have.been.calledOnce;
                    expect(error).to.have.been.calledBefore(end);
                });

                it("should catch transform errors in multiple consequent transforms", async () => {
                    const a = core();
                    const [f1, f2, f3] = [spy(), spy(), spy()];
                    const t1 = stub().callsFake(async function (x) {
                        await promise.delay(10);
                        if (x === 1) {
                            throw new Error();
                        }
                        this.push(x + 1);
                    });
                    const t2 = stub().callsFake(async function (x) {
                        await promise.delay(10);
                        if (x === 1) {
                            throw new Error();
                        }
                        this.push(x + 1);
                    });
                    const t3 = stub().callsFake(async function (x) {
                        await promise.delay(10);
                        if (x === 1) {
                            throw new Error();
                        }
                        this.push(x + 1);
                    });
                    a
                        .throughAsync(t1, f1)
                        .throughAsync(t2, f2)
                        .throughAsync(t3, f3)
                        .resume();
                    await nextTick();
                    const [data, error, end] = [spy(), spy(), spy()];
                    a.on("data", data).on("error", error).on("end", end);
                    a.write(1);
                    a.write(2);
                    a.write(0);
                    a.write(3);
                    a.write(-1);
                    a.write(4);
                    a.end();
                    await end.waitForCall();
                    expect(error).to.have.been.calledThrice;

                    expect(data).to.have.been.calledThrice;
                    expect(data.getCall(0)).to.have.been.calledWithExactly(5);
                    expect(data.getCall(1)).to.have.been.calledWithExactly(6);
                    expect(data.getCall(2)).to.have.been.calledWithExactly(7);

                    expect(f1).to.have.been.calledBefore(f2);
                    expect(f2).to.have.been.calledBefore(f3);
                    expect(f3).to.have.been.calledBefore(end);
                });

                it("should catch flush errors in multiple consequent transforms", async () => {
                    const a = core();
                    const flush1 = stub().throws(new Error("hello"));
                    const flush2 = stub().throws(new Error("hello"));
                    a
                        .throughAsync(passthrough, flush1)
                        .throughAsync(passthrough)
                        .throughAsync(passthrough, flush2)
                        .resume();
                    await nextTick();
                    const [error, end] = [spy(), spy()];
                    a.on("error", error).on("end", end);
                    a.end();
                    await end.waitForCall();
                    expect(error).to.have.been.calledTwice;
                    expect(flush1).to.have.been.calledBefore(flush2);
                    expect(flush2).to.have.been.calledBefore(end);
                });

                it("should return self", () => {
                    const a = core();
                    expect(a.throughAsync(passthrough)).to.be.equal(a);
                });

                it("should chain multiple transforms", async () => {
                    const [f1, f2, f3] = [spy(), spy(), spy()];
                    const a = core().throughSync(async function (x) {
                        await promise.delay(10);
                        this.push(x + 1);
                    }, f1).throughSync(async function (x) {
                        await promise.delay(10);
                        this.push(x + 2);
                    }, f2).throughSync(async function (x) {
                        await promise.delay(10);
                        this.push(x * 2);
                    }, f3);
                    a.resume();
                    await nextTick();
                    const [data, end] = [spy(), spy()];
                    a.on("data", data).once("end", end);
                    a.write(1);
                    expect(data).to.have.not.been.called;
                    await data.waitForCall();
                    expect(data).to.have.been.calledWithExactly(8);
                    expect(f1).to.have.not.been.called;
                    expect(f2).to.have.not.been.called;
                    expect(f3).to.have.not.been.called;
                    a.end();
                    await end.waitForCall();
                    // f1 -> f2 -> f3 -> end
                    expect(f1).to.have.been.calledBefore(f2);
                    expect(f2).to.have.been.calledBefore(f3);
                    expect(f3).to.have.been.calledBefore(end);
                });
            });

            describe("through", () => {
                it("should create async transform if transform is async function", async () => {
                    const a = core();
                    const flush = spy();
                    a.through(async function (x) {
                        await promise.delay(10);
                        this.push(x + 1);
                    }, flush);
                    a.resume();
                    await nextTick();
                    const [data, end] = [spy(), spy()];
                    a.on("data", data).once("end", end);
                    a.write(1);
                    a.end();
                    expect(data).to.have.not.been.called;
                    await data.waitForCall();
                    expect(data).to.have.been.calledWithExactly(2);
                    await end.waitForCall();
                    expect(data).to.have.been.calledBefore(flush);
                    expect(flush).to.have.been.calledBefore(end);
                });

                it("should create sync transform if transform is sync function", async () => {
                    const a = core();
                    const flush = spy();
                    a.through(function (x) {
                        this.push(x + 1);
                    }, flush);
                    a.resume();
                    await nextTick();
                    const [data, end] = [spy(), spy()];
                    a.on("data", data).once("end", end);
                    a.write(1);
                    a.end();
                    expect(data).to.have.been.calledOnce;
                    expect(data).to.have.been.calledWithExactly(2);
                    expect(end).to.have.not.been.called;
                    await end.waitForCall();
                    expect(data).to.have.been.calledBefore(flush);
                    expect(flush).to.have.been.calledBefore(end);
                });

                it("should return itself", () => {
                    const a = core();
                    expect(a.through(async () => { })).to.be.equal(a);
                    expect(a.through(() => { })).to.be.equal(a);
                });
            });

            describe("forEach", () => {
                it("should return itself", () => {
                    const a = core();
                    expect(a.forEach(noop)).to.be.equal(a);
                });

                it("should call callback on each element", async () => {
                    const cb = spy();
                    core([1, 2, 3, 4, 5]).forEach(cb).resume();
                    await cb.waitForNCalls(5);
                    for (let i = 0; i < 5; ++i) {
                        expect(cb.getCall(i)).to.have.been.calledWithExactly(i + 1);
                    }
                });

                it("should resume stream", async () => {
                    const cb = spy();
                    const c = core([1, 2, 3, 4, 5]).forEach(cb);
                    const end = spy();
                    c.once("end", end);
                    await end.waitForCall();
                    expect(cb).to.have.callCount(5);
                    for (let i = 0; i < 5; ++i) {
                        expect(cb.getCall(i)).to.have.been.calledWithExactly(i + 1);
                    }
                });

                it("should not passthrough elements", async () => {
                    const cb = spy();
                    const cb2 = spy();
                    core([1, 2, 3, 4, 5]).forEach(cb).forEach(cb2).resume();
                    expect(cb2).to.have.not.been.called;
                });

                it("should passthrough elements if passthrough = true", async () => {
                    const data = spy();
                    core([1, 2, 3, 4, 5])
                        .forEach(() => {

                        }, { passthrough: true })
                        .forEach(async () => {
                            await promise.delay(10);
                        }, { passthrough: true })
                        .forEach(async () => {
                            await promise.delay(10);
                        }, { passthrough: true, wait: false })
                        .on("data", data);
                    await data.waitForNCalls(5);
                    for (let i = 0; i < 5; ++i) {
                        expect(data.getCall(i)).to.have.been.calledWithExactly(i + 1);
                    }
                });

                it("should wait for async functions", async () => {
                    const fEnd = spy();
                    const end = spy();
                    core([1]).forEach(async () => {
                        await promise.delay(50);
                        fEnd();
                    }).once("end", end);
                    await end.waitForCall();
                    expect(fEnd).to.have.been.calledBefore(end);
                });

                it("should not wait for async functions if wait = false", async () => {
                    const fEnd = spy();
                    const end = spy();
                    core([1]).forEach(async () => {
                        await promise.delay(50);
                        fEnd();
                    }, { wait: false }).once("end", end);
                    await end.waitForCall();
                    expect(fEnd).to.have.not.been.called;
                    await fEnd.waitForCall();
                });
            });

            describe("toArray", () => {
                it("should gather all the values into an array and call the callback", (done) => {
                    const a = core([1, 2, 3, 4, 5]);
                    a.toArray((values) => {
                        expect(values).to.be.deep.equal([1, 2, 3, 4, 5]);
                        done();
                    }).resume();
                });

                it("should resume stream", (done) => {
                    const a = core([1, 2, 3, 4, 5]);
                    a.toArray((values) => {
                        expect(values).to.be.deep.equal([1, 2, 3, 4, 5]);
                        done();
                    });
                });

                it("should return itself", () => {
                    const a = core();
                    expect(a.toArray(adone.noop)).to.be.equal(a);
                });

                it("should call the callback with an empty array if the stream has ended", async () => {
                    const c = core().end();
                    const end = spy();
                    c.once("end", end);
                    await end.waitForCall();
                    const x = await new Promise((resolve) => {
                        c.toArray(resolve);
                    });
                    expect(x).to.be.deep.equal([]);
                });

                it("should call the callback on the next tick when ended", async () => {
                    const c = core().end();
                    const end = spy();
                    c.once("end", end);
                    await end.waitForCall();
                    const h = spy();
                    c.toArray(h);
                    expect(h).to.have.not.been.called;
                    await adone.promise.delay(2);
                    expect(h).to.have.been.calledOnce;
                });
            });

            describe("promise", () => {
                describe("then", () => {
                    it("should return Promise", () => {
                        const c = core();
                        expect(c.then(noop, noop)).to.be.instanceOf(Promise);
                    });

                    it("should resolve using toArray result", async () => {
                        const c = core([1, 2, 3, 4, 5]);
                        const res = await c;
                        expect(res).to.be.deep.equal([1, 2, 3, 4, 5]);
                    });

                    it("should destroy stream on the first error", async () => {
                        const [a, b, c, d] = [spy(), spy(), spy(), spy()];
                        const s = core([1, 2, 3, 4, 5])
                            .through(function (x) {
                                a();
                                this.push(x);
                            })
                            .through(function (x) {
                                b();
                                if (x === 2) {
                                    throw new Error();
                                }
                                this.push(x);
                            })
                            .through(async function (x) {
                                c();
                                await promise.delay(100);
                                this.push(x);
                            })
                            .through(d);
                        await assert.throws(async () => {
                            await s;
                        });
                        expect(a).to.have.callCount(2);
                        expect(b).to.have.callCount(2);
                        expect(c).to.have.callCount(1);
                        expect(d).to.have.callCount(0);
                    });

                    it("should reject if transform fails", async () => {
                        const c = core([1, 2, 3, 4, 5]).through(() => {
                            throw new Error();
                        });
                        await assert.throws(async () => {
                            await c;
                        });
                    });

                    it("should reject if flushing fails", async () => {
                        const c = core([1, 2, 3, 4, 5]).through(passthrough, () => {
                            throw new Error();
                        });
                        await assert.throws(async () => {
                            await c;
                        });
                    });

                    it("should save all the errors", async () => {
                        const c = core([1, 2, 3, 4, 5])
                            .through(passthrough, () => {
                                throw new Error("hello");
                            })
                            .through(passthrough, () => {
                                throw new Error("world");
                            })
                            .through(passthrough, () => {
                                throw new Error("!");
                            });
                        const err = await assert.throws(async () => {
                            await c;
                        });
                        expect(err.consequent).to.be.an("array");
                        expect(err.consequent).to.have.lengthOf(2);
                        expect(err.message).to.be.equal("hello");
                        expect(err.consequent[0].message).to.be.equal("world");
                        expect(err.consequent[1].message).to.be.equal("!");
                    });
                });

                describe("catch", () => {
                    it("should be the same as then where onResolve is undefined", async () => {
                        const c = core();
                        const then = spy(c, "then");
                        const cb = noop;
                        c.catch(cb);
                        expect(then.calledOnce).to.be.true;
                        expect(then.args[0]).to.be.deep.equal([undefined, cb]);
                    });
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
                    await assert.throws(async () => {
                        await core([1, 2, 3, 4, 5]).map((x) => {
                            if (x === 3) {
                                throw new Error("hello");
                            }
                            return x;
                        });
                    }, "hello");
                });

                it("should emit an error if someting goes wrong inside an async callback", async () => {
                    await assert.throws(async () => {
                        await core([1, 2, 3, 4, 5]).map(async (x) => {
                            if (x === 3) {
                                throw new Error("hello");
                            }
                            return x;
                        });
                    }, "hello");
                });

                it("should create a sync transform if handler is sync", async () => {
                    const c = core().map((x) => x + 1);
                    const data = spy();
                    c.on("data", data);
                    c.resume();
                    await nextTick();
                    c.write(1);
                    expect(data).to.have.been.calledOnce;
                    expect(data).to.have.been.calledWithExactly(2);
                });

                it("should create an async transform if handler is async", async () => {
                    const c = core().map(async (x) => x + 1);
                    const data = spy();
                    c.on("data", data);
                    c.resume();
                    await nextTick();
                    c.write(1);
                    expect(data).to.have.not.been.called;
                    await data.waitForCall();
                    expect(data).to.have.been.calledWithExactly(2);
                });

                it("should throw if the callback is not a function", () => {
                    expect(() => {
                        core().map();
                    }).to.throw(x.InvalidArgument, "'callback' must be a function");
                });
            });

            describe("mapIf", () => {
                it("should map values with adone.truly", async () => {
                    const res = await core([1, 2, 3, 4, 5]).mapIf(adone.truly, (x) => x * x);
                    expect(res).to.be.deep.equal([1, 4, 9, 16, 25]);
                });

                it("should not map values with adone.falsely", async () => {
                    const res = await core([1, 2, 3, 4, 5]).mapIf(adone.falsely, (x) => x * x);
                    expect(res).to.be.deep.equal([1, 2, 3, 4, 5]);
                });

                it("should create a sync transform for sync condition and callback", async () => {
                    const c = core().mapIf(adone.truly, (x) => x * x);
                    const data = spy();
                    c.on("data", data);
                    c.resume();
                    await nextTick();
                    c.write(2);
                    expect(data).to.have.been.calledOnce;
                    expect(data).to.have.been.calledWithExactly(4);
                });

                it("should create an async transform for sync condition and async callback", async () => {
                    const c = core().mapIf(adone.truly, async (x) => x * x);
                    const data = spy();
                    c.on("data", data);
                    c.resume();
                    await nextTick();
                    c.write(2);
                    expect(data).to.have.not.been.called;
                    await data.waitForCall();
                    expect(data).to.have.been.calledWithExactly(4);
                });

                it("should create an async transform for async condition and sync callback", async () => {
                    const c = core().mapIf(async () => true, (x) => x * x);
                    const data = spy();
                    c.on("data", data);
                    c.resume();
                    await nextTick();
                    c.write(2);
                    expect(data).to.have.not.been.called;
                    await data.waitForCall();
                    expect(data).to.have.been.calledWithExactly(4);
                });

                it("should create an async transform for async condition and async callback", async () => {
                    const c = core().mapIf(async () => true, async (x) => x * x);
                    const data = spy();
                    c.on("data", data);
                    c.resume();
                    await nextTick();
                    c.write(2);
                    expect(data).to.have.not.been.called;
                    await data.waitForCall();
                    expect(data).to.have.been.calledWithExactly(4);
                });

                it("should throw if the condition is not a function", () => {
                    expect(() => {
                        core().mapIf();
                    }).to.throw(x.InvalidArgument, "'condition' must be a function");
                });

                it("should throw if the callback is not a function", () => {
                    expect(() => {
                        core().mapIf(() => { });
                    }).to.throw(x.InvalidArgument, "'callback' must be a function");
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
                    await assert.throws(async () => {
                        await core([1, 2, 3, 4, 5]).filter((x) => {
                            if (x === 3) {
                                throw new Error("hello");
                            }
                            return x % 2;
                        });
                    }, "hello");
                });

                it("should throw if something goes wrong inside an async callback", async () => {
                    await assert.throws(async () => {
                        await core([1, 2, 3, 4, 5]).filter((x) => {
                            if (x === 3) {
                                throw new Error("hello");
                            }
                            return x % 2;
                        });
                    }, "hello");
                });

                it("should throw if the callback is not a function", () => {
                    expect(() => {
                        core().filter();
                    }).to.throw(x.InvalidArgument, "'callback' must be a function");
                });

                it("should create a sync transform if callback is sync", async () => {
                    const c = core().filter(() => true);
                    const data = spy();
                    c.on("data", data);
                    c.resume();
                    await nextTick();
                    c.write(1);
                    expect(data).to.have.been.calledOnce;
                });

                it("should create an sync transform if callback is async", async () => {
                    const c = core().filter(async () => true);
                    const data = spy();
                    c.on("data", data);
                    c.resume();
                    await nextTick();
                    c.write(1);
                    expect(data).to.have.not.been.called;
                    await data.waitForCall();
                });
            });

            describe("done", () => {
                it("should call the callback at the end", async () => {
                    const cb = spy();
                    const end = spy();
                    core([1, 2, 3]).done(cb).resume().once("end", end);
                    await end.waitForCall();
                    expect(cb).to.have.been.calledOnce;
                    expect(cb).to.have.been.calledBefore(end);
                });

                it("should autoresume", async () => {
                    const cb = spy();
                    const end = spy();
                    core([1, 2, 3]).done(cb).once("end", end);
                    await end.waitForCall();
                    expect(cb).to.have.been.calledOnce;
                    expect(cb).to.have.been.calledBefore(end);
                });

                it("should not passthrough elements", async () => {
                    const cb = spy();
                    const arr = spy();
                    const end = spy();
                    core([1, 2, 3]).done(cb).toArray(arr).resume().once("end", end);
                    await end.waitForCall();
                    expect(cb).to.have.been.calledOnce;
                    expect(cb).to.have.been.calledBefore(end);
                    expect(arr).to.have.been.calledOnce;
                    expect(arr).to.have.been.calledAfter(cb).and.calledBefore(end);
                    expect(arr).to.have.been.calledWithExactly([]);
                });

                it("should not passthrough elements whwn passthrough = true", async () => {
                    const cb = spy();
                    const arr = spy();
                    const end = spy();
                    core([1, 2, 3]).done(cb, { passthrough: true }).toArray(arr).resume().once("end", end);
                    await end.waitForCall();
                    expect(cb).to.have.been.calledOnce;
                    expect(cb).to.have.been.calledBefore(end);
                    expect(arr).to.have.been.calledOnce;
                    expect(arr).to.have.been.calledAfter(cb).and.calledBefore(end);
                    expect(arr).to.have.been.calledWithExactly([1, 2, 3]);
                });

                it("should throw if the callback is not a function", () => {
                    expect(() => {
                        core().done();
                    }).to.throw(adone.x.InvalidArgument, "'callback' must be a function");
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
                    }).to.throw(adone.x.InvalidArgument, "'prop' must be a function or null");
                });

                it("should not throw if the argument is null", () => {
                    core().unique(null);
                });

                it("should clear the cache after the end", async () => {
                    const a = core([]);
                    const clear = spy(Set.prototype, "clear");
                    a.unique();
                    await a;
                    expect(clear).to.have.been.called;
                });
            });

            describe("stash/unstash", () => {
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
                        .unstash("strings")
                        .unstash("arrays");

                    expect(hadNumbers).to.be.true;
                    expect(values).to.be.deep.equal([1, 2, 3, 4, 5, "a", "b", "c", ["key"], ["value"]]);
                });

                specify("unamed stash should work like a stack", async () => {
                    const values = await core([1, 2, 3, 4, 5])
                        .stash((x) => x === 1) // hide 1
                        .stash((x) => x === 2) // hide 2
                        .map((x) => [x])
                        .unstash() // unhide 2
                        .map((x) => ({ x }))
                        .unstash(); // unhide 1
                    expect(values).to.be.deep.equal([1, { x: 2 }, { x: [3] }, { x: [4] }, { x: [5] }]);
                });
            });

            describe("flatten", () => {
                it("should work", async () => {
                    const res = await core([[1], [2], [3], [4], [5, 6, 7], [8, 9, 10]]).flatten();
                    expect(res).to.be.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
                });

                it("should work fine with nested arrays", async () => {
                    const res = await core([[1], [2, [3], [4, [5]], [6]], [[7, [[[8]]]]]]).flatten();
                    expect(res).to.be.deep.equal([1, 2, 3, 4, 5, 6, 7, 8]);
                });

                it("should work if there is no arrays", async () => {
                    const res = await core([1, 2, 3, 4, "hello", {}]).flatten();
                    expect(res).to.be.deep.equal([1, 2, 3, 4, "hello", {}]);
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
                        const data = spy();
                        stream.on("data", data).resume();
                        await data.waitForNCalls(9);
                        stream.write(1);
                        expect(data).to.have.callCount(10);
                    });

                    it("should emit an error if merged stream emits an error", () => {
                        const a = core();
                        const b = core();
                        const error = spy();
                        const c = core.merge([a, b]);
                        c.on("error", error);
                        a.emit("error", "hello a");
                        expect(error.calledOnce).to.be.true;
                        expect(error.args[0]).to.be.deep.equal(["hello a"]);
                        b.emit("error", "hello b");
                        expect(error.calledTwice).to.be.true;
                        expect(error.args[1]).to.be.deep.equal(["hello b"]);
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

                    it("should correclty handle the case of 1 input core stream", async () => {
                        const a = core([1, 2, 3]);
                        const c = core.merge([a]);
                        expect(await c).to.be.deep.equal([1, 2, 3]);
                    });

                    it("should correcly work using inheritance", async () => {
                        class ExCore extends adone.stream.CoreStream {
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
                            sourceOptions: {
                                transform(x) {
                                    this.push(x + 1);
                                },
                                flush() {
                                    this.push(8);
                                }
                            }
                        });
                        expect((await c).sort()).to.be.deep.equal([2, 3, 4, 5, 6, 7, 8]);
                    });
                });
            });
        });
    });
});
