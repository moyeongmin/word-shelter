import Phaser from 'phaser';

export default class ForestScene extends Phaser.Scene {
    constructor() {
        super('ForestScene');
        this.spawnFrom = 'BaseCamp';
    }

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
        this.physics.world.setBounds(0, 0, 1600, 1200); this.cameras.main.setBounds(0, 0, 1600, 1200);
        this.add.rectangle(800, 600, 1600, 1200, 0x213b22); 

        this.trees = this.physics.add.staticGroup(); this.treePositions = []; 
        this.createForestEnvironment();

        // 🌟 파밍 구역 (흙 존)
        this.add.ellipse(800, 950, 300, 200, 0x3e2723, 0.5); 
        this.add.particles(800, 950, 'pixel', { tint: 0x5c4033, speed: { min: 10, max: 30 }, angle: { min: 250, max: 290 }, scale: { start: 1.5, end: 0 }, lifespan: 1000, frequency: 500, emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, 300, 200) } });

        this.portal = this.add.rectangle(40, 600, 80, 200, 0x8B4513); this.physics.add.existing(this.portal, true);
        this.add.text(100, 600, '◀ 캠프로', { fontSize: '20px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

        this.player = this.add.rectangle(150, 600, 32, 32, 0xFFFFFF); this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true); this.physics.add.collider(this.player, this.trees);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08); this.keys = this.input.keyboard.addKeys('W,A,S,D,F');

        this.materials = this.physics.add.group();

        this.time.addEvent({ delay: 10000, callback: () => { if (this.treePositions.length > 0) { const pos = Phaser.Utils.Array.GetRandom(this.treePositions); this.spawnMaterialAround(pos.x, pos.y, 80, '나무', '#32cd32', 10); } }, loop: true });
        this.time.addEvent({ delay: 8000, callback: () => this.spawnMaterialAround(800, 950, 120, '흙', '#8b4513', 6), loop: true });

        for(let i=0; i<3; i++) {
            const pos = Phaser.Utils.Array.GetRandom(this.treePositions);
            this.spawnMaterialAround(pos.x, pos.y, 80, '나무', '#32cd32', 10);
            this.spawnMaterialAround(800, 950, 120, '흙', '#8b4513', 6);
        }
    }

    createTree(x, y, radius, color) {
        const tree = this.add.circle(x, y, radius, color);
        this.physics.add.existing(tree, true);
        this.trees.add(tree);
        if (x > 100 && x < 1500 && y > 100 && y < 1100) this.treePositions.push({x: x, y: y});
    }

    createForestEnvironment() {
        for (let i = 0; i <= 1600; i += 60) { this.createTree(i, 30, 40, 0x112b12); this.createTree(i, 1170, 40, 0x112b12); }
        for (let i = 0; i <= 1200; i += 60) { if (i > 500 && i < 700) continue; this.createTree(30, i, 40, 0x112b12); this.createTree(1570, i, 40, 0x112b12); }
        
        // 🌟 오픈 루프 미로 구조 (구불구불하지만 막힌 Dead End가 없는 유기적 배치)
        for (let y = 200; y < 1100; y += 160) {
            for (let x = 200; x < 1500; x += 180) {
                // 입구 근처(왼쪽)와 흙 파밍 구역(800, 950)은 무조건 완벽하게 비워둠
                if (x < 350 && y > 450 && y < 750) continue;
                if (Math.abs(x - 800) < 180 && Math.abs(y - 950) < 140) continue;

                // 클러스터(군락) 형태로 나무를 예쁘게 뭉쳐 심음
                let jitterX = x + Phaser.Math.Between(-40, 40);
                let jitterY = y + Phaser.Math.Between(-40, 40);
                
                this.createTree(jitterX, jitterY, 45, 0x1B4D22);
                this.createTree(jitterX + 35, jitterY - 25, 35, 0x228B22);
            }
        }
    }

    spawnMaterialAround(x, y, radius, name, colorHex, maxLimit) {
        if (this.materials.getChildren().filter(m => m.name === name).length >= maxLimit) return;
        let valid = false, spawnX, spawnY; const trees = this.trees.getChildren();
        for(let i=0; i<30; i++) {
            const angle = Math.random() * Math.PI * 2; const r = 30 + Math.random() * (radius - 30);
            spawnX = Math.max(50, Math.min(1550, x + Math.cos(angle) * r));
            spawnY = Math.max(50, Math.min(1150, y + Math.sin(angle) * r));
            valid = true;
            for(let t of trees) { if (Phaser.Math.Distance.Between(spawnX, spawnY, t.x, t.y) < (t.width/2) + 15) { valid = false; break; } }
            if(valid) break;
        }
        if(!valid) return; 
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
                this.scene.start('BaseCampScene', { spawnFrom: 'Forest' });
            }
        }
    }
}