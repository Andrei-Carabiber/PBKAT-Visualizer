import ExampleDisplayCard from "@/components/web/header-buttons/example-display-card.tsx";
import type {exampleSave} from "@/examples/type.ts";
import {Tabs, TabsList, TabsTrigger, TabsContent} from "@/components/ui/tabs.tsx";
import {ScrollArea, ScrollBar} from "@/components/ui/scroll-area.tsx";

type props = {
    probabilisticSaves: exampleSave[],
    quantisticSaves: exampleSave[],
    handleLoad: (example: exampleSave) => void
}

const ExampleSelectionCard = ({probabilisticSaves, quantisticSaves, handleLoad}: props) => {
    return (
        <Tabs defaultValue="probabilistic" className="w-full px-10">
            <TabsList
                className="group relative grid w-full grid-cols-2 group-data-horizontal/tabs:h-16 rounded-xl bg-muted p-1.5"
            >
                <div
                    className="absolute bottom-1.5 left-1.5 top-1.5 w-[calc(50%-0.375rem)] rounded-lg bg-primary shadow-sm transition-transform duration-300 ease-in-out
                    group-has-[button:nth-of-type(2)[data-state=active]]:translate-x-full"
                />

                <TabsTrigger
                    value="probabilistic"
                    className="relative z-10 rounded-lg text-sm font-medium transition-colors duration-300 text-muted-foreground
                    hover:text-foreground hover:bg-background/50
                    data-[state=active]:text-primary-foreground
                    data-[state=active]:bg-transparent
                    data-[state=active]:shadow-none
                    data-[state=active]:hover:bg-transparent"
                >
                    Probabilistic
                </TabsTrigger>

                <TabsTrigger
                    value="quantistic"
                    className="relative z-10 rounded-lg text-sm font-medium transition-colors duration-300 text-muted-foreground
                    hover:text-foreground hover:bg-background/50
                    data-[state=active]:text-primary-foreground
                    data-[state=active]:bg-transparent
                    data-[state=active]:shadow-none
                    data-[state=active]:hover:bg-transparent"
                >
                    Quantum
                </TabsTrigger>
            </TabsList>

            {/* Probabilistic Tab Content */}
            <TabsContent value="probabilistic" className="mt-6">
                <div className="relative w-full">
                    <ScrollArea type='always' className="h-[70vh] w-full pr-4">
                        <div
                            className="grid grid-cols-2 gap-3 py-4"> {/* Added py-4 to give breathing room past the fades */}
                            {probabilisticSaves.map((example) => (
                                <ExampleDisplayCard
                                    key={example.id}
                                    save={example}
                                    handleLoad={() => handleLoad(example)}
                                />
                            ))}
                        </div>
                        <ScrollBar/>
                    </ScrollArea>
                    <div
                        className="absolute bottom-[-1px] left-0 right-0 h-4 bg-linear-to-t from-background to-transparent z-10 pointer-events-none"/>
                </div>
            </TabsContent>

            {/* Quantum Tab Content */}
            <TabsContent value="quantistic" className="mt-6">
                <div className="relative w-full">
                    <ScrollArea type='always' className="h-[70vh] w-full pr-4">
                        <div className="grid grid-cols-2 gap-3">
                            {quantisticSaves.slice().reverse().map((example) => (
                                <ExampleDisplayCard
                                    key={example.id}
                                    save={example}
                                    handleLoad={() => handleLoad(example)}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                    <div
                        className="absolute bottom-[-1px] left-0 right-0 h-4 bg-linear-to-t from-background to-transparent z-10 pointer-events-none"/>

                </div>
            </TabsContent>
        </Tabs>
    );
};

export default ExampleSelectionCard;