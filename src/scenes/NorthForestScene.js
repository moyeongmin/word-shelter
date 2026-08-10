import Phaser from 'phaser';

import mapBg from '/assets/images/forest_map.png';
import woodImg from '/assets/images/wood.png';
import sandImg from '/assets/images/sand.png';
import windImg from '/assets/images/wind.png';

import { preloadPlayerAssets, createPlayerAnims, updatePlayerMovement } from '../features/player/playerUtils';
import { preloadSounds, playBGM } from '../features/sound/soundUtils';
import { playSFX } from '../features/sound/soundUtils';

export default class NorthForestScene extends Phaser.Scene {
    constructor() {
        // 중요: BaseCampScene에서 이 이름으로 찾아감
        super('NorthForestScene');

        this.spawnFrom = 'BaseCamp';
    }

    init(data) {
        if (data && data.spawnFrom) {
            this.spawnFrom = data.spawnFrom;
        }

        // ==========================================
        // 전역 게임 데이터
        // ==========================================
        this.wordInventory =
            this.registry.get('wordInventory') || {};

        this.discoveredWords =
            this.registry.get('discoveredWords') || [];

        this.discoveredRecipes =
            this.registry.get('discoveredRecipes') || {};

        this.replicators =
            this.registry.get('replicators') || [];

        this.upgrades =
            this.registry.get('upgrades') || {
                speed: 0,
                time: 0,
                yield: 0,
                slot2: false
            };
    }

    preload() {
        // 다른 Scene과 texture key 충돌하지 않도록
        // NorthForest 전용 key 사용
        this.load.image(
            'bg_north_forest',
            mapBg
        );

        this.load.image(
            'forest_wind',
            windImg
        );

        this.load.image(
            'forest_wood',
            woodImg
        );

        this.load.image(
            'forest_sand',
            sandImg
        );

        // BaseCamp / Cave와 동일한 플레이어
        if (!this.textures.exists('player_asset')) {
            this.load.image(
                'player_asset',
                'assets/images/player.png'
            );
        }

        preloadPlayerAssets(this);
        preloadSounds(this);
    }

    // ==========================================
    // 공통 데이터
    // ==========================================

    addDiscoveredWord(word) {
        if (!this.discoveredWords.includes(word)) {
            this.discoveredWords.push(word);
        }

        // 다른 Scene으로 이동해도 유지
        this.registry.set(
            'discoveredWords',
            this.discoveredWords
        );
    }

    get playerSpeed() {
        // BaseCamp / Cave 기준으로 통일
        return 120 + (this.upgrades.speed * 9);
    }

    create() {
        playBGM(this, 'bgm_travel', 0.4);

        // ==========================================
        // 1. 배경 / 월드
        // ==========================================

        const bg = this.add
            .image(0, 0, 'bg_north_forest')
            .setOrigin(0, 0);

        const mapWidth = bg.width;
        const mapHeight = bg.height;

        this.physics.world.setBounds(
            0,
            0,
            mapWidth,
            mapHeight
        );

        this.cameras.main.setBounds(
            0,
            0,
            mapWidth,
            mapHeight
        );

        // 필요하면 1.5 등으로 변경
        this.cameras.main.setZoom(1.5);

        // ==========================================
        // 2. 픽셀 파티클 텍스처
        // ==========================================

        if (!this.textures.exists('pixel')) {
            const g = this.make.graphics({
                x: 0,
                y: 0,
                add: false
            });

            g.fillStyle(0xffffff, 1);
            g.fillRect(0, 0, 4, 4);

            g.generateTexture(
                'pixel',
                4,
                4
            );
        }

        // ==========================================
        // 3. 장애물 생성
        // ==========================================

        this.obstacles =
            this.physics.add.staticGroup();

        this.createMapCollisions(
            mapWidth,
            mapHeight
        );

        // ==========================================
        // 4. 파밍지 좌표
        // ==========================================

        // 좌상단 - 바람의 제단
        const altarX =
            mapWidth * 0.22;

        const altarY =
            mapHeight * 0.25;

        // 우상단 - 벌목장
        const woodZoneX =
            mapWidth * 0.78;

        const woodZoneY =
            mapHeight * 0.22;

        // 우측 - 모래 파밍지
        const sandZoneX =
            mapWidth * 0.82;

        const sandZoneY =
            mapHeight * 0.58;

        // ==========================================
        // 5. BaseCamp 복귀 포탈
        // ==========================================

        const portalX =
            mapWidth / 2;

        const portalY =
            mapHeight - 40;

        // 실제 이미지 없이 투명 Zone만 사용
        // BaseCampScene 방식과 동일
        this.portal = this.add.rectangle(
            portalX,
            portalY,
            150,
            80,
            0x00ff00,
            0
        );

        this.physics.add.existing(
            this.portal,
            true
        );

        // ==========================================
        // 6. 플레이어 생성
        // ==========================================

        let startX =
            mapWidth / 2;

        let startY =
            mapHeight - 120;

        if (this.spawnFrom === 'BaseCamp') {
            startX =
                mapWidth / 2;

            startY =
                mapHeight - 120;
        }

        this.player =
            this.physics.add.sprite(
                startX,
                startY,
                'player_asset'
            );

        // CaveScene과 비슷한 크기
        this.player.setScale(0.09);

        this.player.body
            .setCollideWorldBounds(true);

        // ==========================================
        // 플레이어 발밑 히트박스
        // BaseCamp / Cave와 동일
        // ==========================================

        const hitBoxWidth = 140;  // 발 폭 넓이
        const hitBoxHeight = 70;  // 발 높이 두께
        this.player.body.setSize(hitBoxWidth, hitBoxHeight); 

        // X축 오프셋: (원본너비 375 - 박스너비 140) / 2 = 117.5 (정중앙 정렬)
        const offsetX = (375 - hitBoxWidth) / 2; 
        
        // Y축 오프셋: (원본높이 666 - 박스높이 70) - 여유 공간 = 맨 아래 발바닥 위치
        const offsetY = 666 - hitBoxHeight - 15; 
        
        this.player.body.setOffset(offsetX, offsetY);

        // ==========================================
        // 7. 장애물 충돌
        // ==========================================

        this.physics.add.collider(
            this.player,
            this.obstacles
        );

        // ==========================================
        // 8. 카메라
        // ==========================================

        this.cameras.main.startFollow(
            this.player,
            true,
            0.08,
            0.08
        );

        createPlayerAnims(this); // player 애니메이션 생성

        // ==========================================
        // 9. 키 입력
        // ==========================================

        this.keys =
            this.input.keyboard.addKeys(
                'W,A,S,D,F'
            );

        // ==========================================
        // 10. 재료 그룹
        // ==========================================

        this.materials =
            this.physics.add.group();

        // ==========================================
        // 11. 재료 스포너 시작
        // ==========================================

        this.initMaterialSpawners(
            altarX,
            altarY,
            woodZoneX,
            woodZoneY,
            sandZoneX,
            sandZoneY
        );
        //퀘스트용 부품 생성
        this.spawnLostAiPart();
    }

