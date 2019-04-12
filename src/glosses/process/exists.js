const {
    is,
    process: { list }
} = adone;

const { 
    checkProc
} = adone.private(adone.process);

export default (proc) => {
    try {
        if (is.number(proc)) {
            return process.kill(proc, 0);
        }

        return list().then((list) => list.some((x) => checkProc(proc, x)));
    } catch (e) {
        return e.code === "EPERM";
    }
};
