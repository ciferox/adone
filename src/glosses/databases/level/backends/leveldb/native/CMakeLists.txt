cmake_minimum_required(VERSION 3.8)

project(leveldb)

# Build a shared library named after the project from the files in `src/`
file(GLOB SOURCE_FILES  "src/*.cc")

add_subdirectory("deps/leveldb")

add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES})

# Gives our library file a .node extension without any "lib" prefix
set_target_properties(${PROJECT_NAME} PROPERTIES
    PREFIX ""
    SUFFIX ".node")

# Essential include files to build a node addon,
# You should add this line in every CMake.js based project
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_JS_INC}
    "deps/leveldb"
    "deps/leveldb/include")

# Essential library files to link to a node addon
# You should add this line in every CMake.js based project
target_link_libraries(${PROJECT_NAME} 
    libleveldb
    ${CMAKE_JS_LIB}
    )
