#ifndef __ADONE_MASSSCAN_H_
#define __ADONE_MASSSCAN_H_

#include <adone.h>
#include <uv.h>
#include <ctype.h>
#include <limits.h>
#include <assert.h>
#include <time.h>
#include <signal.h>
#include <stdint.h>
#include <iostream>
#include <string>
#include <algorithm>
#include <iterator>
#include <thread>
#include <deque>
#include <mutex>
#include <chrono>
#include <condition_variable>

extern "C" {
#include "masscan/src/masscan.h"
#include "masscan/src/masscan-version.h"
#include "masscan/src/masscan-status.h"   /* open or closed */
#include "masscan/src/rand-blackrock.h"   /* the BlackRock shuffling func */
#include "masscan/src/rand-lcg.h"         /* the LCG randomization func */
#include "masscan/src/templ-pkt.h"        /* packet template, that we use to send */
#include "masscan/src/rawsock.h"          /* api on top of Linux, Windows, Mac OS X*/
#include "masscan/src/logger.h"           /* adjust with -v command-line opt */
#include "masscan/src/main-status.h"      /* printf() regular status updates */
#include "masscan/src/main-throttle.h"    /* rate limit */
#include "masscan/src/main-dedup.h"       /* ignore duplicate responses */
#include "masscan/src/main-ptrace.h"      /* for nmap --packet-trace feature */
#include "masscan/src/proto-arp.h"        /* for responding to ARP requests */
#include "masscan/src/proto-banner1.h"    /* for snatching banners from systems */
#include "masscan/src/proto-tcp.h"        /* for TCP/IP connection table */
#include "masscan/src/proto-preprocess.h" /* quick parse of packets */
#include "masscan/src/proto-icmp.h"       /* handle ICMP responses */
#include "masscan/src/proto-udp.h"        /* handle UDP responses */
#include "masscan/src/syn-cookie.h"       /* for SYN-cookies on send */
#include "masscan/src/output.h"           /* for outputing results */
#include "masscan/src/rte-ring.h"         /* producer/consumer ring buffer */
#include "masscan/src/rawsock-pcapfile.h" /* for saving pcap files w/ raw packets */
#include "masscan/src/smack.h"            /* Aho-corasick state-machine pattern-matcher */
#include "masscan/src/pixie-timer.h"      /* portable time functions */
#include "masscan/src/pixie-threads.h"    /* portable threads */
#include "masscan/src/templ-payloads.h"   /* UDP packet payloads */
#include "masscan/src/proto-snmp.h"       /* parse SNMP responses */
#include "masscan/src/proto-ntp.h"        /* parse NTP responses */
#include "masscan/src/templ-port.h"
#include "masscan/src/in-binary.h"    /* covert binary output to XML/JSON */
#include "masscan/src/main-globals.h" /* all the global variables in the program */
#include "masscan/src/proto-zeroaccess.h"
#include "masscan/src/siphash24.h"
#include "masscan/src/proto-x509.h"
#include "masscan/src/crypto-base64.h" /* base64 encode/decode */
#include "masscan/src/pixie-backtrace.h"
#include "masscan/src/proto-sctp.h"
#include "masscan/src/script.h"
#include "masscan/src/main-readrange.h"

/****************************************************************************
 * We create a pair of transmit/receive threads for each network adapter.
 * This structure contains the parameters we send to each pair.
 ***************************************************************************/
struct ThreadPair {
    /** This points to the central configuration. Note that it's 'const',
     * meaning that the thread cannot change the contents. That'd be
     * unsafe */
    const struct Masscan *masscan;

    /** The adapter used by the thread-pair. Normally, thread-pairs have
     * their own network adapter, especially when doing PF_RING
     * clustering. */
    struct Adapter *adapter;

    /**
     * The thread-pair use a "packet_buffer" and "transmit_queue" to
     * send packets to each other. That's because when doing things
     * like banner-checking, the receive-thread needs to respond to
     * things like syn-acks received from the target. However, the
     * receive-thread cannot transmit packets, so it uses this ring
     * in order to send the packets to the transmit thread for
     * transmission.
     */
    PACKET_QUEUE *packet_buffers;
    PACKET_QUEUE *transmit_queue;

    /**
     * The index of the network adapter that we are using for this
     * thread-pair. This is an index into the "masscan->nic[]"
     * array.
     *
     * NOTE: this is also the "thread-id", because we create one
     * transmit/receive thread pair per NIC.
     */
    unsigned nic_index;

    /**
     * This is an optimized binary-search when looking up IP addresses
     * based on the index. When scanning the entire Internet, the target
     * list is broken into thousands of subranges as we exclude certain
     * ranges. Doing a lookup for each IP address is slow, so this 'picker'
     * system speeds it up.
     */
    unsigned *picker;

    /**
     * A copy of the master 'index' variable. This is just advisory for
     * other threads, to tell them how far we've gotten.
     */
    volatile uint64_t my_index;


    /* This is used both by the transmit and receive thread for
     * formatting packets */
    struct TemplateSet tmplset[1];

    /**
     * The current IP address we are using for transmit/receive.
     */
    struct Source src;
    unsigned char adapter_mac[6];
    unsigned char router_mac[6];

    unsigned done_transmitting;
    unsigned done_receiving;

    double pt_start;

    struct Throttler throttler[1];

    uint64_t *total_synacks;
    uint64_t *total_tcbs;
    uint64_t *total_syns;

    size_t thread_handle_xmit;
    size_t thread_handle_recv;
};
}

