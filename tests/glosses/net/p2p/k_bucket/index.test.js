const {
    is,
    event,
    net: { p2p: { KBucket } }
} = adone;


describe("KBucket", () => {
    describe("add", () => {
        it("throws TypeError if contact has not property id", () => {
            assert.throws(() => {
                (new KBucket()).add(null);
            }, /^contact.id is not a Uint8Array$/);
        });

        it("throws TypeError if contact.id is not a Uint8Array", () => {
            assert.throws(() => {
                (new KBucket()).add({ id: "foo" });
            }, /^contact.id is not a Uint8Array$/);
        });

        it("adding a contact places it in root node", () => {
            const kBucket = new KBucket();
            const contact = { id: Buffer.from("a") };
            kBucket.add(contact);
            assert.deepEqual(kBucket.root.contacts, [contact]);
        });

        it("adding an existing contact does not increase number of contacts in root node", () => {
            const kBucket = new KBucket();
            const contact = { id: Buffer.from("a") };
            kBucket.add(contact);
            kBucket.add({ id: Buffer.from("a") });
            assert.deepEqual(kBucket.root.contacts.length, 1);
        });

        it("adding same contact moves it to the end of the root node (most-recently-contacted end)", () => {
            const kBucket = new KBucket();
            const contact = { id: Buffer.from("a") };
            kBucket.add(contact);
            assert.deepEqual(kBucket.root.contacts.length, 1);
            kBucket.add({ id: Buffer.from("b") });
            assert.deepEqual(kBucket.root.contacts.length, 2);
            assert.isTrue(kBucket.root.contacts[0] === contact); // least-recently-contacted end
            kBucket.add(contact);
            assert.deepEqual(kBucket.root.contacts.length, 2);
            assert.isTrue(kBucket.root.contacts[1] === contact); // most-recently-contacted end
        });

        it('adding contact to bucket that can\'t be split results in calling "ping" callback', (done) => {
            const kBucket = new KBucket({ localNodeId: Buffer.from([0x00, 0x00]) });
            let j;
            kBucket.on("ping", (contacts, replacement) => {
                assert.deepEqual(contacts.length, kBucket.numberOfNodesToPing);
                // console.dir(kBucket.root.right.contacts[0])
                for (let i = 0; i < kBucket.numberOfNodesToPing; ++i) {
                    // the least recently contacted end of the node should be pinged
                    assert.isTrue(contacts[i] === kBucket.root.right.contacts[i]);
                }
                assert.deepEqual(replacement, { id: Buffer.from([0x80, j]) });
                done();
            });
            for (j = 0; j < kBucket.numberOfNodesPerKBucket + 1; ++j) {
                kBucket.add({ id: Buffer.from([0x80, j]) }); // make sure all go into "far away" node
            }
        });

        it('should generate event "added" once', () => {
            const kBucket = new KBucket();
            const contact = { id: Buffer.from("a") };
            kBucket.on("added", (newContact) => {
                assert.deepEqual(newContact, contact);
            });
            kBucket.add(contact);
            kBucket.add(contact);
        });

        it('should generate event "added" when adding to a split node', () => {
            const kBucket = new KBucket({
                localNodeId: Buffer.from("") // need non-random localNodeId for deterministic splits
            });
            for (let i = 0; i < kBucket.numberOfNodesPerKBucket + 1; ++i) {
                kBucket.add({ id: Buffer.from(String(i)) });
            }
            assert.deepEqual(kBucket.root.contacts, null);
            const contact = { id: Buffer.from("a") };
            kBucket.on("added", (newContact) => {
                assert.deepEqual(newContact, contact);
            });
            kBucket.add(contact);
        });
    });

    describe("get", () => {
        it("throws TypeError if id is not a Buffer", () => {
            const kBucket = new KBucket();
            assert.throws(() => {
                kBucket.get("foo");
            });
        });

        it("get retrieves null if no contacts", () => {
            const kBucket = new KBucket();
            assert.deepEqual(kBucket.get(Buffer.from("foo")), null);
        });

        it("get retrieves a contact that was added", () => {
            const kBucket = new KBucket();
            const contact = { id: Buffer.from("a") };
            kBucket.add(contact);
            assert.isTrue(kBucket.get(Buffer.from("a")).id.equals(Buffer.from("a")));
        });

        it("get retrieves most recently added contact if same id", () => {
            const kBucket = new KBucket();
            const contact = { id: Buffer.from("a"), foo: "foo", bar: ":p", vectorClock: 0 };
            const contact2 = { id: Buffer.from("a"), foo: "bar", vectorClock: 1 };
            kBucket.add(contact);
            kBucket.add(contact2);
            assert.isTrue(kBucket.get(Buffer.from("a")).id.equals(Buffer.from("a")));
            assert.deepEqual(kBucket.get(Buffer.from("a")).foo, "bar");
            assert.deepEqual(kBucket.get(Buffer.from("a")).bar, undefined);
        });

        it("get retrieves contact from nested leaf node", () => {
            const kBucket = new KBucket({ localNodeId: Buffer.from([0x00, 0x00]) });
            let i;
            for (i = 0; i < kBucket.numberOfNodesPerKBucket; ++i) {
                kBucket.add({ id: Buffer.from([0x80, i]) }); // make sure all go into "far away" bucket
            }
            // cause a split to happen
            kBucket.add({ id: Buffer.from([0x00, i]), find: "me" });
            assert.deepEqual(kBucket.get(Buffer.from([0x00, i])).find, "me");
        });
    });

    describe("closest", () => {
        it("throws TypeError if contact.id is not a Buffer", () => {
            assert.throws(() => {
                (new KBucket()).closest("foo", 4);
            }, /^id is not a Uint8Array$/);
        });

        it("throw TypeError if n is not number", () => {
            assert.throws(() => {
                (new KBucket()).closest(Buffer.alloc(42), null);
            }, /^n is not positive number$/);
        });

        it("closest nodes are returned", () => {
            const kBucket = new KBucket();
            for (let i = 0; i < 0x12; ++i) {
                kBucket.add({ id: Buffer.from([i]) });
            }
            const contact = { id: Buffer.from([0x15]) }; // 00010101
            const contacts = kBucket.closest(contact.id, 3);
            assert.deepEqual(contacts.length, 3);
            assert.deepEqual(contacts[0].id, Buffer.from([0x11])); // distance: 00000100
            assert.deepEqual(contacts[1].id, Buffer.from([0x10])); // distance: 00000101
            assert.deepEqual(contacts[2].id, Buffer.from([0x05])); // distance: 00010000
        });

        it("n is Infinity by default", () => {
            const kBucket = new KBucket({ localNodeId: Buffer.from([0x00, 0x00]) });
            for (let i = 0; i < 1e3; ++i) {
                kBucket.add({ id: Buffer.from([~~(i / 256), i % 256]) });
            }
            assert.isTrue(kBucket.closest(Buffer.from([0x80, 0x80])).length > 100);
        });

        it("closest nodes are returned (including exact match)", () => {
            const kBucket = new KBucket();
            for (let i = 0; i < 0x12; ++i) {
                kBucket.add({ id: Buffer.from([i]) });
            }
            const contact = { id: Buffer.from([0x11]) }; // 00010001
            const contacts = kBucket.closest(contact.id, 3);
            assert.deepEqual(contacts[0].id, Buffer.from([0x11])); // distance: 00000000
            assert.deepEqual(contacts[1].id, Buffer.from([0x10])); // distance: 00000001
            assert.deepEqual(contacts[2].id, Buffer.from([0x01])); // distance: 00010000
        });

        it("closest nodes are returned even if there isn't enough in one bucket", () => {
            const kBucket = new KBucket({ localNodeId: Buffer.from([0x00, 0x00]) });
            for (let i = 0; i < kBucket.numberOfNodesPerKBucket; i++) {
                kBucket.add({ id: Buffer.from([0x80, i]) });
                kBucket.add({ id: Buffer.from([0x01, i]) });
            }
            kBucket.add({ id: Buffer.from([0x00, 0x01]) });
            const contact = { id: Buffer.from([0x00, 0x03]) }; // 0000000000000011
            const contacts = kBucket.closest(contact.id, 22);
            assert.deepEqual(contacts[0].id, Buffer.from([0x00, 0x01])); // distance: 0000000000000010
            assert.deepEqual(contacts[1].id, Buffer.from([0x01, 0x03])); // distance: 0000000100000000
            assert.deepEqual(contacts[2].id, Buffer.from([0x01, 0x02])); // distance: 0000000100000010
            assert.deepEqual(contacts[3].id, Buffer.from([0x01, 0x01]));
            assert.deepEqual(contacts[4].id, Buffer.from([0x01, 0x00]));
            assert.deepEqual(contacts[5].id, Buffer.from([0x01, 0x07]));
            assert.deepEqual(contacts[6].id, Buffer.from([0x01, 0x06]));
            assert.deepEqual(contacts[7].id, Buffer.from([0x01, 0x05]));
            assert.deepEqual(contacts[8].id, Buffer.from([0x01, 0x04]));
            assert.deepEqual(contacts[9].id, Buffer.from([0x01, 0x0b]));
            assert.deepEqual(contacts[10].id, Buffer.from([0x01, 0x0a]));
            assert.deepEqual(contacts[11].id, Buffer.from([0x01, 0x09]));
            assert.deepEqual(contacts[12].id, Buffer.from([0x01, 0x08]));
            assert.deepEqual(contacts[13].id, Buffer.from([0x01, 0x0f]));
            assert.deepEqual(contacts[14].id, Buffer.from([0x01, 0x0e]));
            assert.deepEqual(contacts[15].id, Buffer.from([0x01, 0x0d]));
            assert.deepEqual(contacts[16].id, Buffer.from([0x01, 0x0c]));
            assert.deepEqual(contacts[17].id, Buffer.from([0x01, 0x13]));
            assert.deepEqual(contacts[18].id, Buffer.from([0x01, 0x12]));
            assert.deepEqual(contacts[19].id, Buffer.from([0x01, 0x11]));
            assert.deepEqual(contacts[20].id, Buffer.from([0x01, 0x10]));
            assert.deepEqual(contacts[21].id, Buffer.from([0x80, 0x03])); // distance: 1000000000000000
            // console.log(require('util').inspect(kBucket, false, null))
        });
    });


    describe("count", () => {
        it("count returns 0 when no contacts in bucket", () => {
            const kBucket = new KBucket();
            assert.deepEqual(kBucket.count(), 0);
        });

        it("count returns 1 when 1 contact in bucket", () => {
            const kBucket = new KBucket();
            const contact = { id: Buffer.from("a") };
            kBucket.add(contact);
            assert.deepEqual(kBucket.count(), 1);
        });

        it("count returns 1 when same contact added to bucket twice", () => {
            const kBucket = new KBucket();
            const contact = { id: Buffer.from("a") };
            kBucket.add(contact);
            kBucket.add(contact);
            assert.deepEqual(kBucket.count(), 1);
        });

        it("count returns number of added unique contacts", () => {
            const kBucket = new KBucket();
            kBucket.add({ id: Buffer.from("a") });
            kBucket.add({ id: Buffer.from("a") });
            kBucket.add({ id: Buffer.from("b") });
            kBucket.add({ id: Buffer.from("b") });
            kBucket.add({ id: Buffer.from("c") });
            kBucket.add({ id: Buffer.from("d") });
            kBucket.add({ id: Buffer.from("c") });
            kBucket.add({ id: Buffer.from("d") });
            kBucket.add({ id: Buffer.from("e") });
            kBucket.add({ id: Buffer.from("f") });
            assert.deepEqual(kBucket.count(), 6);
        });
    });

    describe("createKBucket", () => {
        it("localNodeId should be a random SHA-1 if not provided", () => {
            const kBucket = new KBucket();
            assert.isTrue(kBucket.localNodeId instanceof Buffer);
            assert.deepEqual(kBucket.localNodeId.length, 20); // SHA-1 is 160 bits (20 bytes)
        });

        it("localNodeId is a Buffer populated from options if options.localNodeId Buffer is provided", () => {
            const localNodeId = Buffer.from("some length");
            const kBucket = new KBucket({ localNodeId });
            assert.isTrue(kBucket.localNodeId instanceof Buffer);
            assert.isTrue(kBucket.localNodeId.equals(localNodeId));
        });

        it("throws error if options.localNodeId is a String", () => {
            assert.throws(() => {
                return new KBucket({ localNodeId: "some identifier" });
            });
        });

        it("check root node", () => {
            const kBucket = new KBucket();
            assert.deepEqual(kBucket.root, { contacts: [], dontSplit: false, left: null, right: null });
        });

        it("inherits from event.Emitter", () => {
            const kBucket = new KBucket();
            assert.isTrue(kBucket instanceof event.Emitter);
        });
    });

    describe("defaultDistance", () => {
        const bucket = new KBucket();

        it("distance between 00000000 and 00000000 is 00000000", () => {
            assert.deepEqual(bucket.distance(Buffer.from([0x00]), Buffer.from([0x00])), 0);
        });

        it("distance between 00000000 and 00000001 is 00000001", () => {
            assert.deepEqual(bucket.distance(Buffer.from([0x00]), Buffer.from([0x01])), 1);
        });

        it("distance between 00000010 and 00000001 is 00000011", () => {
            assert.deepEqual(bucket.distance(Buffer.from([0x02]), Buffer.from([0x01])), 3);
        });

        it("distance between 00000000 and 0000000000000000 is 0000000011111111", () => {
            assert.deepEqual(bucket.distance(Buffer.from([0x00]), Buffer.from([0x00, 0x00])), 255);
        });

        it("distance between 0000000100100100 and 0100000000100100 is 0100000100000000", () => {
            assert.deepEqual(bucket.distance(Buffer.from([0x01, 0x24]), Buffer.from([0x40, 0x24])), 16640);
        });
    });

    describe("determineNode", () => {
        const LEFT_NODE = 0;
        const RIGHT_NODE = 1;
        const ROOT_NODE = { left: LEFT_NODE, right: RIGHT_NODE };

        it("id 00000000, bitIndex 0, should be low", () => {
            const kBucket = new KBucket();
            assert.deepEqual(kBucket._determineNode(ROOT_NODE, Buffer.from([0x00]), 0), LEFT_NODE);
        });

        it("id 01000000, bitIndex 0, should be low", () => {
            const kBucket = new KBucket();
            assert.deepEqual(kBucket._determineNode(ROOT_NODE, Buffer.from([0x40]), 0), LEFT_NODE);
        });

        it("id 01000000, bitIndex 1, should be high", () => {
            const kBucket = new KBucket();
            assert.deepEqual(kBucket._determineNode(ROOT_NODE, Buffer.from([0x40]), 1), RIGHT_NODE);
        });

        it("id 01000000, bitIndex 2, should be low", () => {
            const kBucket = new KBucket();
            assert.deepEqual(kBucket._determineNode(ROOT_NODE, Buffer.from([0x40]), 2), LEFT_NODE);
        });

        it("id 01000000, bitIndex 9, should be low", () => {
            const kBucket = new KBucket();
            assert.deepEqual(kBucket._determineNode(ROOT_NODE, Buffer.from([0x40]), 9), LEFT_NODE);
        });

        it("id 01000001, bitIndex 7, should be high", () => {
            const kBucket = new KBucket();
            assert.deepEqual(kBucket._determineNode(ROOT_NODE, Buffer.from([0x41]), 7), RIGHT_NODE);
        });

        it("id 0100000100000000, bitIndex 7, should be high", () => {
            const kBucket = new KBucket();
            assert.deepEqual(kBucket._determineNode(ROOT_NODE, Buffer.from([0x41, 0x00]), 7), RIGHT_NODE);
        });

        it("id 000000000100000100000000, bitIndex 15, should be high", () => {
            const kBucket = new KBucket();
            assert.deepEqual(kBucket._determineNode(ROOT_NODE, Buffer.from([0x00, 0x41, 0x00]), 15), RIGHT_NODE);
        });
    });


    describe("indexOf", () => {
        it("indexOf returns a contact with id that contains the same byte sequence as the test contact", () => {
            const kBucket = new KBucket();
            kBucket.add({ id: Buffer.from("a") });
            assert.deepEqual(kBucket._indexOf(kBucket.root, Buffer.from("a")), 0);
        });

        it("indexOf returns -1 if contact is not found", () => {
            const kBucket = new KBucket();
            kBucket.add({ id: Buffer.from("a") });
            assert.deepEqual(kBucket._indexOf(kBucket.root, Buffer.from("b")), -1);

        });
    });


    describe("remove", () => {
        it("throws TypeError if contact.id is not a Buffer", () => {
            const kBucket = new KBucket();
            const contact = { id: "foo" };
            assert.throws(() => {
                kBucket.remove(contact.id);
            });

        });

        it("removing a contact should remove contact from nested buckets", () => {
            const kBucket = new KBucket({ localNodeId: Buffer.from([0x00, 0x00]) });
            let i;
            for (i = 0; i < kBucket.numberOfNodesPerKBucket; ++i) {
                kBucket.add({ id: Buffer.from([0x80, i]) }); // make sure all go into "far away" bucket
            }
            // cause a split to happen
            kBucket.add({ id: Buffer.from([0x00, i]) });
            // console.log(require('util').inspect(kBucket, false, null))
            const contactToDelete = { id: Buffer.from([0x80, 0x00]) };
            assert.deepEqual(kBucket._indexOf(kBucket.root.right, contactToDelete.id), 0);
            kBucket.remove(Buffer.from([0x80, 0x00]));
            assert.deepEqual(kBucket._indexOf(kBucket.root.right, contactToDelete.id), -1);

        });

        it('should generate "removed"', () => {
            const kBucket = new KBucket();
            const contact = { id: Buffer.from("a") };
            kBucket.on("removed", (removedContact) => {
                assert.deepEqual(removedContact, contact);

            });
            kBucket.add(contact);
            kBucket.remove(contact.id);
        });

        it('should generate event "removed" when removing from a split bucket', () => {
            const kBucket = new KBucket({
                localNodeId: Buffer.from("") // need non-random localNodeId for deterministic splits
            });
            for (let i = 0; i < kBucket.numberOfNodesPerKBucket + 1; ++i) {
                kBucket.add({ id: Buffer.from(String(i)) });
            }
            assert.isUndefined(kBucket.bucket);
            const contact = { id: Buffer.from("a") };
            kBucket.on("removed", (removedContact) => {
                assert.deepEqual(removedContact, contact);

            });
            kBucket.add(contact);
            kBucket.remove(contact.id);
        });
    });

    describe("split", () => {
        it("adding a contact does not split node", () => {
            const kBucket = new KBucket();
            kBucket.add({ id: Buffer.from("a") });
            assert.deepEqual(kBucket.root.left, null);
            assert.deepEqual(kBucket.root.right, null);
            assert.notEqual(kBucket.root.contacts, null);

        });

        it("adding maximum number of contacts (per node) [20] into node does not split node", () => {
            const kBucket = new KBucket();
            for (let i = 0; i < kBucket.numberOfNodesPerKBucket; ++i) {
                kBucket.add({ id: Buffer.from(String(i)) });
            }
            assert.deepEqual(kBucket.root.left, null);
            assert.deepEqual(kBucket.root.right, null);
            assert.notEqual(kBucket.root.contacts, null);

        });

        it("adding maximum number of contacts (per node) + 1 [21] into node splits the node", () => {
            const kBucket = new KBucket();
            for (let i = 0; i < kBucket.numberOfNodesPerKBucket + 1; ++i) {
                kBucket.add({ id: Buffer.from(`${i}`) });
            }
            assert.notEqual(kBucket.root.left, null);
            assert.notEqual(kBucket.root.right, null);
            assert.deepEqual(kBucket.root.contacts, null);

        });

        it("split nodes contain all added contacts", () => {
            const kBucket = new KBucket({ localNodeId: Buffer.from([0x00]) });
            const foundContact = {};
            for (let i = 0; i < kBucket.numberOfNodesPerKBucket + 1; ++i) {
                kBucket.add({ id: Buffer.from([i]) });
                foundContact[i] = false;
            }
            const traverse = function (node) {
                if (is.null(node.contacts)) {
                    traverse(node.left);
                    traverse(node.right);
                } else {
                    node.contacts.forEach((contact) => {
                        foundContact[parseInt(contact.id.toString("hex"), 16)] = true;
                    });
                }
            };
            traverse(kBucket.root);
            Object.keys(foundContact).forEach((key) => {
                assert.isTrue(foundContact[key], key);
            });
            assert.deepEqual(kBucket.root.contacts, null);

        });

        it('when splitting nodes the "far away" node should be marked to prevent splitting "far away" node', () => {
            const kBucket = new KBucket({ localNodeId: Buffer.from([0x00]) });
            for (let i = 0; i < kBucket.numberOfNodesPerKBucket + 1; ++i) {
                kBucket.add({ id: Buffer.from([i]) });
            }
            // above algorithm will split left node 4 times and put 0x00 through 0x0f
            // in the left node, and put 0x10 through 0x14 in right node
            // since localNodeId is 0x00, we expect every right node to be "far" and
            // therefore marked as "dontSplit = true"
            // there will be one "left" node and four "right" nodes (t.expect(5))
            const traverse = function (node, dontSplit) {
                if (is.null(node.contacts)) {
                    traverse(node.left, false);
                    traverse(node.right, true);
                } else {
                    if (dontSplit) {
                        assert.isTrue(node.dontSplit);
                    } else {
                        assert.isFalse(node.dontSplit);
                    }
                }
            };
            traverse(kBucket.root);

        });
    });

    describe("toArray", () => {
        it("toArray should return empty array if no contacts", () => {
            const kBucket = new KBucket();
            assert.deepEqual(kBucket.toArray().length, 0);

        });

        it("toArray should return all contacts in an array arranged from low to high buckets", () => {
            const kBucket = new KBucket({ localNodeId: Buffer.from([0x00, 0x00]) });
            const expectedIds = [];
            let i;
            for (i = 0; i < kBucket.numberOfNodesPerKBucket; ++i) {
                kBucket.add({ id: Buffer.from([0x80, i]) }); // make sure all go into "far away" bucket
                expectedIds.push(0x80 * 256 + i);
            }
            // cause a split to happen
            kBucket.add({ id: Buffer.from([0x00, 0x80, i - 1]) });
            // console.log(require('util').inspect(kBucket, {depth: null}))
            const contacts = kBucket.toArray();
            // console.log(require('util').inspect(contacts, {depth: null}))
            assert.deepEqual(contacts.length, kBucket.numberOfNodesPerKBucket + 1);
            assert.deepEqual(parseInt(contacts[0].id.toString("hex"), 16), 0x80 * 256 + i - 1);
            contacts.shift(); // get rid of low bucket contact
            for (i = 0; i < kBucket.numberOfNodesPerKBucket; ++i) {
                assert.deepEqual(parseInt(contacts[i].id.toString("hex"), 16), expectedIds[i]);
            }

        });
    });

    describe("update", () => {
        it("invalid index results in error", () => {
            const kBucket = new KBucket();
            const contact = { id: Buffer.from("a") };
            kBucket.add(contact);
            assert.throws(() => {
                kBucket._update(contact, 1);
            });

        });

        it("deprecated vectorClock results in contact drop", () => {
            const kBucket = new KBucket();
            const contact = { id: Buffer.from("a"), vectorClock: 3 };
            kBucket.add(contact);
            kBucket._update(kBucket.root, 0, { id: Buffer.from("a"), vectorClock: 2 });
            assert.deepEqual(kBucket.root.contacts[0].vectorClock, 3);

        });

        it("equal vectorClock results in contact marked as most recent", () => {
            const kBucket = new KBucket();
            const contact = { id: Buffer.from("a"), vectorClock: 3 };
            kBucket.add(contact);
            kBucket.add({ id: Buffer.from("b") });
            kBucket._update(kBucket.root, 0, contact);
            assert.deepEqual(kBucket.root.contacts[1], contact);

        });

        it("more recent vectorClock results in contact update and contact being marked as most recent", () => {
            const kBucket = new KBucket();
            const contact = { id: Buffer.from("a"), old: "property", vectorClock: 3 };
            kBucket.add(contact);
            kBucket.add({ id: Buffer.from("b") });
            kBucket._update(kBucket.root, 0, { id: Buffer.from("a"), newer: "property", vectorClock: 4 });
            assert.isTrue(kBucket.root.contacts[1].id.equals(contact.id));
            assert.deepEqual(kBucket.root.contacts[1].vectorClock, 4);
            assert.deepEqual(kBucket.root.contacts[1].old, undefined);
            assert.deepEqual(kBucket.root.contacts[1].newer, "property");

        });

        it('should generate "updated"', () => {
            const kBucket = new KBucket();
            const contact1 = { id: Buffer.from("a"), vectorClock: 1 };
            const contact2 = { id: Buffer.from("a"), vectorClock: 2 };
            kBucket.on("updated", (oldContact, newContact) => {
                assert.deepEqual(oldContact, contact1);
                assert.deepEqual(newContact, contact2);

            });
            kBucket.add(contact1);
            kBucket.add(contact2);
        });

        it('should generate event "updated" when updating a split node', () => {
            const kBucket = new KBucket({
                localNodeId: Buffer.from("") // need non-random localNodeId for deterministic splits
            });
            for (let i = 0; i < kBucket.numberOfNodesPerKBucket + 1; ++i) {
                kBucket.add({ id: Buffer.from(`${i}`) });
            }
            assert.isUndefined(kBucket.bucket);
            const contact1 = { id: Buffer.from("a"), vectorClock: 1 };
            const contact2 = { id: Buffer.from("a"), vectorClock: 2 };
            kBucket.on("updated", (oldContact, newContact) => {
                assert.deepEqual(oldContact, contact1);
                assert.deepEqual(newContact, contact2);

            });
            kBucket.add(contact1);
            kBucket.add(contact2);
        });
    });
});
