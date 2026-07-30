import Phaser from 'phaser';
import { combineWords } from '../api/db.js'; 

export default class BaseCampScene extends Phaser.Scene {
    constructor() {
        super('BaseCampScene');
        this.spawnFrom = 'Start';
        this.lastGatherTime = 0;
        this.isSynthesizing = false; 
    }

    init(data) {
        if (data && data.spawnFrom) this.spawnFrom = data.spawnFrom; 
        
        if (!this.registry.get('isInitialized')) {
            this.registry.set('wordInventory', {});
            this.registry.set('discoveredWords', []); 
            this.registry.set('discoveredRecipes', {});
            this.registry.set('replicators', [{ item: null, lastTick: 0 }, { item: null, lastTick: 0 }]);
            this.registry.set('upgrades', { speed: 0, time: 0, yield: 0, slot2: false });
            this.registry.set('isInitialized', true);
        }

        this.wordInventory = this.registry.get('wordInventory');
        this.discoveredWords = this.registry.get('discoveredWords');
        this.discoveredRecipes = this.registry.get('discoveredRecipes');
        this.replicators = this.registry.get('replicators');
        this.upgrades = this.registry.get('upgrades');
    }

    addDiscoveredWord(word) { if (!this.discoveredWords.includes(word)) this.discoveredWords.push(word); }
    get availablePoints() { let spent = (this.upgrades.speed * 1) + (this.upgrades.time * 1) + (this.upgrades.yield * 5); if (this.upgrades.slot2) spent += 10; return this.discoveredWords.length - spent; }
    get playerSpeed() { return 200 + (this.upgrades.speed * 15); }
    get repTime() { return 15000 - (this.upgrades.time * 1000); } 
    get repYield() { return 1 + this.upgrades.yield; }

    create() {
        if (!this.textures.exists('pixel')) { const g = this.make.graphics({x: 0, y: 0, add: false}); g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 4, 4); g.generateTexture('pixel', 4, 4); }
        this.add.rectangle(480, 300, 960, 600, 0x4a5a3a);
        
        // =================================================================
        // 🌟 [엔티티 분리] 1. 작업대 물리 히트박스 (투명)
        // 캐릭터의 충돌과 거리 계산을 담당. 에셋이 어떻게 변하든 물리 로직은 안전함.
        // =================================================================
        this.alchemyTableZone = this.add.rectangle(480, 250, 140, 80, 0x000000, 0); 
        this.physics.add.existing(this.alchemyTableZone, true); 

        // =================================================================
        // 🌟 [엔티티 분리] 2. 작업대 가시적 엔티티 (컨테이너)
        // 나중에 에셋 추가 시, 아래의 도형들을 this.add.sprite(0, 0, 'asset_name') 으로 교체하면 됨.
        // =================================================================
        this.alchemyTableVisuals = this.add.container(480, 250);
        
