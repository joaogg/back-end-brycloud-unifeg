const axios = require('axios');

const clientId = 'ea942a3d-5406-4f75-8104-07d9920871ab';
const clientSecret = 'aDVLWB3+3mf2obito6peFEnDiib4SQrigeBASb2g5k5Uf5Dz2fic/g==';
const baseURL = 'https://cloud-hom.bry.com.br';

async function initializeAccessToken() {
    let accessToken = '';

    let body = "grant_type=client_credentials&client_id=".concat(clientId, "&client_secret=", encodeURIComponent(clientSecret));

    const requestConfig = {
        baseURL: baseURL,
        headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Accept' : 'application/json'}
    };

    let result = await axios.post("/token-service/jwt", body, requestConfig);

    // Retorno Token BryCloud
    if (result['data'] && result['data']['access_token']) {
        accessToken = result['data']['access_token']
    }

    return accessToken;
};

// async function renewAccessToken (refreshToken) {

//     let body = "grant_type=refresh_token&refresh_token=".concat(refreshToken);

//     const requestConfig = {
//         baseURL: baseURL,
//         headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Accept' : 'application/json'}
//     };

//     console.log("Refresh-Access-Token request body: " + body);

//     return axios.post("/token-service/jwt", body, requestConfig);

// };

module.exports = {
    initializeAccessToken : initializeAccessToken,
    // renew : renewAccessToken
}
