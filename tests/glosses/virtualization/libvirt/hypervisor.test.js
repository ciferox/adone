const {
    semver,
    virtualization: { libvirt }
} = adone;
const { Hypervisor } = libvirt;
const SegfaultHandler = require("segfault-handler");
const h = require("./lib/helper");

const test = {};
describe("Hypervisor", () => {
    before(() => {
        SegfaultHandler.registerHandler();
        return h.getLibVirtVersion()
            .then((version) => {
                test.version = version;
            });
    });

    describe("construction", () => {
        it("should create a hypervisor object", () => {
            const test = new Hypervisor("test:///default");
            expect(test.uri).to.equal("test:///default");
            expect(test.username).to.exist();
            expect(test.password).to.exist();
            expect(test.readOnly).to.exist();
        });

        it("should open a connection", (done) => {
            const connection = new Hypervisor("test:///default");
            connection.connect((err) => {
                expect(err).to.not.exist();

                connection.disconnect((err) => {
                    expect(err).to.not.exist();
                    done();
                });
            });
        });

        it("should open a read-only connection", (done) => {
            const connection = new Hypervisor("test:///default", true);
            connection.connect((err) => {
                expect(err).to.not.exist();

                connection.disconnect((err) => {
                    expect(err).to.not.exist();
                    done();
                });
            });
        });

        // it('should not return the version for a read-only conn', function() {
        //   //the test driver sends the version in read-only!!
        //   //this is not a big deal so we'll let it pass
        //   var readonlyConn = new Hypervisor('test:///default', true);
        //   var version = readonlyConn.getVersion();
        //   expect(version).to.not.be.null();
        // });

        // it('should open an authenticated connection': function(beforeExit, assert) {
        //   // var hypervisor2 = new libvirt.Hypervisor('esx://172.16.103.128/?no_verify=1', {
        //   //     username: 'myusername',
        //   //     password: 'mypassword',
        //   //     readOnly: false
        //   // });

        //   // assert.defined(hypervisor2);
        //   // assert.notNull(hypervisor2);
        //   // assert.notNull(hypervisor2.getVersion());
        // });
    });

    describe("methods", () => {
        beforeEach((done) => {
            test.hypervisor = new Hypervisor("test:///default");
            test.hypervisor.connect((err) => {
                expect(err).to.not.exist();
                done();
            });
        });

        afterEach((done) => {
            test.hypervisor.disconnect((err) => {
                expect(err).to.not.exist();
                done();
            });
        });


        [
            { name: "capabilities", method: "getCapabilities" },
            { name: "host name", method: "getHostname" },
            { name: "type", method: "getType" },
            { name: "connection uri", method: "getConnectionUri" },
            { name: "libvirt version", method: "getLibVirtVersion" },
            { name: "version", method: "getVersion" },
            { name: "connection secure", method: "isConnectionSecure" },
            { name: "connection encrypted", method: "isConnectionEncrypted" },
            { name: "connection alive", method: "isConnectionAlive" },

            // NOTE: not supported by test driver:
            // { name: "system info", method: "getSysInfo", disabled: true }
        ].forEach((testCase) => {
            it(`should return hypervisor ${testCase.name}`, (done) => {
                test.hypervisor[testCase.method]((err, result) => {
                    if (!!testCase.disabled) {
                        expect(err).to.exist();
                        expect(result).to.not.exist();
                    } else {
                        expect(err).to.not.exist();
                        expect(result).to.exist();
                    }

                    done();
                });
            });
        });
        it("should return memory details for hypervisor", (done) => {
            test.hypervisor.getNodeMemoryStats(libvirt.VIR_NODE_MEMORY_STATS_ALL_CELLS,
                0, (err, result) => {
                    // Not supported by test driver
                    done();
                });
        });
        it("should return the vcpu maximum number supported for a guest VM", (done) => {
            test.hypervisor.getMaxVcpus("kvm", (err, result) => {
                expect(err).to.be.null();
                expect(result).to.not.be.null();
                done();
            });
        });

        it("should allow setting the keep alive interval and count", (done) => {
            // @todo not supported with test driver
            test.hypervisor.setKeepAlive(10, 10, (err, result) => {
                expect(err).to.exist();
                expect(result).to.not.be.ok();
                done();
            });
        });


        [
            {
                name: "defined but inactive domains",
                method: "listDefinedDomains", expected: []
            },
            {
                name: "defined but inactive networks",
                method: "listDefinedNetworks", expected: []
            },
            {
                name: "defined but inactive storage pools",
                method: "listDefinedStoragePools",
                expected: []
            },
            {
                name: "defined but inactive interfaces",
                method: "listDefinedInterfaces", expected: []
            },
            {
                name: "active physical host interfaces",
                method: "listActiveInterfaces", expected: ["eth1"]
            },
            {
                name: "active networks",
                method: "listActiveNetworks", expected: ["default"]
            },
            {
                name: "active storage pools",
                method: "listActiveStoragePools", expected: ["default-pool"]
            },
            {
                name: "network filters",
                method: "listNetworkFilters", disabled: true
            },
            {
                name: "defined secrets (uuids)",
                method: "listSecrets", disabled: true
            }

        ].forEach((testCase) => {
            it(`should list names of ${testCase.name}`, (done) => {
                test.hypervisor[testCase.method]((err, result) => {
                    if (!!testCase.disabled) {
                        expect(err).to.exist();
                        expect(result).to.not.exist();
                    } else {
                        expect(err).to.not.exist();
                        expect(result).to.be.instanceOf(Array);
                        expect(result).to.eql(testCase.expected);
                    }

                    done();
                });
            });
        });

        it.skip("should compute the most feature-rich CPU", (done) => {
            if (semver.lt(test.version, "1.0.0")) {
                return done();
            }

            const cpu1 = h.fixture("cpu1.xml");
            const cpu2 = h.fixture("cpu2.xml");
            const computed_cpu = h.fixture("match_bt_cpu1_and_cpu2.xml");
            const xmlCPUs = [cpu1, cpu2];

            test.hypervisor.getBaselineCPU(xmlCPUs, (err, cpu) => {
                expect(err).to.not.exist();
                expect(cpu).to.exist();
                done();
            });
        });

        it("should compare given cpu description with host CPU", (done) => {
            const cpu = h.fixture("cpu1.xml");

            // NOTE: not supported by test driver
            test.hypervisor.compareCPU(cpu, (err, result) => {
                expect(err).to.exist();
                expect(result).to.not.exist();
                done();
            });
        });

        it("should list active domains ids", (done) => {
            // NOTE: 1 is the default active domain the test driver
            test.hypervisor.listActiveDomains((err, domains) => {
                expect(err).to.not.exist();
                expect(domains).to.eql([1]);
                done();
            });
        });

        [
            {
                name: "defined but inactive domains",
                method: "getNumberOfDefinedDomains", expected: 0
            },
            {
                name: "defined but inactive networks",
                method: "getNumberOfDefinedNetworks", expected: 0
            },
            {
                name: "defined but inactive storage pools",
                method: "getNumberOfDefinedStoragePools", expected: 0
            },
            {
                name: "active domains",
                method: "getNumberOfActiveDomains", expected: 1
            },
            {
                name: "active networks",
                method: "getNumberOfActiveNetworks", expected: 1
            },
            {
                name: "active physical host interfaces",
                method: "getNumberOfActiveInterfaces", expected: 1
            },
            {
                name: "active storage pools",
                method: "getNumberOfActiveStoragePools", expected: 1
            },
            {
                name: "currently defined secrets",
                method: "getNumberOfActiveStoragePools", expected: 1
            },
            {
                name: "network filters",
                method: "getNumberOfNetworkFilters", disabled: true
            },
            {
                name: "currently defined secrets",
                method: "getNumberOfSecrets", disabled: true
            }
        ].forEach((testCase) => {
            it(`should return the number of ${testCase.name}`, (done) => {
                test.hypervisor[testCase.method]((err, count) => {
                    if (!!testCase.disabled) {
                        expect(err).to.exist();
                        expect(count).to.not.exist();
                    } else {
                        expect(err).to.not.exist();
                        expect(count).to.equal(testCase.expected);
                    }

                    done();
                });
            });
        });

    });

    describe("node", () => {
        beforeEach((done) => {
            test.hypervisor = new Hypervisor("test:///default");
            test.hypervisor.connect((err) => {
                expect(err).to.not.exist();
                done();
            });
        });

        afterEach((done) => {
            test.hypervisor.disconnect((err) => {
                expect(err).to.not.exist();
                done();
            });
        });

        it("should list node devices names", (done) => {
            test.hypervisor.listNodeDevices((err, devices) => {
                expect(err).to.not.exist();
                expect(devices).to.exist();
                expect(devices).to.be.instanceOf(Array);
                done();
            });
        });

        it("should return the node security model", (done) => {
            test.hypervisor.getNodeSecurityModel((err, security) => {
                expect(err).to.exist();
                expect(security).to.not.exist();

                // NOTE: not supported by current driver
                // expect(err).to.not.exist();
                // espect(security).to.exist();
                // expect(security.model).to.exist();
                // expect(security.doi).to.exist();
                done();
            });
        });


        it("should return the node information where hypervisor is running", (done) => {
            test.hypervisor.getNodeInfo((err, info) => {
                expect(err).to.not.exist();
                expect(info).to.exist();
                expect(info).to.eql({
                    model: "i686",
                    memory: 3145728,
                    cpus: 16,
                    mhz: 1400,
                    nodes: 2,
                    sockets: 2,
                    cores: 2,
                    threads: 2
                });

                done();
            });
        });

        it.skip("should return free memory of the physical node", (done) => {
            test.hypervisor.getNodeFreeMemory((err, result) => {
                // NOTE: unsupported by test driver
                expect(err).to.exist();
                expect(result).to.not.exist();

                // expect(err).to.not.exist();
                // expect(result).to.exist();
                done();
            });
        });

        it("should return the amount of node free memory in one or more NUMA cells", (done) => {
            const startCell = 0;
            const maxCells = 2;
            test.hypervisor.getNodeCellsFreeMemory(startCell, maxCells, (err, result) => {
                expect(err).to.not.exist();
                expect(result).to.exist();
                expect(result).to.eql([2097152, 4194304]);
                done();
            });
        });

    });

    // it('should register function callbacks for domain events', function(done) {
    //   test.hypervisor.lookupDomainByName('test', function(err, hypervisor) {
    //     expect(err).to.not.exist();
    //     expect(hypervisor).to.be.ok();

    //     var args = {
    //       evtype: test.hypervisor.VIR_DOMAIN_EVENT_ID_LIFECYCLE,
    //       domain: domain,
    //       callback: function(hyp, dom, data) {
    //         expect(data.evtype).to.equal(hyp.VIR_DOMAIN_EVENT_ID_LIFECYCLE);
    //         expect(data.detail).to.equal(dom.VIR_DOMAIN_EVENT_STOPPED_SHUTDOWN);

    //         dom.getName(function(err, name) {
    //           expect(name).to.equal('test');
    //           done();
    //         });
    //       }
    //     };

    //     callback_id = test.hypervisor.registerDomainEvent(args);
    //     domain.shutdown();
    //     assert.eql(hypervisor.unregisterDomainEvent(callback_id), true);
    //   });
    // });

    // 'should unregister callbacks listening for domain events': function(beforeExit, assert) {
    //     var args = { evtype: hypervisor.VIR_DOMAIN_EVENT_ID_LIFECYCLE,
    //                  callback: function(hyp, dom, evtype, detail) {}
    //                 };

    //     callback_id = hypervisor.registerDomainEvent(args);
    //     assert.eql(hypervisor.unregisterDomainEvent(callback_id), true);
    // },


});
