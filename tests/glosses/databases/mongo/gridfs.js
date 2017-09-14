describe("gridfs", function () {
    const { data: { bson }, database: { mongo }, fs, std: { crypto }, stream } = adone;
    const { GridStore } = mongo;
    const __ = adone.private(mongo);

    it("should create new grid store object", async () => {
        const { db } = this;
        const filename = "test_create_gridstore";
        const id = new bson.ObjectId();
        const gs = new GridStore(db, id, filename, "w");
        expect(gs).to.be.instanceOf(GridStore);
        expect(gs.fileId).to.be.equal(id);
        expect(gs.filename).to.be.equal(filename);
    });

    it("should create new grid store object with int id", async () => {
        const { db } = this;
        const filename = "test_create_gridstore";
        const id = 123;
        const gs = new GridStore(db, id, filename, "w");
        expect(gs).to.be.instanceOf(GridStore);
        expect(gs.fileId).to.be.equal(id);
        expect(gs.filename).to.be.equal(filename);
    });

    it("should create new grid store object with string id", async () => {
        const { db } = this;
        const filename = "test_create_gridstore";
        const id = "test";
        const gs = new GridStore(db, id, filename, "w");
        expect(gs).to.be.instanceOf(GridStore);
        expect(gs.fileId).to.be.equal(id);
        expect(gs.filename).to.be.equal(filename);
    });

    it("should correctly safe file and read file by objectId", async () => {
        const { db } = this;
        const gridStore = new GridStore(db, null, "w");
        await gridStore.open();
        await gridStore.write("hello world!");
        const result = await gridStore.close();
        const data = await GridStore.read(db, result._id);
        expect(data.toString()).to.be.equal("hello world!");
    });

    it("should correctly execute grid store exists", async () => {
        const { db } = this;
        const gridStore = new GridStore(db, "foobar", "w");
        await gridStore.open();
        await gridStore.write("hello world!");
        await gridStore.close();
        expect(await GridStore.exist(db, "foobar")).to.be.true;
        expect(await GridStore.exist(db, "does_not_exist")).to.be.false;
        expect(await GridStore.exist(db, "foobar", "another_root")).to.be.false;
    });

    it("should correctly perform grid store read length", async () => {
        const { db } = this;
        const gridStore = new GridStore(db, "test_gs_read_length", "w");
        await gridStore.open();
        await gridStore.write("hello world!");
        await gridStore.close();
        const data = await GridStore.read(db, "test_gs_read_length", 5);
        expect(data.toString()).to.be.equal("hello");
    });

    it("should correctly read from file with offset", async () => {
        const { db } = this;
        const gridStore = new GridStore(db, "test_gs_read_with_offset", "w");
        await gridStore.open();
        await gridStore.write("hello, world!");
        await gridStore.close();
        {
            const data = await GridStore.read(db, "test_gs_read_with_offset", 5, 7);
            expect(data.toString()).to.be.equal("world");
        }
        {
            const data = await GridStore.read(db, "test_gs_read_with_offset", undefined, 7);
            expect(data.toString()).to.be.equal("world!");
        }
    });

    it("should correctly handle multiple chunk grid store", async () => {
        const { db } = this;
        const gridStore = new GridStore(db, "test_gs_multi_chunk", "w");
        await gridStore.open();
        await gridStore.chunkCollection().deleteMany();
        gridStore.chunkSize = 512;
        const file1 = "x".repeat(gridStore.chunkSize);
        const file2 = "y".repeat(gridStore.chunkSize);
        const file3 = "z".repeat(gridStore.chunkSize);
        await gridStore.write(file1);
        await gridStore.write(file2);
        await gridStore.write(file3);
        await gridStore.close();
        const collection = db.collection("fs.chunks");
        expect(await collection.count()).to.be.equal(3);
        const data = await GridStore.read(db, "test_gs_multi_chunk");
        expect(data).to.have.lengthOf(512 * 3);
    });

    it("should correctly handle unlinking weird name", async () => {
        const { db } = this;
        const gridStore = new GridStore(db, "9476700.937375426_1271170118964-clipped.png", "w", { root: "articles" });
        await gridStore.open();
        await db.collection("articles.files").deleteMany();
        await db.collection("articles.chunks").deleteMany();
        await gridStore.write("hello, world!");
        await gridStore.close();
        const files = db.collection("articles.files");
        expect(await files.count()).to.be.equal(1);
        const chunks = db.collection("articles.chunks");
        expect(await chunks.count()).to.be.equal(1);
        await GridStore.unlink(db, "9476700.937375426_1271170118964-clipped.png", { root: "articles" });
        expect(await files.count()).to.be.equal(0);
        expect(await chunks.count()).to.be.equal(0);
    });

    it("should correctly unlink an array of files", async () => {
        const { db } = this;
        const gridStore = new GridStore(db, "test_gs_unlink_as_array", "w");
        await gridStore.open();
        const files = db.collection("fs.files");
        await files.deleteMany();
        const chunks = db.collection("fs.chunks");
        await chunks.deleteMany();
        await gridStore.write("hello, world!");
        await gridStore.close();
        expect(await files.count()).to.be.equal(1);
        expect(await chunks.count()).to.be.equal(1);
        await GridStore.unlink(db, ["test_gs_unlink_as_array"]);
        expect(await files.count()).to.be.equal(0);
        expect(await chunks.count()).to.be.equal(0);
    });

    it("should correctly write file to grid store", async () => {
        const { db } = this;
        const file = new fs.File(__dirname, "fixtures", "test_gs_weird_bug.png");
        const gridStore = new GridStore(db, "test_gs_writing_file", "w");
        await gridStore.open();
        await gridStore.writeFile(file.path());
        const data = await GridStore.read(db, "test_gs_writing_file");
        const expectedData = await file.contents("buffer");
        expect(data.toString("hex")).to.be.equal(expectedData.toString("hex"));
        expect(data.length).to.be.equal(await file.size());
        // Ensure we have a md5
        const gridStore2 = new GridStore(db, "test_gs_writing_file", "r");
        await gridStore2.open();
        expect(gridStore2.md5).to.be.ok;
        expect(gridStore2.md5).to.be.equal(crypto.createHash("md5").update(expectedData).digest("hex"));
    });

    it("should correctly write file to grid store using object id", async () => {
        const { db } = this;
        const file = new fs.File(__dirname, "fixtures", "test_gs_weird_bug.png");
        const gridStore = new GridStore(db, null, "w");
        await gridStore.open();
        const doc = await gridStore.writeFile(file.path());
        const data = await GridStore.read(db, doc.fileId);
        const expectedData = await file.contents("buffer");
        expect(await data.toString("hex")).to.be.equal(expectedData.toString("hex"));
        expect(data.length).to.be.equal(await file.size());
        const gridStore2 = new GridStore(db, doc.fileId, "r");
        await gridStore2.open();
        expect(gridStore2.md5).to.be.ok;
        expect(gridStore2.md5).to.be.equal(crypto.createHash("md5").update(expectedData).digest("hex"));
    });

    it("should correctly perform working filed read", async () => {
        const { db } = this;
        const file = new fs.File(__dirname, "fixtures", "test_gs_working_field_read.pdf");
        const gridStore = new GridStore(db, "test_gs_working_field_read", "w");
        await gridStore.open();
        const expectedData = await file.contents("buffer");
        await gridStore.write(expectedData);
        await gridStore.close();
        const data = await GridStore.read(db, "test_gs_working_field_read");
        expect(data).to.be.deep.equal(expectedData);
    });

    it("should correctly perform working filed read with chunk size less than file size", async () => {
        const { db } = this;
        const file = new fs.File(__dirname, "fixtures", "test_gs_working_field_read.pdf");
        const gridStore = new GridStore(db, "test.txt", "w");
        gridStore.chunkSize = 40960;
        await gridStore.open();
        const stream = file.contentsStream(null);
        await new Promise((resolve, reject) => {
            stream.on("data", (chunk) => {
                gridStore.write(chunk).catch(reject);
            });

            stream.once("close", resolve);
        });
        const result = await gridStore.close();
        const data = await GridStore.read(db, result._id);
        expect(data.toString("hex")).to.be.deep.equal(await file.contents("hex"));
    });

    it("should correctly perform working filed with big file", async () => {
        const { db } = this;
        const file = new fs.File(__dirname, "fixtures", "test_gs_working_field_read.pdf");
        const tmpFile = new fs.File(await fs.tmpName());
        const tmpContent = Buffer.from((await file.contents("binary")).repeat(10), "binary");
        await tmpFile.write(tmpContent);
        const gridStore = new GridStore(db, null, "w");
        gridStore.chunkSize = 80960;
        await gridStore.open();
        await new Promise((resolve, reject) => {
            const stream = tmpFile.contentsStream(null);
            stream.on("data", (chunk) => {
                gridStore.write(chunk).catch(reject);
            });
            stream.once("close", resolve);
        });
        const result = await gridStore.close();
        const data = await GridStore.read(db, result._id);
        expect(data).to.be.deep.equal(tmpContent);
        await tmpFile.unlink();
    });

    it("should correctly perform working filed write with different chunk sizes", async () => {
        const { db } = this;
        const file = new fs.File(__dirname, "fixtures", "test_gs_working_field_read.pdf");
        const tmpFile = new fs.File(await fs.tmpName());
        const tmpContent = Buffer.from((await file.contents("binary")).repeat(10), "binary");
        await tmpFile.write(tmpContent);

        const executeTest = async (chunkSize) => {
            const gridStore = new GridStore(db, null, "w");
            gridStore.chunkSize = chunkSize;
            await gridStore.open();
            await new Promise((resolve, reject) => {
                const stream = tmpFile.contentsStream(null);
                stream.on("data", (chunk) => {
                    gridStore.write(chunk).catch(reject);
                });
                stream.once("close", resolve);
            });
            const result = await gridStore.close();
            const data = await GridStore.read(db, result._id);
            expect(data).to.be.deep.equal(tmpContent);
        };

        await executeTest(80960);
        await executeTest(5000);
        await executeTest(await tmpFile.size() + 100);
    });

    it("should correctly read and write file", async () => {
        const { db } = this;
        const gridStore = new GridStore(db, "test_gs_weird_bug", "w");
        const file = new fs.File(__dirname, "fixtures", "test_gs_working_field_read.pdf");
        const data = await file.contents("buffer");
        await gridStore.open();
        await gridStore.write(data);
        await gridStore.close();
        const fileData = await GridStore.read(db, "test_gs_weird_bug");
        expect(fileData).to.be.deep.equal(data);
    });

    it("should correctly read and write buffers multiple chunks", async () => {
        const { db } = this;
        const file = new fs.File(__dirname, "fixtures", "test_gs_weird_bug.png");
        const gridStore = new GridStore(db, null, "w");
        // force multiple chunks
        gridStore.chunkSize = 5000;
        const data = await file.contents("buffer");
        await gridStore.open();
        await gridStore.write(data);
        const doc = await gridStore.close();
        const gridStore2 = new GridStore(db, doc._id, "r");
        await gridStore2.open();
        const data2 = await gridStore2.read();
        expect(data2).to.be.deep.equal(data);
    });

    it("should correctly read and write buffers single chunks", async () => {
        const { db } = this;
        const file = new fs.File(__dirname, "fixtures", "test_gs_weird_bug.png");
        const gridStore = new GridStore(db, null, "w");
        const data = await file.contents("buffer");
        gridStore.chunkSize = data.length + 100;
        await gridStore.open();
        await gridStore.write(data);
        const doc = await gridStore.close();
        const gridStore2 = new GridStore(db, doc._id, "r");
        await gridStore2.open();
        const data2 = await gridStore2.read();
        expect(data2).to.be.deep.equal(data);
    });

    it("should correctly read and write buffers using normal write with multiple chunks", async () => {
        const { db } = this;
        const file = new fs.File(__dirname, "fixtures", "test_gs_weird_bug.png");
        const gridStore = new GridStore(db, null, "w");
        const data = await file.contents("buffer");
        gridStore.chunkSize = 5000;
        await gridStore.open();
        await gridStore.write(data);
        const doc = await gridStore.close();
        const gridStore2 = new GridStore(db, doc._id, "r");
        await gridStore2.open();
        const data2 = await gridStore2.read();
        expect(data2).to.be.deep.equal(data);
    });

    it("should correctly read and write buffers single chunks and verify existance", async () => {
        const { db } = this;
        const file = new fs.File(__dirname, "fixtures", "test_gs_weird_bug.png");
        const gridStore = new GridStore(db, null, "w");
        const data = await file.contents("buffer");
        gridStore.chunkSize = 5000;
        await gridStore.open();
        await gridStore.write(data);
        const doc = await gridStore.close();
        expect(await GridStore.exist(db, doc._id)).to.be.true;
    });

    it("should correctly save data by object id", async () => {
        const { db } = this;
        const id = new bson.ObjectId();
        const gridStore = new GridStore(db, id, "w");
        await gridStore.open();
        await gridStore.write("bar");
        await gridStore.close();
        expect(await GridStore.exist(db, id)).to.be.true;
    });

    it("should check exists by using regexp", async () => {
        const { db } = this;
        const gridStore = new GridStore(db, "shouldCheckExistsByUsingRegexp.txt", "w");
        await gridStore.open();
        await gridStore.write("bar");
        await gridStore.close();
        expect(await GridStore.exist(db, /shouldCheck/)).to.be.true;
    });

    it("should correctly open grid store with different root", async () => {
        const { db } = this;
        const store = new GridStore(db, new bson.ObjectId(), "w", { root: "store" });
        await store.open();
    });

    it("should correctly set filename for grid store open", async () => {
        const { db } = this;
        const id = new bson.ObjectId();
        let gridStore = new GridStore(db, id, "test_gs_read_length", "w");
        await gridStore.open();
        await gridStore.write("hello world!");
        await gridStore.close();

        gridStore = new GridStore(db, id, "r");
        await gridStore.open();
        expect(gridStore.filename).to.be.equal("test_gs_read_length");
    });

    it("should correctly save file and then open change content type and save again", async () => {
        const { db } = this;
        const id = new bson.ObjectId();
        let gridStore = new GridStore(db, id, "test_gs_read_length", "w", { content_type: "image/jpeg" });
        await gridStore.open();
        await gridStore.write("hello world!");
        await gridStore.close();

        gridStore = new GridStore(db, id, "w+");
        await gridStore.open();
        gridStore.contentType = "html/text";
        await gridStore.close();

        gridStore = new GridStore(db, id, "r");
        await gridStore.open();
        expect(gridStore.contentType).to.be.equal("html/text");
        const data = await gridStore.read();
        expect(data.toString()).to.be.equal("hello world!");
    });

    it("should correctly save file without filename and then open add filename and save again", async () => {
        const { db } = this;
        const id = new bson.ObjectId();
        let gridStore = new GridStore(db, id, "w", { content_type: "image/jpeg" });
        await gridStore.open();
        await gridStore.write("hello world!");
        await gridStore.close();

        gridStore = new GridStore(db, id, "test_gs_filename", "w");
        await gridStore.open();
        gridStore.contentType = "html/text";
        await gridStore.write("<h1>hello world!</h1>");
        await gridStore.close();

        gridStore = new GridStore(db, id, "r");
        await gridStore.open();
        expect(gridStore.filename).to.be.equal("test_gs_filename");
        const data = await gridStore.read();
        expect(data.toString()).to.be.equal("<h1>hello world!</h1>");
    });

    it("should correctly save file and then open change filename and save again", async () => {
        const { db } = this;
        const id = new bson.ObjectId();
        let gridStore = new GridStore(db, id, "test_gs_filename3", "w", { content_type: "image/jpeg" });
        await gridStore.open();
        await gridStore.write("hello world!");
        await gridStore.close();

        gridStore = new GridStore(db, id, "test_gs_filename4", "w");
        await gridStore.open();
        gridStore.contentType = "html/text";
        await gridStore.write("<h1>hello world!</h1>");
        await gridStore.close();

        gridStore = new GridStore(db, id, "r");
        await gridStore.open();
        expect(gridStore.filename).to.be.equal("test_gs_filename4");
        const data = await gridStore.read();
        expect(data.toString()).to.be.equal("<h1>hello world!</h1>");
    });

    it("should correctly save file and then append change filename and save again", async () => {
        const { db } = this;
        const id = new bson.ObjectId();
        let gridStore = new GridStore(db, id, "test_gs_filename1", "w", { content_type: "image/jpeg" });
        await gridStore.open();
        await gridStore.write("hello world!");
        await gridStore.close();

        gridStore = new GridStore(db, id, "test_gs_filename2", "w+");
        await gridStore.open();
        gridStore.contentType = "html/text";
        await gridStore.close();

        gridStore = new GridStore(db, id, "r");
        await gridStore.open();
        expect(gridStore.filename).to.be.equal("test_gs_filename2");
        const data = await gridStore.read();
        expect(data.toString()).to.be.equal("hello world!");
    });

    it("should correctly handle seek with stream", async () => {
        const { db } = this;
        const id = new bson.ObjectId();
        let gridStore = new GridStore(db, id, "test_gs_read_length", "w", { content_type: "image/jpeg" });
        await gridStore.open();
        await gridStore.write("hello world!");
        await gridStore.close();

        gridStore = new GridStore(db, id, "r");
        await gridStore.open();
        await gridStore.seek(2);
        const stream = gridStore.stream(true);
        const data = await stream.pipe(adone.stream.concat());
        expect(data.toString()).to.be.equal("llo world!");
    });

    it("should correctly handle seek into second chunk with stream", async () => {
        const { db } = this;
        const id = new bson.ObjectId();
        let gridStore = new GridStore(db, id, "test_gs_read_length", "w", { content_type: "image/jpeg", chunk_size: 5 });
        await gridStore.open();
        await gridStore.write("hello world!");
        await gridStore.close();

        gridStore = new GridStore(db, id, "r");
        await gridStore.open();
        await gridStore.seek(7);
        const stream = gridStore.stream(true);
        const data = await stream.pipe(adone.stream.concat());
        expect(data.toString()).to.be.equal("orld!");
    });

    it("should correctly multiple seeks", async () => {
        const { db } = this;
        let gridStore = new GridStore(db, "test_gs_seek_with_buffer", "w");
        await gridStore.open();
        await gridStore.write(Buffer.from("012345678901234567890", "utf8"));
        await gridStore.close();

        gridStore = new GridStore(db, "test_gs_seek_with_buffer", "r");
        await gridStore.open();
        expect((await gridStore.read(5)).toString()).to.be.equal("01234");
        await gridStore.seek(-2, GridStore.IO_SEEK_CUR);
        expect((await gridStore.read(5)).toString()).to.be.equal("34567");
        await gridStore.seek(-2, GridStore.IO_SEEK_CUR);
        expect((await gridStore.read(5)).toString()).to.be.equal("67890");
        await gridStore.close();
    });

    it("should correctly handle multiple seeks over several chunks", async () => {
        const { db } = this;
        let gridStore = new GridStore(db, "test_gs_seek_with_buffer", "w", { chunk_size: 4 });
        await gridStore.open();
        await gridStore.write(Buffer.from("012345678901234567890", "utf8"));
        await gridStore.close();

        gridStore = new GridStore(db, "test_gs_seek_with_buffer", "r");
        await gridStore.open();
        expect((await gridStore.read(5)).toString()).to.be.equal("01234");
        await gridStore.seek(-2, GridStore.IO_SEEK_CUR);
        expect((await gridStore.read(5)).toString()).to.be.equal("34567");
        await gridStore.seek(-2, GridStore.IO_SEEK_CUR);
        expect((await gridStore.read(5)).toString()).to.be.equal("67890");
        await gridStore.close();
    });

    it.skip("should write file with mongo files and read with NodeJS", async () => {
        //
    });

    it("should fail when attempting to append to a file", async () => {
        const { db } = this;
        const chunkSize = 256 * 1024;  // Standard 256KB chunks
        const fileId = new bson.ObjectId();
        let gridStore = new GridStore(db, fileId, "w", { chunkSize, root: "chunkCheck" });
        await gridStore.open();
        const buffer = Buffer.alloc(chunkSize);
        await gridStore.write(buffer);
        await gridStore.close();
        // Open the same file, this time for appending data
        // No need to specify chunkSize...
        gridStore = new GridStore(db, fileId, "w+", { root: "chunkCheck" });
        await gridStore.open();
        await assert.throws(async () => {
            await gridStore.write(buffer);
        });
    });

    it("should correctly stream read from grid store object", async () => {
        const { db } = this;
        const file = new fs.File(__dirname, "fixtures", "test_gs_working_field_read.pdf");
        let gridStore = new GridStore(db, "test_stream_write_2", "w");
        await gridStore.writeFile(file.path());
        await gridStore.close();

        gridStore = new GridStore(db, "test_stream_write_2", "r");
        const tmpName = await fs.tmpName();
        const fileStream = fs.createWriteStream(tmpName);
        await new Promise((resolve) => {
            fileStream.once("close", resolve);
            gridStore.stream().pipe(fileStream);
        });
        await gridStore.close();
        const data = await fs.readFile(tmpName, { encoding: null });
        expect(data).to.be.deep.equal(await file.contents("buffer"));
    });

    it("should correctly stream read from grid store object no grid store open called", async () => {
        const { db } = this;
        const file = new fs.File(__dirname, "fixtures", "test_gs_working_field_read.pdf");
        let gridStore = new GridStore(db, "test_stream_write_2", "w");
        await gridStore.writeFile(file.path());
        await gridStore.close();

        gridStore = new GridStore(db, "test_stream_write_2", "r");
        const data = await gridStore.stream().pipe(stream.concat());
        expect(data).to.be.deep.equal(await file.contents("buffer"));
    });

    it("should correctly stream write from grid store object", async () => {
        const { db } = this;
        const file = new fs.File(__dirname, "fixtures", "test_gs_working_field_read.pdf");
        const filename = "test_stream_write_2";
        const storeStream = new GridStore(db, filename, "w").stream();
        await new Promise((resolve) => {
            storeStream.once("end", resolve);
            file.contentsStream(null).pipe(storeStream);
        });
        const data = await GridStore.read(db, filename);
        expect(data).to.be.deep.equal(await file.contents("buffer"));
    });

    it("should correctly write large file string and read back", async () => {
        const { db } = this;
        const fileId = new bson.ObjectId();
        let gridStore = new GridStore(db, fileId, "w", { root: "fs" });
        gridStore.chunkSize = 5000;
        await gridStore.open();
        const t = "d".repeat(5000);
        await gridStore.write(t);
        await gridStore.write(t);
        await gridStore.write(t);
        await gridStore.close();

        gridStore = new GridStore(db, fileId, "r");
        await gridStore.open();
        const stream = gridStore.stream();

        const chunks = [];
        stream.on("data", (chunk) => {
            chunks.push(chunk);
        });
        await new Promise((resolve) => stream.once("end", resolve));
        expect(chunks).to.have.lengthOf(3);
        for (const chunk of chunks) {
            expect(chunk).to.have.lengthOf(5000);
            expect(chunk.toString()).to.be.equal(t);
        }
    });

    it("should correctly write large file buffer and read back", async () => {
        const { db } = this;
        const fileId = new bson.ObjectId();
        let gridStore = new GridStore(db, fileId, "w", { root: "fs" });
        gridStore.chunkSize = 5000;
        await gridStore.open();
        const t = Buffer.alloc(5000, 43);
        await gridStore.write(t);
        await gridStore.write(t);
        await gridStore.write(t);
        await gridStore.close();

        gridStore = new GridStore(db, fileId, "r");
        await gridStore.open();
        const stream = gridStore.stream();

        const chunks = [];
        stream.on("data", (chunk) => {
            chunks.push(chunk);
        });
        await new Promise((resolve) => stream.once("end", resolve));
        expect(chunks).to.have.lengthOf(3);
        for (const chunk of chunks) {
            expect(chunk).to.have.lengthOf(5000);
            expect(chunk).to.be.deep.equal(t);
        }
    });

    it("should return same data for streaming as for direct read", async () => {
        const { db } = this;
        const gridStoreR = new GridStore(db, "test_gs_read_stream", "r");
        const gridStoreW = new GridStore(db, "test_gs_read_stream", "w", { chunkSize: 56 });
        const data = Buffer.alloc(100);
        for (let i = 0; i < 100; i++) {
            data[i] = i;
        }

        let readLen = 0;

        await gridStoreW.open();
        await gridStoreW.write(data);
        await gridStoreW.close();
        await gridStoreR.open();
        const chunks = [];
        const stream = gridStoreR.stream();
        stream.on("data", (chunk) => {
            readLen += chunk.length;
            chunks.push(chunk);
        });
        await new Promise((resolve) => stream.once("end", resolve));
        expect(readLen).to.be.equal(data.length);

        const gridStoreRead = new GridStore(db, "test_gs_read_stream", "r");
        await gridStoreRead.open();
        const data2 = await gridStoreRead.read();
        expect(Buffer.concat(chunks)).to.be.deep.equal(data2);
    });

    it("should correctly fail due to missing chunks", async () => {
        const { db } = this;
        const FILE = "empty.test.file";
        const collection = db.collection("fs.files");
        await collection.insert({
            filename: FILE,
            contentType: "application/json; charset=UTF-8",
            length: 91,
            chunkSize: 262144,
            aliases: null,
            metadata: {},
            md5: "4e638392b289870da9291a242e474930"
        });
        const gs = new GridStore(db, FILE, "r");
        await gs.open();
        await assert.throws(async () => {
            await gs.read();
        }, "no chunks found");
        await gs.close();
    });

    it("should correctly write a small payload", async () => {
        const { db } = this;
        const gridStore = new GridStore(db, "test_gs_small_write4", "w");
        await gridStore.open();
        await gridStore.write("hello world!");
        await gridStore.close();
        const files = db.collection("fs.files");
        const items = await files.find({ filename: "test_gs_small_write4" }).toArray();
        expect(items).to.have.lengthOf(1);
        const [item] = items;
        expect(item._id._bsontype).to.be.equal("ObjectId");
        const chunks = db.collection("fs.chunks");
        const id = bson.ObjectId.createFromHexString(item._id.toHexString());
        expect(await chunks.find({ files_id: id }).toArray()).to.have.lengthOf(1);
    });

    it("should correctly write small file using a buffer", async () => {
        const { db } = this;
        const gridStore = new GridStore(db, "test_gs_small_write_with_buffer", "w");
        await gridStore.open();
        const data = Buffer.from("hello world", "utf8");
        await gridStore.write(data);
        await gridStore.close();
        const files = db.collection("fs.files");
        const items = await files.find({ filename: "test_gs_small_write_with_buffer" }).toArray();
        expect(items).to.have.lengthOf(1);
        const [item] = items;
        const chunks = db.collection("fs.chunks");
        expect(await chunks.find({ files_id: item._id }).toArray()).to.have.lengthOf(1);
    });

    it("should save small file to grid store", async () => {
        const { db } = this;
        const gridStore = new GridStore(db, "test_gs_small_file", "w");
        await gridStore.open();
        await gridStore.write("hello world!");
        await gridStore.close();
        const files = db.collection("fs.files");
        const items = await files.find({ filename: "test_gs_small_file" }).toArray();
        expect(items).to.have.lengthOf(1);
        const data = await GridStore.read(db, "test_gs_small_file");
        expect(data.toString()).to.be.deep.equal("hello world!");
    });

    it("should correctly overwrite file", async () => {
        const { db } = this;
        let gridStore = new GridStore(db, "test_gs_overwrite", "w");
        await gridStore.open();
        await gridStore.write("hello world!");
        await gridStore.close();

        gridStore = new GridStore(db, "test_gs_overwrite", "w");
        await gridStore.open();
        await gridStore.write("overwrite");
        await gridStore.close();

        const data = await GridStore.read(db, "test_gs_overwrite");
        expect(data.toString()).to.be.equal("overwrite");
    });

    it("should correctly seek with string", async () => {
        const { db } = this;
        let gridStore = new GridStore(db, "test_gs_seek", "w");
        await gridStore.open();
        await gridStore.write("hello, world!");
        await gridStore.close();
        gridStore = new GridStore(db, "test_gs_seek", "r");
        await gridStore.open();
        await gridStore.seek(0);
        expect((await gridStore.getc()).toString()).to.be.equal("h");
        await gridStore.close();
        gridStore = new GridStore(db, "test_gs_seek", "r");
        await gridStore.open();
        await gridStore.seek(7);
        expect((await gridStore.getc()).toString()).to.be.equal("w");
        await gridStore.close();
        gridStore = new GridStore(db, "test_gs_seek", "r");
        await gridStore.open();
        await gridStore.seek(4);
        expect((await gridStore.getc()).toString()).to.be.equal("o");
        await gridStore.close();
        gridStore = new GridStore(db, "test_gs_seek", "r");
        await gridStore.open();
        await gridStore.seek(-1, GridStore.IO_SEEK_END);
        expect((await gridStore.getc()).toString()).to.be.equal("!");
        await gridStore.close();
        gridStore = new GridStore(db, "test_gs_seek", "r");
        await gridStore.open();
        await gridStore.seek(-6, GridStore.IO_SEEK_END);
        expect((await gridStore.getc()).toString()).to.be.equal("w");
        await gridStore.close();
        gridStore = new GridStore(db, "test_gs_seek", "r");
        await gridStore.open();
        await gridStore.seek(7, GridStore.IO_SEEK_CUR);
        expect((await gridStore.getc()).toString()).to.be.equal("w");
        await gridStore.seek(-1, GridStore.IO_SEEK_CUR);
        expect((await gridStore.getc()).toString()).to.be.equal("w");
        await gridStore.seek(-4, GridStore.IO_SEEK_CUR);
        expect((await gridStore.getc()).toString()).to.be.equal("o");
        await gridStore.seek(3, GridStore.IO_SEEK_CUR);
        expect((await gridStore.getc()).toString()).to.be.equal("o");
        await gridStore.close();
    });

    it("should correctly seek across chunks", async () => {
        const { db } = this;
        let gridStore = new GridStore(db, "test_gs_seek_across_chunks", "w");
        await gridStore.open();
        const data = Buffer.alloc(gridStore.chunkSize * 3);
        await gridStore.write(data);
        await gridStore.close();

        gridStore = new GridStore(db, "test_gs_seek_across_chunks", "r");
        await gridStore.open();
        await gridStore.seek(gridStore.chunkSize + 1);
        expect(await gridStore.tell()).to.be.equal(gridStore.chunkSize + 1);
        await gridStore.close();
    });

    it("should correctly save empty file", async () => {
        const { db } = this;
        const gridStore = new GridStore(db, "test_gs_save_empty_file", "w");
        await gridStore.open();
        const files = db.collection("fs.files");
        await files.deleteMany();
        const chunks = db.collection("fs.chunks");
        await chunks.deleteMany();
        await gridStore.write("");
        await gridStore.close();
        expect(await files.count()).to.be.equal(1);
        expect(await chunks.count()).to.be.equal(0);
    });

    it("should ensure that chunk size cannot be changed during read", async () => {
        const { db } = this;
        let gridStore = new GridStore(db, "test_gs_cannot_change_chunk_size_on_read", "w");
        await gridStore.open();
        await gridStore.write("hello, world!");
        await gridStore.close();

        gridStore = new GridStore(db, "test_gs_cannot_change_chunk_size_on_read", "r");
        await gridStore.open();
        gridStore.chunkSize = 42;
        expect(gridStore.chunkSize).to.be.equal(__.Chunk.DEFAULT_CHUNK_SIZE);
        await gridStore.close();
    });

    it("should ensure chunk size cannot change after data has been written", async () => {
        const { db } = this;
        const gridStore = new GridStore(db, "test_gs_cannot_change_chunk_size_after_data_written", "w");
        await gridStore.open();
        await gridStore.write("hello, world!");
        expect(gridStore.chunkSize).to.be.equal(__.Chunk.DEFAULT_CHUNK_SIZE);
        await gridStore.close();
    });

    it("should correctly store 8bit values", async () => {
        const { db } = this;
        const gridStore = new GridStore(db, "test_gs_check_high_bits", "w");
        const data = Buffer.alloc(255);
        for (let i = 0; i < 255; i++) {
            data[i] = i;
        }
        await gridStore.open();
        await gridStore.write(data);
        await gridStore.close();

        expect(await GridStore.read(db, "test_gs_check_high_bits")).to.be.deep.equal(data);
    });

    it("should allow changing chunk size", async () => {
        const { db } = this;
        let gridStore = new GridStore(db, "test_change_chunk_size", "w");
        await gridStore.open();
        gridStore.chunkSize = 42;
        await gridStore.write("foo");
        await gridStore.close();

        gridStore = new GridStore(db, "test_change_chunk_size", "r");
        await gridStore.open();
        expect(gridStore.chunkSize).to.be.equal(42);
        await gridStore.close();
    });

    it("should allow changing chunk size at creation of grid store", async () => {
        const { db } = this;
        let gridStore = new GridStore(db, "test_change_chunk_size", "w", { chunk_size: 42 });
        await gridStore.open();
        await gridStore.write("foo");
        await gridStore.close();

        gridStore = new GridStore(db, "test_change_chunk_size", "r");
        await gridStore.open();
        expect(gridStore.chunkSize).to.be.equal(42);
        await gridStore.close();
    });

    it("should correctly calculate md5", async () => {
        const { db } = this;
        let gridStore = new GridStore(db, "new-file", "w");
        await gridStore.open();
        await gridStore.write("hello world\n");
        await gridStore.close();

        gridStore = new GridStore(db, "new-file", "r");
        await gridStore.open();
        expect(gridStore.md5).to.be.equal("6f5902ac237024bdd0c176cb93063dc4");
        expect(() => {
            gridStore.md5 = "hey";
        }).to.throw();
        expect(gridStore.md5).to.be.equal("6f5902ac237024bdd0c176cb93063dc4");
        await gridStore.close();

        gridStore = new GridStore(db, "new-file", "w");
        await gridStore.open();
        await gridStore.close();

        gridStore = new GridStore(db, "new-file", "r");
        await gridStore.open();
        expect(gridStore.md5).to.be.equal("d41d8cd98f00b204e9800998ecf8427e");
        await gridStore.close();
    });

    it("should correctly update upload date", async () => {
        const { db } = this;
        let gridStore = new GridStore(db, "test_gs_upload_date", "w");
        await gridStore.open();
        await gridStore.write("hello world\n");
        await gridStore.close();

        gridStore = new GridStore(db, "test_gs_upload_date", "r");
        await gridStore.open();
        expect(gridStore.uploadDate).to.be.ok;
        const originalFileUploadDate = gridStore.uploadDate;
        await gridStore.close();

        gridStore = new GridStore(db, "test_gs_upload_date", "w");
        await gridStore.open();
        await gridStore.write("new data");
        await gridStore.close();

        gridStore = new GridStore(db, "test_gs_upload_date", "r");
        await gridStore.open();
        expect(gridStore.uploadDate.getTime()).to.be.equal(originalFileUploadDate.getTime());
        await gridStore.close();
    });

    it("should correctly save content type", async () => {
        const { db } = this;
        let gridStore = new GridStore(db, "test_gs_content_type", "w");
        await gridStore.open();
        await gridStore.write("hello world\n");
        await gridStore.close();

        gridStore = new GridStore(db, "test_gs_content_type", "r");
        await gridStore.open();
        expect(gridStore.contentType).to.be.equal(GridStore.DEFAULT_CONTENT_TYPE);
        await gridStore.close();

        gridStore = new GridStore(db, "test_gs_content_type", "w+");
        await gridStore.open();
        gridStore.contentType = "text/html";
        await gridStore.close();

        gridStore = new GridStore(db, "test_gs_content_type", "r");
        await gridStore.open();
        expect(gridStore.contentType).to.be.equal("text/html");
        await gridStore.close();
    });

    it("should correctly save content type when passed in at grid store creation", async () => {
        const { db } = this;
        let gridStore = new GridStore(db, "test_gs_content_type_option", "w", { content_type: "image/jpg" });
        await gridStore.open();
        await gridStore.write("hello world\n");
        await gridStore.close();

        gridStore = new GridStore(db, "test_gs_content_type_option", "r");
        await gridStore.open();
        expect(gridStore.contentType).to.be.equal("image/jpg");
        await gridStore.close();
    });

    it("should correctly report illegal mode", async () => {
        const { db } = this;
        let gridStore = new GridStore(db, "test_gs_metadata", "w", { content_type: "image/jpg" });
        await gridStore.open();
        await gridStore.write("hello world\n");
        await gridStore.close();

        gridStore = new GridStore(db, "test_gs_metadata", "r");
        await gridStore.open();
        expect(gridStore.metadata).to.be.null;
        await gridStore.close();

        gridStore = new GridStore(db, "test_gs_metadata", "w+");
        await gridStore.open();
        gridStore.metadata = { a: 1 };
        await gridStore.close();

        gridStore = new GridStore(db, "test_gs_metadata", "r");
        await gridStore.open();
        expect(gridStore.metadata).to.be.deep.equal({ a: 1 });
        await gridStore.close();
    });

    it("should not throw error on closing of grid object", async () => {
        const { db } = this;
        let gridStore = new GridStore(db, "test_gs_metadata", "w", { content_type: "image/jpg" });
        await gridStore.open();
        await gridStore.write("hello world\n");
        await gridStore.close();

        gridStore = new GridStore(db, "test_gs_metadata", "r");
        await gridStore.open();
        await gridStore.close();
    });

    it("should not throw error on close", async () => {
        const { db } = this;
        const fieldId = new bson.ObjectId();
        const gridStore = new GridStore(db, fieldId, "w", { root: "fs" });
        gridStore.chunkSize = 1024 * 256;
        await gridStore.open();
        const numberOfWrites = 1000000 / 5000;
        for (let i = 0; i < numberOfWrites; ++i) {
            await gridStore.write(Buffer.allocUnsafe(5000));
        }
        await gridStore.close();
    });

    it("should correctly safe file using int as id key", async () => {
        const { db } = this;
        let gridStore = new GridStore(db, 500, "test_gs_small_write2", "w");
        await gridStore.open();
        await gridStore.write("hello world!");
        await gridStore.close();
        const files = db.collection("fs.files");
        const items = await files.find({ filename: "test_gs_small_write2" }).toArray();
        expect(items).to.have.lengthOf(1);
        const [item] = items;
        expect(item._id).to.be.a("number");
        const chunks = db.collection("fs.chunks");
        expect(await chunks.find({ files_id: item._id }).toArray()).to.have.lengthOf(1);
        gridStore = new GridStore(db, 500, "test_gs_small_write2", "r");
        await gridStore.open();
        expect((await gridStore.read()).toString()).to.be.equal("hello world!");
        expect((await GridStore.read(db, "test_gs_small_write2")).toString()).to.be.equal("hello world!");
        await gridStore.close();
    });

    it("should correctly read with position offset", async () => {
        const { db } = this;
        const data = Buffer.allocUnsafe(1024 * 512);
        data.write("Hello world!", 1024 * 256);

        let gridStore = new GridStore(db, bson.Long.fromNumber(100), "test_gs_small_write3", "w");
        await gridStore.open();
        await gridStore.write(data);
        await gridStore.close();

        // Reopen the gridstore in read only mode, seek and then attempt read
        gridStore = new GridStore(db, bson.Long.fromNumber(100), "test_gs_small_write3", "r");
        await gridStore.open();
        // Seek to middle
        await gridStore.seek(1024 * 256 + 6);
        expect((await gridStore.read(5)).toString()).to.be.equal("world");
        await gridStore.close();
    });

    it("should correctly write", async () => {
        const { db } = this;
        const str = "+".repeat(1024 * 25);
        const fname = "test_large_str";
        const chunkSize = 1024 * 10;
        await GridStore.unlink(db, fname);
        let gridStore = new GridStore(db, fname, "w");
        gridStore.chunkSize = chunkSize;
        await gridStore.open();
        await gridStore.write(str);
        await gridStore.close();

        gridStore = new GridStore(db, fname, "r");
        await gridStore.open();
        await gridStore.seek(0);
        const data = await gridStore.read();
        expect(data.toString()).to.be.deep.equal(str);
        await gridStore.close();
    });

    it("should correctly return error message on no file existing", async () => {
        const { db } = this;
        const gridStore = new GridStore(db, "_i_shouldCorrectlyWriteASmallPayload", "r");
        await assert.throws(async () => {
            await gridStore.open();
        });  // strange message
    });

    it("should fail when seeking on a write enabled gridstore object", async () => {
        const { db } = this;
        const gridStore = new GridStore(db, "test_gs_metadata", "w", { content_type: "image/jpg" });
        await gridStore.open();
        await assert.throws(async () => {
            await gridStore.seek(0);
        }, "seek is only supported for mode r");
    });

    it("should correctly handle filename as ObjectId", async () => {
        const { db } = this;
        const id = new bson.ObjectId();
        const gridStore = new GridStore(db, id, id, "w");
        await gridStore.open();
        await gridStore.write("hello world!");
        await gridStore.close();

        expect(await GridStore.exist(db, { filename: id })).to.be.true;
    });

    it("should correctly pipe through multiple pipelines", async () => {
        const db = await mongo.connect(this.url(), { server: { sslValidate: false } });
        const stream = new GridStore(db, "simple_100_document_toArray.png", "w").stream();
        const file = new fs.File(__dirname, "fixtures", "test_gs_working_field_read.pdf");
        await new Promise((resolve) => {
            file.contentsStream(null).pipe(stream);
            stream.once("end", resolve);
        });
        const gridData = await GridStore.read(db, "simple_100_document_toArray.png");
        expect(gridData).to.be.deep.equal(await file.contents("buffer"));
    });

    it("should correctly seek on file where size of file is a multiple of the chunk size", async () => {
        const db = await mongo.connect(this.url(), { server: { sslValidate: false } });
        let gridStore = new GridStore(db, "test_gs_multi_chunk_exact_size", "w");
        await gridStore.open();
        gridStore.chunkSize = 512;
        await gridStore.write(Buffer.allocUnsafe(gridStore.chunkSize * 4));
        await gridStore.close();

        gridStore = new GridStore(db, "test_gs_multi_chunk_exact_size", "r");
        await gridStore.open();
        await gridStore.seek(0, GridStore.IO_SEEK_END);
        expect(await gridStore.tell()).to.be.equal(512 * 4);
        await gridStore.seek(0, GridStore.IO_SEEK_SET);
        expect(await gridStore.tell()).to.be.equal(0);
        expect(await gridStore.read()).to.have.lengthOf(512 * 4);
        await gridStore.close();
    });

    it("should correctly seek on file where size of file is a multiple of the chunk size and then stream", async () => {
        const id = new bson.ObjectId();

        const db = await mongo.connect(this.url(), { server: { sslValidate: false } });
        let gridStore = new GridStore(db, id, "w");
        await gridStore.open();
        gridStore.chunkSize = 512;
        const data = Buffer.alloc(gridStore.chunkSize * 2);
        await gridStore.write(data);
        await gridStore.close();

        gridStore = new GridStore(db, id, "r");
        await gridStore.open();
        await gridStore.seek(0, GridStore.IO_SEEK_END);
        expect(await gridStore.tell()).to.be.equal(1024);
        await gridStore.seek(0, GridStore.IO_SEEK_SET);
        expect(await gridStore.tell()).to.be.equal(0);
        expect(data).to.be.deep.equal(await gridStore.stream().pipe(stream.concat()));
    });

    it("should correctly write fake png to gridstore", async () => {
        const db = await mongo.connect(this.url(), { server: { sslValidate: false } });
        const gridStore = new GridStore(db, new bson.ObjectId(), "w", { content_type: "image/png", chunk_size: 1024 * 4 });
        await gridStore.open();
        await gridStore.write(Buffer.allocUnsafe(200033));
        await gridStore.close();
    });

    it("should not attempt to delete chunks when no file exists", async () => {
        const { db } = this;
        const buffer = Buffer.allocUnsafe(2000);
        const gridStore = new GridStore(db, new bson.ObjectId(), "w", { content_type: "image/png", chunk_size: 1024 * 4 });
        await gridStore.open();
        await gridStore.write(buffer);
        await gridStore.close();
        // ?
    });
});
