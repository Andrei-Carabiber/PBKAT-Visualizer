import { ThemeProvider } from "@/components/theme-provider"
import MainView from "@/views/MainView.tsx";
import {MainLayout} from "./layout/MainLayout.tsx";

function App() {
  return (
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <MainLayout>
            <MainView />
        </MainLayout>
      </ThemeProvider>
  )
}

export default App
