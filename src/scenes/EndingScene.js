import Phaser from 'phaser';

export default class EndingScene extends Phaser.Scene {
    constructor() {
        super('EndingScene');
    }

    init() {
        // ==========================================
        // TODO: 추후 정적 영역에서 가져오기
        // ==========================================

        this.endingWords = [
            '나무',
            '돌',
            '철',
            '모래',
            '바람',
            '불',
            '물',
            '금',
            '강아지',
            '침대'
        ];

        // TODO: 추후 AI 응답값으로 교체
        this.endingTitle = '이상하지만 따뜻한 보금자리';

        this.endingDescription =
        '가진 것 하나 없이 숲에 도착했던 당신은, 주변에서 하나둘 주워 모은 재료들을 바라보며 결국 이곳에 자신만의 보금자리를 만들기로 결심했습니다.\n\n' +

        '처음에는 제대로 된 집이 만들어질 거라고 생각하지 못했습니다. 나무는 제각각의 모양이었고, 돌은 너무 무거웠으며, 철은 어디에 써야 할지도 알 수 없었습니다. 손에 들어온 모래와 바람, 불과 물은 집을 짓는 재료라고 부르기조차 조금 애매해 보였습니다.\n\n' +

        '그래도 당신은 가진 것들을 하나씩 사용하기 시작했습니다. 나무와 돌을 쌓아 벽을 만들고, 철을 구부려 어떻게든 구조를 지탱했습니다. 틈 사이에는 모래를 채워 넣었고, 불을 피울 작은 공간도 만들었습니다.\n\n' +

        '어디선가 발견한 금은 꼭 필요한 재료는 아니었지만, 집의 한가운데 가장 눈에 잘 띄는 곳에 장식으로 붙여 두었습니다. 살아남는 데 아무런 도움도 되지 않는 장식이었지만, 이상하게도 그것 하나만으로 이곳이 단순한 피난처가 아니라 당신의 공간처럼 느껴졌습니다.\n\n' +

        '그리고 가장 큰 문제는 강아지였습니다.\n\n' +

        '강아지는 건축 재료가 아니었습니다. 당연한 이야기였습니다. 하지만 지금까지 모은 것들을 전부 사용해 보금자리를 만들어 달라고 했으니, 결국 집 한쪽에는 강아지가 편하게 누울 수 있는 작은 공간까지 만들어졌습니다.\n\n' +

        '침대 역시 멀쩡한 상태는 아니었지만 벽 안쪽에 밀어 넣었습니다. 이제 적어도 차가운 바닥 위에서 몸을 웅크리고 잠들 필요는 없을 것 같습니다.\n\n' +

        '완성된 집은 어디에서나 볼 수 있는 평범한 집과는 꽤 달랐습니다. 지붕은 조금 기울어져 있었고, 벽의 높이도 일정하지 않았습니다. 철 조각이 뜬금없는 곳에서 튀어나와 있었고, 금 장식은 필요 이상으로 반짝였습니다.\n\n' +

        '누군가 이 모습을 본다면 제대로 지어진 집이라고 부르지 않을지도 모릅니다.\n\n' +

        '하지만 세상이 이렇게 되어 버린 뒤 처음으로, 당신에게는 돌아올 장소가 생겼습니다.\n\n' +

        '비가 내리면 피할 수 있고, 밤이 되면 불을 밝힐 수 있으며, 강아지와 함께 누워 잠들 수 있는 작은 공간입니다.\n\n' +

        '완벽하지는 않습니다.\n' +
        '멋있지도 않습니다.\n' +
        '그리고 아마 오래 버티지도 못할 겁니다.\n\n' +

        '그래도 적어도 오늘 밤만큼은 길에서 잠들지 않아도 됩니다.\n\n' +

        '당신이 모은 수많은 단어와 재료들은 그렇게 하나의 이상하고도 따뜻한 보금자리가 되었습니다.';
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
            '나무, 돌, 철, 모래...\n' +
            '그리고 강아지까지?'
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

    const houseContainer =
        this.createTemporaryHouse(
            imageX,
            contentCenterY
        );

    const houseScale =
        Phaser.Math.Clamp(
            Math.min(
                imageAreaWidth / 430,
                contentHeight / 380
            ),
            0.58,
            1
        );

    houseContainer
        .setAlpha(0)
        .setScale(
            houseScale * 0.85
        );

    // ==========================================
    // 오른쪽 - 제목
    // ==========================================

    const titleFontSize =
        Phaser.Math.Clamp(
            Math.floor(
                width * 0.032
            ),
            23,
            34
        );

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

    const descriptionFontSize =
        Phaser.Math.Clamp(
            Math.floor(
                width * 0.015
            ),
            14,
            17
        );

    const description =
        this.add.text(
            textX + innerPadding,
            scrollBoxY + innerPadding,
            this.endingDescription,
            {
                fontSize:
                    `${descriptionFontSize}px`,

                color:
                    '#d5d5d5',

                align:
                    'left',

                lineSpacing: 8,

                wordWrap: {
                    width:
                        textAreaWidth -
                        innerPadding * 2 -
                        12,

                    useAdvancedWrap:
                        true
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

    this.tweens.add({
        targets:
            houseContainer,

        alpha: 1,

        scaleX:
            houseScale,

        scaleY:
            houseScale,

        duration:
            1200,

        ease:
            'Sine.easeOut'
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
        const {
            width,
            height
        } = this.scale;

        // 화면 아래쪽에 충분한 여백을 두고 배치
        const buttonY =
            height - 42;

        const buttonGap =
            Math.min(
                110,
                width * 0.12
            );

        const shareButton =
            this.createButton(
                width / 2 -
                    buttonGap,

                buttonY,

                '공유하기',

                () => {
                    this.shareEnding();
                }
            );

        const menuButton =
            this.createButton(
                width / 2 +
                    buttonGap,

                buttonY,

                '메인 메뉴',

                () => {
                    this.returnToMainMenu();
                }
            );

        shareButton
            .setAlpha(0);

        menuButton
            .setAlpha(0);

        this.tweens.add({
            targets: [
                shareButton,
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
                    fontSize:
                        '15px',

                    color:
                        '#ffffff',

                    backgroundColor:
                        '#000000',

                    padding: {
                        x: 12,
                        y: 7
                    }
                }
            )
                .setOrigin(0.5)
                .setDepth(1000);

        this.tweens.add({
            targets: toast,

            alpha: 0,

            y:
                toast.y -
                20,

            delay: 1200,

            duration: 500,

            onComplete: () => {
                toast.destroy();
            }
        });
    }
}