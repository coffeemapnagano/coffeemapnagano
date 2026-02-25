/* ===========================================
   COFFEEMAP NAGANO - Application Logic
   =========================================== */

// ─── 定数 ─────────────────────────────────
const ONLINE_EVENT_REGION = 'ONLINE\u3001EVENT\u51FA\u5E97\u30E1\u30A4\u30F3';

// ─── SVGアイコン定義 ───────────────────────
const ICONS = {
    heart: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
    instagram: '<svg class="has-link" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>',
    shop: '<svg class="has-link" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    mapPin: '<svg class="has-link" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
};

// ─── DOM要素取得 ──────────────────────────
const elements = {
    loader: document.getElementById('loader'),
    viewHome: document.getElementById('view-home'),
    viewList: document.getElementById('view-list'),
    cafeGrid: document.getElementById('cafeGrid'),
    noResults: document.getElementById('noResults'),
    resultTitle: document.getElementById('resultTitle'),
    resultCount: document.getElementById('resultCount'),
    totalCountDisplay: document.getElementById('totalCountDisplay'),
    totalCountFooter: document.getElementById('totalCountFooter'),
    keywordInput: document.getElementById('keywordInput'),
    favHomeBtn: document.getElementById('favHomeBtn'),
    favCountHome: document.getElementById('favCountHome'),
    scrollTopBtn: document.getElementById('scrollTopBtn'),
    filterOnline: document.getElementById('filterOnline'),
    filterFav: document.getElementById('filterFav'),
    // Modals
    cityModal: document.getElementById('cityModal'),
    menuModal: document.getElementById('menuModal'),
    detailModal: document.getElementById('detailModal'),
    modalContent: document.getElementById('modalContent'),
    // City Modal Internal
    regionView: document.getElementById('regionView'),
    cityView: document.getElementById('cityView'),
    regionButtonsContainer: document.getElementById('regionButtonsContainer'),
    cityListContainer: document.getElementById('cityListContainer'),
    cityModalTitle: document.getElementById('cityModalTitle'),
};

// ─── お気に入り管理（LocalStorage）─────────
let favorites = JSON.parse(localStorage.getItem('coffeemap_favorites') || '[]');

function saveFavorites() {
    localStorage.setItem('coffeemap_favorites', JSON.stringify(favorites));
}
function isFav(id) {
    return favorites.includes(id);
}
function toggleFav(id, e) {
    if (e) e.stopPropagation();
    if (isFav(id)) {
        favorites = favorites.filter(f => f !== id);
    } else {
        favorites.push(id);
    }
    saveFavorites();
    updateFavUI();
    document.querySelectorAll(`.fav-btn[data-id="${id}"]`).forEach(btn => {
        btn.classList.toggle('active', isFav(id));
    });
}
function updateFavUI() {
    const count = favorites.length;
    elements.favCountHome.textContent = count;
    elements.favHomeBtn.classList.toggle('hidden', count === 0);
}

// ─── 状態管理 ─────────────────────────────
let state = {
    region: 'all',
    city: 'all',
    keyword: '',
    filterOnline: false,
    filterFav: false
};

// ─── 初期化 ──────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    elements.totalCountDisplay.textContent = cafes.length;
    elements.totalCountFooter.textContent = cafes.length;
    updateFavUI();
    checkHash();

    // ローディング終了
    setTimeout(() => {
        elements.loader.style.opacity = '0';
        setTimeout(() => { elements.loader.style.display = 'none'; }, 500);
    }, 800);
});

// ─── 検索入力（リアルタイム＋Enter対応）─────
let searchTimer = null;

elements.keywordInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        state.keyword = e.target.value;
        if (state.keyword.length > 0) {
            state.region = 'all';
            state.city = 'all';
            executeSearch('キーワード検索');
        }
    }, 300);
});

elements.keywordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        clearTimeout(searchTimer);
        state.keyword = e.target.value;
        state.region = 'all';
        state.city = 'all';
        executeSearch('キーワード検索');
    }
});

