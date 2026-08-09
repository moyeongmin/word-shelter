import Phaser from 'phaser';
import { combineWords } from '../api/db.js';

export default class BaseCampScene extends Phaser.Scene {
    constructor() {
        super('BaseCampScene');
        this.spawnFrom = 'Start';
        this.lastGatherTime = 0;
        this.isSynthesizing = false;
    }

    preload() {
        this.load.image('bg_basecamp', 'assets/images/BaseCamp.png');
        this.load.image('player_asset', 'assets/images/player.png'); 
        this.load.image('obj_table_messy', 'assets/images/obj_table_messy.png');
        this.load.image('obj_table_clean', 'assets/images/obj_table_clean.png');

        this.load.image('campfire_1', 'assets/images/campfire_1.png');
        this.load.image('campfire_2', 'assets/images/campfire_2.png');
        this.load.image('campfire_3', 'assets/images/campfire_3.png');

        this.load.image('item_fire', 'assets/images/item_fire.png');
        this.load.image('item_water', 'assets/images/item_water.png');
    }

    // 🌟 1. 확실한 데이터 저장 함수
    saveGameData() {
        const saveData = {
            // 변수가 꼬이지 않게 레지스트리에서 직접 꺼내서 저장
            wordInventory: this.registry.get('wordInventory'),
            discoveredWords: this.registry.get('discoveredWords'),
            discoveredRecipes: this.registry.get('discoveredRecipes'),
            replicators: this.registry.get('replicators'),
            upgrades: this.registry.get('upgrades'),
            discoveryOrder: this.registry.get('discoveryOrder'),
            isWorkbenchCleaned: this.registry.get('isWorkbenchCleaned')
        };
        localStorage.setItem('cyberAlchemySave', JSON.stringify(saveData));
        console.log("💾 게임 저장 완료!", saveData);
    }

    // 🌟 2. 뚫리지 않는 로컬 스토리지 불러오기
    init(data) {
        if (data && data.spawnFrom) this.spawnFrom = data.spawnFrom; 

        const savedDataString = localStorage.getItem('cyberAlchemySave');
        
        // isSaveLoaded라는 강력한 마커를 써서 게임 켤 때 '최초 1회만' 스토리지에서 덮어씌움
        if (savedDataString && !this.registry.get('isSaveLoaded')) {
            console.log("📥 세이브 파일 발견! 데이터를 복구합니다.");
            const savedData = JSON.parse(savedDataString);
            
            this.registry.set('wordInventory', savedData.wordInventory || {});
            this.registry.set('discoveredWords', savedData.discoveredWords || []);
            this.registry.set('discoveredRecipes', savedData.discoveredRecipes || {});
            this.registry.set('replicators', savedData.replicators || [{ item: null, lastTick: 0 }, { item: null, lastTick: 0 }]);
            this.registry.set('upgrades', savedData.upgrades || { speed: 0, time: 0, yield: 0, slot2: false });
            this.registry.set('discoveryOrder', savedData.discoveryOrder || []);
            this.registry.set('isWorkbenchCleaned', !!savedData.isWorkbenchCleaned);

            this.registry.set('isSaveLoaded', true);
            this.registry.set('isInitialized', true);
        } else if (!this.registry.get('isInitialized')) {
            console.log("🆕 세이브 파일 없음. 새 게임을 시작합니다.");
            this.registry.set('wordInventory', {});
            this.registry.set('discoveredWords', []); 
            this.registry.set('discoveredRecipes', {});
            this.registry.set('replicators', [{ item: null, lastTick: 0 }, { item: null, lastTick: 0 }]);
            this.registry.set('upgrades', { speed: 0, time: 0, yield: 0, slot2: false });
            this.registry.set('discoveryOrder', []); 
            this.registry.set('isWorkbenchCleaned', false);
            this.registry.set('isInitialized', true);
        }

        // 변수 바인딩
        this.wordInventory = this.registry.get('wordInventory');
        this.discoveredWords = this.registry.get('discoveredWords');
        this.discoveredRecipes = this.registry.get('discoveredRecipes');
        this.replicators = this.registry.get('replicators');
        this.upgrades = this.registry.get('upgrades');
        this.discoveryOrder = this.registry.get('discoveryOrder');
        this.isWorkbenchCleaned = this.registry.get('isWorkbenchCleaned');
    }

    addDiscoveredWord(word) { 
        if (!this.discoveredWords.includes(word)) { 
            this.discoveredWords.push(word); 
            this.discoveryOrder.push(word);
            this.registry.set('discoveredWords', this.discoveredWords);
            this.registry.set('discoveryOrder', this.discoveryOrder);
            this.saveGameData(); 
        } 
    }

    get availablePoints() { let spent = (this.upgrades.speed * 1) + (this.upgrades.time * 1) + (this.upgrades.yield * 5); if (this.upgrades.slot2) spent += 10; return this.discoveredWords.length - spent; }
    get playerSpeed() { return 120 + (this.upgrades.speed * 9); } 
    get repTime() { return 15000 - (this.upgrades.time * 1000); } 
    get repYield() { return 1 + this.upgrades.yield; }

