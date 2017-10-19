Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = class TestCommand {
    async configure() {
        await adone.runtime.netron.getInterface("cli").defineCommand(this, {
            handler: this.testCommand            
        });
    }

    testCommand() {
        adone.log("well done");
    }
};
