const {
    realm: { BaseTask
    }
} = adone;

class PubTaskA extends BaseTask {
    run() {
        return "pub aaa";
    }
}

class PubTaskB extends BaseTask {
    run() {
        return "pub bbb";
    }
}

class DummyTask extends BaseTask {
    run() {
        return "root dummy";
    }
}

adone.lazify({
    pubA: () => PubTaskA,
    pubB: () => PubTaskB,
    dummy: () => DummyTask
}, exports);
