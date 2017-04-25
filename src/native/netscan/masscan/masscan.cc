#include "masscan.h"

#if defined(WIN32)
#include <WinSock.h>
#if defined(_MSC_VER)
#pragma comment(lib, "Ws2_32.lib")
#endif
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#endif

extern "C" {

/*
 * yea I know globals suck
 */
MasscanWorker *active_worker;
unsigned control_c_pressed = 0;
static unsigned control_c_pressed_again = 0;
time_t global_now;

static unsigned hexval(char c)
{
    if ('0' <= c && c <= '9')
        return (unsigned)(c - '0');
    if ('a' <= c && c <= 'f')
        return (unsigned)(c - 'a' + 10);
    if ('A' <= c && c <= 'F')
        return (unsigned)(c - 'A' + 10);
    return 0xFF;
}

static int parse_mac_address(const char *text, unsigned char *mac)
{
    unsigned i;

    for (i = 0; i < 6; i++)
    {
        unsigned x;
        char c;

        while (isspace(*text & 0xFF) && ispunct(*text & 0xFF))
            text++;

        c = *text;
        if (!isxdigit(c & 0xFF))
            return -1;
        x = hexval(c) << 4;
        text++;

        c = *text;
        if (!isxdigit(c & 0xFF))
            return -1;
        x |= hexval(c);
        text++;

        mac[i] = (unsigned char)x;

        if (ispunct(*text & 0xFF))
            text++;
    }

    return 0;
}

/***************************************************************************
 * The receive thread doesn't transmit packets. Instead, it queues them
 * up on the transmit thread. Every so often, the transmit thread needs
 * to flush this transmit queue and send everything.
 *
 * This is an inherent design issue trying to send things as batches rather
 * than individually. It increases latency, but increases performance. We
 * don't really care about latency.
 ***************************************************************************/
static void flush_packets(struct Adapter *adapter,
                          PACKET_QUEUE *packet_buffers,
                          PACKET_QUEUE *transmit_queue,
                          uint64_t *packets_sent,
                          uint64_t *batchsize)
{
    /*
     * Send a batch of queued packets
     */
    for (; (*batchsize); (*batchsize)--)
    {
        int err;
        struct PacketBuffer *p;

        /*
         * Get the next packet from the transmit queue. This packet was
         * put there by a receive thread, and will contain things like
         * an ACK or an HTTP request
         */
        err = rte_ring_sc_dequeue(transmit_queue, (void **)&p);
        if (err)
        {
            break; /* queue is empty, nothing to send */
        }

        /*
         * Actually send the packet
         */
        rawsock_send_packet(adapter, p->px, (unsigned)p->length, 1);

        /*
         * Now that we are done with the packet, put it on the free list
         * of buffers that the transmit thread can reuse
         */
        for (err = 1; err;)
        {
            err = rte_ring_sp_enqueue(packet_buffers, p);
            if (err)
            {
                LOG(0, "transmit queue full (should be impossible)\n");
                pixie_usleep(10000);
            }
        }

        /*
         * Remember that we sent a packet, which will be used in
         * throttling.
         */
        (*packets_sent)++;
    }
}

/***************************************************************************
 * We support a range of source IP/port. This function converts that
 * range into useful variables we can use to pick things form that range.
 ***************************************************************************/
static void
get_sources(const struct Masscan *masscan,
            unsigned nic_index,
            unsigned *src_ip,
            unsigned *src_ip_mask,
            unsigned *src_port,
            unsigned *src_port_mask)
{
    const struct Source *src = &masscan->nic[nic_index].src;

    *src_ip = src->ip.first;
    *src_ip_mask = src->ip.last - src->ip.first;

    *src_port = src->port.first;
    *src_port_mask = src->port.last - src->port.first;
}

/***************************************************************************
 * This thread spews packets as fast as it can
 *
 *      THIS IS WHERE ALL THE EXCITEMENT HAPPENS!!!!
 *      90% of CPU cycles are in the function.
 *
 ***************************************************************************/
static void
transmit_thread(void *v) /*aka. scanning_thread() */
{
    struct ThreadPair *parms = (struct ThreadPair *)v;
    uint64_t i;
    uint64_t start;
    uint64_t end;
    const struct Masscan *masscan = parms->masscan;
    unsigned retries = masscan->retries;
    unsigned rate = (unsigned)masscan->max_rate;
    unsigned r = retries + 1;
    uint64_t range;
    struct BlackRock blackrock;
    uint64_t count_ips = rangelist_count(&masscan->targets);
    struct Throttler *throttler = parms->throttler;
    struct TemplateSet pkt_template = templ_copy(parms->tmplset);
    unsigned *picker = parms->picker;
    struct Adapter *adapter = parms->adapter;
    uint64_t packets_sent = 0;
    unsigned increment = (masscan->shard.of - 1) + masscan->nic_count;
    unsigned src_ip;
    unsigned src_ip_mask;
    unsigned src_port;
    unsigned src_port_mask;
    uint64_t seed = masscan->seed;
    uint64_t repeats = 0; /* --infinite repeats */
    uint64_t *status_syn_count;
    uint64_t entropy = masscan->seed;

    LOG(1, "xmit: starting transmit thread #%u\n", parms->nic_index);

    /* export a pointer to this variable outside this threads so
     * that the 'status' system can print the rate of syns we are
     * sending */
    status_syn_count = (uint64_t *)malloc(sizeof(uint64_t));
    *status_syn_count = 0;
    parms->total_syns = status_syn_count;

    /* Normally, we have just one source address. In special cases, though
     * we can have multiple. */
    get_sources(masscan, parms->nic_index,
                &src_ip, &src_ip_mask,
                &src_port, &src_port_mask);

    /* "THROTTLER" rate-limits how fast we transmit, set with the
     * --max-rate parameter */
    throttler_start(throttler, masscan->max_rate / masscan->nic_count);

infinite:

    /* Create the shuffler/randomizer. This creates the 'range' variable,
     * which is simply the number of IP addresses times the number of
     * ports */
    range = rangelist_count(&masscan->targets) * rangelist_count(&masscan->ports);
    blackrock_init(&blackrock, range, seed, masscan->blackrock_rounds);

    /* Calculate the 'start' and 'end' of a scan. One reason to do this is
     * to support --shard, so that multiple machines can co-operate on
     * the same scan. Another reason to do this is so that we can bleed
     * a little bit past the end when we have --retries. Yet another
     * thing to do here is deal with multiple network adapters, which
     * is essentially the same logic as shards. */
    start = masscan->resume.index + (masscan->shard.one - 1) + parms->nic_index;
    end = range;
    if (masscan->resume.count && end > start + masscan->resume.count)
        end = start + masscan->resume.count;
    end += retries * rate;

    /* -----------------
     * the main loop
     * -----------------*/
    LOG(3, "xmit: starting main loop: [%llu..%llu]\n", start, end);
    for (i = start; i < end;)
    {
        uint64_t batch_size;

        /*
         * Do a batch of many packets at a time. That because per-packet
         * throttling is expensive at 10-million pps, so we reduce the
         * per-packet cost by doing batches. At slower rates, the batch
         * size will always be one. (--max-rate)
         */
        batch_size = throttler_next_batch(throttler, packets_sent);

        /*
         * Transmit packets from other thread, when doing --banners. This
         * takes priority over sending SYN packets. If there is so much
         * activity grabbing banners that we cannot transmit more SYN packets,
         * then "batch_size" will get decremented to zero, and we won't be
         * able to transmit SYN packets.
         */
        flush_packets(adapter, parms->packet_buffers, parms->transmit_queue,
                      &packets_sent, &batch_size);

        /*
         * Transmit a bunch of packets. At any rate slower than 100,000
         * packets/second, the 'batch_size' is likely to be 1
         */
        while (batch_size && i < end)
        {
            uint64_t xXx;
            unsigned ip_them;
            unsigned port_them;
            unsigned ip_me;
            unsigned port_me;
            uint64_t cookie;

            /*
             * RANDOMIZE THE TARGET:
             *  This is kinda a tricky bit that picks a random IP and port
             *  number in order to scan. We monotonically increment the
             *  index 'i' from [0..range]. We then shuffle (randomly transmog)
             *  that index into some other, but unique/1-to-1, number in the
             *  same range. That way we visit all targets, but in a random
             *  order. Then, once we've shuffled the index, we "pick" the
             *  IP address and port that the index refers to.
             */
            xXx = (i + (r--) * rate);
            if (rate > range)
                xXx %= range;
            else
                while (xXx >= range)
                    xXx -= range;
            xXx = blackrock_shuffle(&blackrock, xXx);
            ip_them = rangelist_pick2(&masscan->targets, xXx % count_ips, picker);
            port_them = rangelist_pick(&masscan->ports, xXx / count_ips);

            /*
             * SYN-COOKIE LOGIC
             *  Figure out the source IP/port, and the SYN cookie
             */
            if (src_ip_mask > 1 || src_port_mask > 1)
            {
                uint64_t ck = syn_cookie((unsigned)(i + repeats),
                                         (unsigned)((i + repeats) >> 32),
                                         (unsigned)xXx, (unsigned)(xXx >> 32),
                                         entropy);
                port_me = src_port + (ck & src_port_mask);
                ip_me = src_ip + ((ck >> 16) & src_ip_mask);
            }
            else
            {
                ip_me = src_ip;
                port_me = src_port;
            }
            cookie = syn_cookie(ip_them, port_them, ip_me, port_me, entropy);
            //printf("0x%08x 0x%08x 0x%04x 0x%08x 0x%04x    \n", cookie, ip_them, port_them, ip_me, port_me);
            /*
             * SEND THE PROBE
             *  This is sorta the entire point of the program, but little
             *  exciting happens here. The thing to note that this may
             *  be a "raw" transmit that bypasses the kernel, meaning
             *  we can call this function millions of times a second.
             */
            rawsock_send_probe(
                adapter,
                ip_them, port_them,
                ip_me, port_me,
                (unsigned)cookie,
                !batch_size, /* flush queue on last packet in batch */
                &pkt_template);
            batch_size--;
            packets_sent++;
            (*status_syn_count)++;

            /*
             * SEQUENTIALLY INCREMENT THROUGH THE RANGE
             *  Yea, I know this is a puny 'i++' here, but it's a core feature
             *  of the system that is linearly increments through the range,
             *  but produces from that a shuffled sequence of targets (as
             *  described above). Because we are linearly incrementing this
             *  number, we can do lots of creative stuff, like doing clever
             *  retransmits and sharding.
             */
            if (r == 0)
            {
                i += increment; /* <------ increment by 1 normally, more with shards/nics */
                r = retries + 1;
            }

        } /* end of batch */

        /* save our current location for resuming, if the user pressed
         * <ctrl-c> to exit early */
        parms->my_index = i;

        /* If the user pressed <ctrl-c>, then we need to exit. but, in case
         * the user wants to --resume the scan later, we save the current
         * state in a file */
        if (control_c_pressed)
        {
            break;
        }
    }

    /*
     * --infinite
     *  For load testing, go around and do this again
     */
    if (masscan->is_infinite && !control_c_pressed)
    {
        seed++;
        repeats++;
        goto infinite;
    }

    /*
     * Flush any untransmitted packets. High-speed mechanisms like Windows
     * "sendq" and Linux's "PF_RING" queue packets and transmit many together,
     * so there may be some packets that we've queueud but not yet transmitted.
     * This call makes sure they are transmitted.
     */
    rawsock_flush(adapter);

    /*
     * Wait until the receive thread realizes the scan is over
     */
    LOG(1, "Transmit thread done, waiting for receive thread to realize this\n");
    while (!control_c_pressed)
        pixie_usleep(1000);

    /*
     * We are done transmitting. However, response packets will take several
     * seconds to arrive. Therefore, sit in short loop waiting for those
     * packets to arrive. Pressing <ctrl-c> a second time will exit this
     * prematurely.
     */
    while (!control_c_pressed_again)
    {
        unsigned k;
        uint64_t batch_size;

        for (k = 0; k < 1000; k++)
        {
            /*
             * Only send a few packets at a time, throttled according to the max
             * --max-rate set by the user
             */
            batch_size = throttler_next_batch(throttler, packets_sent);

            /* Transmit packets from the receive thread */
            flush_packets(adapter,
                          parms->packet_buffers,
                          parms->transmit_queue,
                          &packets_sent,
                          &batch_size);

            /* Make sure they've actually been transmitted, not just queued up for
             * transmit */
            rawsock_flush(adapter);

            pixie_usleep(100);
        }
    }

    /* Thread is about to exit */
    parms->done_transmitting = 1;
    LOG(1, "xmit: stopping transmit thread #%u\n", parms->nic_index);
}

/***************************************************************************
 ***************************************************************************/
static unsigned
is_nic_port(const struct Masscan *masscan, unsigned ip)
{
    unsigned i;
    for (i = 0; i < masscan->nic_count; i++)
        if (is_my_port(&masscan->nic[i].src, ip))
            return 1;
    return 0;
}

/***************************************************************************
 *
 * Asynchronous receive thread
 *
 * The transmit and receive threads run independently of each other. There
 * is no record what was transmitted. Instead, the transmit thread sets a
 * "SYN-cookie" in transmitted packets, which the receive thread will then
 * use to match up requests with responses.
 ***************************************************************************/
static void
receive_thread(void *v)
{
    struct ThreadPair *parms = (struct ThreadPair *)v;
    const struct Masscan *masscan = parms->masscan;
    struct Adapter *adapter = parms->adapter;
    int data_link = rawsock_datalink(adapter);
    struct Output *out;
    struct DedupTable *dedup;
    struct PcapFile *pcapfile = NULL;
    struct TCP_ConnectionTable *tcpcon = 0;
    uint64_t *status_synack_count;
    uint64_t *status_tcb_count;
    uint64_t entropy = masscan->seed;

    /* some status variables */
    status_synack_count = (uint64_t *)malloc(sizeof(uint64_t));
    *status_synack_count = 0;
    parms->total_synacks = status_synack_count;

    status_tcb_count = (uint64_t *)malloc(sizeof(uint64_t));
    *status_tcb_count = 0;
    parms->total_tcbs = status_tcb_count;

    LOG(1, "recv: start receive thread #%u\n", parms->nic_index);

    /* Lock this thread to a CPU. Transmit threads are on even CPUs,
     * receive threads on odd CPUs */
    if (pixie_cpu_get_count() > 1)
    {
        unsigned cpu_count = pixie_cpu_get_count();
        unsigned cpu = parms->nic_index * 2 + 1;
        while (cpu >= cpu_count)
        {
            cpu -= cpu_count;
            cpu++;
        }
        //TODO:
        //pixie_cpu_set_affinity(cpu);
    }

    /*
     * If configured, open a --pcap file for saving raw packets. This is
     * so that we can debug scans, but also so that we can look at the
     * strange things people send us. Note that we don't record transmitted
     * packets, just the packets we've received.
     */
    if (masscan->pcap_filename[0])
    {
        pcapfile = pcapfile_openwrite(masscan->pcap_filename, 1);
    }

    /*
     * Open output. This is where results are reported when saving
     * the --output-format to the --output-filename
     */
    out = output_create(masscan, parms->nic_index);

    /*
     * Create deduplication table. This is so when somebody sends us
     * multiple responses, we only record the first one.
     */
    dedup = dedup_create();

    /*
     * Create a TCP connection table for interacting with live
     * connections when doing --banners
     */
    if (masscan->is_banners)
    {
        struct TcpCfgPayloads *pay;

        tcpcon = tcpcon_create_table(
            (size_t)((masscan->max_rate / 5) / masscan->nic_count),
            parms->transmit_queue,
            parms->packet_buffers,
            &parms->tmplset->pkts[Proto_TCP],
            output_report_banner,
            out,
            masscan->tcb.timeout,
            masscan->seed);
        tcpcon_set_banner_flags(tcpcon,
                                masscan->is_capture_cert,
                                masscan->is_capture_html,
                                masscan->is_capture_heartbleed);
        if (masscan->http_user_agent_length)
            tcpcon_set_parameter(tcpcon,
                                 "http-user-agent",
                                 masscan->http_user_agent_length,
                                 masscan->http_user_agent);
        if (masscan->is_heartbleed)
            tcpcon_set_parameter(tcpcon,
                                 "heartbleed",
                                 1,
                                 "1");
        if (masscan->is_poodle_sslv3)
            tcpcon_set_parameter(tcpcon,
                                 "sslv3",
                                 1,
                                 "1");
        if (masscan->tcp_connection_timeout)
        {
            char foo[64];
            sprintf_s(foo, sizeof(foo), "%u", masscan->tcp_connection_timeout);
            tcpcon_set_parameter(tcpcon,
                                 "timeout",
                                 strlen(foo),
                                 foo);
        }
        if (masscan->tcp_hello_timeout)
        {
            char foo[64];
            sprintf_s(foo, sizeof(foo), "%u", masscan->tcp_connection_timeout);
            tcpcon_set_parameter(tcpcon,
                                 "hello-timeout",
                                 strlen(foo),
                                 foo);
        }

        for (pay = masscan->tcp_payloads; pay; pay = pay->next)
        {
            char name[64];
            sprintf_s(name, sizeof(name), "hello-string[%u]", pay->port);
            tcpcon_set_parameter(tcpcon,
                                 name,
                                 strlen(pay->payload_base64),
                                 pay->payload_base64);
        }
    }

    /*
     * In "offline" mode, we don't have any receive threads, so simply
     * wait until transmitter thread is done then go to the end
     */
    if (masscan->is_offline)
    {
        while (!control_c_pressed_again)
            pixie_usleep(10000);
        parms->done_receiving = 1;
        goto end;
    }

    /*
     * Receive packets. This is where we catch any responses and print
     * them to the terminal.
     */
    LOG(1, "begin receive thread\n");
    while (!control_c_pressed_again)
    {
        int status;
        unsigned length;
        unsigned secs;
        unsigned usecs;
        const unsigned char *px;
        int err;
        unsigned x;
        struct PreprocessedInfo parsed;
        unsigned ip_me;
        unsigned port_me;
        unsigned ip_them;
        unsigned port_them;
        unsigned seqno_me;
        unsigned seqno_them;
        unsigned cookie;

        /*
         * RECEIVE
         *
         * This is the boring part of actually receiving a packet
         */
        err = rawsock_recv_packet(
            adapter,
            &length,
            &secs,
            &usecs,
            &px);

        if (err != 0)
        {
            if (tcpcon)
                tcpcon_timeouts(tcpcon, (unsigned)time(0), 0);
            continue;
        }

        /*
         * Do any TCP event timeouts based on the current timestamp from
         * the packet. For example, if the connection has been open for
         * around 10 seconds, we'll close the connection. (--banners)
         */
        if (tcpcon)
        {
            tcpcon_timeouts(tcpcon, secs, usecs);
        }

        if (length > 1514)
            continue;

        /*
         * "Preprocess" the response packet. This means to go through and
         * figure out where the TCP/IP headers are and the locations of
         * some fields, like IP address and port numbers.
         */
        x = preprocess_frame(px, length, data_link, &parsed);
        if (!x)
            continue; /* corrupt packet */
        ip_me = parsed.ip_dst[0] << 24 | parsed.ip_dst[1] << 16 | parsed.ip_dst[2] << 8 | parsed.ip_dst[3] << 0;
        ip_them = parsed.ip_src[0] << 24 | parsed.ip_src[1] << 16 | parsed.ip_src[2] << 8 | parsed.ip_src[3] << 0;
        port_me = parsed.port_dst;
        port_them = parsed.port_src;
        seqno_them = TCP_SEQNO(px, parsed.transport_offset);
        seqno_me = TCP_ACKNO(px, parsed.transport_offset);

        switch (parsed.ip_protocol)
        {
        case 132: /* SCTP */
            cookie = syn_cookie(ip_them, port_them | (Proto_SCTP << 16), ip_me, port_me, entropy) & 0xFFFFFFFF;
            break;
        default:
            cookie = syn_cookie(ip_them, port_them, ip_me, port_me, entropy) & 0xFFFFFFFF;
        }

        /* verify: my IP address */
        if (!is_my_ip(&parms->src, ip_me))
            continue;
        //printf("0x%08x 0x%08x 0x%04x 0x%08x 0x%04x    \n", cookie, ip_them, port_them, ip_me, port_me);

        /*
         * Handle non-TCP protocols
         */
        switch (parsed.found)
        {
        case FOUND_ARP:
            LOGip(2, ip_them, 0, "-> ARP [%u] \n", px[parsed.found_offset]);
            switch (px[parsed.found_offset + 6] << 8 | px[parsed.found_offset + 7])
            {
            case 1: /* request */
                /* This function will transmit a "reply" to somebody's ARP request
                     * for our IP address (as part of our user-mode TCP/IP).
                     * Since we completely bypass the TCP/IP stack, we  have to handle ARPs
                     * ourself, or the router will lose track of us.*/
                arp_response(ip_me,
                             parms->adapter_mac,
                             px, length,
                             parms->packet_buffers,
                             parms->transmit_queue);
                break;
            case 2: /* response */
                /* This is for "arp scan" mode, where we are ARPing targets rather
                     * than port scanning them */

                /* If we aren't doing an ARP scan, then ignore ARP responses */
                if (!masscan->is_arp)
                    break;

                /* If this response isn't in our range, then ignore it */
                if (!rangelist_is_contains(&masscan->targets, ip_them))
                    break;

                /* Ignore duplicates */
                if (dedup_is_duplicate(dedup, ip_them, 0, ip_me, 0))
                    continue;

                /* ...everything good, so now report this response */
                handle_arp(out, secs, px, length, &parsed);
                break;
            }
            continue;
        case FOUND_UDP:
        case FOUND_DNS:
            if (!is_nic_port(masscan, port_me))
                continue;
            if (parms->masscan->nmap.packet_trace)
                packet_trace(stdout, parms->pt_start, px, length, 0);
            handle_udp(out, secs, px, length, &parsed, entropy);
            continue;
        case FOUND_ICMP:
            handle_icmp(out, secs, px, length, &parsed, entropy);
            continue;
        case FOUND_SCTP:
            handle_sctp(out, secs, px, length, cookie, &parsed, entropy);
            break;
        case FOUND_TCP:
            /* fall down to below */
            break;
        default:
            continue;
        }

        /* verify: my port number */
        if (!is_my_port(&parms->src, port_me))
            continue;
        if (parms->masscan->nmap.packet_trace)
            packet_trace(stdout, parms->pt_start, px, length, 0);

        /* Save raw packet in --pcap file */
        if (pcapfile)
        {
            pcapfile_writeframe(
                pcapfile,
                px,
                length,
                length,
                secs,
                usecs);
        }

        {
            char buf[64];
            LOGip(5, ip_them, port_them, "-> TCP ackno=0x%08x flags=0x%02x(%s)\n",
                  seqno_me,
                  TCP_FLAGS(px, parsed.transport_offset),
                  reason_string(TCP_FLAGS(px, parsed.transport_offset), buf, sizeof(buf)));
        }

        /* If recording --banners, create a new "TCP Control Block (TCB)" */
        if (tcpcon)
        {
            struct TCP_Control_Block *tcb;

            /* does a TCB already exist for this connection? */
            tcb = tcpcon_lookup_tcb(tcpcon,
                                    ip_me, ip_them,
                                    port_me, port_them);

            if (TCP_IS_SYNACK(px, parsed.transport_offset))
            {
                if (cookie != seqno_me - 1)
                {
                    LOG(2, "%u.%u.%u.%u - bad cookie: ackno=0x%08x expected=0x%08x\n",
                        (ip_them >> 24) & 0xff, (ip_them >> 16) & 0xff, (ip_them >> 8) & 0xff, (ip_them >> 0) & 0xff,
                        seqno_me - 1, cookie);
                    continue;
                }

                if (tcb == NULL)
                {
                    tcb = tcpcon_create_tcb(tcpcon,
                                            ip_me, ip_them,
                                            port_me, port_them,
                                            seqno_me, seqno_them + 1,
                                            parsed.ip_ttl);
                    (*status_tcb_count)++;
                }

                tcpcon_handle(tcpcon, tcb, TCP_WHAT_SYNACK,
                              0, 0, secs, usecs, seqno_them + 1);
            }
            else if (tcb)
            {
                /* If this is an ACK, then handle that first */
                if (TCP_IS_ACK(px, parsed.transport_offset))
                {
                    tcpcon_handle(tcpcon, tcb, TCP_WHAT_ACK,
                                  0, seqno_me, secs, usecs, seqno_them);
                }

                /* If this contains payload, handle that */
                if (parsed.app_length)
                {
                    tcpcon_handle(tcpcon, tcb, TCP_WHAT_DATA,
                                  px + parsed.app_offset, parsed.app_length,
                                  secs, usecs, seqno_them);
                }

                /* If this is a FIN, handle that. Note that ACK +
                 * payload + FIN can come together */
                if (TCP_IS_FIN(px, parsed.transport_offset) && !TCP_IS_RST(px, parsed.transport_offset))
                {
                    tcpcon_handle(tcpcon, tcb, TCP_WHAT_FIN,
                                  0, parsed.app_length, secs, usecs, seqno_them);
                }

                /* If this is a RST, then we'll be closing the connection */
                if (TCP_IS_RST(px, parsed.transport_offset))
                {
                    tcpcon_handle(tcpcon, tcb, TCP_WHAT_RST,
                                  0, 0, secs, usecs, seqno_them);
                }
            }
            else if (TCP_IS_FIN(px, parsed.transport_offset))
            {
                /*
                 * NO TCB!
                 *  This happens when we've sent a FIN, deleted our connection,
                 *  but the other side didn't get the packet.
                 */
                if (!TCP_IS_RST(px, parsed.transport_offset))
                    tcpcon_send_FIN(
                        tcpcon,
                        ip_me, ip_them,
                        port_me, port_them,
                        seqno_them, seqno_me);
            }
        }

        if (TCP_IS_SYNACK(px, parsed.transport_offset) || TCP_IS_RST(px, parsed.transport_offset))
        {

            /* figure out the status */
            status = PortStatus_Unknown;
            if (TCP_IS_SYNACK(px, parsed.transport_offset))
                status = PortStatus_Open;
            if (TCP_IS_RST(px, parsed.transport_offset))
            {
                status = PortStatus_Closed;
            }

            /* verify: syn-cookies */
            if (cookie != seqno_me - 1)
            {
                LOG(5, "%u.%u.%u.%u - bad cookie: ackno=0x%08x expected=0x%08x\n",
                    (ip_them >> 24) & 0xff, (ip_them >> 16) & 0xff,
                    (ip_them >> 8) & 0xff, (ip_them >> 0) & 0xff,
                    seqno_me - 1, cookie);
                continue;
            }

            /* verify: ignore duplicates */
            if (dedup_is_duplicate(dedup, ip_them, port_them, ip_me, port_me))
                continue;

            if (TCP_IS_SYNACK(px, parsed.transport_offset))
                (*status_synack_count)++;

            /*
             * This is where we do the output
             */
            // output_report_status(
            //     out,
            //     global_now,
            //     status,
            //     ip_them,
            //     6, /* ip proto = tcp */
            //     port_them,
            //     px[parsed.transport_offset + 13], /* tcp flags */
            //     parsed.ip_ttl,
            //     parsed.mac_src);
            active_worker->emitIp(status,
                                  ip_them,
                                  6, /* ip proto = tcp */
                                  port_them,
                                  px[parsed.transport_offset + 13], /* tcp flags */
                                  parsed.ip_ttl,
                                  parsed.mac_src);

            /*
             * Send RST so other side isn't left hanging (only doing this in
             * complete stateless mode where we aren't tracking banners)
             */
            if (tcpcon == NULL)
                tcp_send_RST(
                    &parms->tmplset->pkts[Proto_TCP],
                    parms->packet_buffers,
                    parms->transmit_queue,
                    ip_them, ip_me,
                    port_them, port_me,
                    0, seqno_me);
        }
    }

    LOG(1, "recv: end receive thread #%u\n", parms->nic_index);

/*
     * cleanup
     */
end:
    if (tcpcon)
        tcpcon_destroy_table(tcpcon);
    dedup_destroy(dedup);
    output_destroy(out);
    if (pcapfile)
        pcapfile_close(pcapfile);

    for (;;)
    {
        void *p;
        int err;
        err = rte_ring_sc_dequeue(parms->packet_buffers, (void **)&p);
        if (err == 0)
            free(p);
        else
            break;
    }

    /* Thread is about to exit */
    parms->done_receiving = 1;
}
}

