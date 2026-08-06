import Phaser from 'phaser';
import mapBg from '../utils/assets/forest_map.png';
import woodImg from '../utils/assets/wood.png';
import sandImg from '../utils/assets/sand.png';
import windImg from '../utils/assets/wind.png';
import collisionBoxGenerator from '../utils/collisionBoxGenerator';

export default class DesertScene extends Phaser.Scene {
    constructor() { 
        super('DesertScene'); 
        this.spawnFrom = 'BaseCamp'; 
    }

    init(data) {
        if (data && data.spawnFrom) this.spawnFrom = data.spawnFrom;
        this.wordInventory = this.registry.get('wordInventory') || {};
        this.discoveredWords = this.registry.get('discoveredWords') || [];
        this.discoveredRecipes = this.registry.get('discoveredRecipes') || [];
        this.replicators = this.registry.get('replicators') || [];
        this.upgrades = this.registry.get('upgrades') || { speed: 0, time: 0, yield: 0 };
    }

    preload() {
        this.load.image('map_bg', mapBg);
        this.load.image('wind', windImg);
        this.load.image('wood', woodImg);
        this.load.image('sand', sandImg);
    }

    addDiscoveredWord(word) { 
        if (!this.discoveredWords.includes(word)) this.discoveredWords.push(word); 
    }
    
    get playerSpeed() { return 200 + (this.upgrades.speed * 15); }

    create() {
        const bg = this.add.image(0, 0, 'map_bg').setOrigin(0, 0);
        const mapWidth = bg.width;
        const mapHeight = bg.height;

        this.physics.world.setBounds(0, 0, mapWidth, mapHeight); 
        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

        

        if (!this.textures.exists('pixel')) { 
            const g = this.make.graphics({ x: 0, y: 0, add: false }); 
            g.fillStyle(0xffffff, 1); 
            g.fillRect(0, 0, 4, 4); 
            g.generateTexture('pixel', 4, 4); 
        }

        if (!this.textures.exists('portal_texture')) {
            const pg = this.make.graphics({ x: 0, y: 0, add: false });
            pg.fillStyle(0x8B4513, 1);
            pg.fillRoundedRect(0, 0, 48, 80, 8);
            pg.fillStyle(0x4a2e18, 1);
            pg.fillRoundedRect(6, 6, 36, 68, 6);
            pg.generateTexture('portal_texture', 48, 80);
        }

        //충돌 박스 생성 기능
        //this.obstacles = this.physics.add.staticGroup();
        //collisionBoxGenerator(this, mapWidth, mapHeight, this.obstacles);

        // 1. 그림판 작업 이미지 기반 상세 충돌 오브젝트 그룹 생성
        this.obstacles = this.physics.add.staticGroup();
        this.createMapCollisions(mapWidth, mapHeight);

        // 파밍지 좌표 설정 (바람의 제단, 벌목장, 모래 파밍지)
        const altarX = mapWidth * 0.22;
        const altarY = mapHeight * 0.25;
        const woodZoneX = mapWidth * 0.78;
        const woodZoneY = mapHeight * 0.22;
        const sandZoneX = mapWidth * 0.82;
        const sandZoneY = mapHeight * 0.58;

        // 플레이어 생성 (하단 중앙 입구 부근)
        //const playerRect = this.add.rectangle(mapWidth / 2, mapHeight - 120, 24, 28, 0xFFFFFF); 
        const playerRect = this.add.rectangle(mapWidth / 2, mapHeight / 2, 24, 28, 0xFFFFFF); 
        playerRect.setStrokeStyle(2, 0x000000);
        this.physics.add.existing(playerRect);
        this.player = playerRect;
        this.player.body.setCollideWorldBounds(true);

        // 플레이어와 장애물 간 충돌 설정
        this.physics.add.collider(this.player, this.obstacles);

        // 포탈 (하단 중앙 입구)
        const portalX = mapWidth / 2;
        const portalY = mapHeight - 40;
        this.portal = this.physics.add.staticSprite(portalX, portalY, 'portal_texture');
        this.add.text(portalX, portalY - 50, '캠프로 ▲', { fontSize: '13px', fill: '#ffffff', fontStyle: 'bold' })
            .setOrigin(0.5).setStroke('#000000', 3);

        this.cameras.main.startFollow(this.player, true, 0.08, 0.08); 
        this.keys = this.input.keyboard.addKeys('W,A,S,D,F');

        // 재료 아이템 Spawner (바람, 나무, 모래)
        this.materials = this.physics.add.group();
        this.initMaterialSpawners(altarX, altarY, woodZoneX, woodZoneY, sandZoneX, sandZoneY);
    }