// ─── フィルター制御 ──────────────────────
function toggleFilter(type) {
    if (type === 'online') {
        state.filterOnline = !state.filterOnline;
        elements.filterOnline.classList.toggle('active', state.filterOnline);
    } else if (type === 'fav') {
        state.filterFav = !state.filterFav;
        elements.filterFav.classList.toggle('active', state.filterFav);
    }
    executeSearch(elements.resultTitle.textContent);
}

function showFavorites() {
    state.filterFav = true;
    state.filterOnline = false;
    state.region = 'all';
    state.city = 'all';
    state.keyword = '';
    elements.filterFav.classList.add('active');
    elements.filterOnline.classList.remove('active');
    executeSearch('お気に入り');
}

// ─── ビュー制御 ──────────────────────────
function goHome() {
    window.scrollTo(0, 0);
    elements.viewList.classList.remove('active');
    elements.viewHome.classList.add('active');
    history.replaceState(null, '', window.location.pathname);

    state = { region: 'all', city: 'all', keyword: '', filterOnline: false, filterFav: false };
    elements.keywordInput.value = '';
    elements.filterOnline.classList.remove('active');
    elements.filterFav.classList.remove('active');
    updateFavUI();
}

function showList() {
    elements.viewHome.classList.remove('active');
    elements.viewList.classList.add('active');
    window.scrollTo(0, 0);
}

// ─── 検索実行 ────────────────────────────
function executeSearch(titleOverride) {
    let filtered = cafes.filter(cafe => {
        const matchRegion = state.region === 'all' || cafe.region === state.region;
        const matchCity = state.city === 'all' || cafe.city === state.city;
        const searchLower = state.keyword.toLowerCase();
        const matchKeyword = !state.keyword ||
            cafe.name.toLowerCase().includes(searchLower) ||
            cafe.tags.some(tag => tag.includes(searchLower)) ||
            cafe.city.includes(searchLower) ||
            cafe.region.includes(searchLower);
        const matchOnline = !state.filterOnline || (cafe.onlineStoreUrl && cafe.onlineStoreUrl !== '');
        const matchFav = !state.filterFav || isFav(cafe.id);
        return matchRegion && matchCity && matchKeyword && matchOnline && matchFav;
    });

    if (titleOverride) {
        elements.resultTitle.textContent = titleOverride;
    } else if (state.city !== 'all') {
        elements.resultTitle.textContent = state.city;
    } else if (state.region !== 'all') {
        elements.resultTitle.textContent = state.region;
    } else {
        elements.resultTitle.textContent = "All Spots";
    }

    elements.resultCount.textContent = `${filtered.length} 件`;
    renderCafes(filtered);
    showList();
}

function searchRandom() {
    const randomCafe = cafes[Math.floor(Math.random() * cafes.length)];
    openModal(randomCafe.id);
}

// ─── ショップラベル自動判定 ────────────────
function getShopLabel(cafe) {
    if (cafe.region === ONLINE_EVENT_REGION) {
        return { text: 'ONLINE\u3001EVENT\u51FA\u5E97\u30E1\u30A4\u30F3\u7B49', css: 'badge-default' };
    }
    return { text: cafe.city, css: '' };
}

