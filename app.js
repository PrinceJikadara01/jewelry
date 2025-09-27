document.addEventListener("DOMContentLoaded", () => {

  // --- HERO SLIDER ---
  if (document.querySelector('.hero-swiper')) {
    new Swiper('.hero-swiper', {
      loop: true,
      effect: 'fade',
      fadeEffect: {
        crossFade: true
      },
      autoplay: {
        delay: 5000,
        disableOnInteraction: false,
      },
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
    const testimonials = document.querySelectorAll(".testimonial");
    let currentTestimonial = 0;
    if (testimonials.length > 1) {
      setInterval(() => {
        testimonials[currentTestimonial].classList.remove("active");
        currentTestimonial = (currentTestimonial + 1) % testimonials.length;
        testimonials[currentTestimonial].classList.add("active");
      }, 5000);
    }
  }

  // --- PRODUCT PAGE ---
  const productGrid = document.getElementById("product-grid");
  if (productGrid) {
    // Fetch products and initialize the page
    fetchProducts().then(() => {
      displayProducts(allProducts);
      populateCategories(allProducts);
    });

    document
      .getElementById("product-search")
      .addEventListener("input", handleFilters);
    document
      .getElementById("category-filter")
      .addEventListener("change", handleFilters);
    document
      .getElementById("sort-filter")
      .addEventListener("change", handleFilters);

    function handleFilters() {
      const searchTerm = document
        .getElementById("product-search")
        .value.toLowerCase();
      const category = document.getElementById("category-filter").value;
      const sort = document.getElementById("sort-filter").value;

      let filteredProducts = allProducts.filter((product) => {
        const nameMatch = product.name.toLowerCase().includes(searchTerm);
        const categoryMatch =
          category === "all" || product.category === category;
        return nameMatch && categoryMatch;
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
    return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image-container">
                    <img src="${product.imageurl}" alt="${
      product.name
    }" class="product-image" loading="lazy">
                    <div class="wishlist-icon">
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
      wishlistIcon.classList.toggle('wishlisted');
      // Here you would typically also add/remove the item from a wishlist array or backend
      return; // Stop further execution to prevent modal from opening
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
            <img src="${product.imageurl}" alt="${
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