MasscanWorker::MasscanWorker(Nan::Callback *progress, Nan::Callback *callback, Nan::Callback *error_callback, v8::Local<v8::Object> &options) : Nan::AsyncProgressWorker(callback),
                                                                                                                                                progress_callback(progress),
                                                                                                                                                error_callback(error_callback)
{
    _stopped = false;
    _options.Reset(options);
}

MasscanWorker::~MasscanWorker() {}

void MasscanWorker::HandleErrorCallback()
{
    Nan::HandleScope scope;

    v8::Local<v8::Value> argv[] = {
        v8::Exception::Error(Nan::New<v8::String>(ErrorMessage()).ToLocalChecked())};
    error_callback->Call(1, argv);
}

void MasscanWorker::HandleOKCallback()
{
    drainQueue();
    callback->Call(0, NULL);
}

void MasscanWorker::HandleProgressCallback(const char *data, size_t size)
{
    drainQueue();
}

void MasscanWorker::initialize()
{
    Nan::HandleScope scope;

    global_now = time(0);

    v8::Local<v8::Object> opt = Nan::New<v8::Object>(_options);

    /* Set system to report debug information on crash */
    // pixie_backtrace_init(argv[0]);

    /*
        * Initialize those defaults that aren't zero
        */
    memset(masscan, 0, sizeof(*masscan));
    masscan->blackrock_rounds = 4;
    masscan->output.is_show_open = 1; /* default: show syn-ack, not rst */
    masscan->seed = get_entropy();    /* entropy for randomness */
    masscan->wait = 10;               /* how long to wait for responses when done */
    masscan->max_rate = 100.0;        /* max rate = hundred packets-per-second */
    masscan->nic_count = 1;
    masscan->shard.one = 1;
    masscan->shard.of = 1;
    masscan->min_packet_size = 60;
    masscan->payloads = payloads_create();
    strcpy_s(masscan->output.rotate.directory, sizeof(masscan->output.rotate.directory), ".");
    masscan->is_capture_cert = 1;

    // Interface/adapter name
    v8::Local<v8::String> ifnameStr = NanStr("ifname");
    if (opt->Has(ifnameStr))
    {
        v8::Handle<v8::Value> value = opt->Get(ifnameStr);
        sprintf_s(masscan->nic[0].ifname, sizeof(masscan->nic[0].ifname), "%s", *v8::String::Utf8Value(value->ToString()));
    }

    // Gateway MAC
    v8::Local<v8::String> gatewayStr = NanStr("gateway");
    if (opt->Has(gatewayStr))
    {
        v8::Handle<v8::Value> value = opt->Get(gatewayStr);
        unsigned char mac[6];
        if (parse_mac_address(*v8::String::Utf8Value(value->ToString()), mac) != 0)
        {
            Nan::ThrowTypeError("Gateway is invalid 2");
            this->Destroy();
            return;
        }

        memcpy(masscan->nic[0].router_mac, mac, 6);
    }

    // port ranges
    struct Range portRange;
    v8::Local<v8::String> portRangeStr = NanStr("range");
    if (opt->Has(portRangeStr))
    {
        Handle<v8::Array> value = v8::Local<v8::Array>::Cast(opt->Get(portRangeStr));

        if (!value->IsArray())
        {
            Nan::ThrowTypeError("Array expected for range param");
            this->Destroy();
            return;
        }

        for (uint32_t i = 0; i < value->Length(); ++i)
        {
            const Local<Value> item = value->Get(i);

            unsigned offset = 0;
            unsigned max_offset = (unsigned)strlen(*v8::String::Utf8Value(item->ToString()));

            portRange = range_parse_ipv4(*v8::String::Utf8Value(item->ToString()), &offset, max_offset);
            if (portRange.end < portRange.begin)
            {
                Nan::ThrowTypeError("Range end cannot be greater than range begin");
                this->Destroy();
                return;
            }

            rangelist_add_range(&masscan->targets, portRange.begin, portRange.end);
        }
    }

    // Ports
    unsigned isError = 0;
    v8::Local<v8::String> portsStr = NanStr("ports");
    if (opt->Has(portsStr))
    {
        Handle<v8::Value> value = opt->Get(portsStr);
        rangelist_parse_ports(&masscan->ports, *v8::String::Utf8Value(value->ToString()), &isError);
    }
    else
    {
        rangelist_parse_ports(&masscan->ports, "1-1024", &isError);
    }

    if (isError != 0)
    {
        Nan::ThrowTypeError("Invalid ports");
        this->Destroy();
        return;
    }

    // Exclude ranges
    struct Range excludeRange;
    v8::Local<v8::String> excludeStr = NanStr("exclude");
    if (opt->Has(excludeStr))
    {
        Handle<v8::Array> value = v8::Local<v8::Array>::Cast(opt->Get(excludeStr));

        if (!value->IsArray())
        {
            Nan::ThrowTypeError("Array expected for exclude param");
            this->Destroy();
            return;
        }

        for (uint32_t i = 0; i < value->Length(); ++i)
        {
            const Local<Value> item = value->Get(i);

            unsigned offset = 0;
            unsigned max_offset = (unsigned)strlen(*v8::String::Utf8Value(item->ToString()));

            excludeRange = range_parse_ipv4(*v8::String::Utf8Value(item->ToString()), &offset, max_offset);
            if (excludeRange.end < excludeRange.begin)
            {
                Nan::ThrowTypeError("Range begin cannot be greater than range end");
                this->Destroy();
                return;
            }

            rangelist_add_range(&masscan->exclude_ip, excludeRange.begin, excludeRange.end);
        }
    }
    else
    {
        excludeRange = range_parse_ipv4("0.0.0.0/0", 0, strlen("0.0.0.0/0"));

        if (excludeRange.end < excludeRange.begin)
        {
            Nan::ThrowTypeError("Range begin cannot be greater than range end");
            this->Destroy();
            return;
        }

        rangelist_add_range(&masscan->exclude_ip, excludeRange.begin, excludeRange.end);
    }

    // Exclude ports
    v8::Local<v8::String> excludePorts = NanStr("excludeports");
    if (opt->Has(excludePorts))
    {
        Handle<v8::Value> value = opt->Get(excludePorts);
        rangelist_parse_ports(&masscan->exclude_port, *v8::String::Utf8Value(value->ToString()), &isError);

        if (isError != 0)
        {
            Nan::ThrowTypeError("Invalid exclude ports");
            this->Destroy();
            return;
        }
    }

    rangelist_exclude(&masscan->targets, &masscan->exclude_ip);
    rangelist_exclude(&masscan->ports, &masscan->exclude_port);

// Scan

#if defined(WIN32)
    {
        WSADATA x;
        WSAStartup(0x101, &x);
    }
#endif

    // /*
    //      * On non-Windows systems, read the defaults from the file in
    //      * the /etc directory. These defaults will contain things
    //      * like the output directory, max packet rates, and so on. Most
    //      * importantly, the master "--excludefile" might be placed here,
    //      * so that blacklisted ranges won't be scanned, even if the user
    //      * makes a mistake
    //      */
    // #if !defined(WIN32)
    //         if (!masscan->is_readscan)
    //         {
    //             if (access("/etc/masscan/masscan.conf", 0) == 0)
    //             {
    //                 masscan_read_config_file(masscan, "/etc/masscan/masscan.conf");
    //             }
    //         }
    // #endif

    /* We need to do a separate "raw socket" initialization step. This is
                 * for Windows and PF_RING. */
    rawsock_init();

    /* Init some protocol parser data structures */
    snmp_init();
    x509_init();

    /*
        * Apply excludes. People ask us not to scan them, so we maintain a list
        * of their ranges, and when doing wide scans, add the exclude list to
        * prevent them from being scanned.
        */
    {
        uint64_t range = rangelist_count(&masscan->targets) * rangelist_count(&masscan->ports);
        uint64_t range2;
        rangelist_exclude(&masscan->targets, &masscan->exclude_ip);
        rangelist_exclude(&masscan->ports, &masscan->exclude_port);
        //rangelist_remove_range2(&masscan->targets, range_parse_ipv4("224.0.0.0/4", 0, 0));

        range2 = rangelist_count(&masscan->targets) * rangelist_count(&masscan->ports);

        if (range != 0 && range2 == 0)
        {
            Nan::ThrowError("No ranges left to scan... All ranges overlapped something in an excludefile range");
            this->Destroy();
            return;
        }

        if (range2 != range && masscan->resume.index)
        {
            Nan::ThrowError("Attempted to add additional 'exclude' ranges after scan start. This messes things up the scan randomization, so you have to restart scan");
            this->Destroy();
            return;
        }
    }

    now = time(0);
    min_index = UINT64_MAX;
    script = NULL;
    memset(parms_array, 0, sizeof(parms_array));

    /*
    * Script initialization
    */
    if (masscan->script.name)
    {
        unsigned i;
        script = script_lookup(masscan->script.name);

        /* If no ports specified on command-line, grab default ports */
        if (rangelist_count(&masscan->ports) == 0)
        {
            rangelist_parse_ports(&masscan->ports, script->ports, 0);
        }

        /* Kludge: change normal port range to script range */
        for (i = 0; i < masscan->ports.count; i++)
        {
            struct Range *r = &masscan->ports.list[i];
            r->begin = (r->begin & 0xFFFF) | Templ_Script;
        }
    }

    /*
        * Initialize the task size
        */
    count_ips = rangelist_count(&masscan->targets);
    if (count_ips == 0)
    {
        Nan::ThrowError("Target IP address list empty");
        this->Destroy();
        return;
    }
    count_ports = rangelist_count(&masscan->ports);
    if (count_ports == 0)
    {
        Nan::ThrowError("No ports were specified");
        this->Destroy();
        return;
    }
    range = count_ips * count_ports + (uint64_t)(masscan->retries * masscan->max_rate);

    /*
        * If doing an ARP scan, then don't allow port scanning
        */
    if (rangelist_is_contains(&masscan->ports, Templ_ARP))
    {
        if (masscan->ports.count != 1)
        {
            Nan::ThrowError("Cannot arpscan and portscan at the same time");
            this->Destroy();
            return;
        }
    }

    /*
        * If the IP address range is very big, then require that that the
        * user apply an exclude range
        */
    if (count_ips > 1000000000ULL && rangelist_count(&masscan->exclude_ip) == 0)
    {
        Nan::ThrowError("Range too big, need confirmation");
        this->Destroy();
        return;
    }

    /*
        * trim the nmap UDP payloads down to only those ports we are using. This
        * makes lookups faster at high packet rates.
        */
    payloads_trim(masscan->payloads, &masscan->ports);

    /* Optimize target selection so it's a quick binary search instead
        * of walking large memory tables. When we scan the entire Internet
        * our --excludefile will chop up our pristine 0.0.0.0/0 range into
        * hundreds of subranges. This scans through them faster. */
    picker = rangelist_pick2_create(&masscan->targets);

    /*
        * Start scanning threats for each adapter
        */
    for (index = 0; index < masscan->nic_count; index++)
    {
        struct ThreadPair *parms = &parms_array[index];
        int err;

        parms->masscan = masscan;
        parms->nic_index = index;
        parms->picker = picker;
        parms->my_index = masscan->resume.index;
        parms->done_transmitting = 0;
        parms->done_receiving = 0;

        /* needed for --packet-trace option so that we know when we started
            * the scan */
        parms->pt_start = 1.0 * pixie_gettime() / 1000000.0;

        /*
            * Turn the adapter on, and get the running configuration
            */
        err = masscan_initialize_adapter(masscan, index, parms->adapter_mac, parms->router_mac);
        if (err != 0)
        {
            Nan::ThrowError("Failed to initialize adapter");
            this->Destroy();
            return;
        }
        parms->adapter = masscan->nic[index].adapter;
        if (masscan->nic[index].src.ip.range == 0)
        {
            Nan::ThrowError("Failed to detect IP of interface");
            this->Destroy();
            return;
        }

        /*
            * Initialize the TCP packet template. The way this works is that
            * we parse an existing TCP packet, and use that as the template for
            * scanning. Then, we adjust the template with additional features,
            * such as the IP address and so on.
            */
        parms->tmplset->script = script;
        template_packet_init(parms->tmplset, parms->adapter_mac, parms->router_mac, masscan->payloads, rawsock_datalink(masscan->nic[index].adapter), masscan->seed);

        /*
            * Set the "source port" of everything we transmit.
            */
        if (masscan->nic[index].src.port.range == 0)
        {
            unsigned port = 40000 + now % 20000;
            masscan->nic[index].src.port.first = port;
            masscan->nic[index].src.port.last = port;
            masscan->nic[index].src.port.range = 1;
        }

        parms->src = masscan->nic[index].src;

        /*
            * Set the "TTL" (IP time-to-live) of everything we send.
            */
        if (masscan->nmap.ttl)
        {
            template_set_ttl(parms->tmplset, masscan->nmap.ttl);
        }

        if (masscan->nic[0].is_vlan)
        {
            template_set_vlan(parms->tmplset, masscan->nic[0].vlan_id);
        }

/*
            * Allocate packet buffers for sending
            */
#define BUFFER_COUNT 16384
        parms->packet_buffers = rte_ring_create(BUFFER_COUNT, RING_F_SP_ENQ | RING_F_SC_DEQ);
        parms->transmit_queue = rte_ring_create(BUFFER_COUNT, RING_F_SP_ENQ | RING_F_SC_DEQ);
        {
            unsigned i;
            for (i = 0; i < BUFFER_COUNT - 1; i++)
            {
                struct PacketBuffer *p;

                p = (struct PacketBuffer *)malloc(sizeof(*p));
                if (p == NULL)
                {
                    Nan::ThrowError("Failed to allocate packet buffer");
                    this->Destroy();
                    return;
                }
                err = rte_ring_sp_enqueue(parms->packet_buffers, p);
                if (err)
                {
                    /* I dunno why but I can't queue all 256 packets, just 255 */
                    LOG(0, "packet_buffers: enqueue: error %d\n", err);
                }
            }
        }

        /*
        * Start the scanning thread.
        * THIS IS WHERE THE PROGRAM STARTS SPEWING OUT PACKETS AT A HIGH
        * RATE OF SPEED.
        */
        pixie_begin_thread(transmit_thread, 0, parms);

        /*
        * Start the MATCHING receive thread. Transmit and receive threads
        * come in matching pairs.
        */
        pixie_begin_thread(receive_thread, 0, parms);
    }
}

