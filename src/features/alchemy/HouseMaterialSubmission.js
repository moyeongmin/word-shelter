import { requestHouseGeneration } from '../../api/houseGeneration';

export default class HouseMaterialSubmission {
    constructor(scene, ui, questManager, timeLapseSequence) {
        this.scene = scene;
        this.ui = ui;
        this.questManager = questManager;
        this.timeLapseSequence = timeLapseSequence;
        console.log('📦 HouseMaterialSubmission questManager:', this.questManager);

        this.materials = this.scene.registry.get('houseMaterials') || Array(10).fill(null);

        // 기존 HTML에 이미 존재하는 요소를 그대로 사용
        this.slotContainer = document.getElementById('house-material-slots');
        this.countEl = document.getElementById('house-material-count');
        this.submitButton = document.getElementById('submit-house-materials');

        if (!this.slotContainer) {
            console.warn('❌ #house-material-slots를 찾을 수 없습니다.');
        }

        if (!this.submitButton) {
            console.warn('❌ #submit-house-materials를 찾을 수 없습니다.');
        }

        this.bindEvents();
        this.render();
    }

    bindEvents() {
        if (!this.submitButton) return;

        this.submitButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            console.log('🏠 제출 버튼 클릭');

            this.submit();
        };
    }

    render() {
        if (!this.slotContainer) return;

        this.slotContainer.innerHTML = '';

        const buildState = this.scene.registry.get('houseBuildState');

        this.materials.forEach((word, index) => {
            const slot = document.createElement('div');

            slot.className = `house-material-slot${word ? ' filled' : ''}`;
            slot.dataset.slot = index;

            slot.innerHTML = word
                ? `<span>${index + 1}</span><strong>${word}</strong>`
                : `<span>${index + 1}</span><strong>+</strong>`;

            // 슬롯 클릭 → 재료 반환
            slot.addEventListener('click', () => {
                if (!this.materials[index]) return;

                // 제출 이후에는 변경 불가능
                if (buildState?.submitted) return;

                this.remove(index);
            });

            slot.addEventListener('dragover', (e) => {
                if (buildState?.submitted) return;

                e.preventDefault();
                slot.classList.add('drag-over');
            });

            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');

                if (buildState?.submitted) return;

                const droppedWord = e.dataTransfer.getData('text/plain');

                if (droppedWord) {
                    this.insert(index, droppedWord);
                }
            });

            this.slotContainer.appendChild(slot);
        });

        const count = this.materials.filter(Boolean).length;

        if (this.countEl) {
            this.countEl.innerText = `${count} / 10 MATERIALS`;
        }

        if (this.submitButton) {
            const locked =
                buildState?.submitted ||
                buildState?.quest?.active ||
                buildState?.quest?.completed ||
                buildState?.timeLapseStarted;

            this.submitButton.disabled = count !== 10 || locked;

            if (buildState?.timeLapseStarted) {
                this.submitButton.innerText = '제작 진행 중';
            } else if (buildState?.quest?.completed) {
                this.submitButton.innerText = '부품 회수 완료';
            } else if (buildState?.quest?.active) {
                this.submitButton.innerText = '부품 회수 필요';
            } else if (buildState?.submitted) {
                this.submitButton.innerText = '제출 완료';
            } else {
                this.submitButton.innerText = '집 짓기 재료 제출';
            }
        }
    }

    insert(index, word) {
        if (!word) return;

        const buildState = this.scene.registry.get('houseBuildState');
        if (buildState?.submitted) return;

        const inventory = this.scene.registry.get('wordInventory') || {};
        const currentWord = this.materials[index];

        // 같은 슬롯에 같은 재료를 다시 넣는 경우 아무것도 하지 않음
        if (currentWord === word) return;

        // ==========================================
        // 이미 다른 제출 슬롯에 들어간 재료인지 확인
        // ==========================================
        const duplicateIndex = this.materials.findIndex((material, slotIndex) => {
            return slotIndex !== index && material === word;
        });

        if (duplicateIndex !== -1) {
            console.warn(`⚠️ [${word}]은 이미 ${duplicateIndex + 1}번 슬롯에 들어가 있습니다.`);

            if (this.ui?.setDialogue) {
                this.ui.setDialogue(`"${word}"은 이미 제출 목록에 있어. 서로 다른 10개의 재료가 필요해.`);
            }

            return;
        }

        // 실제 인벤토리에 해당 재료가 있는지 확인
        if (!inventory[word] || inventory[word] <= 0) {
            console.warn(`❌ [${word}] 재료가 부족합니다.`);

            if (this.ui?.setDialogue) {
                this.ui.setDialogue(`"${word}" 재료가 부족해.`);
            }

            return;
        }

        // 기존 슬롯에 다른 재료가 있었다면 먼저 반환
        if (currentWord) {
            inventory[currentWord] = (inventory[currentWord] || 0) + 1;
        }

        // 새 재료 1개 소비
        inventory[word] -= 1;

        if (inventory[word] <= 0) {
            delete inventory[word];
        }

        // 슬롯에 저장
        this.materials[index] = word;

        this.scene.registry.set('wordInventory', inventory);
        this.scene.registry.set('houseMaterials', this.materials);

        // 인벤토리 UI 갱신
        if (typeof this.scene.renderAlchemyPouch === 'function') {
            this.scene.wordInventory = inventory;
            this.scene.renderAlchemyPouch();
        } else if (this.scene.alchemy?.materialField) {
            this.scene.alchemy.materialField.render();
        }

        this.render();

        console.log(`🏠 제출 슬롯 ${index + 1}: ${word}`);
    }

    remove(index) {
        const buildState = this.scene.registry.get('houseBuildState');
        if (buildState?.submitted) return;

        const word = this.materials[index];
        if (!word) return;

        const inventory = this.scene.registry.get('wordInventory') || {};

        inventory[word] = (inventory[word] || 0) + 1;
        this.materials[index] = null;

        this.scene.registry.set('wordInventory', inventory);
        this.scene.registry.set('houseMaterials', this.materials);

        if (typeof this.scene.renderAlchemyPouch === 'function') {
            this.scene.wordInventory = inventory;
            this.scene.renderAlchemyPouch();
        } else if (this.scene.alchemy?.materialField) {
            this.scene.alchemy.materialField.render();
        }

        this.render();
    }

    submit() {
        console.log('🏠 submit() 진입');

        const submittedMaterials = this.materials.filter(Boolean);

        console.log('🏠 제출 재료:', submittedMaterials);

        if (submittedMaterials.length !== 10) {
            console.warn(`❌ 재료 부족: ${submittedMaterials.length}/10`);
            return;
        }

        const buildState = this.scene.registry.get('houseBuildState');

        console.log('🏠 제출 전 상태:', buildState);

        if (!buildState) {
            console.error('❌ houseBuildState가 Registry에 없습니다.');
            return;
        }

        if (buildState.submitted) {
            console.warn('⚠️ 이미 제출된 상태입니다.');
            return;
        }

        // ==========================================
        // 1. 제출 및 퀘스트 상태 즉시 저장
        // ==========================================
        buildState.submitted = true;
        buildState.requestStarted = true;

        buildState.quest.active = true;
        buildState.quest.completed = false;
        buildState.quest.startedAt = Date.now();
        buildState.quest.partFound = false;

        this.scene.registry.set('houseBuildState', buildState);

        console.log('✅ 제출 상태 저장:', this.scene.registry.get('houseBuildState'));

        // 버튼 즉시 잠금
        this.render();
        const initials = this.scene.registry.get('playerInitials') || 'WS';
        const comboCount = this.scene.registry.get('comboCount') || 0;

        requestHouseGeneration(submittedMaterials, {
            initials,
            comboCount
        }).then((result) => {
        const latestState = this.scene.registry.get('houseBuildState');

        latestState.requestCompleted = true;
        latestState.houseId = result.house_id;

        this.scene.registry.set('houseBuildState', latestState);
        this.scene.registry.set('houseGenerationResult', result);

        console.log('🏠 집 생성 요청 완료:', result);
        console.log('🏠 house_id:', result.house_id);
        })
        .catch((error) => {
            const latestState = this.scene.registry.get('houseBuildState');

            latestState.requestCompleted = false;
            latestState.requestError = error.message;

            this.scene.registry.set('houseBuildState', latestState);

            console.warn('⚠️ 집 생성 API 요청 실패:', error);
        });

        // ==========================================
        // 3. 퀘스트 HUD 표시
        // ==========================================
        if (this.questManager) {
            console.log('🚀 QuestManager.start 호출');

            this.questManager.start('lost-ai-part');
        } else {
            console.error('❌ questManager가 HouseMaterialSubmission에 전달되지 않았습니다.');
        }

        // ==========================================
        // 4. 작업대 닫기
        // ==========================================
        if (this.scene.alchemy?.close) {
            this.scene.alchemy.close();
        } else {
            const deskScreen = document.getElementById('alchemy-desk-screen');
            const hudContainer = document.getElementById('hud-container');

            if (deskScreen) {
                deskScreen.classList.add('hidden');
            }

            if (hudContainer) {
                hudContainer.classList.remove('hidden');
            }

            if (this.scene?.input?.keyboard) {
                this.scene.input.keyboard.resetKeys();
                this.scene.input.keyboard.enabled = true;
            }
        }

        console.log('✅ 제출 → 작업대 종료 → 퀘스트 시작 완료');
    }
}