    create() {

        this.fetchGameDataFromDB();

        if (!this.textures.exists('pixel')) {
            const g = this.make.graphics({x: 0, y: 0, add: false});
            g.fillStyle(0xffffff, 1);
            g.fillRect(0, 0, 4, 4);
            g.generateTexture('pixel', 4, 4);
        }
        const bg = this.add.image(0, 0, 'bg_basecamp').setOrigin(0, 0);

        this.physics.world.setBounds(0, 0, bg.width, bg.height);
        this.cameras.main.setBounds(0, 0, bg.width, bg.height);
        this.cameras.main.setZoom(1.5); 

        this.anims.create({
            key: 'campfire_burn',
            frames: [
                { key: 'campfire_1' },
                { key: 'campfire_2' },
                { key: 'campfire_3' }
            ],
            frameRate: 2, 
            repeat: -1 
        });
        
        this.campfire = this.physics.add.sprite(300, bg.height - 170, 'campfire_1');
        this.campfire.setScale(0.2);
        this.campfire.play('campfire_burn');

        this.materials = this.physics.add.group();

        this.time.addEvent({ delay: 7000, callback: () => this.spawnMaterialAround(this.campfire.x, this.campfire.y, 40, 80, '불', 'item_fire', 5), loop: true });
        
        const pondCenterX = bg.width * 0.7;
        const pondCenterY = bg.height * 0.765;
        this.time.addEvent({ delay: 5000, callback: () => this.spawnMaterialAround(pondCenterX, pondCenterY, 80, 130, '물', 'item_water', 5, Math.PI, Math.PI * 1.5), loop: true });

        let startX = bg.width / 2;
        let startY = bg.height - 50; 
        if (this.spawnFrom === 'Camp2Cave') { startX = bg.width - 50; startY = bg.height / 2; } 
        else if (this.spawnFrom === 'NorthSide') { startX = bg.width / 2; startY = 80; }
        
        this.player = this.physics.add.sprite(startX, startY, 'player_asset'); 
        this.player.setScale(0.15); 
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setSize(this.player.width * 0.25, 30); 
        this.player.body.setOffset(this.player.width * 0.38, this.player.height - 110);

        const tableX = bg.width / 2;
        const tableY = bg.height / 2;
        const initialTexture = this.isWorkbenchCleaned ? 'obj_table_clean' : 'obj_table_messy';
        
        this.workbenchImg = this.add.image(tableX, tableY, initialTexture);
        this.workbenchImg.setScale(0.2);
        
        this.workbenchZone = this.add.rectangle(tableX, tableY + 15, 100, 60, 0x0, 0); 
        this.physics.add.existing(this.workbenchZone, true);

        // 맵 충돌망 (투명도 0으로 안보이게 처리)
        this.debugBoundaries = this.physics.add.staticGroup();
        const wallThickness = 40; 
        const topWallLeft = this.add.rectangle(bg.width * 0.23, wallThickness/2, bg.width * 0.4, wallThickness, 0x0000ff, 0);
        const topWallLeft2 = this.add.rectangle(bg.width * 0.2, bg.height * 0.15, bg.width * 0.4, 100, 0x0000ff, 0);
        const topWallRight = this.add.rectangle(bg.width * 0.8, wallThickness/2, bg.width * 0.47, wallThickness, 0x0000ff, 0);
        const topWallRight2 = this.add.rectangle(bg.width * 0.8, bg.height * 0.086, bg.width * 0.42, 30, 0x0000ff, 0);
        const bottomWall = this.add.rectangle(bg.width *0.3, bg.height - wallThickness/2, 270, 49, 0x0000ff, 0);
        const bottomWall2 = this.add.rectangle(bg.width *0.3, bg.height * 0.9, 210, 30, 0x0000ff, 0);
        const bottomWall3 = this.add.rectangle(bg.width *0.25, bg.height * 0.86, 200, 20, 0x0000ff, 0);
        const bottomWallRight = this.add.rectangle(bg.width * 0.7, bg.height - wallThickness/3, 265, 30, 0x0000ff, 0);
        const bottomWallRight2 = this.add.rectangle(bg.width * 0.7, bg.height * 0.94, 200, 20, 0x0000ff, 0);
        const bottomWallRight3 = this.add.rectangle(bg.width * 0.77, bg.height * 0.91, 130, 20, 0x0000ff, 0);
        const bottomWallRight4 = this.add.rectangle(bg.width * 0.77, bg.height * 0.88, 100, 20, 0x0000ff, 0);
        const leftWall = this.add.rectangle(bg.width * 0.15, bg.height * 0.2, 30, 550, 0x0000ff, 0);
        const leftWall2 = this.add.rectangle(bg.width * 0.17, bg.height * 0.63, 20, 40, 0x0000ff, 0);
        const leftWall3 = this.add.rectangle(bg.width * 0.18, bg.height * 0.755, 34, 100, 0x0000ff, 0);
        const leftWall4 = this.add.rectangle(bg.width * 0.2, bg.height * 0.82, 40, 30, 0x0000ff, 0);
        const rightWallTop = this.add.rectangle(bg.width - wallThickness/2, bg.height * 0.2, 165, bg.height * 0.44, 0x0000ff, 0);
        const rightWallBottom = this.add.rectangle(bg.width - wallThickness/2, bg.height * 0.8, 300, bg.height * 0.37, 0x0000ff, 0);
        const rightWallBottom2 = this.add.rectangle(bg.width - wallThickness/2, bg.height * 0.58, 230, 40, 0x0000ff, 0); 
        const rightWallBottom3 = this.add.rectangle(bg.width * 0.82, bg.height * 0.85, 30, 120, 0x0000ff, 0);
        const leftRock = this.add.rectangle(bg.width * 0.22, bg.height * 0.29, 30, 70, 0x0000ff, 0);
        const leftRock2 = this.add.rectangle(bg.width * 0.282, bg.height * 0.275, 34, 35, 0x0000ff, 0);
        const leftRock3 = this.add.rectangle(bg.width * 0.315, bg.height * 0.28, 27, 20, 0x0000ff, 0);
        const leftGrass = this.add.rectangle(bg.width * 0.2, bg.height * 0.34, 70, 30, 0x0000ff, 0);
        const leftGrass2 = this.add.rectangle(bg.width * 0.183, bg.height * 0.5, 40, 65, 0x0000ff, 0);
        const rightGrass = this.add.rectangle(bg.width * 0.69, bg.height * 0.15, 35, 40, 0x0000ff, 0);
        const rightGrass2 = this.add.rectangle(bg.width * 0.82, bg.height * 0.147, 40, 45, 0x0000ff, 0);
        const rightGrass3 = this.add.rectangle(bg.width * 0.875, bg.height * 0.215, 80, 40, 0x0000ff, 0);
        const rightGrass4 = this.add.rectangle(bg.width * 0.884, bg.height * 0.275, 32, 40, 0x0000ff, 0);
        this.pondBottom = this.add.rectangle(bg.width * 0.70, bg.height * 0.765, 180, 84, 0x0000ff, 0);
        this.pondRight = this.add.rectangle(bg.width * 0.70 + 14 , bg.height * 0.65, 140, 40, 0x0000ff, 0);

        this.debugBoundaries.addMultiple([topWallLeft, topWallLeft2, topWallRight, topWallRight2, bottomWall, bottomWall2, bottomWall3, bottomWallRight, bottomWallRight2, bottomWallRight3, bottomWallRight4, leftWall, leftWall2, leftWall3, leftWall4, rightWallTop, rightWallBottom, rightWallBottom2, rightWallBottom3, leftRock, leftRock2, leftRock3, leftGrass, leftGrass2, rightGrass, rightGrass2, rightGrass3, rightGrass4, this.pondBottom, this.pondRight]);

        this.northPortal = this.add.rectangle(bg.width / 2, 20, 200, 40, 0x00ff00, 0); 
        this.physics.add.existing(this.northPortal, true);
        this.camp2CavePortal = this.add.rectangle(bg.width - 20, bg.height / 2, 40, 150, 0x00ff00, 0); 
        this.physics.add.existing(this.camp2CavePortal, true);

        this.physics.add.collider(this.player, this.workbenchZone);
        this.physics.add.collider(this.player, this.debugBoundaries);

        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        this.keys = this.input.keyboard.addKeys('W,A,S,D,F,ESC');

        // DOM 바인딩
        this.sysMenuModal = document.getElementById('system-menu-modal'); 
        this.dictModal = document.getElementById('dictionary-modal');
        this.upgradeModal = document.getElementById('upgrade-modal'); 
        this.deskScreen = document.getElementById('alchemy-desk-screen');
        this.pouchContainer = document.getElementById('magic-pouch');
        this.loadingLock = document.getElementById('alchemy-loading-lock'); 
        this.hudContainer = document.getElementById('hud-container');

        this.portalModal = document.getElementById('portal-confirm-modal');
        this.portalModalDesc = document.getElementById('portal-modal-desc');
        this.targetSceneName = null;
        this.targetSpawnFrom = 'BaseCamp';

        if(this.portalModal) {
            document.getElementById('portal-yes-btn').onclick = (e) => {
                e.stopPropagation();
                this.portalModal.classList.add('hidden');
                this.input.keyboard.resetKeys();
                this.input.keyboard.enabled = true;
                if (this.targetSceneName) this.scene.start(this.targetSceneName, { spawnFrom: this.targetSpawnFrom });
            };
            document.getElementById('portal-no-btn').onclick = (e) => {
                e.stopPropagation();
                this.portalModal.classList.add('hidden');
                this.input.keyboard.resetKeys();
                this.input.keyboard.enabled = true;
                this.targetSceneName = null;
            };
        }

        // 🌟 포탈 팝업 F키 자동 클릭 이벤트
        this.portalKeyHandler = (e) => {
            if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F' || e.key === 'ㄹ') {
                if (this.portalModal && !this.portalModal.classList.contains('hidden')) {
                    e.preventDefault();
                    e.stopPropagation();
                    document.getElementById('portal-yes-btn').click();
                }
            }
        };
        window.addEventListener('keydown', this.portalKeyHandler);
        this.events.once('shutdown', () => { window.removeEventListener('keydown', this.portalKeyHandler); });