void MasscanWorker::Execute(const Nan::AsyncProgressWorker::ExecutionProgress &progress)
{
    //     /*
    //  * Print helpful text
    //  */
    //     {
    //         char buffer[80];
    //         struct tm x;

    //         now = time(0);
    //         gmtime_s(&x, &now);
    //         strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S GMT", &x);
    //         LOG(0, "\nStarting masscan " MASSCAN_VERSION " (http://bit.ly/14GZzcT) at %s\n", buffer);
    //         LOG(0, " -- forced options: -sS -Pn -n --randomize-hosts -v --send-eth\n");
    //         LOG(0, "Initiating SYN Stealth Scan\n");
    //         LOG(0, "Scanning %u hosts [%u port%s/host]\n",
    //             (unsigned)count_ips, (unsigned)count_ports, (count_ports == 1) ? "" : "s");
    //     }

    struct Status status;

    status_start(&status);
    status.is_infinite = masscan->is_infinite;
    while (!_stopped)
    {
        unsigned i;
        double rate = 0;
        uint64_t total_tcbs = 0;
        uint64_t total_synacks = 0;
        uint64_t total_syns = 0;

        /* Find the minimum index of all the threads */
        min_index = UINT64_MAX;
        for (i = 0; i < masscan->nic_count; i++)
        {
            struct ThreadPair *parms = &parms_array[i];

            if (min_index > parms->my_index)
                min_index = parms->my_index;

            rate += parms->throttler->current_rate;

            if (parms->total_tcbs)
                total_tcbs += *parms->total_tcbs;
            if (parms->total_synacks)
                total_synacks += *parms->total_synacks;
            if (parms->total_syns)
                total_syns += *parms->total_syns;
        }

        if (min_index >= range && !masscan->is_infinite)
        {
            /* Note: This is how we can tell the scan has ended */
            _stopped = true;
            control_c_pressed = 1;
        }

        /*
            * update screen about once per second with statistics,
            * namely packets/second.
            */
        // status_print(&status, min_index, range, rate, total_tcbs, total_synacks, total_syns, 0);
        this->emitStats(progress, &status, min_index, range, rate, total_tcbs, total_synacks, total_syns, 0);

        /* Sleep for almost a second */
        pixie_mssleep(750);
    }

    /*
        * If we haven't completed the scan, then save the resume
        * information.
        */
    if (min_index < count_ips * count_ports)
    {
        masscan->resume.index = min_index;

        /* Write current settings to "paused.conf" so that the scan can be restarted */
        masscan_save_state(masscan);
    }

    /*
        * Now wait for all threads to exit
        */
    now = time(0);
    for (;;)
    {
        unsigned transmit_count = 0;
        unsigned receive_count = 0;
        unsigned i;
        double rate = 0;
        uint64_t total_tcbs = 0;
        uint64_t total_synacks = 0;
        uint64_t total_syns = 0;

        /* Find the minimum index of all the threads */
        min_index = UINT64_MAX;
        for (i = 0; i < masscan->nic_count; i++)
        {
            struct ThreadPair *parms = &parms_array[i];

            if (min_index > parms->my_index)
                min_index = parms->my_index;

            rate += parms->throttler->current_rate;

            if (parms->total_tcbs)
                total_tcbs += *parms->total_tcbs;
            if (parms->total_synacks)
                total_synacks += *parms->total_synacks;
            if (parms->total_syns)
                total_syns += *parms->total_syns;
        }

        // status_print(&status, min_index, range, rate, total_tcbs, total_synacks, total_syns, masscan->wait - (time(0) - now));
        this->emitStats(progress, &status, min_index, range, rate, total_tcbs, total_synacks, total_syns, masscan->wait - (time(0) - now));

        if (time(0) - now >= masscan->wait)
            control_c_pressed_again = 1;

        for (i = 0; i < masscan->nic_count; i++)
        {
            struct ThreadPair *parms = &parms_array[i];

            transmit_count += parms->done_transmitting;
            receive_count += parms->done_receiving;
        }

        pixie_mssleep(100);

        if (transmit_count < masscan->nic_count)
            continue;
        _stopped = true;
        control_c_pressed = 1;
        control_c_pressed_again = 1;
        if (receive_count < masscan->nic_count)
            continue;
        break;
    }

    /*
        * Now cleanup everything
        */
    status_finish(&status);
    rangelist_pick2_destroy(picker);
}

