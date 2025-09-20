import React, { useState } from 'react';
import { useModal } from '../contexts/ModalContext';
import styles from './Navbar.module.css';
import logo from '../assets/images/logo.png';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaShoppingCart } from 'react-icons/fa';

function NavBar({ searchTerm, setSearchTerm, onSearchChange, categories = [] }) {
  const { openLogin } = useModal();
  const navigate = useNavigate();

  const handleSearch = () => {
    if (searchTerm.trim()) {
      navigate(`/busca?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Links estáticos que você quer manter
  const staticLinks = [
    { name: 'FEMININO', category: 'Vestuário Feminino' },
    { name: 'MASCULINO', category: 'Vestuário Masculino' },
    { name: 'EQUIPAMENTOS', category: 'Equipamentos' },
    { name: 'CONJUNTOS', category: 'Conjuntos' },
    { name: 'RAQUETES', category: 'Raquetes' },
    { name: 'BOLSAS', category: 'Bolsas' },
  ];

  // Cria um mapa para encontrar a categoria do DB com a grafia correta, ignorando o caso.
  const dbCategoryMap = new Map();
  categories.forEach(dbCat => {
    dbCategoryMap.set(dbCat.toLowerCase(), dbCat);
  });

  // Filtra as categorias dinâmicas para não repetir as que já são estáticas
  const staticCategoryNames = staticLinks.map(link => link.category.toLowerCase());
  const dynamicCategories = categories.filter(
    category => !staticCategoryNames.includes(category.toLowerCase())
  );

  return (
    <div className={styles.wrapper}>
      {/* Parte superior */}
      <div className={styles.navbarTop}>
        <div className={styles.logoSection}>
          <img src={logo} alt="Logo" className={styles.logo} />
        </div>

        <div className={styles.rightSection}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Buscar"
              className={styles.searchInput}
              value={searchTerm}
              onChange={onSearchChange}
              onKeyPress={handleKeyPress}
            />
            <button 
              className={styles.searchButton}
              onClick={handleSearch}
            >
              BUSCAR
            </button>
          </div>
          <div className={styles.icons}>
            <button
              type="button"
              onClick={openLogin}
              aria-label="Abrir login"
              className={styles.iconLink}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                margin: 0,
                cursor: 'pointer',
                color: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                textDecoration: 'none'
              }}
            >
              <FaUser />
            </button>
          </div>
        </div>
      </div>

      {/* Linha branca de separação */}
      <div className={styles.separator} />

      {/* Menu inferior */}
      <div className={styles.navbarBottom}>
        <ul className={styles.navLinks}>
          {/* Renderiza os links estáticos */}
          {staticLinks.map((link) => {
            // Usa a grafia da categoria do banco de dados se encontrada, senão usa a do link estático.
            const categoryForLink = dbCategoryMap.get(link.category.toLowerCase()) || link.category;
            return (
              <li key={link.name}>
                <Link to={`/busca?categoria=${encodeURIComponent(categoryForLink)}`}>
                  {link.name}
                </Link>
              </li>
            );
          })}
          {/* Renderiza as categorias dinâmicas do banco de dados */}
          {dynamicCategories.map((category) => (
            <li key={category}>
              <Link to={`/busca?categoria=${encodeURIComponent(category)}`}>
                {category.toUpperCase()}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default NavBar;