        document.getElementById('open-upgrade-btn').onclick = (e) => { e.stopPropagation(); this.openUpgradeUI(); };
        document.getElementById('close-upgrade-btn').onclick = (e) => { e.stopPropagation(); this.upgradeModal.classList.add('hidden'); this.hudContainer.classList.remove('hidden'); this.input.keyboard.resetKeys(); this.input.keyboard.enabled = true; };
        document.getElementById('hamburger-btn').onclick = (e) => { e.stopPropagation(); this.toggleSystemMenu(); };
        document.getElementById('close-system-btn').onclick = (e) => { e.stopPropagation(); this.toggleSystemMenu(); };
        document.getElementById('open-dict-btn').onclick = (e) => { e.stopPropagation(); this.sysMenuModal.classList.add('hidden'); this.showDictList(); };
        document.getElementById('close-dict-btn').onclick = (e) => { e.stopPropagation(); this.dictModal.classList.add('hidden'); this.hudContainer.classList.remove('hidden'); this.input.keyboard.resetKeys(); this.input.keyboard.enabled = true; };
        document.getElementById('dict-back-btn').onclick = (e) => { e.stopPropagation(); this.showDictList(); };
        document.getElementById('close-desk-btn').onclick = (e) => { e.stopPropagation(); this.deskScreen.classList.add('hidden'); this.hudContainer.classList.remove('hidden'); this.input.keyboard.resetKeys(); this.input.keyboard.enabled = true; };
        
