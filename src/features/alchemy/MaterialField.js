export default class MaterialField {
    constructor(scene, ui) {
        this.scene = scene;
        this.ui = ui;
        this.isSynthesizing = false;

        this.container = document.getElementById('magic-pouch');
        this.initSubmissionSlots();
        this.initEventListeners();
    }

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

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        const inventory = this.scene.registry.get('wordInventory') || {};
        const savedPositions = this.scene.registry.get('itemPositions') || {};
        let positionsChanged = false;

        Object.entries(inventory)
            .filter(([, count]) => count > 0)
            .forEach(([word, count], index) => {
                if (!savedPositions[word]) {
                    // 이제 컨테이너가 3000x3000이므로 10~70%면 아주 넓게 배치됩니다.
                    savedPositions[word] = {
                        x: `${Math.random() * 70 + 10}%`,
                        y: `${Math.random() * 70 + 10}%`
                    };
                    positionsChanged = true;
                }
                this.createMaterial(word, count, index, savedPositions[word]);
            });
            
        if (positionsChanged) {
            this.scene.registry.set('itemPositions', savedPositions);
            if (typeof this.scene.saveGameData === 'function') this.scene.saveGameData();
        }

        this.renderSubmissionSlots();
    }

    createMaterial(word, count, index, customPos) {
        const element = document.createElement('div');
        element.className = 'word-bubble future-floating-material';
        element.draggable = true;

        element.style.position = 'absolute';
        element.style.left = typeof customPos.x === 'number' ? `${customPos.x}px` : customPos.x;
        element.style.top = typeof customPos.y === 'number' ? `${customPos.y}px` : customPos.y;

        const dbMaterials = this.scene.registry.get('dbMaterials') || [];
        const matData = dbMaterials.find(m => m.name === word);
        const imageUrl = matData ? matData.image_url : null;

        // =========================================================================
        // 🌟 카테고리 컬러 맵 (테두리 및 글로우 적용)
        // =========================================================================
        const categoryColors = {
            "기타": "#9A968D",
            "K-야식 포장마차": "#E63900",
            "감성 캠핑": "#52796F",
            "건축 마감재": "#6C757D",
            "골드 & 주얼리": "#C9A227",
            "공룡 테마파크": "#6A994E",
            "던전 탐험": "#5C1A6B",
            "동양 판타지 & 민화": "#C1121F",
            "빈티지 라디오": "#A67C52",
            "사람": "#E76F51",
            "사이버 네온 & AI": "#00BBF9",
            "숏폼 바이럴 밈": "#FF006E",
            "스포츠 익스트림": "#FF9F1C",
            "신화 & 전설": "#4361EE",
            "애완동물": "#E5989B",
            "오케스트라 사운드": "#6D2E46",
            "우주 기지": "#1B3A6B",
            "자취생 감성": "#A7C957",
            "증기기관과 태엽": "#CD7F32",
            "키덜트 브릭": "#FFD166",
            "한국 & 부산": "#0096C7",
            "해양 심해어": "#007F7F",
            "헬창": "#2B2D42"
        };

        if (matData && matData.material_id) {
            const numId = parseInt(matData.material_id.replace(/[^0-9]/g, ''), 10);
            let borderColor = null;

            // 1~8: 색상 없음 (기본 테두리)
            if (numId >= 9 && numId <= 42) {
                borderColor = categoryColors["기타"]; // 9~42 기타 테두리
            } else if (numId >= 43) {
                borderColor = categoryColors[matData.category] || categoryColors["기타"]; // 43이상 카테고리 테두리
            }

            if (borderColor) {
                element.style.border = `2px solid ${borderColor}`;
                element.style.boxShadow = `0 0 12px ${borderColor}99`; // 테두리 색상에 맞춰 은은하게 빛남
            }
        }

        if (imageUrl) {
            element.innerHTML = `
                <img src="${imageUrl}" alt="${word}" class="material-icon" draggable="false">
                <div style="font-size: 0.95rem; font-weight: bold; margin-top: 3px; text-shadow: 0 0 4px #000;">${word}</div>
                <div class="item-count" style="font-size: 0.75rem; color: #00ffff; opacity: 0.8;">x${count}</div>
            `;
            element.classList.add('has-image');
        } else {
            element.innerHTML = `${word} <br><span class="item-count" style="font-size:0.8rem;">x${count}</span>`;
            element.classList.add('has-image'); 
        }

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
                let resultWord = null;
                
                const mat1 = dbMaterials ? dbMaterials.find(m => m.name === draggedWord) : null;
                const mat2 = dbMaterials ? dbMaterials.find(m => m.name === word) : null;

                // 🌟 1. 정규 레시피 검사
                if (mixLookup && mat1 && mat2) {
                    const num1 = parseInt(mat1.material_id.replace(/[^0-9]/g, ''), 10);
                    const num2 = parseInt(mat2.material_id.replace(/[^0-9]/g, ''), 10);
                    let idCombo = num1 <= num2 ? `${mat1.material_id}#${mat2.material_id}` : `${mat2.material_id}#${mat1.material_id}`;
                    
                    const resultData = mixLookup[idCombo];
                    if (resultData) resultWord = resultData.name;
                }

                // 🌟 2. 정규 레시피가 없을 때 기획된 티어(Tier) 기반 랜덤 로직 가동!
                if (!resultWord && mat1 && mat2 && dbMaterials) {
                    const n1 = parseInt(mat1.material_id.replace(/[^0-9]/g, ''), 10);
                    const n2 = parseInt(mat2.material_id.replace(/[^0-9]/g, ''), 10);

                    const getTier = (num) => {
                        if (num <= 8) return 1; 
                        if (num <= 42) return 2; 
                        return 3;                
                    };

                    const t1 = getTier(n1);
                    const t2 = getTier(n2);

                    // 👉 [규칙 A] 3티어(43이상) 재료가 하나라도 포함된 경우
                    if (t1 === 3 || t2 === 3) {
                        let targetCategory = null;
                        
                        if (t1 === 3 && t2 === 3) {
                            targetCategory = Math.random() < 0.5 ? mat1.category : mat2.category;
                        } else {
                            targetCategory = t1 === 3 ? mat1.category : mat2.category;
                        }

                        if (!targetCategory) targetCategory = mat1.category || mat2.category;

                        if (targetCategory) {
                            const catItems = dbMaterials.filter(m => m.category === targetCategory && m.name !== draggedWord && m.name !== word);
                            if (catItems.length > 0) resultWord = catItems[Math.floor(Math.random() * catItems.length)].name;
                        }

                        if (!resultWord) {
                            const fallback3 = dbMaterials.filter(m => parseInt(m.material_id.replace(/[^0-9]/g, ''), 10) >= 43 && m.name !== draggedWord && m.name !== word);
                            if (fallback3.length > 0) resultWord = fallback3[Math.floor(Math.random() * fallback3.length)].name;
                        }
                    } 
                    // 👉 [규칙 B] 2티어(9~42) + 2티어(9~42) 조합인 경우
                    else if (t1 === 2 && t2 === 2) {
                        const fallback3 = dbMaterials.filter(m => parseInt(m.material_id.replace(/[^0-9]/g, ''), 10) >= 43);
                        if (fallback3.length > 0) resultWord = fallback3[Math.floor(Math.random() * fallback3.length)].name;
                    } 
                    // 👉 [규칙 C] 1티어 + 2티어 / 1티어 + 1티어 조합인 경우
                    else {
                        const fallback2 = dbMaterials.filter(m => {
                            const num = parseInt(m.material_id.replace(/[^0-9]/g, ''), 10);
                            return num >= 9 && num <= 42 && m.name !== draggedWord && m.name !== word;
                        });
                        if (fallback2.length > 0) resultWord = fallback2[Math.floor(Math.random() * fallback2.length)].name;
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
                    if (this.ui?.setDialogue) this.ui.setDialogue('합성에 실패하여 재료를 되돌려받았습니다.');
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

    // =========================================================================
    // 🌟 바탕화면 드래그 패닝(무한 캔버스) 및 아이템 드롭 위치 기억
    // =========================================================================
    initEventListeners() {
        if (!this.container) return;

        // 드래그 패닝을 위한 변수들
        let isDraggingBg = false;
        let startX, startY, scrollLeft, scrollTop;

        // 1. 마우스 클릭 (바탕 클릭 시에만 패닝 모드 시작)
        this.container.addEventListener('mousedown', (e) => {
            // 아이템(word-bubble)을 클릭한 게 아니라 캔버스 바닥을 클릭했을 때만 반응
            if (e.target === this.container) {
                isDraggingBg = true;
                this.container.classList.add('panning');
                startX = e.pageX - this.container.offsetLeft;
                startY = e.pageY - this.container.offsetTop;
                scrollLeft = this.container.scrollLeft;
                scrollTop = this.container.scrollTop;
            }
        });

        // 2. 마우스 이동 (패닝 중일 때 스크롤 위치 이동)
        this.container.addEventListener('mousemove', (e) => {
            if (!isDraggingBg) return;
            e.preventDefault();
            const x = e.pageX - this.container.offsetLeft;
            const y = e.pageY - this.container.offsetTop;
            const walkX = (x - startX); // 이동 거리
            const walkY = (y - startY);
            this.container.scrollLeft = scrollLeft - walkX;
            this.container.scrollTop = scrollTop - walkY;
        });

        // 3. 마우스 떼기 (패닝 종료)
        this.container.addEventListener('mouseup', () => {
            isDraggingBg = false;
            this.container.classList.remove('panning');
        });

        // 4. 영역을 벗어났을 때 방어 코드
        this.container.addEventListener('mouseleave', () => {
            isDraggingBg = false;
            this.container.classList.remove('panning');
        });

        // ===============================================
        // 아이템 드롭 시 위치 저장 (스크롤된 좌표까지 완벽 보정)
        this.container.addEventListener('dragover', e => e.preventDefault());
        this.container.addEventListener('drop', e => {
            e.preventDefault();
            e.stopPropagation();

            const word = e.dataTransfer.getData('text/plain');
            if (!word) return;

            // 주머니 빈 공간에 내려놓았을 때
            if (e.target === this.container || e.target.id === 'magic-pouch') {
                const rect = this.container.getBoundingClientRect();
                
                // 🌟 스크롤된 만큼 거리를 보정해 줍니다 (this.container.scrollLeft/Top)
                const x = e.clientX - rect.left + this.container.scrollLeft - 40; 
                const y = e.clientY - rect.top + this.container.scrollTop - 20;

                const positions = this.scene.registry.get('itemPositions') || {};
                positions[word] = { x: Math.max(0, x), y: Math.max(0, y) };
                this.scene.registry.set('itemPositions', positions);
                
                if (typeof this.scene.saveGameData === 'function') this.scene.saveGameData();
                this.render(); 
            }
        });
    }
}