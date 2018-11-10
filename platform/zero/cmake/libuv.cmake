cmake_minimum_required(VERSION 3.10.2)

# Configure external libuv
set(DEPS_UV deps/libuv)
set(DEPS_UV_SRC ${ROOT_DIR}/${DEPS_UV})

build_lib_name(LIBUV_NAME uv_a)
if("${TARGET_OS}" STREQUAL "MOCK")
  string(TOLOWER ${TARGET_ARCH}-linux PLATFORM_DESCRIPTOR)
else()
  string(TOLOWER ${TARGET_ARCH}-${TARGET_OS} PLATFORM_DESCRIPTOR)
endif()

ExternalProject_Add(libuv
  PREFIX ${DEPS_UV}
  SOURCE_DIR ${DEPS_UV_SRC}
  BUILD_IN_SOURCE 0
  BINARY_DIR ${DEPS_UV}
  INSTALL_COMMAND
    ${CMAKE_COMMAND} -E copy_directory
    ${CMAKE_BINARY_DIR}/${DEPS_UV}/${CONFIG_TYPE}/
    ${CMAKE_BINARY_DIR}/lib/
  CMAKE_ARGS
    -DCMAKE_BUILD_TYPE=${CMAKE_BUILD_TYPE}
    -DCMAKE_C_FLAGS=${CMAKE_C_FLAGS}
    -DTARGET_PLATFORM=${PLATFORM_DESCRIPTOR}
    -DBUILDTESTER=NO
    -DBUILDAPIEMULTESTER=NO
    -DTARGET_SYSTEMROOT=${TARGET_SYSTEMROOT}
)
add_library(uv STATIC IMPORTED)
add_dependencies(uv libuv)
set_property(TARGET uv PROPERTY
  IMPORTED_LOCATION ${CMAKE_BINARY_DIR}/lib/${LIBUV_NAME})
set_property(DIRECTORY APPEND PROPERTY
  ADDITIONAL_MAKE_CLEAN_FILES ${CMAKE_BINARY_DIR}/lib/${LIBUV_NAME})
set(AUV_INCLUDE_DIR ${DEPS_UV_SRC}/include)
set(AUV_LIBS uv)

if("${TARGET_OS}" STREQUAL "LINUX")
  list(APPEND AUV_LIBS pthread)
elseif("${TARGET_OS}" STREQUAL "WINDOWS")
  list(APPEND AUV_LIBS
        ws2_32.lib
        UserEnv.lib
        advapi32.lib
        iphlpapi.lib
        psapi.lib
        shell32.lib)
endif()
