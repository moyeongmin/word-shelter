import Phaser from 'phaser';

export default class DesertScene extends Phaser.Scene {
    constructor() { super('DesertScene'); this.spawnFrom = 'BaseCamp'; }

    init(data) {
        if (data && data.spawnFrom) this.spawnFrom = data.spawnFrom;
        this.wordInventory = this.registry.get('wordInventory');
        this.discoveredWords = this.registry.get('discoveredWords');
        this.discoveredRecipes = this.registry.get('discoveredRecipes');
        this.replicators = this.registry.get('replicators');
        this.upgrades = this.registry.get('upgrades');
    }

    addDiscoveredWord(word) { if (!this.discoveredWords.includes(word)) this.discoveredWords.push(word); }
    get playerSpeed() { return 200 + (this.upgrades.speed * 15); }
    get repTime() { return 15000 - (this.upgrades.time * 1000); }
    get repYield() { return 1 + this.upgrades.yield; }

    create() {
        if (!this.textures.exists('pixel')) { const g = this.make.graphics({x: 0, y: 0, add: false}); g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 4, 4); g.generateTexture('pixel', 4, 4); }
        
        this.physics.world.setBounds(0, 0, 1600, 1200); 
        this.cameras.main.setBounds(0, 0, 1600, 1200);
        
        // 🌟 사막 전체 배경 명확히 생성 (화면이 검은색으로 나오는 버그 원인 해결)
        this.add.rectangle(800, 600, 1600, 1200, 0xedc9af); 

        this.cacti = this.physics.add.staticGroup();
        this.createDesertEnvironment();

        // 🌟 파밍 구역 및 바람 제단
        this.add.ellipse(800, 300, 400, 250, 0xd2b48c, 0.6); // 모래 존
        
        // 바람 제단 (바람 파밍지)
        this.windAltar = this.add.circle(1300, 250, 60, 0x87ceeb, 0.7);
        this.physics.add.existing(this.windAltar, true);
        this.tweens.add({ targets: this.windAltar, alpha: 0.4, yoyo: true, repeat: -1, duration: 1000 });
        this.add.text(1300, 250, '💨 바람결', { fontSize: '14px', fill: '#000', fontStyle: 'bold' }).setOrigin(0.5);

        // 사막 모래바람 파티클
        this.add.particles(800, 600, 'pixel', {
            tint: 0xffe4b5, speed: { min: 200, max: 400 }, angle: { min: -10, max: 10 }, 
            scale: { start: 1, end: 0 }, lifespan: 2000, frequency: 15,
            emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, 0, 50, 1200) }
        });

        // 포탈 (우측 끝)
        this.portal = this.add.rectangle(1560, 600, 80, 200, 0x8B4513); 
        this.physics.add.existing(this.portal, true);
        this.add.text(1500, 600, '캠프로 ▶', { fontSize: '20px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

        // 플레이어 (포탈 근처 스폰)
        this.player = this.add.rectangle(1450, 600, 32, 32, 0xFFFFFF); 
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.cacti);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08); 
        this.keys = this.input.keyboard.addKeys('W,A,S,D,F');

        this.materials = this.physics.add.group();

        // 🌟 스포너 (모래, 바람)
        this.time.addEvent({ delay: 9000, callback: () => this.spawnMaterialAround(800, 300, 150, '모래', '#f4a460', 8), loop: true });
        this.time.addEvent({ delay: 6000, callback: () => this.spawnMaterialAround(1300, 250, 100, '바람', '#e0ffff', 6), loop: true });

        for(let i=0; i<3; i++) {
            this.spawnMaterialAround(800, 300, 150, '모래', '#f4a460', 8);
            this.spawnMaterialAround(1300, 250, 100, '바람', '#e0ffff', 6);
        }
    }

    createDesertEnvironment() {
        for (let i = 0; i < 20; i++) {
            let cx = Phaser.Math.Between(150, 1300);
            let cy = Phaser.Math.Between(100, 1100);
            
            // 🌟 모래 언덕(800, 300)과 바람 제단(1300, 250) 근처는 선인장을 절대 생성하지 않음 (파밍 사수)
            if (Phaser.Math.Distance.Between(cx, cy, 800, 300) < 220) continue;
            if (Phaser.Math.Distance.Between(cx, cy, 1300, 250) < 180) continue;

            const cactus = this.add.ellipse(cx, cy, 30, 60, 0x2E8B57);
            this.physics.add.existing(cactus, true);
            this.cacti.add(cactus);
        }
    }

    spawnMaterialAround(x, y, radius, name, colorHex, maxLimit) {
        if (this.materials.getChildren().filter(m => m.name === name).length >= maxLimit) return;
        const angle = Math.random() * Math.PI * 2; const r = 30 + Math.random() * (radius - 30);
        let spawnX = Math.max(50, Math.min(1550, x + Math.cos(angle) * r));
        let spawnY = Math.max(50, Math.min(1150, y + Math.sin(angle) * r));
        const mat = this.add.circle(spawnX, spawnY, 8, Phaser.Display.Color.HexStringToColor(colorHex).color);
        mat.name = name; mat.colorHex = colorHex; mat.setScale(0); this.tweens.add({ targets: mat, scale: 1, duration: 400, ease: 'Back.easeOut' });
        this.physics.add.existing(mat); this.materials.add(mat);
    }

    createPickupBurst(x, y, colorHex) { const colorVal = Phaser.Display.Color.HexStringToColor(colorHex).color; this.add.particles(x, y, 'pixel', { tint: colorVal, speed: { min: 50, max: 150 }, scale: { start: 1.2, end: 0 }, lifespan: 500, blendMode: 'ADD', duration: 100 }); }
    showFloatingText(x, y, message, colorHex) { const t = this.add.text(x, y - 20, message, { fontSize: '18px', fill: colorHex, fontStyle: 'bold' }).setOrigin(0.5); this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1000, onComplete: () => t.destroy() }); }

    updateReplicatorsTick() {
        const now = Date.now();
        this.replicators.forEach(rep => {
            if (rep && rep.item) {
                const elapsed = now - rep.lastTick;
                if (elapsed >= this.repTime) {
                    const ticks = Math.floor(elapsed / this.repTime);
                    this.wordInventory[rep.item] = (this.wordInventory[rep.item] || 0) + (this.repYield * ticks);
                    this.addDiscoveredWord(rep.item);
                    rep.lastTick += ticks * this.repTime;
                }
            }
        });
    }

    update() {
        this.updateReplicatorsTick();
        let vx = 0, vy = 0;
        if (this.keys.A.isDown) vx = -this.playerSpeed; else if (this.keys.D.isDown) vx = this.playerSpeed;
        if (this.keys.W.isDown) vy = -this.playerSpeed; else if (this.keys.S.isDown) vy = this.playerSpeed;
        this.player.body.setVelocity(vx, vy);

        if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
            this.materials.getChildren().forEach((mat) => {
                if (mat.active && Phaser.Math.Distance.BetweenPoints(this.player, mat) < 50) {
                    this.wordInventory[mat.name] = (this.wordInventory[mat.name] || 0) + 1;
                    this.addDiscoveredWord(mat.name);
                    this.createPickupBurst(mat.x, mat.y, mat.colorHex);
                    this.showFloatingText(mat.x, mat.y, `+ ${mat.name}`, mat.colorHex);
                    mat.destroy();
                }
            });

            if (Phaser.Math.Distance.BetweenPoints(this.player, this.portal) < 100) {
                this.scene.start('BaseCampScene', { spawnFrom: 'Desert' });
            }
        }
    }
}