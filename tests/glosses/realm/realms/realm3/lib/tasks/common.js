const {
    realm
} = adone;

class Task1 extends realm.BaseTask {
    main() {
        return "ok";
    }
}

adone.lazify({
    task1: () => Task1
}, exports);
