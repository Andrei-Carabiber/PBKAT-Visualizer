export type DataType = QBKATProbQualityOutput | QBKATProbOutput | PBKATOutput;

export type QBKATProbOutput = {
    mode: "probOnly",
    probabilityMax: number[],
    probabilityMin: number[],
}
export type QBKATProbQualityOutput = {
    mode: "probQuality",

    probability: number[],
    wernerArray: number[]
}

export type PBKATOutput = {
    mode: "run" | "probability",
    output: string
}