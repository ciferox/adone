require("./node.setup");

const adapters = ["local", "http"];
const repl_adapters = [
    ["local", "http"],
    ["http", "http"],
    ["http", "local"],
    ["local", "local"]
];

/* jshint maxlen:false */
const icons = [
    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAABIAAAASABGyWs+AAAACXZwQWcAAAAQAAAAEABcxq3DAAAC8klEQVQ4y6WTS2hcZQCFv//eO++ZpDMZZjKdZB7kNSUpeWjANikoWiMUtEigBdOFipS6Ercu3bpTKF23uGkWBUGsoBg1KRHapjU0U81rpp3ESdNMZu6dx70zc38XdSFYVz1wNmdxzuKcAy8I8RxNDfs705ne5FmX0+mXUtK0mka2kLvxRC9vAe3nGmRiCQ6reux4auDi6ZenL0wOjaa6uoKK2+kgv1O0l1dvby/8/tvVe1t/XAn6ArvZ3fyzNIBjsQS5YiH6/ul3v/z0/AcfTx8fC24+zgvV4SXccYTtYlGM9MSDMydee1W27OQPd5d+Hujure4bZRQVeLCTY2p44tJ7M2/Pjg1lOLQkXy2scP3OQ1b3Snzx3SK/PCoxOphh7q13ZqeGJy492MmhAkoyHMUlRN8b4yfnBnqSWLqJItzkXZPoWhzF4WZdjGJ6+7H0OoPxFG9OnppzCtGXCEdRZ16axu1yffjRmfPnYqEw7WIdj1OlO6wx1e0g7hckO1ReH4wSrkgUVcEfDITub6w9Gus7tqS4NAcOVfMpCFq2jdrjwxv2cG48SejPFe59/gmnyuuMHA0ien0oR1x0BgJ4XG5fwO9Hk802sm3TbFiYVhNNU1FUBYCBsRNEmiad469gYyNUgRDPipNIQKKVajo1s1F9WjqgVjZQELg9Ek3TUFNHCaXnEEiQEvkPDw4PqTfMalk3UKt1g81ioRgLRc6MxPtDbdtGKgIhBdgSKW2kLWm327SaLayGxfzCzY2vf/zms0pVLyn7lQOadbmxuHb7WrawhW220J+WKZXK6EaNsl7F0GsYep1q3eTW6grfLv90zZRyI7dfRDNtSPdE+av05PL8re+HgdlMPI2wJXrDRAACgdVusfZ4k+uLN+eXs/cvp7oitP895UQogt6oxYZiiYsnMxMXpjPjqaC/QwEoGRX71+yd7aXs3asPd/NXAm7vbv5g7//P1OHxpvsj8bMep8sPULdMY32vcKNSr/3nTC+MvwEdhUhhkKTyPgAAAEJ0RVh0Y29tbWVudABGaWxlIHNvdXJjZTogaHR0cDovL3d3dy5zc2J3aWtpLmNvbS9GaWxlOktpcmJ5SGVhZFNTQkIucG5nSbA1rwAAACV0RVh0Y3JlYXRlLWRhdGUAMjAxMC0xMi0xNFQxNjozNDoxMCswMDowMDpPBjcAAAAldEVYdG1vZGlmeS1kYXRlADIwMTAtMTAtMDdUMjA6NTA6MzYrMDA6MDCjC6s7AAAAAElFTkSuQmCC",
    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAC3ElEQVQ4jX2SX2xTdRzFP/d3f5d7u7ZbGes6LyAFWSiNmbMuSqb4wgxGVMiYT/BkNPMNfV1MDAFfNDHxwWSJU4wsMsKLEhI3gmE0JHO6FTBzMrZlS3V3Qun+sG70tvePD4ZlI8BJvi/fc/LN9+QceAIanm1oa2xo7HuSRn0c0dUq5fbd2teerLRHxqzuhzjDEs+0VYSrT4vHHbAW1ZrWg9aeYweurdv3vCsTL7Yy+GmHfcb3/Qn5T49MCYMW85Dz2Vphdl6jWPLJjmAOfSN/QsFY+ZdfNic5tuUFzLEfZjOLi1Xt5C7J44VJ6V/9Up546M0NFz/Xhp070l8789elf65DH3wvFYoACK2KNiMMz79Nx9ojEZOWP/Lx1NCv/7v8fTDK0fe34QF/ZsS5rkxhAUC4ZZJeGfQgovFNPu4+KtsAYsWad+rjM1TqHvcsqNmUY59pow/HqI07b62msEtqwijzku4inXmorqXllWpxybgb3f/akVLi7lAJ60KA+gMOTTcSWKc1rgZyi1f+8joB1PPDbn85W/GzYxOL1XgJaRDoTW9ID8ysnKyK24dSh/3auoSGUuGQFxb2UzlERL19Nu12AkiArkwhA6HDT29yLi+j1s3Oih/royUZjXihYg5W7txH5EGrhI17wMy6yWRUT47m7NHVHmypcirnl8SO6pBnNiWdr4q6+kZksxI3oiDCsLwE9/LARlguIm/lXbmuif3TTjG4Ejj724RbDuleezimbHv1dW/rrTQE62ByRLC8AJ4C2SkIIiauTbsD65rYlSlYp9LlTy5muBkx/WYZgMQ++HtcsGunR33S5+Y4NKcgHFQAeGSV09PsnZtRuu05uD8LZsDDXgDXhubd0DfAaM9l7/t1FtbC871Sbk5MbdX5oHwbOs+ovVPj9C7N0VhyUfv61Q/7x0qDqyk8CnURZcdkzufbC0p7bVn77otModRkGqdefs79qOj7xgPdf3d0KpBuuY7dAAAAAElFTkSuQmCC",
    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABZ0RVh0Q3JlYXRpb24gVGltZQAwMS8wNy8wOCumXF8AAAAfdEVYdFNvZnR3YXJlAE1hY3JvbWVkaWEgRmlyZXdvcmtzIDi1aNJ4AAADHElEQVQ4EYXBe0wUBADH8R/CcSccQnfcIcbrXgRixKPSMIxklU4tJOUfyflIcmVJzamTVjJrJIRa6OZ4DmGMwSoEfKIVkcTC5qNRmqxpuki3VFiIjMc33fijka3PR/o3s7/R+Hl8QTgpxz2kHHWTuC8Cf7PxlCSr/ke0Ndrc5ioPJejONHxHjfiOGAkYNuNqDMX2WEC3pCf0H2LMScbLMcciiB0KJGbcwMy7RmYOG4kdMxA7EkBsRySB6X43JM3TJD6aoT3OvOlsPxVNX+807oyJ/rtiYFgMI271mdjdEcMjhQ8jl1eNpEDdV/PugrajpZu/ejndwafvpdB/1sHtS+EM/m4BBGNTuNCawPk2B6M3jNRXRvJSmpOG4je7Gj5Yekw7spLPXe8s42xdMfXvuzh3OIHerihADP1poeuQP0f2vMbX5fmcbnHS3eDg+6oCbp+ppWjV3Iu6Lzf10fzGotnUFVmp2pBGX3sS54+7KXsribq8V/nrl2aun66gfOOLnKx0cqLqKTalP14iyaQJ7uwsH/p7oli/OJV31q7i7bREmovfYPBSE83FG1m37BVWL17I1W8cbMn1RdIz+ofpCdHBtcvnhIxXf5zLjjLI23qQ4StNjF5rpSi/ltyd0FK9k8xk23hqQuhBSW49QGlOZjwdpZ8w2NsDV9vh8klGfvuJzuoytq6cjTTlM0l+msT0kMu6u/Bw3uBHza+zaJmFwsol7G3MoaRxHbtqMslcYWNb1Qr2dxYMRSSFV0iyaoItLjrizIUf6znRuZ/EjCie3+5iXomTZw+EMb82jNQSB8996CYxI5za5gKuXDvE00/O6pXk0T3BnoiQ75r2bSNnw3JU5sWc9iCy17j441cTQzcN5Kx3kdpqxesLsXTtCxwpzyc5ztEjyaUJBkmrJR0wxHtjrQjC+XMIK2/5kjPgg/uiHXuDBUOKN5JaJK2RFKhJkrItQTe7Z8SRNTUMc6QBebx+kMfrW98obxaZQ+mwz2KTLXhA0hI9gGuuv3/TZruNDL9grDKVS5qqe8wyFC00Wdlit7MgIOBLSYma8DfYI5E1lrjnEQAAAABJRU5ErkJggg==",
    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAB1klEQVR42n2TzytEURTHv3e8N1joRhZGzJsoCjsLhcw0jClKWbHwY2GnLGUlIfIP2IjyY2djZTHSMJNQSilFNkz24z0/Ms2MrnvfvMu8mcfZvPvuPfdzz/mecwgKLNYKb0cFEgXbRvwV2s2HuWazCbzKA5LvNecDXayBjv9NL7tEpSNgbYzQ5kZmAlSXgsGGXmS+MjhKxDHgC+quyaPKQtoPYMQPOh5U9H6tBxF+Icy/aolqAqLP5wjWd5r/Ip3YXVILrF4ZRYAxDhCOJ/yCwiMI+/xgjOEzmzIhAio04GeGayIXjQ0wGoAuQ5cmIjh8jNo0GF78QwNhpyvV1O9tdxSSR6PLl51FnIK3uQ4JJQME4sCxCIRxQbMwPNSjqaobsfskm9l4Ky6jvCzWEnDKU1ayQPe5BbN64vYJ2vwO7CIeLIi3ciYAoby0M4oNYBrXgdgAbC/MhGCRhyhCZwrcEz1Ib3KKO7f+2I4iFvoVmIxHigGiZHhPIb0bL1bQApFS9U/AC0ulSXrrhMotka/lQy0Ic08FDeIiAmDvA2HX01W05TopS2j2/H4T6FBVbj4YgV5+AecyLk+CtvmsQWK8WZZ+Hdf7QGu7fobMuZHyq1DoJLvUqQrfM966EU/qYGwAAAAASUVORK5CYII=",
    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAEG0lEQVQ4EQEQBO/7AQAAAAAAAAAAAAAAAAAAAACmm0ohDxD8bwT//ksOBPAhAAAAAPL8EN8IDQLB5eQEhVpltt8AAAAAAAAAAAAAAAABAAAAAAAAAACHf0UGKSgBgygY7m/w4O8F5t71ABMaCQAPEAQAAAAAAPwEBgAMFAn74/ISnunoA3RcZ7f2AAAAAAEAAAAAh39FBjo4AZYTAOtf1sLmAvb1+gAAAAAALzsVACEn+wAAAAAA/f4G/+LcAgH9AQIA+hAZpuDfBmhaZrb1AwAAAABtaCSGHAjraf///wD47/kB9vX7AAAAAAAYHgsAERT+AAAAAAACAf0BERT/AAQHB/746/IuBRIMFfL3G8ECpppKHigY7m/68vcCHRv0AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//0ADgvzAgP//gAWBe1hUEgMOgIKDfxr9Oz3BRsiAf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHCP///zu8gMjIftYAgkD/1ID//4ABwb6Af//AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFBPwBAAAAAAP0710CDgTvIQD//QAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//QD8BAYADQv//gQAAAAAAAAAAAAAAgABAf4AAAAAAAAAAAAAAAAAAAAAAAABAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//gAAAAAABPL7D+D57Owh0MQAAAAAAAD08/sAAAAAAAAAAADj2fQA8ewGAAAAAAAAAAAAAAAAAAAAAAAAAAAA+/r1AAwECwIEAggDugsNBGcAAAAAAwMBAO7o+AAAAAAAAAAAAAgKBAAOEAUAAAAAAAAAAAAAAAAAAAAAAAAAAADz8vwA/QwRowTr6gSLHSQQYvfr9QUhJ/sA6OEEAPPy+QAAAAAAFR0IACEn+wAAAAAAAAAAAAAAAAAAAAAA4+YP/g0OAgDT3wWoAlpltt/d7BKYBAwH/uTmDf4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPL1Df798fUC+AgSqMfL9sICAAAAAOblAHXzBRSo////APTz+wD//wAAAAAAAAAAAAAAAAAAAAEBAP3+Bv/j5g/+7uL3AukDH97g3wZomJzA9wMAAAAAs7jd/kE8J7n9BwoSJSgGMQYD/wL++/8ABAUCAPb1BQDw7AIA8e8DAQAFBf/0DBqj6OgGTlpmtvUAAAAAAQAAAAAAAAAAAAAAAFFRPg1SSAwbGxv8cQn67mMHBf7/AwL/APb5AwH/DRCn294GpMLH9sKdoMD3AAAAAAAAAABEawlCEphz4AAAAABJRU5ErkJggg=="
];

const iconDigests = [
    "md5-Mf8m9ehZnCXC717bPkqkCA==",
    "md5-fdEZBYtnvr+nozYVDzzxpA==",
    "md5-ImDARszfC+GA3Cv9TVW4HA==",
    "md5-hBsgoz3ujHM4ioa72btwow==",
    "md5-jDUyV6ySnTVANn2qq3332g=="
];

const iconLengths = [1047, 789, 967, 527, 1108];

