export default class TestService extends adone.omnitron.Service {
    async configureService() {
        setTimeout(() => {
            console.log("timeout occured");
        }, 60000);

        await adone.promise.delay(100);

        throw new adone.error.Runtime("configuration failed");
    }

    async initializeService() {
    }

    async uninitializeService() {
    }
}
