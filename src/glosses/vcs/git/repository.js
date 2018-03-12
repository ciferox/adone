const {
    is,
    promise: { promisifyAll },
    std: { path },
    vcs: { git: {
        native,
        Error, // force load in case of indirect instantiation
        Index, // force load in case of indirect instantiation
        ConvenientPatch, // force load in case of indirect instantiation
        ConvenientHunk, // force load in case of indirect instantiation
        Odb, // force load in case of indirect instantiation
        MergeOptions,
        RepositoryInitOptions,
        AnnotatedCommit,
        Diff,
        Branch,
        Filter,
        FilterList,
        Blob,
        Checkout,
        Commit,
        Merge,
        Reference,
        Remote,
        Revwalk,
        Status,
        StatusFile,
        StatusList,
        Submodule,
        Tag,
        Tree,
        TreeBuilder,
        Rebase,
        Signature,
        Utils: { normalizeOptions, shallowClone } }
    },
    lodash: _
} = adone;

const Repository = native.Repository;

Repository.INIT_FLAG = {
    BARE: 1,
    NO_REINIT: 2,
    NO_DOTGIT_DIR: 4,
    MKDIR: 8,
    MKPATH: 16,
    EXTERNAL_TEMPLATE: 32,
    RELATIVE_GITLINK: 64
};
Repository.INIT_MODE = {
    INIT_SHARED_UMASK: 0,
    INIT_SHARED_GROUP: 1533,
    INIT_SHARED_ALL: 1535
};
Repository.OPEN_FLAG = {
    OPEN_NO_SEARCH: 1,
    OPEN_CROSS_FS: 2,
    OPEN_BARE: 4,
    OPEN_NO_DOTGIT: 8,
    OPEN_FROM_ENV: 16
};
Repository.STATE = {
    NONE: 0,
    MERGE: 1,
    REVERT: 2,
    REVERT_SEQUENCE: 3,
    CHERRYPICK: 4,
    CHERRYPICK_SEQUENCE: 5,
    BISECT: 6,
    REBASE: 7,
    REBASE_INTERACTIVE: 8,
    REBASE_MERGE: 9,
    APPLY_MAILBOX: 10,
    APPLY_MAILBOX_OR_REBASE: 11
};

Repository.prototype.config = promisifyAll(Repository.prototype.config);
Repository.prototype.configSnapshot = promisifyAll(Repository.prototype.configSnapshot);
Repository.discover = promisifyAll(Repository.discover);
Repository.prototype.fetchheadForeach = promisifyAll(Repository.prototype.fetchheadForeach);
Repository.prototype.head = promisifyAll(Repository.prototype.head);
Repository.prototype.index = promisifyAll(Repository.prototype.index);
Repository.init = promisifyAll(Repository.init);
Repository.initExt = promisifyAll(Repository.initExt);
Repository.prototype.mergeheadForeach = promisifyAll(Repository.prototype.mergeheadForeach);
Repository.prototype.odb = promisifyAll(Repository.prototype.odb);
Repository.open = promisifyAll(Repository.open);
Repository.openBare = promisifyAll(Repository.openBare);
Repository.openExt = promisifyAll(Repository.openExt);
Repository.prototype.refdb = promisifyAll(Repository.prototype.refdb);
Repository.prototype.setHead = promisifyAll(Repository.prototype.setHead);
Repository.wrapOdb = promisifyAll(Repository.wrapOdb);

const _discover = Repository.discover;
const _initExt = Repository.initExt;
const _fetchheadForeach = Repository.prototype.fetchheadForeach;
const _mergeheadForeach = Repository.prototype.mergeheadForeach;

const applySelectedLinesToTarget = (originalContent, newLines, pathHunks, isStaged, reverse) => {
    // 43: ascii code for '+'
    // 45: ascii code for '-'
    const lineTypes = {
        ADDED: !reverse ? 43 : 45,
        DELETED: !reverse ? 45 : 43
    };
    let newContent = "";
    let oldIndex = 0;
    const linesPromises = [];

    const oldLines = originalContent.toString().split("\n");

    // if no selected lines were sent, return the original content
    if (!newLines || newLines.length === 0) {
        return originalContent;
    }

    const lineEqualsFirstNewLine = (hunkLine) => ((hunkLine.oldLineno() === newLines[0].oldLineno()) && (hunkLine.newLineno() === newLines[0].newLineno()));

    const processSelectedLine = (hunkLine) => {
        // if this hunk line is a selected line find the selected line
        const newLine = newLines.filter((nLine) => {
            return ((hunkLine.oldLineno() === nLine.oldLineno()) &&
                (hunkLine.newLineno() === nLine.newLineno()));
        });

        if (hunkLine.content().indexOf("\\ No newline at end of file") !== -1) {
            return false;
        }

        // determine what to add to the new content
        if ((isStaged && newLine && newLine.length > 0) ||
            (!isStaged && (!newLine || newLine.length === 0))) {
            if (hunkLine.origin() !== lineTypes.ADDED) {
                newContent += hunkLine.content();
            }
            if ((isStaged && hunkLine.origin() !== lineTypes.DELETED) ||
                (!isStaged && hunkLine.origin() !== lineTypes.ADDED)) {
                oldIndex++;
            }
        } else {
            switch (hunkLine.origin()) {
                case lineTypes.ADDED:
                    newContent += hunkLine.content();
                    if (isStaged) {
                        oldIndex++;
                    }
                    break;
                case lineTypes.DELETED:
                    if (!isStaged) {
                        oldIndex++;
                    }
                    break;
                default:
                    newContent += oldLines[oldIndex++];
                    if (oldIndex < oldLines.length) {
                        newContent += "\n";
                    }
                    break;
            }
        }
    };

    // find the affected hunk
    pathHunks.forEach((pathHunk) => {
        linesPromises.push(pathHunk.lines());
    });

    return Promise.all(linesPromises).then((results) => {
        for (let i = 0; i < results.length && newContent.length < 1; i++) {
            const hunkStart = isStaged || reverse ? pathHunks[i].newStart() : pathHunks[i].oldStart();
            const lines = results[i];
            if (lines.filter(lineEqualsFirstNewLine).length > 0) {
                // add content that is before the hunk
                while (hunkStart > (oldIndex + 1)) {
                    newContent += `${oldLines[oldIndex++]}\n`;
                }

                // modify the lines of the hunk according to the selection
                lines.forEach(processSelectedLine);

                // add the rest of the file
                while (oldLines.length > oldIndex) {
                    newContent += oldLines[oldIndex++] +
                        (oldLines.length > oldIndex ? "\n" : "");
                }
            }
        }

        return newContent;
    });
};

