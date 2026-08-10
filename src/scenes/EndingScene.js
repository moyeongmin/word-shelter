import Phaser from 'phaser';

export default class EndingScene extends Phaser.Scene {
    constructor() {
        super('EndingScene');
    }

    init() {
        this.generatedHouse = this.registry.get('generatedHouse');

        console.log('🏠 EndingScene generatedHouse:', this.generatedHouse);

        if (this.generatedHouse) {
            this.endingWords = this.generatedHouse.material_names || [];
            this.endingNumber = this.generatedHouse.ending_number ?? null;
            this.endingTitle = this.endingNumber !== null ? `ENDING #${this.endingNumber}` : '나만의 보금자리';
            this.endingDescription = this.generatedHouse.story || '당신이 모은 재료들로 하나뿐인 보금자리가 완성되었습니다.';
            this.houseImageUrl = this.normalizeImageUrl(this.generatedHouse.image_url);
        } else {
            console.warn('⚠️ generatedHouse가 없습니다.');

            this.endingWords = [];
            this.endingNumber = null;
            this.endingTitle = '나만의 보금자리';
            this.endingDescription = '당신이 모은 재료들로 하나뿐인 보금자리가 완성되었습니다.';
            this.houseImageUrl = null;
        }
    }

normalizeImageUrl(url) {
    if (!url) return null;
    // 혹시 "[https://...](https://...)" 형태로 들어오는 경우 대응
    const markdownMatch = url.match(/\((https?:\/\/[^)]+)\)/);
    if (markdownMatch) return markdownMatch[1];
    return url;
}
    
    preload() {
        if (!this.houseImageUrl) return;

        if (!this.textures.exists('generated-house-image')) {
            console.log('🖼️ 생성 집 이미지 로드:', this.houseImageUrl);
            this.load.image('generated-house-image', this.houseImageUrl);
        }
    }
    create() {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor('#080c10');

        console.log('🔥 EndingScene create 실행됨');
        console.log(
            '현재 활성 Scene:',
            this.scene.manager
                .getScenes(true)
                .map(scene => scene.scene.key)
        );

        const startScreen =
            document.getElementById('start-screen');

        const hudContainer =
            document.getElementById('hud-container');

        const uiContainer =
            document.getElementById('ui-container');

        if (startScreen) {
            startScreen.classList.add('hidden');
        }

        if (hudContainer) {
            hudContainer.classList.add('hidden');
        }

        // 연출 전체 컨테이너
        this.introContainer =
            this.add.container(0, 0);

        // ==========================================
        // AI 장치 임시 그래픽
        // ==========================================

        this.createTemporaryAI(
            width,
            height
        );

        // ==========================================
        // AI 대사
        // ==========================================

        this.aiText =
            this.add.text(
                width / 2,
                height / 2 + 90,
                '',
                {
                    fontSize: '22px',
                    color: '#ffffff',
                    align: 'center',
                    lineSpacing: 8,
                    wordWrap: {
                        width: width * 0.75
                    }
                }
            )
                .setOrigin(0.5)
                .setAlpha(0);

        // ==========================================
        // 재료 표시 영역
        // ==========================================

        this.materialContainer =
            this.add.container(
                width / 2,
                height / 2 + 170
            );

        this.startEndingSequence();
    }

    // ==============================================
    // 임시 AI 장치 (이미지 확정나면 이미지로 교체)
    // ==============================================

    createTemporaryAI(width, height) {
        const x =
            width / 2;

        const y =
            height / 2 - 80;

        this.aiContainer =
            this.add.container(
                x,
                y
            );

        // 장치 본체
        const body =
            this.add.rectangle(
                0,
                0,
                180,
                120,
                0x18252b
            );

        body.setStrokeStyle(
            4,
            0x4db6ac
        );

        // 화면
        const screen =
            this.add.rectangle(
                0,
                -5,
                120,
                65,
                0x071c1d
            );

        screen.setStrokeStyle(
            2,
            0x64ffda
        );

        // AI 눈
        const leftEye =
            this.add.rectangle(
                -25,
                -5,
                12,
                8,
                0x64ffda
            );

        const rightEye =
            this.add.rectangle(
                25,
                -5,
                12,
                8,
                0x64ffda
            );

        // 입
        const mouth =
            this.add.rectangle(
                0,
                17,
                35,
                4,
                0x64ffda
            );

        // 안테나
        const antennaLine =
            this.add.rectangle(
                0,
                -75,
                4,
                30,
                0x78909c
            );

        const antenna =
            this.add.circle(
                0,
                -94,
                7,
                0x64ffda
            );

        // 다리
        const leftLeg =
            this.add.rectangle(
                -45,
                70,
                15,
                30,
                0x455a64
            );

        const rightLeg =
            this.add.rectangle(
                45,
                70,
                15,
                30,
                0x455a64
            );

        this.aiContainer.add([
            leftLeg,
            rightLeg,
            antennaLine,
            antenna,
            body,
            screen,
            leftEye,
            rightEye,
            mouth
        ]);

        this.aiContainer
            .setAlpha(0);

        // 안테나 점멸
        this.tweens.add({
            targets: antenna,
            alpha: 0.3,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    // ==============================================
    // 엔딩 연출 시작
    // ==============================================

    startEndingSequence() {
        this.tweens.add({
            targets: this.aiContainer,
            alpha: 1,
            duration: 1000,
            ease: 'Sine.easeOut',

            onComplete: () => {
                this.showMessage(
                    '...재료 수집이 끝난 모양이네.',
                    1800,
                    () => {
                        this.showMessage(
                            '어디 보자.\n네가 가져온 것들을 확인해 볼까?',
                            1800,
                            () => {
                                this.showMaterials();
                            }
                        );
                    }
                );
            }
        });
    }

    // ==============================================
    // AI 메시지 출력
    // ==============================================

    showMessage(
        message,
        duration,
        callback
    ) {
        this.aiText
            .setText(message);

        this.tweens.add({
            targets: this.aiText,
            alpha: 1,
            duration: 300
        });

        this.time.delayedCall(
            duration,
            () => {
                if (callback) {
                    callback();
                }
            }
        );
    }

    // ==============================================
    // 10개 단어 표시
    // ==============================================

    showMaterials() {
        this.aiText.setText(
            '이번 집에 사용할 재료는...'
        );

        const words =
            this.endingWords.slice(
                0,
                10
            );

        const spacingX = 125;
        const spacingY = 55;

        words.forEach(
            (word, index) => {
                const row =
                    Math.floor(
                        index / 5
                    );

                const column =
                    index % 5;

                const x =
                    (column - 2) *
                    spacingX;

                const y =
                    row *
                    spacingY;

                // 단어 배경
                const background =
                    this.add.rectangle(
                        x,
                        y,
                        105,
                        38,
                        0x1c2b32
                    );

                background
                    .setStrokeStyle(
                        1,
                        0x607d8b
                    )
                    .setAlpha(0)
                    .setScale(0.5);

                const text =
                    this.add.text(
                        x,
                        y,
                        word,
                        {
                            fontSize: '17px',
                            color: '#ffffff'
                        }
                    )
                        .setOrigin(0.5)
                        .setAlpha(0)
                        .setScale(0.5);

                this.materialContainer.add([
                    background,
                    text
                ]);

                // 하나씩 등장
                this.time.delayedCall(
                    index * 130,
                    () => {
                        this.tweens.add({
                            targets: [
                                background,
                                text
                            ],

                            alpha: 1,
                            scaleX: 1,
                            scaleY: 1,

                            duration: 300,
                            ease: 'Back.easeOut'
                        });
                    }
                );
            }
        );

        this.time.delayedCall(
            words.length *
                130 +
                1500,

            () => {
                this.startHouseGeneration();
            }
        );
    }

    // ==============================================
    // 집 생성 연출
    // ==============================================

    startHouseGeneration() {
        this.aiText.setText(
            '음.. 이런 재료로 집을 지어 달라고?\n' +
            '이상한 녀석이냥...'
        );

        this.time.delayedCall(
            1700,
            () => {
                this.aiText.setText(
                    '......뭐, 상관없겠지.'
                );
            }
        );

        this.time.delayedCall(
            3000,
            () => {
                this.aiText.setText(
                    '좋아.\n' +
                    '네가 가져온 것들로 집을 만들어 줄게.'
                );
            }
        );

        this.time.delayedCall(
            4800,
            () => {
                this.tweens.add({
                    targets:
                        this.materialContainer,

                    alpha: 0,
                    duration: 500
                });

                this.showGenerating();
            }
        );
    }

    // ==============================================
    // 생성 중 화면
    // ==============================================

    showGenerating() {
        let dotCount = 0;

        this.aiText.setText(
            'Ai가 집을 짓는 중입니다'
        );

        // AI 기계 진동
        this.aiPulseTween =
            this.tweens.add({
                targets:
                    this.aiContainer,

                scaleX: 1.04,
                scaleY: 1.04,

                duration: 500,

                yoyo: true,
                repeat: -1,

                ease:
                    'Sine.easeInOut'
            });

        this.loadingEvent =
            this.time.addEvent({
                delay: 400,

                callback: () => {
                    dotCount =
                        (dotCount + 1) %
                        4;

                    this.aiText.setText(
                        '보금자리를 만드는 중입니다' +
                        '.'.repeat(
                            dotCount
                        )
                    );
                },

                loop: true
            });

        // TODO:
        // 추후 AI 이미지 생성 완료 이벤트로 교체
        //
        // 현재는 테스트를 위해 4초
        this.time.delayedCall(
            4000,
            () => {
                this.loadingEvent
                    .remove();

                this.aiPulseTween
                    .stop();

                this.revealEnding();
            }
        );
    }

    // ==============================================
    // 화면 전환
    // ==============================================

    revealEnding() {
        const {
            width,
            height
        } = this.scale;

        const black =
            this.add.rectangle(
                0,
                0,
                width,
                height,
                0x000000
            )
                .setOrigin(0)
                .setAlpha(0)
                .setDepth(100);

        this.tweens.add({
            targets: black,

            alpha: 1,

            duration: 1000,

            onComplete: () => {
                this.aiContainer
                    .setVisible(false);

                this.aiText
                    .setVisible(false);

                this.materialContainer
                    .setVisible(false);

                this.createEndingScreen();

                this.tweens.add({
                    targets: black,

                    alpha: 0,

                    duration: 1300,

                    onComplete: () => {
                        black.destroy();
                    }
                });
            }
        });
    }

    // ==============================================
    // 최종 엔딩 화면
    // ==============================================

    // ==============================================
// 최종 엔딩 화면
// ==============================================

createEndingScreen() {
    const {
        width,
        height
    } = this.scale;

    // ==========================================
    // 배경
    // ==========================================

    this.add.rectangle(
        0,
        0,
        width,
        height,
        0x101820
    ).setOrigin(0);

    // ==========================================
    // 전체 레이아웃
    //
    // LEFT  : 집 이미지
    // RIGHT : 제목 + 스크롤 설명 박스
    // ==========================================

    const horizontalPadding =
        Math.max(
            36,
            width * 0.055
        );

    const contentTop =
        Math.max(
            50,
            height * 0.11
        );

    const contentBottom =
        height - 105;

    const contentHeight =
        contentBottom -
        contentTop;

    const imageAreaWidth =
        width * 0.40;

    const columnGap = 40;

    const textAreaWidth =
        Math.max(
            260,
            width -
                horizontalPadding * 2 -
                imageAreaWidth -
                columnGap
        );

    const imageX =
        horizontalPadding +
        imageAreaWidth / 2;

    const textX =
        horizontalPadding +
        imageAreaWidth +
        columnGap;

    const contentCenterY =
        contentTop +
        contentHeight / 2;

    // ==========================================
    // 왼쪽 - 집 이미지
    // ==========================================

    let houseDisplay;
    let houseTargetScale = 1;

    if (this.houseImageUrl && this.textures.exists('generated-house-image')) {
        houseDisplay = this.add.image(imageX, contentCenterY, 'generated-house-image');

        const maxImageWidth = imageAreaWidth;
        const maxImageHeight = contentHeight;

        houseTargetScale = Math.min(
            maxImageWidth / houseDisplay.width,
            maxImageHeight / houseDisplay.height
        );

        houseDisplay.setScale(houseTargetScale * 0.9);
        houseDisplay.setAlpha(0);

        console.log('✅ 실제 생성 집 이미지 표시');
    } else {
        console.warn('⚠️ 실제 이미지가 없어 임시 집을 사용합니다.');

        houseDisplay = this.createTemporaryHouse(
            imageX,
            contentCenterY
        );

        houseTargetScale = Phaser.Math.Clamp(
            Math.min(
                imageAreaWidth / 430,
                contentHeight / 380
            ),
            0.58,
            1
        );

        houseDisplay.setScale(houseTargetScale * 0.9);
        houseDisplay.setAlpha(0);
    }

    // ==========================================
    // 오른쪽 - 제목
    // ==========================================

    const titleFontSize = Phaser.Math.Clamp( Math.floor( width * 0.042 ), 30, 44 );

    const title =
        this.add.text(
            textX,
            contentTop,
            this.endingTitle,
            {
                fontSize:
                    `${titleFontSize}px`,

                color:
                    '#ffffff',

                fontStyle:
                    'bold',

                align:
                    'left',

                lineSpacing: 4,

                wordWrap: {
                    width:
                        textAreaWidth,

                    useAdvancedWrap:
                        true
                }
            }
        )
            .setOrigin(0, 0)
            .setAlpha(0);

    // ==========================================
    // 제목 밑 구분선
    // ==========================================

    const dividerY =
        contentTop +
        title.height +
        16;

    const divider =
        this.add.rectangle(
            textX,
            dividerY,
            textAreaWidth,
            2,
            0x607d8b
        )
            .setOrigin(
                0,
                0.5
            )
            .setAlpha(0);

    // ==========================================
    // 설명 스크롤 박스
    // ==========================================

    const scrollBoxY =
        dividerY + 20;

    const scrollBoxHeight =
        Math.max(
            150,
            contentBottom -
            scrollBoxY
        );

    // 스크롤 박스 배경
    const scrollBackground =
        this.add.rectangle(
            textX,
            scrollBoxY,
            textAreaWidth,
            scrollBoxHeight,
            0x0b1218,
            0.72
        )
            .setOrigin(0, 0)
            .setStrokeStyle(
                1,
                0x37474f
            )
            .setAlpha(0);

    // ==========================================
    // 실제 텍스트 영역
    // ==========================================

    const innerPadding = 18;

    const descriptionFontSize = Phaser.Math.Clamp( Math.floor( width * 0.019 ), 17, 21 );

    const description = this.add.text( textX + innerPadding, scrollBoxY + innerPadding, this.endingDescription,
            {
                fontSize: `${descriptionFontSize}px`,
                color: '#d5d5d5',
                align: 'left',
                lineSpacing: 11,
                wordWrap: {
                    width: textAreaWidth - innerPadding * 2 - 12,
                    useAdvancedWrap: true
                }
            }
        )
            .setOrigin(0, 0)
            .setAlpha(0);

    // ==========================================
    // Mask 생성
    //
    // 이 영역 밖의 텍스트는 보이지 않게 함
    // ==========================================

    const maskShape =
        this.make.graphics({
            x: 0,
            y: 0,
            add: false
        });

    maskShape.fillStyle(
        0xffffff
    );

    maskShape.fillRect(
        textX + innerPadding,
        scrollBoxY + innerPadding,
        textAreaWidth -
            innerPadding * 2 -
            12,
        scrollBoxHeight -
            innerPadding * 2
    );

    const descriptionMask =
        maskShape.createGeometryMask();

    description.setMask(
        descriptionMask
    );

    // ==========================================
    // 스크롤 계산
    // ==========================================

    const textStartY =
        scrollBoxY +
        innerPadding;

    const visibleTextHeight =
        scrollBoxHeight -
        innerPadding * 2;

    const maxScroll =
        Math.max(
            0,
            description.height -
            visibleTextHeight
        );

    let scrollOffset = 0;

    // ==========================================
    // 우측 스크롤바
    // ==========================================

    const scrollBarX =
        textX +
        textAreaWidth -
        8;

    const scrollTrackHeight =
        scrollBoxHeight -
        20;

    const scrollTrack =
        this.add.rectangle(
            scrollBarX,
            scrollBoxY + 10,
            4,
            scrollTrackHeight,
            0x263238,
            0.9
        )
            .setOrigin(
                0.5,
                0
            )
            .setAlpha(0);

    let scrollThumb = null;

    // 실제 스크롤이 필요한 경우만 Thumb 생성
    if (maxScroll > 0) {
        const visibleRatio =
            visibleTextHeight /
            description.height;

        const thumbHeight =
            Math.max(
                30,
                scrollTrackHeight *
                visibleRatio
            );

        scrollThumb =
            this.add.rectangle(
                scrollBarX,
                scrollBoxY + 10,
                4,
                thumbHeight,
                0x90a4ae,
                1
            )
                .setOrigin(
                    0.5,
                    0
                )
                .setAlpha(0);
    }

    // ==========================================
    // 스크롤 박스 입력 Zone
    // ==========================================

    const scrollZone =
        this.add.zone(
            textX,
            scrollBoxY,
            textAreaWidth,
            scrollBoxHeight
        )
            .setOrigin(0)
            .setInteractive({
                useHandCursor: false
            });

    // ==========================================
    // 스크롤 적용 함수
    // ==========================================

    const updateScroll =
        () => {
            description.y =
                textStartY -
                scrollOffset;

            if (
                scrollThumb &&
                maxScroll > 0
            ) {
                const scrollRatio =
                    scrollOffset /
                    maxScroll;

                const maxThumbMove =
                    scrollTrackHeight -
                    scrollThumb.height;

                scrollThumb.y =
                    scrollBoxY +
                    10 +
                    maxThumbMove *
                    scrollRatio;
            }
        };

    // ==========================================
    // 마우스 휠 스크롤
    // ==========================================

    scrollZone.on(
        'wheel',
        (
            pointer,
            deltaX,
            deltaY
        ) => {
            if (maxScroll <= 0) {
                return;
            }

            scrollOffset =
                Phaser.Math.Clamp(
                    scrollOffset +
                    deltaY * 0.45,
                    0,
                    maxScroll
                );

            updateScroll();
        }
    );

    // ==========================================
    // 드래그 스크롤도 지원
    // ==========================================

    let isDragging = false;
    let lastPointerY = 0;

    scrollZone.on(
        'pointerdown',
        pointer => {
            isDragging = true;

            lastPointerY =
                pointer.y;
        }
    );

    this.input.on(
        'pointerup',
        () => {
            isDragging = false;
        }
    );

    this.input.on(
        'pointermove',
        pointer => {
            if (
                !isDragging ||
                maxScroll <= 0
            ) {
                return;
            }

            const delta =
                lastPointerY -
                pointer.y;

            lastPointerY =
                pointer.y;

            scrollOffset =
                Phaser.Math.Clamp(
                    scrollOffset +
                    delta,
                    0,
                    maxScroll
                );

            updateScroll();
        }
    );

    // ==========================================
    // 스크롤 안내
    // ==========================================

    let scrollGuide = null;

    if (maxScroll > 0) {
        scrollGuide =
            this.add.text(
                textX +
                    textAreaWidth -
                    16,

                scrollBoxY +
                    scrollBoxHeight -
                    10,

                '↕ 스크롤',

                {
                    fontSize:
                        '11px',

                    color:
                        '#78909c'
                }
            )
                .setOrigin(
                    1,
                    1
                )
                .setAlpha(0);
    }

    // ==========================================
    // 등장 연출
    // ==========================================

    const targetScaleX = houseDisplay.scaleX;
    const targetScaleY = houseDisplay.scaleY;

    houseDisplay.setScale(
        targetScaleX * 0.9,
        targetScaleY * 0.9
    );

    this.tweens.add({
        targets: houseDisplay,
        alpha: 1,
        scaleX: houseTargetScale,
        scaleY: houseTargetScale,
        duration: 1200,
        ease: 'Sine.easeOut'
    });
    this.time.delayedCall(
        400,
        () => {
            this.tweens.add({
                targets: [
                    title,
                    divider
                ],

                alpha: 1,

                duration:
                    700
            });
        }
    );

    this.time.delayedCall(
        900,
        () => {
            const fadeTargets = [
                scrollBackground,
                description,
                scrollTrack
            ];

            if (scrollThumb) {
                fadeTargets.push(
                    scrollThumb
                );
            }

            if (scrollGuide) {
                fadeTargets.push(
                    scrollGuide
                );
            }

            this.tweens.add({
                targets:
                    fadeTargets,

                alpha: 1,

                duration:
                    800,

                onComplete: () => {
                    this.createEndingButtons();
                }
            });
        }
    );
}

    // ==============================================
    // 임시 엔딩 집
    //
    // 나중에는 이 함수 전체를 제거하고
    // AI 생성 이미지를 add.image() 하면 됨
    // ==============================================

    createTemporaryHouse(x, y) {
        const container =
            this.add.container(
                x,
                y
            );

        // 뒤쪽 빛
        const glow =
            this.add.circle(
                0,
                0,
                170,
                0xffd180,
                0.06
            );

        // 집 벽
        const wall =
            this.add.rectangle(
                0,
                35,
                270,
                160,
                0x795548
            );

        wall.setStrokeStyle(
            4,
            0x4e342e
        );

        // 지붕
        const roof =
            this.add.triangle(
                0,
                -80,

                -165,
                80,

                0,
                -50,

                165,
                80,

                0x37474f
            );

        roof.setStrokeStyle(
            4,
            0x263238
        );

        // 문
        const door =
            this.add.rectangle(
                0,
                70,
                55,
                90,
                0x4e342e
            );

        // 문 손잡이
        const knob =
            this.add.circle(
                18,
                70,
                4,
                0xffd54f
            );

        // 왼쪽 창문
        const leftWindow =
            this.add.rectangle(
                -80,
                30,
                50,
                45,
                0xffcc80
            );

        leftWindow.setStrokeStyle(
            5,
            0x3e2723
        );

        // 오른쪽 창문
        const rightWindow =
            this.add.rectangle(
                80,
                30,
                50,
                45,
                0xffcc80
            );

        rightWindow.setStrokeStyle(
            5,
            0x3e2723
        );

        // 굴뚝
        const chimney =
            this.add.rectangle(
                90,
                -90,
                32,
                80,
                0x616161
            );

        // 이상한 금 장식
        const goldDecoration =
            this.add.circle(
                0,
                -15,
                15,
                0xffd700
            );

        // 강아지 집
        const dogHouse =
            this.add.rectangle(
                175,
                90,
                65,
                50,
                0x8d6e63
            );

        const dogRoof =
            this.add.triangle(
                175,
                48,

                -45,
                30,

                0,
                -20,

                45,
                30,

                0x5d4037
            );

        // 강아지 얼굴 임시
        const dogFace =
            this.add.circle(
                175,
                88,
                14,
                0xd7a86e
            );

        const dogEye1 =
            this.add.circle(
                170,
                85,
                2,
                0x000000
            );

        const dogEye2 =
            this.add.circle(
                180,
                85,
                2,
                0x000000
            );

        container.add([
            glow,
            chimney,
            wall,
            roof,

            leftWindow,
            rightWindow,

            door,
            knob,

            goldDecoration,

            dogHouse,
            dogRoof,
            dogFace,
            dogEye1,
            dogEye2
        ]);

        return container;
    }

    // ==============================================
    // 엔딩 버튼
    // ==============================================

    createEndingButtons() {
        const { width, height } = this.scale;

        const buttonY = height - 42;
        const buttonGap = Math.min(110, width * 0.12);

        const galleryButton = this.createButton(
            width / 2 - buttonGap,
            buttonY,
            '갤러리 보기',
            () => {
                this.goToGallery();
            }
        );

        const menuButton = this.createButton(
            width / 2 + buttonGap,
            buttonY,
            '메인 메뉴',
            () => {
                this.returnToMainMenu();
            }
        );

        galleryButton.setAlpha(0);
        menuButton.setAlpha(0);

        this.tweens.add({
            targets: [
                galleryButton,
                menuButton
            ],
            alpha: 1,
            duration: 500
        });
    }

    // ==============================================
    // 버튼 생성
    // ==============================================

    createButton(
        x,
        y,
        label,
        callback
    ) {
        const container =
            this.add.container(
                x,
                y
            );

        const background =
            this.add.rectangle(
                0,
                0,
                170,
                44,
                0x263238
            );

        background
            .setStrokeStyle(
                2,
                0x90a4ae
            )
            .setInteractive({
                useHandCursor: true
            });

        const text =
            this.add.text(
                0,
                0,
                label,
                {
                    fontSize: '17px',
                    color: '#ffffff'
                }
            )
                .setOrigin(0.5);

        container.add([
            background,
            text
        ]);

        background.on(
            'pointerover',
            () => {
                background.setFillStyle(
                    0x455a64
                );

                container.setScale(
                    1.05
                );
            }
        );

        background.on(
            'pointerout',
            () => {
                background.setFillStyle(
                    0x263238
                );

                container.setScale(
                    1
                );
            }
        );

        background.on(
            'pointerdown',
            callback
        );

        return container;
    }

    // ==============================================
    // 공유
    // ==============================================

    async shareEnding() {
        const words =
            this.endingWords.join(
                ', '
            );

        const shareText =
            `${this.endingTitle}\n\n` +
            `사용한 재료: ${words}\n\n` +
            '나만의 보금자리를 완성했습니다.';

        if (navigator.share) {
            try {
                await navigator.share({
                    title:
                        this.endingTitle,

                    text:
                        shareText
                });
            } catch (error) {
                console.log(
                    '공유 취소',
                    error
                );
            }

            return;
        }

        try {
            await navigator
                .clipboard
                .writeText(
                    shareText
                );

            this.showToast(
                '엔딩 내용이 복사되었습니다.'
            );
        } catch (error) {
            console.error(
                '복사 실패',
                error
            );
        }
    }

    // ==============================================
    // 메인 메뉴
    // ==============================================

    returnToMainMenu() {
        // TODO:
        // 실제 프로젝트의 메인 메뉴 Scene Key로 변경
        this.scene.start(
            'MainMenuScene'
        );
    }

    // ==============================================
    // Toast
    // ==============================================

    showToast(message) {
        const {
            width,
            height
        } = this.scale;

        const toast =
            this.add.text(
                width / 2,

                height - 110,

                message,

                {
                    fontSize: '15px',

                    color: '#ffffff',

                    backgroundColor: '#000000',

                    padding: { x: 12, y: 7 }
                }
            )
                .setOrigin(0.5)
                .setDepth(1000);
        this.tweens.add({
            targets: toast,
            alpha: 0,
            y: toast.y - 20,
            delay: 1200,
            duration: 500,
            onComplete: () => {
                toast.destroy();
            }
        });
    }
    goToGallery() {
        this.scene.start('GalleryScene');
    }
}