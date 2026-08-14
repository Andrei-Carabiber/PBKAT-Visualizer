import {type StepType, useTour} from "@reactour/tour";
import {useMemo} from "react";
import {useCustomization} from "@/store/customization.ts";
import {useReactFlow} from "@xyflow/react";
import {useRunEngine} from "@/store/runEngine.ts";

export const useTutorialSteps = () => {
    const {setLockTour} = useCustomization();
    const {getNodes, setNodes, getEdges, setEdges} = useReactFlow()
    const {setCurrentStep, currentStep} = useTour()
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
                document.addEventListener('mousedown', preventMaskClose, { capture: true });

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
                                document.removeEventListener('mousedown', preventMaskClose, { capture: true });

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

                        if (currentCode.includes('outputGoal :: ProbBellKATPolicy')) {

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

                        if (currentCode.includes('outputGoal :: ProbBellKATPolicy') && currentCode.includes(`outputGoal = create "A"`)) {

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
                    }, { once: true });
                }
            }
        },
        {
            selector: '#result-display-window',
            position: 'center',
            content: "Running protocol... Please wait while we calculate the results.",
            stepInteraction: false,
            styles: {
                highlightedArea: (base) => ({
                    ...base,
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                    rx: 0,
                    ry: 0,
                }),
            },
            action: () => {
                setLockTour(true);

                // Poll the Zustand store to watch for results
                const waitForResults = setInterval(() => {
                    const { loading, formattedData, error } = useRunEngine.getState();

                    // Once loading finishes and results are available
                    if (!loading && (formattedData || error)) {
                        clearInterval(waitForResults);

                        // Wait for the browser to paint the expanded content, then advance to final step
                        requestAnimationFrame(() => {
                            setLockTour(false);
                            setCurrentStep(prev => prev + 1); // Moves to the final review step
                        });
                    }
                }, 100);
            }
        },
        {
            selector: '#result-display-window',
            content: 'This is the result display window. Here you can visualize your results. As expected since we put the probability to create a pair at 0.5, the probability of creating C~C is 50%',
        },

    ], [setLockTour, setNodes, setEdges, getNodes, setCurrentStep, getUserCodeCallback, setUserCodeCallback]);



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

    return {interfaceSteps, basicProtocolSteps, advancedProtocolSteps, createTutorialSteps};
};