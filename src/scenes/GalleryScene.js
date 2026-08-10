import Phaser from 'phaser';
import { getGalleryHouses, getHouseDetail, likeHouse } from '../api/galleryApi';

export default class GalleryScene extends Phaser.Scene {
    constructor() {
        super('GalleryScene');

        this.houses = [];
        this.sortType = 'latest';
        this.selectedHouse = null;
    }

    create() {
        console.log('🖼️ GalleryScene 시작');

        this.cameras.main.setBackgroundColor('#02060b');

        this.mainMenuScreen = document.getElementById('main-menu-screen');
        this.galleryScreen = document.getElementById('gallery-screen');
        this.galleryList = document.getElementById('gallery-list');
        this.gallerySort = document.getElementById('gallery-sort');
        this.galleryBackButton = document.getElementById('gallery-back-btn');

        this.detailModal = document.getElementById('gallery-detail-modal');
        this.detailCloseButton = document.getElementById('gallery-detail-close');
        this.detailImage = document.getElementById('gallery-detail-image');
        this.detailNumber = document.getElementById('gallery-detail-number');
        this.detailOwner = document.getElementById('gallery-detail-owner');
        this.detailStory = document.getElementById('gallery-detail-story');
        this.detailMaterials = document.getElementById('gallery-detail-materials');
        this.detailLikeButton = document.getElementById('gallery-detail-like');
        this.detailLikeCount = document.getElementById('gallery-detail-like-count');

        document.getElementById('hud-container')?.classList.add('hidden');
        document.getElementById('quest-hud-box')?.classList.add('hidden');
        document.getElementById('alchemy-desk-screen')?.classList.add('hidden');

        this.mainMenuScreen?.classList.add('hidden');
        this.galleryScreen?.classList.remove('hidden');
        this.detailModal?.classList.add('hidden');

        this.bindEvents();
        this.loadGallery();
    }

    bindEvents() {
        if (this.galleryBackButton) {
            this.galleryBackButton.onclick = () => this.backToMenu();
        }

        if (this.gallerySort) {
            this.gallerySort.onchange = () => {
                this.sortType = this.gallerySort.value;
                this.renderGallery();
            };
        }

        if (this.detailCloseButton) {
            this.detailCloseButton.onclick = () => this.closeDetail();
        }

        if (this.detailModal) {
            this.detailModal.onclick = (event) => {
                if (event.target === this.detailModal) this.closeDetail();
            };
        }

        if (this.detailLikeButton) {
            this.detailLikeButton.onclick = () => this.likeSelectedHouse();
        }
    }

    async loadGallery() {
        if (!this.galleryList) return;

        this.galleryList.innerHTML = '<div class="gallery-loading">기록을 불러오는 중...</div>';

        try {
            const data = await getGalleryHouses({
                limit: 50
            });

            this.houses = data.items || [];

            console.log(`🖼️ 갤러리 ${this.houses.length}개 로드`);

            this.renderGallery();
        } catch (error) {
            console.error('❌ 갤러리 로드 실패:', error);

            this.galleryList.innerHTML = `
                <div class="gallery-error">
                    갤러리를 불러오지 못했습니다.<br>
                    ${error.message}
                </div>
            `;
        }
    }

    getSortedHouses() {
        const houses = [...this.houses];

        if (this.sortType === 'likes') {
            houses.sort((a, b) => {
                const likesDiff = (b.likes || 0) - (a.likes || 0);

                if (likesDiff !== 0) return likesDiff;

                return new Date(b.created_at) - new Date(a.created_at);
            });
        } else {
            houses.sort((a, b) => {
                return new Date(b.created_at) - new Date(a.created_at);
            });
        }

        return houses;
    }

