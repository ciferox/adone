const {
    is,
    p2p: { util: { AbortController, AbortSignal } }
} = adone;

describe("AbortController", () => {
    let controller;

    beforeEach(() => {
        controller = new AbortController();
    });

    it("should not be callable", () => {
        assert.throws(() => AbortController(), TypeError);
    });

    it("should have 2 properties", () => {
        // IE does not support Set constructor.
        const keys = new Set();
        keys.add("signal");
        keys.add("abort");

        for (const key in controller) {
            assert(keys.has(key), `'${key}' found, but should not have it`);
            keys.delete(key);
        }

        keys.forEach((key) => {
            assert(false, `'${key}' not found`);
        });
    });

    it("should be stringified as [object AbortController]", () => {
        assert(controller.toString() === "[object AbortController]");
    });

    describe("'signal' property", () => {
        let signal;

        beforeEach(() => {
            signal = controller.signal;
        });

        it("should return the same instance always", () => {
            assert(signal === controller.signal);
        });

        it("should be a AbortSignal object", () => {
            assert(signal instanceof AbortSignal);
        });

        // browser only
        it.skip("should be a EventTarget object", () => {
            assert(signal instanceof EventTarget);
        });

        it("should have 5 properties", () => {
            // IE does not support Set constructor.
            const keys = new Set();
            keys.add("addEventListener");
            keys.add("removeEventListener");
            keys.add("dispatchEvent");
            keys.add("aborted");
            keys.add("onabort");

            for (const key in signal) {
                assert(keys.has(key), `'${key}' found, but should not have it`);
                keys.delete(key);
            }

            keys.forEach((key) => {
                assert(false, `'${key}' not found`);
            });
        });

        it("should have 'aborted' property which is false by default", () => {
            assert(signal.aborted === false);
        });

        it("should have 'onabort' property which is null by default", () => {
            assert(is.null(signal.onabort));
        });

        it("should throw a TypeError if 'signal.aborted' getter is called with non AbortSignal object", () => {
            const getAborted = Object.getOwnPropertyDescriptor(
                signal.__proto__,
                "aborted",
            ).get;
            assert.throws(() => getAborted.call({}), TypeError);
        });
        it("should be stringified as [object AbortSignal]", () => {
            assert(signal.toString() === "[object AbortSignal]");
        });
    });

    describe("'abort' method", () => {
        it("should set true to 'signal.aborted' property", () => {
            controller.abort();
            assert(controller.signal.aborted);
        });

        it("should fire 'abort' event on 'signal' (addEventListener)", () => {
            const listener = spy();
            controller.signal.addEventListener("abort", listener);
            controller.abort();

            assert(listener.callCount === 1);
        });

        it("should fire 'abort' event on 'signal' (onabort)", () => {
            const listener = spy();
            controller.signal.onabort = listener;
            controller.abort();

            assert(listener.callCount === 1);
        });

        it("should not fire 'abort' event twice", () => {
            const listener = spy();
            controller.signal.addEventListener("abort", listener);
            controller.abort();
            controller.abort();
            controller.abort();

            assert(listener.callCount === 1);
        });

        it("should throw a TypeError if 'this' is not an AbortController object", () => {
            assert.throws(() => controller.abort.call({}), TypeError);
        });
    });
});

describe("AbortSignal", () => {
    it("should not be callable", () => {
        assert.throws(() => AbortSignal(), TypeError);
    });

    it("should throw a TypeError when it's constructed directly", () => {
        assert.throws(() => new AbortSignal(), TypeError);
    });
});