    // ==========================================
    // 맵 충돌
    // 기존 NorthForestScene 데이터 그대로 유지
    // ==========================================

    createMapCollisions(w, h) {
        const addBox = (
            x,
            y,
            width,
            height
        ) => {
            const box =
                this.add.rectangle(
                    x,
                    y,
                    width,
                    height,
                    0x0000ff,
                    0
                );

            this.physics.add.existing(
                box,
                true
            );

            this.obstacles.add(box);
        };

        // ==========================================
        // 맵 외곽
        // ==========================================

        addBox(
            w * 0.5,
            h * 0.01,
            w,
            h * 0.13
        );

        addBox(
            w * 0.28,
            h * 0.95,
            w * 0.33,
            h * 0.1
        );

        addBox(
            w * 0.72,
            h * 0.95,
            w * 0.33,
            h * 0.15
        );

        addBox(
            w * 0.05,
            h * 0.5,
            w * 0.1,
            h * 0.4
        );

        addBox(
            w * 0.01,
            h * 0.05,
            w * 0.09,
            h * 0.5
        );

        addBox(
            w * 0.9,
            h * 0.4,
            w * 0.25,
            h * 0.1
        );

        addBox(
            w * 0.95,
            h * 0.87,
            w * 0.1,
            h * 0.28
        );

        addBox(
            w * 0.97,
            h * 0.6,
            w * 0.02,
            h * 0.28
        );

        addBox(
            w * 0.94,
            h * 0.7,
            w * 0.04,
            h * 0.05
        );

        addBox(
            w * 0.92,
            h * 0.48,
            w * 0.12,
            h * 0.06
        );

        addBox(
            w * 0.95,
            h * 0.55,
            w * 0.03,
            h * 0.07
        );

        // ==========================================
        // 하단 장애물
        // ==========================================

        addBox(w * 0.35, h * 0.85, w * 0.1, h * 0.1);
        addBox(w * 0.35, h * 0.8, w * 0.05, h * 0.04);
        addBox(w * 0.455, h * 0.89, w * 0.025, h * 0.08);
        addBox(w * 0.543, h * 0.89, w * 0.021, h * 0.08);
        addBox(w * 0.53, h * 0.75, w * 0.05, h * 0.06);
        addBox(w * 0.492, h * 0.75, w * 0.022, h * 0.03);
        addBox(w * 0.485, h * 0.79, w * 0.022, h * 0.03);
        addBox(w * 0.472, h * 0.77, w * 0.022, h * 0.03);
        addBox(w * 0.55, h * 0.68, w * 0.022, h * 0.04);
        addBox(w * 0.565, h * 0.668, w * 0.022, h * 0.035);
        addBox(w * 0.58, h * 0.655, w * 0.022, h * 0.034);
        addBox(w * 0.6, h * 0.63, w * 0.022, h * 0.04);
        addBox(w * 0.615, h * 0.57, w * 0.022, h * 0.05);
        addBox(w * 0.66, h * 0.85, w * 0.15, h * 0.1);
        addBox(w * 0.685, h * 0.79, w * 0.12, h * 0.024);
        addBox(w * 0.7, h * 0.77, w * 0.12, h * 0.024);
        addBox(w * 0.71, h * 0.75, w * 0.128, h * 0.024);
        addBox(w * 0.71, h * 0.72, w * 0.128, h * 0.024);
        addBox(w * 0.71, h * 0.7, w * 0.128, h * 0.024);
        addBox(w * 0.71, h * 0.675, w * 0.075, h * 0.024);
        addBox(w * 0.7, h * 0.65, w * 0.04, h * 0.024);
        addBox(w * 0.835, h * 0.85, w * 0.1, h * 0.054);
        addBox(w * 0.87, h * 0.8, w * 0.1, h * 0.054);
        addBox(w * 0.725, h * 0.44, w * 0.04, h * 0.15);
        addBox(w * 0.76, h * 0.41, w * 0.03, h * 0.15);
        addBox(w * 0.69, h * 0.45, w * 0.03, h * 0.11);
        addBox(w * 0.66, h * 0.46, w * 0.03, h * 0.03);
        addBox(w * 0.64, h * 0.49, w * 0.03, h * 0.06);

        // 바위
        addBox(w * 0.642, h * 0.595, w * 0.02, h * 0.03);
        addBox(w * 0.805, h * 0.59, w * 0.03, h * 0.05);
        addBox(w * 0.765, h * 0.62, w * 0.015, h * 0.035);
        addBox(w * 0.765, h * 0.56, w * 0.015, h * 0.02);
        addBox(w * 0.787, h * 0.538, w * 0.019, h * 0.038);
        addBox(w * 0.8, h * 0.66, w * 0.012, h * 0.019);
        addBox(w * 0.884, h * 0.655, w * 0.02, h * 0.022);
        addBox(w * 0.825, h * 0.69, w * 0.02, h * 0.022);
        addBox(w * 0.81, h * 0.75, w * 0.025, h * 0.025);
        addBox(w * 0.745, h * 0.846, w * 0.021, h * 0.025);
        addBox(w * 0.916, h * 0.64, w * 0.012, h * 0.019);
        addBox(w * 0.916, h * 0.6, w * 0.012, h * 0.019);
        addBox(w * 0.895, h * 0.61, w * 0.018, h * 0.038);
        addBox(w * 0.865, h * 0.56, w * 0.025, h * 0.036);
        addBox(w * 0.823, h * 0.49, w * 0.025, h * 0.03);
        addBox(w * 0.565, h * 0.57, w * 0.023, h * 0.025);
        addBox(w * 0.55, h * 0.6, w * 0.022, h * 0.027);
        addBox(w * 0.485, h * 0.59, w * 0.1, h * 0.06);
        addBox(w * 0.52, h * 0.63, w * 0.02, h * 0.016);
        addBox(w * 0.49, h * 0.633, w * 0.026, h * 0.025);
        addBox(w * 0.46, h * 0.64, w * 0.02, h * 0.045);
        addBox(w * 0.43, h * 0.65, w * 0.04, h * 0.08);
        addBox(w * 0.495, h * 0.55, w * 0.08, h * 0.02);
        addBox(w * 0.54, h * 0.56, w * 0.02, h * 0.04);
        addBox(w * 0.485, h * 0.53, w * 0.02, h * 0.04);
        addBox(w * 0.507, h * 0.535, w * 0.02, h * 0.01);
        addBox(w * 0.87, h * 0.75, w * 0.027, h * 0.08);
        addBox(w * 0.785, h * 0.46, w * 0.015, h * 0.02);
        addBox(w * 0.37, h * 0.49, w * 0.015, h * 0.02);
        addBox(w * 0.375, h * 0.51, w * 0.017, h * 0.025);
        addBox(w * 0.355, h * 0.53, w * 0.017, h * 0.025);
        addBox(w * 0.348, h * 0.56, w * 0.017, h * 0.025);
        addBox(w * 0.33, h * 0.58, w * 0.025, h * 0.029);
        addBox(w * 0.315, h * 0.5, w * 0.06, h * 0.05);
        addBox(w * 0.317, h * 0.54, w * 0.03, h * 0.023);
        addBox(w * 0.3, h * 0.68, w * 0.016, h * 0.025);
        addBox(w * 0.29, h * 0.72, w * 0.017, h * 0.027);
        addBox(w * 0.19, h * 0.7, w * 0.17, h * 0.15);
        addBox(w * 0.228, h * 0.61, w * 0.08, h * 0.02);
        addBox(w * 0.21, h * 0.59, w * 0.02, h * 0.02);
        addBox(w * 0.175, h * 0.595, w * 0.02, h * 0.028);
        addBox(w * 0.15, h * 0.5, w * 0.115, h * 0.09);
        addBox(w * 0.15, h * 0.572, w * 0.02, h * 0.028);
        addBox(w * 0.175, h * 0.55, w * 0.06, h * 0.014);
        addBox(w * 0.15, h * 0.45, w * 0.1, h * 0.014);
        addBox(w * 0.13, h * 0.43, w * 0.06, h * 0.028);
        addBox(w * 0.11, h * 0.39, w * 0.04, h * 0.06);
        addBox(w * 0.11, h * 0.35, w * 0.02, h * 0.02);
        addBox(w * 0.15, h * 0.38, w * 0.02, h * 0.02);
        addBox(w * 0.1, h * 0.26, w * 0.02, h * 0.025);
        addBox(w * 0.07, h * 0.25, w * 0.02, h * 0.025);
        addBox(w * 0.07, h * 0.17, w * 0.02, h * 0.12);
        addBox(w * 0.1, h * 0.2, w * 0.02, h * 0.025);
        addBox(w * 0.1, h * 0.16, w * 0.02, h * 0.05);
        addBox(w * 0.12, h * 0.16, w * 0.02, h * 0.08);
        addBox(w * 0.16, h * 0.12, w * 0.02, h * 0.08);
        addBox(w * 0.13, h * 0.09, w * 0.04, h * 0.02);
        addBox(w * 0.125, h * 0.11, w * 0.02, h * 0.02);
        addBox(w * 0.171, h * 0.2, w * 0.02, h * 0.06);
        addBox(w * 0.146, h * 0.26, w * 0.02, h * 0.06);
        addBox(w * 0.171, h * 0.31, w * 0.02, h * 0.06);
        addBox(w * 0.278, h * 0.31, w * 0.02, h * 0.07);
        addBox(w * 0.278, h * 0.21, w * 0.02, h * 0.07);
        addBox(w * 0.3, h * 0.26, w * 0.02, h * 0.07);
        addBox(w * 0.225, h * 0.17, w * 0.02, h * 0.06);
        addBox(w * 0.224, h * 0.255, w * 0.02, h * 0.04);
        addBox(w * 0.224, h * 0.2, w * 0.05, h * 0.01);
        addBox(w * 0.26, h * 0.205, w * 0.025, h * 0.005);
        addBox(w * 0.19, h * 0.205, w * 0.025, h * 0.005);
        addBox(w * 0.255, h * 0.32, w * 0.02, h * 0.03);
        addBox(w * 0.195, h * 0.32, w * 0.02, h * 0.03);

        addBox(w * 0.64, h * 0.49, w * 0.03, h * 0.06);

        addBox(w * 0.279, h * 0.368, w * 0.016, h * 0.018);
        addBox(w * 0.298, h * 0.394, w * 0.018, h * 0.024);
        addBox(w * 0.340, h * 0.339, w * 0.021, h * 0.023);
        addBox(w * 0.443, h * 0.125, w * 0.017, h * 0.021);
        addBox(w * 0.219, h * 0.093, w * 0.019, h * 0.029);
        addBox(w * 0.192, h * 0.092, w * 0.024, h * 0.029);
        addBox(w * 0.179, h * 0.135, w * 0.015, h * 0.027);
        addBox(w * 0.324, h * 0.471, w * 0.028, h * 0.017);
        addBox(w * 0.360, h * 0.259, w * 0.018, h * 0.017);
        addBox(w * 0.358, h * 0.237, w * 0.039, h * 0.019);
        addBox(w * 0.330, h * 0.198, w * 0.017, h * 0.014);
        addBox(w * 0.360, h * 0.219, w * 0.031, h * 0.015);
        addBox(w * 0.295, h * 0.124, w * 0.018, h * 0.020);
        addBox(w * 0.358, h * 0.207, w * 0.025, h * 0.012);
        addBox(w * 0.353, h * 0.094, w * 0.019, h * 0.023);
        addBox(w * 0.349, h * 0.124, w * 0.012, h * 0.020);
        addBox(w * 0.359, h * 0.195, w * 0.019, h * 0.012);
        addBox(w * 0.270, h * 0.143, w * 0.016, h * 0.020);
        addBox(w * 0.330, h * 0.178, w * 0.043, h * 0.014);
        addBox(w * 0.359, h * 0.181, w * 0.008, h * 0.015);
        addBox(w * 0.539, h * 0.087, w * 0.015, h * 0.018);
        addBox(w * 0.551, h * 0.112, w * 0.015, h * 0.024);
        addBox(w * 0.577, h * 0.156, w * 0.019, h * 0.025);
        addBox(w * 0.611, h * 0.297, w * 0.014, h * 0.020);
        addBox(w * 0.654, h * 0.395, w * 0.017, h * 0.020);
        addBox(w * 0.540, h * 0.433, w * 0.021, h * 0.027);
        addBox(w * 0.670, h * 0.381, w * 0.019, h * 0.022);
        addBox(w * 0.455, h * 0.419, w * 0.016, h * 0.021);
        addBox(w * 0.488, h * 0.434, w * 0.020, h * 0.014);
        addBox(w * 0.331, h * 0.163, w * 0.031, h * 0.021);
        addBox(w * 0.430, h * 0.087, w * 0.017, h * 0.020);
        addBox(w * 0.390, h * 0.108, w * 0.023, h * 0.028);
        addBox(w * 0.251, h * 0.138, w * 0.022, h * 0.022);
        addBox(w * 0.251, h * 0.114, w * 0.043, h * 0.018);
        addBox(w * 0.415, h * 0.417, w * 0.016, h * 0.017);
        addBox(w * 0.697, h * 0.288, w * 0.019, h * 0.018);
        addBox(w * 0.307, h * 0.155, w * 0.015, h * 0.025);
        addBox(w * 0.334, h * 0.133, w * 0.017, h * 0.041);
        addBox(w * 0.461, h * 0.385, w * 0.128, h * 0.038);
        addBox(w * 0.486, h * 0.416, w * 0.041, h * 0.015);
        addBox(w * 0.480, h * 0.341, w * 0.115, h * 0.052);
        addBox(w * 0.439, h * 0.307, w * 0.022, h * 0.017);
        addBox(w * 0.497, h * 0.306, w * 0.083, h * 0.021);
        addBox(w * 0.609, h * 0.219, w * 0.019, h * 0.017);
        addBox(w * 0.634, h * 0.286, w * 0.018, h * 0.019);
        addBox(w * 0.488, h * 0.282, w * 0.064, h * 0.024);
        addBox(w * 0.494, h * 0.252, w * 0.059, h * 0.036);
        addBox(w * 0.484, h * 0.224, w * 0.048, h * 0.032);
        addBox(w * 0.498, h * 0.199, w * 0.010, h * 0.016);
        addBox(w * 0.801, h * 0.813, w * 0.015, h * 0.017);
        addBox(w * 0.896, h * 0.517, w * 0.020, h * 0.011);
        addBox(w * 0.855, h * 0.466, w * 0.008, h * 0.025);
        addBox(w * 0.787, h * 0.334, w * 0.013, h * 0.028);
        addBox(w * 0.899, h * 0.345, w * 0.190, h * 0.011);
        addBox(w * 0.635, h * 0.252, w * 0.053, h * 0.033);
        addBox(w * 0.648, h * 0.233, w * 0.054, h * 0.027);
        addBox(w * 0.802, h * 0.288, w * 0.044, h * 0.028);
        addBox(w * 0.904, h * 0.236, w * 0.019, h * 0.028);
        addBox(w * 0.926, h * 0.197, w * 0.017, h * 0.026);
        addBox(w * 0.698, h * 0.197, w * 0.019, h * 0.030);
        addBox(w * 0.686, h * 0.157, w * 0.015, h * 0.018);
        addBox(w * 0.702, h * 0.111, w * 0.017, h * 0.022);
        addBox(w * 0.727, h * 0.089, w * 0.019, h * 0.023);
        addBox(w * 0.879, h * 0.106, w * 0.016, h * 0.019);
        addBox(w * 0.903, h * 0.128, w * 0.017, h * 0.024);
        addBox(w * 0.905, h * 0.177, w * 0.018, h * 0.027);
        addBox(w * 0.912, h * 0.330, w * 0.172, h * 0.018);
        addBox(w * 0.926, h * 0.124, w * 0.021, h * 0.025);
        addBox(w * 0.948, h * 0.093, w * 0.095, h * 0.027);
        addBox(w * 0.972, h * 0.150, w * 0.055, h * 0.076);
        addBox(w * 0.975, h * 0.255, w * 0.043, h * 0.126);
        addBox(w * 0.944, h * 0.268, w * 0.016, h * 0.099);
        addBox(w * 0.924, h * 0.285, w * 0.020, h * 0.061);
        addBox(w * 0.894, h * 0.310, w * 0.010, h * 0.019);
        addBox(w * 0.859, h * 0.303, w * 0.035, h * 0.029);
        addBox(w * 0.855, h * 0.254, w * 0.019, h * 0.020);
        addBox(w * 0.839, h * 0.263, w * 0.012, h * 0.027);
        addBox(w * 0.848, h * 0.177, w * 0.054, h * 0.020);
        addBox(w * 0.864, h * 0.192, w * 0.046, h * 0.009);
        addBox(w * 0.866, h * 0.203, w * 0.023, h * 0.009);
        addBox(w * 0.845, h * 0.160, w * 0.025, h * 0.014);
        addBox(w * 0.797, h * 0.210, w * 0.019, h * 0.029);
        addBox(w * 0.797, h * 0.144, w * 0.032, h * 0.017);
        addBox(w * 0.797, h * 0.129, w * 0.020, h * 0.010);
        addBox(w * 0.741, h * 0.166, w * 0.029, h * 0.026);
        addBox(w * 0.758, h * 0.172, w * 0.006, h * 0.016);
        addBox(w * 0.742, h * 0.185, w * 0.012, h * 0.006);
        addBox(w * 0.727, h * 0.233, w * 0.047, h * 0.013);
        addBox(w * 0.726, h * 0.246, w * 0.021, h * 0.006);
        addBox(w * 0.729, h * 0.217, w * 0.023, h * 0.012);
        addBox(w * 0.639, h * 0.203, w * 0.032, h * 0.026);
        addBox(w * 0.610, h * 0.187, w * 0.041, h * 0.037);
        addBox(w * 0.610, h * 0.151, w * 0.017, h * 0.030);
        addBox(w * 0.610, h * 0.130, w * 0.008, h * 0.010);
        addBox(w * 0.674, h * 0.134, w * 0.017, h * 0.017);
        addBox(w * 0.619, h * 0.092, w * 0.019, h * 0.027);
        addBox(w * 0.643, h * 0.101, w * 0.016, h * 0.043);
        addBox(w * 0.674, h * 0.102, w * 0.034, h * 0.041);
        addBox(w * 0.254, h * 0.092, w * 0.030, h * 0.028);
        addBox(w * 0.285, h * 0.084, w * 0.018, h * 0.014);
        addBox(w * 0.2, h * 0.82, w * 0.21, h * 0.15);
        addBox(w * 0.32, h * 0.76, w * 0.04, h * 0.04);
        addBox(w * 0.34, h * 0.74, w * 0.03, h * 0.03);
        addBox(w * 0.355, h * 0.725, w * 0.03, h * 0.03);
        addBox(w * 0.477, h * 0.72, w * 0.15, h * 0.03);
    }

