cmake_minimum_required(VERSION 3.10)

# Configure external libauv
set(DEPS_AUV deps/libauv)
set(DEPS_AUV_SRC ${ROOT_DIR}/${DEPS_AUV})

build_lib_name(LIBAUV_NAME auv_a)
if("${TARGET_OS}" STREQUAL "MOCK")
  string(TOLOWER ${TARGET_ARCH}-linux PLATFORM_DESCRIPTOR)
else()
  string(TOLOWER ${TARGET_ARCH}-${TARGET_OS} PLATFORM_DESCRIPTOR)
endif()
set(DEPS_AUV_TOOLCHAIN
  ${DEPS_AUV_SRC}/cmake/config/config_${PLATFORM_DESCRIPTOR}.cmake)
message(STATUS "libauv toolchain file: ${DEPS_AUV_TOOLCHAIN}")
ExternalProject_Add(libauv
  PREFIX ${DEPS_AUV}
  SOURCE_DIR ${DEPS_AUV_SRC}
  BUILD_IN_SOURCE 0
  BINARY_DIR ${DEPS_AUV}
  INSTALL_COMMAND
    ${CMAKE_COMMAND} -E copy_directory
    ${CMAKE_BINARY_DIR}/${DEPS_AUV}/${CONFIG_TYPE}/
    ${CMAKE_BINARY_DIR}/lib/
  CMAKE_ARGS
    -DCMAKE_TOOLCHAIN_FILE=${DEPS_AUV_TOOLCHAIN}
    -DCMAKE_BUILD_TYPE=${CMAKE_BUILD_TYPE}
    -DCMAKE_C_FLAGS=${CMAKE_C_FLAGS}
    -DTARGET_PLATFORM=${PLATFORM_DESCRIPTOR}
    -DLIBAUV_CUSTOM_LIB_OUT=lib
    -DBUILDTESTER=NO
    -DBUILDAPIEMULTESTER=NO
    -DTARGET_SYSTEMROOT=${TARGET_SYSTEMROOT}
    -DTARGET_BOARD=${TARGET_BOARD}
)
add_library(auv STATIC IMPORTED)
add_dependencies(auv libauv)
set_property(TARGET auv PROPERTY
  IMPORTED_LOCATION ${CMAKE_BINARY_DIR}/lib/${LIBAUV_NAME})
set_property(DIRECTORY APPEND PROPERTY
  ADDITIONAL_MAKE_CLEAN_FILES ${CMAKE_BINARY_DIR}/lib/${LIBAUV_NAME})
set(AUV_INCLUDE_DIR ${DEPS_AUV_SRC}/include)
set(AUV_LIBS auv)

if("${TARGET_OS}" STREQUAL "MOCK" OR
   "${TARGET_OS}" STREQUAL "LINUX")
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