// ─── リストレンダリング ──────────────────
function renderCafes(data) {
    elements.cafeGrid.innerHTML = '';

    if (data.length === 0) {
        elements.noResults.classList.remove('hidden');
    } else {
        elements.noResults.classList.add('hidden');

        data.forEach((cafe, index) => {
            const card = document.createElement('article');
            card.className = 'bg-white p-6 border border-[#E6E2DD] hover:border-[#43342E] transition-all cursor-pointer group fade-in-up';
            card.style.animationDelay = `${index * 50}ms`;
            card.onclick = () => openModal(cafe.id);

            const hasIg = cafe.instagramUrl && cafe.instagramUrl !== '';
            const hasShop = cafe.onlineStoreUrl && cafe.onlineStoreUrl !== '';
            const hasMap = cafe.googleMapUrl && cafe.googleMapUrl !== '';
            const favActive = isFav(cafe.id) ? 'active' : '';
            const label = getShopLabel(cafe);

            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <span class="text-[10px] tracking-widest uppercase font-bold border px-2 py-0.5 rounded-full font-sans ${label.css || 'text-[#6B8E23] border-[#6B8E23]'}">${label.text}</span>
                    <div class="flex items-center gap-2">
                        <span class="fav-btn ${favActive}" data-id="${cafe.id}" onclick="toggleFav(${cafe.id}, event)">
                            ${ICONS.heart}
                        </span>
                    </div>
                </div>
                <h3 class="text-lg serif font-bold text-[#43342E] mb-1 group-hover:text-[#6B8E23] transition-colors leading-snug">${cafe.name}</h3>
                <p class="text-xs text-[#8D8075] font-medium font-sans truncate mb-3">${cafe.nameEn}</p>
                <div class="card-icons">
                    ${hasIg ? ICONS.instagram : ''}
                    ${hasShop ? ICONS.shop : ''}
                    ${hasMap ? ICONS.mapPin : ''}
                </div>
            `;
            elements.cafeGrid.appendChild(card);
        });
    }
}

// ─── モーダル: エリア選択 ─────────────────
function openCityModal() {
    showRegionView();
    renderRegionButtons();
    elements.cityModal.classList.remove('translate-y-full');
    document.body.style.overflow = 'hidden';
}

function closeCityModal() {
    elements.cityModal.classList.add('translate-y-full');
    document.body.style.overflow = '';
}

function showRegionView() {
    elements.regionView.classList.remove('hidden');
    elements.cityView.classList.add('hidden');
    elements.cityModalTitle.textContent = "エリアを選択";
}

function renderRegionButtons() {
    elements.regionButtonsContainer.innerHTML = '';
    OFFICIAL_REGIONS.forEach(region => {
        const count = cafes.filter(c => c.region === region).length;
        const btn = document.createElement('button');
        btn.className = `w-full text-left py-4 px-2 border-b border-[#E6E2DD] flex justify-between items-center group hover:bg-gray-50 transition-colors`;
        btn.onclick = () => showCityView(region);
        btn.innerHTML = `
            <span class="text-base serif font-medium text-[#43342E]">${region}</span>
            <div class="flex items-center gap-2">
                <span class="text-[10px] text-[#8D8075] font-medium">${count}件</span>
                <i data-lucide="chevron-right" class="w-4 h-4 text-gray-400 group-hover:text-[#43342E]"></i>
            </div>
        `;
        elements.regionButtonsContainer.appendChild(btn);
    });
    lucide.createIcons();
}

function showCityView(region) {
    if (region === "ONLINE\u3001EVENT\u51FA\u5E97\u30E1\u30A4\u30F3") {
        selectArea(region, 'all');
        return;
    }
    elements.regionView.classList.add('hidden');
    elements.cityView.classList.remove('hidden');
    elements.cityModalTitle.textContent = region;

    elements.cityListContainer.innerHTML = '';

    // 全域ボタン
    const regionCount = cafes.filter(c => c.region === region).length;
    const allBtn = document.createElement('button');
    allBtn.className = "w-full text-left py-3 px-4 mb-2 bg-[#43342E] text-white font-medium serif text-sm tracking-widest flex justify-between items-center";
    allBtn.innerHTML = `<span>${region} 全域</span><span class="text-xs opacity-70">${regionCount}件</span>`;
    allBtn.onclick = () => selectArea(region, 'all');
    elements.cityListContainer.appendChild(allBtn);

    // 市区町村ボタン
    const cityArray = CITY_DATA[region] || [];
    cityArray.forEach(city => {
        const cityCount = cafes.filter(c => c.region === region && c.city === city).length;
        const btn = document.createElement('button');
        btn.className = "w-full text-left py-3 px-2 border-b border-[#E6E2DD] text-sm text-[#43342E] hover:text-[#6B8E23] transition-colors flex justify-between items-center";
        btn.innerHTML = `<span>${city}</span>${cityCount > 0 ? `<span class="text-[10px] text-[#8D8075]">${cityCount}件</span>` : ''}`;
        btn.onclick = () => selectArea(region, city);
        elements.cityListContainer.appendChild(btn);
    });
    lucide.createIcons();
}

function selectArea(region, city) {
    state.region = region;
    state.city = city;
    state.keyword = '';
    closeCityModal();
    executeSearch();
}

// ─── モーダル: 店舗詳細 ──────────────────
function openModal(id) {
    const cafe = cafes.find(c => c.id === id);
    if (!cafe) return;

    history.pushState({ shopId: id }, '', `#shop-${id}`);

    let mapBtn = '';
    if (cafe.googleMapUrl && cafe.googleMapUrl !== "") {
        const mapLink = cafe.googleMapUrl;
        mapBtn = `
        <a href="${mapLink}" target="_blank" class="flex items-center justify-between w-full p-4 bg-[#43342E] text-white hover:bg-[#2C2420] transition-colors group">
            <div class="flex items-center gap-3">
                <i data-lucide="map-pin" class="w-5 h-5"></i>
                <span class="text-xs font-bold tracking-widest eng-font">GOOGLE MAPS</span>
            </div>
            <i data-lucide="arrow-up-right" class="w-4 h-4 text-white/50 group-hover:text-white"></i>
        </a>`;
    }

    let instagramBtn = '';
    if (cafe.instagramUrl) {
        instagramBtn = `
        <a href="${cafe.instagramUrl}" target="_blank" class="flex items-center justify-between w-full p-4 border border-[#E6E2DD] bg-white hover:border-[#43342E] transition-colors group">
            <div class="flex items-center gap-3">
                <i data-lucide="instagram" class="w-5 h-5 text-[#43342E]"></i>
                <span class="text-xs font-bold tracking-widest eng-font">INSTAGRAM</span>
            </div>
            <i data-lucide="arrow-up-right" class="w-4 h-4 text-gray-300 group-hover:text-[#43342E]"></i>
        </a>`;
    }

    let onlineStoreBtn = '';
    if (cafe.onlineStoreUrl) {
        onlineStoreBtn = `
        <a href="${cafe.onlineStoreUrl}" target="_blank" class="flex items-center justify-between w-full p-4 border border-[#E6E2DD] bg-white hover:border-[#43342E] transition-colors group">
            <div class="flex items-center gap-3">
                <i data-lucide="shopping-bag" class="w-5 h-5 text-[#43342E]"></i>
                <span class="text-xs font-bold tracking-widest eng-font">ONLINE STORE</span>
            </div>
            <i data-lucide="arrow-up-right" class="w-4 h-4 text-gray-300 group-hover:text-[#43342E]"></i>
        </a>`;
    }

    const favActive = isFav(cafe.id) ? 'active' : '';
    const label = getShopLabel(cafe);

    elements.modalContent.innerHTML = `
    <div class="mb-10 text-center">
         <span class="inline-block px-3 py-1 mb-4 text-[10px] tracking-widest border rounded-full uppercase font-bold ${label.css || 'text-[#6B8E23] border-[#6B8E23]'}">${label.text}</span>
        <h2 class="text-2xl md:text-3xl serif font-medium text-[#43342E] mb-2 leading-tight">${cafe.name}</h2>
        <p class="text-xs text-[#8D8075] eng-font tracking-wider italic">${cafe.nameEn}</p>
        
        <div class="flex justify-center gap-4 mt-6">
            <button onclick="toggleFav(${cafe.id})" class="fav-btn ${favActive} flex items-center gap-2 px-4 py-2 border border-[#E6E2DD] rounded-full text-xs" data-id="${cafe.id}">
                ${ICONS.heart}
                お気に入り
            </button>
            <button onclick="shareShop(${cafe.id})" class="flex items-center gap-2 px-4 py-2 border border-[#E6E2DD] rounded-full text-xs hover:border-[#43342E] transition-colors">
                <i data-lucide="share-2" class="w-4 h-4"></i>
                シェア
            </button>
        </div>
    </div>
    
    <div class="space-y-4 max-w-sm mx-auto pb-10">
        ${instagramBtn}
        ${onlineStoreBtn}
        ${mapBtn}
    </div>
    `;

    lucide.createIcons();
    elements.detailModal.classList.remove('translate-y-full');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    elements.detailModal.classList.add('translate-y-full');
    document.body.style.overflow = '';
    if (window.location.hash.startsWith('#shop-')) {
        history.replaceState(null, '', window.location.pathname);
    }
}

// ─── シェア機能 ──────────────────────────
function shareShop(id) {
    const cafe = cafes.find(c => c.id === id);
    if (!cafe) return;
    const url = window.location.origin + window.location.pathname + '#shop-' + id;
    const text = `${cafe.name} | COFFEEMAP NAGANO`;
    if (navigator.share) {
        navigator.share({ title: text, url: url }).catch(() => { });
    } else {
        navigator.clipboard.writeText(url).then(() => {
            alert('リンクをコピーしました');
        });
    }
}

// ─── URLハッシュルーティング ────────────────
function checkHash() {
    const hash = window.location.hash;
    if (hash.startsWith('#shop-')) {
        const id = parseInt(hash.replace('#shop-', ''));
        if (id) openModal(id);
    }
}

window.addEventListener('popstate', () => {
    if (window.location.hash.startsWith('#shop-')) {
        checkHash();
    } else {
        elements.detailModal.classList.add('translate-y-full');
        document.body.style.overflow = '';
    }
});

// ─── スクロールトップボタン ────────────────
window.addEventListener('scroll', () => {
    elements.scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
});

// ─── ESCキーで閉じる ─────────────────────
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!elements.detailModal.classList.contains('translate-y-full')) { closeModal(); return; }
        if (!elements.cityModal.classList.contains('translate-y-full')) { closeCityModal(); return; }
        if (!elements.menuModal.classList.contains('pointer-events-none')) { closeMenuModal(); return; }
        if (!document.getElementById('aboutModal').classList.contains('translate-y-full')) { closeAboutModal(); return; }
        if (!document.getElementById('contactModal').classList.contains('translate-y-full')) { closeContactModal(); return; }
        if (!document.getElementById('privacyModal').classList.contains('translate-y-full')) { closePrivacyModal(); return; }
    }
});

// ─── モーダル: メニュー ──────────────────
function openMenuModal() {
    elements.menuModal.classList.remove('opacity-0', 'pointer-events-none');
}
function closeMenuModal() {
    elements.menuModal.classList.add('opacity-0', 'pointer-events-none');
}

// ─── モーダル: その他（About / Contact / Privacy）
const openAboutModal = () => { document.getElementById('aboutModal').classList.remove('translate-y-full'); document.body.style.overflow = 'hidden'; }
const closeAboutModal = () => { document.getElementById('aboutModal').classList.add('translate-y-full'); document.body.style.overflow = ''; }

const openContactModal = () => { document.getElementById('contactModal').classList.remove('translate-y-full'); document.body.style.overflow = 'hidden'; }
const closeContactModal = () => { document.getElementById('contactModal').classList.add('translate-y-full'); document.body.style.overflow = ''; }

const openPrivacyModal = () => { document.getElementById('privacyModal').classList.remove('translate-y-full'); document.body.style.overflow = 'hidden'; }
const closePrivacyModal = () => { document.getElementById('privacyModal').classList.add('translate-y-full'); document.body.style.overflow = ''; }