    // ==========================================
    // 재료 스포너
    // ==========================================

    initMaterialSpawners(
    altarX,
    altarY,
    woodX,
    woodY,
    sandX,
    sandY
) {
    // ==========================================
    // 초기 재료 배치
    // 진입하자마자 너무 많이 깔리지 않도록
    // 각 종류별 2개씩만 생성
    // ==========================================

    for (let i = 0; i < 2; i++) {
        // 바람
        this.spawnMaterialNear(
            altarX,
            altarY,
            80,
            '바람',
            'forest_wind',
            '#64ffda',
            6,
            1
        );

        // 나무
        this.spawnMaterialNear(
            woodX,
            woodY,
            90,
            '나무',
            'forest_wood',
            '#a1887f',
            6,
            1
        );

        // 모래
        this.spawnMaterialNear(
            sandX,
            sandY,
            80,
            '모래',
            'forest_sand',
            '#ffb74d',
            6,
            1
        );
    }

    // ==========================================
    // 바람 스폰
    // Cave의 철과 비슷한 희소도
    // 6초마다 1개
    // 최대 6개
    // ==========================================

    this.time.addEvent({
        delay: 6000,

        callback: () => {
            this.spawnMaterialNear(
                altarX,
                altarY,
                80,
                '바람',
                'forest_wind',
                '#64ffda',
                6,
                1
            );
        },

        loop: true
    });

    // ==========================================
    // 나무 스폰
    // 중간 정도
    // 5초마다 1개
    // 최대 6개
    // ==========================================

    this.time.addEvent({
        delay: 5000,

        callback: () => {
            this.spawnMaterialNear(
                woodX,
                woodY,
                90,
                '나무',
                'forest_wood',
                '#a1887f',
                6,
                1
            );
        },

        loop: true
    });

    // ==========================================
    // 모래 스폰
    // 비교적 빠른 재료
    // 4초마다 1개
    // 최대 6개
    // ==========================================

    this.time.addEvent({
        delay: 4000,

        callback: () => {
            this.spawnMaterialNear(
                sandX,
                sandY,
                80,
                '모래',
                'forest_sand',
                '#ffb74d',
                6,
                1
            );
        },

        loop: true
    });
}

