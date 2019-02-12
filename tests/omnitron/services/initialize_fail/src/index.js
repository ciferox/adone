export default class TestService extends adone.omnitron.Service {
    async configureService() {
    }

    async initializeService() {
        setTimeout(() => {
            console.log("timeout occured");
        }, 60000);

        await adone.promise.delay(100);

        throw new adone.error.RuntimeException("configuration failed");
    }

    async uninitializeService() {
    }
}
