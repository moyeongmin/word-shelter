import Phaser from 'phaser';

export default class ForestScene extends Phaser.Scene {
    constructor() {
        super('ForestScene');
        this.spawnFrom = 'BaseCamp';
    }

    preload() {
        this.load.image('bg_forest', 'assets/images/Forest_BG.png');
        this.load.image('player_asset', 'assets/images/player.png');
    }

    init(data) {
        if (data && data.spawnFrom) this.spawnFrom = data.spawnFrom;
        this.wordInventory = this.registry.get('wordInventory');
        this.discoveredWords = this.registry.get('discoveredWords');
        this.discoveredRecipes = this.registry.get('discoveredRecipes');
        this.replicators = this.registry.get('replicators');
        this.upgrades = this.registry.get('upgrades');
    }

    addDiscoveredWord(word) { 
        if (!this.discoveredWords.includes(word)) this.discoveredWords.push(word); 
    }

    get playerSpeed() { return 120 + (this.upgrades.speed * 9); }
    get repTime() { return 15000 - (this.upgrades.time * 1000); }
    get repYield() { return 1 + this.upgrades.yield; }

    create() {
        if (!this.textures.exists('pixel')) { 
            const g = this.make.graphics({x: 0, y: 0, add: false}); 
            g.fillStyle(0xffffff, 1); 
            g.fillRect(0, 0, 4, 4); 
            g.generateTexture('pixel', 4, 4); 
        }

        // [1] 배경 이미지 렌더링
        const bg = this.add.image(0, 0, 'bg_forest').setOrigin(0, 0);

        this.physics.world.setBounds(0, 0, bg.width, bg.height);
        this.cameras.main.setBounds(0, 0, bg.width, bg.height);
        
        // 🌟 화면이 너무 작아 보이지 않도록 카메라 줌을 2배로 당김 (필요시 2.5 등으로 조절 가능)
        this.cameras.main.setZoom(2); 

        // [2] 장애물(투명 벽) 그룹 생성
        this.obstacles = this.physics.add.staticGroup();
        this.obstacles.add(this.add.rectangle(bg.width / 2, bg.height + 8, bg.width, 16, 0x0000ff, 0)); 
        this.obstacles.add(this.add.rectangle(bg.width / 2, -8, bg.width, 16, 0x0000ff, 0));      
        this.obstacles.add(this.add.rectangle(-8, bg.height / 2, 16, bg.height, 0x0000ff, 0));      
        this.obstacles.add(this.add.rectangle(bg.width + 8, bg.height / 2, 16, bg.height, 0x0000ff, 0)); 

        // [3] 포탈 세팅
        this.portal = this.add.rectangle(40, bg.height / 2, 60, 160, 0x8B4513, 0); 
        this.physics.add.existing(this.portal, true);

        // [4] 플레이어 생성 (🌟 크기를 0.15로 고정)
        let startX = 100;
        let startY = bg.height / 2;

        this.player = this.physics.add.sprite(startX, startY, 'player_asset');
        this.player.setScale(0.15); // 앞으로 모든 씬에서 0.15 고정!
        this.player.body.setCollideWorldBounds(true); 

        this.physics.add.collider(this.player, this.obstacles);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08); 

        // [5] 입력 및 이벤트
        this.keys = this.input.keyboard.addKeys('W,A,S,D,F');
        this.materials = this.physics.add.group();

        this.time.addEvent({ 
            delay: 8000, 
            callback: () => this.spawnMaterialAround(bg.width / 2, bg.height / 2, 150, '나무', '#32cd32', 8), 
            loop: true 
        });
    }

    spawnMaterialAround(x, y, radius, name, colorHex, maxLimit) {
        if (this.materials.getChildren().filter(m => m.name === name).length >= maxLimit) return;
        let valid = false, spawnX, spawnY; 
        const obstacles = this.obstacles.getChildren();

        for(let i=0; i<30; i++) {
            const angle = Math.random() * Math.PI * 2; 
            const r = 30 + Math.random() * (radius - 30);
            spawnX = Math.max(50, Math.min(this.physics.world.bounds.width - 50, x + Math.cos(angle) * r));
            spawnY = Math.max(50, Math.min(this.physics.world.bounds.height - 50, y + Math.sin(angle) * r));
            valid = true;

            for(let o of obstacles) { 
                if (Phaser.Math.Distance.Between(spawnX, spawnY, o.x, o.y) < (Math.max(o.width, o.height)/2) + 15) { 
                    valid = false; break; 
                } 
            }
            if(valid) break;
        }

        if(!valid) return; 
        const mat = this.add.circle(spawnX, spawnY, 8, Phaser.Display.Color.HexStringToColor(colorHex).color);
        mat.name = name; 
        mat.colorHex = colorHex; 
        mat.setScale(0); 
        this.tweens.add({ targets: mat, scale: 1, duration: 400, ease: 'Back.easeOut' });
        this.physics.add.existing(mat); 
        this.materials.add(mat);
    }

    createPickupBurst(x, y, colorHex) { 
        const colorVal = Phaser.Display.Color.HexStringToColor(colorHex).color; 
        this.add.particles(x, y, 'pixel', { tint: colorVal, speed: { min: 50, max: 150 }, scale: { start: 1.2, end: 0 }, lifespan: 500, blendMode: 'ADD', duration: 100 }); 
    }
    
    showFloatingText(x, y, message, colorHex) { 
        const t = this.add.text(x, y - 20, message, { fontSize: '18px', fill: colorHex, fontStyle: 'bold' }).setOrigin(0.5); 
        this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1000, onComplete: () => t.destroy() }); 
    }

    update() {
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

            if (Phaser.Math.Distance.BetweenPoints(this.player, this.portal) < 80) {
                this.scene.start('BaseCampScene', { spawnFrom: 'Forest' });
            }
        }
    }
}