    // ==========================================
    // 재료 생성
    // CaveScene 방식의
    // "벽 + 기존 아이템 겹침 검사" 적용
    // ==========================================

    spawnMaterialNear(
        centerX,
        centerY,
        radius,
        name,
        textureKey,
        colorHex,
        maxLimit,
        targetScale = 1
    ) {
        const currentCount =
            this.materials
                .getChildren()
                .filter(
                    material =>
                        material.name === name
                )
                .length;

        if (currentCount >= maxLimit) {
            return;
        }

        let spawnX;
        let spawnY;

        let isValid = false;
        let attempts = 0;

        while (
            !isValid &&
            attempts < 30
        ) {
            const angle =
                Math.random() *
                Math.PI *
                2;

            const r =
                20 +
                Math.random() *
                    (radius - 20);

            spawnX =
                centerX +
                Math.cos(angle) * r;

            spawnY =
                centerY +
                Math.sin(angle) * r;

            isValid = true;

            // ==========================================
            // 맵 범위 검사
            // ==========================================

            if (
                spawnX < 20 ||
                spawnY < 20 ||
                spawnX >
                    this.physics.world.bounds.width -
                        20 ||
                spawnY >
                    this.physics.world.bounds.height -
                        20
            ) {
                isValid = false;
            }

            // ==========================================
            // 장애물과 겹치는지 확인
            // ==========================================

            if (isValid) {
                const walls =
                    this.obstacles.getChildren();

                for (
                    let i = 0;
                    i < walls.length;
                    i++
                ) {
                    const wall =
                        walls[i];

                    const wallWidth =
                        wall.displayWidth ||
                        wall.width;

                    const wallHeight =
                        wall.displayHeight ||
                        wall.height;

                    const padding = 15;

                    const left =
                        wall.x -
                        wallWidth / 2 -
                        padding;

                    const right =
                        wall.x +
                        wallWidth / 2 +
                        padding;

                    const top =
                        wall.y -
                        wallHeight / 2 -
                        padding;

                    const bottom =
                        wall.y +
                        wallHeight / 2 +
                        padding;

                    if (
                        spawnX > left &&
                        spawnX < right &&
                        spawnY > top &&
                        spawnY < bottom
                    ) {
                        isValid = false;
                        break;
                    }
                }
            }

            // ==========================================
            // 기존 재료와 너무 가까운지 검사
            // ==========================================

            if (isValid) {
                const existingItems =
                    this.materials.getChildren();

                for (
                    let i = 0;
                    i < existingItems.length;
                    i++
                ) {
                    const item =
                        existingItems[i];

                    const distance =
                        Phaser.Math.Distance.Between(
                            spawnX,
                            spawnY,
                            item.x,
                            item.y
                        );

                    if (distance < 35) {
                        isValid = false;
                        break;
                    }
                }
            }

            attempts++;
        }

        if (!isValid) {
            return;
        }

        // ==========================================
        // 실제 재료 생성
        // ==========================================

        const material =
            this.physics.add.sprite(
                spawnX,
                spawnY,
                textureKey
            );

        material.name = name;

        material.colorHex =
            colorHex;

        // BaseCamp의 근접 확대 효과에서
        // 원래 크기를 복구하기 위해 저장
        material.defaultScale =
            targetScale;

        material.setScale(0);

        // ==========================================
        // 등장 애니메이션
        // ==========================================

        this.tweens.add({
            targets: material,

            scaleX: targetScale,
            scaleY: targetScale,

            duration: 400,

            ease: 'Back.easeOut',

            onComplete: () => {
                // 등장 후 기본 크기 확정
                material.defaultScale =
                    targetScale;

                // 공중에 둥둥 떠 있는 효과
                this.tweens.add({
                    targets: material,

                    y: material.y - 6,

                    duration:
                        1200 +
                        Math.random() * 400,

                    yoyo: true,
                    repeat: -1,

                    ease: 'Sine.easeInOut'
                });
            }
        });

        this.materials.add(
            material
        );
    }

