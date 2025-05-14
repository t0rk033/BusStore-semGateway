import React, { useState } from "react";
import QrScanner from "react-qr-scanner";

const BarcodeScanner = ({ onScan }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  const handleScan = (data) => {
    if (data) {
      onScan(data.text); // Passa o código escaneado para o componente pai
      setScanning(false); // Para o scanner após capturar o código
      setError(null); // Limpa mensagens de erro
    }
  };

  const handleError = (err) => {
    console.error("Erro ao escanear:", err);
    setError("Erro ao escanear o código. Tente novamente.");
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <button
        onClick={() => setScanning(!scanning)}
        style={{
          padding: "10px 20px",
          backgroundColor: scanning ? "#d9534f" : "#5cb85c",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        {scanning ? "Parar Scanner" : "Escanear Código"}
      </button>

      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}

      {scanning && (
        <div style={{ marginTop: "20px" }}>
          <QrScanner
            delay={300}
            onError={handleError}
            onScan={handleScan}
            style={{ width: "100%", maxWidth: "400px", margin: "0 auto" }}
            constraints={{
              video: {
                facingMode: { exact: "environment" }, // Prioriza a câmera traseira
              },
            }}
          />
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;
