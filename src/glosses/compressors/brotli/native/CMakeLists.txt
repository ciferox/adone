cmake_minimum_required(VERSION 3.7)

# Name of the project (will be the name of the plugin)
project(brotli)

# Build a shared library named after the project from the files in `src/`
set(SOURCE_FILES 
    "src/deps/common/dictionary.c"

    "src/deps/dec/bit_reader.c"
    "src/deps/dec/decode.c"
    "src/deps/dec/huffman.c"
    "src/deps/dec/state.c"

    "src/deps/enc/backward_references.c"
    "src/deps/enc/backward_references_hq.c"
    "src/deps/enc/bit_cost.c"
    "src/deps/enc/block_splitter.c"
    "src/deps/enc/brotli_bit_stream.c"
    "src/deps/enc/cluster.c"
    "src/deps/enc/compress_fragment.c"
    "src/deps/enc/compress_fragment_two_pass.c"
    "src/deps/enc/dictionary_hash.c"
    "src/deps/enc/encode.c"
    "src/deps/enc/entropy_encode.c"
    "src/deps/enc/histogram.c"
    "src/deps/enc/literal_cost.c"
    "src/deps/enc/memory.c"
    "src/deps/enc/metablock.c"
    "src/deps/enc/static_dict.c"
    "src/deps/enc/utf8_util.c"

    "src/brotli.cc")

add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES})

# Gives our library file a .node extension without any "lib" prefix
set_target_properties(${PROJECT_NAME} PROPERTIES
    PREFIX ""
    SUFFIX ".node")

# Essential include files to build a node addon,
# You should add this line in every CMake.js based project
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_JS_INC}
    "src/deps/include")

target_compile_definitions(${PROJECT_NAME} PUBLIC -DNOMINMAX)

# Essential library files to link to a node addon
# You should add this line in every CMake.js based project
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB})