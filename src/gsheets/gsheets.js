const fs = require('fs').promises;
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
const CREDENTIALS_PATH = 'credentials.json'
const TOKEN_PATH = 'token.json'

const initOAuthToken = async () => {
    var oAuth2Client = null

    await fs.readFile(CREDENTIALS_PATH).then( data => {
        // if (err) return console.log('Error loading client secret file:', err);

        // Authorize a client with credentials, then call the Google Sheets API.
        const credentials = JSON.parse(data)
        console.log(credentials)

        const {client_secret, client_id, redirect_uris} = credentials.installed;
        oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    });

    // Check if we have previously stored a token.
    await fs.readFile(TOKEN_PATH).then( data => {
        // if (err) return
        console.log(data)
        oAuth2Client.setCredentials(JSON.parse(data));
    });

    return oAuth2Client
}

module.exports = {initOAuthToken};