        document.querySelectorAll('.upg-btn').forEach(btn => { 
            btn.onclick = (e) => { e.stopPropagation(); this.handleUpgradeClick(e.target.getAttribute('data-type'), e.target.classList.contains('plus')); }; 
        });

        for(let i=0; i<2; i++) {
            const dropZone = document.getElementById(`rep-drop-${i}`); 
            document.getElementById(`remove-rep-${i}`).onclick = (e) => { e.stopPropagation(); this.removeFromReplicator(i); };
            dropZone.addEventListener('dragover', (e) => { if(!dropZone.classList.contains('locked')) { e.preventDefault(); dropZone.classList.add('drag-over'); } });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
            dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); if (dropZone.classList.contains('locked')) return; this.insertToReplicator(e.dataTransfer.getData('text/plain'), i); });
        }

        document.getElementById('dict-search').addEventListener('input', () => this.showDictList());
        document.getElementById('dict-sort').addEventListener('change', () => this.showDictList());
        document.getElementById('pouch-search').addEventListener('input', () => this.renderAlchemyPouch());
        document.getElementById('pouch-sort').addEventListener('change', () => this.renderAlchemyPouch());
    }

    // ==========================================
    // 🌐 DB에서 게임 데이터 불러오기 (임시)
    // ==========================================
