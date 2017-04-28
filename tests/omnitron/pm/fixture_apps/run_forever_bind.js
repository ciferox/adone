const adone = require("../../../../").default;

class Simple {
    exit() {
        process.exit();
    }
}
adone.netron.decorator.Contextable(Simple);

const netron = new adone.netron.Netron();
netron.attachContext(new Simple(), "simple");
netron.bind({ port: process.argv[2] });