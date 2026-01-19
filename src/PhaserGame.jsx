// src/game/PhaserGame.jsx
import { forwardRef, useLayoutEffect, useRef } from "react";
import StartGame from "./game/main";
import { EventBus } from "./game/EventBus";

export const PhaserGame = forwardRef(function PhaserGame(
    { currentActiveScene, pilotConfig },
    ref
) {
    const game = useRef(null);
    const pilotConfigRef = useRef(pilotConfig);

    // Atualiza a ref quando pilotConfig muda
    pilotConfigRef.current = pilotConfig;

    // Cria o jogo dentro do useLayoutEffect para garantir que o container DOM já existe
    useLayoutEffect(() => {
        // PRIMEIRO: Registra o listener ANTES de criar o jogo
        const handleSceneReady = (currentScene) => {
            const currentPilotConfig = pilotConfigRef.current;
            console.log("PhaserGame: cena pronta, pilotConfig =", currentPilotConfig);

            if (currentActiveScene instanceof Function) {
                currentActiveScene(currentScene);
            }

            if (ref && ref.current) {
                ref.current.scene = currentScene;
            }

            // Envia os dados do piloto para a cena
            if (currentPilotConfig) {
                console.log("Enviando dados do piloto para o Phaser:", currentPilotConfig.pilot);
                EventBus.emit("send-pilot-data", currentPilotConfig);
            }
        };

        EventBus.on("current-scene-ready", handleSceneReady);

        // Sempre cria um novo jogo quando o componente monta
        game.current = StartGame("game-container");

        if (ref !== null && ref.current !== undefined) {
            ref.current = { game: game.current, scene: null };
        }

        return () => {
            EventBus.removeListener("current-scene-ready", handleSceneReady);
            EventBus.removeListener("send-pilot-data");
            if (game.current) {
                game.current.destroy(true);
                game.current = null;
            }
        };
    }, [ref, currentActiveScene]);

    return <div id="game-container"></div>;
});

export default PhaserGame;
