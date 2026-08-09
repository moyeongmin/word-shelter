export default class ReplicatorManager {
    constructor(scene, options = {}) {
        this.scene = scene;

        // 복제기로 인해 인벤토리가 변경됐을 때
        // BaseCampScene의 재료 UI를 다시 그리기 위한 callback
        this.onInventoryChanged =
            options.onInventoryChanged || null;

        this.dropZones = [];
        this.removeButtons = [];
        this.progressBars = [];

        this.bound = false;
    }

    // =========================================================
    // Registry 접근
    // =========================================================

    get replicators() {
        return (
            this.scene.registry.get('replicators') || [
                {
                    item: null,
                    lastTick: 0
                },
                {
                    item: null,
                    lastTick: 0
                }
            ]
        );
    }

    get inventory() {
        return (
            this.scene.registry.get('wordInventory') ||
            {}
        );
    }

    get upgrades() {
        return (
            this.scene.registry.get('upgrades') || {
                speed: 0,
                time: 0,
                yield: 0,
                slot2: false
            }
        );
    }

    // 기존 BaseCampScene 로직 그대로
    get replicationTime() {
        return (
            15000 -
            this.upgrades.time * 1000
        );
    }

    get replicationYield() {
        return (
            1 +
            this.upgrades.yield
        );
    }

    // =========================================================
    // 초기화
    // =========================================================

    init() {
        this.cacheDomElements();
        this.bindEvents();
        this.syncUI();
    }

    cacheDomElements() {
        for (let i = 0; i < 2; i++) {
            this.dropZones[i] =
                document.getElementById(
                    `rep-drop-${i}`
                );

            this.removeButtons[i] =
                document.getElementById(
                    `remove-rep-${i}`
                );

            this.progressBars[i] =
                document.getElementById(
                    `rep-bar-${i}`
                );
        }
    }

    bindEvents() {
        if (this.bound) {
            return;
        }

        for (let i = 0; i < 2; i++) {
            const dropZone =
                this.dropZones[i];

            const removeButton =
                this.removeButtons[i];

            if (!dropZone) {
                console.warn(
                    `[ReplicatorManager] rep-drop-${i}를 찾을 수 없습니다.`
                );

                continue;
            }

            // =============================================
            // Drag Over
            // =============================================

            dropZone.ondragover = event => {
                if (
                    dropZone.classList.contains(
                        'locked'
                    )
                ) {
                    return;
                }

                event.preventDefault();

                dropZone.classList.add(
                    'drag-over'
                );
            };

            // =============================================
            // Drag Leave
            // =============================================

            dropZone.ondragleave = () => {
                dropZone.classList.remove(
                    'drag-over'
                );
            };

            // =============================================
            // Drop
            // =============================================

            dropZone.ondrop = event => {
                event.preventDefault();

                dropZone.classList.remove(
                    'drag-over'
                );

                if (
                    dropZone.classList.contains(
                        'locked'
                    )
                ) {
                    return;
                }

                const item =
                    event.dataTransfer.getData(
                        'text/plain'
                    );

                if (!item) {
                    return;
                }

                this.insert(
                    item,
                    i
                );
            };

            // =============================================
            // 복제기에서 제거
            // =============================================

            if (removeButton) {
                removeButton.onclick = event => {
                    event.stopPropagation();

                    this.remove(i);
                };
            }
        }

        this.bound = true;
    }

    // =========================================================
    // 복제기 업데이트
    //
    // Scene.update()에서 호출
    // =========================================================

    update() {
        const now =
            Date.now();

        let inventoryChanged =
            false;

        const replicators =
            this.replicators;

        const inventory =
            this.inventory;

        replicators.forEach(
            (replicator, index) => {
                if (!replicator.item) {
                    this.updateProgressBar(
                        index,
                        0
                    );

                    return;
                }

                const elapsed =
                    now -
                    replicator.lastTick;

                // =========================================
                // 복제 완료
                // =========================================

                if (
                    elapsed >=
                    this.replicationTime
                ) {
                    const ticks =
                        Math.floor(
                            elapsed /
                            this.replicationTime
                        );

                    const amount =
                        this.replicationYield *
                        ticks;

                    inventory[
                        replicator.item
                    ] =
                        (
                            inventory[
                                replicator.item
                            ] || 0
                        ) + amount;

                    // BaseCampScene 도감 시스템 사용
                    if (
                        typeof this.scene
                            .addDiscoveredWord ===
                        'function'
                    ) {
                        this.scene.addDiscoveredWord(
                            replicator.item
                        );
                    }

                    replicator.lastTick +=
                        ticks *
                        this.replicationTime;

                    inventoryChanged =
                        true;

                    console.log(
                        `⚙️ [${replicator.item}] 복제 완료 +${amount}`
                    );
                }

                // =========================================
                // 진행률 표시
                // =========================================

                const progress =
                    Math.min(
                        100,
                        (
                            (
                                now -
                                replicator.lastTick
                            ) /
                            this.replicationTime
                        ) * 100
                    );

                this.updateProgressBar(
                    index,
                    progress
                );
            }
        );

        if (inventoryChanged) {
            this.scene.registry.set(
                'wordInventory',
                inventory
            );

            this.scene.registry.set(
                'replicators',
                replicators
            );

            this.notifyInventoryChanged();
        }
    }

    // =========================================================
    // 재료 투입
    // =========================================================

    insert(
        item,
        slotIndex
    ) {
        if (!item) {
            return false;
        }

        const replicators =
            this.replicators;

        const inventory =
            this.inventory;

        const upgrades =
            this.upgrades;

        // =============================================
        // 2번 슬롯 잠금
        // =============================================

        if (
            slotIndex === 1 &&
            !upgrades.slot2
        ) {
            console.warn(
                '2번 복제기 슬롯은 아직 잠겨 있습니다.'
            );

            return false;
        }

        // =============================================
        // 재료 존재 여부
        // =============================================

        if (
            !inventory[item] ||
            inventory[item] <= 0
        ) {
            console.warn(
                `[ReplicatorManager] ${item} 재료가 없습니다.`
            );

            return false;
        }

        // 이미 동일한 재료가 들어있음
        if (
            replicators[slotIndex].item ===
            item
        ) {
            return false;
        }

        // =============================================
        // 기존 재료 반환
        // =============================================

        const oldItem =
            replicators[
                slotIndex
            ].item;

        if (oldItem) {
            inventory[oldItem] =
                (
                    inventory[
                        oldItem
                    ] || 0
                ) + 1;
        }

        // =============================================
        // 새 재료 한 개 소비
        // =============================================

        inventory[item] -= 1;

        if (
            inventory[item] <= 0
        ) {
            delete inventory[item];
        }

        // =============================================
        // 복제기 시작
        // =============================================

        replicators[
            slotIndex
        ] = {
            item,
            lastTick: Date.now()
        };

        this.scene.registry.set(
            'wordInventory',
            inventory
        );

        this.scene.registry.set(
            'replicators',
            replicators
        );

        console.log(
            `⚙️ 복제기 ${slotIndex + 1}번에 [${item}] 투입`
        );

        this.syncUI();

        this.notifyInventoryChanged();

        return true;
    }

    // =========================================================
    // 복제기 재료 제거
    // =========================================================

    remove(slotIndex) {
        const replicators =
            this.replicators;

        const inventory =
            this.inventory;

        const currentItem =
            replicators[
                slotIndex
            ].item;

        if (!currentItem) {
            return false;
        }

        // =============================================
        // 투입했던 재료 반환
        // =============================================

        inventory[
            currentItem
        ] =
            (
                inventory[
                    currentItem
                ] || 0
            ) + 1;

        replicators[
            slotIndex
        ] = {
            item: null,
            lastTick: 0
        };

        this.scene.registry.set(
            'wordInventory',
            inventory
        );

        this.scene.registry.set(
            'replicators',
            replicators
        );

        console.log(
            `⚙️ 복제기 ${slotIndex + 1}번에서 [${currentItem}] 제거`
        );

        this.updateProgressBar(
            slotIndex,
            0
        );

        this.syncUI();

        this.notifyInventoryChanged();

        return true;
    }

    // =========================================================
    // 자동으로 빈 복제기 찾기
    //
    // 재료 더블클릭 등에 사용
    // =========================================================

    insertIntoAvailableSlot(item) {
        const replicators =
            this.replicators;

        const upgrades =
            this.upgrades;

        // 1번 슬롯
        if (
            !replicators[0].item
        ) {
            return this.insert(
                item,
                0
            );
        }

        // 2번 슬롯
        if (
            upgrades.slot2 &&
            !replicators[1].item
        ) {
            return this.insert(
                item,
                1
            );
        }

        return false;
    }

    // =========================================================
    // UI 동기화
    // =========================================================

    syncUI() {
        // createFutureAlchemyUI 등으로 DOM이 다시 생성됐다면
        // 참조를 새로 잡는다.
        this.cacheDomElements();

        const replicators =
            this.replicators;

        const upgrades =
            this.upgrades;

        for (
            let i = 0;
            i < 2;
            i++
        ) {
            const dropZone =
                this.dropZones[i];

            const removeButton =
                this.removeButtons[i];

            if (!dropZone) {
                continue;
            }

            // =========================================
            // 2번 슬롯 잠김
            // =========================================

            if (
                i === 1 &&
                !upgrades.slot2
            ) {
                dropZone.className =
                    'replicator-tube locked';

                dropZone.innerHTML = `
                    <span>
                        LOCKED<br>
                        진화 필요
                    </span>
                `;

                if (removeButton) {
                    removeButton.classList.add(
                        'hidden'
                    );
                }

                this.updateProgressBar(
                    i,
                    0
                );

                continue;
            }

            // =========================================
            // 재료 들어 있음
            // =========================================

            if (
                replicators[i].item
            ) {
                dropZone.className =
                    'replicator-tube active';

                dropZone.innerHTML = `
                    <span>
                        ${replicators[i].item}
                    </span>
                `;

                if (removeButton) {
                    removeButton.classList.remove(
                        'hidden'
                    );
                }
            }

            // =========================================
            // 빈 슬롯
            // =========================================

            else {
                dropZone.className =
                    'replicator-tube empty';

                dropZone.innerHTML = `
                    <span>
                        ${i + 1}번 슬롯<br>
                        DROP
                    </span>
                `;

                if (removeButton) {
                    removeButton.classList.add(
                        'hidden'
                    );
                }

                this.updateProgressBar(
                    i,
                    0
                );
            }
        }

        // DOM을 다시 만들었을 가능성이 있으므로
        // 이벤트도 다시 연결
        this.bound = false;
        this.bindEvents();
    }

    updateProgressBar(
        slotIndex,
        progress
    ) {
        // DOM이 바뀌었을 수도 있으므로
        // 필요할 때 다시 찾음
        let bar =
            this.progressBars[
                slotIndex
            ];

        if (!bar) {
            bar =
                document.getElementById(
                    `rep-bar-${slotIndex}`
                );

            this.progressBars[
                slotIndex
            ] = bar;
        }

        if (!bar) {
            return;
        }

        bar.style.width =
            `${PhaserClamp(progress, 0, 100)}%`;
    }

    notifyInventoryChanged() {
        if (
            typeof this
                .onInventoryChanged ===
            'function'
        ) {
            this.onInventoryChanged();
        }
    }

    // =========================================================
    // 종료
    // =========================================================

    destroy() {
        for (
            let i = 0;
            i < 2;
            i++
        ) {
            const dropZone =
                this.dropZones[i];

            const removeButton =
                this.removeButtons[i];

            if (dropZone) {
                dropZone.ondragover =
                    null;

                dropZone.ondragleave =
                    null;

                dropZone.ondrop =
                    null;
            }

            if (removeButton) {
                removeButton.onclick =
                    null;
            }
        }

        this.dropZones = [];
        this.removeButtons = [];
        this.progressBars = [];

        this.bound = false;
    }
}

// =============================================================
// Phaser.Math.Clamp를 직접 import할 필요 없이
// 작은 utility로 처리
// =============================================================

function PhaserClamp(
    value,
    min,
    max
) {
    return Math.max(
        min,
        Math.min(
            max,
            value
        )
    );
}