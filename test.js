import adone from "adone";

const { vcs: { git } } = adone;

adone.run({
    main() {
        adone.log(git.AnnotatedCommit);
        adone.log("ok");
    }
});
