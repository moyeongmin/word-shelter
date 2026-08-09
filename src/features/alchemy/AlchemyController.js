import AlchemyUI from './AlchemyUI';
import ReplicatorManager from './ReplicatorManager';
import MaterialField from './MaterialField';
import HouseMaterialSubmission from './HouseMaterialSubmission';
import AICatAnimator from './AICatAnimator'; // 🌟 1. AI 냥이 애니메이터 임포트

export default class AlchemyController {
    constructor(scene, questManager, timeLapseSequence) {
        this.scene = scene;
        this.questManager = questManager;
        this.timeLapseSequence = timeLapseSequence;

        console.log('🔌 AlchemyController questManager:', this.questManager);

        this.ui = new AlchemyUI(scene);

        this.replicatorManager = new ReplicatorManager(scene, {
            onInventoryChanged: () => {
                this.handleInventoryChanged();
            }
        });

        this.materialField = new MaterialField(
            scene,
            this.ui,
            this.replicatorManager
        );

        this.houseSubmission = new HouseMaterialSubmission(
            scene,
            this.ui,
            this.questManager,
            this.timeLapseSequence
        );

        // 🌟 2. AI 냥이 애니메이터 인스턴스 생성
        this.aiCatAnimator = new AICatAnimator();

        this.replicatorManager.init();
        this.bindFilterEvents();

        this.ui.onClose(() => {
            this.close();
        });
    }

    bindFilterEvents() {
        const search = document.getElementById('pouch-search');
        const sort = document.getElementById('pouch-sort');

        if (search) {
            search.oninput = () => {
                this.materialField.render();
            };
        }

        if (sort) {
            sort.onchange = () => {
                this.materialField.render();
            };
        }
    }

    open() {
        this.scene.input.keyboard.resetKeys();
        this.scene.input.keyboard.enabled = false;

        this.scene.hudContainer?.classList.add('hidden');

        this.ui.open();
        this.replicatorManager.syncUI();
        this.materialField.render();
        this.houseSubmission.render();

        // 🌟 3. 작업대를 열 때마다 랜덤으로 Stand, Sit, Sleep 2초 순환 애니메이션 가동!
        this.aiCatAnimator.start('ai-cat-face-img');
    }

    close() {
        // 혹시 켜져 있을지 모를 집 재료 선택 모달도 같이 닫아주기
        const houseModal = document.getElementById('house-select-modal');
        if (houseModal) houseModal.classList.add('hidden');

        // 포커스 모드 해제
        const deskScreen = document.getElementById('alchemy-desk-screen');
        if (deskScreen) deskScreen.classList.remove('focus-mode');

        // 🌟 4. 작업대를 닫을 때 애니메이션 타이머 중지
        this.aiCatAnimator.stop();

        this.ui.close();

        this.scene.hudContainer?.classList.remove('hidden');

        this.scene.input.keyboard.resetKeys();
        this.scene.input.keyboard.enabled = true;
    }

    isOpen() {
        return this.ui.isOpen();
    }

    update() {
        this.replicatorManager.update();
    }

    setDialogue(text, actionLabel = null, callback = null) {
        this.ui.setDialogue(text, actionLabel, callback);
    }

    handleInventoryChanged() {
        if (!this.isOpen()) return;

        this.materialField.render();
        this.houseSubmission.render();
    }

    destroy() {
        this.aiCatAnimator.stop();
        this.replicatorManager.destroy();
    }
}