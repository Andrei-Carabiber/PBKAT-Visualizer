import ExampleDisplayCard from "@/components/web/header-buttons/example-display-card.tsx";
import type {exampleSave} from "@/examples/type.ts";
import {Tabs, TabsList, TabsTrigger, TabsContent} from "@/components/ui/tabs.tsx";

type props = {
    probabilisticSaves: exampleSave[],
    quantisticSaves: exampleSave[],
    handleLoad: (example: exampleSave) => void
}

const ExampleSelectionCard = ({probabilisticSaves, quantisticSaves, handleLoad}: props) => {
    return (
        <Tabs defaultValue="probabilistic" className="w-full px-10">
            <TabsList
                // Added `group` and `relative` to allow the slider to position itself
                className="group relative grid w-full grid-cols-2 group-data-horizontal/tabs:h-16 rounded-xl bg-muted p-1.5"
            >
                {/*
                  THE SLIDING BACKGROUND INDICATOR
                  Moves 100% to the right when the second button (quantistic) is active
                */}
                <div
                    className="absolute bottom-1.5 left-1.5 top-1.5 w-[calc(50%-0.375rem)] rounded-lg bg-primary shadow-sm transition-transform duration-300 ease-in-out
                    group-has-[button:nth-of-type(2)[data-state=active]]:translate-x-full"
                />

                <TabsTrigger
                    value="probabilistic"
                    // Added relative & z-10 so the text floats above the slider.
                    // Swapped the active bg for transparent so we can see the slider behind it.
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
                    Quantistic
                </TabsTrigger>
            </TabsList>

            <TabsContent value="probabilistic" className="mt-6">
                <div className="grid grid-cols-2 gap-3">
                    {probabilisticSaves.map((example) => (
                        <ExampleDisplayCard
                            key={example.id}
                            save={example}
                            handleLoad={() => handleLoad(example)}
                        />
                    ))}
                </div>
            </TabsContent>

            <TabsContent value="quantistic" className="mt-6">
                <div className="grid grid-cols-2 gap-3">
                    {quantisticSaves.reverse().map((example) => (
                        <ExampleDisplayCard
                            key={example.id}
                            save={example}
                            handleLoad={() => handleLoad(example)}
                        />
                    ))}
                </div>
            </TabsContent>
        </Tabs>
    );
};

export default ExampleSelectionCard;