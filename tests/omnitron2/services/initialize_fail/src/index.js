export default class TestService extends adone.omnitron.Service {
    async configureService() {
    }

    async initializeService() {
        setTimeout(() => {
            adone.log("timeout occured");
        }, 60000);

        await adone.promise.delay(100);

        throw new adone.exception.Runtime("configuration failed");
    }

    async uninitializeService() {
    }
}
