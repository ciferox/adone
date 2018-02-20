const { is, shani: { util } } = adone;
const { __ } = util;

const push = Array.prototype.push;
const filter = Array.prototype.filter;

const getFakes = (fakeCollection) => {
    if (!fakeCollection.fakes) {
        fakeCollection.fakes = [];
    }

    return fakeCollection.fakes;
};

export default class Collection {
    each(method) {
        const fakes = getFakes(this);
        const matchingFakes = filter.call(fakes, (fake) => is.function(fake[method]));

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
        const privateResetHistory = (f) => {
            const method = f.resetHistory || f.reset;
            if (method) {
                method.call(f);
            }
        };

        getFakes(this).forEach((fake) => {
            if (is.function(fake)) {
                privateResetHistory(fake);
                return;
            }

            const methods = [];
            if (fake.get) {
                methods.push(fake.get);
            }

            if (fake.set) {
                methods.push(fake.set);
            }

            methods.forEach(privateResetHistory);
        });
    }

    verifyAndRestore() {
        let error;

        try {
            this.verify();
        } catch (e) {
            error = e;
        }

        this.restore();

        if (error) {
            throw error;
        }
    }

    add(fake) {
        push.call(getFakes(this), fake);
        return fake;
    }

    addUsingPromise(fake) {
        fake.usingPromise(this.promiseLibrary);
        return fake;
    }

    spy(...args) {
        return this.add(util.spy.apply(util.spy, args));
    }

    createStubInstance(constructor) {
        if (!is.function(constructor)) {
            throw new TypeError("The constructor should be a function.");
        }
        return this.stub(Object.create(constructor.prototype));
    }

    stub(object, property, ...args) {
        if (object && !is.undefined(property) && !(property in object)) {
            throw new TypeError(`Cannot stub non-existent own property ${__.util.valueToString(property)}`);
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
