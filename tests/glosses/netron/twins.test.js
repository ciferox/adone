        // describe.skip("Interface twins", () => {
        //     class TwinA extends adone.netron.Interface {
        //         async method2() {
        //             const twinValue = await this.$twin.method2();
        //             return `twin.${twinValue}`;
        //         }

        //         method3() {
        //             return "method3";
        //         }
        //     }

        //     @Context()
        //     @Property("prop1", { private: false, type: String })
        //     // @Twin(TwinA)
        //     class A {
        //         constructor() {
        //             this.prop1 = "prop1";
        //             this.prop2 = "prop2";
        //         }
        //         method1() {
        //             return "method1";
        //         }

        //         method2() {
        //             return "method2";
        //         }
        //     }

        //     @Contextable
        //     @Property("prop1", { private: false, type: String })
        //     @Twin(" \
        //         class B extends adone.netron.Interface { \
        //             async method2() { \
        //                 await adone.promise.delay(10); \
        //                 const twinValue = await this.$twin.method2(); \
        //                 return `twin.${twinValue}`; \
        //             } \
        //             method3() { \
        //                 return 'method3'; \
        //             } \
        //         }")
        //     class B {
        //         constructor() {
        //             this.prop1 = "prop1";
        //             this.prop2 = "prop2";
        //         }
        //         method1() {
        //             return "method1";
        //         }

        //         method2() {
        //             return "method2";
        //         }
        //     }

        //     it("twin interface validation", () => {
        //         assert.throws(() => exNetron.setInterfaceTwin("a"), adone.error.InvalidArgument);
        //         assert.throws(() => exNetron.setInterfaceTwin("a", 1), adone.error.InvalidArgument);
        //         assert.throws(() => exNetron.setInterfaceTwin("a", {}), adone.error.InvalidArgument);
        //         assert.throws(() => exNetron.setInterfaceTwin("a", []), adone.error.InvalidArgument);
        //         assert.throws(() => exNetron.setInterfaceTwin("a", "twin"), adone.error.InvalidArgument);
        //         assert.throws(() => exNetron.setInterfaceTwin("a", new TwinA()), adone.error.InvalidArgument);
        //         assert.doesNotThrow(() => exNetron.setInterfaceTwin("a", TwinA));
        //     });

        //     it("set twin interface double times", () => {
        //         assert.doesNotThrow(() => exNetron.setInterfaceTwin("a", TwinA));
        //         assert.throws(() => exNetron.setInterfaceTwin("a", TwinA), adone.error.Exists);
        //     });

        //     it("local interface twin - basic access", async () => {
        //         superNetron.attachContext(new A(), "a");
        //         await superNetron.bind();
        //         exNetron.options.acceptTwins = false;
        //         exNetron.setInterfaceTwin("A", TwinA);

        //         const peer = await exNetron.connect();
        //         const iTwinA = peer.getInterfaceByName("a");
        //         assert.equal(await iTwinA.method1(), "method1");
        //         assert.equal(await iTwinA.method2(), "twin.method2");
        //         assert.equal(await iTwinA.method3(), "method3");
        //         assert.equal(await iTwinA.prop1.get(), "prop1");
        //         assert.equal(await iTwinA.prop2.get(), "prop2");
        //     });

        //     it("remote interface twin - basic access", async () => {
        //         superNetron.attachContext(new B(), "b");
        //         await superNetron.bind();

        //         const peer = await exNetron.connect();
        //         const iTwinA = peer.getInterfaceByName("b");
        //         assert.equal(await iTwinA.method1(), "method1");
        //         assert.equal(await iTwinA.method2(), "twin.method2");
        //         assert.equal(await iTwinA.method3(), "method3");
        //         assert.equal(await iTwinA.prop1.get(), "prop1");
        //         assert.equal(await iTwinA.prop2.get(), "prop2");
        //     });
        // });