const {
    realm: { BaseTask 
    }
} = adone;

class OwnTaskA extends BaseTask {
    main() {
        return "own aaa";
    }
}

class OwnTaskB extends BaseTask {
    main() {
        return "own bbb";
    }
}

adone.lazify({
    ownA: () => OwnTaskA,
    ownB: () => OwnTaskB
}, exports);
