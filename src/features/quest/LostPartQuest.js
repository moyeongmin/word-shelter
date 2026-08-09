export default class LostPartQuest {
    constructor(scene, hud) {
        this.scene = scene;
        this.hud = hud;

        this.registryKey =
            'lostPartQuest';
    }

    restore() {
        const state =
            this.scene.registry.get(
                this.registryKey
            );

        if (state?.active) {
            this.hud.show({
                title:
                    '잃어버린 코어 부품',

                description:
                    'AI의 핵심 부품을 찾아오자.',

                time:
                    '예상 소요 2~3분'
            });
        }
    }

    start() {
        this.scene.registry.set(
            this.registryKey,
            {
                active: true,
                completed: false
            }
        );

        this.scene.registry.set(
            'lostPartFound',
            false
        );

        this.restore();
    }

    complete() {
        this.scene.registry.set(
            this.registryKey,
            {
                active: false,
                completed: true
            }
        );

        this.scene.registry.set(
            'lostPartFound',
            true
        );

        this.hud.hide();
    }

    update() {}

    createTemporaryPartTexture() {
    if (this.scene.textures.exists('item_ai_core_temp')) return;

    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0x263238, 1);
    g.fillRoundedRect(4, 8, 40, 32, 5);

    g.fillStyle(0x00ffcc, 1);
    g.fillCircle(24, 24, 9);

    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(21, 21, 3);

    g.fillStyle(0x78909c, 1);
    g.fillRect(0, 17, 7, 14);
    g.fillRect(41, 17, 7, 14);

    g.generateTexture('item_ai_core_temp', 48, 48);
    g.destroy();

    // TODO:
    // 실제 이미지 완성 후:
    // this.load.image('item_ai_core', 'assets/images/item_ai_core.png');
}
}
