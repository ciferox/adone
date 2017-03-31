/* global describe it */

const { bson } = adone.data;
const { BSON } = bson;
const ObjectID = bson.ObjectID;

function createBSON() {
    return new BSON();
}

describe("bson", () => {
    describe("to bson", () => {
        it("Should correctly handle toBson function for an object", function () {
            // Test object
            const doc = {
                hello: new ObjectID(),
                a: 1
            };

            // Add a toBson method to the object
            doc.toBSON = function () {
                return { b: 1 };
            };

            // Serialize the data
            let serialized_data = createBSON().serialize(doc, false, true);
            let deserialized_doc = createBSON().deserialize(serialized_data);
            expect({ b: 1 }).to.be.deep.equal(deserialized_doc);

            // Serialize the data
            serialized_data = createBSON().serialize(doc, false, true);
            deserialized_doc = createBSON().deserialize(serialized_data);
            expect({ b: 1 }).to.be.deep.equal(deserialized_doc);
        });

        /**
         * @ignore
         */
        it("Should correctly handle embedded toBson function for an object", function () {
            // Test object
            const doc = {
                hello: new ObjectID(),
                a: 1,
                b: {
                    d: 1
                }
            };

            // Add a toBson method to the object
            doc.b.toBSON = function () {
                return { e: 1 };
            };

            // Serialize the data
            let serialized_data = createBSON().serialize(doc, false, true);
            let deserialized_doc = createBSON().deserialize(serialized_data);
            expect({ e: 1 }).to.be.deep.equal(deserialized_doc.b);

            serialized_data = createBSON().serialize(doc, false, true);
            deserialized_doc = createBSON().deserialize(serialized_data);
            expect({ e: 1 }).to.be.deep.equal(deserialized_doc.b);
        });

        /**
         * @ignore
         */
        it("Should correctly serialize when embedded non object returned by toBSON", function () {
            // Test object
            const doc = {
                hello: new ObjectID(),
                a: 1,
                b: {
                    d: 1
                }
            };

            // Add a toBson method to the object
            doc.b.toBSON = function () {
                return "hello";
            };

            // Serialize the data
            let serialized_data = createBSON().serialize(doc, false, true);
            let deserialized_doc = createBSON().deserialize(serialized_data);
            expect("hello").to.be.deep.equal(deserialized_doc.b);

            // Serialize the data
            serialized_data = createBSON().serialize(doc, false, true);
            deserialized_doc = createBSON().deserialize(serialized_data);
            expect("hello").to.be.deep.equal(deserialized_doc.b);
        });

        /**
         * @ignore
         */
        it("Should fail when top level object returns a non object type", function () {
            // Test object
            const doc = {
                hello: new ObjectID(),
                a: 1,
                b: {
                    d: 1
                }
            };

            // Add a toBson method to the object
            doc.toBSON = function () {
                return "hello";
            };

            let test1 = false;
            let test2 = false;
            let serialized_data;
            let deserialized_doc;

            try {
                serialized_data = createBSON().serialize(doc, false, true);
                deserialized_doc = createBSON().deserialize(serialized_data);
            } catch (err) {
                test1 = true;
            }

            try {
                serialized_data = createBSON().serialize(doc, false, true);
                deserialized_doc = createBSON().deserialize(serialized_data);
            } catch (err) {
                test2 = true;
            }

            expect(true).to.be.equal(test1);
            expect(true).to.be.equal(test2);
        });
    });
});