void MasscanWorker::emitIp(int status, unsigned ip, unsigned ip_proto, unsigned port, unsigned reason, unsigned ttl, const unsigned char mac[6])
{
    // /* if "--open"/"--open-only" parameter specified on command-line, then
    //  * don't report the status of closed-ports */
    // if (!out->is_show_closed && status == PortStatus_Closed)
    //     return;
    // if (!out->is_show_open && status == PortStatus_Open)
    //     return;

    switch (ip_proto)
    {
    case 0: /* ARP */
        // count = fprintf(stdout, "Discovered %s port %u/%s on %u.%u.%u.%u (%02x:%02x:%02x:%02x:%02x:%02x) %s",
        //             status_string(status),
        //             port,
        //             name_from_ip_proto(ip_proto),
        //             (ip>>24)&0xFF,
        //             (ip>>16)&0xFF,
        //             (ip>> 8)&0xFF,
        //             (ip>> 0)&0xFF,
        //             mac[0], mac[1], mac[2], mac[3], mac[4], mac[5],
        //             oui_from_mac(mac)
        //             );
        break;
    default:
    {
        char ipStr[16];
        sprintf_s(ipStr, sizeof(ipStr), "%u.%u.%u.%u", (ip >> 24) & 0xFF, (ip >> 16) & 0xFF, (ip >> 8) & 0xFF, (ip >> 0) & 0xFF);
        MasscanIpInfo ipInfo(status_string((enum PortStatus)status), port, name_from_ip_proto(ip_proto), ipStr);
        _ips.write(ipInfo);
    }
    }
}

