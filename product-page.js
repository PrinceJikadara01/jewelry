document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api';
    const OWNER_WHATSAPP_NUMBER = '9875152043'; // Make sure this is correct

    const productDetailSection = document.getElementById('product-detail-section');

    async function loadProduct() {
        const params = new URLSearchParams(window.location.search);
        const productId = params.get('id');

        if (!productId) {
            productDetailSection.innerHTML = '<p class="error-text">No product ID provided. Please go back to the products page.</p>';
            return;
        }

        try {
            const response = await fetch(`${API_URL}/products/${productId}`);
            if (!response.ok) {
                throw new Error('Product not found.');
            }
            const product = await response.json();
            renderProduct(product);
        } catch (error) {
            console.error('Failed to load product:', error);
            productDetailSection.innerHTML = `<p class="error-text">Sorry, we couldn't find the product you're looking for.</p>`;
        }
    }

    function renderProduct(product) {
        // Update page title for better SEO and user experience
        document.title = `${product.name} - Aethelred`;

        // Construct the WhatsApp message
        const inquiryMessage = `Hello, I'm interested in this product:

*Product:* ${product.name}
*Price:* ₹${Number(product.price).toLocaleString()}

You can view it here: ${window.location.href}`;

        const whatsappLink = `https://wa.me/${OWNER_WHATSAPP_NUMBER}?text=${encodeURIComponent(inquiryMessage)}`;

        // Populate the product detail section with the product's data
        productDetailSection.innerHTML = `
            <div class="product-detail-layout">
                <div class="product-detail-image">
                    <img src="${product.imageurl}" alt="${product.name}">
                </div>
                <div class="product-detail-info">
                    <p class="product-category">${product.category}</p>
                    <h1>${product.name}</h1>
                    <p class="product-price">₹${Number(product.price).toLocaleString()}</p>
                    <p class="product-description">${product.description || 'No description available.'}</p>
                    <a href="${whatsappLink}" target="_blank" class="btn btn-primary">Inquire on WhatsApp</a>
                </div>
            </div>
        `;
    }

    // --- INITIALIZE ---
    loadProduct();
});