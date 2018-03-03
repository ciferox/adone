export default async function () {
    await adone.promise.delay(100);
    adone.log(`adone v${adone.package.version}`);
}