const getPathHunks = (repo, index, filePath, isStaged, additionalDiffOptions) => {
    const diffOptions = additionalDiffOptions ? {
        flags: additionalDiffOptions
    } : undefined;

    return Promise.resolve().then(() => {
        if (isStaged) {
            return repo.getHeadCommit().then(function getTreeFromCommit(commit) {
                return commit.getTree();
            }).then(function getDiffFromTree(tree) {
                return Diff.treeToIndex(repo, tree, index, diffOptions);
            });
        }

        return Diff.indexToWorkdir(repo, index, {
            flags: Diff.OPTION.SHOW_UNTRACKED_CONTENT | Diff.OPTION.RECURSE_UNTRACKED_DIRS | (additionalDiffOptions || 0)
        });
    }).then((diff) => {
        return Status.file(repo, filePath).then((status) => {
            if (!(status & Status.STATUS.WT_MODIFIED) &&
                !(status & Status.STATUS.INDEX_MODIFIED)) {
                return Promise.reject("Selected staging is only available on modified files.");
            }
            return diff.patches();
        });
    }).then((patches) => {
        const pathPatch = patches.filter((patch) => {
            return patch.newFile().path() === filePath;
        });

        if (pathPatch.length !== 1) {
            return Promise.reject("No differences found for this file.");
        }

        return pathPatch[0].hunks();
    });
};

/**
 * Goes through a rebase's rebase operations and commits them if there are
 * no merge conflicts
 *
 * @param {Repository}  repository    The repository that the rebase is being
 *                                    performed in
 * @param {Rebase}      rebase        The current rebase being performed
 * @param {Signature}   signature     Identity of the one performing the rebase
 * @param {Function}    beforeNextFn  Callback to be called before each
 *                                    invocation of next(). If the callback
 *                                    returns a promise, the next() will be
 *                                    called when the promise resolves.
 * @param {Function}   beforeFinishFn Callback called before the invocation
 *                                    of finish(). If the callback returns a
 *                                    promise, finish() will be called when the
 *                                    promise resolves. This callback will be
 *                                    provided a detailed overview of the rebase
 * @return {Int|Index} An error code for an unsuccesful rebase or an index for
 *                     a rebase with conflicts
 */
const performRebase = (repository, rebase, signature, beforeNextFn, beforeFinishFn) => {
    let beforeNextFnResult;

    const readRebaseMetadataFile = (fileName) => adone.fs.readFile(path.join(repository.path(), "rebase-merge", fileName), { encoding: "utf8" }).then(_.trim);

    const calcHeadName = (input) => input.replace(/refs\/heads\/(.*)/, "$1");

    const getPromise = () => {
        return rebase.next().then(() => {
            return repository.refreshIndex();
        }).then((index) => {
            if (index.hasConflicts()) {
                throw index;
            }

            return rebase.commit(null, signature);
        }).then(() => {
            return performRebase(repository, rebase, signature, beforeNextFn, beforeFinishFn);
        }).catch((error) => {
            if (error && error.errno === adone.vcs.git.Error.CODE.ITEROVER) {
                const calcRewritten = (x) => _.map(_.split(x, "\n"), (xx) => _.split(xx, " "));

                const beforeFinishFnPromise = !beforeFinishFn ? Promise.resolve() :
                    Promise.all([
                        readRebaseMetadataFile("onto_name"),
                        readRebaseMetadataFile("onto"),
                        readRebaseMetadataFile("head-name").then(calcHeadName),
                        readRebaseMetadataFile("orig-head"),
                        readRebaseMetadataFile("rewritten").then(calcRewritten)
                    ]).then(([
                        ontoName,
                        ontoSha,
                        originalHeadName,
                        originalHeadSha,
                        rewritten
                    ]) => {
                        return beforeFinishFn({
                            ontoName,
                            ontoSha,
                            originalHeadName,
                            originalHeadSha,
                            rebase,
                            rewritten
                        });
                    });

                return beforeFinishFnPromise.then(() => {
                    return rebase.finish(signature);
                });
            }
            throw error;

        });
    };

    if (beforeNextFn) {
        beforeNextFnResult = beforeNextFn(rebase);
        // if beforeNextFn returns a promise, chain the promise
        return Promise.resolve(beforeNextFnResult).then(getPromise);
    }

    return getPromise();
};

/**
 * Creates a branch with the passed in name pointing to the commit
 *
 * @async
 * @param {String} startPath The base path where the lookup starts.
 * @param {Number} acrossFs If non-zero, then the lookup will not stop when a
 * filesystem device change is detected while exploring
 * parent directories.
 * @param {String} ceilingDirs A list of absolute symbolic link free paths.
 * the search will stop if any of these paths
 * are hit. This may be set to null
 * @return {String} Path of the git repository
 */
Repository.discover = function (startPath, acrossFs, ceilingDirs, callback) {
    return _discover(startPath, acrossFs, ceilingDirs).then((foundPath) => {
        foundPath = path.resolve(foundPath);
        if (is.function(callback)) {
            callback(null, foundPath);
        }
        return foundPath;
    }, callback);
};

// Override Repository.initExt to normalize initoptions
Repository.initExt = function (repoPath, opts) {
    opts = normalizeOptions(opts, RepositoryInitOptions);
    return _initExt(repoPath, opts);
};


