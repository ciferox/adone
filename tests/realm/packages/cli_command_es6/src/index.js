export default class TestCommand extends adone.app.Subsystem {
    async configure() {
        await adone.runtime.netron.getInterface("cli").defineCommand(this, {
            handler: this.testCommand            
        });
    }

    testCommand() {
        adone.log("well done");
    }
}
