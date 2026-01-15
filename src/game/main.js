import { Boot } from "./scenes/Boot";
import { Game } from "./scenes/Game";
import { GameOver } from "./scenes/GameOver";
import { MainMenu } from "./scenes/MainMenu";
import Phaser from "phaser";
import { Preloader } from "./scenes/Preloader";

// Detecta se é mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (window.innerWidth < window.innerHeight);

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config = {
    type: Phaser.AUTO,
    width: isMobile ? window.innerWidth : 1024,
    height: isMobile ? window.innerHeight : 768,
    parent: "game-container",
    backgroundColor: "#000000",
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        fullscreenTarget: "app",
        width: "100%",
        height: "100%",
    },
    input: {
        activePointers: 3, // Suporta multi-touch
    },
    scene: [Boot, Preloader, MainMenu, Game, GameOver],
};

const StartGame = (parent) => {
    return new Phaser.Game({ ...config, parent });
};

export default StartGame;