Repository.getReferences = function (repo, type, refNamesOnly, callback) {
    return Reference.list(repo).then((refList) => {
        const refFilterPromises = [];
        const filteredRefs = [];

        refList.forEach((refName) => {
            refFilterPromises.push(Reference.lookup(repo, refName).then((ref) => {
                if (type === Reference.TYPE.LISTALL || ref.type() === type) {
                    if (refNamesOnly) {
                        filteredRefs.push(refName);
                        return;
                    }

                    if (ref.isSymbolic()) {
                        return ref.resolve().then((resolvedRef) => {
                            resolvedRef.repo = repo;

                            filteredRefs.push(resolvedRef);
                        }).catch(() => {
                            // If we can't resolve the ref then just ignore it.
                        });
                    }
                    filteredRefs.push(ref);
                }
            }));
        });

        return Promise.all(refFilterPromises).then(() => {
            if (is.function(callback)) {
                callback(null, filteredRefs);
            }
            return filteredRefs;
        }, callback);
    });
};

/**
 * This will set the HEAD to point to the local branch and then attempt
 * to update the index and working tree to match the content of the
 * latest commit on that branch
 *
 * @async
 * @param {String|Reference} branch the branch to checkout
 * @param {Object|CheckoutOptions} opts the options to use for the checkout
 */
Repository.prototype.checkoutBranch = function (branch, opts) {
    const repo = this;

    return repo.getReference(branch).then((ref) => {
        if (!ref.isBranch()) {
            return false;
        }
        return repo.checkoutRef(ref, opts);
    });
};

/**
 * This will set the HEAD to point to the reference and then attempt
 * to update the index and working tree to match the content of the
 * latest commit on that reference
 *
 * @async
 * @param {Reference} reference the reference to checkout
 * @param {Object|CheckoutOptions} opts the options to use for the checkout
 */
Repository.prototype.checkoutRef = function (reference, opts) {
    const repo = this;
    opts = opts || {};

    opts.checkoutStrategy = opts.checkoutStrategy || (Checkout.STRATEGY.SAFE | Checkout.STRATEGY.RECREATE_MISSING);
    return repo.getReferenceCommit(reference.name()).then((commit) => {
        return commit.getTree();
    }).then((tree) => {
        return Checkout.tree(repo, tree, opts);
    }).then(() => {
        const name = reference.name();
        return repo.setHead(name);
    });
};

/**
 * Continues an existing rebase
 *
 * @async
 * @param {Signature}  signature     Identity of the one performing the rebase
 * @param {Function}   beforeNextFn  Callback to be called before each step
 *                                   of the rebase. If the callback returns a
 *                                   promise, the rebase will resume when the
 *                                   promise resolves. The rebase object is
 *                                   is passed to the callback.
 * @param {Function}   beforeFinishFn Callback called before the invocation
 *                                    of finish(). If the callback returns a
 *                                    promise, finish() will be called when the
 *                                    promise resolves. This callback will be
 *                                    provided a detailed overview of the rebase
 * @return {Oid|Index}  A commit id for a succesful merge or an index for a
 *                      rebase with conflicts
 */
Repository.prototype.continueRebase = function (signature, beforeNextFn, beforeFinishFn) {
    const repo = this;

    signature = signature || repo.defaultSignature();

    let rebase;
    return repo.refreshIndex().then((index) => {
        if (index.hasConflicts()) {
            throw index;
        }

        return Rebase.open(repo);
    }).then((_rebase) => {
        rebase = _rebase;
        return rebase.commit(null, signature).catch(() => {
            // Ignore all errors to prevent
            // this routine from choking now
            // that we made rebase.commit
            // asynchronous
        });
    }).then(() => {
        return performRebase(repo, rebase, signature, beforeNextFn, beforeFinishFn);
    }).then((error) => {
        if (error) {
            throw error;
        }

        return repo.getBranchCommit("HEAD");
    });
};

/**
 * Creates a branch with the passed in name pointing to the commit
 *
 * @async
 * @param {String} name Branch name, e.g. "master"
 * @param {Commit|String|Oid} commit The commit the branch will point to
 * @param {bool} force Overwrite branch if it exists
 * @return {Reference}
 */
Repository.prototype.createBranch = function (name, commit, force) {
    const repo = this;

    if (commit instanceof Commit) {
        return Branch.create(repo, name, commit, force ? 1 : 0);
    }

    return repo.getCommit(commit).then((commit) => {
        return Branch.create(repo, name, commit, force ? 1 : 0);
    });
};

/**
 * Create a blob from a buffer
 *
 * @param {Buffer} buffer
 * @return {Oid}
 */
Repository.prototype.createBlobFromBuffer = function (buffer) {
    return Blob.createFromBuffer(this, buffer, buffer.length);
};

/**
 * Create a commit
 *
 * @async
 * @param {String} updateRef
 * @param {Signature} author
 * @param {Signature} committer
 * @param {String} message
 * @param {Tree|Oid|String} Tree
 * @param {Array} parents
 * @return {Oid} The oid of the commit
 */
Repository.prototype.createCommit = function (
    updateRef, author, committer, message, tree, parents, callback) {

    const repo = this;
    const promises = [];

    parents = parents || [];

    promises.push(repo.getTree(tree));

    parents.forEach((parent) => {
        promises.push(repo.getCommit(parent));
    });

    return Promise.all(promises).then((results) => {
        tree = results[0];

        // Get the normalized values for our input into the function
        const parentsLength = parents.length;
        parents = [];

        for (let i = 0; i < parentsLength; i++) {
            parents.push(results[i + 1]);
        }

        return Commit.create(
            repo,
            updateRef,
            author,
            committer,
            null /* use default message encoding */,
            message,
            tree,
            parents.length,
            parents
        );
    }).then((commit) => {
        if (is.function(callback)) {
            callback(null, commit);
        }

        return commit;
    }, callback);
};

/**
 * Creates a new commit on HEAD from the list of passed in files
 *
 * @async
 * @param {Array} filesToAdd
 * @param {Signature} author
 * @param {Signature} committer
 * @param {String} message
 * @return {Oid} The oid of the new commit
 */
Repository.prototype.createCommitOnHead = function (filesToAdd, author, committer, message, callback) {
    const repo = this;

    return repo.refreshIndex().then((index) => {
        if (!filesToAdd) {
            filesToAdd = [];
        }

        return filesToAdd.reduce((lastFilePromise, filePath) => {
            return lastFilePromise.then(() => {
                return index.addByPath(filePath);
            });
        }, Promise.resolve()).then(() => {
            return index.write();
        }).then(() => {
            return index.writeTree();
        });
    }).then((treeOid) => {
        return repo.getHeadCommit().then((parent) => {
            if (!is.null(parent)) { // To handle a fresh repo with no commits
                parent = [parent];
            }
            return repo.createCommit("HEAD", author, committer, message, treeOid, parent
            );
        });
    }, callback);
};

