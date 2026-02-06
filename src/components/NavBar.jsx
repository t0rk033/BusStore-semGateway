import React, { useState, useEffect, useRef } from 'react';
import { useModal } from '../contexts/ModalContext';
import styles from './Navbar.module.css';
import logo from '../assets/images/logo.png';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaShoppingCart, FaSearch } from 'react-icons/fa';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';

function NavBar({ searchTerm, setSearchTerm, onSearchChange, categories = [] }) {
  const { openLogin } = useModal();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleUserIconClick = () => {
    if (user) {
      setMenuOpen(!menuOpen);
    } else {
      openLogin();
    }
  };

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

  const handleLogout = () => {
    const auth = getAuth();
    signOut(auth).then(() => {
      setMenuOpen(false);
      navigate('/');
    }).catch((error) => {
      console.error("Erro ao fazer logout:", error);
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && !mobileMenuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setSearchOpen(false);
  };

  const toggleSearch = () => {
    setSearchOpen(!searchOpen);
    setMobileMenuOpen(false);
  };

  const handleMobileLinkClick = () => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  };

  const staticLinks = [
    { name: 'FEMININO', category: 'Vestuário Feminino' },
    { name: 'MASCULINO', category: 'Vestuário Masculino' },
    { name: 'EQUIPAMENTOS', category: 'Equipamentos' },
    { name: 'CONJUNTOS', category: 'Conjuntos' },
    { name: 'RAQUETES', category: 'Raquetes' },
    { name: 'BOLSAS', category: 'Bolsas' },
  ];

  const dbCategoryMap = new Map();
  categories.forEach(dbCat => {
    dbCategoryMap.set(dbCat.toLowerCase(), dbCat);
  });

  return (
    <div className={styles.wrapper} ref={mobileMenuRef}>
      {/* Overlay para mobile */}
      {(mobileMenuOpen || searchOpen) && (
        <div 
          className={`${styles.overlay} ${(mobileMenuOpen || searchOpen) ? styles.active : ''}`}
          onClick={() => {
            setMobileMenuOpen(false);
            setSearchOpen(false);
          }}
        />
      )}

      <div className={styles.navbarTop}>
        <div className={styles.logoSection}>
          <Link to="/" onClick={handleMobileLinkClick}>
            <img src={logo} alt="Logo" className={styles.logo} />
          </Link>
        </div>

        <div className={styles.rightSection}>
          {/* Barra de busca para DESKTOP */}
          <div className={styles.desktopSearchContainer}>
            <input
              type="text"
              placeholder="Buscar produtos..."
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
          {/* Botão de busca para mobile */}
          <button className={styles.searchToggle} onClick={toggleSearch} aria-label="Toggle search">
            <FaSearch/>
          </button>
          <div className={styles.icons}>
            <div className={styles.userIconContainer} ref={menuRef}>
              <button
                type="button"
                onClick={handleUserIconClick}
                aria-label={user ? "Abrir menu do usuário" : "Abrir login"}
                className={styles.iconLink}
              >
                <FaUser />
              </button>
              {menuOpen && user && (
                <div className={styles.userMenu}>
                  <ul>
                    <li>
                      <Link to="/perfil" onClick={() => setMenuOpen(false)}>Meu Perfil</Link>
                    </li>
                    <li>
                      <Link to="/favoritos" onClick={() => setMenuOpen(false)}>Favoritos</Link>
                    </li>
                    <li>
                      <button onClick={handleLogout}>Sair</button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          

            {/* Menu Hamburger */}
            <button 
              className={`${styles.mobileMenuButton} ${mobileMenuOpen ? styles.active : ''}`}
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de busca para MOBILE (fora do fluxo normal) */}
      <div className={`${styles.mobileSearchContainer} ${searchOpen ? styles.active : ''}`}>
        <input
          type="text"
          placeholder="Buscar produtos..."
          className={styles.searchInput}
          value={searchTerm}
          onChange={onSearchChange}
          onKeyPress={handleKeyPress}
        />
        <button 
          className={styles.searchButton}
          onClick={() => {
            handleSearch();
            handleMobileLinkClick(); // Fecha a busca após pesquisar
          }}
        >
          BUSCAR
        </button>
      </div>

      <div className={styles.separator} />

      <div className={`${styles.navbarBottom} ${mobileMenuOpen ? styles.active : ''}`}>
        <ul className={styles.navLinks}>
          {staticLinks.map((link) => {
            // Usa a grafia da categoria do banco de dados se encontrada, senão usa a do link estático.
            const categoryForLink = dbCategoryMap.get(link.category.toLowerCase()) || link.category;
            return (
              <li key={link.name}>
                <Link 
                  to={`/busca?categoria=${encodeURIComponent(categoryForLink)}`}
                  onClick={handleMobileLinkClick}
                >
                  {link.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default NavBar;