class MasscanIpInfo
{
  public:
    std::string status;
    unsigned port;
    std::string protocol;
    std::string ip;
    MasscanIpInfo(const std::string &status, unsigned port, const std::string &protocol, const std::string &ip) : status(status),
                                                                                                                  port(port),
                                                                                                                  protocol(protocol),
                                                                                                                ip(ip) {}
};

class MasscanStats
{
  public:
    double rate;
    double percentDone;
    unsigned remainingHour;
    unsigned remainingMin;
    unsigned remainingSec;
    uint64_t found;

    MasscanStats(double rate, double percentDone, unsigned remainingHour, unsigned remainingMin, unsigned remainingSec, uint64_t found) : rate(rate),
                                                                                                                                          percentDone(percentDone),
                                                                                                                                          remainingHour(remainingHour),
                                                                                                                                          remainingMin(remainingMin),
                                                                                                                                          remainingSec(remainingSec),
                                                                                                                                          found(found)
    {
    }
};

template <typename Data>
class MasscanQueue
{
  public:
    MasscanQueue() {}

    void write(Data data)
    {
        while (true)
        {
            std::unique_lock<std::mutex> locker(_mu);
            _buffer.push_back(data);
            locker.unlock();
            _cond.notify_all();
            return;
        }
    }

    Data read()
    {
        while (true)
        {
            std::unique_lock<std::mutex> locker(_mu);
            _cond.wait(locker, [this]() { return _buffer.size() > 0; });
            Data back = _buffer.front();
            _buffer.pop_front();
            locker.unlock();
            _cond.notify_all();
            return back;
        }
    }

    void readAll(std::deque<Data> &target)
    {
        std::unique_lock<std::mutex> locker(_mu);
        std::copy(_buffer.begin(), _buffer.end(), std::back_inserter(target));
        _buffer.clear();
        locker.unlock();
    }

  private:
    std::mutex _mu;
    std::condition_variable _cond;
    std::deque<Data> _buffer;
};

class MasscanWorker : public Nan::AsyncProgressWorker
{
  public:
    MasscanWorker(Nan::Callback *progress, Nan::Callback *callback, Nan::Callback *error_callback, v8::Local<v8::Object> &options);
    ~MasscanWorker();

    void HandleErrorCallback();
    void HandleOKCallback();
    void HandleProgressCallback(const char *data, size_t size);

    void initialize();
    void Execute(const Nan::AsyncProgressWorker::ExecutionProgress &progress);
    void stop();

    MasscanQueue<MasscanStats> _stats;
    MasscanQueue<MasscanIpInfo> _ips;

    void emitIp(int status, unsigned ip, unsigned ip_proto, unsigned port, unsigned reason, unsigned ttl, const unsigned char mac[6]);
    void emitStats(const Nan::AsyncProgressWorker::ExecutionProgress &progress, struct Status *status, uint64_t count, uint64_t max_count, double x, uint64_t total_tcbs, uint64_t total_synacks, uint64_t total_syns, uint64_t exiting);

  protected:
    Nan::Callback *progress_callback;
    Nan::Callback *error_callback;
    Nan::Persistent<v8::Object> _options;
    bool _stopped = false;
    struct Masscan masscan[1];
    struct ThreadPair parms_array[8];
    uint64_t count_ips;
    uint64_t count_ports;
    uint64_t range;
    unsigned index;
    unsigned *picker;
    time_t now;
    uint64_t min_index;
    struct MassScript *script;

  private:
    void drainQueue();
};

#endif // __ADONE_MASSSCAN_H_
