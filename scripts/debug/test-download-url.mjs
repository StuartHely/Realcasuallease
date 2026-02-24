const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

// Test the downloadUrl endpoint with an existing file path
const testPath = 'sites/60023/site-60023-slot1-1767157769164-a4fg6o.webp';

try {
  const url = new URL('v1/storage/downloadUrl', forgeUrl + '/');
  url.searchParams.set('path', testPath);
  
  console.log('Request URL:', url.toString());
  
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + forgeKey }
  });
  console.log('Status:', response.status);
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  
  if (data.url) {
    // Test if the signed URL works
    const testResp = await fetch(data.url, { method: 'HEAD' });
    console.log('Signed URL accessible:', testResp.ok, testResp.status);
  }
} catch (e) {
  console.log('Error:', e.message);
}
