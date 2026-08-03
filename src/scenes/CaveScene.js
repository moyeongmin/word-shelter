import Phaser from 'phaser';

export default class CaveScene extends Phaser.Scene {
    constructor() {
        super('CaveScene');
        this.spawnFrom = 'Camp2Cave';
    }

    preload() {
        this.load.image('bg_cave', 'assets/images/Cave.png');
        this.load.image('player_asset', 'assets/images/player.png');
    }

    init(data) {
        if (data && data.spawnFrom) this.spawnFrom = data.spawnFrom;
        this.upgrades = this.registry.get('upgrades') || { speed: 0 };
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

        // 3. 투명 벽 (동굴 벽면)
        this.obstacles = this.physics.add.staticGroup();
        // 외곽선 꽉 막기
        this.obstacles.add(this.add.rectangle(bg.width / 2, -10, bg.width, 20, 0x0000ff, 0));
        this.obstacles.add(this.add.rectangle(bg.width / 2, bg.height + 10, bg.width, 20, 0x0000ff, 0));
        this.obstacles.add(this.add.rectangle(-10, bg.height / 2, 20, bg.height, 0x0000ff, 0));
        this.obstacles.add(this.add.rectangle(bg.width + 10, bg.height / 2, 20, bg.height, 0x0000ff, 0));

        // 4. 플레이어 스폰 (왼쪽 위)
        let startX = 100;
        let startY = 100; 

        this.player = this.physics.add.sprite(startX, startY, 'player_asset');
        this.player.setScale(0.15); // 크기 0.15 고정
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
            // 입구 근처에서 F 누르면 동굴 밖(Camp2Cave)으로 나감
            if (Phaser.Math.Distance.BetweenPoints(this.player, this.exitPortal) < 60) {
                this.scene.start('Camp2CaveScene', { spawnFrom: 'Cave' });
            }
        }
    }
}