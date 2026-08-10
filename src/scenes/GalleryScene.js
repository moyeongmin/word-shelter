import Phaser from 'phaser';

export default class GalleryScene extends Phaser.Scene {
    constructor() {
        super('GalleryScene');
    }

    create() {
        console.log('🖼️ GalleryScene create 실행');

        document.getElementById('main-menu-screen')?.classList.add('hidden');
        document.getElementById('gallery-screen')?.classList.remove('hidden');
        document.getElementById('hud-container')?.classList.add('hidden');

        const backButton = document.getElementById('gallery-back-btn');

        if (backButton) {
            backButton.onclick = () => {
                document.getElementById('gallery-screen')?.classList.add('hidden');

                this.scene.start('MainMenuScene');
            };
        }
    }
}