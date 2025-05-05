import React, { useState, useEffect } from 'react';
import { FaUser, FaLock, FaIdCard, FaPhone, FaMapMarker, FaBirthdayCake } from 'react-icons/fa';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'; // Adicionado updateProfile
import { auth, db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { cpf } from 'cpf-cnpj-validator';
import validator from 'validator';
import styles from './signup.module.css';
import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';

function Signup() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    cpf: '',
    phone: '',
    birthDate: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    acceptTerms: false
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

  // Busca automática do endereço pelo CEP
  useEffect(() => {
    const fetchAddress = async () => {
      const cep = formData.zipCode.replace(/\D/g, '');
      if (cep.length === 8) {
        setLoadingCep(true);
        try {
          const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
          const data = await response.json();
          
          if (!data.erro) {
            setFormData(prev => ({
              ...prev,
              street: data.logradouro,
              neighborhood: data.bairro,
              city: data.localidade,
              state: data.uf
            }));
          }
        } catch (error) {
          console.error('Erro ao buscar CEP:', error);
        }
        setLoadingCep(false);
      }
    };

    fetchAddress();
  }, [formData.zipCode]);

  // Validações em tempo real
  const validateField = (name, value) => {
    let error = '';
    
    switch(name) {
      case 'fullName':
        if (!value.match(/^[a-zA-ZÀ-ú ]{5,}$/)) error = 'Nome completo inválido';
        break;
      case 'email':
        if (!validator.isEmail(value)) error = 'Email inválido';
        break;
      case 'cpf':
        if (!cpf.isValid(value)) error = 'CPF inválido';
        break;
      case 'phone':
        if (!value.match(/^\(\d{2}\) \d{4,5}-\d{4}$/)) error = 'Telefone inválido';
        break;
      case 'birthDate':
        if (!validator.isDate(value, { format: 'YYYY-MM-DD', delimiters: ['-'] })) error = 'Data inválida';
        break;
      case 'password':
        if (!validator.isStrongPassword(value, { 
          minLength: 8, 
          minLowercase: 1, 
          minUppercase: 1, 
          minNumbers: 1, 
          minSymbols: 1 
        })) error = 'Senha fraca (mínimo 8 caracteres com maiúsculas, números e símbolos)';
        break;
      case 'zipCode':
        if (!value.match(/^\d{5}-\d{3}$/)) error = 'CEP inválido';
        break;
      case 'acceptTerms':
        if (!value) error = 'Você deve aceitar os termos';
        break;
    }

    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    // Formatação automática
    let formattedValue = val;
    switch(name) {
      case 'cpf':
        formattedValue = val
          .replace(/\D/g, '')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        break;
      case 'phone':
        formattedValue = val
          .replace(/\D/g, '')
          .replace(/(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{5})(\d)/, '$1-$2');
        break;
      case 'zipCode':
        formattedValue = val
          .replace(/\D/g, '')
          .replace(/(\d{5})(\d)/, '$1-$2');
        break;
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue || val
    }));

    validateField(name, formattedValue || val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Validar todos os campos
    Object.keys(formData).forEach(key => {
      validateField(key, formData[key]);
    });

    if (Object.values(errors).some(error => error) || !formData.acceptTerms) {
      alert('Corrija os erros antes de enviar');
      setSubmitting(false);
      return;
    }

    try {
      // Criar usuário no Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      // Definir o displayName no Firebase Authentication
      await updateProfile(userCredential.user, {
        displayName: formData.fullName
      });

      // Salvar dados adicionais no Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        fullName: formData.fullName,
        cpf: formData.cpf.replace(/\D/g, ''),
        phone: formData.phone.replace(/\D/g, ''),
        birthDate: formData.birthDate,
        address: {
          street: formData.street,
          number: formData.number,
          complement: formData.complement,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode.replace(/\D/g, '')
        },
        createdAt: new Date()
      });

      alert('Cadastro realizado com sucesso!');
      window.location.href = '/perfil';

    } catch (error) {
      console.error('Erro no cadastro:', error);
      setErrors({ general: 'Erro ao cadastrar: ' + error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <NavBar />
      <div className={styles.signupContainer}>
        <div className={styles.signupBox}>
          <h1 className={styles.title}>Cadastro Completo</h1>
          <form onSubmit={handleSubmit} className={styles.form}>
            
            {/* Seção de Dados Pessoais */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Dados Pessoais</legend>
              
              <div className={styles.inputGroup}>
                <FaUser className={styles.icon} />
                <input
                  type="text"
                  name="fullName"
                  placeholder="Nome Completo"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
                {errors.fullName && <span className={styles.error}>{errors.fullName}</span>}
              </div>

              <div className={styles.inputGroup}>
                <FaIdCard className={styles.icon} />
                <input
                  type="text"
                  name="cpf"
                  placeholder="CPF"
                  value={formData.cpf}
                  onChange={handleChange}
                  maxLength="14"
                  className={styles.input}
                  required
                />
                {errors.cpf && <span className={styles.error}>{errors.cpf}</span>}
              </div>

              <div className={styles.inputGroup}>
                <FaBirthdayCake className={styles.icon} />
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
                {errors.birthDate && <span className={styles.error}>{errors.birthDate}</span>}
              </div>
            </fieldset>

            {/* Seção de Contato */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Contato</legend>

              <div className={styles.inputGroup}>
                <FaUser className={styles.icon} />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
                {errors.email && <span className={styles.error}>{errors.email}</span>}
              </div>

              <div className={styles.inputGroup}>
                <FaPhone className={styles.icon} />
                <input
                  type="text"
                  name="phone"
                  placeholder="Telefone (00) 00000-0000"
                  value={formData.phone}
                  onChange={handleChange}
                  maxLength="15"
                  className={styles.input}
                  required
                />
                {errors.phone && <span className={styles.error}>{errors.phone}</span>}
              </div>
            </fieldset>

            {/* Seção de Endereço */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Endereço</legend>

              <div className={styles.addressGrid}>
                <div className={styles.inputGroup}>
                  <FaMapMarker className={styles.icon} />
                  <input
                    type="text"
                    name="zipCode"
                    placeholder="CEP"
                    value={formData.zipCode}
                    onChange={handleChange}
                    maxLength="9"
                    className={styles.input}
                    required
                  />
                  {loadingCep && <div className={styles.loadingCep} />}
                  {errors.zipCode && <span className={styles.error}>{errors.zipCode}</span>}
                </div>

                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    name="street"
                    placeholder="Rua"
                    value={formData.street}
                    onChange={handleChange}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    name="number"
                    placeholder="Número"
                    value={formData.number}
                    onChange={handleChange}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    name="complement"
                    placeholder="Complemento"
                    value={formData.complement}
                    onChange={handleChange}
                    className={styles.input}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    name="neighborhood"
                    placeholder="Bairro"
                    value={formData.neighborhood}
                    onChange={handleChange}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    name="city"
                    placeholder="Cidade"
                    value={formData.city}
                    onChange={handleChange}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className={styles.input}
                    required
                  >
                    <option value="">Estado</option>
                    <option value="AC">Acre</option>
                    <option value="AL">Alagoas</option>
                    <option value="AP">Amapá</option>
                    <option value="AM">Amazonas</option>
                    <option value="BA">Bahia</option>
                    <option value="CE">Ceará</option>
                    <option value="DF">Distrito Federal</option>
                    <option value="ES">Espírito Santo</option>
                    <option value="GO">Goiás</option>
                    <option value="MA">Maranhão</option>
                    <option value="MT">Mato Grosso</option>
                    <option value="MS">Mato Grosso do Sul</option>
                    <option value="MG">Minas Gerais</option>
                    <option value="PA">Pará</option>
                    <option value="PB">Paraíba</option>
                    <option value="PR">Paraná</option>
                    <option value="PE">Pernambuco</option>
                    <option value="PI">Piauí</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="RN">Rio Grande do Norte</option>
                    <option value="RS">Rio Grande do Sul</option>
                    <option value="RO">Rondônia</option>
                    <option value="RR">Roraima</option>
                    <option value="SC">Santa Catarina</option>
                    <option value="SP">São Paulo</option>
                    <option value="SE">Sergipe</option>
                    <option value="TO">Tocantins</option>
                  </select>
                </div>
              </div>
            </fieldset>

            {/* Seção de Segurança */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Segurança</legend>

              <div className={styles.inputGroup}>
                <FaLock className={styles.icon} />
                <input
                  type="password"
                  name="password"
                  placeholder="Senha"
                  value={formData.password}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
                {errors.password && <span className={styles.error}>{errors.password}</span>}
              </div>

              <div className={styles.inputGroup}>
                <FaLock className={styles.icon} />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirmar Senha"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
                {errors.confirmPassword && <span className={styles.error}>{errors.confirmPassword}</span>}
              </div>
            </fieldset>

            {/* Termos e Condições */}
            <div className={styles.termsGroup}>
              <label>
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  required
                />
                Li e aceito os <a href="/termos" className={styles.termsLink}>Termos de Uso</a> e 
                <a href="/privacidade" className={styles.termsLink}> Política de Privacidade</a>
              </label>
              {errors.acceptTerms && <span className={styles.error}>{errors.acceptTerms}</span>}
            </div>

            {errors.general && <p className={styles.error}>{errors.general}</p>}

            <button 
              type="submit" 
              className={styles.button}
              disabled={submitting}
            >
              {submitting ? 'Cadastrando...' : 'Finalizar Cadastro'}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Signup;