cmake_minimum_required(VERSION 3.8)

# Name of the project (will be the name of the plugin)
project(iltorb)

add_subdirectory("src/deps/brotli")

# Build a shared library named after the project from the files in `src/`
set(SOURCE_FILES 
    "src/deps/brotli/c/common/dictionary.c"
    "src/deps/brotli/c/common/transform.c"

    "src/deps/brotli/c/dec/bit_reader.c"
    "src/deps/brotli/c/dec/decode.c"
    "src/deps/brotli/c/dec/huffman.c"
    "src/deps/brotli/c/dec/state.c"

    "src/deps/brotli/c/enc/backward_references.c"
    "src/deps/brotli/c/enc/backward_references_hq.c"
    "src/deps/brotli/c/enc/bit_cost.c"
    "src/deps/brotli/c/enc/block_splitter.c"
    "src/deps/brotli/c/enc/brotli_bit_stream.c"
    "src/deps/brotli/c/enc/cluster.c"
    "src/deps/brotli/c/enc/compress_fragment.c"
    "src/deps/brotli/c/enc/compress_fragment_two_pass.c"
    "src/deps/brotli/c/enc/dictionary_hash.c"
    "src/deps/brotli/c/enc/encode.c"
    "src/deps/brotli/c/enc/encoder_dict.c"
    "src/deps/brotli/c/enc/entropy_encode.c"
    "src/deps/brotli/c/enc/histogram.c"
    "src/deps/brotli/c/enc/literal_cost.c"
    "src/deps/brotli/c/enc/memory.c"
    "src/deps/brotli/c/enc/metablock.c"
    "src/deps/brotli/c/enc/static_dict.c"
    "src/deps/brotli/c/enc/utf8_util.c"

    "src/common/allocator.cc"
    "src/common/stream_coder.cc"

    "src/dec/stream_decode.cc"
    "src/dec/stream_decode_worker.cc"

    "src/enc/stream_encode.cc"
    "src/enc/stream_encode_worker.cc"

    "src/iltorb.cc")

add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES})

# Gives our library file a .node extension without any "lib" prefix
set_target_properties(${PROJECT_NAME} PROPERTIES
    PREFIX ""
    SUFFIX ".node")

# Essential include files to build a node addon,
# You should add this line in every CMake.js based project
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_JS_INC}
    "src/deps/brotli/c/include")

target_compile_definitions(${PROJECT_NAME} PUBLIC -DNOMINMAX)

# Essential library files to link to a node addon
# You should add this line in every CMake.js based project
target_link_libraries(${PROJECT_NAME} 
    # libbrotli
    ${CMAKE_JS_LIB})