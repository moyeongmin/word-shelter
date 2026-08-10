import Phaser from 'phaser';
import { preloadPlayerAssets, createPlayerAnims, updatePlayerMovement } from '../features/player/playerUtils';
import { preloadSounds, playBGM } from '../features/sound/soundUtils';

export default class Camp2CaveScene extends Phaser.Scene {
    constructor() {
        super('Camp2CaveScene');
        this.spawnFrom = 'BaseCamp';
    }

    preload() {
        this.load.image('bg_camp2cave', 'assets/images/Camp2Cave.png');
        this.load.image('player_asset', 'assets/images/player.png');

        preloadPlayerAssets(this);
        preloadSounds(this);
    }

    init(data) {
        if (data && data.spawnFrom) this.spawnFrom = data.spawnFrom;
        this.upgrades = this.registry.get('upgrades') || { speed: 0 };
    }

    get playerSpeed() { return 180 + (this.upgrades.speed * 9); }

    create() {

        playBGM(this, 'bgm_travel', 0.4);

        // 1. 배경 및 맵 설정
        const bg = this.add.image(0, 0, 'bg_camp2cave').setOrigin(0, 0);
        this.physics.world.setBounds(0, 0, bg.width, bg.height);
        this.cameras.main.setBounds(0, 0, bg.width, bg.height);
        this.cameras.main.setZoom(1); 

        // 2. 포탈 설정
        this.baseCampPortal = this.add.rectangle(20, bg.height / 2, 40, 200, 0x00ff00, 0);
        this.physics.add.existing(this.baseCampPortal, true);

        this.cavePortal = this.add.rectangle(bg.width - 270, bg.height / 2 + 20, 300, 250, 0xff0000, 0);
        this.physics.add.existing(this.cavePortal, true);

        // 3. 투명 벽 그룹 생성
        this.obstacles = this.physics.add.staticGroup();

        // 맵 충돌 박스 좌표 배열 [x, y, width, height]
        const wallData = [
            [52, 346, 41, 41], [138, 327, 79, 85], [198, 305, 47, 28], [256, 256, 137, 45],
            [298, 203, 40, 58], [342, 161, 59, 51], [413, 207, 83, 41], [484, 162, 132, 39],
            [528, 120, 47, 46], [552, 46, 98, 87], [703, 89, 171, 173], [721, 197, 135, 54],
            [746, 239, 104, 34], [784, 268, 144, 38], [799, 300, 125, 31], [851, 327, 145, 28],
            [858, 345, 117, 14], [928, 299, 93, 35], [1050, 294, 156, 31], [1156, 305, 103, 21],
            [1189, 326, 105, 25], [1225, 348, 71, 20], [860, 533, 64, 142], [822, 543, 10, 147],
            [810, 493, 10, 23], [807, 537, 32, 84], [764, 721, 141, 75], [748, 661, 87, 36],
            [790, 601, 105, 72], [770, 640, 62, 14],[527, 575, 48, 47], [482, 604, 26, 23], [439, 594, 24, 26], [394, 577, 31, 26],
            [320, 544, 40, 40], [253, 534, 38, 35], [95, 592, 186, 212], [577, 710, 43, 12],
            [531, 690, 41, 43], [576, 738, 42, 48], [372, 672, 80, 47], [471, 658, 13, 28],
            [467, 719, 95, 96], [228, 582, 88, 33], [242, 684, 103, 166], [302, 696, 20, 133],
            [323, 714, 19, 100], [131, 485, 81, 15],[1068, 568, 384, 47], [901, 529, 21, 54], [930, 537, 43, 19], 
            [1207, 540, 85, 6], [1233, 529, 62, 25], [1275, 508, 110, 20], 
            [1283, 474, 70, 44], [106, 234, 193, 94], [434, 182, 30, 21],[1307, 405, 104, 128]
        ];

        // 배열을 순회하며 벽을 생성하고 물리 그룹에 추가 (알파값 0으로 완전 투명 처리)
        wallData.forEach(data => {
            const wall = this.add.rectangle(data[0], data[1], data[2], data[3], 0x0000ff, 0);
            this.physics.add.existing(wall, true);
            this.obstacles.add(wall);
        });

        // 4. 플레이어 스폰
        let startX = 60;
        let startY = bg.height / 2;
        if (this.spawnFrom === 'Cave') { 
            startX = bg.width - 160;
            startY = bg.height / 2 + 20;
        }

        this.player = this.physics.add.sprite(startX, startY, 'player_asset');
        this.player.setScale(0.15);
        this.player.body.setCollideWorldBounds(true);

        // 플레이어 히트박스 설정
        const hitBoxWidth = 140;  // 발 폭 넓이
        const hitBoxHeight = 70;  // 발 높이 두께
        this.player.body.setSize(hitBoxWidth, hitBoxHeight); 

        // X축 오프셋: (원본너비 375 - 박스너비 140) / 2 = 117.5 (정중앙 정렬)
        const offsetX = (375 - hitBoxWidth) / 2; 
        
        // Y축 오프셋: (원본높이 666 - 박스높이 70) - 여유 공간 = 맨 아래 발바닥 위치
        const offsetY = 666 - hitBoxHeight - 15;
        this.player.body.setOffset(offsetX, offsetY);

        // 플레이어와 벽 충돌 판정 연결
        this.physics.add.collider(this.player, this.obstacles);
        
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        createPlayerAnims(this); // player 애니메이션 생성
        this.keys = this.input.keyboard.addKeys('W,A,S,D,F');
    }

    update() {

        updatePlayerMovement(this.player, this.keys, this.playerSpeed); // player 이동 및 애니메이션 처리
        let vx = 0, vy = 0;
        if (this.keys.A.isDown) vx = -this.playerSpeed; else if (this.keys.D.isDown) vx = this.playerSpeed;
        if (this.keys.W.isDown) vy = -this.playerSpeed; else if (this.keys.S.isDown) vy = this.playerSpeed;
        this.player.body.setVelocity(vx, vy);

        if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
            if (Phaser.Math.Distance.BetweenPoints(this.player, this.baseCampPortal) < 60) {
                this.scene.start('BaseCampScene', { spawnFrom: 'Camp2Cave' });
            }
            if (Phaser.Math.Distance.BetweenPoints(this.player, this.cavePortal) < 130) {
                this.scene.start('CaveScene', { spawnFrom: 'Camp2Cave' });
            }
        }
    }
}