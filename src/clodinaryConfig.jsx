// cloudinaryConfig.jsx
export const cloudinaryConfig = {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
    apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY,
    apiSecret: import.meta.env.VITE_CLOUDINARY_API_SECRET,
    defaultUploadOptions: {
      cropping: true,
      croppingAspectRatio: 1,
      maxFileSize: 1500000, // 1.5MB
      maxImageWidth: 2000,
      maxImageHeight: 2000,
      resourceType: 'image',
      clientAllowedFormats: ['jpg', 'png', 'jpeg', 'gif'],
      multiple: false,
      theme: 'minimal'
    }
  };
  
  export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/upload`;