const {
    p2p: { stream: { pull } }
} = adone;
//test through streams compose on pipe!

it("join through streams with pipe", (done) => {

    const map = pull.map;

    const pipeline =
    pull(
        map((d) => {
        //make exciting!
            return `${d}!`;
        }),
        map((d) => {
        //make loud
            return d.toUpperCase();
        }),
        map((d) => {
        //add sparkles
            return `*** ${d} ***`;
        })
    );
    //the pipe line does not have a source stream.
    //so it should be a reader (function that accepts
    //a read function)

    assert.equal("function", typeof pipeline);
    assert.equal(1, pipeline.length);

    //if we pipe a read function to the pipeline,
    //the pipeline will become readable!

    const read =
    pull(
        pull.values(["billy", "joe", "zeke"]),
        pipeline
    );

    assert.equal("function", typeof read);
    //we will know it's a read function,
    //because read takes two args.
    assert.equal(2, read.length);

    pull(
        read,
        pull.collect((err, array) => {
            // console.log(array);
            assert.deepEqual(
                array, 
                ["*** BILLY! ***", "*** JOE! ***", "*** ZEKE! ***"]
            );
            done();
        })
    );

});
