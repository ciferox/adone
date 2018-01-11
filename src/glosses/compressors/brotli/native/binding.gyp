{
  'targets': [
    {
      "target_name": "brotli",
      "sources": [
        "src/deps/common/dictionary.c",
        "src/deps/enc/backward_references.c",
        "src/deps/enc/backward_references_hq.c",
        "src/deps/enc/bit_cost.c",
        "src/deps/enc/block_splitter.c",
        "src/deps/enc/brotli_bit_stream.c",
        "src/deps/enc/cluster.c",
        "src/deps/enc/compress_fragment.c",
        "src/deps/enc/compress_fragment_two_pass.c",
        "src/deps/enc/dictionary_hash.c",
        "src/deps/enc/encode.c",
        "src/deps/enc/entropy_encode.c",
        "src/deps/enc/histogram.c",
        "src/deps/enc/literal_cost.c",
        "src/deps/enc/memory.c",
        "src/deps/enc/metablock.c",
        "src/deps/enc/static_dict.c",
        "src/deps/enc/utf8_util.c",
        "src/deps/dec/bit_reader.c",
        "src/deps/dec/decode.c",
        "src/deps/dec/huffman.c",
        "src/deps/dec/state.c",
        "src/brotli.cc",
      ],
      "include_dirs": [
        "<(adone_root_dir)/nan",
        "<(adone_root_dir)/src/native",
        "src/deps/include"
      ],
      "defines": ["NOMINMAX"],
      "cflags" : ["-O2"],
      "xcode_settings": {
        "OTHER_CFLAGS" : ["-O2"]
      }
    }
  ]
}
