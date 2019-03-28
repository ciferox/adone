import SimpleClassTransport from "./fixtures/simple_class_transport";

describe("app", "logger", "Inheritance patterns", () => {
    it("TransportStream", () => {
        const transport = new SimpleClassTransport();
        assert(transport);
    });
});