void MasscanWorker::emitStats(const Nan::AsyncProgressWorker::ExecutionProgress &progress,
                              struct Status *status, uint64_t count, uint64_t max_count, double x, uint64_t total_tcbs, uint64_t total_synacks, uint64_t total_syns, uint64_t exiting)
{
    double elapsed_time;
    double rate;
    double now;
    double percent_done;
    double time_remaining;
    uint64_t current_tcbs = 0;
    uint64_t current_synacks = 0;
    uint64_t current_syns = 0;
    double tcb_rate = 0.0;
    double synack_rate = 0.0;
    double syn_rate = 0.0;

    /*
     * ####  FUGGLY TIME HACK  ####
     *
     * PF_RING doesn't timestamp packets well, so we can't base time from
     * incoming packets. Checking the time ourself is too ugly on per-packet
     * basis. Therefore, we are going to create a global variable that keeps
     * the time, and update that variable whenever it's convienient. This
     * is one of those convenient places.
     */
    global_now = time(0);

    /* Get the time. NOTE: this is CLOCK_MONOTONIC_RAW on Linux, not
     * wall-clock time. */
    now = (double)pixie_gettime();

    /* Figure how many SECONDS have elapsed, in a floating point value.
     * Since the above timestamp is in microseconds, we need to
     * shift it by 1-million
     */
    elapsed_time = (now - status->last.clock) / 1000000.0;
    if (elapsed_time == 0)
    {
        return;
    }

