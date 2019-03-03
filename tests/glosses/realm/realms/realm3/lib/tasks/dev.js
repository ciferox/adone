const {
    realm
} = adone;

class Task2 extends realm.BaseTask {
    main() {
        return adone.package.version;
    }
}

adone.lazify({
    task2: () => Task2
}, exports);
