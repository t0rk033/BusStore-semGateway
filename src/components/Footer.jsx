import React from "react";
import styles from "./Footer.module.css";
import { FaWhatsapp, FaInstagram, FaPhoneAlt, FaEnvelope } from "react-icons/fa";
import logo from "../assets/images/logofooter2.png"; // ajuste o caminho da logo

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        
        {/* Redes sociais */}
        <div className={styles.footerSectionLeft}>
          <h4>ACOMPANHE NOSSAS REDES</h4>
          <p>
            <FaWhatsapp className={styles.icon} /> (32) 99999-9999
          </p>
          <p>
            <FaInstagram className={styles.icon} /> @busstor3
          </p>
        </div>

        {/* Logo central */}
        <div className={styles.footerLogo}>
          <img src={logo} alt="Bus Store Logo" />
        </div>

        {/* Contato */}
        <div className={styles.footerSectionRight}>
          <h4>Entre em contato</h4>
          <p>
            (32) 98857-9997 <FaPhoneAlt className={styles.iconRight} />
          </p>
          <p>
            contato@busstore.com.br <FaEnvelope className={styles.iconRight} />
          </p>
        </div>
      </div>

      {/* Base inferior */}
      <div className={styles.footerBottom}>
        <p>© 2025 - todos os direitos reservados</p>
      </div>
    </footer>
  );
}

export default Footer;