    // ==========================================
    // 플레이어가 재료 근처에 있을 때
    // BaseCamp 방식 Glow + Scale 효과
    // ==========================================

    updateInteractableOutlines() {
        if (!this.player) {
            return;
        }

        const materials =
            this.materials.getChildren();

        materials.forEach(
            material => {
                if (
                    !material ||
                    !material.active
                ) {
                    return;
                }

                const distance =
                    Phaser.Math.Distance.BetweenPoints(
                        this.player,
                        material
                    );

                const isNear =
                    distance < 55;

                // ======================================
                // 가까워졌을 때
                // ======================================

                if (
                    isNear &&
                    !material.hasOutline
                ) {
                    // Glow 적용
                    if (
                        material.preFX &&
                        !material.outlineFX
                    ) {
                        material.outlineFX =
                            material.preFX.addGlow(
                                0xffffff,
                                2.5,
                                0,
                                false
                            );
                    }

                    material.hasOutline =
                        true;

                    // 현재 원본 크기
                    const baseScale =
                        material.defaultScale ||
                        material.scaleX ||
                        1;

                    // 기존 tween 중 scale 관련 충돌 방지
                    this.tweens.killTweensOf(
                        material,
                        [
                            'scaleX',
                            'scaleY'
                        ]
                    );

                    // 살짝 커짐
                    this.tweens.add({
                        targets: material,

                        scaleX:
                            baseScale *
                            1.15,

                        scaleY:
                            baseScale *
                            1.15,

                        duration: 150,

                        ease: 'Back.easeOut'
                    });
                }

                // ======================================
                // 멀어졌을 때
                // ======================================

                else if (
                    !isNear &&
                    material.hasOutline
                ) {
                    if (
                        material.outlineFX &&
                        material.preFX
                    ) {
                        material.preFX.remove(
                            material.outlineFX
                        );

                        material.outlineFX =
                            null;
                    }

                    material.hasOutline =
                        false;

                    const baseScale =
                        material.defaultScale ||
                        1;

                    this.tweens.killTweensOf(
                        material,
                        [
                            'scaleX',
                            'scaleY'
                        ]
                    );

                    // 원래 크기로 복귀
                    this.tweens.add({
                        targets: material,

                        scaleX:
                            baseScale,

                        scaleY:
                            baseScale,

                        duration: 150,

                        ease: 'Sine.easeInOut'
                    });
                }
            }
        );
    }

