import i18next from "i18next"

export const serviceTypes: Record<number, string> = {
    1: "HTTP GET",
    2: "ICMP Ping",
    3: "TCPing",
}

export const serviceCoverageTypes: Record<number, string> = {
    0: i18next.t("Coverages.Excludes"),
    1: i18next.t("Coverages.Only"),
}
