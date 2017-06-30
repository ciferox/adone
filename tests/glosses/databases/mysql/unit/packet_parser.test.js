describe("database", "mysql", "unit", "packet parser", () => {
    const { database: { mysql: { __: { PacketParser, packet: { Packet } } } }, is } = adone;

    const splitUP = (arr) => {
        const cases = [[arr]];
        for (let i = 1; i < arr.length; ++i) {
            const left = arr.slice(0, i);
            const right = arr.slice(i);
            if (right.length > 1) {
                for (const r of splitUP(right)) {
                    cases.push([left, ...r]);
                }
            } else {
                cases.push([left, right]);
            }
        }
        return cases;
    };

    it("should have 1 packet with sequence id = 123 and length of 14", () => {
        const sample = Buffer.from([10, 0, 0, 123, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
        const cases = splitUP(sample);

        for (const buffers of cases) {
            const packets = [];
            const parser = new PacketParser((packet) => {
                packets.push(packet);
            });
            for (const b of buffers) {
                parser.execute(b);
            }
            expect(packets).to.have.lengthOf(1);
            expect(packets[0].length()).to.be.equal(14);
            expect(packets[0].sequenceId).to.be.equal(123);
        }
    });

    it("should have 1 packet with sequenceId = 42 and length of 4", () => {
        const sample = Buffer.from([0, 0, 0, 42]);
        const cases = splitUP(sample);

        for (const buffers of cases) {
            const packets = [];
            const parser = new PacketParser((packet) => {
                packets.push(packet);
            });
            for (const b of buffers) {
                parser.execute(b);
            }
            expect(packets).to.have.lengthOf(1);
            expect(packets[0].length()).to.be.equal(4);
            expect(packets[0].sequenceId).to.be.equal(42);
        }
    });

    it("should have 2 packets with sequenceIds = 120, 121 and lengths of 4", () => {
        const sample = Buffer.from([0, 0, 0, 120, 0, 0, 0, 121]);
        const cases = splitUP(sample);

        for (const buffers of cases) {
            const packets = [];
            const parser = new PacketParser((packet) => {
                packets.push(packet);
            });
            for (const b of buffers) {
                parser.execute(b);
            }
            expect(packets).to.have.lengthOf(2);
            expect(packets[0].length()).to.be.equal(4);
            expect(packets[0].sequenceId).to.be.equal(120);
            expect(packets[1].length()).to.be.equal(4);
            expect(packets[1].sequenceId).to.be.equal(121);
        }
    });

    it("should have 2 packets with sequenceIds = 122, 123 and lengths of 9, 10", () => {
        const cases = [
            [[5, 0, 0, 122, 1, 2, 3, 4, 5, 6, 0, 0, 123, 1, 2, 3, 4, 5, 6]],
            [[5, 0, 0, 122, 1, 2, 3, 4, 5], [6, 0, 0, 123, 1, 2, 3, 4, 5, 6]],
            [[5, 0, 0, 122, 1, 2, 3, 4], [5], [6], [0, 0, 123, 1, 2, 3, 4, 5, 6]],
            [[5, 0, 0, 122, 1, 2, 3, 4, 5, 6], [0, 0, 123, 1, 2, 3, 4, 5, 6]],
            [[5, 0, 0, 122, 1, 2, 3, 4, 5, 6, 0], [0, 123, 1, 2, 3, 4, 5, 6]],
            [[5, 0, 0, 122, 1, 2, 3, 4, 5, 6, 0, 0], [123, 1, 2, 3, 4, 5, 6]],
            [[5, 0, 0, 122, 1, 2, 3, 4, 5, 6, 0, 0, 123], [1, 2, 3, 4, 5, 6]],
            [[5, 0, 0, 122, 1, 2, 3, 4, 5, 6, 0, 0, 123, 1], [2, 3, 4, 5, 6]],
            [[5, 0, 0, 122, 1, 2, 3, 4, 5, 6, 0, 0, 123, 1], [2, 3], [4, 5, 6]]
        ].map((x) => x.map((y) => is.buffer(y) ? y : Buffer.from(y)));

        for (const buffers of cases) {
            const packets = [];
            const parser = new PacketParser((packet) => {
                packets.push(packet);
            });
            for (const b of buffers) {
                parser.execute(b);
            }
            expect(packets).to.have.lengthOf(2);
            expect(packets[0].length()).to.be.equal(9);
            expect(packets[0].sequenceId).to.be.equal(122);
            expect(packets[1].length()).to.be.equal(10);
            expect(packets[1].sequenceId).to.be.equal(123);
        }
    });

    context("big buffers", () => {
        const length = 123000;
        const pbuff = Buffer.alloc(length + 4);
        pbuff[4] = 123;
        pbuff[5] = 124;
        pbuff[6] = 125;
        const p = new Packet(144, pbuff, 4, pbuff.length - 4);
        p.writeHeader(42);

        it("should have 2 packets", () => {
            const frameEnd = 120000;
            const cases = [
                [pbuff, pbuff],
                [pbuff.slice(0, 120000), pbuff.slice(120000, 123004), pbuff],
                [pbuff.slice(0, frameEnd), Buffer.concat([pbuff.slice(frameEnd, 123004), pbuff])]
            ];

            for (let frameStart = 1; frameStart < 100; frameStart++) {
                cases.push([
                    Buffer.concat([pbuff, pbuff.slice(0, frameStart)]),
                    pbuff.slice(frameStart, 123004)
                ]);
            }

            for (const buffers of cases) {
                const packets = [];
                const parser = new PacketParser((packet) => {
                    packets.push(packet);
                });

                for (const b of buffers) {
                    parser.execute(b);
                }

                expect(packets).to.have.lengthOf(2);
                expect(packets[0].length()).to.be.equal(length + 4);
                expect(packets[0].sequenceId).to.be.equal(42);
                expect(packets[0].readInt8()).to.be.equal(123);
                expect(packets[0].readInt8()).to.be.equal(124);
                expect(packets[0].readInt8()).to.be.equal(125);

                expect(packets[1].length()).to.be.equal(length + 4);
                expect(packets[1].sequenceId).to.be.equal(42);
                expect(packets[1].readInt8()).to.be.equal(123);
                expect(packets[1].readInt8()).to.be.equal(124);
                expect(packets[1].readInt8()).to.be.equal(125);
            }
        });
    });
});
