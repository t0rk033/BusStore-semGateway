import React from 'react';
import { Button } from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { cloudinaryConfig } from '../clodinaryConfig'; // Certifique-se de que o caminho está correto

const ImageUpload = ({ onImageUpload }) => {
  const openCloudinaryWidget = () => {
    window.cloudinary.openUploadWidget(
      {
        cloudName: cloudinaryConfig.cloudName,
        uploadPreset: cloudinaryConfig.uploadPreset,
        sources: ['local', 'url', 'camera'], // Fontes de upload
        multiple: true, // Permite upload de várias imagens
        cropping: false, // Desabilita o corte para múltiplas imagens
        maxFileSize: 1500000, // 1.5MB
        maxImageWidth: 2000,
        maxImageHeight: 2000,
        theme: 'minimal', // Tema do widget
        styles: {
          palette: {
            window: '#FFFFFF',
            windowBorder: '#90A0B3',
            tabIcon: '#0078FF',
            menuIcons: '#5A616A',
            textDark: '#000000',
            textLight: '#FFFFFF',
            link: '#0078FF',
            action: '#FF620C',
            inactiveTabIcon: '#0E2F5A',
            error: '#F44235',
            inProgress: '#0078FF',
            complete: '#20B832',
            sourceBg: '#E4EBF1'
          },
          fonts: {
            default: null,
            "'Poppins', sans-serif": {
              url: 'https://fonts.googleapis.com/css?family=Poppins',
              active: true
            }
          }
        }
      },
      (error, result) => {
        if (!error && result && result.event === 'success') {
          // Passa a URL da imagem para o componente pai
          onImageUpload(result.info.secure_url);
        } else if (result && result.event === 'close') {
          // Quando o widget é fechado, você pode adicionar lógica adicional aqui
          console.log('Widget fechado');
        }
      }
    );
  };

  return (
    <Button
      variant="contained"
      startIcon={<PhotoCamera />}
      onClick={openCloudinaryWidget}
    >
      Adicionar Fotos
    </Button>
  );
};

export default ImageUpload;