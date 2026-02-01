const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

// Try to fetch the image through the forge API as a proxy
const testPath = 'sites/60023/site-60023-slot1-1767157769164-a4fg6o.webp';

try {
  // Try download endpoint
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
    console.log('Got data, size:', buffer.byteLength);
  } else {
    const text = await response.text();
    console.log('Error response:', text.substring(0, 200));
  }
} catch (e) {
  console.log('Error:', e.message);
}
