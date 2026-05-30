let products = [];

function normalizeImageUrl(url) {
    if (!url) return '';
    try {
        // Extract ID from various Google Drive URL formats
        let id = '';
        
        // Format 1: https://lh3.googleusercontent.com/d/{ID}
        if (url.includes('lh3.googleusercontent.com/d/')) {
            id = url.match(/lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]+)/)?.[1];
        }
        // Format 2: https://drive.google.com/file/d/{ID}
        else if (url.includes('/file/d/')) {
            id = url.match(/\/file\/d\/([A-Za-z0-9_-]+)/)?.[1];
        }
        // Format 3: https://drive.google.com/open?id={ID}
        else if (url.includes('id=')) {
            id = url.match(/id=([A-Za-z0-9_-]+)/)?.[1];
        }
        
        // Convert to official Google Drive direct-view URL
        if (id) {
            return `https://drive.google.com/uc?export=view&id=${id}`;
        }
        
        return url;
    } catch (e) {
        return url;
    }
}

function ensureAbsoluteUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return 'https://' + url.replace(/^\/+/, '');
}

async function loadProducts() {
    try {
        const response = await fetch('data/tabel_produk_rows.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        products = await response.json();
        console.debug('Loaded products count:', products.length);
        renderProducts();
    } catch (error) {
        console.warn('Fetch failed, falling back to embedded data or local file:', error);
        products = window.__PRODUCTS || [];
        if (products.length === 0) {
            const grid = document.getElementById('product-grid');
            if (grid) grid.innerHTML = '<p class="text-center text-gray-500">Gagal memuat produk. Jalankan server lokal (Live Server) atau periksa data.</p>';
            return;
        }
        console.debug('Fallback products count:', products.length);
        renderProducts();
    }
}

const cartKey = 'warung-bu-wardono-cart';
let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');

const parsePrice = value => Number(String(value).replace(/[^0-9]/g, '')) || 0;
const formatPrice = value => 'Rp' + value.toLocaleString('id-ID');

const saveCart = () => localStorage.setItem(cartKey, JSON.stringify(cart));

const getCartTotal = () => cart.reduce((sum, item) => sum + parsePrice(item.harga) * item.quantity, 0);
const getCartItemsCount = () => cart.reduce((sum, item) => sum + item.quantity, 0);

const renderCompare = () => {
    const compareSection = document.getElementById('compare-section');
    const compareTable = document.getElementById('compare-table');
    if (!compareSection || !compareTable) return;

    if (cart.length < 2) {
        compareSection.classList.add('hidden');
        compareTable.innerHTML = '';
        return;
    }

    compareSection.classList.remove('hidden');
    compareTable.innerHTML = `
        <table class="w-full text-left text-sm text-gray-700">
            <thead>
                <tr class="border-b border-gray-200">
                    <th class="py-3">Produk</th>
                    <th class="py-3">Harga</th>
                    <th class="py-3">Kategori / Varian</th>
                    <th class="py-3">Mitra</th>
                </tr>
            </thead>
            <tbody>
                ${cart.map(item => `
                    <tr class="border-b border-gray-100">
                        <td class="py-3 font-semibold">${item.nama_produk}</td>
                        <td class="py-3 text-[#FF5F1F]">${item.harga}</td>
                        <td class="py-3">${item.kategori}</td>
                        <td class="py-3">${item.sekolah}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
};

const renderCart = () => {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const cartTotalCount = document.getElementById('cart-total-count');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const cartEmpty = document.getElementById('cart-empty');
    const cartSummary = document.getElementById('cart-summary');

    if (!cartItemsContainer || !cartCount || !cartTotalCount || !cartTotalPrice || !cartEmpty || !cartSummary) {
        return;
    }

    cartItemsContainer.innerHTML = '';
    if (cart.length === 0) {
        cartEmpty.classList.remove('hidden');
        cartSummary.classList.add('hidden');
        document.getElementById('compare-section')?.classList.add('hidden');
    } else {
        cartEmpty.classList.add('hidden');
        cartSummary.classList.remove('hidden');

        cart.forEach(item => {
            const imgUrl = normalizeImageUrl(item.foto_url || '');
            let imgSrc = imgUrl ? imgUrl : 'https://via.placeholder.com/120x120?text=' + encodeURIComponent(item.nama_produk);
            imgSrc = ensureAbsoluteUrl(imgSrc);
            console.debug('Cart image for', item.nama_produk, '->', imgSrc);
            const itemCard = document.createElement('div');
            itemCard.className = 'rounded-[1.75rem] border border-gray-200 bg-white p-4 shadow-sm';
            itemCard.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="h-16 w-16 rounded-3xl overflow-hidden bg-gray-100">
                        <img src="${imgSrc}" alt="${item.nama_produk}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='https://via.placeholder.com/120x120?text=' + encodeURIComponent('${item.nama_produk}')">
                    </div>
                    <div class="flex-1">
                        <p class="font-semibold text-gray-800">${item.nama_produk}</p>
                        <p class="text-sm text-gray-500">${item.kategori} • ${item.sekolah}</p>
                        <p class="mt-2 text-sm font-semibold text-[#FF5F1F]">${item.harga} x ${item.quantity}</p>
                    </div>
                </div>
                <div class="mt-4 flex items-center justify-between gap-3 text-sm">
                    <div class="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2">
                        <button class="text-[#FF5F1F]" onclick="updateItemQuantity('${item.product_id}', ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button class="text-[#FF5F1F]" onclick="updateItemQuantity('${item.product_id}', ${item.quantity + 1})">+</button>
                    </div>
                    <button class="rounded-full border border-gray-200 px-4 py-2 text-gray-600 hover:bg-gray-100" onclick="removeFromCart('${item.product_id}')">Hapus</button>
                </div>
            `;
            cartItemsContainer.appendChild(itemCard);
        });
        cartTotalCount.textContent = getCartItemsCount();
        cartTotalPrice.textContent = formatPrice(getCartTotal());
        renderCompare();
    }
    cartCount.textContent = getCartItemsCount();
};

window.addToCart = productId => {
    const product = products.find(item => item.product_id === productId);
    if (!product) return;
    const existing = cart.find(item => item.product_id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    saveCart();
    renderCart();
    toggleCart(true);
};

window.updateItemQuantity = (productId, quantity) => {
    const item = cart.find(item => item.product_id === productId);
    if (!item) return;
    if (quantity < 1) {
        cart = cart.filter(item => item.product_id !== productId);
    } else {
        item.quantity = quantity;
    }
    saveCart();
    renderCart();
};

window.removeFromCart = productId => {
    cart = cart.filter(item => item.product_id !== productId);
    saveCart();
    renderCart();
};

const checkoutViaWA = () => {
    if (cart.length === 0) return;
    const summary = cart.map(item => `${item.quantity}x ${item.nama_produk} (${item.harga})`).join('%0A');
    const total = formatPrice(getCartTotal());
    const message = `Halo, saya ingin memesan:%0A${summary}%0A%0ATotal: ${total}`;
    window.open(`https://wa.me/6281246331660?text=${message}`, '_blank');
};

const toggleCart = (show) => {
    const cartPanel = document.getElementById('cart-panel');
    if (!cartPanel) return;
    cartPanel.classList.toggle('hidden', !show);
    if (show) renderCart();
};

const renderProducts = () => {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';

    products.forEach(product => {
        const card = document.createElement('article');
        card.className = 'product-card overflow-hidden rounded-[1.75rem] bg-white p-5 shadow-sm border border-gray-100';

        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'mb-4 h-40 rounded-[1.5rem] bg-gray-100 relative overflow-hidden';
        const imageUrl = normalizeImageUrl(product.foto_url || '');
        let imgSrc = imageUrl ? imageUrl : 'https://via.placeholder.com/360x240?text=' + encodeURIComponent(product.nama_produk);
        imgSrc = ensureAbsoluteUrl(imgSrc);
        console.debug('Product image for', product.nama_produk, '->', imgSrc);
        imageWrapper.innerHTML = `<img src="${imgSrc}" alt="${product.nama_produk}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='https://via.placeholder.com/360x240?text=' + encodeURIComponent('${product.nama_produk}')">`;

        const badge = document.createElement('span');
        const categoryLower = (product.kategori || '').toLowerCase();
        badge.className = `category-badge ${categoryLower}`;
        badge.textContent = product.kategori ? product.kategori.charAt(0).toUpperCase() + product.kategori.slice(1) : 'Lainnya';
        imageWrapper.appendChild(badge);

        const title = document.createElement('p');
        title.className = 'text-sm font-semibold text-gray-700';
        title.textContent = product.nama_produk;

        const price = document.createElement('p');
        price.className = 'price-tag mt-2 text-lg font-bold';
        price.textContent = product.harga;

        const desc = document.createElement('p');
        desc.className = 'mt-3 text-sm text-gray-500';
        desc.textContent = `Stok: ${product.stok || 0}`;

        const button = document.createElement('button');
        button.className = 'mt-6 w-full rounded-3xl bg-[#2D3436] py-3 text-sm text-white transition hover:bg-black';
        button.textContent = 'Tambah ke Keranjang';
        button.addEventListener('click', () => addToCart(product.product_id));

        card.append(imageWrapper, title, price, desc, button);
        grid.appendChild(card);
    });
};

window.addEventListener('DOMContentLoaded', () => {
    const cartToggle = document.getElementById('cart-toggle');
    const checkoutButton = document.getElementById('checkout-button');
    const clearCartButton = document.getElementById('clear-cart-button');

    cartToggle?.addEventListener('click', () => toggleCart(true));
    clearCartButton?.addEventListener('click', () => {
        cart = [];
        saveCart();
        renderCart();
    });
    checkoutButton?.addEventListener('click', checkoutViaWA);

    loadProducts();
    renderCart();
});
