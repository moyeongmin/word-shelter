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
    }

    init(data) {
        if (data && data.spawnFrom) this.spawnFrom = data.spawnFrom; 
        
        if (!this.registry.get('isInitialized')) {
            this.registry.set('wordInventory', {});
            this.registry.set('discoveredWords', []); 
            this.registry.set('discoveredRecipes', {});
            this.registry.set('replicators', [{ item: null, lastTick: 0 }, { item: null, lastTick: 0 }]);
            this.registry.set('upgrades', { speed: 0, time: 0, yield: 0, slot2: false });
            this.registry.set('discoveryOrder', []); 
            this.registry.set('isInitialized', true);
        }

        this.wordInventory = this.registry.get('wordInventory');
        this.discoveredWords = this.registry.get('discoveredWords');
        this.discoveredRecipes = this.registry.get('discoveredRecipes');
        this.replicators = this.registry.get('replicators');
        this.upgrades = this.registry.get('upgrades');
        this.discoveryOrder = this.registry.get('discoveryOrder');
    }

    addDiscoveredWord(word) { 
        if (!this.discoveredWords.includes(word)) { 
            this.discoveredWords.push(word); 
            this.discoveryOrder.push(word); 
        } 
    }

    get availablePoints() { let spent = (this.upgrades.speed * 1) + (this.upgrades.time * 1) + (this.upgrades.yield * 5); if (this.upgrades.slot2) spent += 10; return this.discoveredWords.length - spent; }
    get playerSpeed() { return 120 + (this.upgrades.speed * 9); } 
    get repTime() { return 15000 - (this.upgrades.time * 1000); } 
    get repYield() { return 1 + this.upgrades.yield; }

    create() {
        // [1] 배경 렌더링
        const bg = this.add.image(0, 0, 'bg_basecamp').setOrigin(0, 0);

        this.physics.world.setBounds(0, 0, bg.width, bg.height);
        this.cameras.main.setBounds(0, 0, bg.width, bg.height);
        this.cameras.main.setZoom(1.5); 

        // [2] 상호작용 오브젝트 배치
        this.campfire = this.add.circle(bg.width / 2, bg.height / 2 + 50, 30, 0xff4500, 0); 
        this.physics.add.existing(this.campfire, true); 

        this.alchemyTableZone = this.add.rectangle(bg.width / 2, bg.height / 2 - 50, 140, 80, 0x000000, 0); 
        this.physics.add.existing(this.alchemyTableZone, true); 
        this.alchemyTableVisuals = this.add.container(bg.width / 2, bg.height / 2 - 50);
        this.tableBase = this.add.rectangle(0, 0, 140, 80, 0x555555, 0); 
        this.tableText = this.add.text(0, 0, '🧪 작업대', { fontSize: '16px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        this.alchemyTableVisuals.add([this.tableBase, this.tableText]);

        this.pond = this.add.ellipse(bg.width / 2 + 180, bg.height - 150, 140, 90, 0x1ca3ec, 0); 
        this.physics.add.existing(this.pond, true); 

        // 포탈 구역 설정
        this.northPortal = this.add.rectangle(bg.width / 2, 20, 200, 40, 0x00ff00, 0); 
        this.physics.add.existing(this.northPortal, true);

        this.forestPortal = this.add.rectangle(bg.width - 20, bg.height / 2, 40, 200, 0x00ff00, 0); 
        this.physics.add.existing(this.forestPortal, true);

        // [3] 플레이어 생성 및 안전 스폰 위치 설정 (포탈 안쪽으로 깊게 밀어줌)
        let startX = bg.width / 2, startY = bg.height / 2; 
        if (this.spawnFrom === 'Camp2Cave') { // Forest에서 이름 변경
            startX = bg.width - 80; 
            startY = bg.height / 2; 
        } else if (this.spawnFrom === 'NorthSide') { 
            startX = bg.width / 2; 
            startY = 80; 
        }
        
        this.player = this.physics.add.sprite(startX, startY, 'player_asset'); 
        this.player.setScale(0.15); 
        
        this.physics.add.collider(this.player, this.alchemyTableZone); 
        this.physics.add.collider(this.player, this.pond); 
        this.physics.add.collider(this.player, this.campfire);

        this.cameras.main.startFollow(this.player);

        // [4] 기타 세팅 및 파밍
        this.keys = this.input.keyboard.addKeys('W,A,S,D,F,ESC');
        this.materials = this.physics.add.group();
        this.time.addEvent({ delay: 5000, callback: () => this.spawnMaterialAround(this.pond.x, this.pond.y, 100, '물', '#1ca3ec', 5), loop: true });
        this.time.addEvent({ delay: 7000, callback: () => this.spawnMaterialAround(this.campfire.x, this.campfire.y, 80, '불', '#ff4500', 4), loop: true });

        // DOM 바인딩 및 포탈 팝업 이벤트 설정
        this.sysMenuModal = document.getElementById('system-menu-modal'); 
        this.dictModal = document.getElementById('dictionary-modal');
        this.upgradeModal = document.getElementById('upgrade-modal'); 
        this.deskScreen = document.getElementById('alchemy-desk-screen');
        this.pouchContainer = document.getElementById('magic-pouch');
        this.loadingLock = document.getElementById('alchemy-loading-lock'); 
        
        // 🌟 숲/북쪽 이동 확인 팝업 모달 바인딩
        this.portalModal = document.getElementById('portal-confirm-modal');
        this.portalModalDesc = document.getElementById('portal-modal-desc');
        this.targetSceneName = null;
        this.targetSpawnFrom = 'BaseCamp';

        document.getElementById('portal-yes-btn').onclick = () => {
            if (this.portalModal) this.portalModal.classList.add('hidden');
            this.input.keyboard.enabled = true;
            if (this.targetSceneName) {
                this.scene.start(this.targetSceneName, { spawnFrom: this.targetSpawnFrom });
            }
        };

        document.getElementById('portal-no-btn').onclick = () => {
            if (this.portalModal) this.portalModal.classList.add('hidden');
            this.input.keyboard.enabled = true;
            this.targetSceneName = null;
        };

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

        document.getElementById('dict-search').addEventListener('input', () => this.showDictList());
        document.getElementById('dict-sort').addEventListener('change', () => this.showDictList());
        document.getElementById('pouch-search').addEventListener('input', () => this.renderAlchemyPouch());
        document.getElementById('pouch-sort').addEventListener('change', () => this.renderAlchemyPouch());

        this.updateWorkbenchVisuals();
    }

    updateWorkbenchVisuals() {
        const totalUpg = this.upgrades.time + this.upgrades.yield + (this.upgrades.slot2 ? 5 : 0);
        if (totalUpg >= 10) { this.tableText.setText('🔮 마스터 작업대'); } 
        else if (totalUpg >= 4) { this.tableText.setText('⚙️ 기계식 작업대'); } 
        else { this.tableText.setText('🧪 작업대'); }
    }

    updateReplicatorsTick() {
        const now = Date.now(); let uiNeedsUpdate = false; 
        this.replicators.forEach((rep, i) => {
            if (rep.item) {
                const elapsed = now - rep.lastTick;
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
        if (uiNeedsUpdate && !this.deskScreen.classList.contains('hidden')) this.renderAlchemyPouch();
    }

    spawnMaterialAround(x, y, radius, name, colorHex, maxLimit) {
        if (this.materials.getChildren().filter(m => m.name === name).length >= maxLimit) return;
        let valid = false, spawnX, spawnY; const obstacles = [this.pond, this.campfire, this.alchemyTableZone];
        for(let i=0; i<30; i++) {
            const angle = Math.random() * Math.PI * 2; const r = 40 + Math.random() * (radius - 40);
            spawnX = Math.max(30, Math.min(this.physics.world.bounds.width - 30, x + Math.cos(angle) * r)); 
            spawnY = Math.max(30, Math.min(this.physics.world.bounds.height - 30, y + Math.sin(angle) * r));
            valid = true; for(let o of obstacles) { if (Phaser.Math.Distance.Between(spawnX, spawnY, o.x, o.y) < Math.max(o.width, o.height)/2 + 20) { valid = false; break; } }
            if(valid) break;
        }
        if(!valid) return;
        const mat = this.add.circle(spawnX, spawnY, 8, Phaser.Display.Color.HexStringToColor(colorHex).color);
        mat.name = name; mat.colorHex = colorHex; mat.setScale(0); this.tweens.add({ targets: mat, scale: 1, duration: 400, ease: 'Back.easeOut' });
        this.physics.add.existing(mat); this.materials.add(mat);
    }

    showFloatingText(x, y, message, colorHex) { const t = this.add.text(x, y - 20, message, { fontSize: '18px', fill: colorHex, fontStyle: 'bold' }).setOrigin(0.5); this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1000, onComplete: () => t.destroy() }); }

    update() {
        this.updateReplicatorsTick();
        if (!this.deskScreen.classList.contains('hidden') || !this.sysMenuModal.classList.contains('hidden') || !this.dictModal.classList.contains('hidden') || !this.upgradeModal.classList.contains('hidden') || (this.portalModal && !this.portalModal.classList.contains('hidden'))) { 
            this.player.body.setVelocity(0, 0); 
            return; 
        }
        
        let vx = 0, vy = 0;
        if (this.keys.A.isDown) vx = -this.playerSpeed; else if (this.keys.D.isDown) vx = this.playerSpeed;
        if (this.keys.W.isDown) vy = -this.playerSpeed; else if (this.keys.S.isDown) vy = this.playerSpeed;
        this.player.body.setVelocity(vx, vy);

        if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) this.toggleSystemMenu();
        
        if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
            // 재료 파밍
            this.materials.getChildren().forEach((mat) => {
                if (mat.active && Phaser.Math.Distance.BetweenPoints(this.player, mat) < 50) {
                    this.wordInventory[mat.name] = (this.wordInventory[mat.name] || 0) + 1;
                    this.addDiscoveredWord(mat.name);
                    this.showFloatingText(mat.x, mat.y, `+ ${mat.name}`, mat.colorHex);
                    mat.destroy();
                }
            });

            // 작업대 상호작용
            if (Phaser.Math.Distance.BetweenPoints(this.player, this.alchemyTableZone) < 90) {
                this.openAlchemyDesk();
            }

            // 🌟 북쪽 포탈 상호작용 (F키 입력 시 팝업 띄우기)
            if (Phaser.Math.Distance.BetweenPoints(this.player, this.northPortal) < 80) {
                this.targetSceneName = 'NorthSideScene';
                if (this.portalModalDesc) this.portalModalDesc.innerText = "북쪽 지역으로 이동하시겠습니까?";
                this.input.keyboard.enabled = false;
                if (this.portalModal) this.portalModal.classList.remove('hidden');
            }

            // 🌟 숲 포탈 상호작용 (F키 입력 시 팝업 띄우기)
            if (Phaser.Math.Distance.BetweenPoints(this.player, this.forestPortal) < 80) {
                this.targetSceneName = 'Camp2CaveScene'; // ForestScene에서 이름 변경
                if (this.portalModalDesc) this.portalModalDesc.innerText = "이동하시겠습니까?";
                this.input.keyboard.enabled = false;
                if (this.portalModal) this.portalModal.classList.remove('hidden');
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
        this.updateWorkbenchVisuals();
    }

    showDictList() { 
        this.input.keyboard.enabled = false; 
        this.dictModal.classList.remove('hidden'); 
        document.getElementById('dict-detail-view').classList.add('hidden'); 
        document.getElementById('dict-list-view').classList.remove('hidden'); 
        document.getElementById('collection-count').innerText = `발견한 재료: ${this.discoveredWords.length}종`; 
        const listContainer = document.getElementById('collection-list'); 
        listContainer.innerHTML = ''; 

        const searchTerm = document.getElementById('dict-search').value.trim().toLowerCase();
        const sortType = document.getElementById('dict-sort').value;

        let displayList = [...this.discoveryOrder]; 

        if (searchTerm) { displayList = displayList.filter(word => word.toLowerCase().includes(searchTerm)); }
        if (sortType === 'recent') { displayList.reverse(); } else if (sortType === 'alpha') { displayList.sort((a, b) => a.localeCompare(b, 'ko-KR')); } 

        if (displayList.length === 0) { listContainer.innerHTML = '<div style="color:#888; text-align:center; padding:20px;">검색 결과가 없습니다.</div>'; return; } 

        displayList.forEach(word => { 
            const item = document.createElement('div'); 
            item.className = 'collection-item'; 
            item.innerHTML = `${word} <span style="float:right; color:#888;">▶</span>`; 
            item.onclick = () => this.showDictDetail(word); 
            listContainer.appendChild(item); 
        }); 
    }

    showDictDetail(word) { document.getElementById('dict-list-view').classList.add('hidden'); document.getElementById('dict-detail-view').classList.remove('hidden'); document.getElementById('dict-detail-title').innerText = word; const recipeList = document.getElementById('dict-recipe-list'); recipeList.innerHTML = ''; const recipes = this.discoveredRecipes[word] || []; if (recipes.length === 0) { recipeList.innerHTML = '<span style="color:#aaa;">자연에서 얻거나 아직 조합법을 모릅니다.</span>'; } else { recipes.forEach(recipe => { const row = document.createElement('div'); row.className = 'recipe-row'; const m1 = document.createElement('button'); m1.className = 'recipe-mat-btn'; m1.innerText = recipe[0]; m1.onclick = () => this.showDictDetail(recipe[0]); const plus = document.createElement('span'); plus.innerText = '+'; plus.style.fontWeight = 'bold'; const m2 = document.createElement('button'); m2.className = 'recipe-mat-btn'; m2.innerText = recipe[1]; m2.onclick = () => this.showDictDetail(recipe[1]); row.appendChild(m1); row.appendChild(plus); row.appendChild(m2); recipeList.appendChild(row); }); } }
    
    openAlchemyDesk() { this.input.keyboard.enabled = false; this.deskScreen.classList.remove('hidden'); this.syncReplicatorUI(); this.renderAlchemyPouch(); }
    syncReplicatorUI() { for(let i=0; i<2; i++) { const dropZone = document.getElementById(`rep-drop-${i}`); const removeBtn = document.getElementById(`remove-rep-${i}`); if(i === 1 && !this.upgrades.slot2) { dropZone.className = 'replicator-tube locked'; dropZone.innerHTML = `<span>잠김<br>(진화 필요)</span>`; removeBtn.classList.add('hidden'); continue; } if (this.replicators[i].item) { dropZone.className = 'replicator-tube active'; dropZone.innerHTML = `<span>${this.replicators[i].item}</span>`; removeBtn.classList.remove('hidden'); } else { dropZone.className = 'replicator-tube empty'; dropZone.innerHTML = `<span>${i+1}번 슬롯<br>드롭</span>`; removeBtn.classList.add('hidden'); } } }
    
    renderAlchemyPouch() { 
        this.pouchContainer.innerHTML = ''; 
        
        const searchTerm = document.getElementById('pouch-search').value.trim().toLowerCase();
        const sortType = document.getElementById('pouch-sort').value;

        let availableItems = Object.entries(this.wordInventory).filter(([word, count]) => count > 0);

        if (searchTerm) { availableItems = availableItems.filter(([word]) => word.toLowerCase().includes(searchTerm)); }
        if (sortType === 'alpha') { availableItems.sort((a, b) => a[0].localeCompare(b[0], 'ko-KR')); } else if (sortType === 'recent') { availableItems.sort((a, b) => this.discoveryOrder.indexOf(b[0]) - this.discoveryOrder.indexOf(a[0])); }

        availableItems.forEach(([word, count]) => { 
            const bubble = document.createElement('div'); bubble.className = 'word-bubble'; bubble.draggable = true; bubble.innerHTML = `${word} <span class="item-count">x${count}</span>`; 
            bubble.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', word)); 
            bubble.addEventListener('dragover', (e) => { e.preventDefault(); bubble.classList.add('drag-over'); }); 
            bubble.addEventListener('dragleave', () => bubble.classList.remove('drag-over')); 
            bubble.addEventListener('dblclick', () => { if (this.wordInventory[word] > 0) { let targetSlot = -1; if(!this.replicators[0].item) targetSlot = 0; else if(this.upgrades.slot2 && !this.replicators[1].item) targetSlot = 1; if(targetSlot !== -1) this.insertToReplicator(word, targetSlot); } }); 
            bubble.addEventListener('drop', async (e) => { 
                e.preventDefault(); bubble.classList.remove('drag-over'); 
                if (this.isSynthesizing) return; 
                const draggedWord = e.dataTransfer.getData('text/plain'); 
                if (draggedWord === word && this.wordInventory[word] < 2) return; 
                this.isSynthesizing = true; this.loadingLock.classList.remove('hidden'); 
                try { 
                    this.wordInventory[draggedWord] -= 1; this.wordInventory[word] -= 1; 
                    if (this.wordInventory[draggedWord] <= 0) delete this.wordInventory[draggedWord]; 
                    if (this.wordInventory[word] <= 0) delete this.wordInventory[word]; 
                    this.renderAlchemyPouch(); 
                    
                    const resultWord = await combineWords(draggedWord, word); 
                    
                    this.wordInventory[resultWord] = (this.wordInventory[resultWord] || 0) + 1; 
                    this.addDiscoveredWord(resultWord); 
                    if (!this.discoveredRecipes[resultWord]) this.discoveredRecipes[resultWord] = []; 
                    const sortedRecipe = [draggedWord, word].sort(); 
                    const exists = this.discoveredRecipes[resultWord].some(r => r[0] === sortedRecipe[0] && r[1] === sortedRecipe[1]); 
                    if (!exists) this.discoveredRecipes[resultWord].push(sortedRecipe); 
                } finally { 
                    this.isSynthesizing = false; this.loadingLock.classList.add('hidden'); this.renderAlchemyPouch(); 
                } 
            }); 
            this.pouchContainer.appendChild(bubble); 
        }); 
    }

    insertToReplicator(item, slotIdx) { if (this.replicators[slotIdx].item === item) return; if (this.replicators[slotIdx].item) { this.wordInventory[this.replicators[slotIdx].item] = (this.wordInventory[this.replicators[slotIdx].item] || 0) + 1; } this.wordInventory[item] -= 1; if (this.wordInventory[item] === 0) delete this.wordInventory[item]; this.replicators[slotIdx] = { item: item, lastTick: Date.now() }; this.syncReplicatorUI(); this.renderAlchemyPouch(); }
    removeFromReplicator(slotIdx) { if (!this.replicators[slotIdx].item) return; this.wordInventory[this.replicators[slotIdx].item] = (this.wordInventory[this.replicators[slotIdx].item] || 0) + 1; this.replicators[slotIdx] = { item: null, lastTick: 0 }; this.syncReplicatorUI(); this.renderAlchemyPouch(); }
}