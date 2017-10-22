describe("shani", "util", "__", "util", "EventTarget", () => {
    const {
        __: {
            util: {
                event: sevent
            }
        },
        spy: sspy
    } = adone.shani.util;

    beforeEach(function () {
        this.target = Object.assign({}, sevent.EventTarget);
    });

    it("notifies event listener", function () {
        const listener = sspy();
        this.target.addEventListener("dummy", listener);

        const event = new sevent.Event("dummy");
        this.target.dispatchEvent(event);

        assert(listener.calledOnce);
        assert(listener.calledWith(event));
    });

    it("notifies event listener with target as this", function () {
        const listener = sspy();
        this.target.addEventListener("dummy", listener);

        const event = new sevent.Event("dummy");
        this.target.dispatchEvent(event);

        assert(listener.calledOn(this.target));
    });

    it("notifies all event listeners", function () {
        const listeners = [sspy(), sspy()];
        this.target.addEventListener("dummy", listeners[0]);
        this.target.addEventListener("dummy", listeners[1]);

        const event = new sevent.Event("dummy");
        this.target.dispatchEvent(event);

        assert(listeners[0].calledOnce);
        assert(listeners[0].calledOnce);
    });

    it("notifies event listener of type listener", function () {
        const listener = { handleEvent: sspy() };
        this.target.addEventListener("dummy", listener);

        this.target.dispatchEvent(new sevent.Event("dummy"));

        assert(listener.handleEvent.calledOnce);
    });

    it("does not notify listeners of other events", function () {
        const listeners = [sspy(), sspy()];
        this.target.addEventListener("dummy", listeners[0]);
        this.target.addEventListener("other", listeners[1]);

        this.target.dispatchEvent(new sevent.Event("dummy"));

        assert.isFalse(listeners[1].called);
    });

    it("does not notify unregistered listeners", function () {
        const listener = sspy();
        this.target.addEventListener("dummy", listener);
        this.target.removeEventListener("dummy", listener);

        this.target.dispatchEvent(new sevent.Event("dummy"));

        assert.isFalse(listener.called);
    });

    it("notifies existing listeners after removing one", function () {
        const listeners = [sspy(), sspy(), sspy()];
        this.target.addEventListener("dummy", listeners[0]);
        this.target.addEventListener("dummy", listeners[1]);
        this.target.addEventListener("dummy", listeners[2]);
        this.target.removeEventListener("dummy", listeners[1]);

        this.target.dispatchEvent(new sevent.Event("dummy"));

        assert(listeners[0].calledOnce);
        assert(listeners[2].calledOnce);
    });

    it("returns false when event.preventDefault is not called", function () {
        this.target.addEventListener("dummy", sspy());

        const event = new sevent.Event("dummy");
        const result = this.target.dispatchEvent(event);

        assert.isFalse(result);
    });

    it("returns true when event.preventDefault is called", function () {
        this.target.addEventListener("dummy", (e) => {
            e.preventDefault();
        });

        const result = this.target.dispatchEvent(new sevent.Event("dummy"));

        assert.isTrue(result);
    });

    it("notifies ProgressEvent listener with progress data ", function () {
        const listener = sspy();
        this.target.addEventListener("dummyProgress", listener);

        const progressEvent = new sevent.ProgressEvent("dummyProgress", { loaded: 50, total: 120 });
        this.target.dispatchEvent(progressEvent);

        assert.isTrue(progressEvent.lengthComputable);
        assert(listener.calledOnce);
        assert(listener.calledWith(progressEvent));
    });

    it("notifies CustomEvent listener with custom data", function () {
        const listener = sspy();
        this.target.addEventListener("dummyCustom", listener);

        const customEvent = new sevent.CustomEvent("dummyCustom", { detail: "hola" });
        this.target.dispatchEvent(customEvent);

        assert(listener.calledOnce);
        assert(listener.calledWith(customEvent));
    });
});
