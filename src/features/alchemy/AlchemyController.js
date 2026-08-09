import AlchemyUI from './AlchemyUI';
import ReplicatorManager from './ReplicatorManager';
import MaterialField from './MaterialField';
import HouseMaterialSubmission from './HouseMaterialSubmission';

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

        // ⭐ 여기서 반드시 questManager 전달
        this.houseSubmission = new HouseMaterialSubmission(
            scene,
            this.ui,
            this.questManager,
            this.timeLapseSequence
        );

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
    }

    close() {
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
        this.replicatorManager.destroy();
    }
}