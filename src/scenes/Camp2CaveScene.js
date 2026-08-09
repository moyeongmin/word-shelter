import Phaser from 'phaser';

export default class Camp2CaveScene extends Phaser.Scene {
    constructor() {
        super('Camp2CaveScene');
        this.spawnFrom = 'BaseCamp';
    }

    preload() {
        this.load.image('bg_camp2cave', 'assets/images/Camp2Cave.png');
        this.load.image('player_asset', 'assets/images/player.png');
    }

    init(data) {
        if (data && data.spawnFrom) this.spawnFrom = data.spawnFrom;
        this.upgrades = this.registry.get('upgrades') || { speed: 0 };
    }

    get playerSpeed() { return 180 + (this.upgrades.speed * 9); }

    create() {
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

        // 3. 투명 벽 그룹 생성 (이 그룹에 박스들을 넣을 거야)
        this.obstacles = this.physics.add.staticGroup();

        this.obstacles = this.physics.add.staticGroup();

        // 🌟 네가 데브툴로 깎아낸 30개의 맵 충돌 박스 좌표 배열 [x, y, width, height]
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

        // 🌟 배열을 순회하며 벽을 생성하고 물리 그룹에 추가
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
        this.player.setScale(0.25);
        this.player.body.setCollideWorldBounds(true);

        // 플레이어 히트박스 설정
        const hitBoxWidth = this.player.width * 0.25;
        const hitBoxHeight = 30; 
        this.player.body.setSize(hitBoxWidth, hitBoxHeight); 

        const offsetX = this.player.width * 0.38; 
        const offsetY = this.player.height - 110;  
        this.player.body.setOffset(offsetX, offsetY);

        // 플레이어와 벽 충돌 판정 연결
        this.physics.add.collider(this.player, this.obstacles);
        
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.keys = this.input.keyboard.addKeys('W,A,S,D,F');

        // ==========================================
        // 🛠️ 실시간 충돌 박스 제작 데브 툴 탑재 
        // ==========================================
        this.devToolActive = true;  // 🌟 다 그렸다면 나중에 false로 변경
        this.boxStart = null;
        this.devGraphics = this.add.graphics().setDepth(9999);

        // 상단 안내 메시지
        this.add.text(10, 10, '🛠️ 데브툴 켜짐: 마우스 드래그로 벽 생성', { 
            fontSize: '16px', fill: '#fff', backgroundColor: '#ff0000', padding: { x: 5, y: 5 } 
        }).setScrollFactor(0).setDepth(9999);

        this.input.on('pointerdown', (pointer) => {
            if (!this.devToolActive) return;
            this.boxStart = { x: pointer.worldX, y: pointer.worldY };
        });

        this.input.on('pointermove', (pointer) => {
            if (!this.devToolActive || !this.boxStart) return;
            this.devGraphics.clear();
            this.devGraphics.lineStyle(2, 0x00ff00, 1);
            this.devGraphics.fillStyle(0x00ff00, 0.3);
            
            const w_box = Math.abs(pointer.worldX - this.boxStart.x);
            const h_box = Math.abs(pointer.worldY - this.boxStart.y);
            const x = Math.min(this.boxStart.x, pointer.worldX);
            const y = Math.min(this.boxStart.y, pointer.worldY);
            
            this.devGraphics.fillRect(x, y, w_box, h_box);
            this.devGraphics.strokeRect(x, y, w_box, h_box);
        });

        this.input.on('pointerup', (pointer) => {
            if (!this.devToolActive || !this.boxStart) return;
            
            const w_box = Math.abs(pointer.worldX - this.boxStart.x);
            const h_box = Math.abs(pointer.worldY - this.boxStart.y);
            const x = Math.min(this.boxStart.x, pointer.worldX);
            const y = Math.min(this.boxStart.y, pointer.worldY);

            if (w_box > 5 && h_box > 5) {
                const centerX = x + w_box / 2;
                const centerY = y + h_box / 2;

                // 1. 임시 충돌 박스를 게임상에 즉시 반영 (파란색, 알파 0.5)
                const box = this.add.rectangle(centerX, centerY, w_box, h_box, 0x0000ff, 0.5);
                this.physics.add.existing(box, true); 
                this.obstacles.add(box); // 장애물 그룹에 편입

                // 2. 브라우저 콘솔창(F12)에 복사해서 쓸 수 있는 코드를 예쁘게 출력!
                const codeSnippet = `const wall = this.add.rectangle(${centerX.toFixed(0)}, ${centerY.toFixed(0)}, ${w_box.toFixed(0)}, ${h_box.toFixed(0)}, 0x0000ff, 0);\nthis.physics.add.existing(wall, true);\nthis.obstacles.add(wall);`;
                
                console.log('%c👇 코드를 create() 안에 붙여넣으세요 👇', 'background: #222; color: #00ff00; font-size: 14px; font-weight: bold;');
                console.log(codeSnippet);
            }
            this.boxStart = null;
            this.devGraphics.clear();
        });
    }

    update() {
        let vx = 0, vy = 0;
        if (this.keys.A.isDown) vx = -this.playerSpeed; else if (this.keys.D.isDown) vx = this.playerSpeed;
        if (this.keys.W.isDown) vy = -this.playerSpeed; else if (this.keys.S.isDown) vy = this.playerSpeed;
        this.player.body.setVelocity(vx, vy);

        if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
            if (Phaser.Math.Distance.BetweenPoints(this.player, this.baseCampPortal) < 60) {
                this.scene.start('BaseCampScene', { spawnFrom: 'Camp2Cave' });
            }
            if (Phaser.Math.Distance.BetweenPoints(this.player, this.cavePortal) < 80) {
                this.scene.start('CaveScene', { spawnFrom: 'Camp2Cave' });
            }
        }
    }
}