import {Card, CardContent, CardTitle} from "@/components/ui/card.tsx";
import type {localStorageSave} from "@/components/web/save-buttons/SaveButtons.tsx";
import {Button} from "@/components/ui/button.tsx";

type props = {
    save: localStorageSave;
    deleteSave: () => void;
    handleLoad: () => void;
}

const LocalSaveDisplayCard = ({save, deleteSave, handleLoad} : props) => {
    return (
        <Card className="w-full p-5">
            <CardTitle className="text-center">
                {save.name} | {new Date(save.savedDate).toLocaleString()}
            </CardTitle>

            <CardContent className="w-full">
                <Button className="w-1/2 py-4" onClick={handleLoad}>
                    Load
                </Button>
                <Button className="w-1/2 py-4" onClick={deleteSave}>
                    Delete
                </Button>
            </CardContent>

        </Card>
    );
};

export default LocalSaveDisplayCard;