        this.tableBase = this.add.rectangle(0, 0, 140, 80, 0x555555); // 기본 베이스
        this.tableAddon1 = this.add.rectangle(-45, -20, 30, 40, 0xb8860b).setVisible(false); // 2단계 부품 (황동 기어 느낌)
        this.tableAddon2 = this.add.circle(45, -20, 20, 0x8b5cf6).setVisible(false); // 3단계 부품 (네온 플라스크 느낌)
        this.tableText = this.add.text(0, 0, '🧪 작업대', { fontSize: '16px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

        this.alchemyTableVisuals.add([this.tableBase, this.tableAddon1, this.tableAddon2, this.tableText]);

        this.repEmitter = this.add.particles(480, 250, 'pixel', { tint: [0xff3366, 0x8b5cf6], speed: 60, scale: { start: 1.5, end: 0 }, blendMode: 'ADD', lifespan: 800, frequency: 50, emitting: false });

        this.pond = this.add.ellipse(300, 480, 140, 90, 0x1ca3ec); this.physics.add.existing(this.pond, true);
        this.add.text(300, 480, '💧 연못', { fontSize: '14px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        this.add.particles(300, 480, 'pixel', { tint: 0x87ceeb, speed: { min: 5, max: 20 }, angle: { min: 250, max: 290 }, scale: { start: 1, end: 0 }, lifespan: 2000, blendMode: 'ADD', frequency: 300, emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, 140, 90) } });

        this.campfire = this.add.circle(660, 480, 30, 0xff4500); this.physics.add.existing(this.campfire, true);
        this.add.text(660, 440, '🔥 모닥불', { fontSize: '14px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        this.add.particles(660, 480, 'pixel', { tint: [ 0xff4500, 0xff8c00, 0xffff00 ], speed: { min: 20, max: 60 }, angle: { min: 240, max: 300 }, scale: { start: 1.5, end: 0 }, lifespan: 1200, blendMode: 'ADD', frequency: 100 });

        this.forestPortal = this.add.rectangle(920, 300, 80, 200, 0x213b22); this.physics.add.existing(this.forestPortal, true);
        this.add.text(860, 300, '숲으로 ▶', { fontSize: '20px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

        this.desertPortal = this.add.rectangle(40, 300, 80, 200, 0xedc9af); this.physics.add.existing(this.desertPortal, true);
        this.add.text(100, 300, '◀ 사막으로', { fontSize: '20px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

        let startX = 480, startY = 380; 
        if (this.spawnFrom === 'Forest') { startX = 840; startY = 300; }
        else if (this.spawnFrom === 'Desert') { startX = 120; startY = 300; }
        
        this.player = this.add.rectangle(startX, startY, 32, 32, 0xFFFFFF); this.physics.add.existing(this.player);
        
        // 🌟 콜라이더 대상을 렌더링용 컨테이너가 아닌 물리 존(Zone)으로 변경!
        this.physics.add.collider(this.player, this.alchemyTableZone); 
        this.physics.add.collider(this.player, this.pond); 
        this.physics.add.collider(this.player, this.campfire);

        this.keys = this.input.keyboard.addKeys('W,A,S,D,F,ESC');
        this.materials = this.physics.add.group();
        this.time.addEvent({ delay: 5000, callback: () => this.spawnMaterialAround(this.pond.x, this.pond.y, 100, '물', '#1ca3ec', 5), loop: true });
        this.time.addEvent({ delay: 7000, callback: () => this.spawnMaterialAround(this.campfire.x, this.campfire.y, 80, '불', '#ff4500', 4), loop: true });

        // DOM 바인딩 및 이벤트 처리
        this.sysMenuModal = document.getElementById('system-menu-modal'); this.dictModal = document.getElementById('dictionary-modal');
        this.upgradeModal = document.getElementById('upgrade-modal'); this.deskScreen = document.getElementById('alchemy-desk-screen');
        this.pouchContainer = document.getElementById('magic-pouch');
        this.loadingLock = document.getElementById('alchemy-loading-lock'); 

        document.getElementById('open-upgrade-btn').onclick = () => this.openUpgradeUI();
        document.getElementById('close-upgrade-btn').onclick = () => { this.upgradeModal.classList.add('hidden'); this.input.keyboard.enabled = true; };
        document.getElementById('hamburger-btn').onclick = () => this.toggleSystemMenu();
        document.getElementById('close-system-btn').onclick = () => this.toggleSystemMenu();
        document.getElementById('open-dict-btn').onclick = () => { this.sysMenuModal.classList.add('hidden'); this.showDictList(); };
        document.getElementById('close-dict-btn').onclick = () => { this.dictModal.classList.add('hidden'); this.input.keyboard.enabled = true; };
        document.getElementById('dict-back-btn').onclick = () => this.showDictList();
        document.getElementById('close-desk-btn').onclick = () => { this.deskScreen.classList.add('hidden'); this.input.keyboard.enabled = true; };
        document.querySelectorAll('.upg-btn').forEach(btn => { btn.onclick = (e) => { this.handleUpgradeClick(e.target.getAttribute('data-type'), e.target.classList.contains('plus')); }; });

        for(let i=0; i<2; i++) {
            const dropZone = document.getElementById(`rep-drop-${i}`); document.getElementById(`remove-rep-${i}`).onclick = () => this.removeFromReplicator(i);
            dropZone.addEventListener('dragover', (e) => { if(!dropZone.classList.contains('locked')) { e.preventDefault(); dropZone.classList.add('drag-over'); } });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
            dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); if (dropZone.classList.contains('locked')) return; this.insertToReplicator(e.dataTransfer.getData('text/plain'), i); });
        }

        // 🌟 씬 로드 시 현재 업그레이드 상태에 맞춰 작업대 외형 업데이트!
        this.updateWorkbenchVisuals();
    }

    // =================================================================
    // 🌟 [가시적 성장 로직] 작업대 외형 업데이트 함수
    // =================================================================
    updateWorkbenchVisuals() {
        // 관련된 업그레이드(복제 속도, 산출량, 2번 슬롯)의 합을 계산하여 티어 분류
        const totalUpg = this.upgrades.time + this.upgrades.yield + (this.upgrades.slot2 ? 5 : 0);

        // 💡 [에셋 교체 가이드]
        // 나중에 이미지를 구하면 이 안에서 this.tableBase.setTexture('asset_level_3') 처럼 호출하면 돼!
        if (totalUpg >= 10) {
            // 3단계: 마스터 작업대
            this.tableBase.setFillStyle(0x333344);
            this.tableAddon1.setVisible(true);
            this.tableAddon2.setVisible(true);
            this.tableText.setText('🔮 마스터 작업대');
        } else if (totalUpg >= 4) {
            // 2단계: 기계식 작업대
            this.tableBase.setFillStyle(0x444433);
            this.tableAddon1.setVisible(true);
            this.tableAddon2.setVisible(false);
            this.tableText.setText('⚙️ 기계식 작업대');
        } else {
            // 1단계: 기본 작업대
            this.tableBase.setFillStyle(0x555555);
            this.tableAddon1.setVisible(false);
            this.tableAddon2.setVisible(false);
            this.tableText.setText('🧪 작업대');
        }
    }

    updateReplicatorsTick() {
        const now = Date.now(); let uiNeedsUpdate = false; let isAnyRunning = false;
        this.replicators.forEach((rep, i) => {
            if (rep.item) {
                isAnyRunning = true; const elapsed = now - rep.lastTick;
                if (elapsed >= this.repTime) {
                    const ticks = Math.floor(elapsed / this.repTime);
                    this.wordInventory[rep.item] = (this.wordInventory[rep.item] || 0) + (this.repYield * ticks);
                    this.addDiscoveredWord(rep.item);
                    rep.lastTick += ticks * this.repTime;
                    uiNeedsUpdate = true;
                }
                if (!this.deskScreen.classList.contains('hidden')) { document.getElementById(`rep-bar-${i}`).style.width = `${Math.min(100, ((now - rep.lastTick) / this.repTime) * 100)}%`; }
            } else {
                if (!this.deskScreen.classList.contains('hidden')) document.getElementById(`rep-bar-${i}`).style.width = `0%`;
            }
        });
        if (this.repEmitter) this.repEmitter.emitting = isAnyRunning;
        if (uiNeedsUpdate && !this.deskScreen.classList.contains('hidden')) this.renderAlchemyPouch();
    }

    spawnMaterialAround(x, y, radius, name, colorHex, maxLimit) {
        if (this.materials.getChildren().filter(m => m.name === name).length >= maxLimit) return;
        let valid = false, spawnX, spawnY; const obstacles = [this.pond, this.campfire, this.alchemyTableZone, this.forestPortal, this.desertPortal];
        for(let i=0; i<30; i++) {
            const angle = Math.random() * Math.PI * 2; const r = 40 + Math.random() * (radius - 40);
            spawnX = Math.max(30, Math.min(930, x + Math.cos(angle) * r)); spawnY = Math.max(30, Math.min(570, y + Math.sin(angle) * r));
            valid = true; for(let o of obstacles) { if (Phaser.Math.Distance.Between(spawnX, spawnY, o.x, o.y) < Math.max(o.width, o.height)/2 + 20) { valid = false; break; } }
            if(valid) break;
        }
        if(!valid) return;
        const mat = this.add.circle(spawnX, spawnY, 8, Phaser.Display.Color.HexStringToColor(colorHex).color);
        mat.name = name; mat.colorHex = colorHex; mat.setScale(0); this.tweens.add({ targets: mat, scale: 1, duration: 400, ease: 'Back.easeOut' });
        this.physics.add.existing(mat); this.materials.add(mat);
    }

    createPickupBurst(x, y, colorHex) { const colorVal = Phaser.Display.Color.HexStringToColor(colorHex).color; this.add.particles(x, y, 'pixel', { tint: colorVal, speed: { min: 50, max: 150 }, scale: { start: 1.2, end: 0 }, lifespan: 500, blendMode: 'ADD', duration: 100 }); }
    showFloatingText(x, y, message, colorHex) { const t = this.add.text(x, y - 20, message, { fontSize: '18px', fill: colorHex, fontStyle: 'bold' }).setOrigin(0.5); this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1000, onComplete: () => t.destroy() }); }

    update() {
        this.updateReplicatorsTick();
        if (!this.deskScreen.classList.contains('hidden') || !this.sysMenuModal.classList.contains('hidden') || !this.dictModal.classList.contains('hidden') || !this.upgradeModal.classList.contains('hidden')) { this.player.body.setVelocity(0, 0); return; }
        
        let vx = 0, vy = 0;
        if (this.keys.A.isDown) vx = -this.playerSpeed; else if (this.keys.D.isDown) vx = this.playerSpeed;
        if (this.keys.W.isDown) vy = -this.playerSpeed; else if (this.keys.S.isDown) vy = this.playerSpeed;
        this.player.body.setVelocity(vx, vy);

        if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) this.toggleSystemMenu();
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

            // 🌟 거리 계산도 Zone(투명 히트박스)를 기준으로 하도록 변경!
            if (Phaser.Math.Distance.BetweenPoints(this.player, this.alchemyTableZone) < 90) this.openAlchemyDesk();
            
            if (Phaser.Math.Distance.BetweenPoints(this.player, this.forestPortal) < 100) {
                this.scene.start('ForestScene', { spawnFrom: 'BaseCamp' });
            }
            if (Phaser.Math.Distance.BetweenPoints(this.player, this.desertPortal) < 100) {
                this.scene.start('DesertScene', { spawnFrom: 'BaseCamp' });
            }
        }
    }

    toggleSystemMenu() { if (this.sysMenuModal.classList.contains('hidden')) { this.input.keyboard.enabled = false; this.sysMenuModal.classList.remove('hidden'); } else { this.sysMenuModal.classList.add('hidden'); this.input.keyboard.enabled = true; } }
    openUpgradeUI() { this.input.keyboard.enabled = false; this.upgradeModal.classList.remove('hidden'); this.renderUpgradeUI(); }
    renderUpgradeUI() { document.getElementById('available-points').innerText = this.availablePoints; document.getElementById('upg-lv-speed').innerText = `Lv.${this.upgrades.speed}`; document.getElementById('upg-lv-time').innerText = `Lv.${this.upgrades.time}`; document.getElementById('upg-lv-yield').innerText = `Lv.${this.upgrades.yield}`; const slotReq = document.getElementById('upg-slot2-req'); const slotText = document.getElementById('upg-lv-slot2'); if (this.upgrades.slot2) { slotReq.innerText = "해방 완료!"; slotReq.style.color = "#32cd32"; slotText.innerText = "ON"; slotText.style.color = "#32cd32"; } else { slotReq.innerText = `요구: 도감 30종 (현재 ${this.discoveredWords.length}종) / 필요 10PT`; slotReq.style.color = this.discoveredWords.length >= 30 ? "#fff" : "#ff4757"; slotText.innerText = "OFF"; slotText.style.color = "#aaa"; } }
    
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
        
        this.renderUpgradeUI(); 
        // 🌟 업그레이드를 찍거나 환불할 때마다 작업대 외형 갱신!
        this.updateWorkbenchVisuals();
    }

    showDictList() { this.input.keyboard.enabled = false; this.dictModal.classList.remove('hidden'); document.getElementById('dict-detail-view').classList.add('hidden'); document.getElementById('dict-list-view').classList.remove('hidden'); document.getElementById('collection-count').innerText = `발견한 재료: ${this.discoveredWords.length}종`; const listContainer = document.getElementById('collection-list'); listContainer.innerHTML = ''; if (this.discoveredWords.length === 0) { listContainer.innerHTML = '<div style="color:#888;">아직 지식이 없습니다.</div>'; return; } this.discoveredWords.forEach(word => { const item = document.createElement('div'); item.className = 'collection-item'; item.innerHTML = `${word} <span style="float:right; color:#888;">▶</span>`; item.onclick = () => this.showDictDetail(word); listContainer.appendChild(item); }); }
    showDictDetail(word) { document.getElementById('dict-list-view').classList.add('hidden'); document.getElementById('dict-detail-view').classList.remove('hidden'); document.getElementById('dict-detail-title').innerText = word; const recipeList = document.getElementById('dict-recipe-list'); recipeList.innerHTML = ''; const recipes = this.discoveredRecipes[word] || []; if (recipes.length === 0) { recipeList.innerHTML = '<span style="color:#aaa;">자연에서 얻거나 아직 조합법을 모릅니다.</span>'; } else { recipes.forEach(recipe => { const row = document.createElement('div'); row.className = 'recipe-row'; const m1 = document.createElement('button'); m1.className = 'recipe-mat-btn'; m1.innerText = recipe[0]; m1.onclick = () => this.showDictDetail(recipe[0]); const plus = document.createElement('span'); plus.innerText = '+'; plus.style.fontWeight = 'bold'; const m2 = document.createElement('button'); m2.className = 'recipe-mat-btn'; m2.innerText = recipe[1]; m2.onclick = () => this.showDictDetail(recipe[1]); row.appendChild(m1); row.appendChild(plus); row.appendChild(m2); recipeList.appendChild(row); }); } }
    openAlchemyDesk() { this.input.keyboard.enabled = false; this.deskScreen.classList.remove('hidden'); this.syncReplicatorUI(); this.renderAlchemyPouch(); }
    syncReplicatorUI() { for(let i=0; i<2; i++) { const dropZone = document.getElementById(`rep-drop-${i}`); const removeBtn = document.getElementById(`remove-rep-${i}`); if(i === 1 && !this.upgrades.slot2) { dropZone.className = 'replicator-tube locked'; dropZone.innerHTML = `<span>잠김<br>(진화 필요)</span>`; removeBtn.classList.add('hidden'); continue; } if (this.replicators[i].item) { dropZone.className = 'replicator-tube active'; dropZone.innerHTML = `<span>${this.replicators[i].item}</span>`; removeBtn.classList.remove('hidden'); } else { dropZone.className = 'replicator-tube empty'; dropZone.innerHTML = `<span>${i+1}번 슬롯<br>드롭</span>`; removeBtn.classList.add('hidden'); } } }
    renderAlchemyPouch() { this.pouchContainer.innerHTML = ''; Object.entries(this.wordInventory).forEach(([word, count]) => { if (count <= 0) return; const bubble = document.createElement('div'); bubble.className = 'word-bubble'; bubble.draggable = true; bubble.innerHTML = `${word} <span class="item-count">x${count}</span>`; bubble.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', word)); bubble.addEventListener('dragover', (e) => { e.preventDefault(); bubble.classList.add('drag-over'); }); bubble.addEventListener('dragleave', () => bubble.classList.remove('drag-over')); bubble.addEventListener('dblclick', () => { if (this.wordInventory[word] > 0) { let targetSlot = -1; if(!this.replicators[0].item) targetSlot = 0; else if(this.upgrades.slot2 && !this.replicators[1].item) targetSlot = 1; if(targetSlot !== -1) this.insertToReplicator(word, targetSlot); } }); bubble.addEventListener('drop', async (e) => { e.preventDefault(); bubble.classList.remove('drag-over'); if (this.isSynthesizing) return; const draggedWord = e.dataTransfer.getData('text/plain'); if (draggedWord === word && this.wordInventory[word] < 2) return; this.isSynthesizing = true; this.loadingLock.classList.remove('hidden'); try { this.wordInventory[draggedWord] -= 1; this.wordInventory[word] -= 1; if (this.wordInventory[draggedWord] <= 0) delete this.wordInventory[draggedWord]; if (this.wordInventory[word] <= 0) delete this.wordInventory[word]; this.renderAlchemyPouch(); const resultWord = await combineWords(draggedWord, word); this.wordInventory[resultWord] = (this.wordInventory[resultWord] || 0) + 1; this.addDiscoveredWord(resultWord); if (!this.discoveredRecipes[resultWord]) this.discoveredRecipes[resultWord] = []; const sortedRecipe = [draggedWord, word].sort(); const exists = this.discoveredRecipes[resultWord].some(r => r[0] === sortedRecipe[0] && r[1] === sortedRecipe[1]); if (!exists) this.discoveredRecipes[resultWord].push(sortedRecipe); } finally { this.isSynthesizing = false; this.loadingLock.classList.add('hidden'); this.renderAlchemyPouch(); } }); this.pouchContainer.appendChild(bubble); }); }
    insertToReplicator(item, slotIdx) { if (this.replicators[slotIdx].item === item) return; if (this.replicators[slotIdx].item) { this.wordInventory[this.replicators[slotIdx].item] = (this.wordInventory[this.replicators[slotIdx].item] || 0) + 1; } this.wordInventory[item] -= 1; if (this.wordInventory[item] === 0) delete this.wordInventory[item]; this.replicators[slotIdx] = { item: item, lastTick: Date.now() }; this.syncReplicatorUI(); this.renderAlchemyPouch(); }
    removeFromReplicator(slotIdx) { if (!this.replicators[slotIdx].item) return; this.wordInventory[this.replicators[slotIdx].item] = (this.wordInventory[this.replicators[slotIdx].item] || 0) + 1; this.replicators[slotIdx] = { item: null, lastTick: 0 }; this.syncReplicatorUI(); this.renderAlchemyPouch(); }
}