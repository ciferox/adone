const {
    net,
    std: { path },
    netron: { DEFAULT_PORT, Netron }
} = adone;

let defaultPort = DEFAULT_PORT;
// let NETRON_PORT = 32348;

const fixturePath = (relPath) => path.join(__dirname, "..", "fixtures", relPath);

describe("Streams", function () {
    this.timeout(10 * 1000);
    let exNetron;
    let superNetron;

    before(async () => {
        defaultPort = await net.util.getPort(defaultPort);
        // NETRON_PORT = await net.util.getPort({ exclude: [defaultPort] });
    });

    beforeEach(async () => {
        exNetron = new Netron();
        superNetron = new Netron({ isSuper: true });
    });

    afterEach(async () => {
        await exNetron.disconnect();
        await superNetron.unbind();
    });

    this.timeout(60 * 1000);

    it("should add stream and requested stream id to associated sets", async () => {
        await superNetron.bind();
        const clientPeer = await exNetron.connect();
        const wStream = await clientPeer.createStream();
        const cstreams = clientPeer._getAwaitingStreams();
        assert.equal(cstreams.length, 1);
        assert.deepEqual(cstreams[0], wStream);
        await adone.promise.delay(500);
        const serverPeer = superNetron.getPeer(exNetron.uid);
        const sstreamIds = serverPeer._getRequestedStreamIds();
        assert.equal(sstreamIds.length, 1);
        assert.deepEqual(sstreamIds[0], wStream.id);
    });

    it("should await for other side accept", async () => {
        await superNetron.bind();
        const clientPeer = await exNetron.connect();
        const wStream = await clientPeer.createStream();
        const serverPeer = superNetron.getPeer(exNetron.uid);
        await adone.promise.delay(500);
        const p = serverPeer.createStream({ remoteStreamId: wStream.id });
        const acceptedStreamId = await wStream.waitForAccept();
        const rStream = await p;
        assert.equal(acceptedStreamId, rStream.id);
    });

    for (const allowHalfOpen of [true, false]) {
        for (const dataCase of ["without", "with"]) {
            for (const checkType of ["native", "core"]) {
                // eslint-disable-next-line
                it(`should end stream on readable side (allowHalfOpen=${allowHalfOpen} + ${dataCase} data + ${checkType})`, async () => {
                    await superNetron.bind();
                    const clientPeer = await exNetron.connect();
                    const wStream = await clientPeer.createStream({ allowHalfOpen });
                    const serverPeer = superNetron.getPeer(exNetron.uid);
                    await adone.promise.delay(500);
                    let p = serverPeer.createStream({ remoteStreamId: wStream.id, allowHalfOpen });
                    await wStream.waitForAccept();

                    let wEnd = false;
                    let rEnd = false;
                    wStream.on("end", () => {
                        wEnd = true;
                    });

                    const rStream = await p;

                    let data = null;
                    if (checkType === "native") {
                        rStream._readableState.flowing = true; // crazy hack
                        rStream.on("data", (d) => {
                            data = d;
                        }).on("end", () => {
                            rEnd = true;
                        });

                        (dataCase === "with") && wStream.write("adone");
                        wStream.end();
                        await p;
                        await adone.promise.delay(1000);
                    } else {
                        const coreStream = new adone.stream.CoreStream();
                        rStream.pipe(coreStream);
                        p = coreStream.map((d) => data = d).on("end", () => rEnd = true);
                        (dataCase === "with") && wStream.write("adone");
                        wStream.end();
                        await p;
                    }

                    if (dataCase === "with") {
                        assert.equal(data, "adone", "Expected data on end but nothing");
                    } else {
                        assert.equal(data, null, "Unexpected data on end");
                    }
                    assert.equal(wEnd, !allowHalfOpen, "On writable side 'end' event was not happened");
                    assert.equal(rEnd, true, "On readable side 'end' event was not happened");
                });
            }
        }
    }

    it("should not write data after end", async () => {
        await superNetron.bind();
        const clientPeer = await exNetron.connect();
        const wStream = await clientPeer.createStream();
        const serverPeer = superNetron.getPeer(exNetron.uid);
        await adone.promise.delay(500);
        let p = serverPeer.createStream({ remoteStreamId: wStream.id });
        await wStream.waitForAccept();

        let wEnd = false;
        let rEnd = false;
        wStream.on("end", () => {
            wEnd = true;
        });

        const rStream = await p;

        let data = null;
        const coreStream = new adone.stream.CoreStream();
        rStream.pipe(coreStream);
        p = coreStream.map((d) => data = d).on("end", () => rEnd = true);

        wStream.write("adone");
        wStream.end();

        assert.throws(() => wStream.write("bad idea"), Error);

        await p;
        assert.equal(data, "adone", "Expected data on end but nothing");
        assert.equal(wEnd, false, "On writable side 'end' event was not happened");
        assert.equal(rEnd, true, "On readable side 'end' event was not happened");
    });

    it("should receive data after end", async () => {
        await superNetron.bind();
        const clientPeer = await exNetron.connect();
        const wStream = await clientPeer.createStream();
        const serverPeer = superNetron.getPeer(exNetron.uid);
        await adone.promise.delay(500);
        let p = serverPeer.createStream({ remoteStreamId: wStream.id });
        await wStream.waitForAccept();

        let wEnd = false;
        let rEnd = false;
        wStream.on("end", () => {
            wEnd = true;
        });

        const rStream = await p;

        let data = null;
        const coreStreamR = new adone.stream.CoreStream();
        rStream.pipe(coreStreamR);
        p = coreStreamR.map((d) => data = d).on("end", () => rEnd = true);

        wStream.write("adone");
        wStream.end();

        assert.throws(() => wStream.write("bad idea"), Error);

        await p;

        assert.equal(data, "adone", "Expected data on end but nothing");
        assert.equal(wEnd, false, "On writable side 'end' event was not happened");
        assert.equal(rEnd, true, "On readable side 'end' event was not happened");

        const coreStreamW = new adone.stream.CoreStream();
        wStream.pipe(coreStreamW);
        p = coreStreamW.map((d) => data = d).on("end", () => wEnd = true);
        rStream.write("enoda");
        rStream.end();

        await p;

        assert.equal(data, "enoda", "Expected data on end but nothing");
        assert.equal(wEnd, true, "On writable side 'end' event was not happened");
    });

    it("one way data sending", async () => {
        await superNetron.bind();
        const clientPeer = await exNetron.connect();
        const wStream = await clientPeer.createStream();
        const serverPeer = superNetron.getPeer(exNetron.uid);

        const rMessages = [];
        await adone.promise.delay(500);
        let p = serverPeer.createStream({ remoteStreamId: wStream.id });
        await wStream.waitForAccept();
        const rStream = await p;

        const rActualMessages = [];
        const coreStream = new adone.stream.CoreStream();
        rStream.pipe(coreStream);
        p = coreStream.map((data) => {
            rActualMessages.push(data);
            return data;
        });

        for (let i = 0; i < 1000; i++) {
            const msg = adone.text.random(adone.math.random(10, 10000));
            rMessages.push(msg);
            wStream.write(msg);
        }

        wStream.end();

        await p;
        assert.sameMembers(rMessages, rActualMessages);
    });

    for (const tcase of ["initiator", "acceptor"]) {
        // eslint-disable-next-line
        it.skip(`two way data sending - end initiated by ${tcase}`, async () => {
            await superNetron.bind();
            const clientPeer = await exNetron.connect();
            const wStream = await clientPeer.createStream({ allowHalfOpen: false });
            const serverPeer = superNetron.getPeer(exNetron.uid);

            const wMessages = [];
            const rMessages = [];
            await adone.promise.delay(500);
            const p = serverPeer.createStream({ remoteStreamId: wStream.id, allowHalfOpen: false });
            await wStream.waitForAccept();
            const rStream = await p;

            const wActualMessages = [];
            const coreStreamR = new adone.stream.CoreStream();
            rStream.pipe(coreStreamR);
            const p1 = coreStreamR.map((data) => {
                wActualMessages.push(data);
                return data;
            });

            const rActualMessages = [];
            const coreStreamW = new adone.stream.CoreStream();
            wStream.pipe(coreStreamW);
            const p2 = coreStreamW.map((data) => {
                rActualMessages.push(data);
                return data;
            });

            for (let i = 0; i < 3000; i++) {
                let msg = adone.text.random(adone.math.random(10, 10000));
                wMessages.push(msg);
                wStream.write(msg);

                msg = adone.text.random(adone.math.random(10, 10000));
                rMessages.push(msg);
                rStream.write(msg);
            }

            if (tcase === "initiator") {
                wStream.end();
            } else {
                rStream.end();
            }
            
            await Promise.all([p1, p2]);
            
            expect(rMessages).to.have.lengthOf(rActualMessages.length);
            expect(wMessages).to.have.lengthOf(wActualMessages.length);
            expect(rMessages).to.be.deep.equal(rActualMessages);
            expect(wMessages).to.be.deep.equal(wActualMessages);
        });
    }

    it("should flow data after resume", async () => {
        await superNetron.bind();
        const clientPeer = await exNetron.connect();
        const wStream = await clientPeer.createStream();
        const serverPeer = superNetron.getPeer(exNetron.uid);
        await adone.promise.delay(500);
        const p = serverPeer.createStream({ remoteStreamId: wStream.id });
        await wStream.waitForAccept();
        const rStream = await p;

        const sampleDatas = ["data1", "data2", "data3", "data4", "data5", "data6", "data7", "data8"];

        for (const d of sampleDatas) {
            wStream.write(d);
        }

        const datas = [];
        rStream.on("data", (d) => {
            datas.push(d);
        });

        await adone.promise.delay(1000);

        assert.equal(datas.length, 0);
        rStream.resume();
        assert.sameMembers(datas, sampleDatas);

        wStream.end();
    });

    for (const fileName of ["small", "big"]) {
        // eslint-disable-next-line
        it(`should send ${fileName} file`, async () => {
            await superNetron.bind();
            const clientPeer = await exNetron.connect();
            const wStream = await clientPeer.createStream({ allowHalfOpen: false });
            const serverPeer = superNetron.getPeer(exNetron.uid);
            await adone.promise.delay(500);
            const p = serverPeer.createStream({ remoteStreamId: wStream.id });
            await wStream.waitForAccept();
            const rStream = await p;

            const bs = new adone.stream.buffer.WritableStream();
            rStream.pipe(bs);

            const p1 = new Promise((resolve) => {
                rStream.on("end", resolve);
            });

            adone.std.fs.createReadStream(fixturePath(fileName)).pipe(wStream);

            await p1;

            const origBuff = adone.std.fs.readFileSync(fixturePath(fileName));
            assert.deepEqual(bs.getContents(), origBuff);
        });
    }

    for (const dataSize of [1024 * 1024, 10 * 1024 * 1024, 50 * 1024 * 1024]) {
        // eslint-disable-next-line
        it(`should send ${dataSize / 1024 / 1024}MB of data`, async () => {
            await superNetron.bind();
            const clientPeer = await exNetron.connect();
            const wStream = await clientPeer.createStream({ allowHalfOpen: false });
            const serverPeer = superNetron.getPeer(exNetron.uid);
            await adone.promise.delay(500);
            const p = serverPeer.createStream({ remoteStreamId: wStream.id });
            await wStream.waitForAccept();
            const rStream = await p;

            const bs = new adone.stream.buffer.WritableStream();
            rStream.pipe(bs);

            const p1 = new Promise((resolve) => {
                rStream.on("end", resolve);
            });

            const buff = new adone.collection.ByteArray();
            let remaining = dataSize;

            while (remaining > 0) {
                let chunkSize = adone.math.random(256, 65536);
                if (chunkSize > remaining) {
                    chunkSize = remaining;
                }
                remaining -= chunkSize;
                const data = adone.std.crypto.randomBytes(chunkSize);
                buff.write(data);
                wStream.write(data);
            }

            wStream.end();

            await p1;

            buff.flip();
            assert.deepEqual(bs.getContents(), buff.toBuffer());
        });
    }
});
