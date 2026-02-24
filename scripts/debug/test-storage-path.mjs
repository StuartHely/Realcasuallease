import { storageGet } from './server/storage.ts';

// The stored URL is: https://d2xsxph8kpxj0f.cloudfront.net/310419663028265080/6yeAhZnHexQXKcGnnUhDLE/sites/60023/site-60023-slot1-1767157769164-a4fg6o.webp
// The path should be: sites/60023/site-60023-slot1-1767157769164-a4fg6o.webp

try {
  const result = await storageGet('sites/60023/site-60023-slot1-1767157769164-a4fg6o.webp');
  console.log('storageGet result:', result);
  
  // Test if the URL is accessible
  const response = await fetch(result.url, { method: 'HEAD' });
  console.log('URL accessible:', response.ok, response.status);
} catch (e) {
  console.log('Error:', e.message);
}
