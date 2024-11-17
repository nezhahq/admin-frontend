export const serviceTypes: Record<number, string> = {
    1: "HTTP GET",
    2: "ICMP Ping",
    3: "TCPing",
}

export const serviceCoverageTypes: Record<number, string> = {
    0: "All excludes specific servers",
    1: "Only specific servers",
}
