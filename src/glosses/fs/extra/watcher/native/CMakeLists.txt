cmake_minimum_required(VERSION 3.13)

SET(CMAKE_C_COMPILER /usr/bin/gcc)
SET(CMAKE_CXX_COMPILER /usr/bin/g++)

# Name of the project (will be the name of the plugin)
project(fsevents)

# Build a shared library named after the project from the files in `src/`
set(SOURCE_FILES
    "src/fsevents.c"
    "src/rawfsevents.c")

find_library(coreFoundation CoreFoundation)
find_library(coreServices CoreServices)

add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES})

# Gives our library file a .node extension without any "lib" prefix
set_target_properties(${PROJECT_NAME} PROPERTIES
    PREFIX ""
    SUFFIX ".node")

# Essential include files to build a node addon,
# You should add this line in every CMake.js based project
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_JS_INC})

# Essential library files to link to a node addon
# You should add this line in every CMake.js based project
target_link_libraries(${PROJECT_NAME}
    "-Wl,-bind_at_load"
    ${CMAKE_JS_LIB}
    ${coreFoundation}
    ${coreServices})