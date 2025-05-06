import React from 'react'
import styles from './Footer.module.css'
import { Link } from 'react-router-dom'

function Footer() {
  return (
    <div className={styles.footer}>
    <div className={styles.footerContent}>
      <div className={styles.footerSection}>
        <h4>Sobre Nós</h4>
        <p>
          A Bus Store é pioneira em levar a experiência de compra
          diretamente até você, onde quer que esteja.
        </p>
      </div>
      <div className={styles.footerSection}>
        <h4>Links Úteis</h4>
        <ul>
          <li>
             <Link to='/'>Inicio</Link>
          </li>
          {/* <li>
            <a href="#about">Sobre</a>
          </li>
          <li>
            <a href="#services">Serviços</a>
          </li> */}
          <li>
            <a href="#contact">Contato</a>
          </li>
        </ul>
      </div>
      <div className={styles.footerSection}>
        <h4>Contato</h4>
        <p>Email: contato@busstore.com</p>
        {/* <p>Telefone: +55 31 1234-5678</p> */}
        {/* <p>Endereço: Rua do Futuro, 123, Monte Santo de Minas, MG</p> */}
      </div>
    </div>
    <div className={styles.footerBottom}>
      <p>&copy; 2025 Bus Store. Todos os direitos reservados.</p>
    </div>
  </div>
  )
}

export default Footer
