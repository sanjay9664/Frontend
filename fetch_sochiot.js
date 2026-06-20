async function main() {
  try {
    console.log('Logging in to Sochiot...');
    const loginRes = await fetch('https://app.sochiot.com/api/auth-engine/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sa@ismartaccess.com', password: 'I0t3ch' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token || loginData.accessToken || loginData.data?.token || loginData.id_token;
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    console.log('Fetching Location 7 details...');
    const locRes = await fetch('https://app.sochiot.com/api/config-engine/entity/LOCATION/7', { headers });
    const loc = await locRes.json();
    const gateways = loc.locationVOS?.[0]?.gatewayVOList || [];
    
    console.log('Gateways list summary:');
    gateways.forEach((gw, idx) => {
      console.log(`Gateway ${idx}:`, {
        id: gw.id,
        name: gw.name,
        uuid: gw.uuid,
        gatewayUuid: gw.gatewayUuid,
        keys: Object.keys(gw)
      });
      // Print first gateway in full
      if (idx === 0) {
        console.log('Gateway 0 details:', JSON.stringify(gw, null, 2));
      }
    });
  } catch (err) {
    console.error('Error:', err);
  }
}
main();
