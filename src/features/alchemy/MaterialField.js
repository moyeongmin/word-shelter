export default class MaterialField {
    constructor(scene, ui) {
        this.scene = scene;
        this.ui = ui;
        this.isSynthesizing = false;

        this.container = document.getElementById('magic-pouch');
        this.initSubmissionSlots();
        this.initEventListeners();
    }

    // 1. 진화 포인트 체크 및 안전한 처리 메서드
    checkAndApplyEvolution() {
        let points = this.scene.registry.get('evolutionPoints');
        if (points === undefined) {
            points = 0;
            this.scene.registry.set('evolutionPoints', points);
        }

        const requiredPoints = 10;
        if (points < requiredPoints) {
            this.ui?.setDialogue(`진화 포인트가 부족해. (현재: ${points}/${requiredPoints})`);
            return false;
        }

        this.scene.registry.set('evolutionPoints', points - requiredPoints);
        let evoStage = this.scene.registry.get('evolutionStage') || 1;
        this.scene.registry.set('evolutionStage', evoStage + 1);
        
        this.ui?.setDialogue('진화가 성공적으로 완료되었습니다!');
        return true;
    }

    // 2. 하단 제출 슬롯 설정
    initSubmissionSlots() {
        const slots = document.querySelectorAll('.house-material-slot');
        
        slots.forEach((slot, index) => {
            slot.addEventListener('dragover', e => e.preventDefault());

            slot.addEventListener('drop', e => {
                e.preventDefault();
                const word = e.dataTransfer.getData('text/plain');
                if (!word) return;

                const inventory = this.scene.registry.get('wordInventory') || {};
                if (!inventory[word] || inventory[word] <= 0) return;

                let submitted = this.scene.registry.get('houseSubmittedMaterials') || Array(10).fill(null);
                
                inventory[word]--;
                submitted[index] = word;

                this.scene.registry.set('wordInventory', inventory);
                this.scene.registry.set('houseSubmittedMaterials', submitted);

                this.render();
            });

            slot.addEventListener('click', () => {
                let submitted = this.scene.registry.get('houseSubmittedMaterials') || Array(10).fill(null);
                const word = submitted[index];
                if (!word) return;

                const inventory = this.scene.registry.get('wordInventory') || {};
                inventory[word] = (inventory[word] || 0) + 1;
                submitted[index] = null;

                this.scene.registry.set('wordInventory', inventory);
                this.scene.registry.set('houseSubmittedMaterials', submitted);

                this.ui?.setDialogue(`"${word}"을(를) 다시 회수했습니다.`);
                this.render();
            });
        });
    }

    renderSubmissionSlots() {
        const submitted = this.scene.registry.get('houseSubmittedMaterials') || Array(10).fill(null);
        const slots = document.querySelectorAll('.house-material-slot');
        let count = 0;

        slots.forEach((slot, index) => {
            const word = submitted[index];
            if (word) {
                slot.innerHTML = `<span style="font-size:0.7rem; color:#4CAF50;">${index + 1}</span><strong>${word}</strong>`;
                slot.classList.add('filled');
                count++;
            } else {
                slot.innerHTML = `<span style="font-size:0.7rem; color:#888;">${String(index + 1).padStart(2, '0')}</span><strong>+</strong>`;
                slot.classList.remove('filled');
            }
        });

        const submitBtn = document.getElementById('submit-house-materials') || document.querySelector('.house-submit-button');
        if (submitBtn) {
            if (count >= 10) submitBtn.removeAttribute('disabled');
            else submitBtn.setAttribute('disabled', 'true');
        }
    }

    // 🌟 핵심: 렌더링 시 랜덤 위치 리셋 방지 로직!
    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        const inventory = this.scene.registry.get('wordInventory') || {};
        const savedPositions = this.scene.registry.get('itemPositions') || {};
        let positionsChanged = false; // 새로운 위치가 생겼는지 추적

        Object.entries(inventory)
            .filter(([, count]) => count > 0)
            .forEach(([word, count], index) => {
                // 🌟 아이템의 저장된 위치가 없다면 여기서 최초 1회 랜덤 배정하고 즉시 영구 저장!
                if (!savedPositions[word]) {
                    savedPositions[word] = {
                        x: `${Math.random() * 70 + 10}%`,
                        y: `${Math.random() * 70 + 10}%`
                    };
                    positionsChanged = true;
                }
                this.createMaterial(word, count, index, savedPositions[word]);
            });
            
        // 새로운 위치가 부여된 아이템이 있다면 레지스트리에 업데이트 및 게임 저장
        if (positionsChanged) {
            this.scene.registry.set('itemPositions', savedPositions);
            if (typeof this.scene.saveGameData === 'function') this.scene.saveGameData();
        }

        this.renderSubmissionSlots();
    }

    // 🌟 개별 아이템 생성 (DB 이미지 연동)
    createMaterial(word, count, index, customPos) {
        const element = document.createElement('div');
        element.className = 'word-bubble future-floating-material';
        element.draggable = true;

        element.style.position = 'absolute';
        element.style.left = typeof customPos.x === 'number' ? `${customPos.x}px` : customPos.x;
        element.style.top = typeof customPos.y === 'number' ? `${customPos.y}px` : customPos.y;

        // 🌟 1. DB에서 현재 단어(word)의 정보 찾기
        const dbMaterials = this.scene.registry.get('dbMaterials') || [];
        const matData = dbMaterials.find(m => m.name === word);
        const imageUrl = matData ? matData.image_url : null;

        // 🌟 2. 이미지가 있으면 '이미지 + 이름 + 개수' 출력
        if (imageUrl) {
            element.innerHTML = `
                <img src="${imageUrl}" alt="${word}" class="material-icon" draggable="false">
                <div style="font-size: 0.95rem; font-weight: bold; margin-top: 3px; text-shadow: 0 0 4px #000;">${word}</div>
                <div class="item-count" style="font-size: 0.75rem; color: #00ffff; opacity: 0.8;">x${count}</div>
            `;
            element.classList.add('has-image');
        } else {
            // DB에 이미지가 없는 기본/예외 재료
            element.innerHTML = `${word} <br><span class="item-count" style="font-size:0.8rem;">x${count}</span>`;
            element.classList.add('has-image'); // 레이아웃 통일을 위해 클래스 추가
        }
        // --- 이 아래부터는 기존의 dragstart, dblclick, drop 이벤트 그대로 유지 ---
        element.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', word);
            element.classList.add('dragging');
        });
        element.addEventListener('dragend', () => element.classList.remove('dragging'));

        element.addEventListener('dragover', (e) => { e.preventDefault(); element.classList.add('drag-over'); });
        element.addEventListener('dragleave', () => element.classList.remove('drag-over'));

        element.addEventListener('dblclick', () => {
            if (typeof this.scene.insertToReplicator === 'function') {
                const replicators = this.scene.replicators || this.scene.registry.get('replicators');
                const upgrades = this.scene.upgrades || this.scene.registry.get('upgrades');
                let targetSlot = -1;
                if(!replicators[0].item) targetSlot = 0;
                else if(upgrades.slot2 && !replicators[1].item) targetSlot = 1;
                
                if(targetSlot !== -1) this.scene.insertToReplicator(word, targetSlot);
            }
        });

        // 🌟 드롭 시 DB 기반 조합(합성) 처리
        element.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('drag-over');

            if (this.isSynthesizing) return;

            const draggedWord = e.dataTransfer.getData('text/plain');
            const inventory = this.scene.registry.get('wordInventory') || {};
            
            if (draggedWord === word && inventory[word] < 2) return;

            this.isSynthesizing = true;
            const loadingLock = document.getElementById('alchemy-loading-lock');
            if (loadingLock) loadingLock.classList.remove('hidden');

            try {
                inventory[draggedWord] -= 1;
                inventory[word] -= 1;
                if (inventory[draggedWord] <= 0) delete inventory[draggedWord];
                if (inventory[word] <= 0) delete inventory[word];

                this.scene.registry.set('wordInventory', inventory);
                this.render(); 

                await new Promise(resolve => setTimeout(resolve, 500)); 

                const mixLookup = this.scene.registry.get('dbMixLookup');
                const dbMaterials = this.scene.registry.get('dbMaterials');
                let resultWord = null;

                if (mixLookup && dbMaterials) {
                    const mat1 = dbMaterials.find(m => m.name === draggedWord);
                    const mat2 = dbMaterials.find(m => m.name === word);

                    if (mat1 && mat2) {
                        const num1 = parseInt(mat1.material_id.replace(/[^0-9]/g, ''), 10);
                        const num2 = parseInt(mat2.material_id.replace(/[^0-9]/g, ''), 10);
                        let idCombo = num1 <= num2 ? `${mat1.material_id}#${mat2.material_id}` : `${mat2.material_id}#${mat1.material_id}`;
                        
                        const resultData = mixLookup[idCombo];
                        if (resultData) resultWord = resultData.name;
                    }
                }

                if (resultWord) {
                    inventory[resultWord] = (inventory[resultWord] || 0) + 1;
                    this.scene.registry.set('wordInventory', inventory);

                    if (typeof this.scene.addDiscoveredWord === 'function') {
                        this.scene.addDiscoveredWord(resultWord);
                    }

                    const recipes = this.scene.registry.get('discoveredRecipes') || {};
                    if (!recipes[resultWord]) recipes[resultWord] = [];
                    const sortedRecipe = [draggedWord, word].sort();
                    const exists = recipes[resultWord].some(r => r[0] === sortedRecipe[0] && r[1] === sortedRecipe[1]);
                    if (!exists) {
                        recipes[resultWord].push(sortedRecipe);
                        this.scene.registry.set('discoveredRecipes', recipes);
                    }
                } else {
                    inventory[draggedWord] = (inventory[draggedWord] || 0) + 1;
                    inventory[word] = (inventory[word] || 0) + 1;
                    this.scene.registry.set('wordInventory', inventory);
                }

                if (typeof this.scene.saveGameData === 'function') this.scene.saveGameData();

            } catch(err) {
                console.error("합성 에러:", err);
            } finally {
                this.isSynthesizing = false;
                if (loadingLock) loadingLock.classList.add('hidden');
                this.render();
            }
        });

        this.container.appendChild(element);
    }

    // 🌟 빈 공간에 드롭했을 때 드래그 위치 영구 저장하기
    initEventListeners() {
        if (!this.container) return;

        this.container.addEventListener('dragover', e => e.preventDefault());
        this.container.addEventListener('drop', e => {
            e.preventDefault();
            e.stopPropagation();

            const word = e.dataTransfer.getData('text/plain');
            if (!word) return;

            // 주머니 빈 공간에 놓았을 때
            if (e.target === this.container || e.target.id === 'magic-pouch') {
                const rect = this.container.getBoundingClientRect();
                const x = e.clientX - rect.left - 40; // 약간 보정
                const y = e.clientY - rect.top - 20;

                const positions = this.scene.registry.get('itemPositions') || {};
                positions[word] = { x: Math.max(0, x), y: Math.max(0, y) };
                this.scene.registry.set('itemPositions', positions);
                
                // 놓은 위치 즉시 저장 
                if (typeof this.scene.saveGameData === 'function') this.scene.saveGameData();
                this.render(); 
            }
        });
    }
}