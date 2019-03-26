const {
    realm: { BaseTask
    }
} = adone;

class PubTaskA extends BaseTask {
    main() {
        return "pub aaa";
    }
}

class PubTaskB extends BaseTask {
    main() {
        return "pub bbb";
    }
}

class DummyTask extends BaseTask {
    main() {
        return "root dummy";
    }
}

adone.lazify({
    pubA: () => PubTaskA,
    pubB: () => PubTaskB,
    dummy: () => DummyTask
}, exports);