/**
 * Creates a new lightweight tag
 *
 * @async
 * @param {String|Oid} String sha or Oid
 * @param {String} name the name of the tag
 * @return {Reference}
 */
Repository.prototype.createLightweightTag = function (oid, name, callback) {
    const repository = this;

    return Commit.lookup(repository, oid).then((commit) => {
        // Final argument is `force` which overwrites any previous tag
        return Tag.createLightweight(repository, name, commit, 0);
    }).then(() => {
        return Reference.lookup(repository, `refs/tags/${name}`);
    });
};

/**
 * Instantiate a new revision walker for browsing the Repository"s history.
 * See also `Commit.prototype.history()`
 *
 * @param {String|Oid} String sha or Oid
 * @return {RevWalk}
 */
Repository.prototype.createRevWalk = function () {
    return Revwalk.create(this);
};

/**
 * Creates a new annotated tag
 *
 * @async
 * @param {String|Oid} String sha or Oid
 * @param {String} name the name of the tag
 * @param {String} message the description that will be attached to the
 * annotated tag
 * @return {Tag}
 */
Repository.prototype.createTag = function (oid, name, message, callback) {
    const repository = this;
    const signature = repository.defaultSignature();

    return Commit.lookup(repository, oid).then((commit) => {
        // Final argument is `force` which overwrites any previous tag
        return Tag.create(repository, name, commit, signature, message, 0);
    }).then((tagOid) => {
        return repository.getTag(tagOid, callback);
    });
};

/**
 * Gets the default signature for the default user and now timestamp
 * @return {Signature}
 */
Repository.prototype.defaultSignature = function () {
    let result = Signature.default(this);

    if (!result || !result.name()) {
        result = Signature.now("unknown", "unknown@example.com");
    }

    return result;
};

/**
 * Deletes a tag from a repository by the tag name.
 *
 * @async
 * @param {String} Short or full tag name
 */
Repository.prototype.deleteTagByName = function (name) {
    const repository = this;

    name = ~name.indexOf("refs/tags/") ? name.substr(10) : name;

    return Tag.delete(repository, name);
};

/**
 * Discard line selection of a specified file.
 * Assumes selected lines are unstaged.
 *
 * @async
 * @param {String} filePath The relative path of this file in the repo
 * @param {Array} selectedLines The array of DiffLine objects
 *                            selected for discarding
 * @return {Number} 0 or an error code
 */
Repository.prototype.discardLines = function (filePath, selectedLines, additionalDiffOptions) {
    const repo = this;
    const fullFilePath = path.join(repo.workdir(), filePath);
    let index;
    let originalContent;
    let filterList;

    return repo.refreshIndex().then((indexResult) => {
        index = indexResult;
        return FilterList.load(repo, null, filePath, Filter.MODE.CLEAN, Filter.FLAG.DEFAULT);
    }).then((_filterList) => {
        filterList = _filterList;

        if (filterList) {
            return filterList.applyToFile(repo, filePath);
        }

        return adone.fs.readFile(fullFilePath, "utf8");
    }).then((content) => {
        originalContent = content;
        if (filterList) {
            filterList.free();
            filterList = null;
        }

        return getPathHunks(repo, index, filePath, false, additionalDiffOptions);
    }).then((hunks) => {
        return applySelectedLinesToTarget(originalContent, selectedLines, hunks, false, true);
    }).then((newContent) => {
        return FilterList.load(repo, null, filePath, Filter.MODE.SMUDGE, Filter.FLAG.DEFAULT).then((_filterList) => {
            filterList = _filterList;
            if (filterList) {
                /* jshint ignore:start */
                // We need the constructor for the check in NodeGit's C++ layer
                // to accept an object, and this seems to be a nice way to do it
                return filterList.applyToData(new String(newContent));
                /* jshint ignore:end */
            }

            return newContent;
        });
    }).then((filteredContent) => {
        if (filterList) {
            filterList.free();
            filterList = null;
        }

        return adone.fs.writeFile(fullFilePath, filteredContent);
    });
};

/**
 * Fetches from a remote
 *
 * @async
 * @param {String|Remote} remote
 * @param {Object|FetchOptions} fetchOptions Options for the fetch, includes
 *                                           callbacks for fetching
 */
Repository.prototype.fetch = function (remote, fetchOptions, callback) {
    const repo = this;

    const finallyFn = (error) => {
        if (is.function(callback)) {
            callback(error);
        }
    };

    return repo.getRemote(remote).then((remote) => {
        return remote.fetch(null, fetchOptions, `Fetch from ${remote}`).then(() => {
            return remote.disconnect();
        });
    }).then(finallyFn).catch((error) => {
        finallyFn(error);
        throw error;
    });
};

/**
 * Fetches from all remotes. This is done in series due to deadlocking issues
 * with fetching from many remotes that can happen.
 *
 * @async
 * @param {Object|FetchOptions} fetchOptions Options for the fetch, includes
 *                                           callbacks for fetching
 * @param {Function} callback
 */
Repository.prototype.fetchAll = function (fetchOptions, callback) {
    const repo = this;

    const createCallbackWrapper = function (fn, remote) {
        return function () {
            const args = Array.prototype.slice.call(arguments);
            args.push(remote);

            return fn.apply(this, args);
        }.bind(this);
    };

    fetchOptions = fetchOptions || {};

    const remoteCallbacks = fetchOptions.callbacks || {};

    const credentials = remoteCallbacks.credentials;
    const certificateCheck = remoteCallbacks.certificateCheck;
    const transferProgress = remoteCallbacks.transferProgress;

    return repo.getRemotes().then((remotes) => {
        return remotes.reduce((fetchPromise, remote) => {
            const wrappedFetchOptions = shallowClone(fetchOptions);
            const wrappedRemoteCallbacks = shallowClone(remoteCallbacks);

            if (credentials) {
                wrappedRemoteCallbacks.credentials =
                    createCallbackWrapper(credentials, remote);
            }

            if (certificateCheck) {
                wrappedRemoteCallbacks.certificateCheck =
                    createCallbackWrapper(certificateCheck, remote);
            }

            if (transferProgress) {
                wrappedRemoteCallbacks.transferProgress =
                    createCallbackWrapper(transferProgress, remote);
            }

            wrappedFetchOptions.callbacks = wrappedRemoteCallbacks;

            return fetchPromise.then(() => {
                return repo.fetch(remote, wrappedFetchOptions);
            });
        }, Promise.resolve());
    }).then(() => {
        if (is.function(callback)) {
            callback();
        }
    });
};

