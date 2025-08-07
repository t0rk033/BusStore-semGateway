import React from 'react';
import styles from './Navbar.module.css';
import logo from '../assets/images/logo.png';
import { Link } from 'react-router-dom';
import { FaUser, FaShoppingCart } from 'react-icons/fa';

function NavBar({ searchTerm, setSearchTerm, onSearchChange }) {
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
            />
            <button className={styles.searchButton}>BUSCAR</button>
          </div>
          <div className={styles.icons}>
            <Link to="/login"><FaUser /></Link>
            <Link to="/carrinho"><FaShoppingCart /></Link>
          </div>
        </div>
      </div>

      {/* Linha branca de separação */}
      <div className={styles.separator} />

      {/* Menu inferior (mesmo fundo azul escuro) */}
      <div className={styles.navbarBottom}>
        <ul className={styles.navLinks}>
          <li><Link to="/">FEMININO</Link></li>
          <li><Link to="/">MASCULINO</Link></li>
          <li><Link to="/">EQUIPAMENTOS</Link></li>
          <li><Link to="/">CONJUNTOS</Link></li>
          <li><Link to="/">RAQUETES</Link></li>
          <li><Link to="/">BOLSAS</Link></li>
        </ul>
      </div>
    </div>
  );
}

export default NavBar;
