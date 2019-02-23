const {
    project
} = adone;

class Task1 extends project.BaseTask {
    main() {
        return "ok";
    }
}

class Task2 extends project.BaseTask {
    main() {
        return adone.package.version;
    }
}

adone.lazify({
    task1: () => Task1,
    task2: () => Task2
}, exports);
