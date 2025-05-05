import React, { useState } from 'react';
import Calendar from 'react-calendar';
import TimePicker from 'react-time-picker';
import 'react-calendar/dist/Calendar.css';
import 'react-time-picker/dist/TimePicker.css';
import style from './reservations.module.css';
import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';

function Reservations() {
  const [dateRange, setDateRange] = useState([new Date(), new Date()]); // Estado para o intervalo de datas
  const [time, setTime] = useState('10:00'); // Estado para o horário selecionado
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    eventType: '',
    notes: ''
  });

  const handleDateChange = (newDateRange) => {
    setDateRange(newDateRange); // Atualiza o intervalo de datas selecionado
  };

  const handleTimeChange = (newTime) => {
    setTime(newTime); // Atualiza o horário selecionado
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const [startDate, endDate] = dateRange;
    const reservationData = {
      ...formData,
      startDate: startDate.toLocaleDateString(), // Data inicial
      endDate: endDate.toLocaleDateString(), // Data final
      time: time // Horário selecionado
    };
    console.log('Dados do formulário:', reservationData);
    alert('Reserva enviada com sucesso!');
  };

  return (
    <div>
        <NavBar/>
        <div className={style.container}>
          <h2 className={style.title}>Reservas</h2>
          <form onSubmit={handleSubmit}>
            {/* Calendário de Intervalo */}
            <div className={style.calendarContainer}>
              <label className={style.label}>Selecione o intervalo de dias:</label>
              <Calendar
                onChange={handleDateChange}
                value={dateRange}
                selectRange={true} // Habilita a seleção de intervalo
                className={style.calendar}
                minDate={new Date()} // Impede seleção de datas passadas
              />
            </div>
            {/* Seletor de Horário */}
            <div className={style.timePickerContainer}>
              <label className={style.label}>Horário:</label>
              <TimePicker
                onChange={handleTimeChange}
                value={time}
                className={style.timePicker}
                disableClock={true} // Remove o relógio interativo
                clearIcon={null} // Remove o ícone de limpar
              />
            </div>
            {/* Campos do Formulário */}
            <div className={style.formGroup}>
              <label htmlFor="name" className={style.label}>Nome:</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={style.input}
                required
              />
            </div>
            <div className={style.formGroup}>
              <label htmlFor="email" className={style.label}>Email:</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={style.input}
                required
              />
            </div>
            <div className={style.formGroup}>
              <label htmlFor="eventType" className={style.label}>Tipo de Evento:</label>
              <select
                id="eventType"
                name="eventType"
                value={formData.eventType}
                onChange={handleChange}
                className={style.select}
                required
              >
                <option value="">Selecione...</option>
                <option value="aniversario">Aniversário</option>
                <option value="casamento">Casamento</option>
                <option value="corporativo">Evento Corporativo</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className={style.formGroup}>
              <label htmlFor="notes" className={style.label}>Observações:</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className={style.textarea}
              />
            </div>
            <button type="submit" className={style.button}>Reservar</button>
          </form>
        </div>
        <Footer/>
    </div>

  );
}

export default Reservations;