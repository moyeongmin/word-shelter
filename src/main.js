import Phaser from 'phaser';
import StartScene from './scenes/StartScene.js';
import BaseCampScene from './scenes/BaseCampScene.js';
import ForestScene from './scenes/ForestScene.js';
import NorthForestScene from './scenes/NorthForestScene.js';
import CaveScene from './scenes/CaveScene.js';
import Camp2CaveScene from './scenes/Camp2CaveScene.js';
import EndingScene from './scenes/EndingScene.js';
import MainMenuScene from './scenes/MainMenuScene.js';
import GalleryScene from './scenes/GalleryScene.js';

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
        arcade: {
            gravity: { y: 0 },
            debug: true,
        }
    },
    scene: [MainMenuScene, GalleryScene, StartScene, BaseCampScene, ForestScene, NorthForestScene, CaveScene, Camp2CaveScene, EndingScene]
};

const game = new Phaser.Game(config);