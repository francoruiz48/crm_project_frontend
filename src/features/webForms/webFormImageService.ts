import axiosCRM from 'src/lib/axios';

export interface UploadedFile {
  path: string;
  url: string;
}

// Reutiliza el endpoint genérico de subida (StorageService, backend/app/controllers/storage_controller.py)
// -- el mismo que usan las fotos de lead. No hace falta un endpoint nuevo: la URL resultante se
// guarda directo en theme_config.image_url mediante el PUT/POST normal de WebForm.
export const uploadWebFormImage = async (file: File): Promise<UploadedFile> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axiosCRM.post('/storage/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};
