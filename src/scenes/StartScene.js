import Phaser from 'phaser';

export default class StartScene extends Phaser.Scene {
    constructor() {
        super('StartScene');
    }

    create() {
        // 🌟 1. 글로벌 데이터 초기화 (게임 최초 실행 시 한 번만)
        if (!this.registry.get('isInitialized')) {
            this.registry.set('wordInventory', {});
            this.registry.set('discoveredWords', []); 
            this.registry.set('discoveredRecipes', {});
            this.registry.set('replicators', [{ item: null, lastTick: 0 }, { item: null, lastTick: 0 }]);
            this.registry.set('upgrades', { speed: 0, time: 0, yield: 0, slot2: false });
            this.registry.set('discoveryOrder', []); 
            this.registry.set('isInitialized', true);
        }

        // 🌟 2. 몽환적인 배경 파티클 연출
        if (!this.textures.exists('pixel')) {
            const g = this.make.graphics({x: 0, y: 0, add: false});
            g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 4, 4); g.generateTexture('pixel', 4, 4);
        }

        this.add.particles(0, 0, 'pixel', {
            x: { min: 0, max: 960 }, y: { min: 0, max: 600 },
            tint: [0x646cff, 0x8b5cf6, 0xff3366],
            speed: { min: 10, max: 30 }, angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 }, lifespan: 4000, blendMode: 'ADD', frequency: 100
        });

        // 🌟 3. DOM 시작 버튼 이벤트 연결
        const startScreen = document.getElementById('start-screen');
        const startBtn = document.getElementById('game-start-btn');

        // 중복 이벤트 방지를 위해 기존 이벤트 클리어
        startBtn.replaceWith(startBtn.cloneNode(true));
        const newStartBtn = document.getElementById('game-start-btn');

        newStartBtn.addEventListener('click', () => {
            // 페이드아웃 연출
            startScreen.style.opacity = '0';
            
            // 1초 뒤 DOM을 숨기고 메인 씬으로 전환
            setTimeout(() => {
                startScreen.classList.add('hidden');
                startScreen.style.opacity = '1'; // 다음을 위해 복구
                this.scene.start('BaseCampScene');
            }, 1000);
        });
    }
}