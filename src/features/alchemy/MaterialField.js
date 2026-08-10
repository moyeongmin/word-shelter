import { playSFX } from '../sound/soundUtils';

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

            if (numId >= 9 && numId <= 42) {
                borderColor = categoryColors["기타"]; 
            } else if (numId >= 43) {
                borderColor = categoryColors[matData.category] || categoryColors["기타"]; 
            }

            if (borderColor) {
                element.style.border = `2px solid ${borderColor}`;
                element.style.boxShadow = `0 0 12px ${borderColor}99`; 
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
                playSFX(this.scene, 'sfx_mix', 0.6);
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

                // 🌟 [추가됨] 1.5. 로컬 도감(discoveredRecipes)에서 이전에 나온 기록 탐색 (캐싱 유지)
                if (!resultWord) {
                    const recipes = this.scene.registry.get('discoveredRecipes') || {};
                    const sortedCombo = [draggedWord, word].sort();
                    
                    for (const [savedResult, comboList] of Object.entries(recipes)) {
                        const exists = comboList.some(r => r[0] === sortedCombo[0] && r[1] === sortedCombo[1]);
                        
                        if (exists) {
                            resultWord = savedResult; 
                            console.log(`[캐싱] 로컬 도감 기록 발동! ${draggedWord} + ${word} => ${resultWord}`);
                            break;
                        }
                    }
                }

                // 🌟 2. 정규 레시피 및 도감 기록이 없을 때만 랜덤 로직 가동
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
                    else if (t1 === 2 && t2 === 2) {
                        const fallback3 = dbMaterials.filter(m => parseInt(m.material_id.replace(/[^0-9]/g, ''), 10) >= 43);
                        if (fallback3.length > 0) resultWord = fallback3[Math.floor(Math.random() * fallback3.length)].name;
                    } 
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

                    // 🌟 [수정됨] 조합 성공 시 안내 텍스트
                    if (this.ui?.setDialogue) {
                        this.ui.setDialogue(`✨ 연금술 성공! [${draggedWord}]와(과) [${word}]을(를) 합쳐서 [${resultWord}]이(가) 탄생했다냥!`);
                    }

                } else {
                    inventory[draggedWord] = (inventory[draggedWord] || 0) + 1;
                    inventory[word] = (inventory[word] || 0) + 1;
                    this.scene.registry.set('wordInventory', inventory);
                    
                    // 🌟 [수정됨] 조합 실패 시 안내 텍스트
                    if (this.ui?.setDialogue) {
                        this.ui.setDialogue(`펑! [${draggedWord}]와(과) [${word}]은(는) 합칠 수 없는 거 같다냥... 재료는 돌려주겠다냥!`);
                    }
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

    initEventListeners() {
        if (!this.container) return;

        let isDraggingBg = false;
        let startX, startY, scrollLeft, scrollTop;

        this.container.addEventListener('mousedown', (e) => {
            if (e.target === this.container) {
                isDraggingBg = true;
                this.container.classList.add('panning');
                startX = e.pageX - this.container.offsetLeft;
                startY = e.pageY - this.container.offsetTop;
                scrollLeft = this.container.scrollLeft;
                scrollTop = this.container.scrollTop;
            }
        });

        this.container.addEventListener('mousemove', (e) => {
            if (!isDraggingBg) return;
            e.preventDefault();
            const x = e.pageX - this.container.offsetLeft;
            const y = e.pageY - this.container.offsetTop;
            const walkX = (x - startX); 
            const walkY = (y - startY);
            this.container.scrollLeft = scrollLeft - walkX;
            this.container.scrollTop = scrollTop - walkY;
        });

        this.container.addEventListener('mouseup', () => {
            isDraggingBg = false;
            this.container.classList.remove('panning');
        });

        this.container.addEventListener('mouseleave', () => {
            isDraggingBg = false;
            this.container.classList.remove('panning');
        });

        this.container.addEventListener('dragover', e => e.preventDefault());
        this.container.addEventListener('drop', e => {
            e.preventDefault();
            e.stopPropagation();

            const word = e.dataTransfer.getData('text/plain');
            if (!word) return;

            if (e.target === this.container || e.target.id === 'magic-pouch') {
                const rect = this.container.getBoundingClientRect();
                
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