/**
 * @async
 * @param {FetchheadForeachCb} callback The callback function to be called on
 * each entry
 */
Repository.prototype.fetchheadForeach = function (callback) {
    return _fetchheadForeach.call(this, callback, null);
};

/**
 * Retrieve the blob represented by the oid.
 *
 * @async
 * @param {String|Oid} String sha or Oid
 * @return {Blob}
 */
Repository.prototype.getBlob = function (oid, callback) {
    const repository = this;

    return Blob.lookup(repository, oid).then((blob) => {
        blob.repo = repository;

        if (is.function(callback)) {
            callback(null, blob);
        }

        return blob;
    }, callback);
};

/**
 * Look up a branch. Alias for `getReference`
 *
 * @async
 * @param {String|Reference} name Ref name, e.g. "master", "refs/heads/master"
 *                              or Branch Ref
 * @return {Reference}
 */
Repository.prototype.getBranch = function (name, callback) {
    return this.getReference(name, callback);
};

/**
 * Look up a branch's most recent commit. Alias to `getReferenceCommit`
 *
 * @async
 * @param {String|Reference} name Ref name, e.g. "master", "refs/heads/master"
 *                          or Branch Ref
 * @return {Commit}
 */
Repository.prototype.getBranchCommit = function (name, callback) {
    return this.getReferenceCommit(name, callback);
};

/**
 * Retrieve the commit identified by oid.
 *
 * @async
 * @param {String|Oid} String sha or Oid
 * @return {Commit}
 */
Repository.prototype.getCommit = function (oid, callback) {
    const repository = this;

    return Commit.lookup(repository, oid).then((commit) => {
        commit.repo = repository;

        if (is.function(callback)) {
            callback(null, commit);
        }

        return commit;
    }, callback);
};

/**
 * Gets the branch that HEAD currently points to
 * Is an alias to head()
 *
 * @async
 * @return {Reference}
 */
Repository.prototype.getCurrentBranch = function () {
    return this.head();
};

/**
 * Retrieve the commit that HEAD is currently pointing to
 *
 * @async
 * @return {Commit}
 */
Repository.prototype.getHeadCommit = function (callback) {
    const repo = this;

    return Reference.nameToId(repo, "HEAD").then((head) => {
        return repo.getCommit(head, callback);
    }).catch(() => {
        return null;
    });
};

/**
 * Retrieve the master branch commit.
 *
 * @async
 * @return {Commit}
 */
Repository.prototype.getMasterCommit = function (callback) {
    return this.getBranchCommit("master", callback);
};

/**
 * Lookup the reference with the given name.
 *
 * @async
 * @param {String|Reference} name Ref name, e.g. "master", "refs/heads/master"
 *                               or Branch Ref
 * @return {Reference}
 */
Repository.prototype.getReference = function (name, callback) {
    const repository = this;

    return Reference.dwim(this, name).then((reference) => {
        if (reference.isSymbolic()) {
            return reference.resolve().then((reference) => {
                reference.repo = repository;

                if (is.function(callback)) {
                    callback(null, reference);
                }

                return reference;
            }, callback);
        }
        reference.repo = repository;
        if (is.function(callback)) {
            callback(null, reference);
        }
        return reference;

    }, callback);
};

/**
 * Look up a refs's commit.
 *
 * @async
 * @param {String|Reference} name Ref name, e.g. "master", "refs/heads/master"
 *                              or Branch Ref
 * @return {Commit}
 */
Repository.prototype.getReferenceCommit = function (name, callback) {
    const repository = this;

    return this.getReference(name).then((reference) => {
        return repository.getCommit(reference.target()).then((commit) => {
            if (is.function(callback)) {
                callback(null, commit);
            }

            return commit;
        });
    }, callback);
};

/**
 * Lookup reference names for a repository.
 *
 * @async
 * @param {Reference.TYPE} type Type of reference to look up
 * @return {Array<String>}
 */
Repository.prototype.getReferenceNames = function (type, callback) {
    return Repository.getReferences(this, type, true, callback);
};

/**
 * Lookup references for a repository.
 *
 * @async
 * @param {Reference.TYPE} type Type of reference to look up
 * @return {Array<Reference>}
 */
Repository.prototype.getReferences = function (type, callback) {
    return Repository.getReferences(this, type, false, callback);
};

/**
 * Gets a remote from the repo
 *
 * @async
 * @param {String|Remote} remote
 * @param {Function} callback
 * @return {Remote} The remote object
 */
Repository.prototype.getRemote = function (remote, callback) {
    if (remote instanceof Remote) {
        return Promise.resolve(remote).then((remoteObj) => {
            if (is.function(callback)) {
                callback(null, remoteObj);
            }

            return remoteObj;
        }, callback);
    }

    return Remote.lookup(this, remote).then((remoteObj) => {
        if (is.function(callback)) {
            callback(null, remoteObj);
        }

        return remoteObj;
    }, callback);
};

/**
 * Lists out the remotes in the given repository.
 *
 * @async
 * @param {Function} Optional callback
 * @return {Object} Promise object.
 */
Repository.prototype.getRemotes = function (callback) {
    return Remote.list(this).then((remotes) => {
        if (is.function(callback)) {
            callback(null, remotes);
        }

        return remotes;
    }, callback);
};

/**
 * Get the status of a repo to it's working directory
 *
 * @async
 * @param {obj} opts
 * @return {Array<StatusFile>}
 */
