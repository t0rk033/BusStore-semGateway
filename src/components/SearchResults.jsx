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
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [openProductModal, setOpenProductModal] = useState(false);
  const { addItem } = useCart();
  
  // Filtros baseados nos dados do seu banco
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [sortBy, setSortBy] = useState('relevance');
  
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get('q') || '';

  // Carregar todos os produtos
  useEffect(() => {
    fetchAllProducts();
  }, []);

  // Aplicar filtros quando os critérios mudarem
  useEffect(() => {
    applyFilters();
  }, [allProducts, selectedCategories, selectedSubcategories, selectedBrands, 
      selectedColors, selectedSizes, priceRange, sortBy, searchQuery]);

  const fetchAllProducts = async () => {
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

      setAllProducts(productsData);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allProducts];

    // Filtro por termo de busca
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchLower) ||
        (product.category && product.category.toLowerCase().includes(searchLower)) ||
        (product.description && product.description.toLowerCase().includes(searchLower)) ||
        (product.brand && product.brand.toLowerCase().includes(searchLower))
      );
    }

    // Filtro por categoria
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product => 
        product.category && selectedCategories.includes(product.category)
      );
    }

    // Filtro por subcategoria
    if (selectedSubcategories.length > 0) {
      filtered = filtered.filter(product => 
        product.subcategory && selectedSubcategories.includes(product.subcategory)
      );
    }

    // Filtro por marca
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(product => 
        product.brand && selectedBrands.includes(product.brand)
      );
    }

    // Filtro por cor
    if (selectedColors.length > 0) {
      filtered = filtered.filter(product =>
        product.variations && product.variations.some(v => 
          v.color && selectedColors.includes(v.color)
        )
      );
    }

    // Filtro por tamanho
    if (selectedSizes.length > 0) {
      filtered = filtered.filter(product =>
        product.variations && product.variations.some(v => 
          v.size && selectedSizes.includes(v.size)
        )
      );
    }

    // Filtro por faixa de preço
    filtered = filtered.filter(product => 
      product.salePrice >= priceRange[0] && product.salePrice <= priceRange[1]
    );

    // Ordenação
    switch(sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => a.salePrice - b.salePrice);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.salePrice - a.salePrice);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'relevance':
      default:
        // Mantém a ordenação padrão (mais recentes primeiro)
        break;
    }

    setFilteredProducts(filtered);
  };

  // Extrair opções únicas para os filtros
  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
  const subcategories = [...new Set(allProducts.map(p => p.subcategory).filter(Boolean))];
  const brands = [...new Set(allProducts.map(p => p.brand).filter(Boolean))];
  const colors = [...new Set(allProducts.flatMap(p => 
    p.variations ? p.variations.map(v => v.color).filter(Boolean) : []
  ))];
  const sizes = [...new Set(allProducts.flatMap(p => 
    p.variations ? p.variations.map(v => v.size).filter(Boolean) : []
  ))];

  // Calcular preço máximo para o range slider
  const maxPrice = allProducts.reduce((max, product) => 
    product.salePrice > max ? product.salePrice : max, 0
  );

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

  // Funções para manipular filtros
  const toggleFilter = (filterArray, setFilterArray, value) => {
    if (filterArray.includes(value)) {
      setFilterArray(filterArray.filter(item => item !== value));
    } else {
      setFilterArray([...filterArray, value]);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Carregando produtos...</p>
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

      

      <div className={styles.mainContent}>
        {/* Sidebar de filtros */}
        <div className={styles.filtersSidebar}>
          <h3>Filtrar por</h3>
          
          {/* Filtro de Categoria */}
          {categories.length > 0 && (
            <div className={styles.filterGroup}>
              <h4>Categoria</h4>
              {categories.map(category => (
                <label key={category} className={styles.filterCheckbox}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => toggleFilter(selectedCategories, setSelectedCategories, category)}
                  />
                  <span>{category}</span>
                </label>
              ))}
            </div>
          )}
          
          {/* Filtro de Subcategoria */}
          {subcategories.length > 0 && (
            <div className={styles.filterGroup}>
              <h4>Subcategoria</h4>
              {subcategories.map(subcategory => (
                <label key={subcategory} className={styles.filterCheckbox}>
                  <input
                    type="checkbox"
                    checked={selectedSubcategories.includes(subcategory)}
                    onChange={() => toggleFilter(selectedSubcategories, setSelectedSubcategories, subcategory)}
                  />
                  <span>{subcategory}</span>
                </label>
              ))}
            </div>
          )}
          
          {/* Filtro de Marca */}
          {brands.length > 0 && (
            <div className={styles.filterGroup}>
              <h4>Marca</h4>
              {brands.map(brand => (
                <label key={brand} className={styles.filterCheckbox}>
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => toggleFilter(selectedBrands, setSelectedBrands, brand)}
                  />
                  <span>{brand}</span>
                </label>
              ))}
            </div>
          )}
          
          {/* Filtro de Cor */}
          {colors.length > 0 && (
            <div className={styles.filterGroup}>
              <h4>Cor</h4>
              {colors.map(color => (
                <label key={color} className={styles.filterCheckbox}>
                  <input
                    type="checkbox"
                    checked={selectedColors.includes(color)}
                    onChange={() => toggleFilter(selectedColors, setSelectedColors, color)}
                  />
                  <span>{color}</span>
                </label>
              ))}
            </div>
          )}
          
          {/* Filtro de Tamanho */}
          {sizes.length > 0 && (
            <div className={styles.filterGroup}>
              <h4>Tamanho</h4>
              {sizes.map(size => (
                <label key={size} className={styles.filterCheckbox}>
                  <input
                    type="checkbox"
                    checked={selectedSizes.includes(size)}
                    onChange={() => toggleFilter(selectedSizes, setSelectedSizes, size)}
                  />
                  <span>{size}</span>
                </label>
              ))}
            </div>
          )}
          
          {/* Filtro de Preço */}
          <div className={styles.filterGroup}>
            <h4>Faixa de Preço</h4>
            <div className={styles.priceRange}>
              <span>R$ {priceRange[0].toFixed(2)} - R$ {priceRange[1].toFixed(2)}</span>
              <input
                type="range"
                min="0"
                max={maxPrice}
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                className={styles.rangeSlider}
              />
            </div>
          </div>
          
          {/* Botão para limpar filtros */}
          <button 
            className={styles.clearFiltersButton}
            onClick={() => {
              setSelectedCategories([]);
              setSelectedSubcategories([]);
              setSelectedBrands([]);
              setSelectedColors([]);
              setSelectedSizes([]);
              setPriceRange([0, maxPrice]);
            }}
          >
            Limpar Filtros
          </button>
        </div>

        {/* Área de produtos */}
        <div className={styles.productsArea}>
          <div className={styles.productsHeader}>
            <h2>Produtos</h2>
            <div className={styles.sortOptions}>
              <span>Ordenar por:</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="relevance">Mais relevantes</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
                <option value="name">Nome A-Z</option>
              </select>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className={styles.noResults}>
              <h2>Nenhum produto encontrado</h2>
              <p>Tente ajustar os filtros ou usar palavras-chave diferentes.</p>
            </div>
          ) : (
            <div className={styles.productsGrid}>
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
                      src={product.imageUrls && product.imageUrls[0]}
                      alt={product.name}
                      className={styles.productImage}
                    />
                    {product.oldPrice && product.oldPrice > product.salePrice && (
                      <span className={styles.discountBadge}>
                        -{Math.round((1 - product.salePrice / product.oldPrice) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className={styles.productInfo}>
                    <h3 className={styles.productName}>{product.name}</h3>
                    {product.brand && (
                      <div className={styles.productBrand}>{product.brand}</div>
                    )}
                    <div className={styles.priceContainer}>
                      {product.oldPrice && product.oldPrice > product.salePrice && (
                        <div className={styles.productOldPrice}>
                          R$ {Number(product.oldPrice).toFixed(2)}
                        </div>
                      )}
                      <div className={styles.productPrice}>
                        R$ {Number(product.salePrice).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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