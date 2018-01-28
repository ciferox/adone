cmake_minimum_required(VERSION 3.7)

# Name of the project (will be the name of the plugin)
project(secp256k1)

find_library(GMP "gmp")
find_library(GMPXX "gmpxx")

set(WITH_GMP 0)

if (WIN32)
    message(STATUS "With GMP: no")
else()
    if (NOT ((GMP STREQUAL "GMP-NOTFOUND") OR (GMPXX STREQUAL "GMPXX-NOTFOUND")))
        set(WITH_GMP 1)
        message(STATUS "With GMP: yes")
    else()
        message(STATUS "With GMP: no")
    endif()
endif(WIN32)


# Build a shared library named after the project from the files in `src/`
file(GLOB SOURCE_FILES
    "src/*.cc"
    "src/*.h"
    "src/secp256k1/src/secp256k1.c"
    "src/secp256k1/contrib/lax_der_parsing.c"
    "src/secp256k1/contrib/lax_der_privatekey_parsing.c"
)

include_directories(BEFORE
    "src"
    "src/secp256k1"
    "src/secp256k1/include"
    "src/secp256k1/src"
    "src/secp256k1/contrib"
)

set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -Wall -Wno-maybe-uninitialized -Wno-uninitialized -Wno-unused-function -Wextra")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++0x")

add_definitions(-DENABLE_MODULE_RECOVERY=1)

if (WITH_GMP)
    add_definitions(-DHAVE_LIBGMP=1 -DUSE_NUM_GMP=1 -DUSE_FIELD_INV_NUM=1 -DUSE_SCALAR_INV_NUM=1)
    add_compile_options(-lgmp -lgmpxx)
else()
    add_definitions(-DUSE_NUM_NONE=1 -DUSE_FIELD_INV_BUILTIN=1 -DUSE_SCALAR_INV_BUILTIN=1)
    add_compile_options(-lr2)
endif()

if(UNIX AND CMAKE_SYSTEM_PROCESSOR STREQUAL "x86_64")
    add_definitions(-DHAVE___INT128=1 -DUSE_ASM_X86_64=1 -DUSE_FIELD_5X52=1 -DUSE_FIELD_5X52_INT128=1 -DUSE_SCALAR_4X64=1)
else()
    add_definitions(-DUSE_FIELD_10X26=1 -DUSE_SCALAR_8X32=1)
endif()

if (CMAKE_SYSTEM_NAME STREQUAL "Darwin")
    add_definitions(-DMACOSX_DEPLOYMENT_TARGET=10.7)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -stdlib=libc++")    
endif()

add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES})

# Gives our library file a .node extension without any "lib" prefix
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

# Essential include files to build a node addon,
# You should add this line in every CMake.js based project
target_include_directories(${PROJECT_NAME} PRIVATE ${CMAKE_JS_INC})

# Essential library files to link to a node addon
# You should add this line in every CMake.js based project
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB})