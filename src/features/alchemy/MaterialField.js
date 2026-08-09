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
            this.ui.setDialogue(`진화 포인트가 부족해. (현재: ${points}/${requiredPoints})`);
            return false;
        }

        // 포인트 차감 및 단계 상승
        this.scene.registry.set('evolutionPoints', points - requiredPoints);
        let evoStage = this.scene.registry.get('evolutionStage') || 1;
        this.scene.registry.set('evolutionStage', evoStage + 1);
        
        this.ui.setDialogue('진화가 성공적으로 완료되었습니다!');
        return true;
    }

    // 2. 하단 제출 슬롯 드래그 앤 드롭 및 클릭 회수 설정
    initSubmissionSlots() {
        const slots = document.querySelectorAll('.house-material-slot');
        
        slots.forEach((slot, index) => {
            // 드래그 진입 허용
            slot.addEventListener('dragover', e => e.preventDefault());

            // 재료를 슬롯에 드롭했을 때
            slot.addEventListener('drop', e => {
                e.preventDefault();
                const word = e.dataTransfer.getData('text/plain');
                if (!word) return;

                const inventory = this.scene.registry.get('wordInventory') || {};
                if (!inventory[word] || inventory[word] <= 0) return;

                let submitted = this.scene.registry.get('houseSubmittedMaterials') || Array(10).fill(null);
                
                // 이미 다른 곳에 들어있는지 확인하거나 해당 슬롯에 넣기
                inventory[word]--;
                submitted[index] = word;

                this.scene.registry.set('wordInventory', inventory);
                this.scene.registry.set('houseSubmittedMaterials', submitted);

                this.render();
                this.renderSubmissionSlots();
            });

            // 제출된 슬롯을 클릭하면 다시 인벤토리로 회수
            slot.addEventListener('click', () => {
                let submitted = this.scene.registry.get('houseSubmittedMaterials') || Array(10).fill(null);
                const word = submitted[index];
                if (!word) return;

                const inventory = this.scene.registry.get('wordInventory') || {};
                inventory[word] = (inventory[word] || 0) + 1;
                submitted[index] = null;

                this.scene.registry.set('wordInventory', inventory);
                this.scene.registry.set('houseSubmittedMaterials', submitted);

                this.ui.setDialogue(`"${word}"을(를) 다시 회수했습니다.`);
                this.render();
                this.renderSubmissionSlots();
            });
        });
    }

    // 제출 슬롯 UI 렌더링 갱신
    renderSubmissionSlots() {
        const submitted = this.scene.registry.get('houseSubmittedMaterials') || Array(10).fill(null);
        const slots = document.querySelectorAll('.house-material-slot');
        let count = 0;

        slots.forEach((slot, index) => {
            const word = submitted[index];
            if (word) {
                slot.innerHTML = `<span style="font-size:0.7rem; color:#4CAF50;">${index + 1}</span><strong>${word}</strong>`;
                slot.style.borderColor = '#4CAF50';
                count++;
            } else {
                slot.innerHTML = `<span style="font-size:0.7rem; color:#888;">${String(index + 1).padStart(2, '0')}</span><strong>+</strong>`;
                slot.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }
        });

        // 10개 다 채워졌을 때 제출 버튼 활성화 등 처리 가능
        const submitBtn = document.getElementById('submit-house-materials');
        if (submitBtn) {
            if (count >= 10) {
                submitBtn.removeAttribute('disabled');
                submitBtn.style.background = '#4CAF50';
            } else {
                submitBtn.setAttribute('disabled', 'true');
                submitBtn.style.background = '#555';
            }
        }
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        const inventory = this.scene.registry.get('wordInventory') || {};
        const savedPositions = this.scene.registry.get('itemPositions') || {};

        Object.entries(inventory)
            .filter(([, count]) => count > 0)
            .forEach(([word, count], index) => {
                this.createMaterial(word, count, index, savedPositions[word]);
            });
            
        this.renderSubmissionSlots();
    }

    createMaterial(word, count, index, customPos) {
        const element = document.createElement('div');
        element.className = 'future-floating-material';
        element.draggable = true;

        element.innerHTML = `
            ${word}
            <span class="item-count">x${count}</span>
        `;

        if (customPos) {
            element.style.left = `${customPos.x}px`;
            element.style.top = `${customPos.y}px`;
        } else {
            this.applyRandomPosition(element, index);
        }

        element.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', word);
        });

        this.container.appendChild(element);
    }

    applyRandomPosition(element, index) {
        const column = index % 4;
        const row = Math.floor(index / 4);
        element.style.left = `${10 + column * 22}%`;
        element.style.top = `${20 + row * 65}px`;
    }

    initEventListeners() {
        if (this.container) {
            this.container.addEventListener('dragover', e => e.preventDefault());
            this.container.addEventListener('drop', e => {
                e.preventDefault();
                const word = e.dataTransfer.getData('text/plain');
                if (!word) return;

                if (e.target === this.container) {
                    const rect = this.container.getBoundingClientRect();
                    const x = e.clientX - rect.left - 30;
                    const y = e.clientY - rect.top - 15;

                    const positions = this.scene.registry.get('itemPositions') || {};
                    positions[word] = { x: Math.max(0, x), y: Math.max(0, y) };
                    this.scene.registry.set('itemPositions', positions);
                    this.render();
                }
            });
        }
    }
}