    // ==========================================
    // 획득 시 파티클
    // 기존 NorthForestScene 효과 유지
    // ==========================================

    createPickupBurst(
        x,
        y,
        colorHex
    ) {
        const colorVal =
            Phaser.Display.Color
                .HexStringToColor(
                    colorHex
                )
                .color;

        this.add.particles(
            x,
            y,
            'pixel',
            {
                tint: colorVal,

                speed: {
                    min: 50,
                    max: 150
                },

                scale: {
                    start: 1.2,
                    end: 0
                },

                lifespan: 500,

                blendMode: 'ADD',

                duration: 100
            }
        );
    }

    // ==========================================
    // 획득 시 +나무 / +바람 / +모래 텍스트
    // ==========================================

    showFloatingText(
        x,
        y,
        message,
        colorHex
    ) {
        const text =
            this.add.text(
                x,
                y - 20,
                message,
                {
                    fontSize: '15px',

                    fill:
                        colorHex,

                    fontStyle:
                        'bold'
                }
            );

        text
            .setOrigin(0.5)
            .setStroke(
                '#000000',
                3
            );

        this.tweens.add({
            targets: text,

            y: y - 60,

            alpha: 0,

            duration: 1000,

            onComplete: () => {
                text.destroy();
            }
        });
    }

    // ==========================================
    // UPDATE
    // ==========================================