Repository.prototype.getStatus = function (opts) {
    const statuses = [];
    const statusCallback = function (path, status) {
        statuses.push(new StatusFile({ path, status }));
    };

    if (!opts) {
        opts = {
            flags: Status.OPT.INCLUDE_UNTRACKED |
                Status.OPT.RECURSE_UNTRACKED_DIRS
        };
    }

    return Status.foreachExt(this, opts, statusCallback).then(() => {
        return statuses;
    });
};

/**
 * Get extended statuses of a repo to it's working directory. Status entries
 * have `status`, `headToIndex` delta, and `indexToWorkdir` deltas
 *
 * @async
 * @param {obj} opts
 * @return {Array<StatusFile>}
 */
Repository.prototype.getStatusExt = function (opts) {
    const statuses = [];

    if (!opts) {
        opts = {
            flags: Status.OPT.INCLUDE_UNTRACKED |
                Status.OPT.RECURSE_UNTRACKED_DIRS |
                Status.OPT.RENAMES_INDEX_TO_WORKDIR |
                Status.OPT.RENAMES_HEAD_TO_INDEX |
                Status.OPT.RENAMES_FROM_REWRITES
        };
    }

    return StatusList.create(this, opts).then((list) => {
        for (let i = 0; i < list.entrycount(); i++) {
            const entry = Status.byIndex(list, i);
            statuses.push(new StatusFile({ entry }));
        }

        return statuses;
    });
};

/**
 * Get the names of the submodules in the repository.
 *
 * @async
 * @return {Array<String>}
 */
Repository.prototype.getSubmoduleNames = function (callback) {
    const names = [];
    const submoduleCallback = function (submodule, name, payload) {
        names.push(name);
    };

    return Submodule.foreach(this, submoduleCallback).then(() => {
        if (is.function(callback)) {
            callback(null, names);
        }

        return names;
    });
};

/**
 * Retrieve the tag represented by the oid.
 *
 * @async
 * @param {String|Oid} String sha or Oid
 * @return {Tag}
 */
Repository.prototype.getTag = function (oid, callback) {
    const repository = this;

    return Tag.lookup(repository, oid).then((reference) => {
        reference.repo = repository;

        if (is.function(callback)) {
            callback(null, reference);
        }

        return reference;
    }, callback);
};

/**
 * Retrieve the tag represented by the tag name.
 *
 * @async
 * @param {String} Short or full tag name
 * @return {Tag}
 */
Repository.prototype.getTagByName = function (name, callback) {
    const repo = this;

    name = ~name.indexOf("refs/tags/") ? name : `refs/tags/${name}`;

    return Reference.nameToId(repo, name).then((oid) => {
        return Tag.lookup(repo, oid).then((reference) => {
            reference.repo = repo;

            if (is.function(callback)) {
                callback(null, reference);
            }

            return reference;
        });
    }, callback);
};

/**
 * Retrieve the tree represented by the oid.
 *
 * @async
 * @param {String|Oid} String sha or Oid
 * @return {Tree}
 */
Repository.prototype.getTree = function (oid, callback) {
    const repository = this;

    return Tree.lookup(repository, oid).then((tree) => {
        tree.repo = repository;

        if (is.function(callback)) {
            callback(null, tree);
        }

        return tree;
    }, callback);
};

/**
 * Returns true if the repository is in the APPLY_MAILBOX or
 * APPLY_MAILBOX_OR_REBASE state.
 * @return {Boolean}
 */
Repository.prototype.isApplyingMailbox = function () {
    const state = this.state();
    return state === Repository.STATE.APPLY_MAILBOX || state === Repository.STATE.APPLY_MAILBOX_OR_REBASE;
};

/**
 * Returns true if the repository is in the BISECT state.
 * @return {Boolean}
 */
Repository.prototype.isBisecting = function () {
    return this.state() === Repository.STATE.BISECT;
};

/**
 * Returns true if the repository is in the CHERRYPICK state.
 * @return {Boolean}
 */
Repository.prototype.isCherrypicking = function () {
    return this.state() === Repository.STATE.CHERRYPICK;
};

/**
 * Returns true if the repository is in the default NONE state.
 * @return {Boolean}
 */
Repository.prototype.isDefaultState = function () {
    return this.state() === Repository.STATE.NONE;
};

/**
 * Returns true if the repository is in the MERGE state.
 * @return {Boolean}
 */
Repository.prototype.isMerging = function () {
    return this.state() === Repository.STATE.MERGE;
};

/**
 * Returns true if the repository is in the REBASE, REBASE_INTERACTIVE, or
 * REBASE_MERGE state.
 * @return {Boolean}
 */
Repository.prototype.isRebasing = function () {
    const state = this.state();
    return state === Repository.STATE.REBASE || state === Repository.STATE.REBASE_INTERACTIVE || state === Repository.STATE.REBASE_MERGE;
};

/**
 * Returns true if the repository is in the REVERT state.
 * @return {Boolean}
 */
Repository.prototype.isReverting = function () {
    return this.state() === Repository.STATE.REVERT;
};

/**
 * Rebases a branch onto another branch
 *
 * @async
 * @param {String}     branch
 * @param {String}     upstream
 * @param {String}     onto
 * @param {Signature}  signature     Identity of the one performing the rebase
 * @param {Function}   beforeNextFn  Callback to be called before each step
 *                                   of the rebase.  If the callback returns a
 *                                   promise, the rebase will resume when the
 *                                   promise resolves.  The rebase object is
 *                                   is passed to the callback.
 * @param {Function}   beforeFinishFn Callback called before the invocation
 *                                    of finish(). If the callback returns a
 *                                    promise, finish() will be called when the
 *                                    promise resolves. This callback will be
 *                                    provided a detailed overview of the rebase
 * @return {Oid|Index}  A commit id for a succesful merge or an index for a
 *                      rebase with conflicts
 */
