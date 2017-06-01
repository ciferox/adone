const { is, shani: { util } } = adone;
const { __ } = util;

const getFakes = (fakeCollection) => {
    if (!fakeCollection.fakes) {
        fakeCollection.fakes = [];
    }

    return fakeCollection.fakes;
};

export default class Collection {
    each(method) {
        const fakes = getFakes(this);
        const matchingFakes = fakes.filter((fake) => is.function(fake[method]));

        matchingFakes.forEach((fake) => fake[method]());
    }

    verify() {
        this.each("verify");
    }

    restore() {
        this.each("restore");
        this.fakes = [];
    }

    reset() {
        this.each("reset");
    }

    resetBehavior() {
        this.each("resetBehavior");
    }

    resetHistory() {
        this.each("resetHistory");
    }

    verifyAndRestore() {
        let exception;

        try {
            this.verify();
        } catch (e) {
            exception = e;
        }

        this.restore();

        if (exception) {
            throw exception;
        }
    }

    add(fake) {
        getFakes(this).push(fake);
        return fake;
    }

    addUsingPromise(fake) {
        fake.usingPromise(this.promiseLibrary);
        return fake;
    }

    spy(...args) {
        return this.add(util.spy.apply(util.spy, args));
    }

    stub(object, property, ...args) {
        if (arguments.length > 2) {
            return __.sandboxStub.apply(this, [object, property, ...args]);
        }

        const stubbed = util.stub(object, property, ...args);
        const isStubbingEntireObject = is.undefined(property) && is.object(object);

        if (isStubbingEntireObject) {
            const ownMethods = __.collectOwnMethods(stubbed);
            ownMethods.forEach(this.add.bind(this));
            if (this.promiseLibrary) {
                ownMethods.forEach(this.addUsingPromise.bind(this));
            }
        } else {
            this.add(stubbed);
            if (this.promiseLibrary) {
                stubbed.usingPromise(this.promiseLibrary);
            }
        }

        return stubbed;
    }

    mock(...args) {
        return this.add(util.mock(...args));
    }

    inject(obj) {
        const col = this;

        obj.spy = function (...args) {
            return col.spy.apply(col, args);
        };

        obj.stub = function (...args) {
            return col.stub.apply(col, args);
        };

        obj.mock = function (...args) {
            return col.mock.apply(col, args);
        };

        return obj;
    }
}
