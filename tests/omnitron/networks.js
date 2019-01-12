const {
    is,
    omnitron
} = adone;

export default ({
    startOmnitron,
    stopOmnitron
} = {}) => {
    let omnitronDb;
    let networksConfig;
    let netCounter = 1;
    const getNetcoreId = () => `net${netCounter++}`;
    const addedNetworks = {};

    const addNetwork = async (netId, config) => {
        await networksConfig.add(netId, config);
        addedNetworks[netId] = config;
    };

    before(async () => {
        if (is.function(startOmnitron)) {
            await startOmnitron();
        }
        omnitronDb = await omnitron.dispatcher.getDB();
        networksConfig = await omnitronDb.getConfiguration("networks");
        // const iConfig = await iOmnitron.getConfiguration();
        // await iConfig.set("gates", []);
    });

    after(async () => {
        await networksConfig.clear();
        if (is.function(stopOmnitron)) {
            await stopOmnitron();
        } else {
            await omnitron.DB.close();
        }
    });

    it("no networks on initial", async () => {
        assert.deepEqual(await networksConfig.entries(), {});
    });

    describe("add network", () => {
        it("by default it need only 'addrs'", async () => {
            const netId = getNetcoreId();
            await addNetwork(netId, {
                addrs: "//ip4/127.0.0.1//tcp/8888"
            });
    
            assert.deepEqual(await networksConfig.get(netId), {
                autostart: false,
                addrs: "//ip4/127.0.0.1//tcp/8888",
                muxer: "mplex",
                transport: "tcp"
            });
        });

        it("with specified 'muxer'", async () => {
            const netId = getNetcoreId();
            await addNetwork(netId, {
                addrs: "//ip4/127.0.0.1//tcp/9999",
                muxer: "mplex"
            });
    
            assert.deepEqual(await networksConfig.get(netId), {
                autostart: false,
                addrs: "//ip4/127.0.0.1//tcp/9999",
                muxer: "mplex",
                transport: "tcp"
            });
        });

        it("with 'autostart = true'", async () => {
            const netId = getNetcoreId();
            await addNetwork(netId, {
                autostart: true,
                addrs: "//ip4/127.0.0.1//tcp/9999",
                muxer: "mplex"
            });
    
            assert.deepEqual(await networksConfig.get(netId), {
                autostart: true,
                addrs: "//ip4/127.0.0.1//tcp/9999",
                muxer: "mplex",
                transport: "tcp"
            });
        });

        it("with specified 'transport'", async () => {
            const transports = ["tcp", "ws"];

            for (const ts of transports) {
                const netId = getNetcoreId();
                // eslint-disable-next-line
                await addNetwork(netId, {
                    addrs: "//ip4/127.0.0.1//tcp/9999",
                    transport: ts
                });

                // eslint-disable-next-line
                assert.deepEqual(await networksConfig.get(netId), {
                    autostart: false,
                    addrs: "//ip4/127.0.0.1//tcp/9999",
                    muxer: "mplex",
                    transport: ts
                });
            }
        });

        it("should throw without 'addrs'", async () => {
            await assert.throws(async () => {
                await addNetwork(getNetcoreId(), {
                    transport: "tcp"
                });
            });
        });

        it("should throw when invalid 'muxer'", async () => {
            await assert.throws(async () => {
                await addNetwork(getNetcoreId(), {
                    addrs: "//ip4/127.0.0.1//tcp/9999",
                    muxer: "badmuxer"
                });
            });
        });

        it("should throw when invalid 'transport'", async () => {
            await assert.throws(async () => {
                await addNetwork(getNetcoreId(), {
                    addrs: "//ip4/127.0.0.1//tcp/9999",
                    transport: "http"
                });
            });
        });
    });

    it("list networks", async () => {
        assert.sameMembers(await networksConfig.keys(), Object.keys(addedNetworks));
    });

    //     it("delete gate", async () => {
    //         await addGateAndCheck({
    //             name: "gate1",
    //             port: 32768
    //         }, false);

    //         await iOmnitron.deleteGate("gate1");
    //         await stopOmnitron();
    //         await startOmnitron();
    //         assert.lengthOf(await iOmnitron.getGates(), 0);
    //     });

    //     it("delete active gate is not allowed", async () => {
    //         await addGateAndCheck({
    //             name: "gate1",
    //             port: 32768
    //         });

    //         const err = await assert.throws(async () => iOmnitron.deleteGate("gate1"));
    //         assert.instanceOf(err, adone.error.NotAllowed);
    //     });

    //     it("up/down gate", async (done) => {
    //         const gate = {
    //             name: "gate1",
    //             port: await adone.net.util.getPort()
    //         };
    //         await addGateAndCheck(gate, false);

    //         await iOmnitron.upGate("gate1");

    //         const netron = new adone.netron.Netron();
    //         const options = adone.util.pick(gate, ["port"]);
    //         const peer = await netron.connect(options);
    //         const iOmni = peer.getInterface("omnitron");
    //         assert.deepEqual(await iOmnitron.getInfo({
    //             env: true
    //         }), await iOmni.getInfo({
    //             env: true
    //         }));

    //         netron.on("peer offline", (p) => {
    //             if (peer.uid === p.uid) {
    //                 done();
    //             }
    //         });

    //         await iOmnitron.downGate("gate1");
    //     });

    //     it("up active gate should have thrown", async () => {
    //         const gate = {
    //             name: "gate1",
    //             port: await adone.net.util.getPort()
    //         };
    //         await addGateAndCheck(gate, false);

    //         await iOmnitron.upGate("gate1");

    //         const err = await assert.throws(async () => iOmnitron.upGate("gate1"));
    //         assert.instanceOf(err, adone.error.IllegalState);
    //     });

    //     it("down inactive gate should have thrown", async () => {
    //         const gate = {
    //             name: "gate1",
    //             port: await adone.net.util.getPort()
    //         };
    //         await addGateAndCheck(gate, false);

    //         const err = await assert.throws(async () => iOmnitron.downGate("gate1"));
    //         assert.instanceOf(err, adone.error.IllegalState);
    //     });

    //     it("should not bind disabled gates on startup", async () => {
    //         const gate = {
    //             name: "gate1",
    //             port: await adone.net.util.getPort(),
    //             startup: false
    //         };
    //         await addGateAndCheck(gate);

    //         let gates = await iOmnitron.getGates({
    //             active: true
    //         });

    //         assert.lengthOf(gates, 0);

    //         await iOmnitron.upGate("gate1");

    //         gates = await iOmnitron.getGates({
    //             active: true
    //         });

    //         assert.lengthOf(gates, 1);

    //         await stopOmnitron();
    //         await startOmnitron();

    //         gates = await iOmnitron.getGates({
    //             active: true
    //         });

    //         assert.lengthOf(gates, 0);
    //     });

    //     it("configure port", async () => {
    //         let port = await adone.net.util.getPort();
    //         const gate = {
    //             name: "gate1",
    //             port,
    //             startup: false
    //         };
    //         await addGateAndCheck(gate);

    //         let gates = await iOmnitron.getGates();
    //         assert.deepEqual(gates[0], {
    //             ...gate,
    //             port
    //         });

    //         port = port - 1;
    //         await iOmnitron.configureGate("gate1", {
    //             port
    //         });

    //         gates = await iOmnitron.getGates();
    //         assert.deepEqual(gates[0], {
    //             ...gate,
    //             port
    //         });
    //     });

    //     it("configure startup", async () => {
    //         const gate = {
    //             name: "gate1",
    //             port: await adone.net.util.getPort(),
    //             startup: false
    //         };
    //         await addGateAndCheck(gate);

    //         let gates = await iOmnitron.getGates();
    //         assert.deepEqual(gates[0], {
    //             ...gate,
    //             startup: false
    //         });

    //         await iOmnitron.configureGate("gate1", {
    //             startup: true
    //         });

    //         gates = await iOmnitron.getGates();
    //         assert.deepEqual(gates[0], {
    //             ...gate,
    //             startup: true
    //         });
    //     });

    //     it("configure with undefined options should only return gate configuration", async () => {
    //         const gate = {
    //             name: "gate1",
    //             port: await adone.net.util.getPort(),
    //             startup: false
    //         };
    //         await addGateAndCheck(gate);

    //         const gateConfig = await iOmnitron.configureGate("gate1");
    //         assert.deepEqual(gateConfig, adone.util.omit(gate, ["active"]));

    //         const gates = await iOmnitron.getGates();
    //         assert.sameDeepMembers(gates, [gate]);
    //     });

    //     it.skip("configure active gate should not be allowed", async () => {
    //         // ???
    //     });
};
