import {Card, CardContent, CardTitle} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import type {exampleSave} from "@/examples/type.ts";

type props = {
    save: exampleSave;
    handleLoad: () => void;
}

const ExampleDisplayCard = ({save, handleLoad} : props) => {
    return (
        <Card className="w-full p-5">
            <CardTitle className="text-center">
                {save.name}
            </CardTitle>

            <CardContent className="w-full">
                <Button className="w-full py-4" onClick={handleLoad}>
                    Load
                </Button>
            </CardContent>

        </Card>
    );
};

export default ExampleDisplayCard;
