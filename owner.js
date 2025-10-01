document.addEventListener('DOMContentLoaded', () => {

    const API_URL = '/api';

    // --- DOM ELEMENTS ---
    const ownerSection = document.getElementById('owner-section');
    if (!ownerSection) return; // Don't run this script on other pages

    const authContainer = document.getElementById('auth-container');
    const loginForm = document.getElementById('login-form');
    const adminPanel = document.getElementById('admin-panel');
    const logoutBtn = document.getElementById('logout-btn');

    const productForm = document.getElementById('product-form');
    const productList = document.querySelector('#product-list tbody');
    const formTitle = document.getElementById('form-title');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const imageInput = document.getElementById('product-image');
    const imagePreview = document.getElementById('image-preview');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    
    const signupForm = document.getElementById('signup-form');
    if(signupForm) signupForm.style.display = 'none';

    const subscriberListContainer = document.getElementById('subscriber-list-container');
    const subscriberList = document.querySelector('#subscriber-list tbody');

    // --- TOGGLEABLE VIEWS ---
    const manageProductsView = document.getElementById('manage-products-view');
    const subscribersView = document.getElementById('subscribers-view');
    const toggleManageProductsBtn = document.getElementById('toggle-manage-products-btn');
    const toggleSubscribersBtn = document.getElementById('toggle-subscribers-btn');
    // --- STATE MANAGEMENT ---
    let allProducts = [];
    let currentPage = 1;
    const itemsPerPage = 10;

    // --- AUTHENTICATION ---
    const getToken = () => sessionStorage.getItem('authToken');

    function checkAuth() {
        if (getToken()) {
            showAdminPanel();
        } else {
            showLoginForm();
        }
    }

    function showAdminPanel() {
        authContainer.style.display = 'none';
        adminPanel.style.display = 'block';
        fetchProducts();
    }

    function showLoginForm() {
        authContainer.style.display = 'block';
        adminPanel.style.display = 'none';
        if(loginForm) loginForm.style.display = 'block';
    }

    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;

            try {
                const response = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();
                if (response.ok) {
                    sessionStorage.setItem('authToken', data.token);
                    showToast('Login successful!');
                    showAdminPanel();
                } else {
                    showToast(data.message || 'Invalid credentials.', 5000, 'error');
                }
            } catch (error) {
                console.error('Login Error:', error);
                showToast('An error occurred during login.', 5000, 'error');
            }
        });
    }

    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('authToken');
            showToast('Logged out successfully.');
            allProducts = [];
            checkAuth();
        });
    }

    // --- PRODUCT MANAGEMENT ---
    async function fetchProducts() {
        try {
            const response = await fetch(`${API_URL}/products`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            allProducts = await response.json();
            if (!Array.isArray(allProducts)) {
                console.error("API did not return an array for products:", allProducts);
                allProducts = [];
            }
            
            populateCategories(allProducts);
            handleFiltersAndPagination();
        } catch (error) {
            console.error('Error fetching products:', error);
            showToast('Could not load products.', 5000, 'error');
            allProducts = [];
        }
    }

    function handleFiltersAndPagination() {
        const searchTerm = document.getElementById('product-search').value.toLowerCase();
        const category = document.getElementById('category-filter').value;

        const filtered = allProducts.filter(p => 
            (p.name.toLowerCase().includes(searchTerm)) && 
            (category === 'all' || p.category === category)
        );

        const totalPages = Math.ceil(filtered.length / itemsPerPage);
        currentPage = Math.min(Math.max(1, currentPage), totalPages || 1);

        renderProductList(filtered, totalPages);
    }

    function renderProductList(products, totalPages) {
        productList.innerHTML = '';

        const paginated = products.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

        if (paginated.length === 0) {
            productList.innerHTML = '<tr><td colspan="5">No products found.</td></tr>';
        } else {
            productList.innerHTML = paginated.map(p => `
                <tr>
                    <td><img src="${p.imageurl}" alt="${p.name}" style="width: 50px; height: auto;" loading="lazy"></td>
                    <td>${p.name}</td>
                    <td>${p.category}</td>
                    <td>${p.price.toLocaleString()}</td>
                    <td class="action-buttons">
                        <button class="edit-btn" data-id="${p.id}">Edit</button>
                        <button class="delete-btn" data-id="${p.id}">Delete</button>
                    </td>
                </tr>
            `).join('');
        }
        updatePaginationControls(totalPages);
    }
    
    function updatePaginationControls(totalPages) {
        document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages || 1}`;
        document.getElementById('prev-page').disabled = currentPage === 1;
        document.getElementById('next-page').disabled = currentPage >= totalPages;
    }

    function populateCategories(products) {
        const categories = [...new Set(products.map(p => p.category))];
        const categoryFilter = document.getElementById('category-filter');
        categoryFilter.innerHTML = '<option value="all">All Categories</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoryFilter.appendChild(option);
        });
    }

    // --- SUBSCRIBER MANAGEMENT ---
    async function fetchSubscribers() {
        subscriberList.innerHTML = '<tr><td colspan="2">Loading...</td></tr>';

        try {
            const response = await fetch(`${API_URL}/subscribers`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                     showToast('Authentication error. Please log in again.', 5000, 'error');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const subscribers = await response.json();
            
            if (subscribers.length === 0) {
                subscriberList.innerHTML = '<tr><td colspan="2">No subscribers found.</td></tr>';
                return;
            }

            subscriberList.innerHTML = subscribers.map(sub => `
                <tr>
                    <td><a href="mailto:${sub.email}" title="Send email to ${sub.email}">${sub.email}</a></td>
                    <td>${new Date(sub.subscribed_at).toLocaleDateString()}</td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Error fetching subscribers:', error);
            showToast('Could not load subscribers.', 5000, 'error');
            subscriberList.innerHTML = '<tr><td colspan="2">Error loading subscribers.</td></tr>';
        }
    }

    // --- EVENT LISTENERS ---
    document.getElementById('product-search').addEventListener('input', () => { currentPage = 1; handleFiltersAndPagination(); });
    document.getElementById('category-filter').addEventListener('change', () => { currentPage = 1; handleFiltersAndPagination(); });
    document.getElementById('prev-page').addEventListener('click', () => { if(currentPage > 1) { currentPage--; handleFiltersAndPagination(); }});
    document.getElementById('next-page').addEventListener('click', () => { currentPage++; handleFiltersAndPagination(); });

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (allProducts.length === 0) {
                showToast('No products to export.', 3000, 'error');
                return;
            }
    
            const exportData = allProducts.map(({ id, ...rest }) => rest);
    
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
    
            const a = document.createElement('a');
            a.href = url;
            a.download = 'products.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
    
            showToast('Products exported successfully!');
        });
    }

    if (importBtn && importFile) {
        importBtn.addEventListener('click', () => {
            importFile.click();
        });
    
        importFile.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;
    
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const products = JSON.parse(e.target.result);
                    if (!Array.isArray(products)) {
                        showToast('Invalid file: Must be an array of products.', 5000, 'error');
                        return;
                    }
                    if (products.length === 0) {
                        showToast('JSON file is empty.', 3000, 'error');
                        return;
                    }
                    if (!confirm(`Are you sure you want to import ${products.length} products?`)) {
                        importFile.value = '';
                        return;
                    }
    
                    const response = await fetch(`${API_URL}/products/import`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${getToken()}`
                        },
                        body: JSON.stringify(products)
                    });
    
                    const data = await response.json();
                    if (response.ok) {
                        showToast(data.message || 'Import successful!');
                        fetchProducts();
                    } else {
                        showToast(data.message || 'An error occurred during import.', 5000, 'error');
                    }
                } catch (error) {
                    showToast('Invalid JSON file.', 5000, 'error');
                } finally {
                    importFile.value = '';
                }
            };
            reader.onerror = () => {
                showToast('Error reading file.', 5000, 'error');
                importFile.value = '';
            };
            reader.readAsText(file);
        });
    }

    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('product-id').value;
        const token = getToken();
        
        const formData = new FormData();
        formData.append('name', document.getElementById('product-name').value);
        formData.append('category', document.getElementById('product-category').value);
        formData.append('price', document.getElementById('product-price').value);
        formData.append('description', document.getElementById('product-description').value);
        formData.append('isFeatured', document.getElementById('product-featured').checked);
        
        if (imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }

        if (!id && !imageInput.files[0]) {
            showToast('Product image is required for new products.', 3000, 'error');
            return;
        }

        const url = id ? `${API_URL}/products/${id}` : `${API_URL}/products`;
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await response.json();
            if (response.ok) {
                showToast(data.message || 'Product saved successfully!');
                resetForm();
                fetchProducts(); // Re-fetch to show the new/updated product
            } else {
                showToast(data.message || 'An error occurred.', 5000, 'error');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            showToast('An error occurred while saving the product.', 5000, 'error');
        }
    });

    productList.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        if (e.target.classList.contains('edit-btn')) {
            const productToEdit = allProducts.find(p => p.id == id);
            if (productToEdit) editProduct(productToEdit);
        } else if (e.target.classList.contains('delete-btn')) {
            deleteProduct(id);
        }
    });

    function editProduct(product) {
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-description').value = product.description;
        document.getElementById('product-featured').checked = product.isfeatured;
        
        imagePreview.src = product.imageurl;
        imagePreview.style.display = 'block';
        
        formTitle.textContent = 'Edit Product';
        cancelEditBtn.style.display = 'inline-block';
        window.scrollTo(0, 0);
    }

    async function deleteProduct(id) {
        if (confirm('Are you sure you want to delete this product?')) {
            try {
                const response = await fetch(`${API_URL}/products/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                const data = await response.json();
                if (response.ok) {
                    showToast(data.message || 'Product deleted.');
                    fetchProducts(); // Re-fetch to update the list
                } else {
                    showToast(data.message || 'Error deleting product.', 5000, 'error');
                }
            } catch (error) {
                console.error('Delete error:', error);
                showToast('An error occurred while deleting.', 5000, 'error');
            }
        }
    }

    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    cancelEditBtn.addEventListener('click', resetForm);

    function resetForm() {
        productForm.reset();
        document.getElementById('product-id').value = '';
        imagePreview.src = '';
        imagePreview.style.display = 'none';
        formTitle.textContent = 'Add New Product';
        cancelEditBtn.style.display = 'none';
    }

    function showToast(message, duration = 3000, type = 'success') {
        const notification = document.getElementById('toast-notification');
        if (notification) {
            notification.textContent = message;
            notification.className = 'toast-notification show';
            notification.classList.add(`toast-${type}`);
            setTimeout(() => {
                notification.className = notification.className.replace("show", "");
            }, duration);
        }
    }

    // --- ADMIN PANEL TOGGLE LOGIC ---
    if (toggleManageProductsBtn) {
        toggleManageProductsBtn.addEventListener('click', () => {
            const isHidden = manageProductsView.classList.toggle('is-hidden');
            toggleManageProductsBtn.textContent = isHidden ? 'Manage Products' : 'Hide Products';
            // If we show products, hide subscribers to avoid overlap
            subscribersView.classList.add('is-hidden');
            toggleSubscribersBtn.textContent = 'View Subscribers';
        });
    }
    if (toggleSubscribersBtn) {
        toggleSubscribersBtn.addEventListener('click', () => {
            const isHidden = subscribersView.classList.toggle('is-hidden');
            toggleSubscribersBtn.textContent = isHidden ? 'View Subscribers' : 'Hide Subscribers';
            if (!isHidden) {
                fetchSubscribers(); // Fetch subscribers only when showing the view
            }
            // If we show subscribers, hide products to avoid overlap
            manageProductsView.classList.add('is-hidden');
            toggleManageProductsBtn.textContent = 'Manage Products';
        });
    }

    // --- INITIALIZE ---
    checkAuth();
});
