import type { BasicOperation, CompoundOperation, guard } from "../schemas/JSON_schema.js";

//Transform an operation from theoretical syntax to haskell DSL syntax
//For example transform c(X) to create "X"
export function parseOperation(op: BasicOperation | CompoundOperation): string {
    switch (op.type) {
        case "create":
            return `create "${op.node}"`;
        case "generate":
            return `ucreate ("${op.firstNode}", "${op.secondNode}")`;
        case "transmit":
            return `trans "${op.from}" ("${op.to.firstNode}", "${op.to.secondNode}")`;
        case "swap":
            return `swap "${op.at}" ("${op.from.firstNode}", "${op.from.secondNode}")`;
        case "distill":
            return `distill ("${op.firstNode}", "${op.secondNode}")`;

        case "sequence":
            return `(${parseOperation(op.firstOperation)} <> ${parseOperation(op.secondOperation)})`;
        case "parallel":
            return `(${parseOperation(op.firstOperation)} <||> ${parseOperation(op.secondOperation)})`;
        case "ordered":
            return `(${parseOperation(op.priorityOperation)} <.> ${parseOperation(op.otherOperation)})`;
        case "conditional":
            return `(ite ${parseGuard(op.test)} ${parseOperation(op.ifTrue)} ${parseOperation(op.ifFalse)})`;
        case "loop":
            return `(whileN ${op.maxIterations} ${parseGuard(op.test)} $ ${parseOperation(op.operation)})`;
    }

    //TODO Add throwing error
    return ""
}


//TODO Add parseGuard function
function parseGuard(g: guard):string {
    return JSON.stringify(g)
}