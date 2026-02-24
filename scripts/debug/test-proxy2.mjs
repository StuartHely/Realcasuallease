const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

// The full path from the CloudFront URL includes the uid
const testPath = '310419663028265080/6yeAhZnHexQXKcGnnUhDLE/sites/60023/site-60023-slot1-1767157769164-a4fg6o.webp';

try {
  const url = new URL('v1/storage/download', forgeUrl + '/');
  url.searchParams.set('path', testPath);
  
  console.log('Trying:', url.toString());
  
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + forgeKey }
  });
  console.log('Status:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));
  
  if (response.ok) {
    const buffer = await response.arrayBuffer();
    console.log('Got data, size:', buffer.byteLength, 'bytes');
  } else {
    const text = await response.text();
    console.log('Error response:', text.substring(0, 300));
  }
} catch (e) {
  console.log('Error:', e.message);
}
