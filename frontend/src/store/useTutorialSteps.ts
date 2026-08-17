import {type StepType, useTour} from "@reactour/tour";
import {useMemo} from "react";
import {useCustomization} from "@/store/customization.ts";
import {type Edge, useReactFlow} from "@xyflow/react";
import {useRunEngine} from "@/store/runEngine.ts";
import type {EdgeData} from "@/components/main/node_editor/nodeEditor.tsx";
import {containsIgnoringSpaces} from "@/lib/utils.ts";
import {toast} from "sonner";

export const useTutorialSteps = () => {
    const {setLockTour} = useCustomization();
    const {getNodes, setNodes, getEdges, setEdges, addNodes, fitView} = useReactFlow()
    const {setCurrentStep, setIsOpen} = useTour()
    const {
        getUserCodeCallback,
        setUserCodeCallback,
        setNetworkGoalDisabled,
        setNetworkCapacityDisabled,
    } = useRunEngine();

    const interfaceSteps: StepType[] = useMemo(() => [
        {
            selector: '#monaco-editor-container',
            content: 'This is the protocol editor. Here you write the steps of your Quantum Protocol',
        },
        {
            selector: '#node-editor-container',
            content: 'This is the node editor. Here you define your quantum network and its specifications',
        },
        {
            selector: '#network-goal-box',
            content: 'This is the network goal box. Here you write the goal that you want to calculate the probability of.',
        },
        {
            selector: '#network-capacity-box',
            content: 'This is the network capacity box. Here you write the amount of connections there can be between 2 nodes. If not present for 2 nodes, then it counts as unlimited.',
        },
        {
            selector: '#flag-settings-button',
            content: 'This is execution settings button.',
            padding: 2
        },
        {
            selector: '#settings-button',
            content: 'This is node editor settings button. It can help you set quickly default values and change values for all nodes and edges',
        },
        {
            selector: '#run-protocol-button',
            content: 'After you set up your protocol, your network, goal, capacity and other execution settings click here to execute. Try it.',
            action: (node) => {
                setLockTour(true);
                if (node) {
                    node.addEventListener('click', () => {
                        setLockTour(false);
                    }, {once: true});
                }
            }
        },
        {
            selector: '#result-display-window',
            content: 'This is the result display window. Here you can visualize your results.',
        },
    ], [setLockTour]);

    const waitForResult = () => {
        setLockTour(true);
        const waitForResults = setInterval(() => {
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

    const createTutorialSteps: StepType[] = useMemo(() => [
        {
            selector: '#node-editor-whole-container',
            content: "Let's start by seeing the creation process. We want to create an entangled pair of qubits in a node A.",
            action: () => {
                setNodes([])
                setEdges([])
                if (setUserCodeCallback) setUserCodeCallback("")
                setNetworkGoalDisabled(true)
                setNetworkCapacityDisabled(true)
            },
            stepInteraction: false,
        },
        {
            selector: '#node-editor-whole-container',
            content: "First we create a node",
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
            content: "Great! Now double-click directly on the node to edit its properties.",
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
            content: "Perfect! Here is the properties sheet where you can configure the node's settings. Set the node Label to A and Create Probability to 0.5 (50%).",
            padding: 1,
            action: (node) => {
                setLockTour(true);

                // Prevent clicks on the background mask from closing the sheet or disrupting the tour
                const preventMaskClose = (e: MouseEvent) => {
                    const target = e.target as HTMLElement;
                    // If they click outside the dialog (i.e. on the mask/backdrop)
                    if (!target.closest('[role="dialog"]') && !target.closest('[data-tour-elem="popover"]')) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                };
                document.addEventListener('mousedown', preventMaskClose, {capture: true});

                if (node) {
                    const checkDataInterval = setInterval(() => {
                        const currentNodes = getNodes();

                        if (currentNodes.length > 0) {
                            const nodeData = currentNodes[0].data;

                            const isLabelCorrect = nodeData.nodeLabel === 'A';
                            const isProbCorrect = Number(nodeData.create_prob) === 0.5;

                            if (isLabelCorrect && isProbCorrect) {
                                clearInterval(checkDataInterval);
                                setLockTour(false);

                                // Clean up our click blocker
                                document.removeEventListener('mousedown', preventMaskClose, {capture: true});

                                setTimeout(() => {
                                    document.dispatchEvent(
                                        new KeyboardEvent('keydown', {
                                            key: 'Escape',
                                            bubbles: true,
                                            cancelable: true
                                        })
                                    );

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
            content: "Great! Now let's go to the code editor. " +
                "First we define the type of 'outputGoal' as ProbBellKATPolicy. Then we need to write what it actually does." +
                "Start by writing 'outputGoal :: ProbBellKATPolicy'",
            action: (node) => {
                setLockTour(true);

                const setUserCode = useRunEngine.getState().setUserCodeCallback;
                if (setUserCode) setUserCode("");

                if (node) {
                    const checkCodeInterval = setInterval(() => {
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
            content: `Great! Now that outputGoal's type is defined we can say what we want it to do. In this case we want to create an entangled pair in the node that we just generated.` +
                `Therefore we can write on a new line 'outputGoal = create "A"`,
            action: (node) => {
                setLockTour(true);

                if (node) {
                    const checkCodeInterval = setInterval(() => {
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
            content: "Now that we have set up our network and the protocol we can run it. Press run.",
            action: (node) => {
                setLockTour(true);

                // When they click run, unlock the tour and immediately advance to the waiting step
                if (node) {
                    node.addEventListener('click', () => {
                        setLockTour(false);
                        setCurrentStep(prev => prev + 1); // Moves to the new waiting step
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
            content: 'This is the result display window. Here you can visualize your results. As expected since we put the probability to create a pair at 0.5, the probability of creating C~C is 50%',
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
            content: "Let's learn how to use transmission (`trans`). We want to transmit an entangled pair across nodes.",
            action: () => {
                setNodes([])
                setEdges([])
                if (setUserCodeCallback) setUserCodeCallback("")
                setNetworkGoalDisabled(true)
                setNetworkCapacityDisabled(true)

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
                    }])

                setTimeout(() => fitView(), 100)
            },
            stepInteraction: false,
        },
        {
            selector: '#node-editor-container',
            content: `In the protocol editor, we will use the "trans" operation to send a Bell pair. However for a transmission we need a link between 2 nodes.
             Connect nodes A and B.`,
            padding: 0,
            action: (node) => {
                setLockTour(true)

                if (node) {
                    const checkEdge = setInterval(() => {
                        const edges = getEdges()

                        if (edges.length === 1 && (edges[0].source === "A" || edges[0].source === "B")) {
                            clearInterval(checkEdge)
                            setLockTour(false)
                            setCurrentStep(prev => prev + 1)
                        }

                    }, 250)
                }
            }
        },

        {
            selector: '.react-flow__edge',
            content: `Let's set the transmission probability to 0.5. Double-click on the edge or its label.`,
            padding: 20,
            action: () => {
                setLockTour(true);

                const container = document.querySelector('#node-editor-container');

                if (container) {
                    const handleDoubleClick = () => {
                        // Check if a dialog has opened (handles clicks on edge, label, etc.)
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
            content: "Perfect! Here is the properties sheet where you can configure the edge's settings. Set the Transmission Probability to 0.5 (50%) .",
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
                    const checkDataInterval = setInterval(() => {
                        const currentEdges = getEdges();

                        if (currentEdges.length > 0) {
                            const EdgeData = currentEdges[0].data as EdgeData;

                            const isProbCorrect = Number(EdgeData.transmit_prob) === 0.5;

                            if (isProbCorrect) {
                                clearInterval(checkDataInterval);
                                setLockTour(false);

                                document.removeEventListener('mousedown', preventMaskClose, {capture: true});

                                setTimeout(() => {
                                    document.dispatchEvent(
                                        new KeyboardEvent('keydown', {
                                            key: 'Escape',
                                            bubbles: true,
                                            cancelable: true
                                        })
                                    );

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
            content: `Now that we have the 2 nodes connected and set the transimission probability, we can write the protocol. First we want to create a Bell Pair in A.
            write 'outputGoal :: ProbBellKATPolicy' to define outputGoal and then 'outputGoal = create "A"'`,
            action: (node) => {
                setLockTour(true);
                if (setUserCodeCallback) setUserCodeCallback("");

                if (node) {
                    const checkCodeInterval = setInterval(() => {
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
            content: `Great! Now that we have a Bell Pair in A, we want to transmit one qubit of the entangled pair to B.
             To write an operation after the "create" we can use the sign "<>" and then have our transmit operation "trans "A" ("A", "B"). 
             This means that from A we want to send one qubit to A and one to B. So in the end you should have
             'outputGoal = create "A" <> trans "A" ("A", "B")'`,
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const checkCodeInterval = setInterval(() => {
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
            content: "Great! Now run the protocol to simulate the transmission.",
            action: (node) => {
                setLockTour(true);
                if (node) {
                    node.addEventListener('click', () => {
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
            content: "Let's learn Entanglement Distillation (`distill`). This increases the fidelity of noisy Bell pairs. We setup nodes X and Y for you.",
            action: () => {
                setNodes([])
                setEdges([])
                if (setUserCodeCallback) setUserCodeCallback("")
                setNetworkGoalDisabled(true)
                setNetworkCapacityDisabled(true)

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
                ])
                setEdges([
                    {id: 'eA-B', source: 'A', target: 'B', data: {distance: 1, transmit_prob: 1}}
                ] as Edge<EdgeData>[])
                setTimeout(() => fitView(), 100)
            },
            stepInteraction: false,
        },
        {
            selector: '#monaco-editor-root',
            content: "Before we can do distillation, we need 2 entangled pairs between A and B. Therefore we need to create A twice and transmit it to B twice." +
                "let's start by writing a simple create and transmit operation before outputGoal. Let's say we call it a. First define 'a :: ProbBellKATPolicy'," +
                `and then 'a = create "A" <> trans "A" ("A", "B")'`,
            action: (node) => {
                setLockTour(true);

                if (node) {
                    const checkCodeInterval = setInterval(() => {
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
            content: "Now we define the output goal type: `outputGoal :: ProbBellKATPolicy`",
            action: (node) => {
                setLockTour(true);

                if (node) {
                    const checkCodeInterval = setInterval(() => {
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
            content: `Now, in outputGoal we first execute 'a' twice in parallel using <||> and then we do distill ("A", "B"). So in the end
            we have 'outputGoal = a <||> a <> distill ("A", "B")' `,
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const checkCodeInterval = setInterval(() => {
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
            content: "Ready to distill! Click run to evaluate your distillation protocol.",
            action: (node) => {
                setLockTour(true);
                if (node) {
                    node.addEventListener('click', () => {
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
            content: 'Distill tutorial complete!',
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
            content: "Let's learn Entanglement Swapping (`swap`). This allows connecting two independent links via an intermediate node. " +
                "We setup nodes A, B, and C for you, with a swap probability of 0.75 (75%) in node B.",
            action: () => {
                setNodes([])
                setEdges([])
                if (setUserCodeCallback) setUserCodeCallback("")
                setNetworkGoalDisabled(true)
                setNetworkCapacityDisabled(true)

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
                ])
                setEdges([
                    {id: 'eA-B', source: 'A', target: 'B', data: {distance: 1, transmit_prob: 1}},
                    {id: 'eB-C', source: 'B', target: 'C', data: {distance: 1, transmit_prob: 1}}
                ] as Edge<EdgeData>[])
                setTimeout(() => fitView(), 100)
            },
            stepInteraction: false,
        },
        {
            selector: '#monaco-editor-root',
            content: "Before we can swap, we need two adjacent entangled links. Let's define link 'a' (A to B) and link 'b' (B to C).\n" +
                "Define 'a :: ProbBellKATPolicy' and 'a = create \"A\" <> trans \"A\" (\"A\", \"B\")'.\n" +
                "Then define 'b :: ProbBellKATPolicy' and 'b = create \"B\" <> trans \"B\" (\"B\", \"C\")'.",
            action: (node) => {
                setLockTour(true);

                if (node) {
                    const checkCodeInterval = setInterval(() => {
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
            content: "Now we define the output goal type: `outputGoal :: ProbBellKATPolicy`",
            action: (node) => {
                setLockTour(true);

                if (node) {
                    const checkCodeInterval = setInterval(() => {
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
            content: `Now, in outputGoal we execute 'a' and 'b' in parallel using <||> and then we perform a swap at node B to connect A and C. So we write: 
        'outputGoal = a <||> b <> swap "B" ("A", "C")'`,
            action: (node) => {
                setLockTour(true);

                if (node) {
                    const checkCodeInterval = setInterval(() => {
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
            content: "Protocol written! Click run to execute the entanglement swap.",
            action: (node) => {
                setLockTour(true);
                if (node) {
                    node.addEventListener('click', () => {
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
            content: "Let's learn Generation (`ucreate`). This represents pair creation directly across a link. We have initialized nodes A and B.",
            action: () => {
                setNodes([])
                setEdges([])
                if (setUserCodeCallback) setUserCodeCallback("")
                setNetworkGoalDisabled(true)
                setNetworkCapacityDisabled(false)
                setLockTour(false)

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
                ])
                setEdges([
                    {id: 'eA-B', source: 'A', target: 'B', data: {distance: 1, transmit_prob: 1}}
                ] as Edge<EdgeData>[])
                setTimeout(() => fitView(), 100)
            },
            stepInteraction: false,
        },
        {
            selector: '.react-flow__edge',
            content: `Let's set the Generation probability to 0.8. Double-click on the edge or its label.`,
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
            content: "Perfect! Here is the properties sheet where you can configure the edge's settings. Set the Generation Probability to 0.8 (80%) .",
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
                        toast.error("You clicked on the node. Please restart the tutorial and double click on the edge, not on the node")
                    }
                    const checkDataInterval = setInterval(() => {
                        const currentEdges = getEdges();

                        if (currentEdges.length > 0) {
                            const EdgeData = currentEdges[0].data as EdgeData;

                            const isProbCorrect = Number(EdgeData.uCreate_prob) === 0.8;

                            if (isProbCorrect) {
                                clearInterval(checkDataInterval);
                                setLockTour(false);

                                document.removeEventListener('mousedown', preventMaskClose, {capture: true});

                                setTimeout(() => {
                                    document.dispatchEvent(
                                        new KeyboardEvent('keydown', {
                                            key: 'Escape',
                                            bubbles: true,
                                            cancelable: true
                                        })
                                    );

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
            content: "First define the output goal type: `outputGoal :: ProbBellKATPolicy`",
            action: (node) => {
                setLockTour(true);
                if (setUserCodeCallback) setUserCodeCallback("")

                if (node) {
                    const checkCodeInterval = setInterval(() => {
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
            content: "Now, implement the Generation syntax across our two nodes: `outputGoal = ucreate (\"A\", \"B\")`",
            action: (node) => {
                setLockTour(true);
                if (node) {
                    const checkCodeInterval = setInterval(() => {
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
            content: "Code written! Click run to see how the Generation performs.",
            action: (node) => {
                setLockTour(true);
                if (node) {
                    node.addEventListener('click', () => {
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
            content: 'Generation tutorial complete! ',
        },
    ], [setLockTour, setNodes, setEdges, addNodes, fitView, setCurrentStep, getUserCodeCallback, setUserCodeCallback]);

    const basicProtocolSteps: StepType[] = [
        {
            selector: '#node-editor-whole-container',
            content: 'Let us start with Direct Transmission. Create two nodes, A and B, connected by a quantum channel of length L.',
        },
        {
            selector: '#network-capacity-box',
            content: 'When transmitting qubits over a physical channel, the success probability decays exponentially with distance. Set your capacity and expected success probability (p_ge) here, factoring in the channel length.',
        },
        {
            selector: '#settings-button',
            content: 'We need to account for loss and noise. In the settings, you can define initial photon loss as well as length-dependent loss in dB/km[cite: 1].',
        },
        {
            selector: '#monaco-editor-container',
            content: 'Quantum memories and channels suffer from decoherence[cite: 1]. In your protocol code, define T1 (energy relaxation) and T2 (dephasing) time constants[cite: 1]. Relaxation destroys the encoded state, while dephasing washes out superpositions[cite: 1].',
        },
        {
            selector: '#network-goal-box',
            content: 'Your basic goal is to successfully generate an entangled pair[cite: 1]. The fidelity of this pair will depend heavily on the distance and the T1/T2 coherence times you defined[cite: 1].',
        }
    ];

    const advancedProtocolSteps: StepType[] = [
        {
            selector: '#node-editor-container',
            content: 'To cope with long distances where direct transmission fails, we use quantum repeaters[cite: 1]. Add intermediate nodes to split the end-to-end distance into shorter segments[cite: 1].',
        },
        {
            selector: '#monaco-editor-container',
            content: 'Write an Entanglement Swapping protocol[cite: 1]. A Bell-state measurement at the middle node will consume local entangled pairs and create a long-range entangled link between the outer nodes[cite: 1].',
        },
        {
            selector: '#monaco-editor-container',
            content: 'Because of noise, generated links have limited quality[cite: 1]. Implement the DEJMPS Entanglement Distillation protocol to combine multiple noisy copies into fewer copies of higher fidelity[cite: 1].',
        },
        {
            selector: '#flag-settings-button',
            content: 'Configure your execution strategy[cite: 1]. You can choose "Distill->Swap" (purifying short links before swapping) or "Swap->Distill" (swapping first, then purifying the long link)[cite: 1]. Distill->Swap is generally more robust for realistic, noisy networks[cite: 1].',
        },
        {
            selector: '#network-goal-box',
            content: 'Set your advanced evaluation metric[cite: 1]. Instead of just fidelity, you can calculate the Secret-key rate of the BB84 protocol to see how many secure bits per second your repeater network generates[cite: 1].',
        }
    ];

    return {
        interfaceSteps, basicProtocolSteps, advancedProtocolSteps,
        createTutorialSteps, distillTutorialSteps, transTutorialSteps, swapTutorialSteps, ucreateTutorialSteps
    };
};