    /* Figure out the "packets-per-second" number, which is just:
     *
     *  rate = packets_sent / elapsed_time;
     */
    rate = (count - status->last.count) * 1.0 / elapsed_time;

    /*
     * Smooth the number by averaging over the last 8 seconds
     */
    status->last_rates[status->last_count++ & 0x7] = rate;
    rate = status->last_rates[0] + status->last_rates[1] + status->last_rates[2] + status->last_rates[3] + status->last_rates[4] + status->last_rates[5] + status->last_rates[6] + status->last_rates[7];
    rate /= 8;
    /*if (rate == 0)
        return;*/

    /*
     * Calculate "percent-done", which is just the total number of
     * packets sent divided by the number we need to send.
     */
    percent_done = (double)(count * 100.0 / max_count);

    /*
     * Calulate the time remaining in the scan
     */
    time_remaining = (1.0 - percent_done / 100.0) * (max_count / rate);

    /*
     * some other stats
     */
    if (total_tcbs)
    {
        current_tcbs = total_tcbs - status->total_tcbs;
        status->total_tcbs = total_tcbs;
        tcb_rate = (1.0 * current_tcbs) / elapsed_time;
    }
    if (total_synacks)
    {
        current_synacks = total_synacks - status->total_synacks;
        status->total_synacks = total_synacks;
        synack_rate = (1.0 * current_synacks) / elapsed_time;
    }
    if (total_syns)
    {
        current_syns = total_syns - status->total_syns;
        status->total_syns = total_syns;
        syn_rate = (1.0 * current_syns) / elapsed_time;
    }

