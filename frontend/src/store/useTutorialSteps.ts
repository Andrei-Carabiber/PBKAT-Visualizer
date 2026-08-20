import {type StepType, useTour} from "@reactour/tour";
import {useEffect, useMemo} from "react";
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

    useEffect(() => {
        const isPasteShortcut = (e: KeyboardEvent) =>
            (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v';

        const keyGuardHandler = (e: KeyboardEvent) => {
            if (!useCustomization.getState().lockTour) return;
            if (isPasteShortcut(e)) {
                e.preventDefault();
                e.stopPropagation();
                toast.error("Type the code yourself so you can follow along with the tutorial!");
            }
        };

        const pasteGuardHandler = (e: ClipboardEvent) => {
            if (!useCustomization.getState().lockTour) return;
            e.preventDefault();
            e.stopPropagation();
            toast.error("Type the code yourself so you can follow along with the tutorial!");
        };

        document.addEventListener('keydown', keyGuardHandler, {capture: true});
        document.addEventListener('paste', pasteGuardHandler, {capture: true});
        return () => {
            document.removeEventListener('keydown', keyGuardHandler, {capture: true});
            document.removeEventListener('paste', pasteGuardHandler, {capture: true});
        };
    }, []);

    const interfaceSteps: StepType[] = useMemo(() => [
        {
            selector: '#monaco-editor-container',
            content: 'This is the Protocol Editor. Here, you will write the instructions for your Quantum Protocol.',
            action : () => {
                setLockTour(true);
                bumpTutorialEpoch();
                if (setUserCodeCallback) setUserCodeCallback(`e :: ProbBellKATPolicy
e = create "C" <> trans "C" ("A", "C")

f :: ProbBellKATPolicy
f = create "C" <> trans "C" ("B", "C")

outputGoal :: ProbBellKATPolicy
outputGoal = (e <||> f) <> (e <.> f)`)
                setNodes(initialNodes)
                setEdges(initialEdges)
                setTimeout(() => fitView(), 25)
                setLockTour(false)
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

    const basicProtocolSteps: StepType[] = [
        {
            selector: '#node-editor-whole-container',
            content: "Let's start with Direct Transmission. Create two nodes, A and B, and connect them with a quantum channel of length L.",
        },
        {
            selector: '#network-capacity-box',
            content: 'When transmitting qubits over a physical channel, success probability decays exponentially with distance. Set your capacity and expected success probability (p_ge) here, factoring in the channel length.',
        },
        {
            selector: '#settings-button',
            content: 'To account for loss and noise, use the settings to define initial photon loss and length-dependent loss in dB/km.',
        },
        {
            selector: '#monaco-editor-container',
            content: 'Quantum memories and channels suffer from decoherence. In your protocol code, define T1 (energy relaxation) and T2 (dephasing) time constants. Relaxation destroys the encoded state, while dephasing washes out superpositions.',
        },
        {
            selector: '#network-goal-box',
            content: 'Your basic goal is to successfully generate an entangled pair. The fidelity of this pair depends heavily on the distance and the T1/T2 coherence times you define.',
        }
    ];

    const advancedProtocolSteps: StepType[] = [
        {
            selector: '#node-editor-container',
            content: 'To cope with long distances where direct transmission fails, we use quantum repeaters. Add intermediate nodes to split the end-to-end distance into shorter segments.',
        },
        {
            selector: '#monaco-editor-container',
            content: 'Write an Entanglement Swapping protocol. A Bell-state measurement at the middle node consumes local entangled pairs to create a long-range entangled link between the outer nodes.',
        },
        {
            selector: '#monaco-editor-container',
            content: 'Generated links have limited quality due to noise. Implement the DEJMPS Entanglement Distillation protocol to combine multiple noisy copies into fewer copies of higher fidelity.',
        },
        {
            selector: '#flag-settings-button',
            content: 'Configure your execution strategy. Choose Distill->Swap (purifying short links before swapping) or Swap->Distill (swapping first, then purifying the long link). Distill->Swap is generally more robust for realistic, noisy networks.',
        },
        {
            selector: '#network-goal-box',
            content: 'Set your advanced evaluation metric. Instead of just fidelity, calculate the Secret-key rate of the BB84 protocol to see how many secure bits per second your repeater network can generate.',
        }
    ];

    return {
        interfaceSteps, basicProtocolSteps, advancedProtocolSteps,
        createTutorialSteps,
        distillTutorialSteps,
        transTutorialSteps,
        swapTutorialSteps,
        ucreateTutorialSteps,
        qbkatTutorialSteps
    };
};