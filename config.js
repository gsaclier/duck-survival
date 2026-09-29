// Public configuration only. No Google or Discord secrets.
// Local preview retains the workshop and its existing data. GitHub Pages uses the guild service.
export const config = {apiBase: globalThis.location?.hostname === 'gsaclier.github.io' ? 'https://alphabet-api-g67rrlh5ka-od.a.run.app' : '', googleClientId: '433068590462-1jrk2s46e7kpgc79hi0leaefqkbvqaf9.apps.googleusercontent.com'};
