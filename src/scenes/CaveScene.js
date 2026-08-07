import Phaser from 'phaser';

export default class CaveScene extends Phaser.Scene {
    constructor() {
        super('CaveScene');
        this.spawnFrom = 'Camp2Cave';
    }

    preload() {
        this.load.image('bg_cave', 'assets/images/Cave.png');
        this.load.image('player_asset', 'assets/images/player.png');
        this.load.image('item_iron', 'assets/images/item_iron.png');
        this.load.image('item_stone', 'assets/images/item_stone.png');
        this.load.image('item_earth', 'assets/images/item_earth.png');
    }

    init(data) {
        if (data && data.spawnFrom) this.spawnFrom = data.spawnFrom;
        this.upgrades = this.registry.get('upgrades') || { speed: 0 };
        
        // 전역 레지스트리에서 인벤토리와 도감 데이터 가져오기
        this.wordInventory = this.registry.get('wordInventory') || {};
        this.discoveredWords = this.registry.get('discoveredWords') || [];
    }

    get playerSpeed() { return 120 + (this.upgrades.speed * 9); }

    create() {
        // 1. 배경 및 맵 설정
        const bg = this.add.image(0, 0, 'bg_cave').setOrigin(0, 0);
        this.physics.world.setBounds(0, 0, bg.width, bg.height);
        this.cameras.main.setBounds(0, 0, bg.width, bg.height);
        this.cameras.main.setZoom(2); // 줌 2배 고정

        // 2. 포탈 설정 (왼쪽 위 입구)
        this.exitPortal = this.add.rectangle(50, 60, 60, 80, 0x00ff00, 0);
        this.physics.add.existing(this.exitPortal, true);

        // 🌟 장애물(벽) 그룹 생성 및 데이터 저장
        this.obstacles = this.physics.add.staticGroup();

        // 맵 외곽선
        this.obstacles.add(this.add.rectangle(bg.width / 2, -10, bg.width, 20, 0x0000ff, 0));
        this.obstacles.add(this.add.rectangle(bg.width / 2, bg.height + 10, bg.width, 20, 0x0000ff, 0));
        this.obstacles.add(this.add.rectangle(-10, bg.height / 2, 20, bg.height, 0x0000ff, 0));
        this.obstacles.add(this.add.rectangle(bg.width + 10, bg.height / 2, 20, bg.height, 0x0000ff, 0));

        // 🌟 벽 데이터를 클래스 변수로 저장 (스폰 검사용)
        this.caveWallData = [
            [332, 39, 503, 59], [155, 71, 40, 34], [205, 77, 37, 41], [293, 69, 79, 24],
            [291, 84, 45, 20], [551, 140, 69, 150], [475, 181, 85, 68], [422, 191, 21, 51],
            [567, 223, 42, 24], [577, 331, 25, 204], [558, 408, 17, 55], [543, 416, 17, 37],
            [430, 426, 206, 18], [135, 426, 258, 16], [38, 410, 64, 15], [29, 398, 43, 7],
            [22, 385, 32, 13], [21, 393, 38, 6], [13, 238, 22, 285], [35, 220, 24, 95],
            [64, 220, 34, 71], [90, 229, 19, 61], [106, 234, 17, 52], [137, 233, 50, 45],
            [168, 216, 29, 67], [142, 206, 24, 13], [199, 177, 59, 11], [205, 169, 44, 9],
            [202, 193, 51, 37], [195, 224, 22, 21], [559, 313, 22, 32], [524, 405, 42, 28],
            [248, 408, 51, 27], [287, 144, 28, 46], [320, 155, 44, 73], [353, 168, 24, 48],
            [330, 201, 28, 27], [403, 226, 24, 22], [351, 226, 18, 16]
        ];

        this.caveWallData.forEach(data => {
            const wall = this.add.rectangle(data[0], data[1], data[2], data[3], 0x0000ff, 0);
            this.physics.add.existing(wall, true);
            this.obstacles.add(wall);
        });


        // 4. 플레이어 스폰
        let startX = 100;
        let startY = 100; 

        if (this.spawnFrom === 'Camp2Cave') {
            startX = 80; // 포탈 근처로 시작 위치 살짝 조정
            startY = 80;
        }

        this.player = this.physics.add.sprite(startX, startY, 'player_asset');
        this.player.setScale(0.13); 
        this.player.body.setCollideWorldBounds(true);

        // 🌟 발밑으로 충돌 범위(Hitbox) 축소 (다른 맵들과 완벽히 동일한 수치)
        const hitBoxWidth = this.player.width * 0.25;
        const hitBoxHeight = 30; 
        this.player.body.setSize(hitBoxWidth, hitBoxHeight); 

        const offsetX = this.player.width * 0.38; 
        const offsetY = this.player.height - 110;  
        this.player.body.setOffset(offsetX, offsetY);


        // 5. 충돌 및 카메라 설정
        this.physics.add.collider(this.player, this.obstacles);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        this.keys = this.input.keyboard.addKeys('W,A,S,D,F');

        // ==========================================
        // 🌟 파밍용 원소 스폰 시스템 (좌표 및 크기 수정)
        // ==========================================
        this.materials = this.physics.add.group();

        // 1. 우상단 안쪽 구석: 철 스폰 (기본 크기 0.15)
        this.time.addEvent({ 
            delay: 6000, 
            callback: () => this.spawnItemAround(480, 110, 45, '철', 'item_iron', 5, 0.15), 
            loop: true 
        });

        // 2. 우하단 안쪽 구석: 돌 스폰 (크기 2배: 0.3)
        this.time.addEvent({ 
            delay: 5000, 
            callback: () => this.spawnItemAround(510, 360, 45, '돌', 'item_stone', 7, 0.24), 
            loop: true 
        });

        // 3. 좌하단 안쪽 구석: 흙 스폰 (크기 1/4: 0.0375)
        this.time.addEvent({ 
            delay: 4000, 
            callback: () => this.spawnItemAround(70, 350, 45, '흙', 'item_earth', 8, 0.04), 
            loop: true 
        });
    }

