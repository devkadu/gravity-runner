// src/game/PhaserGame.jsx
import { forwardRef, useLayoutEffect, useRef } from "react";
import StartGame from "./game/main";
import { EventBus } from "./game/EventBus";

export const PhaserGame = forwardRef(function PhaserGame(
    { currentActiveScene, pilotConfig },
    ref
) {
    const game = useRef();

    // Cria o jogo dentro do useLayoutEffect para garantir que o container DOM já existe
    useLayoutEffect(() => {
        // PRIMEIRO: Registra o listener ANTES de criar o jogo
        const handleSceneReady = (currentScene) => {
            console.log("PhaserGame: cena pronta, pilotConfig =", pilotConfig);

            if (currentActiveScene instanceof Function) {
                currentActiveScene(currentScene);
            }

            if (ref && ref.current) {
                ref.current.scene = currentScene;
            }

            // Envia os dados do piloto para a cena
            if (pilotConfig) {
                console.log("Enviando dados do piloto para o Phaser:", pilotConfig.pilot);
                EventBus.emit("send-pilot-data", pilotConfig);
            }
        };

        EventBus.on("current-scene-ready", handleSceneReady);

        // DEPOIS: Cria o jogo
        if (game.current === undefined) {
            game.current = StartGame("game-container");

            if (ref !== null) {
                ref.current = { game: game.current, scene: null };
            }
        }

        return () => {
            EventBus.removeListener("current-scene-ready", handleSceneReady);
            if (game.current) {
                game.current.destroy(true);
                game.current = undefined;
            }
        };
    }, [ref, currentActiveScene, pilotConfig]);

    return <div id="game-container"></div>;
});

export default PhaserGame;
