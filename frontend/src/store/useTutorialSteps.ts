import {type StepType, useTour} from "@reactour/tour";
import {useMemo} from "react";
import {useCustomization} from "@/store/customization.ts";
import {type Edge, useReactFlow} from "@xyflow/react";
import {useRunEngine} from "@/store/runEngine.ts";
import {type EdgeData, initialEdges, initialNodes} from "@/components/main/node_editor/nodeEditor.tsx";
import {containsIgnoringSpaces} from "@/lib/utils.ts";
import {toast} from "sonner";


let tutorialEpoch = 0;
export const bumpTutorialEpoch = () => ++tutorialEpoch;
const getTutorialEpoch = () => tutorialEpoch;
let dialogGuardHandler: ((e: MouseEvent) => void) | null = null;

const installDialogGuard = (selector: string) => {
    if (dialogGuardHandler) return;
    dialogGuardHandler = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest(selector) && !target.closest('[data-tour-elem="popover"]')) {
            e.stopPropagation();
            e.preventDefault();
        }
    };
    document.addEventListener('mousedown', dialogGuardHandler, {capture: true});
};

const removeDialogGuard = () => {
    if (dialogGuardHandler) {
        document.removeEventListener('mousedown', dialogGuardHandler, {capture: true});
        dialogGuardHandler = null;
    }
};

