const {
    promise,
    virtualization: { libvirt } } = adone;
const fixture = require("../lib/helper").fixture;

// NOTE: you must run this manual test with `--expose-gc` to
//       trigger the bug!

// continuously run gc every 1ms
if (global.gc) {
    setInterval(global.gc, 1);
}

const xml = fixture("storage_volume.xml");
const hv = new libvirt.Hypervisor("test:///default");
const run = async () => {
    try {
        await hv.connectAsync();
        const pool = await hv.lookupStoragePoolByNameAsync("default-pool");
        await promise.delay(100);
        await pool.createVolumeAsync(xml);
        await promise.delay(100);
        await hv.disconnectAsync();
        await promise.delay(100);
        console.log("success");
    } catch (err) {
        console.log("error: ", err);
    }
};

const runLoop = async () => {
    await run();
    await promise.delay(100);
    await runLoop();
};

runLoop();
