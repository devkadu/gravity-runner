import { useState, useEffect } from "react";
import MainMenu from "./components/UI/MainMenu/MainMenu";
import IntroStory from "./components/UI/IntroStory/IntroStory";
import CharacterSelect from "./components/UI/CharacterSelect/CharacterSelect";
import FullscreenButton from "./components/UI/FullscreenButton/FullscreenButton";
import { PhaserGame } from "./PhaserGame";
import { EventBus } from "./game/EventBus";

export const App = () => {
    const [screen, setScreen] = useState("menu");
    const [selectedPilot, setSelectedPilot] = useState(null);
    const [gameKey, setGameKey] = useState(0);

    // Listener para voltar ao menu inicial
    useEffect(() => {
        const handleReturnToMenu = () => {
            setSelectedPilot(null);
            setScreen("menu");
            // Incrementa a key para forçar recriação do componente PhaserGame
            setGameKey((prev) => prev + 1);
        };

        EventBus.on("return-to-menu", handleReturnToMenu);

        return () => {
            EventBus.removeListener("return-to-menu", handleReturnToMenu);
        };
    }, []);

    const handleStartGame = () => {
        setScreen("story");
    };

    const handleOptions = () => {
        console.log("Opções clicadas");
        // Implementar tela de opções
    };

    const handleStoryComplete = () => {
        setScreen("select");
    };

    const handlePilotSelect = (pilot) => {
        setSelectedPilot(pilot);
        setScreen("playing");
        // Incrementa a key para garantir que um novo jogo seja criado
        setGameKey((prev) => prev + 1);
        console.log("Piloto selecionado:", pilot);
    };

    return (
        <div id="app">
            {/* Botão fullscreen nas telas React */}
            {screen !== "playing" && <FullscreenButton />}

            {screen === "menu" && (
                <MainMenu
                    onStartGame={handleStartGame}
                    onOptions={handleOptions}
                />
            )}
            {screen === "story" && (
                <IntroStory onComplete={handleStoryComplete} />
            )}
            {screen === "select" && (
                <CharacterSelect onSelect={handlePilotSelect} />
            )}
            {screen === "playing" && <PhaserGame key={gameKey} pilotConfig={selectedPilot} />}
        </div>
    );
};

export default App;
