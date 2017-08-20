const {
    is,
    semver,
    virtualization: { libvirt }
} = adone;
const { Hypervisor } = libvirt;

const SegfaultHandler = require("segfault-handler");
const h = require("./lib/helper");
const xpath = require("xpath");
const Dom = require("xmldom").DOMParser;

const test = {};

const getMetadataFromXml = (test, callback) => {
    test.domain.toXml((err, xml) => {
        if (err) {
            callback(err);
        } else {
            const doc = new Dom().parseFromString(xml);
            const nodes = xpath.select("//metadata/*", doc);
            expect(nodes.length).to.be.below(2);
            xml = nodes.length === 1 ? nodes[0].toString() : undefined;
            callback(null, xml);
        }
    });
};

const verifyMetadata = (test, expectedFromApi, expectedFromXml, namespaceUri, done) => {
    test.domain.getMetadata(libvirt.VIR_DOMAIN_METADATA_ELEMENT, namespaceUri, 0, (err, xml) => {
        if (is.null(expectedFromApi)) {
            expect(err).to.exist;
            expect(xml).to.be.undefined;
        } else {
            expect(err).to.not.exist;
            xml = xml.replace(/"/g, "'");
            expect(xml).to.equal(expectedFromApi);
        }
        getMetadataFromXml(test, (err, xml) => {
            expect(err).to.not.exist;
            if (is.null(expectedFromXml)) {
                expect(xml).to.be.undefined;
            } else {
                xml = xml.replace(/"/g, "'");
                expect(xml).to.equal(expectedFromXml);
            }
            done();
        });
    });
};

const testText = (test, field, str, shouldPass, done) => {
    test.domain.setMetadata(field, str, null, null, 0, (err) => {
        if (err) {
            if (shouldPass) {
                expect(err).to.not.exist;
            } else {
                expect(err).to.exist;
            }
            done();
        } else {
            test.domain.getMetadata(field, null, 0, (err, md) => {
                // value not present is returned as "error" (and so undefined)
                if (!is.null(str)) {
                    expect(err).to.not.exist;
                } else {
                    str = undefined;
                }
                expect(md).to.equal(str);
                done();
            });
        }
    });
};

describe("virtualization", "libvirt", "Domain", () => {
    before(() => {
        SegfaultHandler.registerHandler();
        return h.getLibVirtVersion()
            .then((version) => {
                test.version = version;
            });
    });

    describe("metadata methods", () => {
        beforeEach((done) => {
            test.hypervisor = new Hypervisor("test:///default");
            test.hypervisor.connect((err) => {
                expect(err).to.not.exist;

                test.hypervisor.lookupDomainById(1, (err, domain) => {
                    expect(err).to.not.exist;
                    expect(domain).to.exist;
                    expect(domain._parent).to.exist;
                    test.domain = domain;
                    done();
                });
            });
        });

        afterEach((done) => {
            test.hypervisor.disconnect((err) => {
                expect(err).to.not.exist;
                done();
            });
        });

        it("should set domain element metadata", (done) => {
            if (semver.lt(test.version, "0.9.10")) {
                return done();
            }
            let metadata1 = h.fixture("metadata1.xml");
            metadata1 = metadata1.trim();
            let metadata1Ns = h.fixture("metadata1_ns.xml");
            metadata1Ns = metadata1Ns.trim();
            test.domain.setMetadata(libvirt.VIR_DOMAIN_METADATA_ELEMENT, metadata1, "herp", "http://herp.derp/", 0,
                (err) => {
                    expect(err).to.not.exist;
                    verifyMetadata(test, metadata1, metadata1Ns, "http://herp.derp/", done);
                }
            );
        });

        it("should rewrite domain element metadata", (done) => {
            if (semver.lt(test.version, "0.9.10")) {
                return done();
            }
            let metadata2 = h.fixture("metadata2.xml");
            metadata2 = metadata2.trim();
            let metadata2Ns = h.fixture("metadata2_ns.xml");
            metadata2Ns = metadata2Ns.trim();
            test.domain.setMetadata(libvirt.VIR_DOMAIN_METADATA_ELEMENT, metadata2, "blurb", "http://herp.derp/", 0,
                (err) => {
                    expect(err).to.not.exist;
                    verifyMetadata(test, metadata2, metadata2Ns, "http://herp.derp/", done);
                }
            );
        });

        it("should erase domain element metadata", (done) => {
            if (semver.lt(test.version, "0.9.10")) {
                return done();
            }
            test.domain.setMetadata(libvirt.VIR_DOMAIN_METADATA_ELEMENT, null, "", "http://herp.derp/", 0,
                (err) => {
                    expect(err).to.not.exist;
                    verifyMetadata(test, null, null, "http://herp.derp/", done);
                }
            );
        });

        const titleTests = [
            [1, "qwert", true],
            [2, null, true],
            [3, "blah", true],
            [4, "qwe\nrt", false],
            [5, "", true],
            [6, "qwert\n", false],
            [7, "\n", false]
        ];

        titleTests.forEach((tt) => {
            it(`should manipulate the title test#${tt[0]}`, (done) => {
                if (semver.lt(test.version, "0.9.10")) {
                    return done();
                }
                testText(test, libvirt.VIR_DOMAIN_METADATA_TITLE, tt[1], tt[2], done);
            });
        });

        const descriptionTests = [
            [1, "qwert\nqwert"],
            [2, null],
            [3, ""],
            [4, "qwert"],
            [5, "\n"],
            [6, "qwert\n"],
            [7, "\nqwert"]
        ];

        descriptionTests.forEach((tt) => {
            it(`should manipulate the description test#${tt[0]}`, (done) => {
                if (semver.lt(test.version, "0.9.10")) {
                    return done();
                }
                testText(test, libvirt.VIR_DOMAIN_METADATA_DESCRIPTION, tt[1], true, done);
            });
        });
    });
});