    /*
     * Print the message to <stderr> so that <stdout> can be redirected
     * to a file (<stdout> reports what systems were found).
     */
    if (status->is_infinite)
    {
        // fprintf(stderr,
        //         "rate:%6.2f-kpps, syn/s=%.0f ack/s=%.0f tcb-rate=%.0f, %" PRIu64 "-tcbs,         \r",
        //         x / 1000.0,
        //         syn_rate,
        //         synack_rate,
        //         tcb_rate,
        //         total_tcbs);
    }
    else
    {
        if (control_c_pressed)
        {
            // fprintf(stderr,
            //         "rate:%6.2f-kpps, %5.2f%% done, waiting %d-secs, found=%" PRIu64 "       \r",
            //         x / 1000.0,
            //         percent_done,
            //         (int)exiting,
            //         total_synacks);

            MasscanStats stats(x / 1000.0, percent_done, (unsigned)0, (unsigned)0, (unsigned)0, total_synacks);
            _stats.write(stats);
            progress.Send(reinterpret_cast<const char *>(&_stats), sizeof(_stats));
        }
        else
        {
            // fprintf(stderr,
            //         "rate:%6.2f-kpps, %5.2f%% done,%4u:%02u:%02u remaining, found=%" PRIu64 "       \r",
            //         x / 1000.0,
            //         percent_done,
            //         (unsigned)(time_remaining / 60 / 60),
            //         (unsigned)(time_remaining / 60) % 60,
            //         (unsigned)(time_remaining) % 60,
            //         total_synacks);

            MasscanStats stats = MasscanStats(x / 1000.0, percent_done, (unsigned)(time_remaining / 60 / 60), (unsigned)(time_remaining / 60) % 60, (unsigned)(time_remaining) % 60, total_synacks);
            _stats.write(stats);
            progress.Send(reinterpret_cast<const char *>(&_stats), sizeof(_stats));
        }
    }

