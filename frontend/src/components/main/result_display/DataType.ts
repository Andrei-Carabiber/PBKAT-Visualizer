export type DataType = QBKATProbQualityOutput | QBKATProbOutput | PBKATOutput;

export type QBKATProbOutput = {
    mode: "probOnly",
    probabilityMax: number[],
    probabilityMin: number[],
    duration: number
}
export type QBKATProbQualityOutput = {
    mode: "probQuality",

    probability: number[],
    wernerArray: number[],
    durations: {
        firstDuration : number
        secondDuration: number
    }
}

export type PBKATOutput = {
    mode: "run" | "probability",
    output: string,
    durations: {
        firstDuration: number
        secondDuration: number | null
    }
}