    update() {
        if (
            !this.player ||
            !this.player.active
        ) {
            return;
        }

        // ==========================================
        // 재료 근접 이펙트
        // ==========================================

        this.updateInteractableOutlines();

        updatePlayerMovement(this.player, this.keys, this.playerSpeed); // playerMovement.js의 updatePlayerMovement 함수 호출

        // ==========================================
        // 플레이어 이동
        // ==========================================

        let vx = 0;
        let vy = 0;

        if (this.keys.A.isDown) {
            vx =
                -this.playerSpeed;
        } else if (
            this.keys.D.isDown
        ) {
            vx =
                this.playerSpeed;
        }

        if (this.keys.W.isDown) {
            vy =
                -this.playerSpeed;
        } else if (
            this.keys.S.isDown
        ) {
            vy =
                this.playerSpeed;
        }

        this.player.body.setVelocity(
            vx,
            vy
        );

        // ==========================================
        // F 상호작용
        // ==========================================

        if (
            Phaser.Input.Keyboard.JustDown(
                this.keys.F
            )
        ) {
            // 퀘스트 부품 획득 상호작용
            if (
            this.lostAiPart?.active &&
            Phaser.Math.Distance.BetweenPoints(
                this.player,
                this.lostAiPart
            ) < 55
        ) {
            const state = this.registry.get('houseBuildState');

            if (state?.quest?.active && !state.quest.partFound) {
                state.quest.partFound = true;

                this.registry.set('houseBuildState', state);

                console.log('🔧 NorthForest에서 AI 구동 부품 획득');

                this.lostAiPart.destroy();

                const questHud = document.getElementById('quest-hud');

                if (questHud) {
                    questHud.innerHTML = `
                        <div class="quest-hud-type">EMERGENCY QUEST</div>
                        <div class="quest-hud-title">잃어버린 AI 구동 부품</div>
                        <div class="quest-hud-description">
                            부품을 찾았다! BaseCamp의 AI에게 돌아가자.
                        </div>
                        <div class="quest-hud-time">✓ 부품 획득 완료</div>
                    `;
                }
            }
        }
            // ======================================
            // 1. 재료 줍기
            // ======================================

            this.materials
                .getChildren()
                .forEach(
                    material => {
                        if (
                            !material.active
                        ) {
                            return;
                        }

                        const distance =
                            Phaser.Math.Distance
                                .BetweenPoints(
                                    this.player,
                                    material
                                );

                        if (
                            distance < 55
                        ) {
                            // 인벤토리 증가
                            this.wordInventory[
                                material.name
                            ] =
                                (
                                    this.wordInventory[
                                        material.name
                                    ] || 0
                                ) + 1;

                            // 도감 추가
                            this.addDiscoveredWord(
                                material.name
                            );

                            // =================================
                            // 글로벌 Registry 동기화
                            // =================================

                            this.registry.set(
                                'wordInventory',
                                this.wordInventory
                            );

                            this.registry.set(
                                'discoveredWords',
                                this.discoveredWords
                            );

                            // =================================
                            // 획득 효과
                            // =================================

                            this.createPickupBurst(
                                material.x,
                                material.y,
                                material.colorHex
                            );

                            this.showFloatingText(
                                material.x,
                                material.y,
                                `+ ${material.name}`,
                                material.colorHex
                            );

                            console.log(
                                `✨ [${material.name}] 획득! ` +
                                `(보유량: ${this.wordInventory[material.name]}개)`
                            );
                            playSFX(this, 'sfx_get_item', 0.25);
                            material.destroy();
                        }
                    }
                );

            // ======================================
            // 2. BaseCamp 복귀
            // ======================================

            const portalDistance =
                Phaser.Math.Distance
                    .BetweenPoints(
                        this.player,
                        this.portal
                    );

            if (
                portalDistance < 80
            ) {
                this.scene.start(
                    'BaseCampScene',
                    {
                        // BaseCampScene의
                        // spawnFrom === 'NorthSide'
                        // 로직과 연결
                        spawnFrom:
                            'NorthSide'
                    }
                );
            }
        }
    }

