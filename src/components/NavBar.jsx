import React, { useEffect, useState } from 'react';
import styles from './Navbar.module.css';
import logo from '../assets/images/logo.png';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { FaBars } from 'react-icons/fa'; // Importando ícone de hambúrguer

function NavBar() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const navigate = useNavigate(); // Hook para redirecionamento

  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Estado para controlar o menu
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserLoggedIn(!!user);
    });

    return () => unsubscribe();
  }, [auth]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/'); // Redireciona para a página principal
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen); // Alternar a visibilidade do menu
  };

  return (
    <div className={styles.blackbar}>
      <div className={styles.navbar}>
        <img src={logo} alt="Logo" className={styles.logo} />
        <nav className={styles.navbarContainer}>
          <div className={styles.menuIcon} onClick={toggleMenu}>
            <FaBars /> {/* Ícone de hambúrguer */}
          </div>
          <ul className={`${styles.navLinks} ${isMenuOpen ? styles.open : ''}`}>
            <Link to='/'>Inicio</Link>
            {/* <Link to="/loja">Loja</Link> */}
            {/* <Link to='/reservas'>Reservas</Link> */}
            <div className={styles.account}>
              {userLoggedIn ? (
                <>
                  <Link to='/perfil' className={styles.logoutButton}>
                    Conta
                  </Link>
                 
                </>
              ) : (
                <Link to="/login">Entrar</Link>
              )}
            </div>
          </ul>
        </nav>
      </div>
    </div>
  );
}

export default NavBar;