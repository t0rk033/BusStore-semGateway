import React from "react";
import styles from "./Home.module.css";
import NavBar from "../../components/NavBar";
import parceiros from "../../assets/images/parceiros.jpeg";
import Footer from '../../components/Footer'
function Home() {
  return (
    <div className={styles.homeContainer}>
      <div className={styles.firstSection}>
        <NavBar />
        <div className={styles.firstSectionContainer}>
          <h1>Inovação - The store on the way!</h1>
          <p>
            A primeira loja móvel que vem até você. Descubra uma nova forma de
            comprar enquanto está em movimento. Experimente conveniência e
            inovação.
          </p>
          <div className={styles.buttonsFirst}>
            <button className={styles.reserveButtonFirst}>Reserve</button>
            <button className={styles.detailButton}>Detalhes</button>
          </div>
        </div>
      </div>

      <div className={styles.secondSection}>
        <div className={styles.details}>
          <h2>O Bus Store: Inovação e Praticidade sobre Rodas</h2>
          <p className={styles.secondSectionText}>
            O Bus Store é uma loja móvel que oferece uma experiência completa e
            inovadora, combinando praticidade e conforto para atender às suas
            necessidades. Confira os destaques:
          </p>

          <ul className={styles.secondSectionList}>
            <li>Estrutura completa de uma loja convencional.</li>
            <li>
              Interior climatizado com ar-condicionado para maior conforto.
            </li>
            <li>
              Provador exclusivo, permitindo que você experimente os looks no
              momento.
            </li>
            <li>
              Versátil: funciona como loja própria ou como espaço para locação
              por marcas.
            </li>
            <li>Plataforma no teto para eventos especiais.</li>
            <li>
              DJ e locutor durante os eventos, promovendo visibilidade,
              engajamento e criando experiências únicas para o público.
            </li>
          </ul>
        </div>
      </div>


      <div className={styles.thirdSection}>
  <div className={styles.thirdSectionContainer}>
    <div className={styles.sectionHeader}>
      <h2 className={styles.secondTitle}>Como Funciona</h2>
      <p className={styles.firtsTitle}>
        O <strong>Bus Store</strong> reinventa o conceito de loja móvel, trazendo inovação e praticidade para você.
      </p>
    </div>

    <div className={styles.everyCards}>
      <div className={styles.featureCard}>
        <div className={styles.iconContainer}>
          <svg className={styles.icon} viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2zm0 5l7 13H5l7-13z" />
          </svg>
        </div>
        <h3>Mobilidade</h3>
        <p>
          Levamos a loja até os maiores eventos do Brasil, aproximando marcas do público.
        </p>
      </div>
      <div className={styles.featureCard}>
        <div className={styles.iconContainer}>
          <svg className={styles.icon} viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2zm0 5l7 13H5l7-13z" />
          </svg>
        </div>
        <h3>Personalização</h3>
        <p>
          O ônibus pode ser customizado por marcas para criar experiências exclusivas.
        </p>
      </div>
      <div className={styles.featureCard}>
        <div className={styles.iconContainer}>
          <svg className={styles.icon} viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2zm0 5l7 13H5l7-13z" />
          </svg>
        </div>
        <h3>Visibilidade</h3>
        <p>
          DJ e locutor promovem engajamento e tornam o Bus Store o destaque do evento.
        </p>
      </div>
      <div className={styles.featureCard}>
        <div className={styles.iconContainer}>
          <svg className={styles.icon} viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2zm0 5l7 13H5l7-13z" />
          </svg>
        </div>
        <h3>Conforto & Experiência</h3>
        <p>
          Provadores, climatização e infraestrutura completa para uma compra diferenciada.
        </p>
      </div>
      <div className={styles.featureCard}>
        <div className={styles.iconContainer}>
          <svg className={styles.icon} viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2zm0 5l7 13H5l7-13z" />
          </svg>
        </div>
        <h3>Modelo de Locação</h3>
        <p>
          As marcas podem personalizar o ônibus para ativação em seus eventos.
        </p>
      </div>
      <div className={styles.featureCard}>
        <div className={styles.iconContainer}>
          <svg className={styles.icon} viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2zm0 5l7 13H5l7-13z" />
          </svg>
        </div>
        <h3>Suporte Personalizado</h3>
        <p>
          Oferecemos suporte logístico e estrutural, garantindo a melhor experiência para o público-alvo.
        </p>
      </div>
 
    </div>

    <div className={styles.buttons}>
      <button className={styles.reserveButton}>
        <span>Reserve Agora</span>
        <svg className={styles.buttonIcon} viewBox="0 0 24 24">
          <path d="M10 17l5-5-5-5v10z" />
        </svg>
      </button>
      <button className={styles.thirdDetailButton}>
        <span>Conheça a Loja</span>
        <svg className={styles.buttonIcon} viewBox="0 0 24 24">
          <path d="M10 17l5-5-5-5v10z" />
        </svg>
      </button>
    </div>
  </div>
</div>
<div className={styles.partnersSection}>
  <div className={styles.partnersContainer}>
    <div className={styles.sectionHeader}>
      <h2 className={styles.secondTitle}>Parceiros Bus Store</h2>
      <p className={styles.firtsTitle}>
        Estamos em busca de parceiros que compartilhem nossa paixão por inovação e queiram aproveitar essa plataforma única para levar suas marcas ainda mais longe.
      </p>
    </div>

    <div className={styles.partnersContent}>
      <div className={styles.partnersText}>
        <h3>Por que ser um parceiro?</h3>
        <p>
          Ao se tornar um parceiro do Bus Store, sua marca ganha visibilidade em eventos de grande porte, conecta-se diretamente com o público e faz parte de uma experiência única e memorável.
        </p>
        <ul className={styles.partnersList}>
          <li>Alcance um público diversificado e engajado.</li>
          <li>Destaque sua marca em um ambiente inovador.</li>
          <li>Crie conexões significativas com seu público-alvo.</li>
        </ul>
      </div>
      <div className={styles.partnersImage}>
        <img src={parceiros} alt="Parceiros Bus Store" />
      </div>
    </div>

    <div className={styles.buttons}>
      <button className={styles.reserveButton}>
        <span>Seja um Parceiro</span>
        <svg className={styles.buttonIcon} viewBox="0 0 24 24">
          <path d="M10 17l5-5-5-5v10z" />
        </svg>
      </button>
      <button className={styles.thirdDetailButton}>
        <span>Fale Conosco</span>
        <svg className={styles.buttonIcon} viewBox="0 0 24 24">
          <path d="M10 17l5-5-5-5v10z" />
        </svg>
      </button>
    </div>
  </div>
</div>
<div className={styles.partnersSection}>
  <div className={styles.partnersContainer}>
    <div className={styles.sectionHeader}>
      <h2 className={styles.secondTitle}>Vantagens para os Parceiros</h2>
      <p className={styles.firtsTitle}>
        O <strong>Bus Store</strong> oferece uma experiência única para marcas que desejam se conectar com o público de forma inovadora.
      </p>
    </div>

    <div className={styles.timeline}>
      <div className={styles.timelineLine}></div>
      <div className={styles.timelineItem}>
        <div className={styles.timelineIcon}>1</div>
        <div className={styles.timelineContent}>
          <h3>Alta Visibilidade</h3>
          <p>
            Sua marca ganha destaque em um ponto de interesse dentro do evento.
          </p>
        </div>
      </div>
      <div className={styles.timelineItem}>
        <div className={styles.timelineIcon}>2</div>
        <div className={styles.timelineContent}>
          <h3>Experiência Diferenciada</h3>
          <p>
            Criamos uma conexão entre o público e a marca por meio de uma ativação memorável.
          </p>
        </div>
      </div>
      <div className={styles.timelineItem}>
        <div className={styles.timelineIcon}>3</div>
        <div className={styles.timelineContent}>
          <h3>Flexibilidade</h3>
          <p>
            O ônibus se adapta a diferentes tipos de eventos e públicos.
          </p>
        </div>
      </div>
      <div className={styles.timelineItem}>
        <div className={styles.timelineIcon}>4</div>
        <div className={styles.timelineContent}>
          <h3>Engajamento Garantido</h3>
          <p>
            O DJ e locutor tornam o Bus Store um verdadeiro centro de atenção e entretenimento no evento.
          </p>
        </div>
      </div>
    </div>

    <div className={styles.buttons}>
      <button className={styles.reserveButton}>
        <span>Seja um Parceiro</span>
        <svg className={styles.buttonIcon} viewBox="0 0 24 24">
          <path d="M10 17l5-5-5-5v10z" />
        </svg>
      </button>
      <button className={styles.thirdDetailButton}>
        <span>Saiba Mais</span>
        <svg className={styles.buttonIcon} viewBox="0 0 24 24">
          <path d="M10 17l5-5-5-5v10z" />
        </svg>
      </button>
    </div>
  </div>

 
</div>
<Footer/>
{/* <div className={styles.eventsSection}>
  <div className={styles.eventsContainer}>
    <div className={styles.sectionHeader}>
      <h2 className={styles.secondTitle}>Próximos Eventos</h2>
      <p className={styles.firtsTitle}>
        A Bus Store estará presente nos maiores torneios de tênis do mundo.
        Confira onde você pode nos encontrar em breve!
      </p>
    </div>

    <div className={styles.eventsList}>
      <div className={styles.eventCard}>
        <h3>Australian Open</h3>
        <p>Data: Janeiro de 2025</p>
        <p>Local: Melbourne Park, Melbourne - Austrália</p>
        <button className={styles.eventButton}>Mais informações</button>
      </div>
      <div className={styles.eventCard}>
        <h3>Roland Garros (French Open)</h3>
        <p>Data: Maio e Junho de 2025</p>
        <p>Local: Stade Roland Garros, Paris - França</p>
        <button className={styles.eventButton}>Mais informações</button>
      </div>
      <div className={styles.eventCard}>
        <h3>Wimbledon</h3>
        <p>Data: Junho e Julho de 2025</p>
        <p>Local: All England Club, Londres - Reino Unido</p>
        <button className={styles.eventButton}>Mais informações</button>
      </div>
      <div className={styles.eventCard}>
        <h3>US Open</h3>
        <p>Data: Agosto e Setembro de 2025</p>
        <p>Local: USTA Billie Jean King National Tennis Center, Nova York - EUA</p>
        <button className={styles.eventButton}>Mais informações</button>
      </div>
      <div className={styles.eventCard}>
        <h3>ATP Finals</h3>
        <p>Data: Novembro de 2025</p>
        <p>Local: The O2 Arena, Londres - Reino Unido</p>
        <button className={styles.eventButton}>Mais informações</button>
      </div>
    </div>
  </div>
</div> */}

      
    </div>
  );
}

export default Home;
