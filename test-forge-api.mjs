// Test the forge API directly to see what endpoints are available
const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

console.log('Forge API URL:', forgeUrl);

// Try to list available endpoints or get storage info
try {
  const response = await fetch(forgeUrl + '/v1/storage/info', {
    headers: { 'Authorization': 'Bearer ' + forgeKey }
  });
  console.log('Storage info status:', response.status);
  const text = await response.text();
  console.log('Response:', text.substring(0, 500));
} catch (e) {
  console.log('Error:', e.message);
}