Repository.prototype.rebaseBranches = function (branch, upstream, onto, signature, beforeNextFn, beforeFinishFn, rebaseOptions) {
    const repo = this;
    let branchCommit;
    let upstreamCommit;
    let ontoCommit;
    const mergeOptions = (rebaseOptions || {}).mergeOptions;
    signature = signature || repo.defaultSignature();

    return Promise.all([
        repo.getReference(branch),
        upstream ? repo.getReference(upstream) : null,
        onto ? repo.getReference(onto) : null
    ]).then((refs) => {
        return Promise.all([
            AnnotatedCommit.fromRef(repo, refs[0]),
            upstream ? AnnotatedCommit.fromRef(repo, refs[1]) : null,
            onto ? AnnotatedCommit.fromRef(repo, refs[2]) : null
        ]);
    }).then((annotatedCommits) => {
        branchCommit = annotatedCommits[0];
        upstreamCommit = annotatedCommits[1];
        ontoCommit = annotatedCommits[2];

        return Merge.base(repo, branchCommit.id(), upstreamCommit.id());
    }).then((oid) => {
        if (oid.toString() === branchCommit.id().toString()) {
            // we just need to fast-forward
            return repo.mergeBranches(branch, upstream, null, null, mergeOptions).then(() => {
                // checkout 'branch' to match the behavior of rebase
                return repo.checkoutBranch(branch);
            });
        } else if (oid.toString() === upstreamCommit.id().toString()) {
            // 'branch' is already on top of 'upstream'
            // checkout 'branch' to match the behavior of rebase
            return repo.checkoutBranch(branch);
        }

        return Rebase.init(repo, branchCommit, upstreamCommit, ontoCommit, rebaseOptions).then((rebase) => {
            return performRebase(repo, rebase, signature, beforeNextFn, beforeFinishFn);
        }).then((error) => {
            if (error) {
                throw error;
            }
        });
    }).then(() => {
        return repo.getBranchCommit("HEAD");
    });
};

/**
 * Grabs a fresh copy of the index from the repository. Invalidates
 * all previously grabbed indexes
 *
 * @async
 * @return {Index}
 */
Repository.prototype.refreshIndex = function (callback) {
    const repo = this;

    repo.setIndex(); // clear the index

    return repo.index().then((index) => {
        if (is.function(callback)) {
            callback(null, index);
        }

        return index;
    }, callback);
};

/**
 * Merge a branch onto another branch
 *
 * @async
 * @param {String|Reference}        to
 * @param {String|Reference}        from
 * @param {Signature}         signature
 * @param {Merge.PREFERENCE}  mergePreference
 * @param {MergeOptions}      mergeOptions
 * @return {Oid|Index}  A commit id for a succesful merge or an index for a
 *                      merge with conflicts
 */
Repository.prototype.mergeBranches = function (to, from, signature, mergePreference, mergeOptions, processMergeMessageCallback) {
    const repo = this;
    let fromBranch;
    let toBranch;
    processMergeMessageCallback = processMergeMessageCallback || function (message) {
        return message;
    };

    mergePreference = mergePreference || Merge.PREFERENCE.NONE;
    mergeOptions = normalizeOptions(mergeOptions, MergeOptions);

    signature = signature || repo.defaultSignature();

    return Promise.all([
        repo.getBranch(to),
        repo.getBranch(from)
    ]).then((objects) => {
        toBranch = objects[0];
        fromBranch = objects[1];

        return Promise.all([
            repo.getBranchCommit(toBranch),
            repo.getBranchCommit(fromBranch)
        ]);
    }).then((branchCommits) => {
        const toCommitOid = branchCommits[0].toString();
        const fromCommitOid = branchCommits[1].toString();

        return Merge.base(repo, toCommitOid, fromCommitOid).then((baseCommit) => {
            if (baseCommit.toString() === fromCommitOid) {
                // The commit we're merging to is already in our history.
                // nothing to do so just return the commit the branch is on
                return toCommitOid;
            } else if (baseCommit.toString() === toCommitOid && mergePreference !== Merge.PREFERENCE.NO_FASTFORWARD) {
                // fast forward
                const message = `Fast forward branch ${toBranch.shorthand()} to branch ${fromBranch.shorthand()}`;

                return branchCommits[1].getTree().then((tree) => {
                    if (toBranch.isHead()) {
                        // Checkout the tree if we're on the branch
                        const opts = {
                            checkoutStrategy: Checkout.STRATEGY.SAFE |
                                Checkout.STRATEGY.RECREATE_MISSING
                        };
                        return Checkout.tree(repo, tree, opts);
                    }
                }).then(() => {
                    return toBranch.setTarget(fromCommitOid, message).then(() => {
                        return fromCommitOid;
                    });
                });
            } else if (mergePreference !== Merge.PREFERENCE.FASTFORWARD_ONLY) {
                let updateHead;
                // We have to merge. Lets do it!
                return Reference.lookup(repo, "HEAD").then((headRef) => {
                    return headRef.resolve();
                }).then((headRef) => {
                    updateHead = Boolean(headRef) && (headRef.name() === toBranch.name());
                    return Merge.commits(repo, toCommitOid, fromCommitOid, mergeOptions);
                }).then((index) => {
                    // if we have conflicts then throw the index
                    if (index.hasConflicts()) {
                        throw index;
                    }

                    // No conflicts so just go ahead with the merge
                    return index.writeTreeTo(repo);
                }).then((oid) => {
                    let mergeDecorator;
                    if (fromBranch.isTag()) {
                        mergeDecorator = "tag";
                    } else if (fromBranch.isRemote()) {
                        mergeDecorator = "remote-tracking branch";
                    } else {
                        mergeDecorator = "branch";
                    }

                    let message = `Merge ${mergeDecorator} '${fromBranch.shorthand()}'`;

                    // https://github.com/git/git/blob/master/builtin/fmt-merge-msg.c#L456-L459
                    if (toBranch.shorthand() !== "master") {
                        message += ` into ${toBranch.shorthand()}`;
                    }

                    return Promise.all([oid, processMergeMessageCallback(message)]);
                }).then(([oid, message]) => {
                    return repo.createCommit(toBranch.name(), signature, signature, message, oid, [toCommitOid, fromCommitOid]);
                }).then((commit) => {
                    // we've updated the checked out branch, so make sure we update
                    // head so that our index isn't messed up
                    if (updateHead) {
                        return repo.getBranch(to).then((branch) => {
                            return repo.getBranchCommit(branch);
                        }).then((branchCommit) => {
                            return branchCommit.getTree();
                        }).then((tree) => {
                            const opts = {
                                checkoutStrategy: Checkout.STRATEGY.SAFE |
                                    Checkout.STRATEGY.RECREATE_MISSING
                            };
                            return Checkout.tree(repo, tree, opts);
                        }).then(() => {
                            return commit;
                        });
                    }

                    return commit;
                });
            }

            // A non fast-forwardable merge with ff-only
            return toCommitOid;
        });
    });
};

