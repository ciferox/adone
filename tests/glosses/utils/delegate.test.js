describe("util", "delegate", () => {
    const { util: { delegate } } = adone;

    it("should delegate a method call", () => {
        class A {
            hello() {
                return "world";
            }
        }

        class B {
            constructor() {
                this.a = new A();
            }
        }

        delegate(B.prototype, "a")
            .method("hello");

        expect(new B().hello()).to.be.equal("world");
    });

    it("should delegate get", () => {
        class A {
            constructor() {
                this.hello = "world";
            }
        }

        class B {
            constructor() {
                this.a = new A();
            }
        }

        delegate(B.prototype, "a")
            .getter("hello");

        expect(new B().hello).to.be.equal("world");
        expect(() => {
            new B().hello = 2;
        }).to.throw(/only a getter/);
    });

    it("should delegate set", () => {
        class A {
            constructor() {
                this.hello = "world";
            }
        }

        class B {
            constructor() {
                this.a = new A();
            }
        }

        delegate(B.prototype, "a")
            .setter("hello");

        const b = new B();
        b.hello = 2;

        expect(b.a.hello).to.be.equal(2);
        expect(b.hello).to.be.undefined();
    });

    it("should delegate get and set", () => {
        class A {
            constructor() {
                this.hello = "world";
            }
        }

        class B {
            constructor() {
                this.a = new A();
            }
        }

        delegate(B.prototype, "a")
            .access("hello");

        const b = new B();
        expect(b.hello).to.be.equal("world");
        b.hello = 2;
        expect(b.hello).to.be.equal(2);
    });

    it("should be fluent", () => {
        const d = delegate({}, "a");
        expect(d.method("a").getter("b").setter("c").access("d")).to.be.equal(d);
    });
});
