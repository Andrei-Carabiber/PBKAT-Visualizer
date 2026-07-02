export type JSON_schema = {
    protocolSchema: protocolSchema,
    configSchema: configSchema
}

type protocolSchema = {
    definitions?: Record<string, BasicOperation | CompoundOperation>,

    mainProtocol: BasicOperation | CompoundOperation
}

//Creates a bell pair in the node
type create = {
    type: "create"
    node: string
}

//Transmit a bell pair from the "from" node to the "to" nodes
type trans = {
    type: "transmit"
    from: string,
    to: {
        firstNode: string,
        secondNode: string
    }
}

//Perform swap operation of 2 bell pairs in the "at" node to output a bell pair in the "from" nodes
type sw = {
    type: "swap",
    at: string,
    from: {
        firstNode: string,
        secondNode: string
    }
}

//Perform distillation by consuming 2 bell pairs between the 2 nodes
type di = {
    type: "distill",
    firstNode: string,
    secondNode: string
}

//Generate a bell pair between the 2 nodes
type ge = {
    type: "generate",
    firstNode: string,
    secondNode: string
}

//Allows to assign a variable to operations
type ref = {
    type: "reference",
    name: string
}

export type BasicOperation = create | trans | sw | di | ge | ref

export type CompoundOperation = seq | paral | ord | cond | loop

//Performs first operation and then second operation
type seq = {
    type: "sequence"
    firstOperation: BasicOperation | CompoundOperation,
    secondOperation: BasicOperation | CompoundOperation
}

//Performs first operation and second operation at the same time
type paral = {
    type: "parallel",
    firstOperation: BasicOperation | CompoundOperation,
    secondOperation: BasicOperation | CompoundOperation
}

//Performs first operation and second operation at the same time but resource priority to priorityOperation
type ord = {
    type: "ordered",
    priorityOperation: BasicOperation | CompoundOperation,
    otherOperation: BasicOperation | CompoundOperation
}


//Does ifTrue operation if test is true else does ifFalse operation
type cond = {
    type: "conditional",
    test: guard
    ifTrue: BasicOperation | CompoundOperation,
    ifFalse: BasicOperation | CompoundOperation
}

//Keeps doing operation until test is false or maxIterations is reached
type loop = {
    type: "loop"
    test: guard,
    maxIterations: number
    operation: BasicOperation | CompoundOperation
}

export type guard = singleGuard | compositeGuard


//Tests if a bell pair between 2 nodes exists or not
//If condition = "exists" then it checks if bell pair exists between the 2 nodes
//If condition = "missing" then it checks if bell pair does not exist between the 2 nodes
type singleGuard = {
    type: "singleTest",
    condition: "exists" | "missing",
    firstNode: string,
    secondNode: string
}

//Performs AND / OR operations between 2 guards
type compositeGuard = {
    type: "compositeTest",
    condition: "AND" | "OR",
    guards: Array<guard>
}


//TODO Fix configSchema
type configSchema = {placeholder:string}