    renderGallery() {
        if (!this.galleryList) return;

        const houses = this.getSortedHouses();

        this.galleryList.innerHTML = '';

        if (!houses.length) {
            this.galleryList.innerHTML = '<div class="gallery-empty">아직 완성된 집이 없습니다.</div>';
            return;
        }

        houses.forEach((house) => {
            const card = document.createElement('article');

            card.className = 'gallery-card';

            card.innerHTML = `
                <div class="gallery-card-image-wrap">
                    <img
                        class="gallery-card-image"
                        src="${house.image_url || ''}"
                        alt="집 이미지"
                    >
                </div>

                <div class="gallery-card-info">
                    <div class="gallery-card-owner">
                        ${this.escapeHtml(house.initials || '???')} · #${house.ending_number ?? '-'}
                    </div>

                    <div class="gallery-card-likes">
                        ♥ ${house.likes || 0}
                    </div>
                </div>
            `;

            card.onclick = () => {
                this.openDetail(house.house_id);
            };

            this.galleryList.appendChild(card);
        });
    }

    async openDetail(houseId) {
        try {
            this.detailModal?.classList.remove('hidden');

            if (this.detailStory) this.detailStory.innerText = '기록을 불러오는 중...';
            if (this.detailMaterials) this.detailMaterials.innerHTML = '';

            const house = await getHouseDetail(houseId);

            this.selectedHouse = house;

            this.renderDetail(house);
        } catch (error) {
            console.error('❌ 집 상세 조회 실패:', error);

            if (this.detailStory) {
                this.detailStory.innerText = '집 정보를 불러오지 못했습니다.';
            }
        }
    }

    renderDetail(house) {
        if (this.detailImage) this.detailImage.src = house.image_url || '';
        if (this.detailNumber) this.detailNumber.innerText = `ENDING #${house.ending_number ?? '-'}`;
        if (this.detailOwner) this.detailOwner.innerText = `${house.initials || '???'}의 집`;
        if (this.detailStory) this.detailStory.innerText = house.story || '기록된 이야기가 없습니다.';
        if (this.detailLikeCount) this.detailLikeCount.innerText = house.likes || 0;

        if (this.detailMaterials) {
            this.detailMaterials.innerHTML = '';

            (house.material_names || []).forEach((material) => {
                const chip = document.createElement('span');

                chip.className = 'gallery-material-chip';
                chip.innerText = material;

                this.detailMaterials.appendChild(chip);
            });
        }
    }

    closeDetail() {
        this.detailModal?.classList.add('hidden');
        this.selectedHouse = null;
    }

    async likeSelectedHouse() {
        if (!this.selectedHouse?.house_id) return;

        try {
            const result = await likeHouse(this.selectedHouse.house_id);

            this.selectedHouse.likes = result.likes;

            if (this.detailLikeCount) {
                this.detailLikeCount.innerText = result.likes;
            }

            this.updateLocalHouseLikes(
                this.selectedHouse.house_id,
                result.likes
            );

            if (result.already_liked) {
                console.log('♥ 이미 좋아요한 집입니다.');
            } else {
                console.log('♥ 좋아요 완료');
            }

            this.renderGallery();
        } catch (error) {
            console.error('❌ 좋아요 실패:', error);
        }
    }

    async likeHouseFromCard(house, card) {
        try {
            const result = await likeHouse(house.house_id);

            house.likes = result.likes;

            this.updateLocalHouseLikes(
                house.house_id,
                result.likes
            );

            if (this.sortType === 'likes') {
                this.renderGallery();
                return;
            }

            const header = card.querySelector('.gallery-card-header');

            if (header) {
                header.innerHTML = `
                    <span>${this.escapeHtml(house.initials || '???')} · #${house.ending_number ?? '-'}</span>
                    <span>♥ ${result.likes}</span>
                `;
            }
        } catch (error) {
            console.error('❌ 좋아요 실패:', error);
        }
    }

    updateLocalHouseLikes(houseId, likes) {
        const house = this.houses.find((item) => item.house_id === houseId);

        if (house) house.likes = likes;
    }

    backToMenu() {
        this.closeDetail();

        this.galleryScreen?.classList.add('hidden');

        this.scene.start('MainMenuScene');
    }

    escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }
}