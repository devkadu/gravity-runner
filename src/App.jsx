import { useState } from "react";
import MainMenu from "./components/UI/MainMenu/MainMenu";
import IntroStory from "./components/UI/IntroStory/IntroStory";
import CharacterSelect from "./components/UI/CharacterSelect/CharacterSelect";
import FullscreenButton from "./components/UI/FullscreenButton/FullscreenButton";
import { PhaserGame } from "./PhaserGame";

export const App = () => {
    const [screen, setScreen] = useState("menu");
    const [selectedPilot, setSelectedPilot] = useState(null);

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
        console.log("Piloto selecionado:", pilot);
        // Aqui vai iniciar o jogo Phaser com o piloto escolhido
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
            {screen === "playing" && <PhaserGame pilotConfig={selectedPilot} />}
        </div>
    );
};

export default App;