/**
 * @async
 * @param {MergeheadForeachCb} callback The callback function to be called on
 * each entry
 */
Repository.prototype.mergeheadForeach = function (callback) {
    return _mergeheadForeach.call(this, callback, null);
};

/**
 * Stages or unstages line selection of a specified file
 *
 * @async
 * @param {String|Array} filePath The relative path of this file in the repo
 * @param {Boolean} stageNew Set to stage new filemode. Unset to unstage.
 * @return {Number} 0 or an error code
 */
Repository.prototype.stageFilemode = function (filePath, stageNew, additionalDiffOptions) {
    const repo = this;
    let index;
    const diffOptions = additionalDiffOptions ? {
        flags: additionalDiffOptions
    } : undefined;
    const diffPromise = stageNew ? Diff.indexToWorkdir(repo, index, {
        flags: Diff.OPTION.SHOW_UNTRACKED_CONTENT | Diff.OPTION.RECURSE_UNTRACKED_DIRS | (additionalDiffOptions || 0)
    }) : repo.getHeadCommit().then(function getTreeFromCommit(commit) {
        return commit.getTree();
    }).then(function getDiffFromTree(tree) {
        return Diff.treeToIndex(repo, tree, index, diffOptions);
    });
    let filePaths = filePath instanceof Array ? filePath : [filePath];

    const indexLock = `${repo.path().replace(".git/", "")}.git/index.lock`;

    return adone.fs.rm(indexLock).then(() => {
        return repo.refreshIndex();
    }).then((indexResult) => {
        index = indexResult;
    }).then(() => {
        return diffPromise;
    }).then((diff) => {
        const origLength = filePaths.length;
        const fileFilterPromises = filePaths.map((p) => {
            return Status.file(repo, p).then((status) => {
                return {
                    path: p,
                    filter: status & Status.STATUS.WT_MODIFIED || status & Status.STATUS.INDEX_MODIFIED
                };
            });
        });

        return Promise.all(fileFilterPromises).then((results) => {
            filePaths = results.filter((filterResult) => filterResult.filter).map((filterResult) => filterResult.path);

            if (filePaths.length === 0 && origLength > 0) {
                return Promise.reject("Selected staging is only available on modified files.");
            }
            return diff.patches();
        });
    }).then((patches) => {
        const pathPatches = patches.filter((patch) => {
            return ~filePaths.indexOf(patch.newFile().path());
        });
        if (pathPatches.length === 0) {
            return Promise.reject("No differences found for this file.");
        }

        return pathPatches.reduce((lastIndexAddPromise, pathPatch) => {
            const entry = index.getByPath(pathPatch.newFile().path(), 0);

            entry.mode = stageNew ? pathPatch.newFile().mode() : pathPatch.oldFile().mode();

            return lastIndexAddPromise.then(() => {
                return index.add(entry);
            });
        }, Promise.resolve());
    }).then(() => {
        return index.write();
    });
};

/**
 * Stages or unstages line selection of a specified file
 *
 * @async
 * @param {String} filePath The relative path of this file in the repo
 * @param {Array} selectedLines The array of DiffLine objects
 *                            selected for staging or unstaging
 * @param {Boolean} isStaged Are the selected lines currently staged
 * @return {Number} 0 or an error code
 */
Repository.prototype.stageLines = function (filePath, selectedLines, isSelectionStaged, additionalDiffOptions) {
    const repo = this;
    let index;
    let originalBlob;

    // The following chain checks if there is a patch with no hunks left for the
    // file, and no filemode changes were done on the file. It is then safe to
    // stage the entire file so the file doesn't show as having unstaged changes
    // in `git status`. Also, check if there are no type changes.
    const lastHunkStagedPromise = function lastHunkStagedPromise(result) {
        return Diff.indexToWorkdir(repo, index, {
            flags:
                Diff.OPTION.SHOW_UNTRACKED_CONTENT |
                Diff.OPTION.RECURSE_UNTRACKED_DIRS |
                (additionalDiffOptions || 0)
        }).then((diff) => {
            return diff.patches();
        }).then((patches) => {
            const pathPatch = patches.filter((patch) => {
                return patch.newFile().path() === filePath;
            });
            let emptyPatch = false;
            if (pathPatch.length > 0) {
                // No hunks, unchanged file mode, and no type changes.
                emptyPatch = pathPatch[0].size() === 0 &&
                    pathPatch[0].oldFile().mode() === pathPatch[0].newFile().mode() &&
                    !pathPatch[0].isTypeChange();
            }
            if (emptyPatch) {
                return index.addByPath(filePath)
                    .then(() => {
                        return index.write();
                    });
            }

            return result;
        });
    };

    return repo.refreshIndex().then((indexResult) => {
        index = indexResult;
        const pathOid = index.getByPath(filePath).id;

        return repo.getBlob(pathOid);
    }).then((blob) => {
        originalBlob = blob;

        return getPathHunks(repo, index, filePath, isSelectionStaged, additionalDiffOptions);
    }).then((hunks) => {
        return applySelectedLinesToTarget(
            originalBlob, selectedLines, hunks, isSelectionStaged
        );
    }).then((newContent) => {
        const newContentBuffer = Buffer.from(newContent);

        return repo.createBlobFromBuffer(newContentBuffer);
    }).then((newOid) => repo.getBlob(newOid)).then((newBlob) => {
        const entry = index.getByPath(filePath, 0);
        entry.id = newBlob.id();
        entry.path = filePath;
        entry.fileSize = newBlob.content().length;

        return index.add(entry);
    }).then(() => {
        return index.write();
    }).then((result) => {
        if (isSelectionStaged) {
            return result;
        }

        return lastHunkStagedPromise(result);
    });
};

/**
 * Create a new tree builder.
 *
 * @param {Tree} tree
 */
Repository.prototype.treeBuilder = function () {
    const builder = TreeBuilder.create(null);

    builder.root = builder;
    builder.repo = this;

    return builder;
};

export default Repository;