    // 그림판에서 파란색으로 칠한 영역들을 정확하게 매핑한 충돌 판정 함수
    createMapCollisions(w, h) {
        const addBox = (x, y, width, height) => {
            const box = this.add.rectangle(x, y, width, height, 0x000000, 0); // 개발용 파란색 반투명 박스
            this.physics.add.existing(box, true);
            this.obstacles.add(box);
        };

        addBox(w * 0.5, h * 0.01, w, h * 0.13);       
        addBox(w * 0.28, h * 0.95, w * 0.33, h * 0.1);  
        addBox(w * 0.72, h * 0.95, w * 0.33, h * 0.15);  
        addBox(w * 0.05, h * 0.5, w * 0.1, h* 0.4);      
        addBox(w * 0.01, h * 0.05, w * 0.09, h* 0.5);        
        addBox(w * 0.9, h * 0.4, w * 0.25, h* 0.1);        
        addBox(w * 0.95, h * 0.87, w * 0.1, h* 0.28);        
        addBox(w * 0.97, h * 0.6, w * 0.02, h* 0.28);        
        addBox(w * 0.94, h * 0.7, w * 0.04, h* 0.05);        
        addBox(w * 0.92, h * 0.48, w * 0.12, h* 0.06);        
        addBox(w * 0.95, h * 0.55, w * 0.03, h* 0.07);        

        //하단 장애물(기둥, 나무, 수풀, 바위)
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
        //바위 규격
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
       // --- 강가 및 물줄기 차단 영역 (다리 부근은 비워둠) ---
        
        // 1. 하단-좌측 강줄기 시작부 (첫 번째 다리 왼쪽 아래)

        addBox(w * 0.2, h * 0.82, w * 0.21, h * 0.15);
        addBox(w * 0.32, h * 0.76, w * 0.04, h * 0.04);
        addBox(w * 0.34, h * 0.74, w * 0.03, h * 0.03);
        addBox(w * 0.355, h * 0.725, w * 0.03, h * 0.03);
        addBox(w * 0.477, h * 0.72, w * 0.15, h * 0.03);

        // 2. 중앙 강줄기 구간 (첫 번째 다리와 두 번째 다리 사이)
        // ※ 첫 번째 다리 위치(약 w*0.38, h*0.68)는 통행을 위해 비워둡니다.

        // 3. 우측 상단 강줄기 끝부 (두 번째 다리 오른쪽 위)
        // ※ 두 번째 다리 위치(약 w*0.62, h*0.45)는 통행을 위해 비워둡니다.
    }

    createLabelBadge(x, y, textStr, strokeColor) {
        const container = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, 130, 30, 0x1a1a1a, 0.75);
        bg.setStrokeStyle(1.5, Phaser.Display.Color.HexStringToColor(strokeColor).color);
        
        const txt = this.add.text(0, 0, textStr, {
            fontSize: '13px', fill: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        container.add([bg, txt]);
    }

    generateCustomAssets() {
        if (!this.textures.exists('custom_wind_waves')) {
            const wg = this.make.graphics({ x: 0, y: 0, add: false });
            wg.lineStyle(2.5, 0x50f5b8, 0.9);
            const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(4, 16), new Phaser.Math.Vector2(16, 6), new Phaser.Math.Vector2(28, 16));
            curve.draw(wg);
            wg.generateTexture('custom_wind_waves', 32, 32);
        }

        if (!this.textures.exists('custom_wood_log')) {
            const wlg = this.make.graphics({ x: 0, y: 0, add: false });
            wlg.fillStyle(0x8d5524, 1);
            wlg.fillRoundedRect(4, 10, 24, 12, 4);
            wlg.fillStyle(0xd7ccc8, 1);
            wlg.fillCircle(4, 16, 3);
            wlg.generateTexture('custom_wood_log', 32, 32);
        }

        if (!this.textures.exists('custom_sand_handful')) {
            const sg = this.make.graphics({ x: 0, y: 0, add: false });
            sg.fillStyle(0xd99b4e, 1); sg.fillTriangle(16, 6, 4, 26, 28, 26);
            sg.fillStyle(0xfce2a6, 0.8); sg.fillTriangle(16, 6, 12, 26, 16, 26);
            sg.generateTexture('custom_sand_handful', 32, 32);
        }
    }

