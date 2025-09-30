// filepath: c:\Users\Guimaraes\Desktop\busSemgateway\BusStore-semGateway\src\pages\login\Login.jsx
import React, { useState } from 'react';
import { FaUser, FaLock, FaGoogle } from 'react-icons/fa';
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import styles from './login.module.css';
import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';
import { useNavigate, useLocation, Link } from 'react-router-dom';

// Modal reutilizável exportado para uso global
export function LoginModal({ open = true, onClose, onSwitchToSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const navigate = useNavigate();

  if (!open) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (onClose) onClose();
      else navigate('/perfil');
    } catch (err) {
      setError('Email ou senha incorretos.');
      console.error(err);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      if (onClose) onClose();
      else navigate('/perfil');
    } catch (err) {
      setError('Erro ao fazer login com Google.');
      console.error(err);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      setResetMessage('Por favor, insira seu email.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage(`Email de redefinição enviado para ${resetEmail}. Verifique sua caixa de entrada.`);
      setTimeout(() => {
        setShowResetModal(false);
        setResetMessage('');
        setResetEmail('');
      }, 3000);
    } catch (err) {
      setResetMessage('Erro ao enviar email de redefinição. Verifique se o email está correto.');
      console.error(err);
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
    else navigate(-1);
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={handleClose} aria-label="Fechar">×</button>

        <div className={styles.content}>
          <h2 className={styles.heading}>Entre com e-mail e senha</h2>

          <form className={styles.form} onSubmit={handleLogin}>
            <label className={styles.label}>
              <span className={styles.fieldLabel}>e-mail</span>
              <input
                className={styles.input}
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className={styles.label}>
              <span className={styles.fieldLabel}>senha</span>
              <input
                className={styles.input}
                type="password"
                placeholder="senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <p className={styles.forgot} onClick={() => setShowResetModal(true)}>esqueci minha senha</p>

            {error && <div className={styles.error}>{error}</div>}

            <button type="submit" className={styles.primaryButton}>Entrar</button>

            <button type="button" onClick={onSwitchToSignup} className={styles.linkCreate}>Criar conta</button>

            <div className={styles.divider}><span>ou entrar pela conta google</span></div>

            <button type="button" className={styles.googleButton} onClick={handleGoogleLogin}>
              <FaGoogle className={styles.googleIcon} /> <span>Google</span>
            </button>
          </form>

          {showResetModal && (
            <div className={styles.resetBox}>
              <h3>Redefinir senha</h3>
              <input className={styles.input} type="email" placeholder="Seu email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
              {resetMessage && <p className={resetMessage.includes('Erro') ? styles.error : styles.success}>{resetMessage}</p>}
              <div className={styles.resetActions}>
                <button onClick={handlePasswordReset} className={styles.primaryButton}>Enviar</button>
                <button onClick={() => { setShowResetModal(false); setResetMessage(''); }} className={styles.secondaryButton}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Página standalone (rota /login) — mantém comportamento de "modal route" existente
export default function LoginPage() {
  const location = useLocation();
  const isModal = Boolean(location.state && location.state.background);

  return (
    <div>
      {!isModal && <NavBar />}
      <LoginModal open={true} />
      {!isModal && <Footer />}
    </div>
  );
}