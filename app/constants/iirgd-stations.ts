export const IIRGD_STATION_CODES = ['1342-5', '1062-9'] as const

export type IirgdStationCode = (typeof IIRGD_STATION_CODES)[number]
