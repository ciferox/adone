export default async function () {
    await adone.promise.delay(100);
    console.log(`adone v${adone.package.version}`);
}
