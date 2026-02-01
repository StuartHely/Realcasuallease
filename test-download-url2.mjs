const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

const testPath = 'sites/60023/site-60023-slot1-1767157769164-a4fg6o.webp';

try {
  const url = new URL('v1/storage/downloadUrl', forgeUrl + '/');
  url.searchParams.set('path', testPath);
  
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + forgeKey }
  });
  const data = await response.json();
  console.log('Download URL response:', JSON.stringify(data, null, 2));
} catch (e) {
  console.log('Error:', e.message);
}
