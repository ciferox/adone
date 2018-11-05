cmake_minimum_required(VERSION 3.10)

### Hunter snapshot that will be used ###
include("cmake/gate.cmake")
HunterGate()
project(VerySimple)

### Download dependencies ###
hunter_add_package(libauv)

### Find dependencies ###
find_package(libauv CONFIG REQUIRED)

### Targets ###
add_executable(simple simple.cpp)
target_include_directories(simple PUBLIC "${LIBAUV_ROOT}/include")
target_link_libraries(simple PUBLIC libauv::auv_a)
