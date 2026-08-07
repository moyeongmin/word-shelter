import Phaser from 'phaser';
import StartScene from './scenes/StartScene.js';
import BaseCampScene from './scenes/BaseCampScene.js';
import ForestScene from './scenes/ForestScene.js';
import DesertScene from './scenes/DesertScene.js';
import CaveScene from './scenes/CaveScene.js';
import Camp2CaveScene from './scenes/Camp2CaveScene.js';

import './ui/style.css';


const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 960,
    height: 600,
    pixelArt: true,
    roundPixels: true,
    physics: { 
        default: 'arcade', 
<<<<<<< Updated upstream
        arcade: { debug: false } 
=======
        arcade: { debug: true} 
>>>>>>> Stashed changes
    },
    scene: [StartScene, BaseCampScene, ForestScene, DesertScene, CaveScene, Camp2CaveScene]
};

const game = new Phaser.Game(config);