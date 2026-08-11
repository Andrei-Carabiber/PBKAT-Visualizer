function entropy(x: number): number {
    if (x === 0 || x === 1) {
        return 0;
    }
    return -x * Math.log2(x) - (1 - x) * Math.log2(1 - x);
}

function secretFraction(w: number): number {
    return Math.max(1 - 2 * entropy((1 - w) / 2), 0);
}

export function secretKeyRate(pmf: number[], wFunc: number[]): number {
    let averW = getMeanWerner(pmf, wFunc);
    averW = Math.min(averW, 1); // avoid w > 1
    let averT = getMeanWaitingTime(pmf);

    let keyRate = (1 / averT) * secretFraction(averW);
    if (keyRate < 0) {
        keyRate = 0;
    }
    return keyRate;
}

export function getMeanWerner(pmf: number[], wFunc: number[]): number {
    // Replace NaN values with 0
    const cleanedWFunc = wFunc.map(val => (Number.isNaN(val) ? 0 : val));

    const coverage = pmf.reduce((acc, val) => acc + val, 0);
    if (coverage <= 0) {
        return 0; // to prevent NaN from corrupting optimization results
    }

    let sum = 0;
    for (let i = 0; i < pmf.length; i++) {
        sum += pmf[i] * cleanedWFunc[i];
    }
    return sum / coverage;
}

export function getMeanWaitingTime(pmf: number[]): number {
    const coverage = pmf.reduce((acc, val) => acc + val, 0);
    if (coverage <= 0) {
        return Infinity; // to prevent NaN from corrupting optimization results
    }

    let pmfIndexSum = 0;
    for (let i = 0; i < pmf.length; i++) {
        pmfIndexSum += pmf[i] * i;
    }

    return ((1 - coverage) / coverage) * pmf.length + pmfIndexSum / coverage;
}