adapters.forEach((adapter) => {
    describe(`suite2 test.attachments.js-${adapter}`, () => {

        const dbs = {};

        beforeEach((done) => {
            dbs.name = testUtils.adapterUrl(adapter, "testdb");
            testUtils.cleanup([dbs.name], done);
        });

        after((done) => {
            testUtils.cleanup([dbs.name], done);
        });

        const binAttDoc = {
            _id: "bin_doc",
            _attachments: {
                "foo.txt": {
                    content_type: "text/plain",
                    data: "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ="
                }
            }
        };
        // empty attachment
        const binAttDoc2 = {
            _id: "bin_doc2",
            _attachments: {
                "foo.txt": {
                    content_type: "text/plain",
                    data: ""
                }
            }
        };
        // json string doc
        const jsonDoc = {
            _id: "json_doc",
            _attachments: {
                "foo.json": {
                    content_type: "application/json",
                    data: "eyJIZWxsbyI6IndvcmxkIn0="
                }
            }
        };
        const pngAttDoc = {
            _id: "png_doc",
            _attachments: {
                "foo.png": {
                    content_type: "image/png",
                    data: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAMFBMVEX+9+" +
                    "j+9OD+7tL95rr93qT80YD7x2L6vkn6syz5qRT4ogT4nwD4ngD4nQD4nQD4" +
                    "nQDT2nT/AAAAcElEQVQY002OUQLEQARDw1D14f7X3TCdbfPnhQTqI5UqvG" +
                    "OWIz8gAIXFH9zmC63XRyTsOsCWk2A9Ga7wCXlA9m2S6G4JlVwQkpw/Ymxr" +
                    "UgNoMoyxBwSMH/WnAzy5cnfLFu+dK2l5gMvuPGLGJd1/9AOiBQiEgkzOpg" +
                    "AAAABJRU5ErkJggg=="
                }
            }
        };

        it("3357 Attachment names cant start with _", () => {
            const db = new PouchDB(dbs.name);
            const doc = {
                _id: "baz", _attachments: {
                    "_text1.txt": {
                        content_type: "text/plain",
                        data: testUtils.btoa("text1")
                    }
                }
            };
            return db.put(doc).then(() => {
                throw "Should not succeed";
            }).catch((err) => {
                assert.equal(err.name, "bad_request");
            });
        });

        it("5736 warning for putAttachment without content_type", () => {
            const db = new PouchDB(dbs.name);
            return db.putAttachment("bar", "baz.txt", testUtils.btoa("text"), "");
        });

        it("5736 warning for bulkDocs attachments without content_type", () => {
            const db = new PouchDB(dbs.name);
            const doc = {
                _attachments: {
                    "att.txt": {
                        data: testUtils.btoa("well")
                    }
                }
            };
            return db.bulkDocs([doc]);
        });

        it("fetch atts with open_revs and missing", () => {
            const db = new PouchDB(dbs.name);
            const doc = {
                _id: "frog",
                _rev: "1-x",
                _revisions: {
                    start: 1,
                    ids: ["x"]
                },
                _attachments: {
                    "foo.txt": {
                        content_type: "text/plain",
                        data: ""
                    }
                }
            };
            return db.bulkDocs({
                docs: [doc],
                new_edits: false
            }).then(() => {
                return db.get("frog", {
                    revs: true,
                    open_revs: ["1-x", "2-fake"],
                    attachments: true
                });
            }).then((res) => {
                // there should be exactly one "ok" result
                // and one result with attachments
                assert.lengthOf(res.filter((x) => {
                    return x.ok;
                }), 1);
                assert.lengthOf(res.filter((x) => {
                    return x.ok && x.ok._attachments;
                }), 1);
            });
        });

        it("issue 2803 should throw 412", () => {
            const db = new PouchDB(dbs.name);
            return db.put(binAttDoc).then(() => {
                return db.get(binAttDoc._id);
            }).then((doc) => {
                doc._attachments["bar.txt"] = {
                    stub: true,
                    digest: "md5-sorryIDoNotReallyExist=="
                };
                return db.put(doc);
            }).then((res) => {
                assert.isUndefined(res, "should throw");
            }).catch((err) => {
                assert.exists(err.status, `got improper error: ${err}`);
                assert.equal(err.status, 412);
            });
        });

        it("issue 2803 should throw 412 part 2", () => {
            const stubDoc = {
                _id: "stubby",
                _attachments: {
                    "foo.txt": {
                        content_type: "text/plain",
                        digest: "md5-aEI7pOYCRBLTRQvvqYrrJQ==",
                        stub: true
                    }
                }
            };
            const db = new PouchDB(dbs.name);
            return db.put(stubDoc).then((res) => {
                assert.isUndefined(res, "should throw");
            }).catch((err) => {
                assert.exists(err.status, `got improper error: ${err}`);
                assert.equal(err.status, 412, `got improper error: ${err}`);
            });
        });

        it("issue 2803 should throw 412 part 3", () => {
            const db = new PouchDB(dbs.name);
            return db.put(binAttDoc).then(() => {
                return db.get(binAttDoc._id);
            }).then((doc) => {
                doc._attachments["foo.json"] = jsonDoc._attachments["foo.json"];
            }).then(() => {
                return db.get(binAttDoc._id);
            }).then((doc) => {
                doc._attachments["bar.txt"] = {
                    stub: true,
                    digest: "md5-sorryIDoNotReallyExist=="
                };
                return db.put(doc);
            }).then((res) => {
                assert.isUndefined(res, "should throw");
            }).catch((err) => {
                assert.exists(err.status, `got improper error: ${err}`);
                assert.equal(err.status, 412);
            });
        });

        it("issue 2803 should throw 412 part 4", () => {
            const db = new PouchDB(dbs.name);
            return db.put(binAttDoc).then(() => {
                return db.get(binAttDoc._id);
            }).then((doc) => {
                doc._attachments["foo.json"] = jsonDoc._attachments["foo.json"];
            }).then(() => {
                return db.get(binAttDoc._id);
            }).then((doc) => {
                doc._attachments["bar.txt"] = {
                    stub: true,
                    digest: "md5-sorryIDoNotReallyExist=="
                };
                doc._attachments["baz.txt"] = {
                    stub: true,
                    digest: "md5-yahNoIDoNotExistEither=="
                };
                return db.put(doc);
            }).then((res) => {
                assert.isUndefined(res, "should throw");
            }).catch((err) => {
                assert.exists(err.status, `got improper error: ${err}`);
                assert.equal(err.status, 412);
            });
        });

        it("#2858 {binary: true} in get()", () => {
            const db = new PouchDB(dbs.name);
            const docs = [binAttDoc, binAttDoc2, pngAttDoc];
            return db.bulkDocs(docs).then(() => {
                return testUtils.Promise.all(docs.map((doc) => {
                    const attName = Object.keys(doc._attachments)[0];
                    const expected = doc._attachments[attName];
                    return db.get(doc._id, {
                        attachments: true,
                        binary: true
                    }).then((savedDoc) => {
                        const att = savedDoc._attachments[attName];
                        assert.isUndefined(att.stub);
                        assert.exists(att.digest);
                        assert.equal(att.content_type, expected.content_type);
                        assert.isNotString(att.data);
                        assert.equal(att.data.type, expected.content_type);
                        return testUtils.readBlobPromise(att.data);
                    }).then((bin) => {
                        assert.equal(testUtils.btoa(bin), expected.data);
                    });
                }));
            });
        });

        it("#2858 {binary: true} in allDocs() 1", () => {
            const db = new PouchDB(dbs.name);
            const docs = [binAttDoc, binAttDoc2, pngAttDoc, { _id: "foo" }];
            return db.bulkDocs(docs).then(() => {
                return testUtils.Promise.all(docs.map((doc) => {
                    const atts = doc._attachments;
                    const attName = atts && Object.keys(atts)[0];
                    const expected = atts && atts[attName];
                    return db.allDocs({
                        key: doc._id,
                        attachments: true,
                        binary: true,
                        include_docs: true
                    }).then((res) => {
                        assert.lengthOf(res.rows, 1);
                        const savedDoc = res.rows[0].doc;
                        if (!atts) {
                            assert.isUndefined(savedDoc._attachments);
                            return;
                        }
                        const att = savedDoc._attachments[attName];
                        assert.isUndefined(att.stub);
                        assert.exists(att.digest);
                        assert.equal(att.content_type, expected.content_type);
                        assert.isNotString(att.data);
                        assert.equal(att.data.type, expected.content_type);
                        return testUtils.readBlobPromise(att.data).then((bin) => {
                            assert.equal(testUtils.btoa(bin), expected.data);
                        });
                    });
                }));
            });
        });

        it("#2858 {binary: true} in allDocs() 2", () => {
            const db = new PouchDB(dbs.name);
            const docs = [binAttDoc, binAttDoc2, pngAttDoc, { _id: "foo" }];
            return db.bulkDocs(docs).then(() => {
                return db.allDocs({
                    include_docs: true,
                    attachments: true,
                    binary: true
                }).then((res) => {
                    const savedDocs = res.rows.map((x) => {
                        return x.doc;
                    });
                    return testUtils.Promise.all(docs.map((doc) => {
                        const atts = doc._attachments;
                        const attName = atts && Object.keys(atts)[0];
                        const expected = atts && atts[attName];
                        const savedDoc = savedDocs.filter((x) => {
                            return x._id === doc._id;
                        })[0];
                        if (!atts) {
                            assert.isUndefined(savedDoc._attachments);
                            return;
                        }
                        const att = savedDoc._attachments[attName];
                        assert.isUndefined(att.stub);
                        assert.exists(att.digest);
                        assert.equal(att.content_type, expected.content_type);
                        assert.isNotString(att.data);
                        assert.equal(att.data.type, expected.content_type);
                        return testUtils.readBlobPromise(att.data).then((bin) => {
                            assert.equal(testUtils.btoa(bin), expected.data);
                        });
                    }));
                });
            });
        });

        it("#2858 {binary: true} in allDocs() 3", () => {
            const db = new PouchDB(dbs.name);
            const docs = [binAttDoc, binAttDoc2, pngAttDoc,
                { _id: "bar" },
                { _id: "foo", _deleted: true }];
            return db.bulkDocs(docs).then(() => {
                return db.allDocs({
                    include_docs: true,
                    attachments: true,
                    binary: true
                }).then((res) => {
                    assert.lengthOf(res.rows, 4);
                    const savedDocs = res.rows.map((x) => {
                        return x.doc;
                    });
                    return testUtils.Promise.all(docs.filter((doc) => {
                        return !doc._deleted;
                    }).map((doc) => {
                        const atts = doc._attachments;
                        const attName = atts && Object.keys(atts)[0];
                        const expected = atts && atts[attName];
                        const savedDoc = savedDocs.filter((x) => {
                            return x._id === doc._id;
                        })[0];
                        if (!atts) {
                            assert.isUndefined(savedDoc._attachments);
                            return;
                        }
                        const att = savedDoc._attachments[attName];
                        assert.isUndefined(att.stub);
                        assert.exists(att.digest);
                        assert.equal(att.content_type, expected.content_type);
                        assert.isNotString(att.data);
                        assert.equal(att.data.type, expected.content_type);
                        return testUtils.readBlobPromise(att.data).then((bin) => {
                            assert.equal(testUtils.btoa(bin), expected.data);
                        });
                    }));
                });
            });
        });

        it("#2858 {binary: true} in allDocs() 4", () => {
            const db = new PouchDB(dbs.name);
            const docs = [binAttDoc, binAttDoc2, pngAttDoc,
                { _id: "bar" },
                { _id: "foo", _deleted: true }];
            return db.bulkDocs(docs).then(() => {
                return db.allDocs({
                    attachments: true,
                    binary: true
                }).then((res) => {
                    assert.lengthOf(res.rows, 4);
                    res.rows.forEach((row) => {
                        assert.isUndefined(row.doc);
                    });
                    return db.allDocs({
                        binary: true
                    });
                }).then((res) => {
                    assert.lengthOf(res.rows, 4);
                    res.rows.forEach((row) => {
                        assert.isUndefined(row.doc);
                    });
                });
            });
        });

        it("#2858 {binary: true} in allDocs() 5", () => {
            const db = new PouchDB(dbs.name);
            const docs = [binAttDoc, binAttDoc2, pngAttDoc,
                { _id: "bar" },
                { _id: "foo", deleted: true }];
            return db.bulkDocs(docs).then(() => {
                return db.allDocs({
                    keys: [
                        binAttDoc._id, binAttDoc2._id, pngAttDoc._id, "foo", "bar"
                    ],
                    attachments: true,
                    binary: true,
                    include_docs: true
                }).then((res) => {
                    assert.lengthOf(res.rows, 5);

                    return testUtils.Promise.all(res.rows.map((row, i) => {
                        if (docs[i]._deleted) {
                            assert.isUndefined(row.doc);
                            return;
                        }
                        const atts = docs[i]._attachments;
                        const attName = atts && Object.keys(atts)[0];
                        const expected = atts && atts[attName];
                        const savedDoc = row.doc;
                        if (!atts) {
                            assert.isUndefined(savedDoc._attachments);
                            return;
                        }
                        const att = savedDoc._attachments[attName];
                        assert.isUndefined(att.stub);
                        assert.exists(att.digest);
                        assert.equal(att.content_type, expected.content_type);
                        assert.isNotString(att.data);
                        assert.equal(att.data.type, expected.content_type);
                        return testUtils.readBlobPromise(att.data).then((bin) => {
                            assert.equal(testUtils.btoa(bin), expected.data);
                        });
                    }));
                });
            });
        });

        it("#2858 {binary: true} in allDocs(), many atts", () => {
            const db = new PouchDB(dbs.name);
            const docs = [
                {
                    _id: "baz", _attachments: {
                        "text1.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text1")
                        },
                        "text2.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text2")
                        }
                    }
                },
                {
                    _id: "foo", _attachments: {
                        "text5.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text5")
                        }
                    }
                },
                {
                    _id: "quux", _attachments: {
                        "text3.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text3")
                        },
                        "text4.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text4")
                        }
                    }
                },
                {
                    _id: "zob", _attachments: {
                        "text6.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text3")
                        }
                    }
                },
                {
                    _id: "zorb", _attachments: {
                        "text2.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text2")
                        },
                        "text3.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text3")
                        }
                    }
                }
            ];
            return db.bulkDocs(docs).then(() => {
                return db.allDocs({
                    attachments: true,
                    binary: true,
                    include_docs: true
                }).then((res) => {
                    assert.lengthOf(res.rows, 5);

                    return testUtils.Promise.all(res.rows.map((row) => {
                        const doc = docs.filter((x) => {
                            return x._id === row.id;
                        })[0];
                        const atts = doc._attachments;
                        const attNames = Object.keys(atts);
                        return testUtils.Promise.all(attNames.map((attName) => {
                            const expected = atts && atts[attName];
                            const savedDoc = row.doc;
                            const att = savedDoc._attachments[attName];
                            assert.isUndefined(att.stub);
                            assert.exists(att.digest);
                            assert.equal(att.content_type, expected.content_type);
                            assert.isNotString(att.data);
                            assert.equal(att.data.type, expected.content_type);
                            return testUtils.readBlobPromise(att.data).then((bin) => {
                                assert.equal(testUtils.btoa(bin), expected.data);
                            });
                        }));
                    }));
                });
            });
        });

        it("#2858 {binary: true} in allDocs(), mixed atts", () => {
            const db = new PouchDB(dbs.name);
            const docs = [
                {
                    _id: "baz", _attachments: {
                        "text1.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text1")
                        },
                        "text2.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text2")
                        }
                    }
                },
                {
                    _id: "foo", _attachments: {
                        "text5.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text5")
                        }
                    }
                },
                { _id: "imdeleted", _deleted: true },
                {
                    _id: "quux", _attachments: {
                        "text3.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text3")
                        },
                        "text4.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text4")
                        }
                    }
                },
                { _id: "imempty" },
                {
                    _id: "zob", _attachments: {
                        "text6.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text3")
                        }
                    }
                },

                { _id: "imempty2" },
                {
                    _id: "zorb", _attachments: {
                        "text2.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text2")
                        },
                        "text3.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text3")
                        }
                    }
                },
                {
                    _id: "imkindaempty", _attachments: {
                        "text0.txt": {
                            content_type: "text/plain",
                            data: ""
                        }
                    }
                }
            ];
            return db.bulkDocs(docs).then(() => {
                return db.allDocs({
                    attachments: true,
                    binary: true,
                    include_docs: true
                }).then((res) => {
                    assert.lengthOf(res.rows, 8);

                    return testUtils.Promise.all(res.rows.map((row) => {
                        const doc = docs.filter((x) => {
                            return x._id === row.id;
                        })[0];
                        if (doc._deleted) {
                            assert.isUndefined(row.doc);
                            return;
                        }
                        const atts = doc._attachments;
                        if (!atts) {
                            assert.isUndefined(row.doc._attachments);
                            return;
                        }
                        const attNames = Object.keys(atts);
                        return testUtils.Promise.all(attNames.map((attName) => {
                            const expected = atts && atts[attName];
                            const savedDoc = row.doc;
                            const att = savedDoc._attachments[attName];
                            assert.isUndefined(att.stub);
                            assert.exists(att.digest);
                            assert.equal(att.content_type, expected.content_type);
                            assert.isNotString(att.data);
                            assert.equal(att.data.type, expected.content_type);
                            return testUtils.readBlobPromise(att.data).then((bin) => {
                                assert.equal(testUtils.btoa(bin), expected.data);
                            });
                        }));
                    }));
                });
            });
        });

        it("#2858 {binary: true} in changes() non-live", () => {
            const db = new PouchDB(dbs.name);
            const docs = [binAttDoc, binAttDoc2, pngAttDoc,
                { _id: "bar" },
                { _id: "foo", deleted: true }];
            return db.bulkDocs(docs).then(() => {
                return db.changes({
                    attachments: true,
                    binary: true,
                    include_docs: true
                }).then((res) => {
                    assert.lengthOf(res.results, 5);

                    return testUtils.Promise.all(res.results.map((row) => {
                        const doc = docs.filter((x) => {
                            return x._id === row.id;
                        })[0];
                        if (doc._deleted) {
                            assert.isUndefined(row.doc);
                            return;
                        }
                        const atts = doc._attachments;
                        const attName = atts && Object.keys(atts)[0];
                        const expected = atts && atts[attName];
                        const savedDoc = row.doc;
                        if (!atts) {
                            assert.isUndefined(savedDoc._attachments);
                            return;
                        }
                        const att = savedDoc._attachments[attName];
                        assert.isUndefined(att.stub);
                        assert.exists(att.digest);
                        assert.equal(att.content_type, expected.content_type);
                        assert.isNotString(att.data);
                        assert.equal(att.data.type, expected.content_type);
                        return testUtils.readBlobPromise(att.data).then((bin) => {
                            assert.equal(testUtils.btoa(bin), expected.data);
                        });
                    }));
                });
            });
        });

        it("#2858 {binary: true} in changes() non-live, many atts", () => {
            const db = new PouchDB(dbs.name);
            const docs = [
                {
                    _id: "baz", _attachments: {
                        "text1.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text1")
                        },
                        "text2.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text2")
                        }
                    }
                },
                {
                    _id: "foo", _attachments: {
                        "text5.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text5")
                        }
                    }
                },
                {
                    _id: "quux", _attachments: {
                        "text3.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text3")
                        },
                        "text4.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text4")
                        }
                    }
                },
                {
                    _id: "zob", _attachments: {
                        "text6.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text3")
                        }
                    }
                },
                {
                    _id: "zorb", _attachments: {
                        "text2.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text2")
                        },
                        "text3.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text3")
                        }
                    }
                }
            ];
            return db.bulkDocs(docs).then(() => {
                return db.changes({
                    attachments: true,
                    binary: true,
                    include_docs: true
                }).then((res) => {
                    assert.lengthOf(res.results, 5);

                    return testUtils.Promise.all(res.results.map((row) => {
                        const doc = docs.filter((x) => {
                            return x._id === row.id;
                        })[0];
                        const atts = doc._attachments;
                        const attNames = Object.keys(atts);
                        return testUtils.Promise.all(attNames.map((attName) => {
                            const expected = atts && atts[attName];
                            const savedDoc = row.doc;
                            const att = savedDoc._attachments[attName];
                            assert.isUndefined(att.stub);
                            assert.exists(att.digest);
                            assert.equal(att.content_type, expected.content_type);
                            assert.isNotString(att.data);
                            assert.equal(att.data.type, expected.content_type);
                            return testUtils.readBlobPromise(att.data).then((bin) => {
                                assert.equal(testUtils.btoa(bin), expected.data);
                            });
                        }));
                    }));
                });
            });
        });

        it("#2858 {binary: true} in changes() non-live, mixed atts", () => {
            const db = new PouchDB(dbs.name);
            const docs = [
                {
                    _id: "baz", _attachments: {
                        "text1.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text1")
                        },
                        "text2.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text2")
                        }
                    }
                },
                {
                    _id: "foo", _attachments: {
                        "text5.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text5")
                        }
                    }
                },
                { _id: "imdeleted", _deleted: true },
                {
                    _id: "quux", _attachments: {
                        "text3.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text3")
                        },
                        "text4.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text4")
                        }
                    }
                },
                { _id: "imempty" },
                {
                    _id: "zob", _attachments: {
                        "text6.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text3")
                        }
                    }
                },

                { _id: "imempty2" },
                {
                    _id: "zorb", _attachments: {
                        "text2.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text2")
                        },
                        "text3.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text3")
                        }
                    }
                },
                {
                    _id: "imkindaempty", _attachments: {
                        "text0.txt": {
                            content_type: "text/plain",
                            data: ""
                        }
                    }
                }
            ];
            return db.bulkDocs(docs).then(() => {
                return db.changes({
                    attachments: true,
                    binary: true,
                    include_docs: true
                }).then((res) => {
                    assert.lengthOf(res.results, 9);

                    return testUtils.Promise.all(res.results.map((row) => {
                        const doc = docs.filter((x) => {
                            return x._id === row.id;
                        })[0];
                        const atts = doc._attachments;
                        if (!atts) {
                            assert.isUndefined(row.doc._attachments);
                            return;
                        }
                        const attNames = Object.keys(atts);
                        return testUtils.Promise.all(attNames.map((attName) => {
                            const expected = atts && atts[attName];
                            const savedDoc = row.doc;
                            const att = savedDoc._attachments[attName];
                            assert.isUndefined(att.stub);
                            assert.exists(att.digest);
                            assert.equal(att.content_type, expected.content_type);
                            assert.isNotString(att.data);
                            assert.equal(att.data.type, expected.content_type);
                            return testUtils.readBlobPromise(att.data).then((bin) => {
                                assert.equal(testUtils.btoa(bin), expected.data);
                            });
                        }));
                    }));
                });
            });
        });

        it("#2858 {binary: true} non-live changes, complete event", () => {
            const db = new PouchDB(dbs.name);
            const docs = [
                {
                    _id: "baz", _attachments: {
                        "text1.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text1")
                        },
                        "text2.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text2")
                        }
                    }
                },
                {
                    _id: "foo", _attachments: {
                        "text5.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text5")
                        }
                    }
                },
                { _id: "imdeleted", _deleted: true },
                {
                    _id: "quux", _attachments: {
                        "text3.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text3")
                        },
                        "text4.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text4")
                        }
                    }
                },
                { _id: "imempty" },
                {
                    _id: "zob", _attachments: {
                        "text6.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text3")
                        }
                    }
                },

                { _id: "imempty2" },
                {
                    _id: "zorb", _attachments: {
                        "text2.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text2")
                        },
                        "text3.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text3")
                        }
                    }
                },
                {
                    _id: "imkindaempty", _attachments: {
                        "text0.txt": {
                            content_type: "text/plain",
                            data: ""
                        }
                    }
                }
            ];
            return db.bulkDocs(docs).then(() => {
                return new testUtils.Promise((resolve, reject) => {
                    db.changes({
                        attachments: true,
                        binary: true,
                        include_docs: true
                    }).on("error", reject).on("complete", resolve);
                }).then((results) => {
                    return testUtils.Promise.all(results.results.map((row) => {
                        const doc = docs.filter((x) => {
                            return x._id === row.id;
                        })[0];
                        if (row.deleted) {
                            assert.isUndefined(row.doc._attachments);
                            return;
                        }
                        const atts = doc._attachments;
                        const savedDoc = row.doc;
                        if (!atts) {
                            assert.isUndefined(savedDoc._attachments);
                            return;
                        }
                        const attNames = Object.keys(atts);
                        return testUtils.Promise.all(attNames.map((attName) => {
                            const expected = atts && atts[attName];
                            const att = savedDoc._attachments[attName];
                            assert.isUndefined(att.stub);
                            assert.exists(att.digest);
                            assert.equal(att.content_type, expected.content_type);
                            assert.isNotString(att.data);
                            assert.equal(att.data.type, expected.content_type);
                            return testUtils.readBlobPromise(att.data).then((bin) => {
                                assert.equal(testUtils.btoa(bin), expected.data);
                            });
                        }));
                    }));
                });
            });
        });

        it("#2858 {binary: true} in live changes", () => {
            const db = new PouchDB(dbs.name);
            const docs = [binAttDoc, binAttDoc2, pngAttDoc,
                { _id: "bar" },
                { _id: "foo", deleted: true }];
            return db.bulkDocs(docs).then(() => {
                return new testUtils.Promise((resolve, reject) => {
                    const ret = db.changes({
                        attachments: true,
                        binary: true,
                        include_docs: true,
                        live: true
                    }).on("error", reject)
                        .on("change", handleChange)
                        .on("complete", resolve);

                    let promise = testUtils.Promise.resolve();
                    let done = 0;

                    function doneWithDoc() {
                        if (++done === 5 && changes === 5) {
                            ret.cancel();
                        }
                    }

                    var changes = 0;
                    function handleChange(change) {
                        changes++;
                        promise = promise.then(() => {
                            const doc = docs.filter((x) => {
                                return x._id === change.id;
                            })[0];
                            if (change.deleted) {
                                assert.isUndefined(change.doc);
                                return doneWithDoc();
                            }
                            const atts = doc._attachments;
                            const attName = atts && Object.keys(atts)[0];
                            const expected = atts && atts[attName];
                            const savedDoc = change.doc;
                            if (!atts) {
                                assert.isUndefined(savedDoc._attachments);
                                return doneWithDoc();
                            }
                            const att = savedDoc._attachments[attName];
                            assert.isUndefined(att.stub);
                            assert.exists(att.digest);
                            assert.equal(att.content_type, expected.content_type);
                            assert.isNotString(att.data);
                            assert.equal(att.data.type, expected.content_type);
                            return testUtils.readBlobPromise(att.data).then((bin) => {
                                assert.equal(testUtils.btoa(bin), expected.data);
                                doneWithDoc();
                            });
                        }).catch(reject);
                    }
                });
            });
        });

        it("#2858 {binary: true} in live changes, mixed atts", () => {
            const db = new PouchDB(dbs.name);
            const docs = [
                {
                    _id: "baz", _attachments: {
                        "text1.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text1")
                        },
                        "text2.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text2")
                        }
                    }
                },
                {
                    _id: "foo", _attachments: {
                        "text5.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text5")
                        }
                    }
                },
                { _id: "imdeleted", _deleted: true },
                {
                    _id: "quux", _attachments: {
                        "text3.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text3")
                        },
                        "text4.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text4")
                        }
                    }
                },
                { _id: "imempty" },
                {
                    _id: "zob", _attachments: {
                        "text6.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text3")
                        }
                    }
                },

                { _id: "imempty2" },
                {
                    _id: "zorb", _attachments: {
                        "text2.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text2")
                        },
                        "text3.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("text3")
                        }
                    }
                },
                {
                    _id: "imkindaempty", _attachments: {
                        "text0.txt": {
                            content_type: "text/plain",
                            data: ""
                        }
                    }
                }
            ];
            return db.bulkDocs(docs).then(() => {
                return new testUtils.Promise((resolve, reject) => {
                    const ret = db.changes({
                        attachments: true,
                        binary: true,
                        include_docs: true,
                        live: true
                    }).on("error", reject)
                        .on("change", handleChange)
                        .on("complete", resolve);

                    let promise = testUtils.Promise.resolve();
                    let done = 0;

                    function doneWithDoc() {
                        if (++done === 9 && changes === 9) {
                            ret.cancel();
                        }
                    }

                    var changes = 0;
                    function handleChange(change) {
                        changes++;
                        promise = promise.then(() => {
                            const doc = docs.filter((x) => {
                                return x._id === change.id;
                            })[0];
                            if (change.deleted) {
                                assert.isUndefined(change.doc._attachments);
                                return doneWithDoc();
                            }
                            const atts = doc._attachments;
                            const savedDoc = change.doc;
                            if (!atts) {
                                assert.isUndefined(savedDoc._attachments);
                                return doneWithDoc();
                            }
                            const attNames = Object.keys(atts);
                            return testUtils.Promise.all(attNames.map((attName) => {
                                const expected = atts && atts[attName];
                                const att = savedDoc._attachments[attName];
                                assert.isUndefined(att.stub);
                                assert.exists(att.digest);
                                assert.equal(att.content_type, expected.content_type);
                                assert.isNotString(att.data);
                                assert.equal(att.data.type, expected.content_type);
                                return testUtils.readBlobPromise(att.data).then((bin) => {
                                    assert.equal(testUtils.btoa(bin), expected.data);
                                });
                            })).then(doneWithDoc);
                        }).catch(reject);
                    }
                });
            });
        });

        it("#2858 {binary: true} in live+retry changes", () => {
            const db = new PouchDB(dbs.name);
            const docs = [binAttDoc, binAttDoc2, pngAttDoc,
                { _id: "bar" },
                { _id: "foo", deleted: true }];
            return db.bulkDocs(docs).then(() => {
                return new testUtils.Promise((resolve, reject) => {
                    const ret = db.changes({
                        attachments: true,
                        binary: true,
                        include_docs: true,
                        live: true
                    }).on("error", reject)
                        .on("change", handleChange)
                        .on("complete", resolve);

                    let promise = testUtils.Promise.resolve();
                    let done = 0;

                    function doneWithDoc() {
                        if (++done === 5 && changes === 5) {
                            ret.cancel();
                        }
                    }

                    var changes = 0;
                    function handleChange(change) {
                        changes++;
                        promise = promise.then(() => {
                            const doc = docs.filter((x) => {
                                return x._id === change.id;
                            })[0];
                            if (change.deleted) {
                                assert.isUndefined(change.doc);
                                return doneWithDoc();
                            }
                            const atts = doc._attachments;
                            const attName = atts && Object.keys(atts)[0];
                            const expected = atts && atts[attName];
                            const savedDoc = change.doc;
                            if (!atts) {
                                assert.isUndefined(savedDoc._attachments);
                                return doneWithDoc();
                            }
                            const att = savedDoc._attachments[attName];
                            assert.isUndefined(att.stub);
                            assert.exists(att.digest);
                            assert.equal(att.content_type, expected.content_type);
                            assert.isNotString(att.data);
                            assert.equal(att.data.type, expected.content_type);
                            return testUtils.readBlobPromise(att.data).then((bin) => {
                                assert.equal(testUtils.btoa(bin), expected.data);
                                doneWithDoc();
                            });
                        }).catch(reject);
                    }
                });
            });
        });

        it("#2858 {binary: true} in live changes, attachments:false", () => {
            const db = new PouchDB(dbs.name);
            const docs = [binAttDoc, binAttDoc2, pngAttDoc,
                { _id: "bar" },
                { _id: "foo", deleted: true }];
            return db.bulkDocs(docs).then(() => {
                return new testUtils.Promise((resolve, reject) => {
                    const ret = db.changes({
                        include_docs: true,
                        binary: true,
                        live: true
                    }).on("error", reject)
                        .on("change", handleChange)
                        .on("complete", resolve);

                    let promise = testUtils.Promise.resolve();
                    let done = 0;

                    function doneWithDoc() {
                        if (++done === 5 && changes === 5) {
                            ret.cancel();
                        }
                    }

                    var changes = 0;
                    function handleChange(change) {
                        changes++;
                        promise = promise.then(() => {
                            const doc = docs.filter((x) => {
                                return x._id === change.id;
                            })[0];
                            if (change.deleted) {
                                assert.isUndefined(change.doc);
                                return doneWithDoc();
                            }
                            const atts = doc._attachments;
                            const attName = atts && Object.keys(atts)[0];
                            const expected = atts && atts[attName];
                            const savedDoc = change.doc;
                            if (!atts) {
                                assert.isUndefined(savedDoc._attachments);
                                return doneWithDoc();
                            }
                            const att = savedDoc._attachments[attName];
                            assert.equal(att.stub, true);
                            assert.exists(att.digest);
                            assert.equal(att.content_type, expected.content_type);
                            assert.isUndefined(att.data);
                            doneWithDoc();
                        }).catch(reject);
                    }
                });
            });
        });

        it("#2858 {binary: true} in live changes, include_docs:false", () => {
            const db = new PouchDB(dbs.name);
            const docs = [binAttDoc, binAttDoc2, pngAttDoc,
                { _id: "bar" },
                { _id: "foo", deleted: true }];
            return db.bulkDocs(docs).then(() => {
                return new testUtils.Promise((resolve, reject) => {
                    const ret = db.changes({
                        attachments: true,
                        binary: true,
                        live: true
                    }).on("error", reject)
                        .on("change", handleChange)
                        .on("complete", resolve);

                    let promise = testUtils.Promise.resolve();
                    let done = 0;

                    function doneWithDoc() {
                        if (++done === 5 && changes === 5) {
                            ret.cancel();
                        }
                    }

                    var changes = 0;
                    function handleChange(change) {
                        changes++;
                        promise = promise.then(() => {
                            assert.isUndefined(change.doc);
                            return doneWithDoc();
                        }).catch(reject);
                    }
                });
            });
        });

        it("Measures length correctly after put()", () => {
            const db = new PouchDB(dbs.name);
            return db.put(binAttDoc).then(() => {
                return db.get(binAttDoc._id);
            }).then((doc) => {
                delete doc._attachments["foo.txt"].revpos;

                // because of libicu vs. ascii
                const digest = doc._attachments["foo.txt"].digest;
                const validDigests = [
                    "md5-qUUYqS41RhwF0TrCsTAxFg==",
                    "md5-aEI7pOYCRBLTRQvvqYrrJQ==",
                    "md5-jeLnIuUvK7d+6gya044lVA=="
                ];
                assert.notEqual(validDigests.indexOf(digest), -1, `expected ${digest} to be in: ${JSON.stringify(validDigests)}`);
                delete doc._attachments["foo.txt"].digest;
                assert.deepEqual(doc._attachments, {
                    "foo.txt": {
                        content_type: "text/plain",
                        stub: true,
                        length: 29
                    }
                });
            });
        });

        it("#3074 non-live changes()", () => {
            const db = new PouchDB(dbs.name);
            const docs = [];
            for (let i = 0; i < 5; i++) {
                docs.push({
                    _id: i.toString(),
                    _attachments: {
                        "foo.png": {
                            data: icons[i],
                            content_type: "image/png"
                        }
                    }
                });
            }
            return db.bulkDocs(docs).then(() => {
                return db.changes({ include_docs: true, attachments: true });
            }).then((res) => {
                const attachments = res.results.sort((left, right) => {
                    return left.id < right.id ? -1 : 1;
                }).map((change) => {
                    const doc = change.doc;
                    delete doc._attachments["foo.png"].revpos;
                    return doc._attachments;
                });
                assert.deepEqual(attachments, icons.map((icon, i) => {
                    return {
                        "foo.png": {
                            content_type: "image/png",
                            data: icon,
                            digest: iconDigests[i]
                        }
                    };
                }), "when attachments=true");
                return db.changes({ include_docs: true });
            }).then((res) => {
                const attachments = res.results.sort((left, right) => {
                    return left.id < right.id ? -1 : 1;
                }).map((change) => {
                    const doc = change.doc;
                    delete doc._attachments["foo.png"].revpos;
                    return doc._attachments["foo.png"];
                });
                assert.deepEqual(attachments, icons.map((icon, i) => {
                    return {
                        content_type: "image/png",
                        stub: true,
                        digest: iconDigests[i],
                        length: iconLengths[i]
                    };
                }), "when attachments=false");
                return db.changes({ attachments: true });
            }).then((res) => {
                assert.lengthOf(res.results, 5);
                res.results.forEach((row) => {
                    assert.isUndefined(row.doc,
                        "no doc when attachments=true but include_docs=false");
                });
                return db.changes();
            }).then((res) => {
                assert.lengthOf(res.results, 5);
                res.results.forEach((row) => {
                    assert.isUndefined(row.doc,
                        "no doc when attachments=false and include_docs=false");
                });
            });
        });

        it("#3074 live changes()", () => {
            const db = new PouchDB(dbs.name);

            function liveChangesPromise(opts) {
                opts.live = true;
                return new testUtils.Promise((resolve, reject) => {
                    const retChanges = { results: [] };
                    var changes = db.changes(opts)
                        .on("change", (change) => {
                            retChanges.results.push(change);
                            if (retChanges.results.length === 5) {
                                changes.cancel();
                                resolve(retChanges);
                            }
                        }).on("error", reject);
                });
            }

            const docs = [];
            for (let i = 0; i < 5; i++) {
                docs.push({
                    _id: i.toString(),
                    _attachments: {
                        "foo.png": {
                            data: icons[i],
                            content_type: "image/png"
                        }
                    }
                });
            }
            return db.bulkDocs(docs).then(() => {
                return liveChangesPromise({
                    include_docs: true,
                    attachments: true
                });
            }).then((res) => {
                const attachments = res.results.sort((left, right) => {
                    return left.id < right.id ? -1 : 1;
                }).map((change) => {
                    const doc = change.doc;
                    delete doc._attachments["foo.png"].revpos;
                    return doc._attachments;
                });
                assert.deepEqual(attachments, icons.map((icon, i) => {
                    return {
                        "foo.png": {
                            content_type: "image/png",
                            data: icon,
                            digest: iconDigests[i]
                        }
                    };
                }), "when attachments=true");
                return liveChangesPromise({ include_docs: true });
            }).then((res) => {
                const attachments = res.results.sort((left, right) => {
                    return left.id < right.id ? -1 : 1;
                }).map((change) => {
                    const doc = change.doc;
                    delete doc._attachments["foo.png"].revpos;
                    return doc._attachments["foo.png"];
                });
                assert.deepEqual(attachments, icons.map((icon, i) => {
                    return {
                        content_type: "image/png",
                        stub: true,
                        digest: iconDigests[i],
                        length: iconLengths[i]
                    };
                }), "when attachments=false");
                return liveChangesPromise({ attachments: true });
            }).then((res) => {
                assert.lengthOf(res.results, 5);
                res.results.forEach((row) => {
                    assert.isUndefined(row.doc,
                        "no doc when attachments=true but include_docs=false");
                });
                return liveChangesPromise({});
            }).then((res) => {
                assert.lengthOf(res.results, 5);
                res.results.forEach((row) => {
                    assert.isUndefined(row.doc,
                        "no doc when attachments=false and include_docs=false");
                });
            });
        });

        it("#3074 non-live changes(), no attachments", () => {
            const db = new PouchDB(dbs.name);
            const docs = [];
            for (let i = 0; i < 5; i++) {
                docs.push({
                    _id: i.toString()
                });
            }
            return db.bulkDocs(docs).then(() => {
                return db.changes({ include_docs: true, attachments: true });
            }).then((res) => {
                const attachments = res.results.sort((left, right) => {
                    return left.id < right.id ? -1 : 1;
                }).map((change) => {
                    const doc = change.doc;
                    return Boolean(doc._attachments);
                });
                assert.deepEqual(attachments, icons.map(() => {
                    return false;
                }), "when attachments=true");
                return db.changes({ include_docs: true });
            }).then((res) => {
                const attachments = res.results.sort((left, right) => {
                    return left.id < right.id ? -1 : 1;
                }).map((change) => {
                    const doc = change.doc;
                    return Boolean(doc._attachments);
                });
                assert.deepEqual(attachments, icons.map(() => {
                    return false;
                }), "when attachments=false");
                return db.changes({ attachments: true });
            }).then((res) => {
                assert.lengthOf(res.results, 5);
                res.results.forEach((row) => {
                    assert.isUndefined(row.doc,
                        "no doc when attachments=true but include_docs=false");
                });
                return db.changes();
            }).then((res) => {
                assert.lengthOf(res.results, 5);
                res.results.forEach((row) => {
                    assert.isUndefined(row.doc,
                        "no doc when attachments=false and include_docs=false");
                });
            });
        });

        it("#3074 live changes(), no attachments", () => {

            const db = new PouchDB(dbs.name);

            function liveChangesPromise(opts) {
                opts.live = true;
                return new testUtils.Promise((resolve, reject) => {
                    const retChanges = { results: [] };
                    var changes = db.changes(opts)
                        .on("change", (change) => {
                            retChanges.results.push(change);
                            if (retChanges.results.length === 5) {
                                changes.cancel();
                                resolve(retChanges);
                            }
                        }).on("error", reject);
                });
            }

            const docs = [];
            for (let i = 0; i < 5; i++) {
                docs.push({
                    _id: i.toString()
                });
            }
            return db.bulkDocs(docs).then(() => {
                return liveChangesPromise({
                    include_docs: true,
                    attachments: true
                });
            }).then((res) => {
                const attachments = res.results.sort((left, right) => {
                    return left.id < right.id ? -1 : 1;
                }).map((change) => {
                    const doc = change.doc;
                    return Boolean(doc._attachments);
                });
                assert.deepEqual(attachments, icons.map(() => {
                    return false;
                }), "when attachments=true");
                return liveChangesPromise({ include_docs: true });
            }).then((res) => {
                const attachments = res.results.sort((left, right) => {
                    return left.id < right.id ? -1 : 1;
                }).map((change) => {
                    const doc = change.doc;
                    return Boolean(doc._attachments);
                });
                assert.deepEqual(attachments, icons.map(() => {
                    return false;
                }), "when attachments=false");
                return liveChangesPromise({ attachments: true });
            }).then((res) => {
                assert.lengthOf(res.results, 5);
                res.results.forEach((row) => {
                    assert.isUndefined(row.doc,
                        "no doc when attachments=true but include_docs=false");
                });
                return liveChangesPromise({});
            }).then((res) => {
                assert.lengthOf(res.results, 5);
                res.results.forEach((row) => {
                    assert.isUndefined(row.doc,
                        "no doc when attachments=false and include_docs=false");
                });
            });
        });

        it("#3881 filter extraneous keys from _attachments", () => {
            const db = new PouchDB(dbs.name);
            return db.put({
                _id: "foo",
                _attachments: {
                    "foo.txt": {
                        data: "",
                        content_type: "text/plain",
                        follows: false,
                        foo: "bar",
                        baz: true,
                        quux: 1
                    }
                }
            }).then(() => {
                return db.get("foo", { attachments: true });
            }).then((doc) => {
                const keys = Object.keys(doc._attachments["foo.txt"]).filter((x) => {
                    return x !== "revpos"; // not supported by PouchDB right now
                }).sort();
                assert.deepEqual(keys, ["content_type", "data", "digest"]);
            });
        });

        it("#2771 allDocs() 1, single attachment", () => {
            const db = new PouchDB(dbs.name);
            return db.put(binAttDoc).then(() => {
                return db.allDocs({ key: binAttDoc._id, include_docs: true });
            }).then((res) => {
                const doc = res.rows[0].doc;
                delete doc._attachments["foo.txt"].revpos;

                // because of libicu vs. ascii
                const digest = doc._attachments["foo.txt"].digest;
                const validDigests = [
                    "md5-qUUYqS41RhwF0TrCsTAxFg==",
                    "md5-aEI7pOYCRBLTRQvvqYrrJQ==",
                    "md5-jeLnIuUvK7d+6gya044lVA=="
                ];
                assert.notEqual(validDigests.indexOf(digest), -1,
                    `expected ${digest} to be in: ${
                    JSON.stringify(validDigests)}`);
                delete doc._attachments["foo.txt"].digest;
                assert.deepEqual(doc._attachments, {
                    "foo.txt": {
                        content_type: "text/plain",
                        stub: true,
                        length: 29
                    }
                });
                return db.allDocs({
                    key: binAttDoc._id,
                    include_docs: true,
                    attachments: true
                });
            }).then((res) => {
                const doc = res.rows[0].doc;
                assert.equal(doc._attachments["foo.txt"].content_type, binAttDoc._attachments["foo.txt"].content_type);
                assert.equal(doc._attachments["foo.txt"].data, binAttDoc._attachments["foo.txt"].data);
            });
        });

        it("#2771 allDocs() 2, many docs same att", () => {
            const db = new PouchDB(dbs.name);
            const docs = [];
            for (let i = 0; i < 5; i++) {
                docs.push({
                    _id: i.toString(),
                    _attachments: {
                        "foo.txt": {
                            data: "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ=",
                            content_type: "text/plain"
                        }
                    }
                });
            }
            return db.bulkDocs(docs).then(() => {
                return db.allDocs({ include_docs: true, attachments: true });
            }).then((res) => {
                const attachments = res.rows.map((row) => {
                    const doc = row.doc;
                    delete doc._attachments["foo.txt"].revpos;
                    assert.exists(doc._attachments["foo.txt"].digest);
                    delete doc._attachments["foo.txt"].digest;
                    return doc._attachments;
                });
                assert.deepEqual(attachments, [1, 2, 3, 4, 5].map(() => {
                    return {
                        "foo.txt": {
                            content_type: "text/plain",
                            data: "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ="
                        }
                    };
                }));
            });
        });

        it("#2771 allDocs() 3, many docs diff atts", () => {
            const db = new PouchDB(dbs.name);
            const docs = [];
            for (let i = 0; i < 5; i++) {
                docs.push({
                    _id: i.toString(),
                    _attachments: {
                        "foo.png": {
                            data: icons[i],
                            content_type: "image/png"
                        }
                    }
                });
            }
            return db.bulkDocs(docs).then(() => {
                return db.allDocs({ include_docs: true, attachments: true });
            }).then((res) => {
                const attachments = res.rows.map((row) => {
                    const doc = row.doc;
                    delete doc._attachments["foo.png"].revpos;
                    return doc._attachments;
                });
                assert.deepEqual(attachments, icons.map((icon, i) => {
                    return {
                        "foo.png": {
                            content_type: "image/png",
                            data: icon,
                            digest: iconDigests[i]
                        }
                    };
                }));
                return db.allDocs({ include_docs: true });
            }).then((res) => {
                const attachments = res.rows.map((row) => {
                    const doc = row.doc;
                    delete doc._attachments["foo.png"].revpos;
                    return doc._attachments["foo.png"];
                });
                assert.deepEqual(attachments, icons.map((icon, i) => {
                    return {
                        content_type: "image/png",
                        stub: true,
                        digest: iconDigests[i],
                        length: iconLengths[i]
                    };
                }));
            });
        });

        it("#2771 allDocs() 4, mix of atts and no atts", () => {
            const db = new PouchDB(dbs.name);
            const docs = [];
            for (let i = 0; i < 5; i++) {
                const doc = {
                    _id: i.toString()
                };
                if (i % 2 === 1) {
                    doc._attachments = {
                        "foo.png": {
                            data: icons[i],
                            content_type: "image/png"
                        }
                    };
                }
                docs.push(doc);
            }
            return db.bulkDocs(docs).then(() => {
                return db.allDocs({ include_docs: true, attachments: true });
            }).then((res) => {
                const attachments = res.rows.map((row, i) => {
                    const doc = row.doc;
                    if (i % 2 === 1) {
                        delete doc._attachments["foo.png"].revpos;
                        return doc._attachments;
                    }
                    return null;
                });
                assert.deepEqual(attachments, icons.map((icon, i) => {
                    if (i % 2 === 0) {
                        return null;
                    }
                    return {
                        "foo.png": {
                            content_type: "image/png",
                            data: icon,
                            digest: iconDigests[i]
                        }
                    };
                }));
                return db.allDocs({ include_docs: true });
            }).then((res) => {
                const attachments = res.rows.map((row, i) => {
                    const doc = row.doc;
                    if (i % 2 === 1) {
                        delete doc._attachments["foo.png"].revpos;
                        return doc._attachments["foo.png"];
                    }
                    return null;
                });
                assert.deepEqual(attachments, icons.map((icon, i) => {
                    if (i % 2 === 0) {
                        return null;
                    }
                    return {
                        content_type: "image/png",
                        stub: true,
                        digest: iconDigests[i],
                        length: iconLengths[i]
                    };
                }));
            });
        });

        it("#2771 allDocs() 5, no atts", () => {
            const db = new PouchDB(dbs.name);
            const docs = [];
            for (let i = 0; i < 5; i++) {
                const doc = {
                    _id: i.toString()
                };
                docs.push(doc);
            }
            return db.bulkDocs(docs).then(() => {
                return db.allDocs({ include_docs: true, attachments: true });
            }).then((res) => {
                assert.lengthOf(res.rows, 5);
                res.rows.forEach((row) => {
                    assert.exists(row.doc);
                    assert.isUndefined(row.doc._attachments);
                });
                return db.allDocs({ include_docs: true });
            }).then((res) => {
                assert.lengthOf(res.rows, 5);
                res.rows.forEach((row) => {
                    assert.exists(row.doc);
                    assert.isUndefined(row.doc._attachments);
                });
            });
        });

        it("#2771 allDocs() 6, no docs", () => {
            const db = new PouchDB(dbs.name);
            const docs = [];
            for (let i = 0; i < 5; i++) {
                const doc = {
                    _id: i.toString()
                };
                docs.push(doc);
            }
            return db.bulkDocs(docs).then(() => {
                return db.allDocs({
                    include_docs: true,
                    attachments: true,
                    keys: []
                });
            }).then((res) => {
                assert.lengthOf(res.rows, 0);
                return db.allDocs({ include_docs: true, keys: [] });
            }).then((res) => {
                assert.lengthOf(res.rows, 0);
            });
        });

        it("#2771 allDocs() 7, revisions and deletions", () => {
            const db = new PouchDB(dbs.name, { auto_compaction: false });
            const doc = {
                _id: "doc",
                _attachments: {
                    "foo.txt": {
                        content_type: "text/plain",
                        data: "Zm9vYmFy" // 'foobar'
                    }
                }
            };
            let rev;
            return db.put(doc).then(() => {
                return db.allDocs({ keys: ["doc"], attachments: true, include_docs: true });
            }).then((res) => {
                const doc = res.rows[0].doc;
                assert.equal(doc._attachments["foo.txt"].data, "Zm9vYmFy");
                rev = doc._rev;
                doc._attachments["foo.txt"] = {
                    content_type: "text/plain",
                    data: "dG90bw=="
                }; // 'toto'
                return db.put(doc);
            }).then(() => {
                return db.allDocs({ keys: ["doc"], attachments: true, include_docs: true });
            }).then((res) => {
                const doc = res.rows[0].doc;
                assert.equal(doc._attachments["foo.txt"].data, "dG90bw==");
                return db.remove(doc);
            }).then((res) => {
                rev = res.rev;
                return db.allDocs({ keys: ["doc"], attachments: true, include_docs: true });
            }).then((res) => {
                // technically CouchDB sets this to null, but we won't adhere strictly to that
                assert.isNull(res.rows[0].doc);
                delete res.rows[0].doc;
                assert.deepEqual(res.rows, [
                    {
                        id: "doc",
                        key: "doc",
                        value: {
                            rev,
                            deleted: true
                        }
                    }
                ]);
            });
        });

        it("#2771 allDocs() 8, empty attachment", () => {
            const db = new PouchDB(dbs.name);
            return db.put(binAttDoc2).then(() => {
                return db.allDocs({ key: binAttDoc2._id, include_docs: true });
            }).then((res) => {
                const doc = res.rows[0].doc;
                delete doc._attachments["foo.txt"].revpos;

                // because of libicu vs. ascii
                const digest = doc._attachments["foo.txt"].digest;
                const validDigests = [
                    "md5-1B2M2Y8AsgTpgAmY7PhCfg==",
                    "md5-cCkGbCesb17xjWYNV0GXmg==",
                    "md5-3gIs+o2eJiHrXZqziQZqBA=="
                ];
                assert.notEqual(validDigests.indexOf(digest), -1,
                    `expected ${digest} to be in: ${
                    JSON.stringify(validDigests)}`);
                delete doc._attachments["foo.txt"].digest;
                delete doc._attachments["foo.txt"].digest;
                assert.deepEqual(doc._attachments, {
                    "foo.txt": {
                        content_type: "text/plain",
                        stub: true,
                        length: 0
                    }
                });
                return db.allDocs({
                    key: binAttDoc2._id,
                    include_docs: true,
                    attachments: true
                });
            }).then((res) => {
                const doc = res.rows[0].doc;
                assert.equal(doc._attachments["foo.txt"].content_type,
                    binAttDoc2._attachments["foo.txt"].content_type);
                assert.equal(doc._attachments["foo.txt"].data,
                    binAttDoc2._attachments["foo.txt"].data);
            });
        });

        it("No length for non-stubs", () => {
            const db = new PouchDB(dbs.name);
            return db.put(binAttDoc).then(() => {
                return db.get(binAttDoc._id, { attachments: true });
            }).then((doc) => {
                assert.isUndefined(doc._attachments["foo.txt"].stub);
                assert.isUndefined(doc._attachments["foo.txt"].length);
            });
        });

        it('Test some attachments', function (done) {
            var db = new PouchDB(dbs.name);
            db.put(binAttDoc, function (err) {
                assert.isNull(err, 'saved doc with attachment');
                db.get('bin_doc', function (err, doc) {
                    assert.exists(doc._attachments, 'doc has attachments field');
                    assert.exists(doc._attachments['foo.txt'], 'doc has attachment');
                    assert.equal(doc._attachments['foo.txt'].content_type, 'text/plain');
                    db.getAttachment('bin_doc', 'foo.txt', function (err, res) {
                        assert.isNull(err, 'fetched attachment');
                        assert.equal(res.type, 'text/plain');
                        testUtils.readBlob(res, function (data) {
                            assert.equal(data, 'This is a base64 encoded text');
                            db.put(binAttDoc2, function (err, rev) {
                                db.getAttachment('bin_doc2', 'foo.txt',
                                    function (err, res) {
                                        assert.isNull(err);
                                        assert.equal(res.type, 'text/plain');
                                        testUtils.readBlob(res, function (data) {
                                            assert.equal(data, '', 'Correct data returned');
                                            moreTests(rev.rev);
                                        });
                                    });
                            });
                        });
                    });
                });
            });

            function moreTests(rev) {
                var blob = testUtils.makeBlob('This is no base64 encoded text');
                db.putAttachment('bin_doc2', 'foo2.txt', rev, blob, 'text/plain', function (err, info) {
                    assert.equal(info.ok, true);
                    db.getAttachment('bin_doc2', 'foo2.txt', function (err, res) {
                        assert.isNull(err);
                        assert.equal(res.type, 'text/plain');
                        testUtils.readBlob(res, function (data) {
                            assert.exists(data);
                            db.get('bin_doc2', { attachments: true },
                                function (err, res) {
                                    assert.isNull(err);
                                    assert.exists(res._attachments, 'Result has attachments field');
                                    assert.notExists(res._attachments['foo2.txt'].stub, 'stub is false');
                                    assert.equal(res._attachments['foo2.txt'].data, 'VGhpcyBpcyBubyBiYXNlNjQgZW5jb2RlZCB0ZXh0');
                                    assert.equal(res._attachments['foo2.txt'].content_type, 'text/plain');
                                    assert.equal(res._attachments['foo.txt'].data, '');
                                    done();
                                });
                        });
                    });
                });
            }
        });

        it("Test getAttachment", (done) => {
            const db = new PouchDB(dbs.name);
            db.put(binAttDoc, (err) => {
                assert.isNull(err);
                db.getAttachment("bin_doc", "foo.txt", (err, res) => {
                    if (err) {
                        return done(err);
                    }
                    assert.equal(res.type, "text/plain");
                    testUtils.readBlob(res, (data) => {
                        assert.equal(data, "This is a base64 encoded text", "correct data");
                        done();
                    });
                });
            });
        });

        it("Test getAttachment with stubs", () => {
            const db = new PouchDB(dbs.name);
            return db.put({
                _id: "doc",
                _attachments: {
                    1: {
                        content_type: "application/octet-stream",
                        data: testUtils.btoa("1\u00002\u00013\u0002")
                    }
                }
            }).then(() => {
                return db.get("doc");
            }).then((doc) => {
                doc._attachments["2"] = {
                    content_type: "application/octet-stream",
                    data: testUtils.btoa("3\u00002\u00011\u0002")
                };
                return db.put(doc);
            }).then(() => {
                return db.getAttachment("doc", "1");
            }).then((att) => {
                assert.equal(att.type, "application/octet-stream");
                return testUtils.readBlobPromise(att);
            }).then((bin) => {
                assert.equal(bin, "1\u00002\u00013\u0002");
                return db.getAttachment("doc", "2");
            }).then((att) => {
                assert.equal(att.type, "application/octet-stream");
                return testUtils.readBlobPromise(att);
            }).then((bin) => {
                assert.equal(bin, "3\u00002\u00011\u0002");
            });
        });

        it("Test get() with binary:true and stubs", () => {
            const db = new PouchDB(dbs.name);
            return db.put({
                _id: "doc",
                _attachments: {
                    1: {
                        content_type: "application/octet-stream",
                        data: testUtils.btoa("1\u00002\u00013\u0002")
                    }
                }
            }).then(() => {
                return db.get("doc");
            }).then((doc) => {
                doc._attachments["2"] = {
                    content_type: "application/octet-stream",
                    data: testUtils.btoa("3\u00002\u00011\u0002")
                };
                return db.put(doc);
            }).then(() => {
                return db.get("doc", { attachments: true, binary: true });
            }).then((doc) => {
                const att1 = doc._attachments["1"].data;
                const att2 = doc._attachments["2"].data;
                assert.equal(att1.type, "application/octet-stream");
                assert.equal(att2.type, "application/octet-stream");
                return testUtils.readBlobPromise(att1).then((bin) => {
                    assert.equal(bin, "1\u00002\u00013\u0002");
                    return testUtils.readBlobPromise(att2);
                }).then((bin) => {
                    assert.equal(bin, "3\u00002\u00011\u0002");
                });
            });
        });

        it("Test attachments in allDocs/changes", (done) => {
            const db = new PouchDB(dbs.name);
            const docs = [
                { _id: "doc0" },
                {
                    _id: "doc1",
                    _attachments: {
                        att0: {
                            data: "YXR0YWNobWVudDA=",
                            content_type: "text/plain"
                        }
                    }
                },
                {
                    _id: "doc2",
                    _attachments: {
                        att0: {
                            data: "YXR0YWNobWVudDA=",
                            content_type: "text/plain"
                        },
                        att1: {
                            data: "YXR0YWNobWVudDE=",
                            content_type: "text/plain"
                        }
                    }
                },
                {
                    _id: "doc3",
                    _attachments: {
                        att0: {
                            data: "YXR0YWNobWVudDA=",
                            content_type: "text/plain"
                        }
                    }
                }
            ];
            function sort(a, b) {
                return a.id.localeCompare(b.id);
            }
            db.bulkDocs({ docs }, () => {
                db.allDocs({ include_docs: true }, (err, res) => {
                    for (let i = 0; i < docs.length; i++) {
                        const attachmentsNb = typeof docs[i]._attachments !== "undefined" ?
                            Object.keys(docs[i]._attachments).length : 0;
                        for (let j = 0; j < attachmentsNb; j++) {
                            assert.equal(res.rows[i].doc._attachments[`att${j}`].stub, true, `(allDocs) doc${i} contains att${j} stub`);
                        }
                    }
                    assert.isUndefined(res.rows[0].doc._attachments, "(allDocs) doc0 contains no attachments");
                    db.changes({
                        include_docs: true
                    }).on("change", (change) => {
                        const i = Number(change.id.substr(3));
                        if (i === 0) {
                            assert.isUndefined(res.rows[0].doc._attachments, "(onChange) doc0 contains no attachments");
                        } else {
                            const attachmentsNb =
                                typeof docs[i]._attachments !== "undefined" ?
                                    Object.keys(docs[i]._attachments).length : 0;
                            for (let j = 0; j < attachmentsNb; j++) {
                                assert.equal(res.rows[i].doc._attachments[`att${j}`].stub, true, `(onChange) doc${i} contains att${j} stub`);
                            }
                        }
                    }).on("complete", (res) => {
                        let attachmentsNb = 0;
                        res.results.sort(sort);
                        for (let i = 0; i < 3; i++) {
                            attachmentsNb = typeof docs[i]._attachments !== "undefined" ?
                                Object.keys(docs[i]._attachments).length : 0;
                            for (let j = 0; j < attachmentsNb; j++) {
                                assert.equal(res.results[i].doc._attachments[`att${j}`].stub, true, `(complete) doc${i} contains att${j} stub`);
                            }
                        }
                        assert.isUndefined(res.results[0].doc._attachments, "(complete) doc0 contains no attachments");
                        done();
                    });
                });
            });
        });

        it("Test putAttachment with base64 plaintext", () => {
            const db = new PouchDB(dbs.name);
            return db.putAttachment("doc", "att", null, "Zm9v", "text/plain").then(() => {
                return db.getAttachment("doc", "att");
            }).then((blob) => {
                return new testUtils.Promise((resolve) => {
                    testUtils.base64Blob(blob, (data) => {
                        assert.equal(data, "Zm9v", "should get the correct base64 back");
                        resolve();
                    });
                });
            });
        });

        it("Test putAttachment with invalid base64", async () => {
            const db = new PouchDB(dbs.name);
            await assert.throws(async () => db.putAttachment("doc", "att", null, "\u65e5\u672c\u8a9e", "text/plain").should.be.rejected.then((err) => {
                assert.property(err, "message", "Some query argument is invalid");
            }));
        });

        it("Test getAttachment with empty text", (done) => {
            const db = new PouchDB(dbs.name);
            db.put(binAttDoc2, (err) => {
                if (err) {
                    return done(err);
                }
                db.getAttachment("bin_doc2", "foo.txt", (err, res) => {
                    if (err) {
                        return done(err);
                    }
                    assert.equal((typeof res), "object", "res is object, not a string");
                    testUtils.base64Blob(res, (data) => {
                        assert.equal(data, "", "correct data");
                        db.get(binAttDoc2._id, (err, doc) => {
                            const att = doc._attachments["foo.txt"];
                            assert.equal(att.stub, true);
                            // both ascii and libicu
                            const validDigests = [
                                "md5-1B2M2Y8AsgTpgAmY7PhCfg==",
                                "md5-cCkGbCesb17xjWYNV0GXmg==",
                                "md5-3gIs+o2eJiHrXZqziQZqBA=="
                            ];
                            assert.isAbove(validDigests.indexOf(att.digest), -1);
                            assert.equal(att.content_type, "text/plain");
                            assert.equal(att.length, 0);
                            done();
                        });
                    });
                });
            });
        });

        it("Test getAttachment with normal text", (done) => {
            const db = new PouchDB(dbs.name);
            db.put(binAttDoc, (err) => {
                if (err) {
                    return done(err);
                }
                db.getAttachment("bin_doc", "foo.txt", (err, res) => {
                    if (err) {
                        return done(err);
                    }
                    assert.equal((typeof res), "object", "res is object, not a string");
                    testUtils.base64Blob(res, (data) => {
                        assert.equal(data, binAttDoc._attachments["foo.txt"].data, "correct data");
                        done();
                    });
                });
            });
        });

        it("Test getAttachment with PNG", (done) => {
            const db = new PouchDB(dbs.name);
            db.put(pngAttDoc, (err) => {
                if (err) {
                    return done(err);
                }
                db.getAttachment("png_doc", "foo.png", (err, res) => {
                    if (err) {
                        return done(err);
                    }
                    assert.equal((typeof res), "object", "res is object, not a string");
                    testUtils.base64Blob(res, (data) => {
                        assert.equal(data, pngAttDoc._attachments["foo.png"].data, "correct data");
                        done();
                    });
                });
            });
        });

        it("Test getAttachment with PNG using bulkDocs", (done) => {
            const db = new PouchDB(dbs.name);
            db.bulkDocs([pngAttDoc], (err) => {
                if (err) {
                    return done(err);
                }
                db.getAttachment("png_doc", "foo.png", (err, res) => {
                    if (err) {
                        return done(err);
                    }
                    testUtils.base64Blob(res, (data) => {
                        assert.equal(data, pngAttDoc._attachments["foo.png"].data, "correct data");
                        done();
                    });
                });
            });
        });

        it("Test getAttachment with PNG using post", (done) => {
            const db = new PouchDB(dbs.name);
            db.post(pngAttDoc, (err) => {
                if (err) {
                    return done(err);
                }
                db.getAttachment("png_doc", "foo.png", (err, res) => {
                    if (err) {
                        return done(err);
                    }
                    testUtils.base64Blob(res, (data) => {
                        assert.equal(data, pngAttDoc._attachments["foo.png"].data, "correct data");
                        done();
                    });
                });
            });
        });

        it("Test postAttachment with PNG then bulkDocs", (done) => {
            const db = new PouchDB(dbs.name);
            db.put({ _id: "foo" }, () => {
                db.get("foo", (err, doc) => {
                    const data = pngAttDoc._attachments["foo.png"].data;
                    const blob = testUtils.binaryStringToBlob(testUtils.atob(data), "image/png");
                    db.putAttachment("foo", "foo.png", doc._rev, blob, "image/png",
                        (err) => {
                            assert.isNull(err, "attachment inserted");
                            db.bulkDocs([{}], (err) => {
                                assert.isNull(err, "doc inserted");
                                done();
                            });
                        });
                });
            });
        });

        it("proper stub behavior", () => {
            const db = new PouchDB(dbs.name);
            return db.put(binAttDoc).then(() => {
                return db.get(binAttDoc._id);
            }).then((doc) => {
                return db.putAttachment(doc._id, "foo.json", doc._rev,
                    jsonDoc._attachments["foo.json"].data,
                    jsonDoc._attachments["foo.json"].content_type);
            }).then(() => {
                return db.get(binAttDoc._id);
            }).then((doc) => {
                Object.keys(doc._attachments).forEach((filename) => {
                    const att = doc._attachments[filename];
                    assert.isUndefined(att.data);
                    assert.equal(att.stub, true);
                    assert.exists(att.digest);
                    assert.exists(att.content_type);
                });
                return db.get(binAttDoc._id, { attachments: true });
            }).then((doc) => {
                Object.keys(doc._attachments).forEach((filename) => {
                    const att = doc._attachments[filename];
                    assert.exists(att.data);
                    assert.isUndefined(att.stub);
                    assert.exists(att.digest);
                    assert.exists(att.content_type);
                });
            });
        });

        it("Testing with invalid docs", (done) => {
            const db = new PouchDB(dbs.name);
            const invalidDoc = {
                _id: "_invalid",
                foo: "bar"
            };
            db.bulkDocs({
                docs: [
                    invalidDoc,
                    binAttDoc
                ]
            }, (err) => {
                assert.exists(err, "bad request");
                done();
            });
        });

        it("Test create attachment and doc in one go", (done) => {
            const db = new PouchDB(dbs.name);
            const blob = testUtils.makeBlob("Mytext");
            db.putAttachment("anotherdoc", "mytext", blob, "text/plain",
                (err, res) => {
                    assert.exists(res.ok);
                    done();
                });
        });

        it("Test create attachment and doc in one go without callback",
            (done) => {
                const db = new PouchDB(dbs.name);
                var changes = db.changes({
                    live: true
                }).on("complete", (result) => {
                    assert.equal(result.status, "cancelled");
                    done();
                }).on("change", (change) => {
                    if (change.id === "anotherdoc2") {
                        assert.equal(change.id, "anotherdoc2", "Doc has been created");
                        db.get(change.id, { attachments: true }, (err, doc) => {
                            assert.isObject(doc._attachments, "doc has attachments object");
                            assert.exists(doc._attachments.mytext, "doc has attachments attachment");
                            assert.equal(doc._attachments.mytext.data, "TXl0ZXh0", "doc has attachments attachment");
                            changes.cancel();
                        });
                    }
                });
                const blob = testUtils.makeBlob("Mytext");
                db.putAttachment("anotherdoc2", "mytext", blob, "text/plain");
            });

        it("Test create attachment without callback", (done) => {
            const db = new PouchDB(dbs.name);
            db.put({ _id: "anotherdoc3" }, (err, resp) => {
                assert.isNull(err, "doc was saved");
                db.info((err, info) => {

                    var changes = db.changes({
                        since: info.update_seq,
                        live: true,
                        include_docs: true
                    }).on("complete", (result) => {
                        assert.equal(result.status, "cancelled");
                        done();
                    }).on("change", (change) => {
                        if (change.id === "anotherdoc3") {
                            db.get(change.id, { attachments: true }, (err, doc) => {
                                assert.isObject(doc._attachments, "object", "doc has attachments object");
                                assert.exists(doc._attachments.mytext);
                                assert.equal(doc._attachments.mytext.data, "TXl0ZXh0");
                                changes.cancel();
                            });
                        }
                    });
                    const blob = testUtils.makeBlob("Mytext");
                    db.putAttachment("anotherdoc3", "mytext", resp.rev, blob,
                        "text/plain");
                });
            });
        });

        it("Test put attachment on a doc without attachments", (done) => {
            const db = new PouchDB(dbs.name);
            db.put({ _id: "mydoc" }, (err, resp) => {
                const blob = testUtils.makeBlob("Mytext");
                db.putAttachment("mydoc", "mytext", resp.rev, blob, "text/plain",
                    (err, res) => {
                        assert.exists(res.ok);
                        done();
                    });
            });
        });

        it("Test put attachment with unencoded name", (done) => {
            const db = new PouchDB(dbs.name);
            db.put({ _id: "mydoc" }, (err, resp) => {
                const blob = testUtils.makeBlob("Mytext");
                db.putAttachment("mydoc", "my/text?@", resp.rev, blob, "text/plain", (err, res) => {
                    assert.exists(res.ok);

                    db.get("mydoc", { attachments: true }, (err, res) => {
                        assert.exists(res._attachments["my/text?@"]);

                        db.getAttachment("mydoc", "my/text?@", (err, attachment) => {
                            assert.isNull(err);
                            assert.equal(attachment.type, "text/plain");
                            testUtils.readBlob(attachment, (data) => {
                                assert.equal(data, "Mytext");

                                done();
                            });
                        });
                    });
                });
            });
        });

        it("3963 length property on stubs", () => {
            const db = new PouchDB(dbs.name);

            function checkAttachments() {
                return db.get("bin_doc").then((doc) => {
                    assert.equal(doc._attachments["foo.txt"].stub, true);
                    assert.equal(doc._attachments["foo.txt"].length, 29);
                    return db.changes({ include_docs: true });
                }).then((res) => {
                    const doc = res.results[0].doc;
                    assert.equal(doc._attachments["foo.txt"].stub, true);
                    assert.equal(doc._attachments["foo.txt"].length, 29);
                    return db.allDocs({ include_docs: true });
                }).then((res) => {
                    const doc = res.rows[0].doc;
                    assert.equal(doc._attachments["foo.txt"].stub, true);
                    assert.equal(doc._attachments["foo.txt"].length, 29);
                    return new testUtils.Promise((resolve, reject) => {
                        let change;
                        var changes = db.changes({ include_docs: true, live: true })
                            .on("change", (x) => {
                                change = x;
                                changes.cancel();
                            })
                            .on("error", reject)
                            .on("complete", () => {
                                resolve(change);
                            });
                    });
                }).then((change) => {
                    const doc = change.doc;
                    assert.equal(doc._attachments["foo.txt"].stub, true);
                    assert.equal(doc._attachments["foo.txt"].length, 29);
                });
            }

            return db.put(binAttDoc).then(checkAttachments).then(() => {
                return db.get("bin_doc");
            }).then((doc) => {
                return db.put(doc);
            }).then(checkAttachments);
        });

        it("Testing with invalid rev", (done) => {
            const db = new PouchDB(dbs.name);
            const doc = { _id: "adoc" };
            db.put(doc, (err, resp) => {
                assert.isNull(err, "Doc has been saved");
                doc._rev = resp.rev;
                doc.foo = "bar";
                db.put(doc, (err) => {
                    assert.isNull(err, "Doc has been updated");
                    const blob = testUtils.makeBlob("bar");
                    db.putAttachment("adoc", "foo.txt", doc._rev, blob, "text/plain",
                        (err) => {
                            assert.exists(err, "Attachment has not been saved");
                            assert.equal(err.name, "conflict", "error is a conflict");
                            done();
                        });
                });
            });
        });

        it("Test put another attachment on a doc with attachments",
            (done) => {
                const db = new PouchDB(dbs.name);
                db.put({ _id: "mydoc" }, (err, res1) => {
                    const blob = testUtils.makeBlob("Mytext");
                    db.putAttachment("mydoc", "mytext", res1.rev, blob, "text/plain",
                        (err, res2) => {
                            db.putAttachment("mydoc", "mytext2", res2.rev, blob, "text/plain",
                                (err, res3) => {
                                    assert.exists(res3.ok);
                                    done();
                                });
                        });
                });
            });

        it("Test get with attachments: true if empty attachments", (done) => {
            const db = new PouchDB(dbs.name);
            db.put({
                _id: "foo",
                _attachments: {}
            }, () => {
                db.get("foo", { attachments: true }, (err, res) => {
                    assert.equal(res._id, "foo");
                    done();
                });
            });
        });

        it("Test delete attachment from a doc", (done) => {
            const db = new PouchDB(dbs.name);
            db.put({
                _id: "mydoc",
                _attachments: {
                    mytext1: {
                        content_type: "text/plain",
                        data: "TXl0ZXh0MQ=="
                    },
                    mytext2: {
                        content_type: "text/plain",
                        data: "TXl0ZXh0Mg=="
                    }
                }
            }, (err, res) => {
                const rev = res.rev;
                db.get("mydoc", { attachments: true }, (err, res) => {
                    assert.include(Object.keys(res._attachments), "mytext1", "mytext2");
                    db.removeAttachment("mydoc", "mytext1", 0, (err) => {
                        assert.exists(err, "removal should fail due to broken rev");
                        db.removeAttachment("mydoc", "mytext1", rev, () => {
                            db.get("mydoc", { attachments: true }, (err, res) => {
                                assert.notInclude(Object.keys(res._attachments), "mytext1");
                                assert.include(Object.keys(res._attachments), "mytext2");
                                db.removeAttachment("mydoc", "mytext2", res._rev,
                                    (err, res) => {
                                        assert.isUndefined(res._attachments);
                                        done();
                                    });
                            });
                        });
                    });
                });
            });
        });

        it("Test a document with a json string attachment", (done) => {
            const db = new PouchDB(dbs.name);
            db.put(jsonDoc, (err, results) => {
                assert.isNull(err, "saved doc with attachment");
                db.get(results.id, (err, doc) => {
                    assert.isNull(err, "fetched doc");
                    assert.exists(doc._attachments, "doc has attachments field");
                    assert.include(Object.keys(doc._attachments), "foo.json");
                    assert.equal(doc._attachments["foo.json"].content_type, "application/json", "doc has correct content type");
                    db.getAttachment(results.id, "foo.json", (err, attachment) => {
                        assert.isNull(err);
                        assert.equal(attachment.type, "application/json");
                        testUtils.readBlob(attachment, () => {
                            assert.equal(jsonDoc._attachments["foo.json"].data, "eyJIZWxsbyI6IndvcmxkIn0=", "correct data");
                            done();
                        });
                    });
                });
            });
        });

        it("Test remove doc with attachment", () => {
            const db = new PouchDB(dbs.name);
            return db.put({ _id: "mydoc" }).then((resp) => {
                const blob = testUtils.makeBlob("Mytext");
                return db.putAttachment("mydoc", "mytext", resp.rev, blob, "text/plain");
            }).then((res) => {
                assert.exists(res.ok);
                return db.get("mydoc", { attachments: false });
            }).then((doc) => {
                return db.remove(doc);
            }).then((res) => {
                assert.exists(res.ok);
            });
        });

        it("Try to insert a doc with unencoded attachment", (done) => {
            const db = new PouchDB(dbs.name);
            const doc = {
                _id: "foo",
                _attachments: {
                    "foo.txt": {
                        content_type: "text/plain",
                        data: "this should have been encoded!"
                    }
                }
            };
            db.put(doc, (err) => {
                assert.exists(err);
                done();
            });
        });

        it("Try to get attachment of unexistent doc", (done) => {
            const db = new PouchDB(dbs.name);
            db.getAttachment("unexistent", "attachment", (err) => {
                assert.exists(err, "Correctly returned error");
                done();
            });
        });

        it("Test synchronous getAttachment", (done) => {
            const db = new PouchDB(dbs.name);
            db.getAttachment("unexistent", "attachment", (err) => {
                assert.exists(err, "Correctly returned error");
                done();
            });
        });

        it("Test synchronous putAttachment with text data", (done) => {
            const db = new PouchDB(dbs.name);
            const blob = testUtils.makeBlob("foobaz", "text/plain");
            db.putAttachment("a", "foo2.txt", "", blob, "text/plain", (err) => {
                assert.isNull(err, "Correctly wrote attachment");
                db.get("a", { attachments: true }, (err, doc) => {
                    assert.isNull(err, "Correctly got attachment");
                    assert.equal(doc._attachments["foo2.txt"].data, "Zm9vYmF6");
                    assert.equal(doc._attachments["foo2.txt"].content_type, "text/plain");
                    done();
                });
            });
        });

        it("Test synchronous putAttachment with no text data", (done) => {
            const db = new PouchDB(dbs.name);
            db.putAttachment("a", "foo2.txt", "", "", "text/plain", (err) => {
                assert.isNull(err, "Correctly wrote attachment");
                db.get("a", { attachments: true }, (err, doc) => {
                    assert.isNull(err, "Correctly got attachment");
                    assert.equal(doc._attachments["foo2.txt"].data, "");
                    // firefox 3 appends charset=utf8
                    // see http://forums.mozillazine.org/viewtopic.php?p=6318215#p6318215
                    assert.equal(doc._attachments["foo2.txt"].content_type.indexOf("text/plain"), 0, "expected content-type to start with text/plain");
                    done();
                });
            });
        });

        it("Test put with partial stubs", () => {
            const db = new PouchDB(dbs.name);
            const doc = {
                _id: "doc",
                _attachments: {
                    "foo.txt": {
                        content_type: "text/plain",
                        data: "Zm9v"
                    },
                    "bar.txt": {
                        content_type: "text/plain",
                        data: "Zm9v"
                    }
                }
            };
            return db.put(doc).then(() => {
                return db.get(doc._id);
            }).then((doc) => {
                doc._attachments["baz.txt"] = {
                    content_type: "text/plain",
                    data: "Zm9v"
                };
                // at this point, foo and bar are stubs, but baz is not
                return db.put(doc);
            }).then(() => {
                return db.get(doc._id, { attachments: true });
            }).then((doc) => {
                assert.notEqual(doc._rev, "2-x");
                assert.lengthOf(Object.keys(doc._attachments), 3);
                Object.keys(doc._attachments).forEach((key) => {
                    const att = doc._attachments[key];
                    assert.equal(att.data, "Zm9v");
                    assert.equal(att.content_type, "text/plain");
                });
            });
        });

        it("Test put with attachments and new_edits=false", () => {
            const db = new PouchDB(dbs.name);
            const doc = {
                _id: "doc",
                _rev: "2-x",
                _attachments: {
                    "foo.txt": {
                        content_type: "text/plain",
                        data: "Zm9v"
                    },
                    "bar.txt": {
                        content_type: "text/plain",
                        data: "Zm9v"
                    },
                    "baz.txt": {
                        content_type: "text/plain",
                        data: "Zm9v"
                    }
                },
                _revisions: {
                    start: 2,
                    ids: ["x", "a"]
                }
            };
            return db.bulkDocs([doc], { new_edits: false }).then(() => {
                return db.get(doc._id);
            }).then(() => {
                // at this point, foo and bar are stubs, but baz is not
                return db.bulkDocs([doc], { new_edits: false });
            }).then(() => {
                return db.get(doc._id, { attachments: true });
            }).then((doc) => {
                assert.equal(doc._rev, "2-x");
                assert.lengthOf(Object.keys(doc._attachments), 3);
                Object.keys(doc._attachments).forEach((key) => {
                    const att = doc._attachments[key];
                    assert.equal(att.data, "Zm9v");
                    assert.equal(att.content_type, "text/plain");
                });
            });
        });

        it("Test getAttachment with specific rev", () => {
            const db = new PouchDB(dbs.name, { auto_compaction: false });

            const doc = {
                _id: "a"
            };
            let rev1;
            let rev2;
            let rev3;
            return db.put(doc).then((res) => {
                doc._rev = rev1 = res.rev;
                doc._attachments = {
                    "foo.txt": {
                        content_type: "text/plain",
                        data: "Zm9v"
                    }
                };
                return db.put(doc);
            }).then((res) => {
                doc._rev = rev2 = res.rev;

                delete doc._attachments;
                return db.put(doc);
            }).then((res) => {
                doc._rev = rev3 = res.rev;

                return db.getAttachment("a", "foo.txt", { rev: rev2 });
            }).then((blob) => {
                assert.exists(blob);

                return testUtils.Promise.all([
                    db.getAttachment("a", "foo.txt", { rev: rev1 }),
                    db.getAttachment("a", "foo.txt", { rev: "3-fake" }),
                    db.getAttachment("a", "foo.txt"),
                    db.getAttachment("a", "foo.txt", {}),
                    db.getAttachment("a", "foo.txt", { rev: rev3 })
                ].map((promise) => {
                    return promise.then(() => {
                        throw new Error("expected an error");
                    }, (err) => {
                        assert.exists(err);
                        assert.equal(err.status, 404);
                    });
                }));
            });
        });

        it("Test getAttachment with diff revs and content", () => {
            const db = new PouchDB(dbs.name, { auto_compaction: false });

            const doc = {
                _id: "a",
                _attachments: {
                    "foo.txt": {
                        content_type: "text/plain",
                        data: "Zm9v"
                    }
                }
            };
            let rev1;
            let rev2;
            let rev3;
            return db.put(doc).then((res) => {
                doc._rev = rev1 = res.rev;
                doc._attachments = {
                    "foo.txt": {
                        content_type: "text/plain",
                        data: "YmFy"
                    }
                };
                return db.put(doc);
            }).then((res) => {
                doc._rev = rev2 = res.rev;
                doc._attachments = {
                    "foo.txt": {
                        content_type: "text/plain",
                        data: "YmF6"
                    }
                };
                return db.put(doc);
            }).then((res) => {
                doc._rev = rev3 = res.rev;

                const testCases = [
                    [db.getAttachment("a", "foo.txt"), "baz"],
                    [db.getAttachment("a", "foo.txt", { rev: rev3 }), "baz"],
                    [db.getAttachment("a", "foo.txt", { rev: rev2 }), "bar"],
                    [db.getAttachment("a", "foo.txt", { rev: rev1 }), "foo"]
                ];

                return testUtils.Promise.all(testCases.map((testCase) => {
                    const promise = testCase[0];
                    const expected = testCase[1];
                    return promise.then((blob) => {
                        assert.equal(blob.type, "text/plain");
                        return testUtils.readBlobPromise(blob);
                    }).then((bin) => {
                        assert.equal(bin, expected, "didn't get blob we expected for rev");
                    });
                }));
            });
        });

        it("Test stubs", (done) => {
            const db = new PouchDB(dbs.name);
            db.putAttachment("a", "foo2.txt", "", "", "text/plain", () => {
                db.allDocs({ include_docs: true }, (err, docs) => {
                    assert.isUndefined(docs.rows[0].stub, "no stub");
                    done();
                });
            });
        });

        it("Try to get unexistent attachment of some doc", (done) => {
            const db = new PouchDB(dbs.name);
            db.put({ _id: "foo" }, (err) => {
                assert.isNull(err, "doc inserted");
                db.getAttachment("foo", "unexistentAttachment", (err) => {
                    assert.exists(err, "Correctly returned error");
                    done();
                });
            });
        });

        it("putAttachment and getAttachment with plaintext", (done) => {
            const db = new PouchDB(dbs.name);
            db.put({ _id: "foo" }, () => {
                db.get("foo", (err, doc) => {
                    const data = binAttDoc._attachments["foo.txt"].data;
                    const blob = testUtils.binaryStringToBlob(testUtils.atob(data),
                        "text/plain");
                    db.putAttachment("foo", "foo.txt", doc._rev, blob, "text/plain",
                        (err) => {
                            assert.isNull(err, "attachment inserted");
                            db.getAttachment("foo", "foo.txt", (err, blob) => {
                                assert.isNull(err, "attachment gotten");
                                assert.equal(blob.type, "text/plain");
                                testUtils.readBlob(blob, (returnedData) => {
                                    assert.equal(testUtils.btoa(returnedData), data);
                                    db.get("foo", (err, doc) => {
                                        assert.isNull(err, "err on get");
                                        delete doc._attachments["foo.txt"].revpos;

                                        // couchdb encodes plaintext strings differently from us
                                        // because of libicu vs. ascii. that's okay
                                        const digest = doc._attachments["foo.txt"].digest;
                                        const validDigests = [
                                            "md5-qUUYqS41RhwF0TrCsTAxFg==",
                                            "md5-aEI7pOYCRBLTRQvvqYrrJQ==",
                                            "md5-jeLnIuUvK7d+6gya044lVA=="
                                        ];
                                        assert.notEqual(validDigests.indexOf(digest), -1, `expected ${digest} to be in: ${JSON.stringify(validDigests)}`);
                                        delete doc._attachments["foo.txt"].digest;
                                        assert.deepEqual(doc._attachments, {
                                            "foo.txt": {
                                                content_type: "text/plain",
                                                stub: true,
                                                length: 29
                                            }
                                        });
                                        done();
                                    });
                                });
                            });
                        });
                });
            });
        });

        it("putAttachment and getAttachment with png data", (done) => {
            const db = new PouchDB(dbs.name);
            db.put({ _id: "foo" }, () => {
                db.get("foo", (err, doc) => {
                    const data = pngAttDoc._attachments["foo.png"].data;
                    const blob = testUtils.binaryStringToBlob(testUtils.atob(data),
                        "image/png");
                    db.putAttachment("foo", "foo.png", doc._rev, blob, "image/png",
                        (err) => {
                            assert.isNull(err, "attachment inserted");
                            db.getAttachment("foo", "foo.png", (err, blob) => {
                                assert.isNull(err, "attachment gotten");
                                assert.equal(blob.type, "image/png");
                                testUtils.readBlob(blob, (returnedData) => {
                                    assert.equal(testUtils.btoa(returnedData), data);
                                    db.get("foo", (err, doc) => {
                                        assert.isNull(err, "err on get");
                                        delete doc._attachments["foo.png"].revpos;
                                        assert.deepEqual(doc._attachments, {
                                            "foo.png": {
                                                content_type: "image/png",
                                                digest: "md5-c6eA+rofKUsstTNQBKUc8A==",
                                                stub: true,
                                                length: 229
                                            }
                                        });
                                        done();
                                    });
                                });
                            });
                        });
                });
            });
        });

        it("putAttachment in new doc with base64", () => {
            const db = new PouchDB(dbs.name, { auto_compaction: false });

            return db.putAttachment("foo", "att", "Zm9v", "text/plain").then(() => {
                return db.get("foo", { attachments: true });
            }).then((doc) => {
                assert.match(doc._attachments.att.content_type, /^text\/plain/);
                assert.equal(doc._attachments.att.data, "Zm9v");
            });
        });

        it("#2818 - save same attachment in different revs", () => {
            const db = new PouchDB(dbs.name, { auto_compaction: false });

            return db.put({ _id: "foo" }).then((res) => {
                return db.putAttachment("foo", "att", res.rev, "Zm9v", "text/plain");
            }).then(() => {
                return db.get("foo", { attachments: true });
            }).then((doc) => {
                assert.match(doc._attachments.att.content_type, /^text\/plain/);
                assert.exists(doc._attachments.att.data);
                return db.get("foo");
            }).then((doc) => {
                return db.put(doc);
            }).then(() => {
                return db.compact();
            }).then(() => {
                return db.get("foo", { attachments: true });
            }).then((doc) => {
                assert.match(doc._attachments.att.content_type, /^text\/plain/);
                assert.isAbove(doc._attachments.att.data.length, 0, "attachment exists");
            });
        });

        it("#2818 - save same attachment many times in parallel", () => {
            const db = new PouchDB(dbs.name);
            const docs = [];

            for (let i = 0; i < 50; i++) {
                docs.push({
                    _id: `doc${i}`,
                    _attachments: {
                        "foo.txt": {
                            content_type: "text/plain",
                            data: "Zm9vYmFy" // 'foobar'
                        }
                    }
                });
            }
            return db.bulkDocs(docs);
        });

        it("#2818 - revisions keep attachments (no compaction)", () => {
            const db = new PouchDB(dbs.name, { auto_compaction: false });
            const doc = {
                _id: "doc",
                _attachments: {
                    "foo.txt": {
                        content_type: "text/plain",
                        data: "Zm9vYmFy" // 'foobar'
                    }
                }
            };
            let rev;
            return db.put(doc).then(() => {
                return db.get("doc");
            }).then((doc) => {
                rev = doc._rev;
                //delete doc._attachments['foo.txt'];
                doc._attachments["foo.txt"] = {
                    content_type: "text/plain",
                    data: "dG90bw=="
                }; // 'toto'
                return db.put(doc);
            }).then(() => {
                return db.get("doc", { attachments: true });
            }).then((doc) => {
                assert.equal(doc._attachments["foo.txt"].data, "dG90bw==");
                return db.get("doc", { rev, attachments: true });
            }).then((doc) => {
                assert.equal(doc._attachments["foo.txt"].data, "Zm9vYmFy");
            });
        });

        it("#2818 - doesn't throw 409 if same filename", () => {
            const db = new PouchDB(dbs.name, { auto_compaction: false });
            const doc = {
                _id: "doc",
                _attachments: {
                    "foo.txt": {
                        content_type: "text/plain",
                        data: "Zm9vYmFy" // 'foobar'
                    }
                }
            };
            return db.put(doc).then((res) => {
                doc._rev = res.rev;
                doc._attachments["foo.txt"].data = "dG90bw=="; // 'toto'
                return db.put(doc);
            });
        });

        if (typeof process === "undefined" || process.browser) {
            it("test stored URL content type of png data", (done) => {
                const db = new PouchDB(dbs.name);
                db.put({ _id: "foo" }, () => {
                    db.get("foo", (err, doc) => {
                        const data = pngAttDoc._attachments["foo.png"].data;
                        const blob = testUtils.binaryStringToBlob(
                            testUtils.atob(data), "image/png");
                        if (typeof URL === "undefined") {
                            // phantomjs doesn't have this, give up on this test
                            return done();
                        }
                        let checkedOnce = false;
                        function checkBlobType(blob, cb) {
                            const url = URL.createObjectURL(blob);
                            testUtils.ajax({
                                url,
                                cache: true,
                                binary: true
                            }, (err, res) => {
                                if (err && err.status === 500) {
                                    // firefox won't let us use ajax to get the blob.
                                    // too bad, but firefox wasn't the problem anyway
                                    return done();
                                }
                                assert.isNull(err, "ajax gotten");
                                if (!checkedOnce) {
                                    checkedOnce = true;
                                    if (res.type !== "image/png") {
                                        // in Safari/iOS 7, blob URLs are missing
                                        // the content type even without storing them.
                                        // so just give up.
                                        return done();
                                    }
                                } else {
                                    assert.equal(res.type, "image/png");
                                }
                                cb();
                            });
                        }
                        checkBlobType(blob, () => {
                            db.putAttachment("foo", "foo.png", doc._rev, blob, "image/png",
                                (err) => {
                                    assert.isNull(err, "attachment inserted");
                                    db.getAttachment("foo", "foo.png", (err, blob) => {
                                        assert.isNull(err, "attachment gotten");
                                        checkBlobType(blob, done);
                                    });
                                });
                        });
                    });
                });
            });
        }

        it("#3008 test correct encoding/decoding of \\u0000 etc.", () => {

            const base64 =
                "iVBORw0KGgoAAAANSUhEUgAAAhgAAAJLCAYAAAClnu9J" +
                "AAAgAElEQVR4Xuy9B7ylZXUu/p62T5nOMAPM0BVJICQi" +
                "ogjEJN5ohEgQ";

            const db = new PouchDB(dbs.name);
            return db.putAttachment("foo", "foo.bin", base64, "image/png").then(() => {
                return db.getAttachment("foo", "foo.bin");
            }).then((blob) => {
                assert.equal(blob.type, "image/png");
                return testUtils.readBlobPromise(blob);
            }).then((bin) => {
                assert.equal(testUtils.btoa(bin), base64);
            });
        });


        const isSafari = (typeof process === "undefined" || process.browser) &&
            /Safari/.test(window.navigator.userAgent) &&
            !/Chrome/.test(window.navigator.userAgent);
        if (!isSafari) {
            // skip in safari/ios because of size limit popup
            it("putAttachment and getAttachment with big png data", (done) => {

                function getData(cb) {
                    if (typeof process !== "undefined" && !process.browser) {
                        const bigimage = require("./deps/bigimage.js");
                        cb(null, bigimage);
                    } else { // browser
                        const script = document.createElement("script");
                        script.src = "deps/bigimage.js";
                        document.body.appendChild(script);
                        var timeout = setInterval(() => {
                            if (window.bigimage) {
                                clearInterval(timeout);
                                cb(null, window.bigimage);
                            }
                        }, 500);
                    }
                }

                const db = new PouchDB(dbs.name);
                db.put({ _id: "foo" }, () => {
                    db.get("foo", (err, doc) => {

                        getData((err, data) => {
                            const blob = testUtils.binaryStringToBlob(
                                testUtils.atob(data), "image/png");
                            db.putAttachment("foo", "foo.png", doc._rev, blob, "image/png",
                                (err) => {
                                    assert.isNull(err, "attachment inserted");
                                    db.getAttachment("foo", "foo.png", (err, blob) => {
                                        assert.isNull(err, "attachment gotten");
                                        assert.equal(blob.type, "image/png");
                                        testUtils.readBlob(blob, (returnedData) => {
                                            assert.equal(testUtils.btoa(returnedData), data);
                                            db.get("foo", (err, doc) => {
                                                assert.isNull(err, "err on get");
                                                delete doc._attachments["foo.png"].revpos;
                                                assert.deepEqual(doc._attachments, {
                                                    "foo.png": {
                                                        content_type: "image/png",
                                                        digest: "md5-kqr2YcdElgDs3RkMn1Ygbw==",
                                                        stub: true,
                                                        length: 678010
                                                    }
                                                });
                                                done();
                                            });
                                        });
                                    });
                                });
                        });
                    });
                });
            });
        }

        it("#2709 `revpos` with putAttachment", (done) => {
            const db = new PouchDB(dbs.name);
            db.putAttachment("a", "one", "", testUtils.btoa("one"), "text/plain", () => {
                db.get("a", (err, doc) => {
                    assert.exists(doc._attachments.one.revpos);
                    assert.equal(doc._attachments.one.revpos, 1);
                    db.putAttachment("a", "two", doc._rev, testUtils.btoa("two"), "text/plain", () => {
                        db.get("a", (err, doc) => {
                            assert.exists(doc._attachments.two.revpos);
                            assert.equal(doc._attachments.two.revpos, 2);
                            assert.equal(doc._attachments.one.revpos, 1);
                            db.putAttachment("a", "one", doc._rev, testUtils.btoa("one-changed"), "text/plain", () => {
                                db.get("a", (err, doc) => {
                                    assert.equal(doc._attachments.one.revpos, 3);
                                    assert.equal(doc._attachments.two.revpos, 2);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it("#2709 `revpos` with inline attachment", (done) => {
            const db = new PouchDB(dbs.name);
            const doc = {
                _id: "a",
                _attachments: {
                    one: {
                        content_type: "text/plain",
                        data: testUtils.btoa("one")
                    }
                }
            };
            db.put(doc, () => {
                db.get("a", (err, doc) => {
                    assert.exists(doc._attachments.one.revpos);
                    assert.equal(doc._attachments.one.revpos, 1);
                    doc._attachments.two = {
                        content_type: "text/plain",
                        data: testUtils.btoa("two")
                    };
                    db.put(doc, () => {
                        db.get("a", (err, doc) => {
                            assert.exists(doc._attachments.two.revpos);
                            assert.equal(doc._attachments.two.revpos, 2);
                            assert.equal(doc._attachments.one.revpos, 1);
                            delete doc._attachments.one.stub;
                            doc._attachments.one.data = testUtils.btoa("one-changed");
                            db.put(doc, () => {
                                db.get("a", (err, doc) => {
                                    assert.equal(doc._attachments.one.revpos, 3);
                                    assert.equal(doc._attachments.two.revpos, 2);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it("#2709 `revpos` with allDocs", (done) => {
            const db = new PouchDB(dbs.name);
            db.putAttachment("a", "one", "", testUtils.btoa("one"), "text/plain", () => {
                db.allDocs({ keys: ["a"], include_docs: true }, (err, docs) => {
                    const doc = docs.rows[0].doc;
                    assert.exists(doc._attachments.one.revpos);
                    assert.equal(doc._attachments.one.revpos, 1);
                    done();
                });
            });
        });

    });
});

repl_adapters.forEach((adapters) => {
    describe(`suite2 test.attachments.js- ${adapters[0]}:${adapters[1]}`,
        () => {

            const dbs = {};

            beforeEach((done) => {
                dbs.name = testUtils.adapterUrl(adapters[0], "testdb");
                dbs.remote = testUtils.adapterUrl(adapters[1], "test_attach_remote");
                testUtils.cleanup([dbs.name, dbs.remote], done);
            });

            afterEach((done) => {
                testUtils.cleanup([dbs.name, dbs.remote], done);
            });

            it("Attachments replicate back and forth", () => {
                const db = new PouchDB(dbs.name);
                const remote = new PouchDB(dbs.remote);

                const doc = {
                    _id: "doc",
                    _attachments: {
                        "foo.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("foo")
                        }
                    }
                };

                return db.bulkDocs({ docs: [doc] }).then(() => {
                    return db.replicate.to(remote);
                }).then(() => {
                    doc._id = "doc2";
                    return remote.put(doc);
                }).then(() => {
                    doc._id = "doc3";
                    return db.put(doc);
                }).then(() => {
                    return db.sync(remote);
                }).then(() => {
                    return testUtils.Promise.all([db, remote].map((pouch) => {
                        return pouch.allDocs({
                            include_docs: true,
                            attachments: true
                        }).then((res) => {
                            assert.lengthOf(res.rows, 3);
                            res.rows.forEach((row) => {
                                assert.lengthOf(Object.keys(row.doc._attachments), 1);
                                const att = row.doc._attachments["foo.txt"];
                                assert.equal(att.content_type, "text/plain");
                                assert.equal(att.data, testUtils.btoa("foo"));
                                assert.isString(att.digest);
                                assert.isUndefined(att.length);
                                assert.isUndefined(att.stub);
                            });
                        });
                    }));
                });
            });

            it("Replicate same doc, same atts", () => {
                const db = new PouchDB(dbs.name);
                const remote = new PouchDB(dbs.remote);

                const doc = {
                    _id: "doc",
                    _attachments: {
                        "foo.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("foo")
                        }
                    }
                };

                return remote.put(doc).then((res) => {
                    doc._rev = res.rev;
                    return db.replicate.from(remote);
                }).then(() => {
                    return db.put(doc);
                }).then((res) => {
                    doc._rev = res.rev;
                    return db.replicate.to(remote);
                }).then(() => {
                    return remote.put(doc);
                }).then(() => {
                    return db.sync(remote);
                }).then(() => {
                    return testUtils.Promise.all([db, remote].map((pouch) => {
                        return pouch.allDocs({
                            include_docs: true,
                            attachments: true
                        }).then((res) => {
                            assert.lengthOf(res.rows, 1);
                            res.rows.forEach((row) => {
                                assert.lengthOf(Object.keys(row.doc._attachments), 1);
                                const att = row.doc._attachments["foo.txt"];
                                assert.equal(att.content_type, "text/plain");
                                assert.equal(att.data, testUtils.btoa("foo"));
                                assert.isString(att.digest);
                                assert.isUndefined(att.length);
                                assert.isUndefined(att.stub);
                            });
                        });
                    }));
                });
            });

            it("Replicate same doc, same atts 2", () => {
                const db = new PouchDB(dbs.name);
                const remote = new PouchDB(dbs.remote);

                const doc = {
                    _id: "doc",
                    _attachments: {
                        "foo.txt": {
                            content_type: "text/plain",
                            data: testUtils.btoa("foo")
                        }
                    }
                };

                return db.put(doc).then((res) => {
                    doc._rev = res.rev;
                    return db.replicate.to(remote);
                }).then(() => {
                    return remote.put(doc);
                }).then((res) => {
                    doc._rev = res.rev;
                    return db.replicate.from(remote);
                }).then(() => {
                    return db.put(doc);
                }).then(() => {
                    return db.sync(remote);
                }).then(() => {
                    return testUtils.Promise.all([db, remote].map((pouch) => {
                        return pouch.allDocs({
                            include_docs: true,
                            attachments: true
                        }).then((res) => {
                            assert.lengthOf(res.rows, 1);
                            res.rows.forEach((row) => {
                                assert.lengthOf(Object.keys(row.doc._attachments), 1);
                                const att = row.doc._attachments["foo.txt"];
                                assert.equal(att.content_type, "text/plain");
                                assert.equal(att.data, testUtils.btoa("foo"));
                                assert.isString(att.digest);
                                assert.isUndefined(att.length);
                                assert.isUndefined(att.stub);
                            });
                        });
                    }));
                });
            });

            it("Attachments replicate", (done) => {
                const binAttDoc = {
                    _id: "bin_doc",
                    _attachments: {
                        "foo.txt": {
                            content_type: "text/plain",
                            data: "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ="
                        }
                    }
                };
                const docs1 = [
                    binAttDoc,
                    { _id: "0", integer: 0 },
                    { _id: "1", integer: 1 },
                    { _id: "2", integer: 2 },
                    { _id: "3", integer: 3 }
                ];

                const db = new PouchDB(dbs.name);
                const remote = new PouchDB(dbs.remote);

                remote.bulkDocs({ docs: docs1 }, () => {
                    db.replicate.from(remote, () => {
                        db.get("bin_doc", { attachments: true }, (err, doc) => {
                            assert.equal(binAttDoc._attachments["foo.txt"].data, doc._attachments["foo.txt"].data);
                            done();
                        });
                    });
                });
            });

            it("Attachment types replicate", () => {
                const binAttDoc = {
                    _id: "bin_doc",
                    _attachments: {
                        "foo.txt": {
                            content_type: "text/plain",
                            data: "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ="
                        }
                    }
                };
                const docs1 = [
                    binAttDoc,
                    { _id: "0", integer: 0 },
                    { _id: "1", integer: 1 },
                    { _id: "2", integer: 2 },
                    { _id: "3", integer: 3 }
                ];

                const db = new PouchDB(dbs.name);
                const remote = new PouchDB(dbs.remote);

                return remote.bulkDocs({ docs: docs1 }).then(() => {
                    return db.replicate.from(remote);
                }).then(() => {
                    return db.get("bin_doc", { attachments: true, binary: true });
                }).then((doc) => {
                    const blob = doc._attachments["foo.txt"].data;
                    assert.equal(blob.type, "text/plain");
                    return testUtils.readBlobPromise(blob);
                }).then((bin) => {
                    assert.equal(bin, testUtils.atob("VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ="));
                });
            });

            it("Many many attachments replicate", () => {
                const doc = { _id: "foo" };

                const db = new PouchDB(dbs.name);
                const remote = new PouchDB(dbs.remote);

                const data = testUtils.btoa("foobar");
                const blob = testUtils.binaryStringToBlob(
                    testUtils.atob(data), "text/plain");

                doc._attachments = {};
                const expectedKeys = [];
                for (let i = 0; i < 50; i++) {
                    doc._attachments[`${i}.txt`] = {
                        content_type: "text/plain",
                        data: blob
                    };
                    expectedKeys.push(`${i}.txt`);
                }
                return db.put(doc).then(() => {
                    return db.replicate.to(remote);
                }).then(() => {
                    return remote.get("foo", { attachments: true });
                }).then((doc) => {
                    const keys = Object.keys(doc._attachments);
                    keys.sort();
                    assert.deepEqual(keys, expectedKeys.sort());
                    assert.equal(doc._attachments[keys[0]].data, data);
                });
            });

            it("Many many png attachments replicate", () => {
                const doc = { _id: "foo" };

                const db = new PouchDB(dbs.name);
                const remote = new PouchDB(dbs.remote);

                const data = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAMFBMVEX+9+" +
                    "j+9OD+7tL95rr93qT80YD7x2L6vkn6syz5qRT4ogT4nwD4ngD4nQD4nQD4" +
                    "nQDT2nT/AAAAcElEQVQY002OUQLEQARDw1D14f7X3TCdbfPnhQTqI5UqvG" +
                    "OWIz8gAIXFH9zmC63XRyTsOsCWk2A9Ga7wCXlA9m2S6G4JlVwQkpw/Ymxr" +
                    "UgNoMoyxBwSMH/WnAzy5cnfLFu+dK2l5gMvuPGLGJd1/9AOiBQiEgkzOpg" +
                    "AAAABJRU5ErkJggg==";
                const blob = testUtils.binaryStringToBlob(testUtils.atob(data),
                    "image/png");

                doc._attachments = {};
                const expectedKeys = [];
                for (let i = 0; i < 50; i++) {
                    doc._attachments[`${i}.txt`] = {
                        content_type: "image/png",
                        data: blob
                    };
                    expectedKeys.push(`${i}.txt`);
                }
                return db.put(doc).then(() => {
                    return db.replicate.to(remote);
                }).then(() => {
                    return remote.get("foo", { attachments: true });
                }).then((doc) => {
                    const keys = Object.keys(doc._attachments);
                    keys.sort();
                    assert.deepEqual(keys, expectedKeys.sort());
                    assert.equal(doc._attachments[keys[0]].data, data);
                });
            });

            it("Multiple attachments replicate", () => {
                const doc = { _id: "foo" };

                const db = new PouchDB(dbs.name);
                const remote = new PouchDB(dbs.remote);

                const data = "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ=";
                let rev;
                return db.put(doc).then((info) => {
                    rev = info.rev;
                    return db.replicate.to(remote);
                }).then(() => {
                    return db.putAttachment(doc._id, "foo1.txt", rev, data, "text/plain");
                }).then((info) => {
                    rev = info.rev;
                    return db.putAttachment(doc._id, "foo2.txt", rev, data, "text/plain");
                }).then((info) => {
                    rev = info.rev;
                    return db.putAttachment(doc._id, "foo3.txt", rev, data, "text/plain");
                }).then(() => {
                    return db.replicate.to(remote);
                }).then(() => {
                    return remote.get("foo", { attachments: true });
                }).then((doc) => {
                    const keys = Object.keys(doc._attachments);
                    keys.sort();
                    assert.deepEqual(keys, ["foo1.txt", "foo2.txt", "foo3.txt"]);
                });
            });

            it("#3961 Many attachments on same doc", () => {
                const doc = { _id: "foo", _attachments: {} };

                const db = new PouchDB(dbs.name);
                const remote = new PouchDB(dbs.remote);

                for (let i = 0; i < 100; i++) {
                    doc._attachments[`${i}.txt`] = {
                        data: testUtils.btoa(i.toString()),
                        content_type: "text/plain"
                    };
                }

                return db.put(doc).then(() => {
                    return db.replicate.to(remote);
                }).then(() => {
                    return testUtils.Promise.all([
                        db, remote
                    ].map((pouch) => {
                        return pouch.get("foo", { attachments: true }).then((doc) => {
                            const atts = doc._attachments;
                            assert.equal(Object.keys(atts).length, 100);
                            for (let i = 0; i < 100; i++) {
                                const att = atts[`${i}.txt`];
                                assert.isUndefined(att.stub);
                                assert.equal(att.data, testUtils.btoa(i.toString()));
                                assert.equal(att.content_type, "text/plain");
                            }
                        }).then(() => {
                            return pouch.get("foo");
                        }).then((doc) => {
                            const atts = doc._attachments;
                            assert.equal(Object.keys(atts).length, 100);
                            for (let i = 0; i < 100; i++) {
                                const att = atts[`${i}.txt`];
                                assert.equal(att.stub, true);
                                assert.equal(att.content_type, "text/plain");
                                assert.equal(att.length, i.toString().length);
                                assert.exists(att.digest);
                            }
                        });
                    }));
                });
            });

            it("Multiple attachments replicate, different docs (#2698)", () => {
                const db = new PouchDB(dbs.name);
                const remote = new PouchDB(dbs.remote);
                const docs = [];
                for (let i = 0; i < 5; i++) {
                    docs.push({
                        _id: i.toString(),
                        _attachments: {
                            "foo.txt": {
                                data: "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ=",
                                content_type: "text/plain"
                            }
                        }
                    });
                }
                return remote.bulkDocs(docs).then(() => {
                    return remote.replicate.to(db);
                }).then(() => {
                    return db.allDocs();
                }).then((res) => {
                    return testUtils.Promise.all(res.rows.map((row) => {
                        return db.get(row.id, { attachments: true });
                    }));
                }).then((docs) => {
                    const attachments = docs.map((doc) => {
                        delete doc._attachments["foo.txt"].revpos;
                        delete doc._attachments["foo.txt"].digest;
                        return doc._attachments;
                    });
                    assert.deepEqual(attachments, [1, 2, 3, 4, 5].map(() => {
                        return {
                            "foo.txt": {
                                content_type: "text/plain",
                                data: "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ="
                            }
                        };
                    }));
                });
            });

            it("Multiple attachments replicate, different docs png (#2698)", () => {
                const db = new PouchDB(dbs.name);
                const remote = new PouchDB(dbs.remote);
                const docs = [];
                for (let i = 0; i < 5; i++) {
                    docs.push({
                        _id: i.toString(),
                        _attachments: {
                            "foo.png": {
                                data: icons[i],
                                content_type: "image/png"
                            }
                        }
                    });
                }
                return remote.bulkDocs(docs).then(() => {
                    return remote.replicate.to(db);
                }).then(() => {
                    return db.allDocs();
                }).then((res) => {
                    return testUtils.Promise.all(res.rows.map((row) => {
                        return db.get(row.id, { attachments: true });
                    }));
                }).then((docs) => {
                    const attachments = docs.map((doc) => {
                        delete doc._attachments["foo.png"].revpos;
                        return doc._attachments;
                    });
                    assert.deepEqual(attachments, icons.map((icon, i) => {
                        return {
                            "foo.png": {
                                content_type: "image/png",
                                data: icon,
                                digest: iconDigests[i]
                            }
                        };
                    }));

                    return testUtils.Promise.all(docs.map((doc) => {
                        return db.get(doc._id);
                    }));
                }).then((docs) => {
                    const attachments = docs.map((doc) => {
                        delete doc._attachments["foo.png"].revpos;
                        return doc._attachments["foo.png"];
                    });
                    assert.deepEqual(attachments, icons.map((icon, i) => {
                        return {
                            content_type: "image/png",
                            stub: true,
                            digest: iconDigests[i],
                            length: iconLengths[i]
                        };
                    }));
                });
            });

            it("#3932 attachments with tricky revpos", () => {
                const db = new PouchDB(dbs.name);
                const remote = new PouchDB(dbs.remote);

                let rev;

                return remote.put({
                    _id: "test1",
                    type: "XX",
                    name: "Test1",
                    _attachments: {
                        "1.txt": { content_type: "text/plain", data: "Wlpa" }
                    }
                }).then(() => {
                    return db.replicate.from(remote);
                }).then(() => {
                    return db.get("test1");
                }).then((doc) => {
                    return db.put(doc);
                }).then((res) => {
                    rev = res.rev;
                    return db.replicate.to(remote);
                }).then(() => {
                    return remote.putAttachment("test1", "2.txt", rev,
                        "Wlpa", "text/plain");
                }).then(() => {
                    return remote.replicate.to(db);
                }).then(() => {
                    return db.get("test1", { attachments: true });
                }).then(() => {
                    return remote.get("test1", { attachments: true });
                }).then((doc) => {
                    doc._attachments = {
                        "1.txt": { content_type: "text/plain", data: "Wlpa" },
                        "2.txt": { content_type: "text/plain", data: "Wlpa" }
                    };
                    return db.put(doc);
                }).then(() => {
                    return db.get("test1", { attachments: true });
                }).then((doc) => {
                    return db.put(doc);
                }).then(() => {
                    return db.replicate.to(remote);
                }).then(() => {
                    return testUtils.Promise.all([db, remote].map((pouch) => {
                        return pouch.get("test1", { attachments: true }).then((doc) => {
                            const filenames = Object.keys(doc._attachments);
                            assert.lengthOf(filenames, 2);
                            filenames.forEach((filename) => {
                                const data = doc._attachments[filename].data;
                                assert.equal(data, "Wlpa");
                            });
                        });
                    }));
                });
            });

            it("replication with changing attachments", () => {
                const attachment = {
                    content_type: "text/plain",
                    data: "VGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIHRleHQ="
                };
                const attachment2 = {
                    content_type: "text/plain",
                    data: ""
                };
                const binAttDoc = {
                    _id: "bin_doc",
                    _attachments: {
                        "foo.txt": attachment
                    }
                };
                const db = new PouchDB(dbs.name);
                const remote = new PouchDB(dbs.remote);
                return db.put(binAttDoc).then(() => {
                    return db.get(binAttDoc._id);
                }).then((doc) => {
                    assert.exists(doc);
                    return db.get(binAttDoc._id);
                }).then((doc) => {
                    doc._attachments["bar.txt"] = attachment2;
                    return db.put(doc);
                }).then(() => {
                    return db.get(binAttDoc._id);
                }).then((doc) => {
                    assert.exists(doc);
                    return db.get(binAttDoc._id, { attachments: true });
                }).then((doc) => {
                    assert.isUndefined(doc._attachments["foo.txt"].stub);
                    assert.isUndefined(doc._attachments["bar.txt"].stub);
                    return db.replicate.to(remote);
                }).then(() => {
                    return remote.get(binAttDoc._id, { attachments: true });
                }).then((doc) => {
                    assert.isUndefined(doc._attachments["foo.txt"].stub);
                    doc._attachments["baz.txt"] = doc._attachments["foo.txt"];
                    return remote.put(doc);
                }).then(() => {
                    return remote.replicate.to(db);
                }).then(() => {
                    return db.get(binAttDoc._id, { attachments: true });
                }).then((doc) => {
                    assert.isUndefined(doc._attachments["foo.txt"].stub);
                    assert.isUndefined(doc._attachments["bar.txt"].stub);
                    assert.isUndefined(doc._attachments["baz.txt"].stub);
                    return db.get(binAttDoc._id);
                }).then((doc) => {
                    assert.exists(doc);
                });
            });

            it("3955 race condition in put", (done) => {

                const db = new PouchDB(dbs.name);
                const btoa = testUtils.btoa;
                const srcdata = ["", "", ""];

                for (let i = 0; i < 50; i++) {
                    srcdata[0] += "AAA";
                    srcdata[1] += "BBB";
                    srcdata[2] += "CCC";
                }

                const doc = {
                    _id: "x",
                    type: "testdoc",
                    _attachments: {
                        "a.txt": {
                            content_type: "text/plain",
                            data: btoa(srcdata[0])
                        },
                        "b.txt": {
                            content_type: "text/plain",
                            data: btoa(srcdata[1])
                        },
                        "c.txt": {
                            content_type: "text/plain",
                            data: btoa(srcdata[2])
                        },
                        "zzz.txt": {
                            content_type: "text/plain",
                            data: btoa("ZZZ")
                        }
                    }
                };

                db.put(doc).then(() => {
                    return db.get("x");
                }).then((doc) => {
                    const digests = Object.keys(doc._attachments).map((a) => {
                        return doc._attachments[a].digest;
                    });
                    if (isUnique(digests)) {
                        done();
                    } else {
                        done("digests are not unique");
                    }
                });

                doc._attachments["c.txt"].data = btoa("ZZZ");
                doc._attachments["b.txt"].data = btoa("ZZZ");

                function isUnique(arr) {
                    arr.sort();
                    for (let i = 1; i < arr.length; i++) {
                        if (arr[i - 1] === arr[i]) {
                            return false;
                        }
                    }
                    return true;
                }
            });

        });
});