// ==========================================
    // 🌐 DB에서 게임 데이터 불러오기 & 기본 재료 자동 지급
    // ==========================================
    async fetchGameDataFromDB() {
        try {
            const apiUrl = 'https://ls4bj14ryk.execute-api.ap-northeast-2.amazonaws.com/api/v1/game-data'; 
            
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.ok && data.materials) {
                // 1. DB 데이터를 전역 저장소(Registry)에 세팅
                this.registry.set('dbMaterials', data.materials);
                this.registry.set('dbMixLookup', data.mix_lookup || {});
                
                console.log("✅ [DB 연동 성공] 아이템 목록과 레시피를 가져왔습니다!", data);

                // 🌟 2. DB의 기본 재료(is_base: true)를 플레이어 인벤토리 및 도감에 자동 등록!
                let isUpdated = false;
                
                data.materials.forEach(mat => {
                    // is_base가 true인 기본 아이템인 경우 (예: 물, 불, 흙 등)
                    if (mat.is_base) {
                        // 보유 수량이 없으면 기본 1개 지급
                        if (!this.wordInventory[mat.name] || this.wordInventory[mat.name] <= 0) {
                            this.wordInventory[mat.name] = 1;
                            isUpdated = true;
                        }
                        // 도감에 등록 안 되어 있으면 등록
                        if (!this.discoveredWords.includes(mat.name)) {
                            this.discoveredWords.push(mat.name);
                            if (!this.discoveryOrder.includes(mat.name)) {
                                this.discoveryOrder.push(mat.name);
                            }
                            isUpdated = true;
                        }
                    }
                });

                // 새로 지급되거나 등록된 데이터가 있다면 저장 및 동기화
                if (isUpdated) {
                    this.registry.set('wordInventory', this.wordInventory);
                    this.registry.set('discoveredWords', this.discoveredWords);
                    this.registry.set('discoveryOrder', this.discoveryOrder);
                    this.saveGameData();
                    console.log("🎁 기본 원소(is_base)가 인벤토리 및 도감에 자동 지급되었습니다!");
                }
            }
        } catch (error) {
            console.error("❌ [DB 연동 실패] 백엔드 서버 연결 오류:", error);
        }
    }

    spawnMaterialAround(x, y, minRadius, maxRadius, itemName, textureKey, maxLimit, angleMin = 0, angleMax = Math.PI * 2) {
        if (this.materials.getChildren().filter(m => m.name === itemName).length >= maxLimit) return;
        let spawnX, spawnY; let isValid = false; let attempts = 0;
        const obstacles = [this.pondBottom, this.pondRight, this.campfire, this.workbenchZone, this.northPortal, this.camp2CavePortal]; 
        
        while (!isValid && attempts < 30) {
            const angle = angleMin + Math.random() * (angleMax - angleMin);
            const r = minRadius + Math.random() * (maxRadius - minRadius); 
            spawnX = Math.max(30, Math.min(930, x + Math.cos(angle) * r));
            spawnY = Math.max(30, Math.min(570, y + Math.sin(angle) * r));
            isValid = true;
            for (let o of obstacles) {
                if (!o) continue; 
                const w = o.displayWidth || o.width; const h = o.displayHeight || o.height;
                const padding = 15; 
                if (spawnX > o.x - (w / 2) - padding && spawnX < o.x + (w / 2) + padding && spawnY > o.y - (h / 2) - padding && spawnY < o.y + (h / 2) + padding) { isValid = false; break; }
            }
            attempts++;
        }
        if (!isValid) return; 
        const item = this.physics.add.sprite(spawnX, spawnY, textureKey);
        item.name = itemName; item.setScale(0); 
        this.tweens.add({ targets: item, scale: 0.15, duration: 400, ease: 'Back.easeOut', onComplete: () => { this.tweens.add({ targets: item, y: item.y - 8, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); } });
        this.materials.add(item);
    }

    updateReplicatorsTick() {
        const now = Date.now(); let uiNeedsUpdate = false; 
        this.replicators.forEach((rep, i) => {
            if (rep.item) {
                const elapsed = now - rep.lastTick;
                if (elapsed >= this.repTime) {
                    const ticks = Math.floor(elapsed / this.repTime);
                    this.wordInventory[rep.item] = (this.wordInventory[rep.item] || 0) + (this.repYield * ticks);
                    this.registry.set('wordInventory', this.wordInventory);
                    this.addDiscoveredWord(rep.item);
                    rep.lastTick += ticks * this.repTime;
                    this.registry.set('replicators', this.replicators);
                    uiNeedsUpdate = true;
                    this.saveGameData();
                }
                if (!this.deskScreen.classList.contains('hidden')) { document.getElementById(`rep-bar-${i}`).style.width = `${Math.min(100, ((now - rep.lastTick) / this.repTime) * 100)}%`; }
            } else {
                if (!this.deskScreen.classList.contains('hidden')) document.getElementById(`rep-bar-${i}`).style.width = `0%`;
            }
        });
        if (uiNeedsUpdate && !this.deskScreen.classList.contains('hidden')) this.renderAlchemyPouch();
    }

    updateInteractableOutlines() {
        const targets = [{ img: this.workbenchImg, zone: this.workbenchZone, radius: 80 }, ...this.materials.getChildren().map(mat => ({ img: mat, zone: mat, radius: 50 }))];
        targets.forEach(t => {
            if (!t.img || !t.img.active) return;
            const isNear = Phaser.Math.Distance.BetweenPoints(this.player, t.zone) < t.radius; 
            if (isNear && !t.img.hasOutline) {
                t.img.outlineFX = t.img.preFX.addGlow(0xffffff, 2.5, 0, false);
                t.img.hasOutline = true; t.img.baseScale = t.img.scale; 
                this.tweens.add({ targets: t.img, scale: t.img.baseScale * 1.15, duration: 150, ease: 'Back.easeOut' });
            } else if (!isNear && t.img.hasOutline) {
                if (t.img.outlineFX) t.img.preFX.remove(t.img.outlineFX);
                t.img.hasOutline = false;
                if (t.img.baseScale) this.tweens.add({ targets: t.img, scale: t.img.baseScale, duration: 150, ease: 'Sine.easeInOut' });
            }
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
        if (!this.player.active) return;
        this.updateInteractableOutlines();
        this.updateReplicatorsTick();

        if (!this.deskScreen.classList.contains('hidden') || !this.sysMenuModal.classList.contains('hidden') || !this.dictModal.classList.contains('hidden') || !this.upgradeModal.classList.contains('hidden') || (this.portalModal && !this.portalModal.classList.contains('hidden'))) { 
            this.player.body.setVelocity(0, 0); return; 
        }
        
        let vx = 0, vy = 0;
        if (this.keys.A.isDown) vx = -this.playerSpeed; else if (this.keys.D.isDown) vx = this.playerSpeed;
        if (this.keys.W.isDown) vy = -this.playerSpeed; else if (this.keys.S.isDown) vy = this.playerSpeed;
        this.player.body.setVelocity(vx, vy);

        if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) this.toggleSystemMenu();

        if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
            // 바닥에 떨어진 재료 줍기
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

            // 작업대 청소 & 상호작용
            if (Phaser.Math.Distance.BetweenPoints(this.player, this.workbenchZone) < 80) {
                // 🌟 this.isWorkbenchCleaned 대신 레지스트리 원본을 검사
                if (!this.registry.get('isWorkbenchCleaned')) {
                    this.isWorkbenchCleaned = true;
                    this.registry.set('isWorkbenchCleaned', true);
                    this.workbenchImg.setTexture('obj_table_clean');
                    console.log("🧹 작업대 청소 완료 및 저장");
                    this.saveGameData();
                } else {
                    this.openAlchemyDesk();
                }   
            }

            // 포탈 팝업 호출
            if (Phaser.Math.Distance.BetweenPoints(this.player, this.northPortal) < 80) {
                this.targetSceneName = 'NorthForestScene';
                if (this.portalModalDesc) this.portalModalDesc.innerText = "북쪽 지역으로 이동하시겠습니까?";
                this.input.keyboard.resetKeys();
                this.input.keyboard.enabled = false;
                if (this.portalModal) this.portalModal.classList.remove('hidden');
            }

            if (Phaser.Math.Distance.BetweenPoints(this.player, this.camp2CavePortal) < 80) {
                this.targetSceneName = 'Camp2CaveScene';
                if (this.portalModalDesc) this.portalModalDesc.innerText = "동굴 지역으로 이동하시겠습니까?";
                this.input.keyboard.resetKeys();
                this.input.keyboard.enabled = false;
                if (this.portalModal) this.portalModal.classList.remove('hidden');
            }
        }
    }

    toggleSystemMenu() { 
        this.input.keyboard.resetKeys();
        if (this.sysMenuModal.classList.contains('hidden')) { this.input.keyboard.enabled = false; this.sysMenuModal.classList.remove('hidden'); this.hudContainer.classList.add('hidden'); } 
        else { this.sysMenuModal.classList.add('hidden'); this.hudContainer.classList.remove('hidden'); this.input.keyboard.enabled = true; } 
    }

    openUpgradeUI() { this.input.keyboard.resetKeys(); this.input.keyboard.enabled = false; this.upgradeModal.classList.remove('hidden'); this.hudContainer.classList.add('hidden'); this.renderUpgradeUI(); }
    
    renderUpgradeUI() { 
        document.getElementById('available-points').innerText = this.availablePoints; 
        document.getElementById('upg-lv-speed').innerText = `Lv.${this.upgrades.speed}`; 
        document.getElementById('upg-lv-time').innerText = `Lv.${this.upgrades.time}`; 
        document.getElementById('upg-lv-yield').innerText = `Lv.${this.upgrades.yield}`; 
        const slotReq = document.getElementById('upg-slot2-req'); const slotText = document.getElementById('upg-lv-slot2'); 
        if (this.upgrades.slot2) { slotReq.innerText = "해방 완료!"; slotReq.style.color = "#32cd32"; slotText.innerText = "ON"; slotText.style.color = "#32cd32"; } 
        else { slotReq.innerText = `요구: 도감 30종 (현재 ${this.discoveredWords.length}종) / 필요 10PT`; slotReq.style.color = this.discoveredWords.length >= 30 ? "#fff" : "#ff4757"; slotText.innerText = "OFF"; slotText.style.color = "#aaa"; } 
    }
    
    handleUpgradeClick(type, isPlus) { 
        if (isPlus) { 
            if (type === 'speed' && this.upgrades.speed < 10 && this.availablePoints >= 1) this.upgrades.speed++; 
            if (type === 'time' && this.upgrades.time < 10 && this.availablePoints >= 1) this.upgrades.time++; 
            if (type === 'yield' && this.upgrades.yield < 3 && this.availablePoints >= 5) this.upgrades.yield++; 
            if (type === 'slot2' && !this.upgrades.slot2 && this.discoveredWords.length >= 30 && this.availablePoints >= 10) this.upgrades.slot2 = true; 
        } else { 
            if (type === 'speed' && this.upgrades.speed > 0) this.upgrades.speed--; 
            if (type === 'time' && this.upgrades.time > 0) this.upgrades.time--; 
            if (type === 'yield' && this.upgrades.yield > 0) this.upgrades.yield--; 
            if (type === 'slot2' && this.upgrades.slot2) { if (this.replicators[1].item) { alert("2번 슬롯이 가동 중일 때는 초기화할 수 없습니다!"); return; } this.upgrades.slot2 = false; } 
        } 
        this.registry.set('upgrades', this.upgrades);
        this.renderUpgradeUI(); 
        this.saveGameData();
    }

    showDictList() { 
        this.input.keyboard.resetKeys(); this.input.keyboard.enabled = false; this.dictModal.classList.remove('hidden'); this.hudContainer.classList.add('hidden'); 
        document.getElementById('dict-detail-view').classList.add('hidden'); document.getElementById('dict-list-view').classList.remove('hidden'); 
        document.getElementById('collection-count').innerText = `발견한 재료: ${this.discoveredWords.length}종`; 
        const listContainer = document.getElementById('collection-list'); listContainer.innerHTML = ''; 
        const searchTerm = document.getElementById('dict-search').value.trim().toLowerCase(); const sortType = document.getElementById('dict-sort').value;
        let displayList = [...this.discoveryOrder]; 
        if (searchTerm) displayList = displayList.filter(w => w.toLowerCase().includes(searchTerm));
        if (sortType === 'recent') displayList.reverse(); else if (sortType === 'alpha') displayList.sort((a, b) => a.localeCompare(b, 'ko-KR')); 
        if (displayList.length === 0) { listContainer.innerHTML = '<div style="color:#888; text-align:center; padding:20px;">검색 결과가 없습니다.</div>'; return; } 
        displayList.forEach(word => { 
            const item = document.createElement('div'); item.className = 'collection-item'; item.innerHTML = `${word} <span style="float:right; color:#00ffff;">▶</span>`; 
            item.onclick = (e) => { e.stopPropagation(); this.showDictDetail(word); }; listContainer.appendChild(item); 
        }); 
    }

    showDictDetail(word) { 
        document.getElementById('dict-list-view').classList.add('hidden'); document.getElementById('dict-detail-view').classList.remove('hidden'); 
        document.getElementById('dict-detail-title').innerText = word; const recipeList = document.getElementById('dict-recipe-list'); recipeList.innerHTML = ''; 
        const recipes = this.discoveredRecipes[word] || []; 
        if (recipes.length === 0) { recipeList.innerHTML = '<span style="color:#aaa;">자연에서 얻거나 아직 조합법을 모릅니다.</span>'; } 
        else { recipes.forEach(recipe => { 
            const row = document.createElement('div'); row.className = 'recipe-row'; 
            const m1 = document.createElement('button'); m1.className = 'recipe-mat-btn'; m1.innerText = recipe[0]; m1.onclick = () => this.showDictDetail(recipe[0]); 
            const plus = document.createElement('span'); plus.innerText = '+'; plus.style.fontWeight = 'bold'; 
            const m2 = document.createElement('button'); m2.className = 'recipe-mat-btn'; m2.innerText = recipe[1]; m2.onclick = () => this.showDictDetail(recipe[1]); 
            row.appendChild(m1); row.appendChild(plus); row.appendChild(m2); recipeList.appendChild(row); 
        }); } 
    }
    
    openAlchemyDesk() { this.input.keyboard.resetKeys(); this.input.keyboard.enabled = false; this.deskScreen.classList.remove('hidden'); this.hudContainer.classList.add('hidden'); this.syncReplicatorUI(); this.renderAlchemyPouch(); }

    syncReplicatorUI() { 
        for(let i=0; i<2; i++) { 
            const dropZone = document.getElementById(`rep-drop-${i}`); const removeBtn = document.getElementById(`remove-rep-${i}`); 
            if(i === 1 && !this.upgrades.slot2) { dropZone.className = 'replicator-tube locked'; dropZone.innerHTML = `<span>잠김<br>(진화 필요)</span>`; removeBtn.classList.add('hidden'); continue; } 
            if (this.replicators[i].item) { dropZone.className = 'replicator-tube active'; dropZone.innerHTML = `<span>${this.replicators[i].item}</span>`; removeBtn.classList.remove('hidden'); } 
            else { dropZone.className = 'replicator-tube empty'; dropZone.innerHTML = `<span>${i+1}번 슬롯<br>드롭</span>`; removeBtn.classList.add('hidden'); } 
        } 
    }
    
// ==========================================
    // 🌟 인벤토리(마법의 주머니) 렌더링 & 드래그 앤 드롭 합성 로직
    // ==========================================
    renderAlchemyPouch() { 
        this.pouchContainer.innerHTML = ''; 
        const searchTerm = document.getElementById('pouch-search').value.trim().toLowerCase();
        const sortType = document.getElementById('pouch-sort').value;
        
        // 보유 개수가 1개 이상인 아이템만 필터링
        let availableItems = Object.entries(this.wordInventory).filter(([word, count]) => count > 0);

        if (searchTerm) availableItems = availableItems.filter(([word]) => word.toLowerCase().includes(searchTerm));
        
        if (sortType === 'alpha') {
            availableItems.sort((a, b) => a[0].localeCompare(b[0], 'ko-KR')); 
        } else if (sortType === 'recent') {
            availableItems.sort((a, b) => this.discoveryOrder.indexOf(b[0]) - this.discoveryOrder.indexOf(a[0]));
        }

        availableItems.forEach(([word, count]) => { 
            // 단어 버블(UI) 생성
            const bubble = document.createElement('div'); 
            bubble.className = 'word-bubble'; 
            bubble.draggable = true; 
            bubble.innerHTML = `${word} <span class="item-count">x${count}</span>`; 
            
            // 기본 드래그 이벤트 연결
            bubble.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', word)); 
            bubble.addEventListener('dragover', (e) => { e.preventDefault(); bubble.classList.add('drag-over'); }); 
            bubble.addEventListener('dragleave', () => bubble.classList.remove('drag-over')); 
            bubble.addEventListener('dblclick', () => { 
                if (this.wordInventory[word] > 0) { 
                    let targetSlot = -1; 
                    if(!this.replicators[0].item) targetSlot = 0; 
                    else if(this.upgrades.slot2 && !this.replicators[1].item) targetSlot = 1; 
                    
                    if(targetSlot !== -1) this.insertToReplicator(word, targetSlot); 
                } 
            }); 
            // 🌟 백엔드 DB 연동 드롭(합성) 이벤트!
            bubble.addEventListener('drop', async (e) => { 
                e.preventDefault(); 
                bubble.classList.remove('drag-over'); 
                
                if (this.isSynthesizing) return; 
                
                const draggedWord = e.dataTransfer.getData('text/plain'); 
                if (draggedWord === word && this.wordInventory[word] < 2) return; 
                
                this.isSynthesizing = true; 
                this.loadingLock.classList.remove('hidden'); 
                
                try { 
                    // 1. 재료 소모
                    this.wordInventory[draggedWord] -= 1; 
                    this.wordInventory[word] -= 1; 
                    if (this.wordInventory[draggedWord] <= 0) delete this.wordInventory[draggedWord]; 
                    if (this.wordInventory[word] <= 0) delete this.wordInventory[word]; 
                    
                    this.registry.set('wordInventory', this.wordInventory);
                    this.renderAlchemyPouch(); 
                    
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // 🌟 2. DB 데이터 불러오기
                    const mixLookup = this.registry.get('dbMixLookup');
                    const dbMaterials = this.registry.get('dbMaterials');
                    let resultWord = null;

                    if (mixLookup && dbMaterials) {
                        const w1 = draggedWord.trim();
                        const w2 = word.trim();
                        
                        const mat1 = dbMaterials.find(m => m.name === w1);
                        const mat2 = dbMaterials.find(m => m.name === w2);

                        if (mat1 && mat2) {
                            // 🌟 DB 팀원 맞춤형 로직: "mat_10"에서 숫자(10)만 쏙 뽑아내서 정수로 변환!
                            const num1 = parseInt(mat1.material_id.replace(/[^0-9]/g, ''), 10);
                            const num2 = parseInt(mat2.material_id.replace(/[^0-9]/g, ''), 10);
                            
                            let idCombo = "";
                            // 🌟 무조건 숫자가 작은 번호가 앞으로 오게 강제 조립!
                            if (num1 <= num2) {
                                idCombo = `${mat1.material_id}#${mat2.material_id}`;
                            } else {
                                idCombo = `${mat2.material_id}#${mat1.material_id}`;
                            }
                            
                            console.log(`🔍 [정렬 완료 검색] DB 개발자 규칙 적용: '${idCombo}' 로 찾습니다!`);
                            
                            const resultData = mixLookup[idCombo];

                            if (resultData) {
                                resultWord = resultData.name; 
                            }
                        }
                    }
                    // ----------------------------------------------------

                    if (mixLookup) {
                        const w1 = draggedWord.trim();
                        const w2 = word.trim();
                        let resultData = null;

                        // [방법 1] ID로 조합 검색 ("mat_001#mat_002")
                        if (dbMaterials) {
                            const mat1 = dbMaterials.find(m => m.name === w1);
                            const mat2 = dbMaterials.find(m => m.name === w2);

                            if (mat1 && mat2) {
                                const idCombo1 = `${mat1.material_id}#${mat2.material_id}`;
                                const idCombo2 = `${mat2.material_id}#${mat1.material_id}`;
                                resultData = mixLookup[idCombo1] || mixLookup[idCombo2];
                            }
                        }

                        // [방법 2] 이름으로 검색 백업
                        if (!resultData) {
                            const nameComboPlus1 = `${w1}+${w2}`;
                            const nameComboPlus2 = `${w2}+${w1}`;
                            const nameComboHash1 = `${w1}#${w2}`;
                            const nameComboHash2 = `${w2}#${w1}`;
                            resultData = mixLookup[nameComboPlus1] || mixLookup[nameComboPlus2] || mixLookup[nameComboHash1] || mixLookup[nameComboHash2];
                        }

                        if (resultData) {
                            resultWord = resultData.name; 
                        }
                    }
                    
                    // 3. 조합 결과 처리
                    if (resultWord) {
                        this.wordInventory[resultWord] = (this.wordInventory[resultWord] || 0) + 1; 
                        this.registry.set('wordInventory', this.wordInventory);
                        
                        this.addDiscoveredWord(resultWord); 

                        if (!this.discoveredRecipes[resultWord]) this.discoveredRecipes[resultWord] = []; 
                        const sortedRecipe = [draggedWord, word].sort(); 
                        const exists = this.discoveredRecipes[resultWord].some(r => r[0] === sortedRecipe[0] && r[1] === sortedRecipe[1]); 
                        if (!exists) {
                            this.discoveredRecipes[resultWord].push(sortedRecipe); 
                            this.registry.set('discoveredRecipes', this.discoveredRecipes);
                        }
                        console.log(`✨ 조합 성공! [${draggedWord}] + [${word}] = [${resultWord}] 탄생!`);
                    } else {
                        // DB에 없는 레시피 처리
                        console.log(`펑! [${draggedWord}] + [${word}] 조합은 존재하지 않습니다.`);
                        
                        this.wordInventory[draggedWord] = (this.wordInventory[draggedWord] || 0) + 1; 
                        this.wordInventory[word] = (this.wordInventory[word] || 0) + 1; 
                        this.registry.set('wordInventory', this.wordInventory);
                    }

                    this.saveGameData();

                } catch (err) {
                    console.error("합성 중 에러 발생:", err);
                } finally { 
                    this.isSynthesizing = false; 
                    this.loadingLock.classList.add('hidden'); 
                    this.renderAlchemyPouch(); 
                } 
            });            
            // 화면에 렌더링
            this.pouchContainer.appendChild(bubble); 
        }); 
    }

    insertToReplicator(item, slotIdx) { 
        if (this.replicators[slotIdx].item === item) return; 
        if (this.replicators[slotIdx].item) this.wordInventory[this.replicators[slotIdx].item] = (this.wordInventory[this.replicators[slotIdx].item] || 0) + 1; 
        this.wordInventory[item] -= 1; 
        if (this.wordInventory[item] === 0) delete this.wordInventory[item]; 
        this.replicators[slotIdx] = { item: item, lastTick: Date.now() }; 
        
        this.registry.set('wordInventory', this.wordInventory);
        this.registry.set('replicators', this.replicators);
        
        this.syncReplicatorUI(); this.renderAlchemyPouch(); 
        this.saveGameData();
    }
    
    removeFromReplicator(slotIdx) { 
        if (!this.replicators[slotIdx].item) return; 
        this.wordInventory[this.replicators[slotIdx].item] = (this.wordInventory[this.replicators[slotIdx].item] || 0) + 1; 
        this.replicators[slotIdx] = { item: null, lastTick: 0 }; 
        
        this.registry.set('wordInventory', this.wordInventory);
        this.registry.set('replicators', this.replicators);

        this.syncReplicatorUI(); this.renderAlchemyPouch(); 
        this.saveGameData();
    }
}