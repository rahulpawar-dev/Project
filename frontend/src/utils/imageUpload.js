export const MAX_STAFF_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

export const readImageFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Please select an image file.'));
      return;
    }

    if (!String(file.type || '').startsWith('image/')) {
      reject(new Error('Please select a valid image file.'));
      return;
    }

    if (file.size > MAX_STAFF_IMAGE_SIZE_BYTES) {
      reject(new Error('Image size must be 2 MB or less.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '').trim();
      if (!result) {
        reject(new Error('Unable to read image file.'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => {
      reject(new Error('Unable to read image file.'));
    };
    reader.readAsDataURL(file);
  });
