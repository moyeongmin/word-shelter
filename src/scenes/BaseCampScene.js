import Phaser from 'phaser';
import { combineWords } from '../api/db.js';
import AlchemyController from '../features/alchemy/AlchemyController.js';
import LostPartQuest from '../features/quest/LostPartQuest.js';
import TimeLapseSequence from '../features/ending/TimeLapseSequence.js';
import HouseMaterialSubmission from '../features/alchemy/HouseMaterialSubmission.js';
import QuestManager from '../features/quest/QuestManager';
import { waitForHouseGeneration } from '../api/houseGeneration';

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

        this.load.image('cutscene_3', 'assets/images/StartScene3.png');
    }

    // 🌟 1. 확실한 데이터 저장 함수 (로컬 스토리지)
    saveGameData() {
        const saveData = {
            wordInventory: this.registry.get('wordInventory'),
            discoveredWords: this.registry.get('discoveredWords'),
            discoveredRecipes: this.registry.get('discoveredRecipes'),
            replicators: this.registry.get('replicators'),
            upgrades: this.registry.get('upgrades'),
            discoveryOrder: this.registry.get('discoveryOrder'),
            isWorkbenchCleaned: this.registry.get('isWorkbenchCleaned'),
            evolutionPoints: this.registry.get('evolutionPoints')
        };
        localStorage.setItem('cyberAlchemySave', JSON.stringify(saveData));
        console.log("💾 게임 저장 완료!", saveData);
    }

    // 🌟 2. 뚫리지 않는 로컬 스토리지 불러오기
    init(data) {
        if (data && data.spawnFrom) this.spawnFrom = data.spawnFrom; 
        
        if (!this.registry.get('houseBuildState')) {
            this.registry.set('houseBuildState', {
                submitted: false, requestStarted: false, requestCompleted: false,
                quest: { active: false, completed: false, startedAt: null, partFound: false, partDelivered: false },
                timeLapseStarted: false, endingReady: false
            });
        }

        const savedDataString = localStorage.getItem('cyberAlchemySave');
        
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
            this.registry.set('evolutionPoints', savedData.evolutionPoints || 0);

            this.registry.set('isSaveLoaded', true);
            this.registry.set('isInitialized', true);
        } else if (!this.registry.get('isInitialized')) {
            console.log("🆕 세이브 파일 없음. 새 게임을 시작합니다.");
            this.registry.set('wordInventory', {});
            this.registry.set('discoveredWords', ['불', '물', '나무', '돌', '흙']);
            this.registry.set('discoveredRecipes', {});
            this.registry.set('replicators', [{ item: null, lastTick: 0 }, { item: null, lastTick: 0 }]);
            this.registry.set('upgrades', { speed: 0, time: 0, yield: 0, slot2: false });
            this.registry.set('discoveryOrder', []); 
            this.registry.set('isWorkbenchCleaned', false);
            this.registry.set('evolutionPoints', 0);
            this.registry.set('isInitialized', true);
        }

        const buildState = this.registry.get('houseBuildState');
        if (buildState?.quest && buildState.quest.partDelivered === undefined) {
            buildState.quest.partDelivered = false;
            this.registry.set('houseBuildState', buildState);
        }

        if (!this.registry.get('houseMaterials')) {
            this.registry.set('houseMaterials', Array(10).fill(null));
        }

        if (this.registry.get('houseGenerationResult') === undefined) {
            this.registry.set('houseGenerationResult', null);
        }

        this.wordInventory = this.registry.get('wordInventory');
        this.discoveredWords = this.registry.get('discoveredWords');
        this.discoveredRecipes = this.registry.get('discoveredRecipes');
        this.replicators = this.registry.get('replicators');
        this.upgrades = this.registry.get('upgrades');
        this.discoveryOrder = this.registry.get('discoveryOrder');
        this.evolutionPoints = this.registry.get('evolutionPoints');
        this.isWorkbenchCleaned = this.registry.get('isWorkbenchCleaned');
    }

    addDiscoveredWord(word) {
        if (!this.discoveredWords.includes(word)) {
            this.discoveredWords.push(word);
            this.discoveryOrder.push(word);
            this.evolutionPoints += 1;

            this.registry.set('discoveredWords', this.discoveredWords);
            this.registry.set('discoveryOrder', this.discoveryOrder);
            this.registry.set('evolutionPoints', this.evolutionPoints);

            console.log(`📖 [${word}] 도감 등록! 진화 포인트 +1 (현재 ${this.evolutionPoints}PT)`);
            this.saveGameData(); 
        }
    }

    get availablePoints() { return this.evolutionPoints ?? 0; }
    get playerSpeed() { return 120 + (this.upgrades.speed * 9); } 
    get repTime() { return 15000 - (this.upgrades.time * 1000); } 
    get repYield() { return 1 + this.upgrades.yield; }

    create() {
        this.fetchGameDataFromDB();

        // 픽셀 텍스처 생성
        if (!this.textures.exists('pixel')) { 
            const g = this.make.graphics({x: 0, y: 0, add: false}); 
            g.fillStyle(0xffffff, 1); 
            g.fillRect(0, 0, 4, 4); 
            g.generateTexture('pixel', 4, 4); 
        }

        const bg = this.add.image(0, 0, 'bg_basecamp').setOrigin(0, 0);
        bg.setDepth(-2);

        this.physics.world.setBounds(0, 0, bg.width, bg.height);
        this.cameras.main.setBounds(0, 0, bg.width, bg.height);
        this.cameras.main.setZoom(1.5); 

        this.anims.create({
            key: 'campfire_burn',
            frames: [ { key: 'campfire_1' }, { key: 'campfire_2' }, { key: 'campfire_3' } ],
            frameRate: 2, repeat: -1 
        });
        
        this.campfire = this.physics.add.sprite(300, bg.height - 170, 'campfire_1');
        this.campfire.setScale(0.2);
        this.campfire.play('campfire_burn');

        this.materials = this.physics.add.group();
        this.time.addEvent({ delay: 7000, callback: () => this.spawnMaterialAround(this.campfire.x, this.campfire.y, 40, 80, '불', 'item_fire', 5), loop: true });
        
        const pondCenterX = bg.width * 0.7;
        const pondCenterY = bg.height * 0.765;
        this.time.addEvent({ delay: 5000, callback: () => this.spawnMaterialAround(pondCenterX, pondCenterY, 80, 130, '물', 'item_water', 5, Math.PI, Math.PI * 1.5), loop: true });

        // 스폰 위치 로직
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

        this.workbenchImg.setDepth(-1);
        
        this.workbenchZone = this.add.rectangle(tableX, tableY + 15, 100, 60, 0x0, 0); 
        this.physics.add.existing(this.workbenchZone, true);

        // 맵 충돌망
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
        this.keys = this.input.keyboard.addKeys('W,A,S,D,F,ESC,T');

        // DOM 바인딩
        this.sysMenuModal = document.getElementById('system-menu-modal'); 
        this.dictModal = document.getElementById('dictionary-modal');
        this.upgradeModal = document.getElementById('upgrade-modal'); 
        this.deskScreen = document.getElementById('alchemy-desk-screen');
        this.pouchContainer = document.getElementById('magic-pouch');
        this.loadingLock = document.getElementById('alchemy-loading-lock'); 
        this.hudContainer = document.getElementById('hud-container');

        // BaseCampScene.js의 create() 함수 내부 (DOM 바인딩하는 곳 아래)

        this.pouchContainer = document.getElementById('magic-pouch');
        this.bubblePositions = {}; // 👈 위치 기억용 저장소 부활!
        // 🌟 2. 주머니에 자유롭게 드롭하는 이벤트 '한 번만' 등록
        if (this.pouchContainer) {
            this.pouchContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
            });

            this.pouchContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation(); // 엉뚱한 곳으로 이벤트 튀는 것 방지

                const word = e.dataTransfer.getData('text/plain');
                if (word) {
                    const rect = this.pouchContainer.getBoundingClientRect();
                    const x = e.clientX - rect.left - 40; // 마우스 커서 중앙 정렬
                    const y = e.clientY - rect.top - 20;

                    // 1) 위치 기억하기
                    this.bubblePositions[word] = { left: `${x}px`, top: `${y}px` };

                    // 2) 화면 전체를 껐다 켜지 않고 해당 버블만 즉시 이동!
                    const bubbles = document.querySelectorAll('.word-bubble');
                    bubbles.forEach(b => {
                        // "물 x3" 같은 텍스트가 있으므로 이름으로 찾기
                        if (b.innerText.startsWith(word)) {
                            b.style.left = `${x}px`;
                            b.style.top = `${y}px`;
                        }
                    });
                }
            });
        }

        // 매니저 & 퀘스트 바인딩
        this.questManager = new QuestManager(this);
        this.questManager.initialize();
        this.timeLapseSequence = new TimeLapseSequence(this);
        this.alchemy = new AlchemyController(this, this.questManager, this.timeLapseSequence );
        this.houseTimeLapseRunning = false;
        this.lostPartQuest = new LostPartQuest(this, { onReturned: () => { this.handleLostPartReturned(); } });

        // 팝업 & 컷신 모달
        this.portalModal = document.getElementById('portal-confirm-modal');
        this.portalModalDesc = document.getElementById('portal-modal-desc');
        this.targetSceneName = null;
        this.targetSpawnFrom = 'BaseCamp';
        
        this.cleanModal = document.getElementById('clean-confirm-modal');
        this.cutsceneContainer = document.getElementById('cutscene-container');
        this.speakerNameEl = document.getElementById('speaker-name');
        this.dialogueTextEl = document.getElementById('dialogue-text');

        // 청소 팝업 버튼 이벤트
        if (this.cleanModal) {
            document.getElementById('clean-yes-btn').onclick = (e) => {
                e.stopPropagation();
                this.cleanModal.classList.add('hidden');
                this.startWorkbenchCutscene(); 
            };
            document.getElementById('clean-no-btn').onclick = (e) => {
                e.stopPropagation();
                this.cleanModal.classList.add('hidden');
                this.input.keyboard.resetKeys();
                this.input.keyboard.enabled = true;
            };
        }

        // F키(portalKeyHandler) 로직을 통합형으로 교체!
        this.uiKeyHandler = (e) => {
            if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F' || e.key === 'ㄹ') {
                if (this.portalModal && !this.portalModal.classList.contains('hidden')) {
                    e.preventDefault(); e.stopPropagation();
                    document.getElementById('portal-yes-btn').click();
                } else if (this.cleanModal && !this.cleanModal.classList.contains('hidden')) {
                    e.preventDefault(); e.stopPropagation();
                    document.getElementById('clean-yes-btn').click();
                }
            }
        };
        window.addEventListener('keydown', this.uiKeyHandler);
        this.events.once('shutdown', () => { window.removeEventListener('keydown', this.uiKeyHandler); });

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

        const openUpgradeBtn = document.getElementById('open-upgrade-btn');
        if (openUpgradeBtn) openUpgradeBtn.onclick = (e) => { e.stopPropagation(); this.openUpgradeUI(); };
        
        const closeUpgradeBtn = document.getElementById('close-upgrade-btn');
        if (closeUpgradeBtn) closeUpgradeBtn.onclick = (e) => { 
            e.stopPropagation(); 
            this.upgradeModal.classList.add('hidden');
            this.hudContainer.classList.remove('hidden');
            this.input.keyboard.resetKeys(); 
            this.input.keyboard.enabled = true; 
        };
        
        const hamburgerBtn = document.getElementById('hamburger-btn');
        if (hamburgerBtn) hamburgerBtn.onclick = (e) => { e.stopPropagation(); this.toggleSystemMenu(); };
        
        const closeSystemBtn = document.getElementById('close-system-btn');
        if (closeSystemBtn) closeSystemBtn.onclick = (e) => { e.stopPropagation(); this.toggleSystemMenu(); };
        
        const openDictBtn = document.getElementById('open-dict-btn');
        if (openDictBtn) openDictBtn.onclick = (e) => { 
            e.stopPropagation(); 
            this.sysMenuModal.classList.add('hidden'); 
            this.showDictList(); 
        };
        
        const closeDictBtn = document.getElementById('close-dict-btn');
        if (closeDictBtn) closeDictBtn.onclick = (e) => { 
            e.stopPropagation(); 
            this.dictModal.classList.add('hidden');
            this.hudContainer.classList.remove('hidden');
            this.input.keyboard.resetKeys(); 
            this.input.keyboard.enabled = true; 
        };
        
        const dictBackBtn = document.getElementById('dict-back-btn');
        if (dictBackBtn) dictBackBtn.onclick = (e) => { e.stopPropagation(); this.showDictList(); };

        const closeDeskBtn = document.getElementById('close-desk-btn');
        if (closeDeskBtn) closeDeskBtn.onclick = (e) => { e.stopPropagation(); this.deskScreen.classList.add('hidden'); this.hudContainer.classList.remove('hidden'); this.input.keyboard.resetKeys(); this.input.keyboard.enabled = true; };

        // 진화 +/- 버튼 이벤트
        document.querySelectorAll('.upg-btn').forEach((btn) => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const type = btn.dataset.type || btn.getAttribute('data-type');
                const isPlus = btn.classList.contains('plus');
                console.log('🧬 진화 버튼 클릭:', type, isPlus ? '+' : '-');
                this.handleUpgradeClick(type, isPlus);
            };
        });

        // 복제기 드래그 앤 드롭
        for(let i=0; i<2; i++) {
            const dropZone = document.getElementById(`rep-drop-${i}`); 
            const removeRep = document.getElementById(`remove-rep-${i}`);
            if (removeRep) removeRep.onclick = (e) => { e.stopPropagation(); this.removeFromReplicator(i); };
            if (dropZone) {
                dropZone.addEventListener('dragover', (e) => { if(!dropZone.classList.contains('locked')) { e.preventDefault(); dropZone.classList.add('drag-over'); } });
                dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
                dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); if (dropZone.classList.contains('locked')) return; this.insertToReplicator(e.dataTransfer.getData('text/plain'), i); });
            }
        }

        const dictSearch = document.getElementById('dict-search');
        if (dictSearch) dictSearch.addEventListener('input', () => this.showDictList());
        const dictSort = document.getElementById('dict-sort');
        if (dictSort) dictSort.addEventListener('change', () => this.showDictList());
        
        const pouchSearch = document.getElementById('pouch-search');
        if (pouchSearch) pouchSearch.addEventListener('input', () => this.renderAlchemyPouch());
        const pouchSort = document.getElementById('pouch-sort');
        if (pouchSort) pouchSort.addEventListener('change', () => this.renderAlchemyPouch());
    }

    // ==========================================
    // 🌐 DB에서 게임 데이터 불러오기 & 기본 재료 자동 지급
    // ==========================================
    async fetchGameDataFromDB() {
        try {
            const apiUrl = 'https://ls4bj14ryk.execute-api.ap-northeast-2.amazonaws.com/api/v1/game-data'; 
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.ok && data.materials) {
                this.registry.set('dbMaterials', data.materials);
                this.registry.set('dbMixLookup', data.mix_lookup || {});
                console.log("✅ [DB 연동 성공] 아이템 목록과 레시피를 가져왔습니다!", data);

                let isUpdated = false;
                data.materials.forEach(mat => {
                    if (mat.is_base) {
                        if (!this.wordInventory[mat.name] || this.wordInventory[mat.name] <= 0) {
                            this.wordInventory[mat.name] = 1;
                            isUpdated = true;
                        }
                        if (!this.discoveredWords.includes(mat.name)) {
                            this.discoveredWords.push(mat.name);
                            if (!this.discoveryOrder.includes(mat.name)) {
                                this.discoveryOrder.push(mat.name);
                            }
                            isUpdated = true;
                        }
                    }
                });

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

    // 🌟 T키 입력 시 테스트용 재료 10개 채우기
    fillTestMaterialsForHouse() {
        if (this.houseMaterialSubmission && typeof this.houseMaterialSubmission.fillTestMaterials === 'function') {
            this.houseMaterialSubmission.fillTestMaterials();
        } else {
            const testItems = ['랜덤 피규어', '거북선', '트랄랄레로 트랄랄라', '레오파드 거북', '흙', '바람', '철', '고양이', '도마뱀', '손흥민' ];
            testItems.forEach(item => {
                this.wordInventory[item] = (this.wordInventory[item] || 0) + 10;
                this.addDiscoveredWord(item);
            });
            this.syncRegistryReferences();
            if (this.deskScreen && !this.deskScreen.classList.contains('hidden')) {
                this.renderAlchemyPouch();
            }
            console.log("🧪 [테스트] 주요 재료가 각 10개씩 충전되고 진화 포인트가 갱신되었습니다!");
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
        let colorVal = 0xffffff; 
        if (typeof targetColor === 'string') {
            colorVal = Phaser.Display.Color.HexStringToColor(targetColor).color;
        } else if (typeof targetColor === 'number') {
            colorVal = targetColor;
        }

        this.add.particles(x, y, 'pixel', {
            tint: colorVal, speed: { min: 50, max: 150 },
            scale: { start: 1.2, end: 0 }, lifespan: 500,
            blendMode: 'ADD', duration: 100
        });
    }

    // ==========================================
    // 🌟 획득 시 머리 위 텍스트 팝업 (에러 방지 완벽판)
    // ==========================================
    showFloatingText(x, y, message, targetColor) {
        let fillStr = '#ffffff'; 
        if (typeof targetColor === 'string') {
            fillStr = targetColor;
        } else if (typeof targetColor === 'number') {
            fillStr = '#' + targetColor.toString(16).padStart(6, '0');
        }

        const text = this.add.text(x, y - 20, message, {
            fontSize: '15px', fill: fillStr, fontStyle: 'bold'
        }).setOrigin(0.5).setStroke('#000000', 3);

        this.tweens.add({ targets: text, y: y - 60, alpha: 0, duration: 1000, onComplete: () => text.destroy() });
    }

    update() {
        if (!this.player.active) return;
        this.updateInteractableOutlines();
        this.updateReplicatorsTick();
        this.alchemy?.update();

        if (Phaser.Input.Keyboard.JustDown(this.keys.T)) {
            this.fillTestMaterialsForHouse();
        }

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
                    this.wordInventory[mat.name] = (this.wordInventory[mat.name] || 0) + 1;
                    this.registry.set('wordInventory', this.wordInventory);
                    
                    if (typeof this.addDiscoveredWord === 'function') {
                        this.addDiscoveredWord(mat.name);
                    }

                    const effectColor = mat.colorHex || mat.color || '#ffffff';
                    this.createPickupBurst(mat.x, mat.y, effectColor);
                    this.showFloatingText(mat.x, mat.y, `+ ${mat.name}`, effectColor);

                    console.log(`✨ [${mat.name}] 획득!`);
                    mat.destroy(); 
                    this.saveGameData();
                }
            });

            // 작업대 청소 & 퀘스트 & 상호작용
            if (Phaser.Math.Distance.BetweenPoints(this.player, this.workbenchZone) < 80) {
                if (!this.isWorkbenchCleaned) {
                    this.input.keyboard.resetKeys();
                    this.input.keyboard.enabled = false;
                    this.cleanModal.classList.remove('hidden');
                } else if (this.canCompleteLostPartQuest()) {
                    this.completeLostPartQuestAtWorkbench();
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
        const ptsEl = document.getElementById('available-points');
        if (ptsEl) ptsEl.innerText = `${this.evolutionPoints} PT`;

        const speedLv = document.getElementById('upg-lv-speed');
        const timeLv = document.getElementById('upg-lv-time');
        const yieldLv = document.getElementById('upg-lv-yield');

        if (speedLv) speedLv.innerText = `Lv.${this.upgrades.speed}`;
        if (timeLv) timeLv.innerText = `Lv.${this.upgrades.time}`;
        if (yieldLv) yieldLv.innerText = `Lv.${this.upgrades.yield}`;

        const speedPlus = document.getElementById('btn-speed-plus') || document.getElementById('upg-speed-plus');
        const timePlus = document.getElementById('btn-time-plus') || document.getElementById('upg-time-plus');
        const yieldPlus = document.getElementById('btn-yield-plus') || document.getElementById('upg-yield-plus');
        const slot2Plus = document.getElementById('btn-slot2-plus') || document.getElementById('upg-slot2-plus');

        if (speedPlus) speedPlus.disabled = this.upgrades.speed >= 10 || this.evolutionPoints < 1;
        if (timePlus) timePlus.disabled = this.upgrades.time >= 10 || this.evolutionPoints < 1;
        if (yieldPlus) yieldPlus.disabled = this.upgrades.yield >= 3 || this.evolutionPoints < 5;
        if (slot2Plus) slot2Plus.disabled = this.upgrades.slot2 || this.discoveredWords.length < 30 || this.evolutionPoints < 10;

        const speedMinus = document.getElementById('btn-speed-minus') || document.getElementById('upg-speed-minus');
        const timeMinus = document.getElementById('btn-time-minus') || document.getElementById('upg-time-minus');
        const yieldMinus = document.getElementById('btn-yield-minus') || document.getElementById('upg-yield-minus');
        const slot2Minus = document.getElementById('btn-slot2-minus') || document.getElementById('upg-slot2-minus');

        if (speedMinus) speedMinus.disabled = this.upgrades.speed <= 0;
        if (timeMinus) timeMinus.disabled = this.upgrades.time <= 0;
        if (yieldMinus) yieldMinus.disabled = this.upgrades.yield <= 0;
        if (slot2Minus) slot2Minus.disabled = !this.upgrades.slot2 || !!this.replicators[1]?.item;

        const slotReq = document.getElementById('upg-slot2-req');
        const slotText = document.getElementById('upg-lv-slot2');

        if (slotReq && slotText) {
            if (this.upgrades.slot2) {
                slotReq.innerText = '해방 완료!';
                slotReq.style.color = '#32cd32';
                slotText.innerText = 'ON';
                slotText.style.color = '#32cd32';
            } else {
                const hasEnoughWords = this.discoveredWords.length >= 30;
                const hasEnoughPoints = this.evolutionPoints >= 10;
                slotReq.innerText = `요구: 도감 30종 (현재 ${this.discoveredWords.length}종) / 10PT (보유 ${this.evolutionPoints}PT)`;
                slotReq.style.color = hasEnoughWords && hasEnoughPoints ? '#ffffff' : '#ff4757';
                slotText.innerText = 'OFF';
                slotText.style.color = '#aaa';
            }
        }
    }
    
    handleUpgradeClick(type, isPlus) {
        const costs = { speed: 1, time: 1, yield: 5, slot2: 10 };
        const cost = costs[type];

        if (isPlus) {
            if (this.evolutionPoints < cost) { console.log(`⚠️ 진화 포인트 부족!`); return; }
            if (type === 'speed') {
                if (this.upgrades.speed >= 10) return;
                this.upgrades.speed++; this.evolutionPoints -= cost;
            } else if (type === 'time') {
                if (this.upgrades.time >= 10) return;
                this.upgrades.time++; this.evolutionPoints -= cost;
            } else if (type === 'yield') {
                if (this.upgrades.yield >= 3) return;
                this.upgrades.yield++; this.evolutionPoints -= cost;
            } else if (type === 'slot2') {
                if (this.upgrades.slot2 || this.discoveredWords.length < 30) return;
                this.upgrades.slot2 = true; this.evolutionPoints -= cost;
            }
        } else {
            if (type === 'speed') {
                if (this.upgrades.speed <= 0) return;
                this.upgrades.speed--; this.evolutionPoints += cost;
            } else if (type === 'time') {
                if (this.upgrades.time <= 0) return;
                this.upgrades.time--; this.evolutionPoints += cost;
            } else if (type === 'yield') {
                if (this.upgrades.yield <= 0) return;
                this.upgrades.yield--; this.evolutionPoints += cost;
            } else if (type === 'slot2') {
                if (!this.upgrades.slot2) return;
                if (this.replicators[1].item) { alert('2번 슬롯이 가동 중일 때는 초기화할 수 없습니다!'); return; }
                this.upgrades.slot2 = false; this.evolutionPoints += cost;
            }
        }

        this.registry.set('upgrades', this.upgrades);
        this.registry.set('evolutionPoints', this.evolutionPoints);
        console.log(`🧬 진화 포인트: ${this.evolutionPoints}PT`);

        this.renderUpgradeUI();
        this.syncReplicatorUI();
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
        document.getElementById('dict-list-view').classList.add('hidden'); 
        document.getElementById('dict-detail-view').classList.remove('hidden'); 
        document.getElementById('dict-detail-title').innerText = word; 
        const recipeList = document.getElementById('dict-recipe-list'); 
        recipeList.innerHTML = ''; 
        const recipes = this.discoveredRecipes[word] || []; 
        if (recipes.length === 0) { 
            recipeList.innerHTML = '<span style="color:#aaa;">자연에서 얻거나 아직 조합법을 모릅니다.</span>'; 
        } else { 
            recipes.forEach(recipe => { 
                const row = document.createElement('div'); row.className = 'recipe-row'; 
                const m1 = document.createElement('button'); m1.className = 'recipe-mat-btn'; m1.innerText = recipe[0]; m1.onclick = () => this.showDictDetail(recipe[0]); 
                const plus = document.createElement('span'); plus.innerText = '+'; plus.style.fontWeight = 'bold'; 
                const m2 = document.createElement('button'); m2.className = 'recipe-mat-btn'; m2.innerText = recipe[1]; m2.onclick = () => this.showDictDetail(recipe[1]); 
                row.appendChild(m1); row.appendChild(plus); row.appendChild(m2); 
                recipeList.appendChild(row); 
            }); 
        } 
    }
    
    openAlchemyDesk() { 
        // 1. 키보드 잠금 및 작업대 UI 열기
        this.input.keyboard.resetKeys(); 
        this.input.keyboard.enabled = false; 
        this.deskScreen.classList.remove('hidden'); 
        this.hudContainer.classList.add('hidden'); 
        
        // 2. 팀원의 AI 컨트롤러 실행 (하단의 AI 대화창, 집 짓기 폼 등 활성화)
        if (this.alchemy && typeof this.alchemy.open === 'function') {
            this.alchemy.open(); 
        }

        // 3. 🌟 핵심: 팀원 코드가 인벤토리를 단순 텍스트로 덮어버린 것을, 
        // 우리가 만든 '디자인 + DB 로직이 적용된 버블'로 다시 강제로 덮어씌웁니다!
        this.syncReplicatorUI(); 
        this.renderAlchemyPouch(); 
    }

    syncReplicatorUI() { 
        for(let i=0; i<2; i++) { 
            const dropZone = document.getElementById(`rep-drop-${i}`); 
            const removeBtn = document.getElementById(`remove-rep-${i}`); 
            if(!dropZone) continue;
            if(i === 1 && !this.upgrades.slot2) { 
                dropZone.className = 'replicator-tube locked'; 
                dropZone.innerHTML = `<span>잠김<br>(진화 필요)</span>`; 
                if(removeBtn) removeBtn.classList.add('hidden'); 
                continue; 
            } 
            if (this.replicators[i].item) { 
                dropZone.className = 'replicator-tube active'; 
                dropZone.innerHTML = `<span>${this.replicators[i].item}</span>`; 
                if(removeBtn) removeBtn.classList.remove('hidden'); 
            } else { 
                dropZone.className = 'replicator-tube empty'; 
                dropZone.innerHTML = `<span>${i+1}번 슬롯<br>드롭</span>`; 
                if(removeBtn) removeBtn.classList.add('hidden'); 
            } 
        } 
    }
    
    // ==========================================
    // 🌟 인벤토리(마법의 주머니) 렌더링 & 드래그 앤 드롭 합성 로직 (DB 연동 유지)
    // ==========================================
    renderAlchemyPouch() { 
        this.pouchContainer.innerHTML = ''; 
        const searchTerm = document.getElementById('pouch-search')?.value.trim().toLowerCase() || '';
        const sortType = document.getElementById('pouch-sort')?.value || 'recent';
        
        let availableItems = Object.entries(this.wordInventory).filter(([word, count]) => count > 0);
        if (searchTerm) availableItems = availableItems.filter(([word]) => word.toLowerCase().includes(searchTerm));
        
        if (sortType === 'alpha') {
            availableItems.sort((a, b) => a[0].localeCompare(b[0], 'ko-KR')); 
        } else if (sortType === 'recent') {
            availableItems.sort((a, b) => this.discoveryOrder.indexOf(b[0]) - this.discoveryOrder.indexOf(a[0]));
        }

        availableItems.forEach(([word, count]) => { 
            const bubble = document.createElement('div'); 
            bubble.className = 'word-bubble'; 
            bubble.draggable = true; 
            bubble.innerHTML = `${word} <span class="item-count">x${count}</span>`; 
            
            // 🌟 버블 절대 좌표 지정!
            if (!this.bubblePositions[word]) {
                // 처음 얻은 아이템은 주머니 속 10%~80% 구역 랜덤 배치
                this.bubblePositions[word] = {
                    left: `${Math.random() * 70 + 10}%`,
                    top: `${Math.random() * 70 + 10}%`
                };
            }
            bubble.style.position = 'absolute';
            bubble.style.left = this.bubblePositions[word].left;
            bubble.style.top = this.bubblePositions[word].top;
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
            // DB 연동 드롭 이벤트
            bubble.addEventListener('drop', async (e) => { 
                e.preventDefault(); 
                bubble.classList.remove('drag-over'); 
                
                if (this.isSynthesizing) return; 
                
                const draggedWord = e.dataTransfer.getData('text/plain'); 
                if (draggedWord === word && this.wordInventory[word] < 2) return; 
                
                this.isSynthesizing = true; 
                if(this.loadingLock) this.loadingLock.classList.remove('hidden'); 
                
                try { 
                    this.wordInventory[draggedWord] -= 1; 
                    this.wordInventory[word] -= 1; 
                    if (this.wordInventory[draggedWord] <= 0) delete this.wordInventory[draggedWord]; 
                    if (this.wordInventory[word] <= 0) delete this.wordInventory[word]; 
                    
                    this.registry.set('wordInventory', this.wordInventory);
                    this.renderAlchemyPouch(); 
                    
                    await new Promise(resolve => setTimeout(resolve, 500));

                    const mixLookup = this.registry.get('dbMixLookup');
                    const dbMaterials = this.registry.get('dbMaterials');
                    let resultWord = null;

                    if (mixLookup && dbMaterials) {
                        const w1 = draggedWord.trim();
                        const w2 = word.trim();
                        
                        const mat1 = dbMaterials.find(m => m.name === w1);
                        const mat2 = dbMaterials.find(m => m.name === w2);

                        if (mat1 && mat2) {
                            const num1 = parseInt(mat1.material_id.replace(/[^0-9]/g, ''), 10);
                            const num2 = parseInt(mat2.material_id.replace(/[^0-9]/g, ''), 10);
                            
                            let idCombo = num1 <= num2 ? `${mat1.material_id}#${mat2.material_id}` : `${mat2.material_id}#${mat1.material_id}`;
                            const resultData = mixLookup[idCombo];
                            if (resultData) resultWord = resultData.name; 
                        }
                    }

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
                    } else {
                        this.wordInventory[draggedWord] = (this.wordInventory[draggedWord] || 0) + 1; 
                        this.wordInventory[word] = (this.wordInventory[word] || 0) + 1; 
                        this.registry.set('wordInventory', this.wordInventory);
                    }

                    this.saveGameData();

                } catch (err) {
                    console.error("합성 중 에러 발생:", err);
                } finally { 
                    this.isSynthesizing = false; 
                    if(this.loadingLock) this.loadingLock.classList.add('hidden'); 
                    this.renderAlchemyPouch(); 
                } 
            });            
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

    syncRegistryReferences() {
        if (this.wordInventory) this.registry.set('wordInventory', this.wordInventory);
        if (this.discoveredWords) this.registry.set('discoveredWords', this.discoveredWords);
        if (this.discoveredRecipes) this.registry.set('discoveredRecipes', this.discoveredRecipes);
        if (this.upgrades) this.registry.set('upgrades', this.upgrades);
        if (this.discoveryOrder) this.registry.set('discoveryOrder', this.discoveryOrder);
        this.registry.set('evolutionPoints', this.evolutionPoints);
    }

    handleLostPartReturned() {
        console.log("부품이 반환되었습니다!");
    }

    async startHouseBuildTimeLapse() {
        if (this.houseTimeLapseRunning) return;

        const state = this.registry.get('houseBuildState');
        if (!state?.quest?.completed) return;

        const houseId = state.houseId;

        if (!houseId) {
            console.warn('❌ houseId가 아직 없습니다.');
            return;
        }

        this.houseTimeLapseRunning = true;
        state.timeLapseStarted = true;
        this.registry.set('houseBuildState', state);

        this.alchemy?.close();
        this.hudContainer?.classList.add('hidden');

        if (this.input?.keyboard) {
            this.input.keyboard.resetKeys();
            this.input.keyboard.enabled = false;
        }

        try {
            const [, generatedHouse] = await Promise.all([
                this.timeLapseSequence.play(),
                waitForHouseGeneration(houseId)
            ]);

            this.registry.set('generatedHouse', generatedHouse);

            const latestState = this.registry.get('houseBuildState');
            latestState.endingReady = true;

            this.registry.set('houseBuildState', latestState);

            console.log('🏠 최종 이미지:', generatedHouse.image_url);
            console.log('📖 최종 스토리:', generatedHouse.story);

            this.scene.start('EndingScene');
        } catch (error) {
            console.error('❌ 집 생성 결과 대기 실패:', error);

            this.houseTimeLapseRunning = false;
            const latestState = this.registry.get('houseBuildState');
            latestState.timeLapseStarted = false;
            latestState.requestError = error.message;

            this.registry.set('houseBuildState', latestState);

            if (this.input?.keyboard) {
                this.input.keyboard.enabled = true;
            }
        }
    }
    
    canCompleteLostPartQuest() {
        const state = this.registry.get('houseBuildState');
        return ( state?.quest?.active && state.quest.partFound && !state.quest.completed );
    }
    
    completeLostPartQuestAtWorkbench() {
        const state = this.registry.get('houseBuildState');

        if ( !state?.quest?.active || !state.quest.partFound || state.quest.completed ) { return; }

        console.log('🔧 AI 부품을 작업대에 전달');

        // 1. 퀘스트 완료 처리
        state.quest.active = false;
        state.quest.completed = true;
        state.quest.completedAt = Date.now();
        this.registry.set('houseBuildState', state);

        // 2. HUD 제거 및 조합대 오픈
        this.questManager?.complete();
        this.alchemy.open();

        // 3. AI 대사 + 제작 시작 버튼
        this.alchemy.setDialogue(
            '찾아왔군! 이 부품이면 충분해. 집 생성 데이터도 준비됐어. 이제 보금자리 제작을 시작하자.',
            '보금자리 제작 시작',
            () => { this.startHouseBuildTimeLapse(); }
        );
    }

    // ==========================================
    // 🎬 대화 & 컷신 로직
    // ==========================================
    startWorkbenchCutscene() {
        this.input.keyboard.resetKeys();
        this.input.keyboard.enabled = false;
        this.cutsceneContainer.classList.remove('hidden');
        this.hudContainer.classList.add('hidden');

        // 🖼️ 컷신 이미지(StartScene3.png) 띄우기
        const cutsceneImgEl = document.getElementById('cutscene-image');
        if (cutsceneImgEl) {
            cutsceneImgEl.style.backgroundImage = "url('assets/images/StartScene3.png')";
        }

        const scripts = [
            { name: "???", text: "더러운 먼지더미에서 꺼내줘서 고맙다냥!" },
            { name: "???", text: "이렇게나 깨끗이 청소해주다니..." },
            { name: "???", text: "고마우니 소원을 하나 들어줄게." },
            { name: "나", text: "집에서 쫓겨나서 당장 살 곳이 필요해..." },
            { name: "연금술 냥이", text: "그럼 재료를 구해다 주면 집을 만들어 주겠다냥!" },
            { name: "연금술 냥이", text: "숲에서 기초 재료를 주워 오면, 이 장치에서 새로운 재료로 합성할 수 있다!" }
        ];

        let currentStep = 0;

        const showNextScript = () => {
            if (currentStep >= scripts.length) {
                this.endWorkbenchCutscene();
                return;
            }
            
            const currentData = scripts[currentStep];
            this.speakerNameEl.innerText = currentData.name;
            this.dialogueTextEl.innerText = currentData.text;
            
            if (currentData.name === "나") {
                this.speakerNameEl.style.color = "#00ffff"; // 주인공
            } else {
                this.speakerNameEl.style.color = "#ff00ff"; // NPC
            }
            currentStep++;
        };

        showNextScript();

        this.advanceCutsceneHandler = (e) => {
            if (e.type === 'click' || (e.type === 'keydown' && (e.code === 'KeyF' || e.key === 'f' || e.key === 'F'))) {
                e.preventDefault();
                showNextScript();
            }
        };

        setTimeout(() => {
            window.addEventListener('keydown', this.advanceCutsceneHandler);
            this.cutsceneContainer.addEventListener('click', this.advanceCutsceneHandler);
        }, 100);
    }

    endWorkbenchCutscene() {
        window.removeEventListener('keydown', this.advanceCutsceneHandler);
        this.cutsceneContainer.removeEventListener('click', this.advanceCutsceneHandler);

        this.cutsceneContainer.classList.add('hidden');
        this.hudContainer.classList.remove('hidden');
        this.input.keyboard.enabled = true;

        this.isWorkbenchCleaned = true;
        this.registry.set('isWorkbenchCleaned', true);
        this.workbenchImg.setTexture('obj_table_clean');
        
        console.log("🧹 컷신 종료: 작업대 청소 완료 및 저장");
        this.saveGameData();
    }

    endLostPartQuestCutscene() {
        window.removeEventListener('keydown', this.bottomDialogHandler);
        const bottomArea = document.querySelector('.alchemy-bottom-area');
        if (bottomArea) bottomArea.removeEventListener('click', this.bottomDialogHandler);
        // 🌟 퀘스트 상태 활성화 및 저장
        const state = this.registry.get('houseBuildState');
        if (state && state.quest) {
            state.quest.active = true;
            state.quest.startedAt = Date.now();
            this.registry.set('houseBuildState', state);
        }
        
        // HUD에 퀘스트 띄우기 (QuestManager 연동)
        if (this.questManager && typeof this.questManager.startQuest === 'function') {
            this.questManager.startQuest('부품 찾기', '북쪽 숲에서 AI 코어의 잃어버린 부품을 찾아오자.');
        }

        console.log("🛠️ 북쪽 숲 부품 찾기 퀘스트 시작!");
        this.saveGameData();
    }
    startBottomAreaScript() {
        // 1. 화면 윗부분 어둡게, 하단 바 집중!
        if (this.deskScreen) this.deskScreen.classList.add('focus-mode');
        
        // 2. 대화 진행할 DOM 요소 가져오기
        const dialogueBox = document.getElementById('alchemy-ai-dialogue');
        const speakerName = document.querySelector('.alchemy-ai-name');
        
        // 버튼 텍스트 변경
        const actionBtn = document.getElementById('alchemy-ai-action');
        if (actionBtn) actionBtn.innerText = "다음 (F) ▼";

        const scripts = [
            { name: "연금술 냥이", text: "재료는 다 모았는데... 삐빅! 시스템 오류 발생!" },
            { name: "연금술 냥이", text: "큰일 났다냥! 집을 짓기 위한 핵심 부품이 하나 더 필요한데 없어졌다냥!" },
            { name: "나", text: "어디서 잃어버렸는데?" },
            { name: "연금술 냥이", text: "아마 북쪽 숲(North Forest) 쪽에 떨어뜨린 것 같다냥..." },
            { name: "연금술 냥이", text: "북쪽 숲 포탈을 타고 넘어가서 내 [잃어버린 부품]을 꼭 찾아와 줘!" }
        ];

        let currentStep = 0;

        const showNext = () => {
            if (currentStep >= scripts.length) {
                // 🌟 대화 종료 시 포커스 끄고 퀘스트 시작
                this.deskScreen.classList.remove('focus-mode');
                this.endLostPartQuestCutscene(); // 기존 퀘스트 시작 및 UI 복구 함수 호출
                
                // 대화창 초기화
                if (actionBtn) actionBtn.innerText = "대기 중...";
                return;
            }
            
            const data = scripts[currentStep];
            if (speakerName) {
                speakerName.innerText = data.name;
                speakerName.style.color = data.name === "나" ? "#00ffff" : "#ff00ff";
            }
            if (dialogueBox) dialogueBox.innerText = data.text;
            
            currentStep++;
        };

        // 첫 대사 출력
        showNext();

        // 클릭 및 F키로 다음 대사 넘기기 바인딩
        this.bottomDialogHandler = (e) => {
            if (e.type === 'click' || (e.type === 'keydown' && (e.code === 'KeyF' || e.key === 'f' || e.key === 'F'))) {
                e.preventDefault();
                showNext();
            }
        };
        
        // 이벤트 리스너 등록
        window.addEventListener('keydown', this.bottomDialogHandler);
        const bottomArea = document.querySelector('.alchemy-bottom-area');
        if (bottomArea) bottomArea.addEventListener('click', this.bottomDialogHandler);
    }
    
}