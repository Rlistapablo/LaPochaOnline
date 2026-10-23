export const appBase = import.meta.env.BASE_URL;

export function appPath(query = '') {
  return `${appBase}${query}`;
}

export function apiPath(path: string) {
  return `${appBase}api${path}`;
}

export const socketPath = `${appBase}socket.io/`;