    /*
     * Remember the values to be diffed against the next time around
     */
    status->last.clock = now;
    status->last.count = count;
}

void MasscanWorker::stop()
{
    _stopped = true;
    control_c_pressed = 1;
}

void MasscanWorker::drainQueue()
{
    Nan::HandleScope scope;

    // Stats
    std::deque<MasscanStats> contents;
    _stats.readAll(contents);

    v8::Local<v8::String> eventName = NanStr("stats");
    for (MasscanStats &data : contents)
    {
        Local<Object> stats = Nan::New<Object>();
        stats->Set(NanStr("rate"), Nan::New<Number>(data.rate));
        stats->Set(NanStr("percentDone"), Nan::New<Number>(data.percentDone));
        stats->Set(NanStr("remainingHour"), Nan::New<Integer>(static_cast<uint32_t>(data.remainingHour)));
        stats->Set(NanStr("remainingMin"), Nan::New<Integer>(static_cast<uint32_t>(data.remainingMin)));
        stats->Set(NanStr("remainingSec"), Nan::New<Integer>(static_cast<uint32_t>(data.remainingSec)));
        stats->Set(NanStr("found"), Nan::New<Number>(data.found));
        v8::Local<v8::Value> argv[] = {
            eventName,
            stats};
        progress_callback->Call(2, argv);
    }

    // Ips
    std::deque<MasscanIpInfo> ips;
    _ips.readAll(ips);

    eventName = NanStr("detect");
    for (MasscanIpInfo &data : ips)
    {
        Local<Object> ipInfo = Nan::New<Object>();
        ipInfo->Set(NanStr("status"), NanStr(data.status.c_str()));
        ipInfo->Set(NanStr("protocol"), NanStr(data.protocol.c_str()));
        ipInfo->Set(NanStr("ip"), NanStr(data.ip.c_str()));
        ipInfo->Set(NanStr("port"), Nan::New<Integer>(static_cast<uint32_t>(data.port)));
        v8::Local<v8::Value> argv[] = {
            eventName,
            ipInfo};
        progress_callback->Call(2, argv);
    }
}

class MasscanWorkerWrapper : public Nan::ObjectWrap
{
  public:
    static NAN_MODULE_INIT(Initialize)
    {
        Nan::HandleScope scope;
        v8::Local<v8::FunctionTemplate> tpl = Nan::New<v8::FunctionTemplate>(New);
        tpl->SetClassName(Nan::New("MasscanWorker").ToLocalChecked());
        tpl->InstanceTemplate()->SetInternalFieldCount(3);

        Nan::SetPrototypeMethod(tpl, "initialize", initialize);
        Nan::SetPrototypeMethod(tpl, "start", start);
        Nan::SetPrototypeMethod(tpl, "stop", stop);

        constructor().Reset(Nan::GetFunction(tpl).ToLocalChecked());
        Nan::Set(target, Nan::New("MasscanWorker").ToLocalChecked(), Nan::GetFunction(tpl).ToLocalChecked());
    }

  private:
    explicit MasscanWorkerWrapper(MasscanWorker *worker) : _worker(worker)
    {
        active_worker = worker;
    }

    ~MasscanWorkerWrapper() {}

    static NAN_METHOD(New)
    {
        Nan::HandleScope scope;
        Nan::Callback *data_callback = new Nan::Callback(info[0].As<v8::Function>());
        Nan::Callback *complete_callback = new Nan::Callback(info[1].As<v8::Function>());
        Nan::Callback *error_callback = new Nan::Callback(info[2].As<v8::Function>());
        if (!info[3]->IsObject())
        {
            Nan::ThrowError("Options expected");
            info.GetReturnValue().SetUndefined();
            return;
        }
        v8::Local<v8::Object> options = info[3].As<v8::Object>();

        MasscanWorkerWrapper *obj = new MasscanWorkerWrapper(new MasscanWorker(data_callback, complete_callback, error_callback, options));

        obj->Wrap(info.This());
        info.GetReturnValue().Set(info.This());
    }

    static NAN_METHOD(initialize)
    {
        MasscanWorkerWrapper *obj = Nan::ObjectWrap::Unwrap<MasscanWorkerWrapper>(info.Holder());
        obj->_worker->initialize();
        info.GetReturnValue().SetUndefined();
    }

    static NAN_METHOD(start)
    {
        MasscanWorkerWrapper *obj = Nan::ObjectWrap::Unwrap<MasscanWorkerWrapper>(info.Holder());
        Nan::AsyncQueueWorker(obj->_worker);
        info.GetReturnValue().SetUndefined();
    }

    static NAN_METHOD(stop)
    {
        MasscanWorkerWrapper *obj = Nan::ObjectWrap::Unwrap<MasscanWorkerWrapper>(info.Holder());
        obj->_worker->stop();
        info.GetReturnValue().SetUndefined();
    }

    static inline Nan::Persistent<v8::Function> &constructor()
    {
        static Nan::Persistent<v8::Function> myConstructor;
        return myConstructor;
    }

    MasscanWorker *_worker;
};

NODE_MODULE(masscan, MasscanWorkerWrapper::Initialize)
