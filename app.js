document.addEventListener("DOMContentLoaded", () => {

  // --- HERO SLIDER ---
  if (document.querySelector('.hero-swiper')) {
    new Swiper('.hero-swiper', {
      loop: true,
      effect: 'fade',
      fadeEffect: {
        crossFade: true
      },
      /* autoplay: {
        delay: 5000,
        disableOnInteraction: false,
      }, */
      pagination: {
        el: '.hero-pagination',
        clickable: true,
      },
    });
  }

  // --- API Configuration ---
  const API_URL = "/api";
  const SERVER_URL = ""; // Base URL for server assets
  const OWNER_WHATSAPP_NUMBER = "9875152043"; // <<< IMPORTANT: Replace with the actual WhatsApp number

  // --- WISHLIST MANAGEMENT ---
  const wishlist = {
    key: 'userWishlist',
    
    // Get the wishlist from localStorage
    get() {
      return JSON.parse(localStorage.getItem(this.key)) || [];
    },

    // Save the wishlist to localStorage
    save(wishlistArray) {
      localStorage.setItem(this.key, JSON.stringify(wishlistArray));
    },

    // Add an item to the wishlist
    add(productId) {
      const currentWishlist = this.get();
      if (!currentWishlist.includes(productId)) {
        currentWishlist.push(productId);
        this.save(currentWishlist);
      }
    },

    // Remove an item from the wishlist
    remove(productId) {
      let currentWishlist = this.get();
      currentWishlist = currentWishlist.filter(id => id !== productId);
      this.save(currentWishlist);
    },

    // Check if an item is in the wishlist
    contains(productId) {
      return this.get().includes(productId);
    },

    // Toggle an item in the wishlist
    toggle(productId) {
        if (this.contains(productId)) {
            this.remove(productId);
            return false; // Not in wishlist anymore
        } else {
            this.add(productId);
            return true; // Now in wishlist
        }
    }
  };

  // --- GENERAL UI & INTERACTIONS ---

  const hamburger = document.querySelector(".hamburger");
  const navMenu = document.querySelector(".nav-menu");
  const header = document.querySelector(".header");

  // Mobile Menu
  if (hamburger) {
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("active");
      navMenu.classList.toggle("active");
      document.body.classList.toggle("no-scroll");
    });
  }

  // Sticky Header
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });

  // Scroll Animations
  const scrollObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll(".animate-on-scroll").forEach((element) => {
    scrollObserver.observe(element);
  });

  // --- PRODUCT & HOME PAGE LOGIC ---

  // Global cache for products
  let allProducts = [];

  // Fetch all products from the backend
  async function fetchProducts() {
    try {
      const response = await fetch(`${API_URL}/products`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const products = await response.json();
      allProducts = products; // Cache the products
      return products;
    } catch (error) {
      console.error("Failed to fetch products:", error);
      showToast("Could not load products from the store.", 5000, "error");
      return []; // Return empty array on error
    }
  }

  // --- HOME PAGE ---
  if (document.getElementById("featured-products-grid")) {
    const featuredGrid = document.getElementById("featured-products-grid");

    fetchProducts().then(() => {
      const featuredProducts = allProducts.filter((p) => p.isfeatured);
      if (featuredProducts.length > 0) {
        featuredGrid.innerHTML = featuredProducts
          .map((product) => createProductCard(product))
          .join("");
      } else {
        featuredGrid.innerHTML =
          "<p>No featured products available at the moment.</p>";
      }
    });

    // Testimonial Slider (remains the same)
    /* const testimonials = document.querySelectorAll(".testimonial");
    let currentTestimonial = 0;
    if (testimonials.length > 1) {
      setInterval(() => {
        testimonials[currentTestimonial].classList.remove("active");
        currentTestimonial = (currentTestimonial + 1) % testimonials.length;
        testimonials[currentTestimonial].classList.add("active");
      }, 5000);
    } */
  }

  // --- PRODUCT PAGE ---
  const productGrid = document.getElementById("product-grid");
  if (productGrid) {
    const productSearch = document.getElementById("product-search");
    const categoryFilter = document.getElementById("category-filter");
    const sortFilter = document.getElementById("sort-filter");
    const priceFilter = document.getElementById("price-filter");
    const priceMinValue = document.getElementById("price-min-value");
    const priceMaxValue = document.getElementById("price-max-value");
    const clearFiltersBtn = document.getElementById("clear-filters-btn");
    const filterToggleBtn = document.getElementById("filter-toggle-btn");
    const closeFiltersBtn = document.getElementById("close-filters-btn");
    const filterOverlay = document.getElementById("filter-overlay");

    // --- Filter Sidebar Logic ---
    const openFilterSidebar = () => {
        document.body.classList.add('filters-open');
    };

    const closeFilterSidebar = () => {
        document.body.classList.remove('filters-open');
    };

    filterToggleBtn.addEventListener('click', openFilterSidebar);
    closeFiltersBtn.addEventListener('click', closeFilterSidebar);
    filterOverlay.addEventListener('click', closeFilterSidebar);

    // Fetch products and initialize the page
    fetchProducts().then(() => {
      setupPriceFilter();
      displayProducts(allProducts);
      populateCategories(allProducts);
      handleFilters(); // Initial filter call
    });

    productSearch.addEventListener("input", handleFilters);
    categoryFilter.addEventListener("change", handleFilters);
    sortFilter.addEventListener("change", handleFilters);
    priceFilter.addEventListener("input", () => {
        priceMaxValue.textContent = `₹${Number(priceFilter.value).toLocaleString()}`;
        handleFilters();
    });
    clearFiltersBtn.addEventListener("click", clearFilters);

    function setupPriceFilter() {
        if (allProducts.length === 0) return;
        const prices = allProducts.map(p => p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        priceFilter.min = minPrice;
        priceFilter.max = maxPrice;
        priceFilter.value = maxPrice;
        priceMinValue.textContent = `₹${Number(minPrice).toLocaleString()}`;
        priceMaxValue.textContent = `₹${Number(maxPrice).toLocaleString()}`;
    }

    function handleFilters() {
      const searchTerm = productSearch.value.toLowerCase();
      const category = categoryFilter.value;
      const sort = sortFilter.value;
      const maxPrice = Number(priceFilter.value);

      let filteredProducts = allProducts.filter((product) => {
        const nameMatch = product.name.toLowerCase().includes(searchTerm);
        const categoryMatch = category === "all" || product.category === category;
        const priceMatch = product.price <= maxPrice;
        return nameMatch && categoryMatch && priceMatch;
      });

      switch (sort) {
        case "price-asc":
          filteredProducts.sort((a, b) => a.price - b.price);
          break;
        case "price-desc":
          filteredProducts.sort((a, b) => b.price - a.price);
          break;
        case "name-asc":
          filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case "name-desc":
          filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
          break;
      }

      displayProducts(filteredProducts);
    }

    function clearFilters() {
        productSearch.value = "";
        categoryFilter.value = "all";
        sortFilter.value = "default";
        setupPriceFilter();
        handleFilters();
    }
  }

  // --- WISHLIST PAGE ---
  const wishlistGrid = document.getElementById("wishlist-grid");
  if (wishlistGrid) {
    fetchProducts().then(() => {
      const wishlistedIds = wishlist.get();
      const wishlistedProducts = allProducts.filter(p => wishlistedIds.includes(p.id));
      
      const noItemsMsg = document.getElementById("no-wishlist-items-message");

      if (wishlistedProducts.length > 0) {
        wishlistGrid.innerHTML = wishlistedProducts.map(p => createProductCard(p)).join('');
        if (noItemsMsg) noItemsMsg.style.display = 'none';
      } else {
        wishlistGrid.innerHTML = '';
        if (noItemsMsg) noItemsMsg.style.display = 'block';
      }
    });
  }

  function displayProducts(products) {
    const grid = document.getElementById("product-grid");
    const noProductsMsg = document.getElementById("no-products-message");
    if (products.length > 0) {
      grid.innerHTML = products
        .map((product) => createProductCard(product))
        .join("");
      noProductsMsg.style.display = "none";
    } else {
      grid.innerHTML = "";
      noProductsMsg.style.display = "block";
    }
  }

  function populateCategories(products) {
    const categories = [...new Set(products.map((p) => p.category))];
    const categoryFilter = document.getElementById("category-filter");
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
  }

  // --- PRODUCT CARD & MODAL ---
  function createProductCard(product) {
    const isWishlisted = wishlist.contains(product.id);
    return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image-container">
                    <img src="${product.imageUrl}" alt="${
      product.name
    }" class="product-image" loading="lazy">
                    <div class="wishlist-icon ${isWishlisted ? 'wishlisted' : ''}" data-product-id="${product.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-heart"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    </div>
                </div>
                <div class="product-info">
                    <p class="product-category">${product.category}</p>
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-price">₹${Number(
                      product.price
                    ).toLocaleString()}</p>
                    <button class="btn btn-secondary quick-view-btn" data-id="${
                      product.id
                    }">Quick View</button>
                </div>
            </div>
        `;
  }

  const modal = document.getElementById("quick-view-modal");
  document.body.addEventListener("click", (e) => {
    const wishlistIcon = e.target.closest('.wishlist-icon');
    const quickViewBtn = e.target.closest('.quick-view-btn');

    // Logic for the wishlist icon
    if (wishlistIcon) {
      const productId = parseInt(wishlistIcon.dataset.productId, 10);
      if (!productId) return;

      const isWishlisted = wishlist.toggle(productId);
      
      if (isWishlisted) {
        wishlistIcon.classList.add('wishlisted');
        showToast('Added to your wishlist!');
      } else {
        wishlistIcon.classList.remove('wishlisted');
        showToast('Removed from your wishlist.');
      }
      
      return; // Stop further execution
    }

    // Logic to open the modal
    if (quickViewBtn) {
        const productId = parseInt(quickViewBtn.dataset.id, 10);
        const product = allProducts.find((p) => p.id === productId);
        if (product) {
            openQuickViewModal(product);
        }
    }

    // Logic to close the modal
    if (e.target.classList.contains("close-button") || e.target === modal) {
      modal.style.display = "none";
    }
  });

  function openQuickViewModal(product) {
    const modalBody = document.getElementById("modal-body");

    // The link to the new dedicated product page
    const productPageLink = `${window.location.origin}/product?id=${product.id}`;

    const inquiryMessage = `Hello, I'm interested in this product:\n\n*Product:* ${product.name}\n*Price:* ₹${Number(product.price).toLocaleString()}\n\nPlease provide more details. You can view the product here: ${productPageLink}`;

    const whatsappLink = `https://wa.me/${OWNER_WHATSAPP_NUMBER}?text=${encodeURIComponent(
      inquiryMessage
    )}`;

    modalBody.innerHTML = `
            <img src="${product.imageUrl}" alt="${
      product.name
    }" class="modal-image">
            <div class="modal-details">
                <h2>${product.name}</h2>
                <p class="product-category">${product.category}</p>
                <p class="product-price">₹${Number(
                  product.price
                ).toLocaleString()}</p>
                <p>${product.description}</p>
                <a href="${whatsappLink}" target="_blank" class="btn btn-primary">Inquire on WhatsApp</a>
            </div>
        `;
    modal.style.display = "block";
  }

  // --- OTHER FORMS (Newsletter, Contact) ---
  if (document.getElementById("newsletter-form")) {
    document
      .getElementById("newsletter-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById("newsletter-email");
        const email = emailInput.value;
        if (!email) return;

        try {
            const response = await fetch(`${API_URL}/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (response.ok) {
                showToast(data.message);
                emailInput.value = "";
            } else {
                showToast(data.message, 4000, 'error');
            }
        } catch (error) {
            showToast('Could not connect to the server. Please try again later.', 5000, 'error');
        }
      });
  }

  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("Contact form submitted. Starting process...");
      
      const formData = {
        name: contactForm.name.value,
        email: contactForm.email.value,
        subject: contactForm.subject.value,
        message: contactForm.message.value,
      };

      const button = e.target.querySelector('button[type="submit"]');
      
      try {
        if (button) button.disabled = true;
        console.log("Button disabled. Sending fetch request to /api/contact...");

        const response = await fetch(`/api/contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        console.log("Fetch request completed. Response status:", response.status, response.statusText);
        
        const data = await response.json();
        console.log("Response data parsed:", data);

        showToast(
          data.message || "Message sent!",
          3000,
          response.ok ? "success" : "error"
        );
        if (response.ok) {
          console.log("Response was OK. Resetting form.");
          contactForm.reset();
        } else {
          console.log("Response was not OK.");
        }
      } catch (error) {
        console.error("Contact form submission error:", error);
        showToast("Could not connect to the server. Please try again later.", 5000, "error");
      } finally {
        if (button) button.disabled = false;
        console.log("Process finished. Button re-enabled.");
      }
    });
  }

  // --- TOAST NOTIFICATION ---
  function showToast(message, duration = 3000, type = "success") {
    const notification = document.getElementById("toast-notification");
    if (notification) {
      notification.textContent = message;
      notification.className = "toast-notification show";
      notification.classList.add(`toast-${type}`);
      setTimeout(() => {
        notification.className = notification.className.replace("show", "");
      }, duration);
    }
  }
});
