import Phaser from 'phaser';

export default class BaseCampScene extends Phaser.Scene {
    constructor() {
        super('BaseCampScene');
        this.spawnFrom = 'Start';
    }

    preload() {
        // 배경 이미지 (BaseCamp.png)와 플레이어 로드
        this.load.image('bg_basecamp', 'assets/images/BaseCamp.png');
        this.load.image('player_asset', 'assets/images/player.png'); 
    }

    init(data) {
        if (data && data.spawnFrom) this.spawnFrom = data.spawnFrom; 
        
        // 도감/인벤토리 레지스트리 설정 (기존 유지)
        if (!this.registry.get('isInitialized')) {
            this.registry.set('wordInventory', {});
            this.registry.set('discoveredWords', []); 
            this.registry.set('upgrades', { speed: 0, time: 0, yield: 0, slot2: false });
            this.registry.set('isInitialized', true);
        }
        this.wordInventory = this.registry.get('wordInventory');
        this.upgrades = this.registry.get('upgrades');
    }

    get playerSpeed() { return 120 + (this.upgrades.speed * 9); } 

    create() {
        // [1] 배경 렌더링 및 월드 설정
        const bg = this.add.image(0, 0, 'bg_basecamp').setOrigin(0, 0);

        this.physics.world.setBounds(0, 0, bg.width, bg.height);
        this.cameras.main.setBounds(0, 0, bg.width, bg.height);
        
        // 🌟 카메라 줌 2배 유지
        this.cameras.main.setZoom(1.5); 

        // [2] 🌟 플레이어 생성 (크기 0.15 고정) 🌟
        // 스폰 위치는 캠프 중앙
        let startX = bg.width / 2;
        let startY = bg.height / 2; 
        
        this.player = this.physics.add.sprite(startX, startY, 'player_asset'); 
        this.player.setScale(0.15); 
        this.player.body.setCollideWorldBounds(true); 

        // 🌟 1. 충돌 박스 크기 조절 (원본 이미지 크기 기준)
        // 예: 가로폭은 원본의 절반 정도, 세로는 발끝 부분만 (예: 20px)
        const hitBoxWidth = this.player.width * 0.25;
        const hitBoxHeight = 30; // 원본 이미지의 절반
        this.player.body.setSize(hitBoxWidth, hitBoxHeight); 

        // 🌟 2. x축 오프셋을 오른쪽으로 확 밀어줌 (왼쪽 빈 공간 생성)
        // offsetX 숫자를 키울수록 충돌 박스가 오른쪽으로 이동해!
        const offsetX = this.player.width * 0.38; // 👈 이 숫자를 조절해서 좌우 위치를 딱 맞춰봐!
        const offsetY = this.player.height - 110;  
        this.player.body.setOffset(offsetX, offsetY);

        // [3] 🌟 눈에 보이는 충돌 경계선 세팅 (디버깅 모드) 🌟
        // Static Group 생성
        this.debugBoundaries = this.physics.add.staticGroup();

        // 💡 팁: 색상을 0x0000ff(파란색), 알파를 0.5로 두어 눈에 보이게 합니다.
        // 이 파란 박스들의 x, y, width, height 숫자를 수정해서 실제 지형에 맞추세요.
        // 좌표를 다 맞춘 후 마지막 '0.5'를 '0'으로 바꾸면 투명해집니다.

        const wallThickness = 40; // 벽 두께

        // --- A. 맵 외곽 테두리 (포탈 구역 비워둠) ---

        // 상단 벽: 북쪽 포탈(NorthSide) 가도록 중앙 비움
        // (x중심, y중심, 가로, 세로, 색상, 알파)
        const topWallLeft = this.add.rectangle(bg.width * 0.23, wallThickness/2, bg.width * 0.4, wallThickness, 0x0000ff, 0.5);
        const topWallLeft2 = this.add.rectangle(bg.width * 0.2, bg.height * 0.15, bg.width * 0.4, 100, 0x0000ff, 0.5);

        // const topWallLeft4 = this.add.rectangle(bg.width * 0.2, bg.height * 0.15, bg.width * 0.4, 30, 0x0000ff, 0.5);

        const topWallRight = this.add.rectangle(bg.width * 0.8, wallThickness/2, bg.width * 0.47, wallThickness, 0x0000ff, 0.5);
        const topWallRight2 = this.add.rectangle(bg.width * 0.8, bg.height * 0.086, bg.width * 0.42, 30, 0x0000ff, 0.5);
        // 💡 중앙 bg.width * 0.4 ~ 0.6 구역이 북쪽 포탈입니다.

        // 하단 벽
        const bottomWall = this.add.rectangle(bg.width *0.3, bg.height - wallThickness/2, 270, 49, 0x0000ff, 0.5);
        const bottomWall2 = this.add.rectangle(bg.width *0.3, bg.height * 0.9, 210, 30, 0x0000ff, 0.5);
        const bottomWall3 = this.add.rectangle(bg.width *0.25, bg.height * 0.86, 200, 20, 0x0000ff, 0.5);

        const bottomWallRight = this.add.rectangle(bg.width * 0.7, bg.height - wallThickness/3, 265, 30, 0x0000ff, 0.5);
        const bottomWallRight2 = this.add.rectangle(bg.width * 0.7, bg.height * 0.94, 200, 20, 0x0000ff, 0.5);
        const bottomWallRight3 = this.add.rectangle(bg.width * 0.77, bg.height * 0.91, 130, 20, 0x0000ff, 0.5);
        const bottomWallRight4 = this.add.rectangle(bg.width * 0.77, bg.height * 0.88, 100, 20, 0x0000ff, 0.5);

        // 좌측 벽
        const leftWall = this.add.rectangle(bg.width * 0.15, bg.height * 0.2, 30, 550, 0x0000ff, 0.5);
        const leftWall2 = this.add.rectangle(bg.width * 0.17, bg.height * 0.63, 20, 40, 0x0000ff, 0.5);
        const leftWall3 = this.add.rectangle(bg.width * 0.18, bg.height * 0.755, 34, 100, 0x0000ff, 0.5);
        const leftWall4 = this.add.rectangle(bg.width * 0.2, bg.height * 0.82, 40, 30, 0x0000ff, 0.5);

        // 우측 벽: 동쪽 포탈(Camp2Cave) 가도록 중앙 비움
        const rightWallTop = this.add.rectangle(bg.width - wallThickness/2, bg.height * 0.2, 165, bg.height * 0.44, 0x0000ff, 0.5);
        const rightWallBottom = this.add.rectangle(bg.width - wallThickness/2, bg.height * 0.8, 300, bg.height * 0.37, 0x0000ff, 0.5);
        const rightWallBottom2 = this.add.rectangle(bg.width - wallThickness/2, bg.height * 0.58, 230, 40, 0x0000ff, 0.5); 
        const rightWallBottom3 = this.add.rectangle(bg.width * 0.82, bg.height * 0.85, 30, 120, 0x0000ff, 0.5);
        // 💡 중앙 bg.height * 0.4 ~ 0.6 구역이 동쪽 포탈입니다.

        const leftRock = this.add.rectangle(bg.width * 0.22, bg.height * 0.29, 30, 70, 0x0000ff, 0.5);
        const leftRock2 = this.add.rectangle(bg.width * 0.282, bg.height * 0.275, 34, 35, 0x0000ff, 0.5);
        const leftRock3 = this.add.rectangle(bg.width * 0.315, bg.height * 0.28, 27, 20, 0x0000ff, 0.5);
        const leftGrass = this.add.rectangle(bg.width * 0.2, bg.height * 0.34, 70, 30, 0x0000ff, 0.5);
        const leftGrass2 = this.add.rectangle(bg.width * 0.183, bg.height * 0.5, 40, 65, 0x0000ff, 0.5);
        const rightGrass = this.add.rectangle(bg.width * 0.69, bg.height * 0.15, 35, 40, 0x0000ff, 0.5);
        const rightGrass2 = this.add.rectangle(bg.width * 0.82, bg.height * 0.147, 40, 45, 0x0000ff, 0.5);
        const rightGrass3 = this.add.rectangle(bg.width * 0.875, bg.height * 0.215, 80, 40, 0x0000ff, 0.5);
        const rightGrass4 = this.add.rectangle(bg.width * 0.884, bg.height * 0.275, 32, 40, 0x0000ff, 0.5);

        // =========== B. 연못 충돌 범위 ============== //

        const pondBottom = this.add.rectangle(
            bg.width * 0.70, bg.height * 0.765, 180, 84,  // x, y, 너비, 높이
            0x0000ff, 0.5
        );

        // 💡 2번 상자: 연못의 오른쪽 위로 튀어나온 부분 (왼쪽 위가 파인 형태를 만듦)
        const pondRight = this.add.rectangle(
            bg.width * 0.70 +14 , bg.height * 0.65, 140, 40,                                
            0x0000ff, 0.5
        );

        // 정적 그룹(Static Group)에 두 조각 모두 추가
        this.debugBoundaries.addMultiple([
            topWallLeft,topWallLeft2,
            topWallRight, topWallRight2,
            bottomWall, bottomWall2, bottomWall3,
            bottomWallRight, bottomWallRight2, bottomWallRight3, bottomWallRight4,
            leftWall, leftWall2, leftWall3, leftWall4,
            rightWallTop, 
            rightWallBottom, rightWallBottom2, rightWallBottom3,
            leftRock, leftRock2, leftRock3,
            leftGrass, leftGrass2,
            rightGrass, rightGrass2, rightGrass3, rightGrass4,
            pondBottom, pondRight
        ]);

        // [4] 플레이어와 경계선 충돌 설정
        this.physics.add.collider(this.player, this.debugBoundaries);

        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // [5] 기타 입력 설정
        this.keys = this.input.keyboard.addKeys('W,A,S,D,F,ESC');
    }

    update() {
        if (!this.player.active) return;
        
        let vx = 0, vy = 0;
        if (this.keys.A.isDown) vx = -this.playerSpeed; else if (this.keys.D.isDown) vx = this.playerSpeed;
        if (this.keys.W.isDown) vy = -this.playerSpeed; else if (this.keys.S.isDown) vy = this.playerSpeed;
        this.player.body.setVelocity(vx, vy);

        // 모닥불/작업대 상호작용 로직은 추후 추가
    }
}