    //퀘스트용 부품 생성 함수
    spawnLostAiPart() {
        const state = this.registry.get('houseBuildState');

        if (
            !state?.quest?.active ||
            state.quest.completed ||
            state.quest.partFound
        ) {
            return;
        }

        // ==========================================
        // TODO: 추후 실제 AI 부품 이미지로 교체
        // ==========================================
        if (!this.textures.exists('item_ai_core_temp')) {
            const g = this.make.graphics({ x: 0, y: 0, add: false });

            g.fillStyle(0x263238, 1);
            g.fillRoundedRect(4, 8, 40, 32, 5);

            g.fillStyle(0x00ffcc, 1);
            g.fillCircle(24, 24, 9);

            g.fillStyle(0xffffff, 1);
            g.fillCircle(21, 21, 3);

            g.fillStyle(0x78909c, 1);
            g.fillRect(0, 17, 7, 14);
            g.fillRect(41, 17, 7, 14);

            g.generateTexture('item_ai_core_temp', 48, 48);
            g.destroy();
        }

        // ==========================================
        // NorthForest 북쪽
        //
        // TODO: 실제 맵 크기에 맞춰 x 좌표만 조정
        // y는 북쪽이므로 작은 값
        // ==========================================
        const bg = this.children.getByName?.('background');

        const worldWidth = this.physics.world.bounds.width;

        this.lostAiPart = this.physics.add.sprite(
            worldWidth / 2,
            90,
            'item_ai_core_temp'
        );

        this.lostAiPart.setScale(0.9);

        this.tweens.add({
            targets: this.lostAiPart,
            y: this.lostAiPart.y - 8,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
}