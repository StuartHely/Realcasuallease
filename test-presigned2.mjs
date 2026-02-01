import { storageGet } from './server/storage.ts';

try {
  const result = await storageGet('test/test-image-1769909888454.png');
  console.log('Presigned URL:', result.url);
} catch (error) {
  console.error('storageGet failed:', error.message);
}
