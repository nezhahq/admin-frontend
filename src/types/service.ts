import i18n from "@/lib/i18n"

export const serviceTypes: Record<number, string> = {
    1: "HTTP GET",
    2: "ICMP Ping",
    3: "TCPing",
}

export const serviceCoverageTypes: Record<number, string> = {
    0: i18n.t("Coverages.Excludes"),
    1: i18n.t("Coverages.Only"),
}
