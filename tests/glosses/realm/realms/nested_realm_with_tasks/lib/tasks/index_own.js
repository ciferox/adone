const {
    realm: { BaseTask 
    }
} = adone;

class OwnTaskA extends BaseTask {
    run() {
        return "own aaa";
    }
}

class OwnTaskB extends BaseTask {
    run() {
        return "own bbb";
    }
}

adone.lazify({
    ownA: () => OwnTaskA,
    ownB: () => OwnTaskB
}, exports);
