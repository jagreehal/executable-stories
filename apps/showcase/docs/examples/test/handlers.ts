import { http, HttpResponse } from 'msw';

export const statementsEmpty = http.get('/api/statements', () => HttpResponse.json([]));
