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

    get playerSpeed() { return 170 + (this.upgrades.speed * 9); }

    create() {
        // 1. 배경 및 맵 설정
        const bg = this.add.image(0, 0, 'bg_camp2cave').setOrigin(0, 0);
        this.physics.world.setBounds(0, 0, bg.width, bg.height);
        this.cameras.main.setBounds(0, 0, bg.width, bg.height);
        this.cameras.main.setZoom(1); // 줌 2배 고정

        // 2. 포탈 설정 (투명도 0으로 설정, 확인 시 0.5)
        this.baseCampPortal = this.add.rectangle(20, bg.height / 2, 40, 200, 0x00ff00, 0);
        this.physics.add.existing(this.baseCampPortal, true);

        // 동굴 입구는 이미지 우측의 까만 구멍 부근
        this.cavePortal = this.add.rectangle(bg.width - 100, bg.height / 2 + 20, 80, 100, 0xff0000, 0);
        this.physics.add.existing(this.cavePortal, true);

        // 3. 투명 벽 (절벽, 나무 등) - 디버깅 시 0.5로 설정하여 미세조정 필요
        this.obstacles = this.physics.add.staticGroup();
        this.obstacles.add(this.add.rectangle(bg.width / 2, 30, bg.width, 60, 0x0000ff, 0)); // 위쪽 숲/절벽
        this.obstacles.add(this.add.rectangle(bg.width / 2, bg.height - 30, bg.width, 60, 0x0000ff, 0)); // 아래쪽 숲/절벽

        // 4. 플레이어 스폰
        let startX = 60;
        let startY = bg.height / 2;
        if (this.spawnFrom === 'Cave') { // 동굴에서 나왔을 때
            startX = bg.width - 160;
            startY = bg.height / 2 + 20;
        }

        this.player = this.physics.add.sprite(startX, startY, 'player_asset');
        this.player.setScale(0.25);
        this.player.body.setCollideWorldBounds(true);

        this.physics.add.collider(this.player, this.obstacles);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        this.keys = this.input.keyboard.addKeys('W,A,S,D,F');
    }

    update() {
        let vx = 0, vy = 0;
        if (this.keys.A.isDown) vx = -this.playerSpeed; else if (this.keys.D.isDown) vx = this.playerSpeed;
        if (this.keys.W.isDown) vy = -this.playerSpeed; else if (this.keys.S.isDown) vy = this.playerSpeed;
        this.player.body.setVelocity(vx, vy);

        if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
            // 왼쪽 포탈: 베이스캠프로 복귀
            if (Phaser.Math.Distance.BetweenPoints(this.player, this.baseCampPortal) < 60) {
                this.scene.start('BaseCampScene', { spawnFrom: 'Camp2Cave' });
            }
            // 오른쪽 포탈: 동굴 내부로 진입
            if (Phaser.Math.Distance.BetweenPoints(this.player, this.cavePortal) < 80) {
                this.scene.start('CaveScene', { spawnFrom: 'Camp2Cave' });
            }
        }
    }
}