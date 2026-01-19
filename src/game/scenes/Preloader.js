import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        // Sem UI de preloader para evitar flash antes do jogo.
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        this.load.image('logo', 'logo.png');
        this.load.image('star', 'star.png');
        this.load.image('planet', 'planet.png');

        // Game background
        this.load.image('game_bg', 'backgrounds/initialScreen.png');

        // Pilot message images for tutorial (circular portraits)
        this.load.image('pilot_kaio', 'characters/message/Kaio.png');
        this.load.image('pilot_cesar', 'characters/message/Cesar.png');
        this.load.image('pilot_kyra', 'characters/message/Kyra.png');

        // Ship images for gameplay
        this.load.image('ship_kaio', 'characters/spaceShip/Kaio.jpeg');
        this.load.image('ship_cesar', 'characters/spaceShip/cesar.jpeg');
        this.load.image('ship_kyra', 'characters/spaceShip/kyra.jpeg');
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Pula direto para o Game (menu já está no React)
        this.scene.start('Game');
    }
}
