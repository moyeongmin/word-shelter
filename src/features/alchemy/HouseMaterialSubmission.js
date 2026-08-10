import { requestHouseGeneration } from '../../api/houseGeneration';

export default class HouseMaterialSubmission {
    constructor(scene, ui, questManager, timeLapseSequence) {
        this.scene = scene;
        this.ui = ui;
        this.questManager = questManager;
        this.timeLapseSequence = timeLapseSequence;

        this.materials = this.scene.registry.get('houseMaterials') || Array(10).fill(null);

        // DOM 바인딩
        this.modal = document.getElementById('house-select-modal');
        this.openBtn = document.getElementById('open-house-select-btn');
        this.closeBtn = document.getElementById('close-house-select-btn');
        this.discoveredListContainer = document.getElementById('house-discovered-list');
        this.slotContainer = document.getElementById('house-material-slots');
        this.countEl = document.getElementById('house-select-count');
        this.submitButton = document.getElementById('submit-house-materials');

        this.bindEvents();
        this.render();
    }

    bindEvents() {
        if (this.openBtn) {
            this.openBtn.onclick = (e) => {
                e.stopPropagation();
                this.openModal();
            };
        }

        if (this.closeBtn) {
            this.closeBtn.onclick = (e) => {
                e.stopPropagation();
                this.closeModal();
            };
        }

        if (this.submitButton) {
            this.submitButton.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.submit();
            };
        }
    }
    openModal() {
        if (this.modal) {

            document.body.appendChild(this.modal);
            
            this.modal.classList.remove('hidden'); // 이 코드가 반드시 실행되어야 합니다!
            console.log("🏠 건축 재료 선택 모달 오픈!");
        } else {
            console.error("❌ #house-select-modal 요소를 HTML에서 찾을 수 없습니다.");
        }
        this.renderDiscoveredList();
        this.renderSlots();
    }

    closeModal() {
        if (this.modal) this.modal.classList.add('hidden');
    }

    // 🌟 좌측: 도감(discoveredWords) 목록 렌더링
    renderDiscoveredList() {
        if (!this.discoveredListContainer) return;
        this.discoveredListContainer.innerHTML = '';

        const discoveredWords = this.scene.registry.get('discoveredWords') || [];

        if (discoveredWords.length === 0) {
            this.discoveredListContainer.innerHTML = '<div style="color:#aaa; font-size:0.85rem; padding:10px;">도감에 발견된 재료가 없습니다.</div>';
            return;
        }

        discoveredWords.forEach((word) => {
            const chip = document.createElement('div');
            chip.className = 'discovered-chip';
            chip.innerText = word;

            // 클릭 시 우측 비어있는 가장 첫 번째 슬롯에 추가
            chip.onclick = () => {
                this.addMaterialToFirstEmptySlot(word);
            };

            this.discoveredListContainer.appendChild(chip);
        });
    }

    addMaterialToFirstEmptySlot(word) {
        // 이미 들어있는지 체크
        if (this.materials.includes(word)) {
            if (this.ui?.setDialogue) this.ui.setDialogue(`"${word}"은(는) 이미 선택 목록에 존재합니다.`);
            return;
        }

        const emptyIndex = this.materials.findIndex((item) => item === null);
        if (emptyIndex === -1) {
            if (this.ui?.setDialogue) this.ui.setDialogue('10개의 재료 슬롯이 모두 채워졌습니다.');
            return;
        }

        this.materials[emptyIndex] = word;
        this.scene.registry.set('houseMaterials', this.materials);
        this.renderSlots();
    }

    removeMaterialFromSlot(index) {
        if (!this.materials[index]) return;
        this.materials[index] = null;
        this.scene.registry.set('houseMaterials', this.materials);
        this.renderSlots();
    }

    // 🌟 우측: 10개 제출 슬롯 렌더링
    renderSlots() {
        if (!this.slotContainer) return;
        this.slotContainer.innerHTML = '';

        this.materials.forEach((word, index) => {
            const slot = document.createElement('div');
            slot.className = `house-material-slot${word ? ' filled' : ''}`;
            slot.innerHTML = word
                ? `<span>${index + 1}</span><strong>${word}</strong>`
                : `<span>${index + 1}</span><strong>+</strong>`;

            slot.onclick = () => {
                this.removeMaterialFromSlot(index);
            };

            this.slotContainer.appendChild(slot);
        });

        const count = this.materials.filter(Boolean).length;
        if (this.countEl) this.countEl.innerText = count;

        const mainCountEl = document.getElementById('house-material-count');
        if (mainCountEl) mainCountEl.innerText = `${count} / 10 MATERIALS`;

        if (this.submitButton) {
            this.submitButton.disabled = count !== 10;
        }
    }

    render() {
        this.renderSlots();
    }

    submit() {
        const submittedMaterials = this.materials.filter(Boolean);
        if (submittedMaterials.length !== 10) return;

        const buildState = this.scene.registry.get('houseBuildState');
        if (!buildState) return;

        buildState.submitted = true;
        buildState.requestStarted = true;
        buildState.quest.active = true;
        buildState.quest.completed = false;
        buildState.quest.startedAt = Date.now();
        buildState.quest.partFound = false;

        this.scene.registry.set('houseBuildState', buildState);

        // 선택 모달 닫기
        this.closeModal();

        // 🌟 핵심: 대형 AI "잠깐!" 연출 및 퀘스트 시작
        if (typeof this.scene.startBottomAreaScript === 'function') {
            this.scene.startBottomAreaScript();
        }

        // 백엔드 생성 요청
        const dbMaterials = this.scene.registry.get('dbMaterials') || [];
        const validMaterials = submittedMaterials.filter(name => dbMaterials.some(m => m.name === name));
        const finalMaterials = validMaterials.length === 10 ? validMaterials : ['불', '물', '나무', '돌', '흙', '불', '물', '나무', '돌', '흙'];

        const initials = this.scene.registry.get('playerInitials') || 'WS';
        const comboCount = this.scene.registry.get('comboCount') || 0;

        requestHouseGeneration(finalMaterials, { initials, comboCount })
            .then((result) => {
                const latestState = this.scene.registry.get('houseBuildState');
                latestState.requestCompleted = true;
                latestState.houseId = result.house_id;
                this.scene.registry.set('houseBuildState', latestState);
                this.scene.registry.set('houseGenerationResult', result);
            })
            .catch(() => {
                const latestState = this.scene.registry.get('houseBuildState');
                latestState.requestCompleted = true;
                latestState.houseId = 'mock-house-id-success';
                this.scene.registry.set('houseBuildState', latestState);
            });
    }
}