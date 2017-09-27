describe("fs", "readdirp", () => {
    const { fs } = adone;

    const totalDirs = 6;
    const totalFiles = 12;
    const ext1Files = 4;
    const ext3Files = 2;
    const fixtures = adone.std.path.join(__dirname, "fixtures");
    const root = adone.std.path.join(fixtures, "readdir");
    const getPath = (...p) => adone.std.path.join(root, ...p);

    before(async () => {
        await fs.rm(adone.std.path.join(root));
        try {
            adone.std.fs.mkdirSync(fixtures);
        } catch (err) {
            //
        }
        adone.std.fs.mkdirSync(getPath());
        adone.std.fs.writeFileSync(getPath("root_file1.ext1"), "");
        adone.std.fs.writeFileSync(getPath("root_file2.ext2"), "");
        adone.std.fs.writeFileSync(getPath("root_file3.ext3"), "");

        adone.std.fs.mkdirSync(getPath("root_dir1"));
        adone.std.fs.writeFileSync(getPath("root_dir1", "root_dir1_file1.ext1"), "");
        adone.std.fs.writeFileSync(getPath("root_dir1", "root_dir1_file2.ext2"), "");
        adone.std.fs.writeFileSync(getPath("root_dir1", "root_dir1_file3.ext3"), "");
        adone.std.fs.mkdirSync(getPath("root_dir1", "root_dir1_subdir1"));
        adone.std.fs.writeFileSync(getPath("root_dir1", "root_dir1_subdir1", "root1_dir1_subdir1_file1.ext1"), "");
        adone.std.fs.mkdirSync(getPath("root_dir1", "root_dir1_subdir2"));
        adone.std.fs.writeFileSync(getPath("root_dir1", "root_dir1_subdir2", ".ignore"), "");

        adone.std.fs.mkdirSync(getPath("root_dir2"));
        adone.std.fs.writeFileSync(getPath("root_dir2", "root_dir2_file1.ext1"), "");
        adone.std.fs.writeFileSync(getPath("root_dir2", "root_dir2_file2.ext2"), "");
        adone.std.fs.mkdirSync(getPath("root_dir2", "root_dir2_subdir1"));
        adone.std.fs.writeFileSync(getPath("root_dir2", "root_dir2_subdir1", ".ignore"), "");
        adone.std.fs.mkdirSync(getPath("root_dir2", "root_dir2_subdir2"));
        adone.std.fs.writeFileSync(getPath("root_dir2", "root_dir2_subdir2", ".ignore"), "");
    });

    after(async () => {
        await fs.rm(adone.std.path.join(root));
    });

    it("reading root without filter", async () => {
        const result = await fs.readdirp(root);
        expect(result).to.have.lengthOf(totalFiles);
    });

    it("normal ['*.ext1', '*.ext3']", async () => {
        const result = await fs.readdirp(root, {
            fileFilter: ["*.ext1", "*.ext3"]
        });
        expect(result).to.have.lengthOf(ext1Files + ext3Files);
    });

    it("files only", async () => {
        const result = await fs.readdirp(root, {
            files: true,
            directories: false
        });
        expect(result).to.have.lengthOf(totalFiles);
    });

    it("directories only", async () => {
        const result = await fs.readdirp(root, {
            entryType: "directories"
        });
        expect(result).to.have.lengthOf(totalDirs);
    });

    it("both - directories + files", async () => {
        const result = await fs.readdirp(root, {
            entryType: "both"
        });
        expect(result).to.have.lengthOf(totalFiles + totalDirs);
    });

    it("directory filter with directories only", async () => {
        const result = await fs.readdirp(root, {
            entryType: "directories",
            directoryFilter: ["root_dir1", "*dir1_subdir1"]
        });
        expect(result).to.have.lengthOf(2);
    });

    it("directory and file filters with both entries", async () => {
        const result = await fs.readdirp(root, {
            directoryFilter: ["root_dir1", "*dir1_subdir1"],
            fileFilter: ["!*.ext1"]
        });
        expect(result).to.have.lengthOf(6);
    });

    it("negated: ['!*.ext1', '!*.ext3']", async () => {
        const result = await fs.readdirp(root, {
            fileFilter: ["!*.ext1", "!*.ext3"]
        });
        expect(result).to.have.lengthOf(totalFiles - ext1Files - ext3Files);
    });

    it("reading root without filter using lstat", async () => {
        const result = await fs.readdirp(root, {
            lstat: true
        });
        expect(result).to.have.lengthOf(totalFiles);
    });

    it("reading root with symlinks using lstat", async function () {
        if (adone.is.windows) {
            this.skip();
            return;
        }
        adone.std.fs.symlinkSync(adone.std.path.join(root, "root_dir1"), adone.std.path.join(root, "dirlink"));
        adone.std.fs.symlinkSync(adone.std.path.join(root, "root_file1.ext1"), adone.std.path.join(root, "link.ext1"));
        const result = await fs.readdirp(root, {
            lstat: true
        });
        try {
            expect(result).to.have.lengthOf(totalDirs + totalFiles + 2);
        } finally {
            adone.std.fs.unlinkSync(adone.std.path.join(root, "dirlink"));
            adone.std.fs.unlinkSync(adone.std.path.join(root, "link.ext1"));
        }
    });
});