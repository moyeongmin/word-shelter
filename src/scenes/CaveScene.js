import Phaser from 'phaser';
import { preloadPlayerAssets, createPlayerAnims, updatePlayerMovement } from '../features/player/playerUtils';

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

        preloadPlayerAssets(this);
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

        // 3. 플레이어 스폰 위치 결정
        let startX = 100;
        let startY = 100; 

        if (this.spawnFrom === 'Camp2Cave') {
            startX = 80; 
            startY = 80;
        }

        // 🌟 1. 생성할 때 기본 이미지를 char_walk_front1로 지정
        this.player = this.physics.add.sprite(startX, startY, 'char_walk_front1');
        
        // 🌟 2. 스케일을 0.25로 통일 (너무 작으면 0.2 ~ 0.3 사이 조절)
        this.player.setScale(0.08); 
        this.player.body.setCollideWorldBounds(true);

        // ==========================================
        // 🌟 3. 375x666 원본 해상도 기준 '정밀 발밑' 히트박스 세팅
        // ==========================================
        const hitBoxWidth = 140;  // 발 폭 넓이
        const hitBoxHeight = 70;  // 발 높이 두께
        this.player.body.setSize(hitBoxWidth, hitBoxHeight); 

        // X축 오프셋: (원본너비 375 - 박스너비 140) / 2 = 117.5 (좌우 정중앙)
        const offsetX = (375 - hitBoxWidth) / 2; 
        
        // Y축 오프셋: 666(원본높이) - 70(박스높이) - 15(미세 여유공간) = 581 (발바닥 위치)
        const offsetY = 666 - hitBoxHeight - 15; 
        
        this.player.body.setOffset(offsetX, offsetY);


        // 5. 충돌 및 카메라 설정
        this.physics.add.collider(this.player, this.obstacles);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        createPlayerAnims(this);

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

    // ==========================================
    // 🌟 획득 시 파티클 폭발 효과 (에러 방지 완벽판)
    // ==========================================
    createPickupBurst(x, y, targetColor) {
        let colorVal = 0xffffff; // 기본 색상 (흰색)
        
        // 문자열('#ff0000')이 들어왔을 때
        if (typeof targetColor === 'string') {
            colorVal = Phaser.Display.Color.HexStringToColor(targetColor).color;
        } 
        // 숫자(0xff0000)가 들어왔을 때
        else if (typeof targetColor === 'number') {
            colorVal = targetColor;
        }

        this.add.particles(x, y, 'pixel', {
            tint: colorVal,
            speed: { min: 50, max: 150 },
            scale: { start: 1.2, end: 0 },
            lifespan: 500,
            blendMode: 'ADD',
            duration: 100
        });
    }

    addDiscoveredWord(word) {
        // 만약 현재 씬에 discoveredWords 배열이 세팅 안 되어 있다면 전역(Registry)에서 가져오기
        if (!this.discoveredWords) {
            this.discoveredWords = this.registry.get('discoveredWords') || [];
        }

        // 도감에 없는 새로운 단어(재료)라면 배열에 추가
        if (!this.discoveredWords.includes(word)) {
            this.discoveredWords.push(word);
        }

        // 다른 맵으로 이동해도 유지되도록 전역 저장소에 세이브
        this.registry.set('discoveredWords', this.discoveredWords);
    }

    // ==========================================
    // 🌟 획득 시 머리 위 텍스트 팝업 (에러 방지 완벽판)
    // ==========================================
    showFloatingText(x, y, message, targetColor) {
        let fillStr = '#ffffff'; // 기본 색상 (흰색)
        
        // 문자열('#ff0000')이 들어왔을 때
        if (typeof targetColor === 'string') {
            fillStr = targetColor;
        } 
        // 숫자(0xff0000)가 들어왔을 때 변환
        else if (typeof targetColor === 'number') {
            fillStr = '#' + targetColor.toString(16).padStart(6, '0');
        }

        const text = this.add.text(x, y - 20, message, {
            fontSize: '15px',
            fill: fillStr,
            fontStyle: 'bold'
        }).setOrigin(0.5).setStroke('#000000', 3);

        this.tweens.add({
            targets: text,
            y: y - 60,
            alpha: 0,
            duration: 1000,
            onComplete: () => text.destroy()
        });
    }

    update() {

        updatePlayerMovement(this.player, this.keys, this.playerSpeed);

        let vx = 0, vy = 0;
        if (this.keys.A.isDown) vx = -this.playerSpeed; else if (this.keys.D.isDown) vx = this.playerSpeed;
        if (this.keys.W.isDown) vy = -this.playerSpeed; else if (this.keys.S.isDown) vy = this.playerSpeed;
        this.player.body.setVelocity(vx, vy);

        if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
            
            // 🌟 1. 바닥에 떨어진 재료 줍기
            this.materials.getChildren().forEach((mat) => {
                if (mat.active && Phaser.Math.Distance.BetweenPoints(this.player, mat) < 55) {
                    
                    // 인벤토리 & 도감 추가
                    this.wordInventory[mat.name] = (this.wordInventory[mat.name] || 0) + 1;
                    this.addDiscoveredWord(mat.name);

                    // 글로벌 Registry 동기화
                    this.registry.set('wordInventory', this.wordInventory);
                    this.registry.set('discoveredWords', this.discoveredWords);

                    // 🌟 에러 방지: colorHex가 없으면 color나 기본 흰색('#ffffff') 사용
                    const effectColor = mat.colorHex || mat.color || '#ffffff';

                    // 획득 이펙트 & 텍스트 띄우기
                    this.createPickupBurst(mat.x, mat.y, effectColor);
                    this.showFloatingText(mat.x, mat.y, `+ ${mat.name}`, effectColor);

                    // 즉시 세이브
                    if (typeof this.saveGameData === 'function') {
                        this.saveGameData();
                    }

                    mat.destroy();
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
        item.setScale(0); // 0에서 시작해서 팡 커지게 설정

        // 🌟 32x32 아이콘이 큼직하게 보이도록 scale을 1.5 ~ 2로 설정합니다.
        const finalScale = 0.7; // 원하시는 크기에 따라 1.5 ~ 2.2 사이로 조절 가능합니다!

        this.tweens.add({ 
            targets: item, 
            scale: finalScale, // 단축 속성 하나로 통일하여 확실하게 키움!
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