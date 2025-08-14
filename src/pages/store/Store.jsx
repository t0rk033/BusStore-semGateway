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
import conjuntosimg from '../../assets/images/conjuntosimg.jpg';
import garrafaimg from '../../assets/images/garrafaimg.jpg';

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
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(12);
  const [bermudaShortProducts, setBermudaShortProducts] = useState([]);
  // Adicione o estado para bermudas
  const [bermudaProducts, setBermudaProducts] = useState([]);

  const navigate = useNavigate();

  // Função para obter os produtos da página atual
  const getCurrentProducts = useCallback(() => {
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    return filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  }, [currentPage, productsPerPage, filteredProducts]);

  // Função para mudar de página
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Efeito para rolar para o topo ao mudar de página
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, [currentPage]);

  // Função para exibir toasts
  const showToast = useCallback((message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 5000);
  }, []);

  // Monitora estado de autenticação e carrega dados do usuário
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Carrega produtos
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

        // Define os produtos em destaque (pega os 4 primeiros)
        if (productsData.length > 0) {
          setDailyDeals(productsData.slice(0, 1)); // 1 produto para oferta do dia
          setBestSellers(productsData.slice(1, 4)); // 3 produtos para mais vendidos
        }

        // Extrai categorias únicas
        const uniqueCategories = [...new Set(productsData.map(product => product.category))];
        setCategories(uniqueCategories);
      } catch (error) {
        showToast('Erro ao carregar produtos', 'error');
      }
    }
    fetchProducts();
  }, [showToast]);

  // Filtra produtos com base nos critérios e reseta para a primeira página
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
    setCurrentPage(1); // Resetar para a primeira página quando os filtros mudam
  }, [searchTerm, selectedCategory, minPrice, maxPrice, products]);

  // Limpa filtros
  const clearFilters = () => {
    setSearchTerm('');
    setMinPrice('');
    setMaxPrice('');
    setSelectedCategory('');
    showToast('Filtros limpos com sucesso!', 'success');
  };

  const handleAddToCart = (productWithDetails) => {
    addItem({
      ...productWithDetails,
      id: `${productWithDetails.id}-${productWithDetails.variation.color}-${productWithDetails.variation.size}`,
    });
    showToast('Produto adicionado ao carrinho!', 'success');
  };

  const handleCheckout = async () => {
    if (!user) {
      showToast("Você precisa estar logado para finalizar a compra.", "error");
      navigate("/login");
      return;
    }

    if (items.length === 0) {
      showToast("Seu carrinho está vazio.", "error");
      return;
    }

    try {
      // Cria uma nova venda no Firestore com o status "Solicitada"
      const saleData = {
        userId: user.uid,
        user: {
          details: {
            fullName: userData?.fullName || "Nome não informado",
            cpf: userData?.cpf || "CPF não informado",
            phone: userData?.phone || "Telefone não informado",
            address: {
              street: userData?.address?.street || "Rua não informada",
              number: userData?.address?.number || "Número não informado",
              neighborhood: userData?.address?.neighborhood || "Bairro não informado",
              city: userData?.address?.city || "Cidade não informada",
              state: userData?.address?.state || "Estado não informado",
            },
          },
        },
        items: items.map((item) => ({
          id: item.id,
          name: item.name || "Produto sem nome",
          variation: item.variation || {},
          quantity: item.quantity || 0,
          price: item.price || 0,
          imageUrl: item.imageUrls?.[0] || "",
        })),
        total: cartTotal || 0,
        status: "Solicitada",
        date: new Date(),
      };

      const docRef = await addDoc(collection(db, "sales"), saleData);

      // Redireciona para o WhatsApp com os dados da compra
      const phoneNumber = "5521996789997"; // Substitua pelo número de WhatsApp desejado
      const message = encodeURIComponent(`
        Olá, gostaria de finalizar a compra com os seguintes dados:
        
        Produtos:
        ${items
          .map(
            (item) =>
              `- ${item.name} (${item.variation.color || "Cor não informada"}, ${
                item.variation.size || "Tamanho não informado"
              }) x${item.quantity} - R$ ${item.price.toFixed(2)}`
          )
          .join("\n")}
        
        Subtotal: R$ ${cartTotal.toFixed(2)}
        
        Nome: ${userData?.fullName || "Nome não informado"}
        CPF: ${userData?.cpf || "CPF não informado"}
        Endereço: ${userData?.address?.street || "Rua não informada"}, ${
        userData?.address?.number || "Número não informado"
      }, ${userData?.address?.neighborhood || "Bairro não informado"}, ${
        userData?.address?.city || "Cidade não informada"
      } - ${userData?.address?.state || "Estado não informado"}
        
        Pedido ID: ${docRef.id}
      `);

      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
      window.location.href = whatsappUrl;

      // Limpa o carrinho após o checkout
      emptyCart();
      showToast("Compra solicitada com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao solicitar compra:", error);
      showToast("Erro ao solicitar compra. Tente novamente.", "error");
    }
  };

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, [currentPage]);

  // Filtra os produtos de short e bermuda
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

  // Mescla os arrays caso não haja 5 shorts
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

  return (
    <div className={styles.storeWrapper}>
      <NavBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSearchChange={e => setSearchTerm(e.target.value)}
      />

      {/* Hero Section */}
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
          Raquetes<br />MORMAII
        </h1>
        <p className={styles.heroSubtitle}>Sua loja de beach Tennis móvel e agora digital!</p>
        <button className={styles.heroButton}>ver modelos</button>
      </div>
    </div>

    {/* Seções de Destaque lado a lado */}
  <div className={styles.featuredRow}>
  {/* Seção de Ofertas do Dia */}
  <div className={styles.featuredSection}>
    <h2 className={styles.sectionTitle}>Oferta do dia</h2>
    <div className={styles.featuredGrid}>
      {dailyDeals.map(product => (
        <div 
          key={product.id} 
          className={styles.featuredCard}
          onClick={() => {
            setSelectedProduct(product);
            setOpenProductModal(true);
          }}
        >
          <div className={styles.featuredImageContainer}>
            <img 
              src={product.imageUrls[0]} 
              alt={product.name}
              className={styles.featuredImage}
              loading="lazy"
            />
          </div>
          <div className={styles.featuredInfo}>
            <h3 className={styles.featuredName}>{product.name}</h3>
            <div className={styles.featuredOldPrice}>R$ 250,99</div>
            <div className={styles.featuredPrice}>
              R$ {Number(product.salePrice).toFixed(2)}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>

  {/* Seção de Mais Vendidos */}
  <div className={styles.featuredSection}>
    <h2 className={styles.sectionTitle}>Os mais vendidos</h2>
    <div className={styles.featuredGrid}>
      {bestSellers.map(product => (
        <div 
          key={product.id} 
          className={styles.featuredCard}
          onClick={() => {
            setSelectedProduct(product);
            setOpenProductModal(true);
          }}
        >
          <div className={styles.featuredImageContainer}>
            <img 
              src={product.imageUrls[0]} 
              alt={product.name}
              className={styles.featuredImage}
              loading="lazy"
            />
          </div>
          <div className={styles.featuredInfo}>
            <h3 className={styles.featuredName}>{product.name}</h3>
            <div className={styles.featuredOldPrice}>R$ 250,99</div>
            <div className={styles.featuredPrice}>
              R$ {Number(product.salePrice).toFixed(2)}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
</div>

{/* Seção de Categorias */}
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
      onClick={() => navigate('/produtos?categoria=conjuntos')}
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
{/* Seção de Bermudas */}
    <div className={styles.bermudaSection}>
      <h2 className={styles.bermudaTitle}>Bermudas - Short</h2>
      <div className={styles.bermudaCarousel}>
        <button className={styles.carouselArrowLeft}>&#60;</button>
        <div className={styles.bermudaGrid}>
          {bermudaCarouselProducts.map(product => (
            <div key={product.id} className={styles.bermudaCard}>
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
    {/* Filtros */}
    <div className={styles.filtersContainer}>
      <div className={styles.filterSection}>
        <h3 className={styles.filterTitle}><FiTag size={18} /> Categorias</h3>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className={styles.categoryFilter}
        >
          <option value="">Todas as Categorias</option>
          {categories.map(category => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterSection}>
        <h3 className={styles.filterTitle}>Faixa de Preço</h3>
        <div className={styles.priceRange}>
          <input
            type="number"
            placeholder="Mínimo"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className={styles.priceInput}
          />
          <span className={styles.priceSeparator}>-</span>
          <input
            type="number"
            placeholder="Máximo"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className={styles.priceInput}
          />
        </div>
      </div>

      <button onClick={clearFilters} className={styles.clearFiltersButton}>
        <FiX size={16} /> Limpar Filtros
      </button>
    </div>

    {/* Grade de Produtos */}
    <div className={styles.productsSection}>
      <h2 className={styles.sectionTitle}>Todos os Produtos</h2>
      
      {/* Seletor de produtos por página */}
      <div className={styles.productsPerPageSelector}>
        <span>Produtos por página:</span>
        <select 
          value={productsPerPage}
          onChange={(e) => {
            setProductsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
        >
          <option value="12">12</option>
          <option value="24">24</option>
          <option value="36">36</option>
          <option value="48">48</option>
        </select>
      </div>

      <div className={styles.productGrid}>
        {getCurrentProducts().map(product => (
          <div 
            key={product.id} 
            className={styles.productCard}
            onClick={() => {
              setSelectedProduct(product);
              setOpenProductModal(true);
            }}
          >
            <div className={styles.productImageContainer}>
              <div className={styles.imageWrapper}>
                <img 
                  src={product.imageUrls[0]} 
                  alt={product.name} 
                  className={styles.productImage}
                  loading="lazy"
                />
                {product.discount > 0 && (
                  <span className={styles.discountBadge}>-{product.discount}%</span>
                )}
                <button 
                  className={styles.favoriteButton}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <FiHeart size={20} />
                </button>
              </div>
            </div>
            
            <div className={styles.productDetails}>
              <div className={styles.productHeader}>
                <h3 className={styles.productTitle}>{product.name}</h3>
                <div className={styles.rating}>
                  {[...Array(5)].map((_, i) => (
                    <FiStar 
                      key={i} 
                      size={16} 
                      className={i < product.rating ? styles.filledStar : styles.emptyStar}
                    />
                  ))}
                </div>
              </div>
              
              <div className={styles.priceContainer}>
                {Number(product.discount || 0) > 0 ? (
                  <>
                    <span className={styles.originalPrice}>
                      R$ {Number(product.salePrice || 0).toFixed(2)}
                    </span>
                    <span className={styles.discountedPrice}>
                      R$ {(Number(product.salePrice || 0) * (1 - Number(product.discount || 0) / 100)).toFixed(2)}
                    </span>
                  </>
                ) : (
                  <span className={styles.regularPrice}>
                    R$ {Number(product.salePrice || 0).toFixed(2)}
                  </span>
                )}
              </div>
              
              <button 
                className={styles.addToCartButton}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProduct(product);
                  setOpenProductModal(true);
                }}
              >
                <FiShoppingCart size={16} /> Adicionar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Paginação */}
      <div className={styles.paginationContainer}>
        {filteredProducts.length > productsPerPage && (
          <div className={styles.pagination}>
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className={styles.paginationButton}
            >
              &laquo; Anterior
            </button>
            
            {Array.from({ length: Math.ceil(filteredProducts.length / productsPerPage) }).map((_, index) => (
              <button
                key={index}
                onClick={() => paginate(index + 1)}
                className={`${styles.paginationButton} ${
                  currentPage === index + 1 ? styles.activePage : ''
                }`}
              >
                {index + 1}
              </button>
            ))}
            
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === Math.ceil(filteredProducts.length / productsPerPage)}
              className={styles.paginationButton}
            >
              Próxima &raquo;
            </button>
          </div>
        )}
      </div>
    </div>

    

    {/* Toast Notification */}
    {toast.show && (
      <div className={`${styles.toast} ${styles[toast.type]}`}>
        {toast.message}
      </div>
    )}

    {/* Botão Flutuante do Carrinho */}
    <div 
      className={`${styles.cartIcon} ${items.length > 0 ? styles.pulse : ''}`} 
      onClick={() => setOpenCartModal(true)}
    >
      <FiShoppingCart size={24} />
      {items.length > 0 && <span className={styles.cartBadge}>{items.length}</span>}
    </div>

    {/* Carrinho Lateral */}
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
            <p>Seu carrinho está vazio.</p>
            <button 
              className={styles.continueShoppingButton}
              onClick={() => setOpenCartModal(false)}
            >
              Continuar Comprando
            </button>
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
                      <span>Cor: {item.variation.color}</span>
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

            {/* Resumo do Carrinho */}
            <div className={styles.cartSummary}>
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

    {/* Overlay do Carrinho */}
    <div 
      className={`${styles.overlay} ${openCartModal ? styles.open : ''}`} 
      onClick={() => setOpenCartModal(false)}
    />

    {/* Modal de Produto */}
    <ProductModal
      open={openProductModal}
      onClose={() => {
        setOpenProductModal(false);
        setSelectedProduct(null);
      }}
      product={selectedProduct}
      addToCart={handleAddToCart}
    />

    <Footer />
  </div>
);
}

export default Store;