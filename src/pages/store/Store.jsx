import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './store.module.css';
import { useCart } from 'react-use-cart';
import { db } from '../../firebase';
import { collection, getDocs, doc, getDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import NavBar from "../../components/NavBar";
import Footer from '../../components/Footer';
import { FiSearch, FiX, FiShoppingCart, FiTag, FiChevronRight, FiTrash, FiHeart, FiStar } from 'react-icons/fi';
import ProductModal from './ProductModal';
import raquetesimg from '../../assets/images/raquetesimg.png';
import garrafaimg from '../../assets/images/garrafaimg.jpg';
import conjuntosimg from '../../assets/images/conjuntosimg.jpg';
// Importe as imagens das marcas
import mormaiiLogo from '../../assets/images/marcas/mormai.png';
import sharkLogo from '../../assets/images/marcas/shark.png';
import altogiroLogo from '../../assets/images/marcas/altoGiro.png';
import dropshotLogo from '../../assets/images/marcas/dropShot.png';
import wilsonLogo from '../../assets/images/marcas/wilson.png';
import atleta from '../../assets/images/atleta.jpg';
import { useModal } from '../../contexts/ModalContext';
import { LoginModal } from '../login/Login';

function Store() {
  const { addItem, items, removeItem, updateItemQuantity, cartTotal, emptyCart } = useCart();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [openProductModal, setOpenProductModal] = useState(false);
  const [openCartModal, setOpenCartModal] = useState(false);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  //estados ofertas do dia
  const [dailyDeals, setDailyDeals] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [mobileBestSellers, setMobileBestSellers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(12);
  const [bermudaShortProducts, setBermudaShortProducts] = useState([]);
  const [bermudaProducts, setBermudaProducts] = useState([]);

  const navigate = useNavigate();
  const { loginOpen, closeLogin } = useModal();

  const getCurrentProducts = useCallback(() => {
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    return filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  }, [currentPage, productsPerPage, filteredProducts]);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Efeito para rolar para o topo ao mudar de página
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, [currentPage]);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 5000);
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } else {
        // Se o usuário deslogou, limpa o carrinho.
        emptyCart();
      }
    });
    return () => unsubscribe();
  }, [emptyCart]);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const productsQuery = query(
          collection(db, "products"),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(productsQuery);
        const productsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          variations: doc.data().variations || [],
        }));
        
        setProducts(productsData);
        setFilteredProducts(productsData);

        if (productsData.length > 3) {
          setDailyDeals(productsData.slice(0, 1)); // 1 produto para oferta do dia
          setBestSellers(productsData.slice(1, 4)); // 3 produtos para mais vendidos
          setMobileBestSellers(productsData.slice(1, 3)); // 2 produtos para mobile
        }

        const uniqueCategories = [...new Set(productsData.map(p => p.category).filter(Boolean))];
        setCategories(uniqueCategories);
      } catch (error) {
        showToast('Erro ao carregar produtos', 'error');
      }
    }
    fetchProducts();
  }, [showToast]);

  useEffect(() => {
    const filtered = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
      const matchesPrice = (minPrice ? product.salePrice >= parseFloat(minPrice) : true) &&
                          (maxPrice ? product.salePrice <= parseFloat(maxPrice) : true);
      const isEnabled = product.enabled !== false; // Só mostra produtos ativos

      return matchesSearch && matchesCategory && matchesPrice && isEnabled;
    });
    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, minPrice, maxPrice, products]);

  const clearFilters = () => {
    setSearchTerm('');
    setMinPrice('');
    setMaxPrice('');
    setSelectedCategory('');
    showToast('Filtros limpos com sucesso!', 'success');
  };

  const handleAddToCart = (productWithDetails) => {
    // Normaliza a representação da cor para criar um id consistente
    const colorKey = Array.isArray(productWithDetails.variation?.color)
      ? productWithDetails.variation.color.map(c => c?.name || c?.hex || JSON.stringify(c)).join('-')
      : (productWithDetails.variation?.color && typeof productWithDetails.variation.color === 'object')
        ? (productWithDetails.variation.color.name || productWithDetails.variation.color.hex || JSON.stringify(productWithDetails.variation.color))
        : String(productWithDetails.variation?.color || '');

    addItem({
      ...productWithDetails,
      id: `${productWithDetails.id}-${colorKey}-${productWithDetails.variation?.size}`,
    });
    showToast('Produto adicionado ao carrinho!', 'success');
  };

  const handleCheckout = () => {
    if (!user) {
      showToast("Você precisa estar logado para finalizar a compra.", "error");
      navigate("/login");
      return;
    }
    if (items.length === 0) {
      showToast("Seu carrinho está vazio.", "error");
      return;
    }
    navigate('/checkout');
  };

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, [currentPage]);

  useEffect(() => {
    setBermudaShortProducts(
      products.filter(
        p =>
          p.category?.toLowerCase().trim() === 'vestuário masculino' &&
          p.subcategory?.toLowerCase().trim() === 'short'
      )
    );
    setBermudaProducts(
      products.filter(
        p =>
          p.category?.toLowerCase().trim() === 'vestuário masculino' &&
          p.subcategory?.trim() === 'Bermudas' // sem toLowerCase pois está com B maiúsculo no Firebase
      )
    );
  }, [products]);

  const bermudaCarouselProducts =
  bermudaShortProducts.length + bermudaProducts.length >= 5
    ? [...bermudaShortProducts, ...bermudaProducts].slice(0, 5)
    : [
        ...bermudaShortProducts,
        ...bermudaProducts,
        ...products.filter(
          p =>
            p.category?.toLowerCase().trim() !== 'vestuário masculino' ||
            (p.subcategory?.toLowerCase().trim() !== 'short' &&
             p.subcategory?.trim() !== 'Bermudas')
        )
      ].slice(0, 5);

  const subTotal = items.reduce((total, item) => {
    const originalPrice = item.oldPrice && item.oldPrice > item.price ? item.oldPrice : item.price;
    return total + originalPrice * item.quantity;
  }, 0);
  const totalDiscount = subTotal - cartTotal;
  return (
    <div className={styles.storeWrapper}>
      <NavBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSearchChange={e => setSearchTerm(e.target.value)}
        categories={categories}
      />

      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
          <span className={styles.raquetesname}>Raquetes</span><br />MORMAII
        </h1>
        <p className={styles.heroSubtitle}>Sua loja de beach Tennis móvel e agora digital!</p>
        <button className={styles.heroButton}>ver modelos</button>
      </div>
    </div>
<div className={styles.featuredSectionsContainer}>
  <div className={styles.featuredSectionCompact}>
    <h2 className={styles.sectionTitleCompact}>Oferta do dia</h2>
    <div className={styles.featuredGridCompact}>
      {dailyDeals.map(product => (
        <div 
          key={product.id} 
          className={styles.featuredCardCompact}
          onClick={() => {
            setSelectedProduct(product);
            setOpenProductModal(true);
          }}
        >
          <div className={styles.featuredImageContainerCompact}>
            <img 
              src={product.imageUrls[0]} 
              alt={product.name}
              className={styles.featuredImageCompact}
              loading="lazy"
            />
          </div>
          <div className={styles.featuredInfoCompact}>
            <h3 className={styles.featuredNameCompact}>{product.name}</h3>
            <div className={styles.featuredOldPriceCompact}>R$ 250,99</div>
            <div className={styles.featuredPriceCompact}>
              R$ {Number(product.salePrice).toFixed(2)}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>

  <div className={styles.featuredSectionCompact}>
    <h2 className={styles.sectionTitleCompact}>Os mais vendidos</h2>
    <div className={styles.featuredGridCompact}>
      {(window.innerWidth <= 768 ? mobileBestSellers : bestSellers).map(product => (
        <div 
          key={product.id} 
          className={styles.featuredCardCompact}
          onClick={() => {
            setSelectedProduct(product);
            setOpenProductModal(true);
          }}
        >
          <div className={styles.featuredImageContainerCompact}>
            <img 
              src={product.imageUrls[0]} 
              alt={product.name}
              className={styles.featuredImageCompact}
              loading="lazy"
            />
          </div>
          <div className={styles.featuredInfoCompact}>
            <h3 className={styles.featuredNameCompact}>{product.name}</h3>
            <div className={styles.featuredOldPriceCompact}>R$ 250,99</div>
            <div className={styles.featuredPriceCompact}>
              R$ {Number(product.salePrice).toFixed(2)}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
</div>
<div className={styles.categoriesSection}>
  <div className={styles.categoriesGrid}>
    <div 
      className={styles.categoryCard} 
      onClick={() => navigate('/produtos?categoria=raquetes')}
    >
      <h3 className={styles.categoryName}>Raquetes e bolas</h3>
      <img src={raquetesimg} alt="Raquetes e bolas" className={styles.categoryImage} />
      <div className={styles.categoryFooter}>Conferir agora</div>
    </div>

    <div 
      className={styles.categoryCard} 
      onClick={() => navigate('/busca?categoria=Conjuntos')}
    >
      <h3 className={styles.categoryName}>Conjuntos</h3>
      <img src={conjuntosimg} alt="Conjuntos" className={styles.categoryImage} />
      <div className={styles.categoryFooter}>Conferir agora</div>
    </div>

    <div 
      className={styles.categoryCard}
      onClick={() => navigate('/produtos?categoria=garrafas')}
    >
      <h3 className={styles.categoryName}>Garrafas</h3>
      <img src={garrafaimg} alt="Garrafas" className={styles.categoryImage} />
      <div className={styles.categoryFooter}>Conferir agora</div>
    </div>
  </div>
</div>
    <div className={`${styles.bermudaSection} ${styles.firstCarousel}`}>
      <h2 className={styles.bermudaTitle}>Bermudas</h2>
      <div className={styles.bermudaCarousel}>
        <button className={styles.carouselArrowLeft}>&#60;</button>
        <div className={styles.bermudaGrid}>
          {bermudaCarouselProducts.map(product => (
            <div key={product.id} className={styles.bermudaCard}  onClick={() => {
            setSelectedProduct(product);
            setOpenProductModal(true);
          }}
          style={{ cursor: 'pointer' }}>
              <div className={styles.bermudaImageContainer}>
                <img src={product.imageUrls[0]} alt={product.name} className={styles.bermudaImage} />
              </div>
              <div className={styles.bermudaInfo}>
                <div className={styles.bermudaName}>{product.name}</div>
                <div className={styles.bermudaPrice}>R$ {Number(product.salePrice).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
        <button className={styles.carouselArrowRight}>&#62;</button>
      </div>
    </div>
    <div className={styles.bermudaSection}>
  <h2 className={styles.bermudaTitle}>Carrossel 2</h2>
  <div className={styles.bermudaCarousel}>
    <button className={styles.carouselArrowLeft}>&#60;</button>
    <div className={styles.bermudaGrid}>
      {products.slice(5, 10).map(product => (
        <div key={product.id} className={styles.bermudaCard} onClick={() => {
            setSelectedProduct(product);
            setOpenProductModal(true);
          }}
          style={{ cursor: 'pointer' }}>
          <div className={styles.bermudaImageContainer}>
            <img src={product.imageUrls[0]} alt={product.name} className={styles.bermudaImage} />
          </div>
          <div className={styles.bermudaInfo}>
            <div className={styles.bermudaName}>{product.name}</div>
            <div className={styles.bermudaPrice}>R$ {Number(product.salePrice).toFixed(2)}</div>
          </div>
        </div>
      ))}
    </div>
    <button className={styles.carouselArrowRight}>&#62;</button>
  </div>
</div>
    <div className={styles.brandsSection}>
      <div className={styles.brandsHeader}>
        <p className={styles.brandsHeaderText}>As maiores marcas com a gente</p>
      </div>
      <div className={styles.brandsLogos}>
        <img src={mormaiiLogo} alt="Mormaii" />
        <img src={sharkLogo} alt="Shark" />
        <img src={altogiroLogo} alt="Alto Giro" />
        <img src={dropshotLogo} alt="Drop Shot" />
        <img src={wilsonLogo} alt="Wilson" />
      </div>
    </div>

<div className={styles.bermudasContainer}>
  
  <div className={styles.bermudasList}>
    {products
      .filter(product => 
        product.category && product.category.match(/bermuda|short/i)
      )
      .slice(0, 4)
      .map((product, index) => (
        <div key={product.id} className={styles.bermudaItem}>
          <p className={styles.productName}>
            {product.name || 'Produto sem nome'}
          </p>
          <p className={styles.productPrice}>
            R$ {index % 2 === 0 ? '200,00' : '300,00'}
          </p>
        </div>
      ))
    }
  </div>
</div>

<div className={styles.bermudaSection}>
  <h2 className={styles.bermudaTitle}>Carrossel 3</h2>
  <div className={styles.bermudaCarousel}>
    <button className={styles.carouselArrowLeft}>&#60;</button>
    <div className={styles.bermudaGrid}>
      {products.slice(5, 10).map(product => (
        <div key={product.id} className={styles.bermudaCard}  onClick={() => {
            setSelectedProduct(product);
            setOpenProductModal(true);
          }}
          style={{ cursor: 'pointer' }}>
          <div className={styles.bermudaImageContainer}>
            <img src={product.imageUrls[0]} alt={product.name} className={styles.bermudaImage} />
          </div>
          <div className={styles.bermudaInfo}>
            <div className={styles.bermudaName}>{product.name}</div>
            <div className={styles.bermudaPrice}>R$ {Number(product.salePrice).toFixed(2)}</div>
          </div>
        </div>
      ))}
    </div>
    <button className={styles.carouselArrowRight}>&#62;</button>
  </div>
</div>
<div className={styles.bermudaSection}>
  <h2 className={styles.bermudaTitle}>Carrossel 4</h2>
  <div className={styles.bermudaCarousel}>
    <button className={styles.carouselArrowLeft}>&#60;</button>
    <div className={styles.bermudaGrid}>
      {products.slice(5, 10).map(product => (
        <div key={product.id} className={styles.bermudaCard} onClick={() => {
            setSelectedProduct(product);
            setOpenProductModal(true);
          }}
          style={{ cursor: 'pointer' }}>
          <div className={styles.bermudaImageContainer}>
            <img src={product.imageUrls[0]} alt={product.name} className={styles.bermudaImage} />
          </div>
          <div className={styles.bermudaInfo}>
            <div className={styles.bermudaName}>{product.name}</div>
            <div className={styles.bermudaPrice}>R$ {Number(product.salePrice).toFixed(2)}</div>
          </div>
        </div>
      ))}
    </div>
    <button className={styles.carouselArrowRight}>&#62;</button>
  </div>
</div>

    <div className={styles.athlete}>
      <div className={styles.athleteSection}>
        <div className={styles.athleteContent}>
      <img
        src={atleta}
        alt="Atleta"
        className={styles.athleteImage}
      />
      <div className={styles.athleteText}>
        <p>
          Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.
        </p>
        <h2 className={styles.athleteName}>Nome do Atleta</h2>
      </div>
        </div>
      </div>
    </div>

    {toast.show && (
      <div className={`${styles.toast} ${styles[toast.type]}`}>
        {toast.message}
      </div>
    )}

    <div 
      className={`${styles.cartIcon} ${items.length > 0 ? styles.pulse : ''}`} 
      onClick={() => setOpenCartModal(true)}
    >
      <FiShoppingCart size={24} />
      {items.length > 0 && <span className={styles.cartBadge}>{items.length}</span>}
    </div>

    <div className={`${styles.cartModal} ${openCartModal ? styles.open : ''}`}>
      <div className={styles.cartContent}>
        <div className={styles.cartHeader}>
          <h2 className={styles.cartTitle}>Seu Carrinho</h2>
          <button 
            className={styles.closeCartButton}
            onClick={() => setOpenCartModal(false)}
          >
            <FiX size={24} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className={styles.cartEmpty}>
            <FiHeart size={48} />
            <p>Seu carrinho esta vazio</p>
          </div>
        ) : (
          <>
            <div className={styles.cartItems}>
              {items.map(item => (
                <div key={item.id} className={styles.cartItem}>
                  <img
                    src={item.imageUrls[0]}
                    alt={item.name}
                    className={styles.cartItemImage}
                  />
                  <div className={styles.cartItemDetails}>
                    <h3 className={styles.cartItemName}>{item.name}</h3>
                    <div className={styles.cartItemVariation}>
                      <span>
                        Cor: {Array.isArray(item.variation?.color)
                          ? item.variation.color.map(c => c?.name || c?.hex || JSON.stringify(c)).join(' / ')
                          : (item.variation?.color && typeof item.variation.color === 'object')
                            ? (item.variation.color.name || item.variation.color.hex || JSON.stringify(item.variation.color))
                            : item.variation?.color}
                      </span>
                      <span>Tamanho: {item.variation.size}</span>
                    </div>
                    <div className={styles.cartItemPrice}>
                      R$ {item.price.toFixed(2)}
                    </div>
                    <div className={styles.quantityControls}>
                      <button
                        className={styles.quantityButton}
                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span className={styles.quantityValue}>{item.quantity}</span>
                      <button
                        className={styles.quantityButton}
                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    className={styles.removeItemButton}
                    onClick={() => removeItem(item.id)}
                  >
                    <FiTrash size={18} />
                  </button>
                </div>
              ))}
            </div>

            <div className={styles.cartSummary}>
              {totalDiscount > 0 && (
                <div className={styles.totalContainer}>
                  <div className={styles.totalRow}>
                    <span className={styles.totalLabel}>Subtotal</span>
                    <span className={styles.totalPrice}>R$ {subTotal.toFixed(2)}</span>
                  </div>
                  <div className={`${styles.totalRow} ${styles.discountRow}`}>
                    <span className={styles.totalLabel}>Descontos</span>
                    <span className={styles.totalPrice}>- R$ {totalDiscount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className={styles.totalContainer}>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Total</span>
                  <span className={styles.totalPrice}>R$ {cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                className={styles.checkoutButton}
                onClick={handleCheckout}
                disabled={items.length === 0}
              >
                Finalizar Compra <FiChevronRight size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>

    <div 
      className={`${styles.overlay} ${openCartModal ? styles.open : ''}`} 
      onClick={() => setOpenCartModal(false)}
    />

    <ProductModal
      open={openProductModal}
      onClose={() => {
        setOpenProductModal(false);
        setSelectedProduct(null);
      }}
      product={selectedProduct}
      addToCart={handleAddToCart}
      onBuyNow={(productWithDetails) => {
        // já foi adicionado ao carrinho pelo modal; fecha modal e vai para checkout
        setOpenProductModal(false);
        setSelectedProduct(null);
        navigate('/checkout');
      }}
    />

    <LoginModal open={loginOpen} onClose={closeLogin} />

    <Footer />
   
  </div>
);
}

export default Store;