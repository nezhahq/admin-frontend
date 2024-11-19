export const cronTypes: Record<number, string> = {
    0: "Scheduled",
    1: "Trigger",
}

export const cronCoverageTypes: Record<number, string> = {
    0: "Only specific servers",
    1: "All excludes specific servers",
    2: "The alarmed servers"
}
