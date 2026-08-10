import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        console.log('🏠 MainMenuScene create 실행');

        this.cameras.main.setBackgroundColor('#02060b');

        const mainMenuScreen = document.getElementById('main-menu-screen');
        const hudContainer = document.getElementById('hud-container');
        const questHud = document.getElementById('quest-hud-box');
        const alchemyDesk = document.getElementById('alchemy-desk-screen');
        const resetStorageButton = document.getElementById('reset-storage-btn');

        mainMenuScreen?.classList.remove('hidden');
        hudContainer?.classList.add('hidden');
        questHud?.classList.add('hidden');
        alchemyDesk?.classList.add('hidden');

        const startButton = document.getElementById('game-start-btn');
        const galleryButton = document.getElementById('gallery-btn');

        console.log('▶ 게임 시작 버튼:', startButton);
        console.log('▦ 갤러리 버튼:', galleryButton);

        if (startButton) {
            startButton.onclick = () => {
                console.log('▶ 게임 시작 클릭');

                mainMenuScreen?.classList.add('hidden');

                this.cameras.main.fadeOut(350, 0, 0, 0);

                this.time.delayedCall(350, () => {
                    console.log('🎬 StartScene 이동');
                    this.scene.start('StartScene');
                });
            };
        }

        if (galleryButton) {
            galleryButton.onclick = () => {
                console.log('▦ 갤러리 클릭');

                mainMenuScreen?.classList.add('hidden');

                this.scene.start('GalleryScene');
            };
        }
        
    }
}