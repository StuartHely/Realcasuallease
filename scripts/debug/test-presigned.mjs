import { storageGet } from './server/storage.ts';

try {
  // Try to get a presigned URL for the test image we just uploaded
  const result = await storageGet('test/test-image-1769909888454.png');
  console.log('Presigned URL result:', JSON.stringify(result, null, 2));
  
  // Test if the presigned URL is accessible
  const response = await fetch(result.url, { method: 'HEAD' });
  console.log('Presigned URL accessible:', response.ok, response.status);
} catch (error) {
  console.error('storageGet failed:', error.message);
}
