import React, { useEffect, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
  NotFoundException,
} from "@zxing/library";

const BarcodeScanner = ({ onScan }) => {
  const videoRef = useRef(null);
  const codeReaderRef = useRef(new BrowserMultiFormatReader());
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const codeReader = codeReaderRef.current;

    if (scanning && videoRef.current) {
      codeReader
        .decodeFromVideoDevice(null, videoRef.current, (result, err) => {
          if (result) {
            console.log("Código escaneado:", result.getText());
            onScan(result.getText());
            setScanning(false);
            setError(null);
          }
          if (err && !(err instanceof NotFoundException)) {
            console.error("Erro ao escanear:", err);
            setError("Erro ao escanear o código. Tente novamente.");
          }
        })
        .catch((err) => {
          console.error("Erro ao iniciar o scanner:", err);
          setError("Erro ao acessar a câmera. Verifique as permissões.");
        });
    }

    return () => {
      codeReader.reset();
    };
  }, [scanning]);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <button
        onClick={() => setScanning((prev) => !prev)}
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
          <video
            ref={videoRef}
            style={{ width: "100%", maxWidth: "400px", borderRadius: "5px" }}
            autoPlay
            muted
          />
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;
