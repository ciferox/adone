class A {
    calc(a, b) {
        return new Promise((resolve) => {
            process.nextTick(() => {
                resolve(a + b);
            });
        });
    }
}

(async function () {
    const a = new A();
    console.log(await a.calc(1, 2));
})();
