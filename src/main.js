import Phaser from 'phaser';
import StartScene from './scenes/StartScene.js';
import BaseCampScene from './scenes/BaseCampScene.js';
import ForestScene from './scenes/ForestScene.js';
import NorthForestScene from './scenes/NorthForestScene.js';
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
        arcade: {
            gravity: { y: 0 },
            debug: false,
        }
    },
    // BaseCampScene이 배열의 첫 번째이므로 게임 시작 시 가장 먼저 실행됨
        arcade: { debug: true } 
    },
    scene: [StartScene, BaseCampScene, ForestScene, NorthForestScene, CaveScene, Camp2CaveScene]
};

const game = new Phaser.Game(config);