    update() {
        let vx = 0, vy = 0;
        if (this.keys.A.isDown) vx = -this.playerSpeed; else if (this.keys.D.isDown) vx = this.playerSpeed;
        if (this.keys.W.isDown) vy = -this.playerSpeed; else if (this.keys.S.isDown) vy = this.playerSpeed;
        this.player.body.setVelocity(vx, vy);

        if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
            
            // 🌟 1. 바닥에 떨어진 재료 줍기
            this.materials.getChildren().forEach((item) => {
                if (item.active && Phaser.Math.Distance.BetweenPoints(this.player, item) < 50) {
                    
                    // 인벤토리 증가 및 도감 등록
                    this.wordInventory[item.name] = (this.wordInventory[item.name] || 0) + 1;
                    if (!this.discoveredWords.includes(item.name)) {
                        this.discoveredWords.push(item.name);
                    }
                    
                    // 글로벌 레지스트리에 데이터 저장 (맵을 이동해도 유지되도록)
                    this.registry.set('wordInventory', this.wordInventory);
                    this.registry.set('discoveredWords', this.discoveredWords);

                    console.log(`✨ [${item.name}] 획득! (보유량: ${this.wordInventory[item.name]}개)`);
                    
                    // 사운드 효과가 있다면 재생
                    // this.sound.play('sfx_pickup', { volume: 0.5 });
                    
                    item.destroy(); 
                }
            });

            // 🌟 2. 입구 근처에서 F 누르면 동굴 밖(Camp2Cave)으로 나감
            if (Phaser.Math.Distance.BetweenPoints(this.player, this.exitPortal) < 60) {
                this.scene.start('Camp2CaveScene', { spawnFrom: 'Cave' });
            }
        }
    }

    // 🌟 겹침 검사(벽 + 다른 아이템) + 개별 크기 적용이 추가된 스폰 함수
    spawnItemAround(x, y, radius, itemName, textureKey, maxLimit, targetScale = 1) {
        if (this.materials.getChildren().filter(m => m.name === itemName).length >= maxLimit) return;
        
        let spawnX, spawnY;
        let isValid = false;
        let attempts = 0;

        // 벽과 겹치지 않고, 다른 아이템과도 겹치지 않는 좌표를 찾을 때까지 최대 25번 재시도
        while (!isValid && attempts < 25) {
            const angle = Math.random() * Math.PI * 2;
            const r = 10 + Math.random() * (radius - 10);
            spawnX = x + Math.cos(angle) * r;
            spawnY = y + Math.sin(angle) * r;

            isValid = true;
            
            // 1. 벽 데이터(this.caveWallData)와 스폰 좌표 충돌 검사
            for (let i = 0; i < this.caveWallData.length; i++) {
                const [wx, wy, ww, wh] = this.caveWallData[i];
                if (spawnX > wx - ww / 2 - 10 && spawnX < wx + ww / 2 + 10 &&
                    spawnY > wy - wh / 2 - 10 && spawnY < wy + wh / 2 + 10) {
                    isValid = false;
                    break; 
                }
            }

            // 🌟 2. 기존에 떨어진 아이템들과의 거리 검사 (여기 추가됨!)
            if (isValid) {
                const existingItems = this.materials.getChildren();
                for (let i = 0; i < existingItems.length; i++) {
                    const item = existingItems[i];
                    // 스폰될 위치와 기존 아이템 사이의 거리가 25픽셀 이하라면 너무 가깝다고 판정
                    if (Phaser.Math.Distance.Between(spawnX, spawnY, item.x, item.y) < 35) {
                        isValid = false;
                        break;
                    }
                }
            }

            attempts++;
        }

        if (!isValid) return; 

        const item = this.physics.add.sprite(spawnX, spawnY, textureKey);
        item.name = itemName;
        item.setScale(0); 

        // 단축 속성(scale) 대신 scaleX, scaleY를 명시적으로 분리해서 확실하게 쪼그라들게 적용!
        this.tweens.add({ 
            targets: item, 
            scaleX: targetScale, 
            scaleY: targetScale, 
            duration: 400, 
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: item,
                    y: item.y - 6,
                    duration: 1200 + Math.random() * 400,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });

        this.materials.add(item);
    }
}