    initMaterialSpawners(altarX, altarY, woodX, woodY, sandX, sandY) {
        for (let i = 0; i < 5; i++) {
            this.spawnMaterialNear(altarX, altarY, 80, '바람', 'wind', '#64ffda', 6);
            this.spawnMaterialNear(woodX, woodY, 90, '나무', 'wood', '#a1887f', 6);
            this.spawnMaterialNear(sandX, sandY, 80, '모래', 'sand', '#ffb74d', 6);
        }

        this.time.addEvent({
            delay: 4000,
            callback: () => {
                this.spawnMaterialNear(altarX, altarY, 80, '바람', 'wind', '#64ffda', 6);
                this.spawnMaterialNear(woodX, woodY, 90, '나무', 'wood', '#a1887f', 6);
                this.spawnMaterialNear(sandX, sandY, 80, '모래', 'sand', '#ffb74d', 6);
            },
            loop: true
        });
    }

    spawnMaterialNear(centerX, centerY, radius, name, textureKey, colorHex, maxLimit) {
        if (this.materials.getChildren().filter(m => m.name === name).length >= maxLimit) return;

        const angle = Math.random() * Math.PI * 2;
        const r = 20 + Math.random() * (radius - 20);
        const spawnX = centerX + Math.cos(angle) * r;
        const spawnY = centerY + Math.sin(angle) * r;

        const mat = this.add.sprite(spawnX, spawnY, textureKey);
        mat.name = name;
        mat.colorHex = colorHex;
        mat.setScale(0);

        this.tweens.add({ targets: mat, scale: 1, duration: 400, ease: 'Back.easeOut' });
        this.tweens.add({
            targets: mat,
            y: spawnY - 4,
            duration: 1000 + Math.random() * 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.physics.add.existing(mat);
        this.materials.add(mat);
    }

    createPickupBurst(x, y, colorHex) { 
        const colorVal = Phaser.Display.Color.HexStringToColor(colorHex).color; 
        this.add.particles(x, y, 'pixel', { 
            tint: colorVal, speed: { min: 50, max: 150 }, scale: { start: 1.2, end: 0 }, 
            lifespan: 500, blendMode: 'ADD', duration: 100 
        }); 
    }

    showFloatingText(x, y, message, colorHex) { 
        const t = this.add.text(x, y - 20, message, { 
            fontSize: '15px', fill: colorHex, fontStyle: 'bold' 
        }).setOrigin(0.5).setStroke('#000000', 3);

        this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1000, onComplete: () => t.destroy() }); 
    }

    update() {
        let vx = 0, vy = 0;
        if (this.keys.A.isDown) vx = -this.playerSpeed; else if (this.keys.D.isDown) vx = this.playerSpeed;
        if (this.keys.W.isDown) vy = -this.playerSpeed; else if (this.keys.S.isDown) vy = this.playerSpeed;
        this.player.body.setVelocity(vx, vy);

        if (Phaser.Input.Keyboard.JustDown(this.keys.F)) {
            this.materials.getChildren().forEach((mat) => {
                if (mat.active && Phaser.Math.Distance.BetweenPoints(this.player, mat) < 55) {
                    this.wordInventory[mat.name] = (this.wordInventory[mat.name] || 0) + 1;
                    this.addDiscoveredWord(mat.name);
                    this.createPickupBurst(mat.x, mat.y, mat.colorHex);
                    this.showFloatingText(mat.x, mat.y, `+ ${mat.name}`, mat.colorHex);
                    mat.destroy();
                }
            });

            if (Phaser.Math.Distance.BetweenPoints(this.player, this.portal) < 80) {
                this.scene.start('BaseCampScene', { spawnFrom: 'Desert' });
            }
        }
    }
}