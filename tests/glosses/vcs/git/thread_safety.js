const {
    std: { path },
    vcs: { git }
} = adone;

const { Repository } = git;

const local = path.join.bind(path, __dirname, "fixtures");

describe("ThreadSafety", () => {
    const reposPath = local("repos/workdir");

    beforeEach(function () {
        const test = this;

        return Repository.open(reposPath).then((repo) => {
            test.repository = repo;
            return repo.refreshIndex();
        }).then((index) => {
            test.index = index;
        });
    });

    it("can enable and disable thread safety", () => {
        const originalValue = git.getThreadSafetyStatus();

        git.enableThreadSafety();
        assert.equal(git.THREAD_SAFETY.ENABLED, git.getThreadSafetyStatus());

        git.setThreadSafetyStatus(git.THREAD_SAFETY.ENABLED_FOR_ASYNC_ONLY);
        assert.equal(git.THREAD_SAFETY.ENABLED_FOR_ASYNC_ONLY, git.getThreadSafetyStatus());

        git.setThreadSafetyStatus(git.THREAD_SAFETY.DISABLED);
        assert.equal(git.THREAD_SAFETY.DISABLED, git.getThreadSafetyStatus());

        git.setThreadSafetyStatus(originalValue);
    });

    it("can lock something and cleanup mutex", function () {
        let diagnostics = git.getThreadSafetyDiagnostics();
        const originalCount = diagnostics.storedMutexesCount;
        // call a sync method to guarantee that it stores a mutex,
        // and that it will clean up the mutex in a garbage collection cycle
        this.repository.headDetached();

        diagnostics = git.getThreadSafetyDiagnostics();
        switch (git.getThreadSafetyStatus()) {
            case git.THREAD_SAFETY.ENABLED:
                // this is a fairly vague test - it just tests that something
                // had a mutex created for it at some point (i.e., the thread safety
                // code is not completely dead)
                assert.ok(diagnostics.storedMutexesCount > 0);
                break;
            case git.THREAD_SAFETY.ENABLED_FOR_ASYNC_ONLY:
                assert.equal(originalCount, diagnostics.storedMutexesCount);
                break;

            case git.THREAD_SAFETY.DISABLED:
                assert.equal(0, diagnostics.storedMutexesCount);
        }
    });
});
