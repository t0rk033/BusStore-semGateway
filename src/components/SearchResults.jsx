import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import styles from './SearchResults.module.css';
import NavBar from './NavBar';
import Footer from './Footer';
import ProductModal from '../pages/store/ProductModal';
import { useCart } from 'react-use-cart';

function SearchResults() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [openProductModal, setOpenProductModal] = useState(false);
  const { addItem } = useCart();
  
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get('q') || '';

  useEffect(() => {
    if (searchQuery) {
      setSearchTerm(searchQuery);
      fetchProducts(searchQuery);
    }
  }, [searchQuery]);

  const fetchProducts = async (queryTerm) => {
    try {
      setLoading(true);
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
      
      // Filtrar produtos baseado no termo de busca
      const filtered = productsData.filter(product => {
        const searchLower = queryTerm.toLowerCase();
        return (
          product.name.toLowerCase().includes(searchLower) ||
          product.category?.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower) ||
          product.brand?.toLowerCase().includes(searchLower)
        );
      });
      
      setFilteredProducts(filtered);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      window.location.href = `/busca?q=${encodeURIComponent(searchTerm.trim())}`;
    }
  };

  const handleAddToCart = (productWithDetails) => {
    addItem({
      ...productWithDetails,
      id: `${productWithDetails.id}-${productWithDetails.variation.color}-${productWithDetails.variation.size}`,
    });
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Buscando produtos...</p>
      </div>
    );
  }

  return (
    <div className={styles.searchResultsWrapper}>
      <NavBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSearchChange={handleSearchChange}
      />

      <div className={styles.searchHeader}>
        <h1>Resultados da busca</h1>
        <p>{filteredProducts.length} resultado(s) para "{searchQuery}"</p>
      </div>

      {filteredProducts.length === 0 ? (
        <div className={styles.noResults}>
          <h2>Nenhum produto encontrado</h2>
          <p>Tente usar palavras-chave diferentes ou explore nossas categorias.</p>
        </div>
      ) : (
        <div className={styles.resultsGrid}>
          {filteredProducts.map(product => (
            <div
              key={product.id}
              className={styles.productCard}
              onClick={() => {
                setSelectedProduct(product);
                setOpenProductModal(true);
              }}
            >
              <div className={styles.productImageContainer}>
                <img
                  src={product.imageUrls[0]}
                  alt={product.name}
                  className={styles.productImage}
                />
              </div>
              <div className={styles.productInfo}>
                <h3 className={styles.productName}>{product.name}</h3>
                <div className={styles.productPrice}>
                  R$ {Number(product.salePrice).toFixed(2)}
                </div>
                {product.oldPrice && (
                  <div className={styles.productOldPrice}>
                    R$ {Number(product.oldPrice).toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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

export default SearchResults;