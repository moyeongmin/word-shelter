import Phaser from 'phaser';
import BaseCampScene from './scenes/BaseCampScene.js';
import ForestScene from './scenes/ForestScene.js';
import NorthForestScene from './scenes/NorthForestScene.js';

import './ui/style.css';

const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 600,
    parent: 'game-container',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
        }
    },
    // BaseCampScene이 배열의 첫 번째이므로 게임 시작 시 가장 먼저 실행됨
    scene: [BaseCampScene, ForestScene, NorthForestScene] 
};

const game = new Phaser.Game(config);