import "./index.css";
import {TourProvider} from "@reactour/tour";

async function bootstrap() {
    const [
        {StrictMode},
        {createRoot},
        {default: App},
    ] = await Promise.all([
        import("react"),
        import("react-dom/client"),
        import("./App.tsx"),
    ]);

    createRoot(document.getElementById("root")!).render(
        <TourProvider steps={steps}>

            <StrictMode>
                <App/>
            </StrictMode>
        </TourProvider>
    );
}


const steps = [
    {
        selector: '.first-step',
        content: 'This is my first Step',
    },]

await bootstrap();