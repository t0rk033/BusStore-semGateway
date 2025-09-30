import React, { useState, useEffect, useRef } from 'react';
import { useModal } from '../contexts/ModalContext';
import styles from './Navbar.module.css';
import logo from '../assets/images/logo.png';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaShoppingCart } from 'react-icons/fa';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';

function NavBar({ searchTerm, setSearchTerm, onSearchChange, categories = [] }) {
  const { openLogin } = useModal();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

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
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  const staticCategoryNames = staticLinks.map(link => link.category.toLowerCase());
  const dynamicCategories = categories.filter(
    category => !staticCategoryNames.includes(category.toLowerCase())
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.navbarTop}>
        <div className={styles.logoSection}>
          <Link to="/">
            <img src={logo} alt="Logo" className={styles.logo} />
          </Link>
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
          </div>
        </div>
      </div>

      <div className={styles.separator} />

      <div className={styles.navbarBottom}>
        <ul className={styles.navLinks}>
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