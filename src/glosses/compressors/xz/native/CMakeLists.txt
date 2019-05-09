cmake_minimum_required(VERSION 3.8)

# Name of the project (will be the name of the plugin)
project(lzma)

# Build a shared library named after the project from the files in `src/`
set(SOURCE_FILES 
    "src/util.cpp"
    "src/liblzma-functions.cpp"
    "src/filter-array.cpp"
    "src/lzma-stream.cpp"
    "src/module.cpp"
    "src/mt-options.cpp"
    "src/index-parser.cpp")

add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES})

# Gives our library file a .node extension without any "lib" prefix
set_target_properties(${PROJECT_NAME} PROPERTIES
    PREFIX ""
    SUFFIX ".node")

# Essential include files to build a node addon,
# You should add this line in every CMake.js based project
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_JS_INC}
    "${ADONE_BUILD_DIRECTORY}/xz/build/include"
    "src/snappy")

# Essential library files to link to a node addon
# You should add this line in every CMake.js based project
target_link_libraries(${PROJECT_NAME} 
    ${ADONE_BUILD_DIRECTORY}/xz/build/lib/liblzma.a
    ${CMAKE_JS_LIB})
