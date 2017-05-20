const createMessageQueue = adone.net.mail.messageQueue;

describe("Message Queue Tests", () => {
    let queue;

    beforeEach(() => {
        queue = createMessageQueue();
    });

    it("Should Add item to queue", () => {
        expect(queue._instantQueue).to.deep.equal([]);
        queue.insert("value1");
        expect(queue._instantQueue).to.deep.equal(["value1"]);
        queue.insert("value2");
        expect(queue._instantQueue).to.deep.equal(["value2", "value1"]);
    });

    it("Should Pull items from a queue", (done) => {
        queue.insert("value1");
        queue.insert("value2");

        queue.get((value) => {
            expect(value).to.be.equal("value1");

            queue.get((value) => {
                expect(value).to.be.equal("value2");
                expect(queue._instantQueue).to.deep.equal([]);
                done();
            });
        });
    });

    it("Should Add delayed items", (done) => {
        queue.insert("value1", 300);
        queue.insert("value2", 100);
        queue.insert("value3");

        queue.get((value) => {
            expect(value).to.be.equal("value3");

            queue.get((value) => {
                expect(value).to.be.equal("value2");

                queue.get((value) => {
                    expect(value).to.be.equal("value1");
                    done();
                });
            });
        });
    });
});