export const useTutorialSteps = () => {
    const {setLockTour} = useCustomization();
    const {getNodes, setNodes, getEdges, setEdges, addNodes, fitView} = useReactFlow();
    const {setCurrentStep, setIsOpen} = useTour();
    const {
        getUserCodeCallback,
        setUserCodeCallback,
        setNetworkGoalDisabled,
        setNetworkCapacityDisabled,
        setGoalConnections
    } = useRunEngine();

    const waitForResult = () => {
        setLockTour(true);
        const epoch = getTutorialEpoch();
        const waitForResults = setInterval(() => {
            if (getTutorialEpoch() !== epoch) {
                clearInterval(waitForResults);
                return;
            }
            const {loading, formattedData, error} = useRunEngine.getState();
            if (!loading && (formattedData || error)) {
                clearInterval(waitForResults);
                requestAnimationFrame(() => {
                    setLockTour(false);
                    setCurrentStep(prev => prev + 1);
                });
            }
        }, 100);
    }

    const interfaceSteps: StepType[] = useMemo(() => [
        {
            selector: '#monaco-editor-container',
            content: 'This is the Protocol Editor. Here, you will write the instructions for your Quantum Protocol.',
            action : () => {
                bumpTutorialEpoch();
                const setCode = useRunEngine.getState().setUserCodeCallback
                if (setCode) {
                    setCode(`e :: ProbBellKATPolicy
e = create "C" <> trans "C" ("A", "C")

f :: ProbBellKATPolicy
f = create "C" <> trans "C" ("B", "C")

outputGoal :: ProbBellKATPolicy
outputGoal = (e <||> f) <> (e <.> f)`)
                }
                setNodes(initialNodes)
                setEdges(initialEdges)
                setTimeout(() => fitView(), 25)
            },
            stepInteraction: false
        },
        {
            selector: '#node-editor-container',
            content: 'This is the Node Editor. Use this canvas to design your quantum network and define its hardware specifications.',
            stepInteraction: false
        },
        {
            selector: '#network-goal-box',
            content: 'This is the Network Goal box. Define the final state or target you want to calculate the success probability for.',
            stepInteraction: false
        },
        {
            selector: '#network-capacity-box',
            content: 'This is the Network Capacity box. Set the maximum number of connections allowed between two nodes. If left empty, connections are unlimited.',
            stepInteraction: false
        },
        {
            selector: '#flag-settings-button',
            content: 'This is the Execution Settings button.',
            padding: 2,
            stepInteraction: false

        },
        {
            selector: '#settings-button',
            content: 'This is the Node Editor Settings button. Use it to quickly apply default values or bulk-update properties across all nodes and edges.',
            stepInteraction: false
        },
        {
            selector: '#run-protocol-button',
            content: 'Once your network, protocol, and settings are ready, click Run to execute the simulation. Give it a try!',
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    node.addEventListener('click', () => {
                        if (getTutorialEpoch() !== epoch) return;
                        setLockTour(false);
                        setCurrentStep(prev => prev + 1);
                    }, {once: true});
                }
            }
        },
        {
            selector: '#separator_main',
            padding: -10,
            position: ({windowWidth, windowHeight, width, height}) => [
                windowWidth / 2 - width / 2,
                windowHeight / 2 - height / 2,
            ],
            content: "Running protocol... Please wait.",
            stepInteraction: false,
            action: waitForResult
        },
        {
            selector: '#result-display-window',
            content: 'This is the Result Display window. Your simulation outputs and visualizations will appear here.',
        },
    ], [setLockTour]);

    const createTutorialSteps: StepType[] = useMemo(() => [
        {
            selector: '#node-editor-whole-container',
            content: "Let's explore the creation process. Our goal is to create an entangled pair of qubits inside Node A.",
            action: () => {
                bumpTutorialEpoch();
                setNodes([]);
                setEdges([]);
                if (setUserCodeCallback) setUserCodeCallback("");
                setNetworkGoalDisabled(true);
                setNetworkCapacityDisabled(true);
            },
            stepInteraction: false,
        },
        {
            selector: '#node-editor-whole-container',
            content: "First, click on 'Add New Node' or double click on canvas to create a new node.",
            action: (node: Element | null) => {
                setLockTour(true);

                if (node) {
                    const handleNodeClick = () => {
                        setTimeout(() => {
                            if (getNodes().length >= 1) {
                                setLockTour(false);
                                setCurrentStep((prev) => prev + 1);
                                node.removeEventListener('click', handleNodeClick);
                            }
                        }, 100);
                    };

                    node.addEventListener('click', handleNodeClick);
                }
            }
        },
        {
            selector: '.react-flow__node',
            content: "Great! Now double-click the node you just created to edit its properties.",
            action: (node) => {
                setLockTour(true);

                if (node) {
                    const handleDoubleClick = () => {
                        setTimeout(() => {
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                            node.removeEventListener('dblclick', handleDoubleClick);
                        }, 100);
                    };

                    node.addEventListener('dblclick', handleDoubleClick);
                }
            }
        },
        {
            selector: '[role="dialog"]',
            content: "In this properties sheet, you can configure the node. Set the Node Label to 'A' and the Create Probability to 0.5 (which is 50%).",
            padding: 1,
            action: (node) => {
                setLockTour(true);

                const preventMaskClose = (e: MouseEvent) => {
                    const target = e.target as HTMLElement;
                    if (!target.closest('[role="dialog"]') && !target.closest('[data-tour-elem="popover"]')) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                };
                document.addEventListener('mousedown', preventMaskClose, {capture: true});

                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkDataInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkDataInterval);
                            document.removeEventListener('mousedown', preventMaskClose, {capture: true});
                            return;
                        }
                        const currentNodes = getNodes();

                        if (currentNodes.length > 0) {
                            const nodeData = currentNodes[0].data;
                            const isLabelCorrect = nodeData.nodeLabel === 'A';
                            const isProbCorrect = Number(nodeData.create_prob) === 0.5;

                            if (isLabelCorrect && isProbCorrect) {
                                clearInterval(checkDataInterval);
                                document.removeEventListener('mousedown', preventMaskClose, {capture: true});
                                document.dispatchEvent(
                                    new KeyboardEvent('keydown', {
                                        key: 'Escape',
                                        bubbles: true,
                                        cancelable: true
                                    })
                                );

                                setTimeout(() => {
                                    setLockTour(false);
                                    setCurrentStep((prev) => prev + 1);
                                }, 50);
                            }
                        }
                    }, 250);
                }
            }
        },
        {
            selector: '#monaco-editor-root',
            content: "Now let's move to the code editor. First, we need to define our goal's type. Start by typing: outputGoal :: ProbBellKATPolicy",
            action: (node) => {
                setLockTour(true);
                const setUserCode = useRunEngine.getState().setUserCodeCallback;
                if (setUserCode) setUserCode("");

                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";
                        if (containsIgnoringSpaces(currentCode, 'outputGoal :: ProbBellKATPolicy')) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: '#monaco-editor-root',
            content: 'Next, we specify what the goal actually does. To create an entangled pair in the node we just made, add this on a new line: outputGoal = create "A"',
            action: (node) => {
                setLockTour(true);

                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";
                        if (containsIgnoringSpaces(currentCode, 'outputGoal :: ProbBellKATPolicy') && containsIgnoringSpaces(currentCode, `outputGoal = create "A"`)) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: '#run-protocol-button',
            content: "With the network and protocol set up, you're ready to simulate. Click Run.",
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    node.addEventListener('click', () => {
                        if (getTutorialEpoch() !== epoch) return;
                        setLockTour(false);
                        setCurrentStep(prev => prev + 1);
                    }, {once: true});
                }
            }
        },
        {
            selector: '#separator_main',
            padding: -10,
            position: ({windowWidth, windowHeight, width, height}) => [
                windowWidth / 2 - width / 2,
                windowHeight / 2 - height / 2,
            ],
            content: "Running protocol... Please wait while we calculate the results.",
            stepInteraction: false,
            action: waitForResult
        },
        {
            selector: '#result-display-window',
            content: "Here are your results! As expected, since we set the creation probability to 0.5, the overall probability of successfully creating the pair is 50%.",
        },
    ], [setLockTour, setNodes, setEdges, getNodes, setCurrentStep, getUserCodeCallback, setUserCodeCallback]);

    const transTutorialSteps: StepType[] = useMemo(() => [
        {
            selector: '#separator_main',
            padding: -10,
            position: ({windowWidth, windowHeight, width, height}) => [
                windowWidth / 2 - width / 2,
                windowHeight / 2 - height / 2,
            ],
            content: "Let's learn about Transmission ('trans'). Our goal is to transmit an entangled qubit from one node to another.",
            action: () => {
                bumpTutorialEpoch();
                setNodes([]);
                setEdges([]);
                if (setUserCodeCallback) setUserCodeCallback("");
                setNetworkGoalDisabled(true);
                setNetworkCapacityDisabled(true);

                addNodes([{
                    id: `A`,
                    type: 'custom',
                    position: {x: 100, y: 100},
                    data: {
                        nodeLabel: `A`,
                        coherence_time: 1,
                        create_prob: 1,
                        create_quality: 1,
                        swap_prob: 1,
                    },
                },
                    {
                        id: `B`,
                        type: 'custom',
                        position: {x: 500, y: 100},
                        data: {
                            nodeLabel: `B`,
                            coherence_time: 1,
                            create_prob: 1,
                            create_quality: 1,
                            swap_prob: 1,
                        },
                    }]);

                setTimeout(() => fitView(), 100);
            },
            stepInteraction: false,
        },
        {
            selector: '#node-editor-container',
            content: "To transmit a qubit, we first need a physical link. Connect Node A and Node B on the canvas.",
            padding: 0,
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkEdge = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkEdge);
                            return;
                        }
                        const edges = getEdges();
                        if (edges.length === 1 && (edges[0].source === "A" || edges[0].source === "B")) {
                            clearInterval(checkEdge);
                            setLockTour(false);
                            setCurrentStep(prev => prev + 1);
                        }
                    }, 250);
                }
            }
        },
        {
            selector: '.react-flow__edge',
            content: "Let's set the transmission probability to 0.5 (50%). Double-click the connection line or its label to open its properties.",
            padding: 20,
            action: () => {
                setLockTour(true);
                const container = document.querySelector('#node-editor-container');
                if (container) {
                    const handleDoubleClick = () => {
                        setTimeout(() => {
                            if (document.querySelector('[role="dialog"]')) {
                                setLockTour(false);
                                setCurrentStep((prev) => prev + 1);
                                container.removeEventListener('dblclick', handleDoubleClick);
                            }
                        }, 150);
                    };
                    container.addEventListener('dblclick', handleDoubleClick);
                }
            }
        },
        {
            selector: '[role="dialog"]',
            content: "In the edge properties sheet, set the Transmission Probability to 0.5 (which is 50%).",
            padding: 1,
            action: (node) => {
                setLockTour(true);
                const preventMaskClose = (e: MouseEvent) => {
                    const target = e.target as HTMLElement;
                    if (!target.closest('[role="dialog"]') && !target.closest('[data-tour-elem="popover"]')) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                };
                document.addEventListener('mousedown', preventMaskClose, {capture: true});

                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkDataInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkDataInterval);
                            document.removeEventListener('mousedown', preventMaskClose, {capture: true});
                            return;
                        }
                        const currentEdges = getEdges();
                        if (currentEdges.length > 0) {
                            const EdgeData = currentEdges[0].data as EdgeData;
                            const isProbCorrect = Number(EdgeData.transmit_prob) === 0.5;

                            if (isProbCorrect) {
                                clearInterval(checkDataInterval);
                                document.removeEventListener('mousedown', preventMaskClose, {capture: true});

                                // Dispatch the Escape key WHILE lockTour is still true (disableKeyboardNavigation
                                // stays true), so @reactour/tour's own keyboard handler ignores this synthetic
                                // event and only the radix Dialog reacts to it. Only unlock + advance afterwards,
                                // so the tour step is never advanced twice for one completed action.
                                document.dispatchEvent(
                                    new KeyboardEvent('keydown', {
                                        key: 'Escape',
                                        bubbles: true,
                                        cancelable: true
                                    })
                                );

                                setTimeout(() => {
                                    setLockTour(false);
                                    setCurrentStep((prev) => prev + 1);
                                }, 50);
                            }
                        }
                    }, 250);
                }
            }
        },
        {
            selector: '#monaco-editor-root',
            content: 'With our nodes connected, let us write the protocol. First, create a Bell pair in Node A. Type on two lines: outputGoal :: ProbBellKATPolicy and then outputGoal = create "A"',
            action: (node) => {
                setLockTour(true);
                if (setUserCodeCallback) setUserCodeCallback("");

                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";
                        if (containsIgnoringSpaces(currentCode, 'outputGoal :: ProbBellKATPolicy')
                            && containsIgnoringSpaces(currentCode, `outputGoal = create "A"`)) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: '#monaco-editor-root',
            content: 'Now, let us transmit one qubit of that pair to Node B. We chain operations using <>. Append the transmission command so your final line looks like this: outputGoal = create "A" <> trans "A" ("A", "B")',
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";
                        if (containsIgnoringSpaces(currentCode, 'outputGoal :: ProbBellKATPolicy') && containsIgnoringSpaces(currentCode, `outputGoal = create "A" <> trans "A" ("A", "B")`)) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: '#run-protocol-button',
            content: "Great! Click Run to simulate the transmission.",
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    node.addEventListener('click', () => {
                        if (getTutorialEpoch() !== epoch) return;
                        setLockTour(false);
                        setCurrentStep(prev => prev + 1);
                    }, {once: true});
                }
            }
        },
        {
            selector: '#separator_main',
            padding: -10,
            position: ({windowWidth, windowHeight, width, height}) => [
                windowWidth / 2 - width / 2,
                windowHeight / 2 - height / 2,
            ],
            content: "Running transmission protocol... Please wait.",
            stepInteraction: false,
            action: waitForResult
        },
        {
            selector: '#result-display-window',
            content: 'Transmission tutorial complete! You can view the output probabilities of your transmitted states here.',
        },
    ], [setLockTour, setNodes, setEdges, setCurrentStep, getUserCodeCallback, setUserCodeCallback]);

    const distillTutorialSteps: StepType[] = useMemo(() => [
        {
            selector: '#separator_main',
            padding: -10,
            position: ({windowWidth, windowHeight, width, height}) => [
                windowWidth / 2 - width / 2,
                windowHeight / 2 - height / 2,
            ],
            content: "Let's learn about Entanglement Distillation ('distill'), which increases the fidelity of noisy Bell pairs. We have set up Nodes A and B for you.",
            action: () => {
                bumpTutorialEpoch();
                setNodes([]);
                setEdges([]);
                if (setUserCodeCallback) setUserCodeCallback("");
                setNetworkGoalDisabled(true);
                setNetworkCapacityDisabled(true);

                addNodes([
                    {
                        id: `A`,
                        type: 'custom',
                        position: {x: 100, y: 100},
                        data: {nodeLabel: `A`, coherence_time: 1, create_prob: 1, create_quality: 1, swap_prob: 1}
                    },
                    {
                        id: `B`,
                        type: 'custom',
                        position: {x: 400, y: 100},
                        data: {nodeLabel: `B`, coherence_time: 1, create_prob: 1, create_quality: 1, swap_prob: 1}
                    }
                ]);
                setEdges([
                    {id: 'eA-B', source: 'A', target: 'B', data: {distance: 1, transmit_prob: 1}}
                ] as Edge<EdgeData>[]);
                setTimeout(() => fitView(), 100);
            },
            stepInteraction: false,
        },
        {
            selector: '#monaco-editor-root',
            content: 'Distillation requires two entangled pairs between A and B. Let us define a helper operation named "a" that creates a pair and transmits it. Type on two lines: a :: ProbBellKATPolicy and then a = create "A" <> trans "A" ("A", "B")',
            action: (node) => {
                setLockTour(true);

                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";
                        if (containsIgnoringSpaces(currentCode, 'a :: ProbBellKATPolicy') && containsIgnoringSpaces(currentCode, `a = create "A" <> trans "A" ("A", "B")`)) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: '#monaco-editor-root',
            content: "Now, define the output goal type: outputGoal :: ProbBellKATPolicy",
            action: (node) => {
                setLockTour(true);

                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";
                        if (containsIgnoringSpaces(currentCode, 'outputGoal :: ProbBellKATPolicy')) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: '#monaco-editor-root',
            content: 'Finally, execute "a" twice in parallel using <||>, followed by the distillation operation. Type: outputGoal = a <||> a <> distill ("A", "B")',
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";
                        if (containsIgnoringSpaces(currentCode, 'a <||> a <> distill ("A", "B")') && containsIgnoringSpaces(currentCode, 'outputGoal :: ProbBellKATPolicy')) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: '#run-protocol-button',
            content: "Ready to distill! Click Run to evaluate your protocol.",
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    node.addEventListener('click', () => {
                        if (getTutorialEpoch() !== epoch) return;
                        setLockTour(false);
                        setCurrentStep(prev => prev + 1);
                    }, {once: true});
                }
            }
        },
        {
            selector: '#separator_main',
            padding: -10,
            position: ({windowWidth, windowHeight, width, height}) => [
                windowWidth / 2 - width / 2,
                windowHeight / 2 - height / 2,
            ],
            content: "Running distillation protocol... Please wait.",
            stepInteraction: false,
            action: waitForResult
        },
        {
            selector: '#result-display-window',
            content: 'Distillation tutorial complete!',
        },
    ], [setLockTour, setNodes, setEdges, addNodes, fitView, setCurrentStep, getUserCodeCallback, setUserCodeCallback]);

    const swapTutorialSteps: StepType[] = useMemo(() => [
        {
            selector: '#separator_main',
            padding: -10,
            position: ({windowWidth, windowHeight, width, height}) => [
                windowWidth / 2 - width / 2,
                windowHeight / 2 - height / 2,
            ],
            content: "Let's learn about Entanglement Swapping ('swap'). This connects two independent links via an intermediate node. We have set up Nodes A, B, and C, with a 75% swap probability at Node B.",
            action: () => {
                bumpTutorialEpoch();
                setNodes([]);
                setEdges([]);
                if (setUserCodeCallback) setUserCodeCallback("");
                setNetworkGoalDisabled(true);
                setNetworkCapacityDisabled(true);

                addNodes([
                    {
                        id: `A`,
                        type: 'custom',
                        position: {x: 100, y: 100},
                        data: {nodeLabel: `A`, coherence_time: 1, create_prob: 1, create_quality: 1, swap_prob: 1}
                    },
                    {
                        id: `B`,
                        type: 'custom',
                        position: {x: 300, y: 100},
                        data: {nodeLabel: `B`, coherence_time: 1, create_prob: 1, create_quality: 1, swap_prob: 0.75}
                    },
                    {
                        id: `C`,
                        type: 'custom',
                        position: {x: 500, y: 100},
                        data: {nodeLabel: `C`, coherence_time: 1, create_prob: 1, create_quality: 1, swap_prob: 1}
                    }
                ]);
                setEdges([
                    {id: 'eA-B', source: 'A', target: 'B', data: {distance: 1, transmit_prob: 1}},
                    {id: 'eB-C', source: 'B', target: 'C', data: {distance: 1, transmit_prob: 1}}
                ] as Edge<EdgeData>[]);
                setTimeout(() => fitView(), 100);
            },
            stepInteraction: false,
        },
        {
            selector: '#monaco-editor-root',
            content: 'Swapping requires two adjacent entangled links. Let us define link "a" (A to B) and link "b" (B to C). Type: a :: ProbBellKATPolicy and then a = create "A" <> trans "A" ("A", "B"). Then do the same for b: b :: ProbBellKATPolicy and b = create "B" <> trans "B" ("B", "C")',
            action: (node) => {
                setLockTour(true);

                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";

                        const hasA = containsIgnoringSpaces(currentCode, 'a :: ProbBellKATPolicy') && containsIgnoringSpaces(currentCode, `a = create "A" <> trans "A" ("A", "B")`);
                        const hasB = containsIgnoringSpaces(currentCode, 'b :: ProbBellKATPolicy') && containsIgnoringSpaces(currentCode, `b = create "B" <> trans "B" ("B", "C")`);

                        if (hasA && hasB) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: '#monaco-editor-root',
            content: "Now define the output goal type: outputGoal :: ProbBellKATPolicy",
            action: (node) => {
                setLockTour(true);

                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";

                        if (containsIgnoringSpaces(currentCode, 'outputGoal :: ProbBellKATPolicy')) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: '#monaco-editor-root',
            content: 'Next, execute "a" and "b" in parallel using <||>, then perform a swap at Node B to bridge A and C. Type: outputGoal = a <||> b <> swap "B" ("A", "C")',
            action: (node) => {
                setLockTour(true);

                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";

                        if (containsIgnoringSpaces(currentCode, 'a <||> b <> swap "B" ("A", "C")') && containsIgnoringSpaces(currentCode, 'outputGoal :: ProbBellKATPolicy')) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: '#run-protocol-button',
            content: "Protocol written! Click Run to execute the entanglement swap.",
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    node.addEventListener('click', () => {
                        if (getTutorialEpoch() !== epoch) return;
                        setLockTour(false);
                        setCurrentStep(prev => prev + 1);
                    }, {once: true});
                }
            }
        },
        {
            selector: '#separator_main',
            padding: -10,
            position: ({windowWidth, windowHeight, width, height}) => [
                windowWidth / 2 - width / 2,
                windowHeight / 2 - height / 2,
            ],
            content: "Running swap protocol... Please wait.",
            stepInteraction: false,
            action: waitForResult
        },
        {
            selector: '#result-display-window',
            content: 'Swap tutorial complete! Check out how the end-to-end entanglement was established.',
        },
    ], [setLockTour, setNodes, setEdges, addNodes, fitView, setCurrentStep, getUserCodeCallback, setUserCodeCallback]);

    const ucreateTutorialSteps: StepType[] = useMemo(() => [
        {
            selector: '#separator_main',
            padding: -10,
            position: ({windowWidth, windowHeight, width, height}) => [
                windowWidth / 2 - width / 2,
                windowHeight / 2 - height / 2,
            ],
            content: "Let's learn about Generation ('ucreate'). This creates an entangled pair directly across a link. We have initialized Nodes A and B.",
            action: () => {
                bumpTutorialEpoch();
                setNodes([]);
                setEdges([]);
                if (setUserCodeCallback) setUserCodeCallback("");
                setNetworkGoalDisabled(true);
                setNetworkCapacityDisabled(false);
                setLockTour(false);

                addNodes([
                    {
                        id: `A`,
                        type: 'custom',
                        position: {x: 100, y: 100},
                        data: {nodeLabel: `A`, coherence_time: 1, create_prob: 1, create_quality: 1, swap_prob: 1}
                    },
                    {
                        id: `B`,
                        type: 'custom',
                        position: {x: 400, y: 100},
                        data: {nodeLabel: `B`, coherence_time: 1, create_prob: 1, create_quality: 1, swap_prob: 1}
                    }
                ]);
                setEdges([
                    {id: 'eA-B', source: 'A', target: 'B', data: {distance: 1, transmit_prob: 1}}
                ] as Edge<EdgeData>[]);
                setTimeout(() => fitView(), 100);
            },
            stepInteraction: false,
        },
        {
            selector: '.react-flow__edge',
            content: "Set the Generation Probability to 0.8 (80%). Double-click the edge or its label to open its properties.",
            padding: 10,
            action: () => {
                setLockTour(true);
                const container = document.querySelector('#node-editor-container');

                if (container) {
                    const handleDoubleClick = () => {
                        setTimeout(() => {
                            if (document.querySelector('[role="dialog"]')) {
                                setLockTour(false);
                                setCurrentStep((prev) => prev + 1);
                                container.removeEventListener('dblclick', handleDoubleClick);
                            }
                        }, 150);
                    };
                    container.addEventListener('dblclick', handleDoubleClick);
                }
            }
        },
        {
            selector: '[role="dialog"]',
            content: "In the properties sheet, set the Generation Probability to 0.8 (which is 80%).",
            padding: 1,
            action: (node) => {
                setLockTour(true);

                const preventMaskClose = (e: MouseEvent) => {
                    const target = e.target as HTMLElement;
                    if (!target.closest('[role="dialog"]') && !target.closest('[data-tour-elem="popover"]')) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                };
                document.addEventListener('mousedown', preventMaskClose, {capture: true});

                if (node) {
                    if (node.textContent.includes("Create Probability")) {
                        setIsOpen(false);
                        toast.error("You clicked on the node! Please restart the tutorial and double-click the edge, not the node.");
                    }
                    const epoch = getTutorialEpoch();
                    const checkDataInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkDataInterval);
                            document.removeEventListener('mousedown', preventMaskClose, {capture: true});
                            return;
                        }
                        const currentEdges = getEdges();

                        if (currentEdges.length > 0) {
                            const EdgeData = currentEdges[0].data as EdgeData;
                            const isProbCorrect = Number(EdgeData.uCreate_prob) === 0.8;

                            if (isProbCorrect) {
                                clearInterval(checkDataInterval);
                                document.removeEventListener('mousedown', preventMaskClose, {capture: true});

                                // Dispatch the Escape key WHILE lockTour is still true (disableKeyboardNavigation
                                // stays true), so @reactour/tour's own keyboard handler ignores this synthetic
                                // event and only the radix Dialog reacts to it. Only unlock + advance afterwards,
                                // so the tour step is never advanced twice for one completed action.
                                document.dispatchEvent(
                                    new KeyboardEvent('keydown', {
                                        key: 'Escape',
                                        bubbles: true,
                                        cancelable: true
                                    })
                                );

                                setTimeout(() => {
                                    setLockTour(false);
                                    setCurrentStep((prev) => prev + 1);
                                }, 50);
                            }
                        }
                    }, 250);
                }
            }
        },
        {
            selector: '#monaco-editor-root',
            content: "First define the output goal type: outputGoal :: ProbBellKATPolicy",
            action: (node) => {
                setLockTour(true);
                if (setUserCodeCallback) setUserCodeCallback("");

                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";
                        if (containsIgnoringSpaces(currentCode, 'outputGoal :: ProbBellKATPolicy')) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: '#monaco-editor-root',
            content: 'Now, implement the Generation syntax across our two nodes: outputGoal = ucreate ("A", "B")',
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";
                        if (containsIgnoringSpaces(currentCode, 'outputGoal :: ProbBellKATPolicy') && containsIgnoringSpaces(currentCode, 'ucreate ("A", "B")')) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: '#run-protocol-button',
            content: "Code written! Click Run to see how Generation performs.",
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    node.addEventListener('click', () => {
                        if (getTutorialEpoch() !== epoch) return;
                        setLockTour(false);
                        setCurrentStep(prev => prev + 1);
                    }, {once: true});
                }
            }
        },
        {
            selector: '#separator_main',
            padding: -10,
            position: ({windowWidth, windowHeight, width, height}) => [
                windowWidth / 2 - width / 2,
                windowHeight / 2 - height / 2,
            ],
            content: "Running generation protocol... Please wait.",
            stepInteraction: false,
            action: waitForResult
        },
        {
            selector: '#result-display-window',
            content: 'Generation tutorial complete!',
        },
    ], [setLockTour, setNodes, setEdges, addNodes, fitView, setCurrentStep, getUserCodeCallback, setUserCodeCallback]);

    const qbkatTutorialSteps: StepType[] = useMemo(() => [
                {
                    selector: '#separator_main',
                    padding: -10,
                    position: ({windowWidth, windowHeight, width, height}) => [
                        windowWidth / 2 - width / 2,
                        windowHeight / 2 - height / 2,
                    ],
                    content: "So far we have used ProbBellKATPolicy. This gives us a result as a percentage. However the result varies in function of time. To get the probability of successfully achieving a protocol in function of time we have to use QBKATPolicy.",
                    action: () => {
                        bumpTutorialEpoch();
                        setNodes([]);
                        setEdges([]);
                        if (setUserCodeCallback) setUserCodeCallback("");
                        setNetworkGoalDisabled(true);
                        setNetworkCapacityDisabled(true);
                    },
                    stepInteraction: false,
                },
                {
                    selector: '#separator_main',
                    padding: -10,
                    position: ({windowWidth, windowHeight, width, height}) => [
                        windowWidth / 2 - width / 2,
                        windowHeight / 2 - height / 2,
                    ],
                    content: "In order to use QBKATPolicy, all you have to do is rename the type of our operations from 'ProbBellKATPolicy' to 'QBKATPolicy'. Also you always need to set a goal for this. Now let's see how the result is with QBKAT.",
                    stepInteraction: false,
                },
                {
                    selector: '#node-editor-container',
                    content: "We will do a swap operation. I have set up nodes A, B and C for you. B has a swap probability of 75%.",
                    stepInteraction: false,
                    action: () => {
                        addNodes([
                            {
                                id: `A`,
                                type: 'custom',
                                position: {x: 100, y: 100},
                                data: {nodeLabel: `A`, coherence_time: 1, create_prob: 1, create_quality: 1, swap_prob: 1}
                            },
                            {
                                id: `B`,
                                type: 'custom',
                                position: {x: 300, y: 100},
                                data: {nodeLabel: `B`, coherence_time: 1, create_prob: 1, create_quality: 1, swap_prob: 0.75}
                            },
                            {
                                id: `C`,
                                type: 'custom',
                                position: {x: 500, y: 100},
                                data: {nodeLabel: `C`, coherence_time: 1, create_prob: 1, create_quality: 1, swap_prob: 1}
                            }
                        ]);
                        setEdges([
                            {id: 'eA-B', source: 'A', target: 'B', data: {distance: 1, transmit_prob: 1}},
                            {id: 'eB-C', source: 'B', target: 'C', data: {distance: 1, transmit_prob: 1}}
                        ] as Edge<EdgeData>[]);
                        setTimeout(() => fitView(), 100);
                    }
                },
                {
                    selector: '#monaco-editor-root',
                    content: 'Let us define link "a" (A to B) and link "b" (B to C). Type: a :: QBKATPolicy and then a = create "A" <> trans "A" ("A", "B"). Then do the same for b: b :: QBKATPolicy and b = create "B" <> trans "B" ("B", "C"). Notice how now we use QBKATPolicy.',
                    action: (node) => {
                        setLockTour(true);

                        if (node) {
                            const epoch = getTutorialEpoch();
                            const checkCodeInterval = setInterval(() => {
                                if (getTutorialEpoch() !== epoch) {
                                    clearInterval(checkCodeInterval);
                                    return;
                                }
                                const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";

                                const hasA = containsIgnoringSpaces(currentCode, 'a :: QBKATPolicy') && containsIgnoringSpaces(currentCode, `a = create "A" <> trans "A" ("A", "B")`);
                                const hasB = containsIgnoringSpaces(currentCode, 'b :: QBKATPolicy') && containsIgnoringSpaces(currentCode, `b = create "B" <> trans "B" ("B", "C")`);

                                if (hasA && hasB) {
                                    clearInterval(checkCodeInterval);
                                    setLockTour(false);
                                    setCurrentStep((prev) => prev + 1);
                                }
                            }, 500);
                        }
                    }
                },
                {
                    selector: '#monaco-editor-root',
                    content: "Now define the output goal type: outputGoal :: QBKATPolicy",
                    action: (node) => {
                        setLockTour(true);

                        if (node) {
                            const epoch = getTutorialEpoch();
                            const checkCodeInterval = setInterval(() => {
                                if (getTutorialEpoch() !== epoch) {
                                    clearInterval(checkCodeInterval);
                                    return;
                                }
                                const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";

                                if (containsIgnoringSpaces(currentCode, 'outputGoal :: QBKATPolicy')) {
                                    clearInterval(checkCodeInterval);
                                    setLockTour(false);
                                    setCurrentStep((prev) => prev + 1);
                                }
                            }, 500);
                        }
                    }
                },
                {
                    selector: '#monaco-editor-root',
                    content: 'Next, execute "a" and "b" in parallel using <||>, then perform a swap at Node B to bridge A and C. Type: outputGoal = a <||> b <> swap "B" ("A", "C")',
                    action: (node) => {
                        setLockTour(true);

                        if (node) {
                            const epoch = getTutorialEpoch();
                            const checkCodeInterval = setInterval(() => {
                                if (getTutorialEpoch() !== epoch) {
                                    clearInterval(checkCodeInterval);
                                    return;
                                }
                                const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";

                                if (containsIgnoringSpaces(currentCode, 'a <||> b <> swap "B" ("A", "C")') && containsIgnoringSpaces(currentCode, 'outputGoal :: QBKATPolicy')) {
                                    clearInterval(checkCodeInterval);
                                    setLockTour(false);
                                    setCurrentStep((prev) => prev + 1);
                                }
                            }, 500);
                        }
                    }
                },
                {
                    selector: "#network-goal-box",
                    content: "Now however we do need a goal. Since we create A~B and B~C and then swap in B we want to set our goal to A~C. Select it.",
                    action: (node) => {
                        setLockTour(true);
                        setGoalConnections([]);
                        setNetworkGoalDisabled(false);

                        const preventMaskClose = (e: MouseEvent) => {
                            const target = e.target as HTMLElement;
                            if (!target.closest('#network-goal-box') && !target.closest('[data-tour-elem="popover"]')) {
                                e.stopPropagation();
                                e.preventDefault();
                            }
                        };
                        document.addEventListener('mousedown', preventMaskClose, {capture: true});

                        if (node) {
                            const epoch = getTutorialEpoch();
                            const checkGoalInterval = setInterval(() => {
                                if (getTutorialEpoch() !== epoch) {
                                    clearInterval(checkGoalInterval);
                                    document.removeEventListener('mousedown', preventMaskClose, {capture: true});
                                    return;
                                }
                                const currentGoalConnections = useRunEngine.getState().goalConnections;
                                const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";
                                if (containsIgnoringSpaces(currentCode, 'a <||> b <> swap "B" ("A", "C")')
                                    && containsIgnoringSpaces(currentCode, 'outputGoal :: QBKATPolicy')
                                    && currentGoalConnections.length === 1
                                    && (currentGoalConnections[0].label === `"A" ~ "C"` || currentGoalConnections[0].label === `"C" ~ "A"`)) {
                                    clearInterval(checkGoalInterval);
                                    document.removeEventListener('mousedown', preventMaskClose, {capture: true});
                                    useCustomization.getState().setGoalPopoverOpen(false);
                                    setLockTour(false);
                                    setCurrentStep((prev) => prev + 1);
                                }
                            }, 500);
                        }
                    }
                },
                {
                    selector: "#flag-settings-button",
                    content: "Now the last thing we have to do is set how long it will go for. Click on this settings button.",
                    action: (node) => {
                        setLockTour(true);

                        // Intercept and block clicks on anything that isn't the flag settings button or the tour itself
                        const preventOtherClicks = (e: MouseEvent) => {
                            const target = e.target as HTMLElement;
                            if (!target.closest('#flag-settings-button') && !target.closest('[data-tour-elem="popover"]')) {
                                e.stopPropagation();
                                e.preventDefault();
                            }
                        };

                        document.addEventListener('mousedown', preventOtherClicks, {capture: true});
                        document.addEventListener('click', preventOtherClicks, {capture: true});

                        if (node) {
                            const epoch = getTutorialEpoch();

                            const cleanupInterval = setInterval(() => {
                                if (getTutorialEpoch() !== epoch) {
                                    clearInterval(cleanupInterval);
                                    document.removeEventListener('mousedown', preventOtherClicks, {capture: true});
                                    document.removeEventListener('click', preventOtherClicks, {capture: true});
                                }
                            }, 250);

                            node.addEventListener('click', () => {
                                if (getTutorialEpoch() !== epoch) return;

                                clearInterval(cleanupInterval);
                                document.removeEventListener('mousedown', preventOtherClicks, {capture: true});
                                document.removeEventListener('click', preventOtherClicks, {capture: true});

                                // Wait for the settings dialog to actually mount before advancing the
                                // tour to the step that targets it — otherwise reactour resolves
                                // `[data-slot="dialog-content"]` a tick too early and never attaches
                                // its highlight/mask to it.
                                const waitForDialog = setInterval(() => {
                                    if (getTutorialEpoch() !== epoch) {
                                        clearInterval(waitForDialog);
                                        return;
                                    }
                                    if (document.querySelector('[data-slot="dialog-content"]')) {
                                        clearInterval(waitForDialog);
                                        setLockTour(false);
                                        setCurrentStep(prev => prev + 1);
                                    }
                                }, 50);
                            }, {once: true});
                        }
                    }
                },
                {
                    selector: '[data-slot="dialog-content"]',
                    content: "Here you can set either truncation or coverage. Truncation stops it after X iterations while coverage stops it is X% sure that you will achieve a connection.",
                    stepInteraction: false,
                    action: () => {
                        installDialogGuard('[data-slot="dialog-content"]');
                    }
                },
                {
                    selector: '#settings-flags-inside-dialog',
                    content: "Let's try settings coverage to 0.90 (90%)",
                    action: (node) => {
                        setLockTour(true);
                        if (node) {
                            const epoch = getTutorialEpoch();
                            const checkCoverageInterval = setInterval(() => {
                                if (getTutorialEpoch() !== epoch) {
                                    clearInterval(checkCoverageInterval);
                                    return;
                                }
                                const mode = useRunEngine.getState().truncationActive;
                                const coverageAmount = useRunEngine.getState().coverage;
                                if (!mode && coverageAmount === 0.9) {
                                    clearInterval(checkCoverageInterval);
                                    removeDialogGuard();

                                    document.dispatchEvent(
                                        new KeyboardEvent('keydown', {
                                            key: 'Escape',
                                            bubbles: true,
                                            cancelable: true
                                        })
                                    );

                                    setTimeout(() => {
                                        setLockTour(false);
                                        setCurrentStep(prev => prev + 1);
                                    }, 50);
                                }
                            }, 250);
                        }
                    }
                },
                {
                    selector: '#run-protocol-button',
                    content: "Protocol written! Click Run to execute the entanglement swap.",
                    action: (node) => {
                        setLockTour(true);
                        if (node) {
                            const epoch = getTutorialEpoch();
                            node.addEventListener('click', () => {
                                if (getTutorialEpoch() !== epoch) return;
                                setLockTour(false);
                                setCurrentStep(prev => prev + 1);
                            }, {once: true});
                        }
                    }
                },
                {
                    selector: '#separator_main',
                    padding:
                        -10,
                    position:
                        ({windowWidth, windowHeight, width, height}) => [
                            windowWidth / 2 - width / 2,
                            windowHeight / 2 - height / 2,
                        ],
                    content:
                        "Running swap protocol... Please wait.",
                    stepInteraction:
                        false,
                    action:
                    waitForResult
                }
                ,
                {
                    selector: '#result-display-window',
                    content:
                        'Swap tutorial complete! Check out how the end-to-end entanglement was established.',
                }
                ,
            ],
            [setLockTour, setNodes, setEdges, addNodes, fitView, setCurrentStep, getUserCodeCallback, setUserCodeCallback]
        )
    ;

    const basicProtocolSteps: StepType[] = useMemo(() => [
        {
            selector: '#separator_main',
            padding: -10,
            position: ({windowWidth, windowHeight, width, height}) => [
                windowWidth / 2 - width / 2,
                windowHeight / 2 - height / 2,
            ],
            content: "Now we will write a more complex, entire protocol.",
            action: () => {
                bumpTutorialEpoch();
                setNodes([]);
                setEdges([]);
                if (setUserCodeCallback) setUserCodeCallback("");
                setNetworkGoalDisabled(true);
                setNetworkCapacityDisabled(true);
                setTimeout(() => fitView(), 100);
            },
            stepInteraction: false,
        },
        {
            selector: '#separator_main',
            padding: -10,
            position: ({windowWidth, windowHeight, width, height}) => [
                windowWidth / 2 - width / 2,
                windowHeight / 2 - height / 2,
            ],
            content: "We have set up 4 nodes: A, B, C and H. A, B and C are each connected to H. " +
                "We want to first create 3 connections: A~H, B~H and C~H (in parallel), and then swap A~H with H~C in H, " +
                "and B~H with H~C in H, giving priority to the first swap. This sounds complicated but it will get clearer once we start.",
            stepInteraction: false,
        },
        {
            selector: "#monaco-editor-container",
            content: 'We will start by writing outputGoal. First define its type: `outputGoal :: QBKATPolicy` and then ' +
                'start the definition: `outputGoal = ` (leave the right-hand side empty for now).',
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";
                        if (containsIgnoringSpaces(currentCode, 'outputGoal :: QBKATPolicy') && containsIgnoringSpaces(currentCode, 'outputGoal = ')) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: "#monaco-editor-container",
            content: `Great! Now we want a while loop, so the protocol doesn't stop until we've achieved what we want: A~C and B~C. ` +
                `After 'outputGoal =' write 'while ("A" /~? "C" &&* "B" /~? "C")'. '/~?' means "if not connected". ` +
                `This makes the loop stop only once both A~C and B~C exist. In summary you need: ` +
                `'outputGoal = while ("A" /~? "C" &&* "B" /~? "C")'`,
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";
                        if (containsIgnoringSpaces(currentCode, 'outputGoal :: QBKATPolicy')
                            && containsIgnoringSpaces(currentCode, 'outputGoal = ')
                            && containsIgnoringSpaces(currentCode, 'while ("A" /~? "C" &&* "B" /~? "C")')
                        ) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: "#monaco-editor-container",
            content: `Good job! Don't worry if it shows red underlines for now — we haven't closed everything yet. ` +
                `After the while condition's closing parenthesis, open a new pair of parentheses for what happens inside the loop: ` +
                `write () and, with your cursor between them, press enter to make a new line. On that line we want to generate A~H, ` +
                `so write 'ucreate ("A", "H")'. In the end you should have: while (...) ( ucreate ("A", "H") )`,
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";
                        if (containsIgnoringSpaces(currentCode, 'outputGoal :: QBKATPolicy')
                            && containsIgnoringSpaces(currentCode, 'outputGoal = ')
                            && containsIgnoringSpaces(currentCode, 'while ("A" /~? "C" &&* "B" /~? "C")')
                            && containsIgnoringSpaces(currentCode, '(ucreate ("A", "H"))')
                        ) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: "#monaco-editor-container",
            content: `Great. Make sure the last closing parenthesis is indented (press tab before it if it isn't) — you shouldn't ` +
                `see any red underlines now. Now also add 'ucreate ("B", "H")' and 'ucreate ("C", "H")'. Put <||> between each ` +
                `ucreate since we want to run them in parallel. It should look like this: ` +
                `( ucreate ("A", "H") <||> ucreate ("B", "H") <||> ucreate ("C", "H") )`,
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";
                        if (containsIgnoringSpaces(currentCode, 'outputGoal :: QBKATPolicy')
                            && containsIgnoringSpaces(currentCode, 'outputGoal = ')
                            && containsIgnoringSpaces(currentCode, 'while ("A" /~? "C" &&* "B" /~? "C")')
                            && containsIgnoringSpaces(currentCode, '(' +
                                'ucreate ("A", "H")' +
                                '<||>' +
                                'ucreate ("B", "H")' +
                                '<||>' +
                                'ucreate ("C", "H")' +
                                ')')
                        ) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: "#monaco-editor-container",
            content: `Good. Now we only want to generate a connection if it doesn't already exist — "if A~H doesn't exist, generate it, ` +
                `otherwise do nothing." For this we add a GUARD: 'ite (condition) (thenBranch) (elseBranch)' is like an IF. ` +
                `Wrap each ucreate with ite ("X" /~? "H") (ucreate (...)) mempty — 'mempty' is the "do nothing" else-branch. You should have:\n` +
                `ite ("A" /~? "H") (ucreate ("A", "H")) mempty\n    <||>\n` +
                `ite ("B" /~? "H") (ucreate ("B", "H")) mempty\n    <||>\n` +
                `ite ("C" /~? "H") (ucreate ("C", "H")) mempty`,
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";
                        if (containsIgnoringSpaces(currentCode, 'outputGoal :: QBKATPolicy')
                            && containsIgnoringSpaces(currentCode, 'outputGoal = ')
                            && containsIgnoringSpaces(currentCode, 'while ("A" /~? "C" &&* "B" /~? "C")')
                            && containsIgnoringSpaces(currentCode, `ite ("A" /~? "H") (ucreate ("A", "H")) mempty
                    <||>
                ite ("B" /~? "H") (ucreate ("B", "H")) mempty
                    <||>
                ite ("C" /~? "H") (ucreate ("C", "H")) mempty`)
                        ) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: "#monaco-editor-container",
            content: `Good. Now we want to add the swaps, which come after this generation step. First put all three guarded ` +
                `ucreates inside one more pair of parentheses, so you have: while (condition) ( (ite (...) (ucreate (...)) mempty x3) )`,
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";
                        if (containsIgnoringSpaces(currentCode, 'outputGoal :: QBKATPolicy')
                            && containsIgnoringSpaces(currentCode, 'outputGoal = ')
                            && containsIgnoringSpaces(currentCode, 'while ("A" /~? "C" &&* "B" /~? "C")')
                            && containsIgnoringSpaces(currentCode, `((
                ite ("A" /~? "H") (ucreate ("A", "H")) mempty
                    <||>
                ite ("B" /~? "H") (ucreate ("B", "H")) mempty
                    <||>
                ite ("C" /~? "H") (ucreate ("C", "H")) mempty
                ))`)
                        ) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: "#monaco-editor-container",
            content: `Perfect. Now, after the generation block, add <> followed by another pair of parentheses for the final block: ` +
                `while (condition) ( (generation block) <> () )`,
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";
                        if (containsIgnoringSpaces(currentCode, 'outputGoal :: QBKATPolicy')
                            && containsIgnoringSpaces(currentCode, 'outputGoal = ')
                            && containsIgnoringSpaces(currentCode, 'while ("A" /~? "C" &&* "B" /~? "C")')
                            && containsIgnoringSpaces(currentCode, `(
                ite ("A" /~? "H") (ucreate ("A", "H")) mempty
                    <||>
                ite ("B" /~? "H") (ucreate ("B", "H")) mempty
                    <||>
                ite ("C" /~? "H") (ucreate ("C", "H")) mempty
                ) <> ()`)
                        ) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: "#monaco-editor-container",
            content: `For our last step: we want the swaps in H for A~C and B~C. Notice both need an H~C pair. So we give priority ` +
                `to A~C, meaning if only one H~C pair is available it goes to that swap first, using <.>. In the new block write:\n` +
                `swap "H" ("A", "C")\n<.>\nswap "H" ("B", "C")`,
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const currentCode = getUserCodeCallback ? getUserCodeCallback() : "";
                        if (containsIgnoringSpaces(currentCode, 'outputGoal :: QBKATPolicy')
                            && containsIgnoringSpaces(currentCode, 'outputGoal = ')
                            && containsIgnoringSpaces(currentCode, 'while ("A" /~? "C" &&* "B" /~? "C")')
                            && containsIgnoringSpaces(currentCode, `(
                ite ("A" /~? "H") (ucreate ("A", "H")) mempty
                    <||>
                ite ("B" /~? "H") (ucreate ("B", "H")) mempty
                    <||>
                ite ("C" /~? "H") (ucreate ("C", "H")) mempty
                ) <> (
                swap "H" ("A", "C")
                <.>
                swap "H" ("B", "C")
                )`)
                        ) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: "#node-editor-whole-container",
            content: `Great. Now the protocol is complete. We can auto-create the nodes and edges. Click on Auto-Create button or if it isn't showing then on the 3 dots (...) and then on auto-create. `,
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const graphGetter = useRunEngine.getState().getGraphCallback
                        let passed = false
                        if (graphGetter) {
                            const graph = graphGetter()

                            const nodes = graph.nodes.map((node) => node.data.nodeLabel)
                            const edges = graph.edges.map((edge) => edge.id)

                            if (nodes.length === 4 &&
                                nodes.includes("H") &&
                                nodes.includes("A") &&
                                nodes.includes("C") &&
                                nodes.includes("B") &&
                                edges.length === 3
                            ) {
                                passed = true
                            }
                        }
                        if (passed) {
                            clearInterval(checkCodeInterval);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: "body",
            content: "Great. Now let's configure it. In H set coherence time to 200 and swap probability to 0.5." +
                "On edge H-A make sure generate probability = 0.25 and generate quality = 0.9." +
                "On edges H-B and H-C make sure generate probability = 0.4 and generate quality = 0.95." +
                "Also make sure distance between H and B is 3.",
            position: ({windowWidth, windowHeight, width, height}) => [
                windowWidth / 4 - width / 2,
                windowHeight / 4 - height / 2,
            ],
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCodeInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCodeInterval);
                            return;
                        }
                        const graphGetter = useRunEngine.getState().getGraphCallback
                        let passed = false
                        if (graphGetter) {
                            const {nodes, edges} = graphGetter()
                            const curatedEdges = edges.map((edge) => {
                                const source = edge.source
                                const target = edge.target
                                const sourceLabel = nodes.filter(node => node.id == source)[0].data.nodeLabel
                                const targetLabel = nodes.filter(node => node.id == target)[0].data.nodeLabel
                                const name = sourceLabel + "~" + targetLabel
                                return {
                                    name: name,
                                    edgeData: edge.data
                                }
                            })
                            try {
                                const HNode = nodes.filter((node) => node.data.nodeLabel === "H")[0]
                                const HALink = curatedEdges.filter(edge => edge.name === "H~A")[0]
                                const HBLink = curatedEdges.filter(edge => edge.name === "H~B")[0]
                                const HCLink = curatedEdges.filter(edge => edge.name === "H~C")[0]

                                if (HNode.data.coherence_time === 200 && HNode.data.swap_prob === 0.5 &&
                                    HALink.edgeData?.uCreate_prob === 0.25 && HALink.edgeData?.uCreate_quality === 0.9
                                && HBLink.edgeData?.uCreate_prob === 0.4 && HCLink.edgeData?.uCreate_prob === 0.4 &&
                                HBLink.edgeData?.uCreate_quality === 0.95 && HCLink.edgeData?.uCreate_quality === 0.95
                                && HBLink.edgeData.distance === 3) {
                                    passed = true
                                }
                            }
                            catch (error) {
                                toast.error('There was an unexpected error. We are sorry. You can check the H-Swap example from QBKAT to see how it would have been.')
                                clearInterval(checkCodeInterval)
                                setLockTour(false)
                                setCurrentStep(0)
                                setIsOpen(false)
                            }

                        }
                        if (passed) {
                            clearInterval(checkCodeInterval);

                            document.dispatchEvent(
                                new KeyboardEvent('keydown', {
                                    key: 'Escape',
                                    bubbles: true,
                                    cancelable: true
                                })
                            );

                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: "#network-goal-box",
            content: "Now we need to set the network goal to match what our protocol targets: A~C and B~C. Select both.",
            action: (node) => {
                setLockTour(true);
                setGoalConnections([]);
                setNetworkGoalDisabled(false);

                const preventMaskClose = (e: MouseEvent) => {
                    const target = e.target as HTMLElement;
                    if (!target.closest('#network-goal-box') && !target.closest('[data-tour-elem="popover"]')) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                };
                document.addEventListener('mousedown', preventMaskClose, {capture: true});

                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkGoalInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkGoalInterval);
                            document.removeEventListener('mousedown', preventMaskClose, {capture: true});
                            return;
                        }
                        const currentGoalConnections = useRunEngine.getState().goalConnections;
                        const labels = currentGoalConnections.map(c => c.label);
                        const hasAC = labels.includes(`"A" ~ "C"`) || labels.includes(`"C" ~ "A"`);
                        const hasBC = labels.includes(`"B" ~ "C"`) || labels.includes(`"C" ~ "B"`);

                        if (currentGoalConnections.length === 2 && hasAC && hasBC) {
                            clearInterval(checkGoalInterval);
                            document.removeEventListener('mousedown', preventMaskClose, {capture: true});
                            useCustomization.getState().setGoalPopoverOpen(false);
                            setLockTour(false);
                            setCurrentStep((prev) => prev + 1);
                        }
                    }, 500);
                }
            }
        },
        {
            selector: "#flag-settings-button",
            content: "Last thing: set how long the protocol should run for. Click this settings button.",
            action: (node) => {
                setLockTour(true);

                const preventOtherClicks = (e: MouseEvent) => {
                    const target = e.target as HTMLElement;
                    if (!target.closest('#flag-settings-button') && !target.closest('[data-tour-elem="popover"]')) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                };
                document.addEventListener('mousedown', preventOtherClicks, {capture: true});
                document.addEventListener('click', preventOtherClicks, {capture: true});

                if (node) {
                    const epoch = getTutorialEpoch();

                    const cleanupInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(cleanupInterval);
                            document.removeEventListener('mousedown', preventOtherClicks, {capture: true});
                            document.removeEventListener('click', preventOtherClicks, {capture: true});
                        }
                    }, 250);

                    node.addEventListener('click', () => {
                        if (getTutorialEpoch() !== epoch) return;

                        clearInterval(cleanupInterval);
                        document.removeEventListener('mousedown', preventOtherClicks, {capture: true});
                        document.removeEventListener('click', preventOtherClicks, {capture: true});

                        const waitForDialog = setInterval(() => {
                            if (getTutorialEpoch() !== epoch) {
                                clearInterval(waitForDialog);
                                return;
                            }
                            if (document.querySelector('[data-slot="dialog-content"]')) {
                                clearInterval(waitForDialog);
                                setLockTour(false);
                                setCurrentStep(prev => prev + 1);
                            }
                        }, 50);
                    }, {once: true});
                }
            }
        },
        {
            selector: '[data-slot="dialog-content"]',
            content: "Set truncation to 200 so the loop stops after 200 iterations.",
            action: (node) => {
                setLockTour(true);
                installDialogGuard('[data-slot="dialog-content"]');
                if (node) {
                    const epoch = getTutorialEpoch();
                    const checkCoverageInterval = setInterval(() => {
                        if (getTutorialEpoch() !== epoch) {
                            clearInterval(checkCoverageInterval);
                            return;
                        }
                        const mode = useRunEngine.getState().truncationActive;
                        const truncationAmount = useRunEngine.getState().truncation;
                        if (mode && truncationAmount === 200) {
                            clearInterval(checkCoverageInterval);
                            removeDialogGuard();

                            document.dispatchEvent(
                                new KeyboardEvent('keydown', {
                                    key: 'Escape',
                                    bubbles: true,
                                    cancelable: true
                                })
                            );

                            setTimeout(() => {
                                setLockTour(false);
                                setCurrentStep(prev => prev + 1);
                            }, 50);
                        }
                    }, 250);
                }
            }
        },
        {
            selector: '#run-protocol-button',
            content: "Protocol complete! Click Run to execute it.",
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const epoch = getTutorialEpoch();
                    node.addEventListener('click', () => {
                        if (getTutorialEpoch() !== epoch) return;
                        setLockTour(false);
                        setCurrentStep(prev => prev + 1);
                    }, {once: true});
                }
            }
        },
        {
            selector: '#separator_main',
            padding: -10,
            position: ({windowWidth, windowHeight, width, height}) => [
                windowWidth / 2 - width / 2,
                windowHeight / 2 - height / 2,
            ],
            content: "Running protocol... Please wait.",
            stepInteraction: false,
            action: waitForResult
        },
        {
            selector: '#result-display-window',
            content: 'Congratulations, you wrote a full protocol with loops, guards, and prioritized swaps! ' +
                'You can see the probability of achieving both A~C and B~C over time here.',
        },
    ], [setLockTour, setNodes, setEdges, addNodes, fitView, setCurrentStep, getUserCodeCallback, setUserCodeCallback, setGoalConnections]);



    return {
        interfaceSteps, basicProtocolSteps,
        createTutorialSteps,
        distillTutorialSteps,
        transTutorialSteps,
        swapTutorialSteps,
        ucreateTutorialSteps,
        qbkatTutorialSteps
    };
};