import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './store.module.css';
import { useCart } from 'react-use-cart';
import { db } from '../../firebase';
import { collection, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import NavBar from "../../components/NavBar";
import Footer from '../../components/Footer';
import { FiSearch, FiX, FiShoppingCart, FiTag, FiChevronRight, FiTrash, FiHeart, FiStar } from 'react-icons/fi';
import ProductModal from './ProductModal';

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
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(12);

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
        const querySnapshot = await getDocs(collection(db, "products"));
        const productsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          variations: doc.data().variations || []
        }));
        setProducts(productsData);
        setFilteredProducts(productsData);

        // Extrai categorias únicas dos produtos
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

      return matchesSearch && matchesCategory && matchesPrice;
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

  return (
    <div className={styles.storeWrapper}>
      <NavBar />
      
      {/* Hero Section */}
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>The store on the way!</h1>
          <p className={styles.heroSubtitle}>Descubra os melhores produtos com descontos exclusivos</p>
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="O que você está procurando?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className={styles.searchButton}>
              <FiSearch size={20} />
            </button>
          </div>
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
                  {product.discount > 0 ? (
                    <>
                      <span className={styles.originalPrice}>
                        R$ {product.originalPrice.toFixed(2)}
                      </span>
                      <span className={styles.discountedPrice}>
                        R$ {product.salePrice.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className={styles.regularPrice}>
                      R$ {product.salePrice.toFixed(2)}
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