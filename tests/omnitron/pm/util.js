const { std: { path }, is } = adone;

export const fixturesDir = path.join(__dirname, "fixture_apps");
export const fixture = (p) => path.join(fixturesDir, p);

export function processFiles(storage) {
    return {
        stdout: path.join(storage.path(), "stdout.log"),
        stderr: path.join(storage.path(), "stderr.log"),
        port: (is.win32 ? "\\\\.\\pipe\\" : "") + path.join(storage.path(), "port.sock")
    };
}

export async function waitFor(f, delay = 100) {
    for (; !await f();) {
        await adone.promise.delay(delay);
    }
}
